/**
 * Naver Finance API helper for KR stocks
 *
 * - m.stock.naver.com/api/stock/{code}/basic  → JSON (가격, 배당수익률)
 * - finance.naver.com/sise/dividendCostList.naver → 배당수익률 순위 HTML 파싱
 * - DPS = price × dividendYield 역산 (Naver가 이미 정제한 값)
 *
 * 캐시: 5분 (가격), 1시간 (배당 순위)
 */

const NAVER_MOBILE = "https://m.stock.naver.com/api/stock";
const NAVER_PC     = "https://finance.naver.com";

// ─── 캐시 ─────────────────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; expiresAt: number; }
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data as T;
}
function setCached<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── 타입 ─────────────────────────────────────────────────────────────────
export interface NaverStockData {
  name:          string;
  price:         number | null;
  /** 소수 형식 (0.0278 = 2.78%) */
  dividendYield: number | null;
  /** 주당 현금 배당금 (원, 역산) */
  dps:           number | null;
}

interface NaverBasicResponse {
  stockName?:      string;
  closePrice?:     string; // "71,900"
  dividendYield?:  string; // "2.78" → 2.78%
  [key: string]:   unknown;
}

// ─── 단일 종목 ─────────────────────────────────────────────────────────────
export async function getNaverStockData(stockCode: string): Promise<NaverStockData | null> {
  const cacheKey = `naver:basic:${stockCode}`;
  const cached = getCached<NaverStockData>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${NAVER_MOBILE}/${stockCode}/basic`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        Referer: "https://m.stock.naver.com/",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const json: NaverBasicResponse = await res.json();

    const price = json.closePrice
      ? parseInt(json.closePrice.replace(/,/g, ""), 10) || null
      : null;

    // Naver dividendYield는 "2.78" 형식 (= 2.78%)
    const yieldPct = json.dividendYield ? parseFloat(json.dividendYield) : null;
    const dividendYield = yieldPct != null && yieldPct > 0 ? yieldPct / 100 : null;

    // DPS 역산: 현재가 × 배당수익률
    const dps =
      price != null && dividendYield != null
        ? Math.round(price * dividendYield)
        : null;

    const result: NaverStockData = {
      name: json.stockName ?? stockCode,
      price,
      dividendYield,
      dps,
    };

    // 가격 5분 / 배당수익률은 하루 단위로 변하므로 5분으로 통일
    setCached(cacheKey, result, 5 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

// ─── 배당 순위 동적 조회 (네이버 증권 배당수익률 스크리너) ─────────────────
// finance.naver.com/sise/dividendCostList.naver 파싱
// sosok=0: KOSPI / sosok=1: KOSDAQ
export interface NaverDividendRankItem {
  ticker:        string;   // 6자리 종목코드
  name:          string;
  price:         number;
  dividendYield: number;   // 소수 (0.05 = 5%)
  dps:           number;
  market:        "KR";
}

async function fetchNaverDividendRankPage(
  sosok: 0 | 1,
  page  = 1,
): Promise<NaverDividendRankItem[]> {
  // dividendCostList.naver → 삭제됨(404). sise_dividend_yield.naver 로 교체
  const url = `${NAVER_PC}/sise/sise_dividend_yield.naver?sosok=${sosok}&page=${page}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        Referer: "https://finance.naver.com/",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    // EUC-KR 응답을 UTF-8로 변환
    const buffer = await res.arrayBuffer();
    const text   = new TextDecoder("euc-kr").decode(buffer);

    const items: NaverDividendRankItem[] = [];
    // 각 행: <a href="/item/main.naver?code=XXXXXX">종목명</a>
    const rowRe = /<tr[^>]*>[\s\S]*?<\/tr>/g;
    const rows  = text.match(rowRe) ?? [];

    for (const row of rows) {
      const codeMatch = /code=(\d{6})/.exec(row);
      if (!codeMatch) continue;

      const nameMatch = /code=\d{6}"[^>]*>([^<]+)<\/a>/.exec(row);
      if (!nameMatch) continue;

      // td 숫자값 추출 (쉼표 포함)
      const nums: number[] = [];
      const numRe = /<td[^>]*class="[^"]*number[^"]*"[^>]*>\s*([\d,]+(?:\.\d+)?)\s*<\/td>/g;
      let nm: RegExpExecArray | null;
      while ((nm = numRe.exec(row)) !== null) {
        nums.push(parseFloat(nm[1].replace(/,/g, "")));
      }

      // 컬럼 순서: 현재가, 배당수익률(%), 주당배당금, 시가총액, ...
      if (nums.length < 3) continue;
      const price         = nums[0];
      const yieldPct      = nums[1];
      const dps           = nums[2];
      const dividendYield = yieldPct > 1 ? yieldPct / 100 : yieldPct;

      if (!price || !dividendYield || !dps) continue;
      if (dividendYield > 0.30) continue; // 30% 초과는 오류 데이터

      items.push({
        ticker:  codeMatch[1],
        name:    nameMatch[1].trim(),
        price,
        dividendYield,
        dps,
        market:  "KR",
      });
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * 네이버 증권 배당수익률 순위 (KOSPI + KOSDAQ 합산)
 * KIS API 없을 때 하드코딩 없이 동적으로 상위 배당주를 가져오는 주요 fallback
 */
export async function getNaverDividendRanking(limit = 100): Promise<NaverDividendRankItem[]> {
  const cacheKey = "naver:divrank";
  const cached   = getCached<NaverDividendRankItem[]>(cacheKey);
  if (cached) return cached;

  const [kospi, kosdaq] = await Promise.allSettled([
    fetchNaverDividendRankPage(0, 1),
    fetchNaverDividendRankPage(1, 1),
  ]);

  const all: NaverDividendRankItem[] = [];
  const seen = new Set<string>();

  for (const result of [kospi, kosdaq]) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (!seen.has(item.ticker)) {
        seen.add(item.ticker);
        all.push(item);
      }
    }
  }

  const sorted = all
    .sort((a, b) => b.dividendYield - a.dividendYield)
    .slice(0, limit);

  if (sorted.length > 0) {
    setCached(cacheKey, sorted, 60 * 60 * 1000); // 1시간 캐시
  }

  return sorted;
}

// ─── 배치 조회 (랭킹용) ────────────────────────────────────────────────────
export async function getNaverBatch(
  stockCodes: string[],
  batchSize = 15,
  delayMs   = 150,
): Promise<Map<string, NaverStockData>> {
  const results = new Map<string, NaverStockData>();

  for (let i = 0; i < stockCodes.length; i += batchSize) {
    const batch = stockCodes.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async (code) => {
        const data = await getNaverStockData(code);
        return { code, data };
      }),
    );

    settled.forEach((r) => {
      if (r.status === "fulfilled" && r.value.data) {
        results.set(r.value.code, r.value.data);
      }
    });

    if (i + batchSize < stockCodes.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
