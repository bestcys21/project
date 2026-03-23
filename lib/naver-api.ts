/**
 * Naver Finance API helper for KR stocks
 *
 * - m.stock.naver.com/api/stock/{code}/basic  → JSON (가격, 배당수익률)
 * - DPS = price × dividendYield 역산 (Naver가 이미 정제한 값)
 *
 * 캐시: 5분 (가격), 24시간 (배당 데이터)
 */

const NAVER_MOBILE = "https://m.stock.naver.com/api/stock";

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
