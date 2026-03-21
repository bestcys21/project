/**
 * Financial Modeling Prep (FMP) API helper
 * US 주식 실시간 시세 + 배당 데이터 (Yahoo Finance보다 정확한 배당락일/주기)
 * https://financialmodelingprep.com/developer/docs
 * 환경변수: FMP_API_KEY
 */

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const API_KEY  = process.env.FMP_API_KEY ?? "";

export function hasFmpKey(): boolean {
  return API_KEY.length > 0;
}

// ─── 인메모리 캐시 ───────────────────────────────────────────────────────────
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

// ─── 공통 fetch ──────────────────────────────────────────────────────────────
async function fmpFetch<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${FMP_BASE}${path}${sep}apikey=${API_KEY}`;
  const res  = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`FMP HTTP ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── 타입 정의 ───────────────────────────────────────────────────────────────
export interface FmpQuote {
  ticker:        string;
  name:          string;
  price:         number | null;
  /** 트레일링 연간 주당배당금 (DPS) */
  dps:           number | null;
  dividendYield: number | null;
  /** 형식: YYYY.MM.DD | null */
  exDate:        string | null;
  /** 형식: YYYY.MM.DD | null */
  payDate:       string | null;
  currency:      string;
}

export interface FmpDividendRecord {
  date:            string;   // ex-date (YYYY-MM-DD)
  dividend:        number;
  declarationDate: string | null;
  recordDate:      string | null;
  paymentDate:     string | null;
}

// ─── 날짜 포맷 헬퍼 (YYYY-MM-DD → YYYY.MM.DD) ───────────────────────────────
function fmtDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}.${mo}.${dy}`;
}

function isPastDate(dateStr: string | null, daysAgo = 7): boolean {
  if (!dateStr) return false;
  const m = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysAgo);
  return new Date(+m[1], +m[2] - 1, +m[3]) < threshold;
}

// ─── 단일 종목 시세 + 배당 ────────────────────────────────────────────────────
export async function getFmpQuote(ticker: string): Promise<FmpQuote | null> {
  if (!API_KEY) return null;
  const cacheKey = `fmp:quote:${ticker}`;
  const cached   = getCached<FmpQuote>(cacheKey);
  if (cached) return cached;

  try {
    const [profiles, quotes] = await Promise.all([
      fmpFetch<any[]>(`/profile/${ticker}`),
      fmpFetch<any[]>(`/quote/${ticker}`),
    ]);
    const p = profiles?.[0];
    const q = quotes?.[0];
    if (!p && !q) return null;

    const price        = q?.price ?? p?.price ?? null;
    const lastDiv      = p?.lastDiv ?? null;   // 직전 분기/월 배당금
    const rawYield     = p?.dividendYield ?? null;  // FMP는 소수 (0.035 = 3.5%)
    const dividendYield = rawYield != null ? rawYield : null;

    const result: FmpQuote = {
      ticker,
      name:          p?.companyName ?? q?.name ?? ticker,
      price,
      dps:           lastDiv,    // 연간 DPS는 히스토리에서 계산; profile의 lastDiv는 1회 금액
      dividendYield,
      exDate:        null,
      payDate:       null,
      currency:      p?.currency ?? "USD",
    };

    setCached(cacheKey, result, 5 * 60 * 1000);
    return result;
  } catch { return null; }
}

// ─── 배당 이력 조회 ───────────────────────────────────────────────────────────
export async function getFmpDividendHistory(ticker: string): Promise<FmpDividendRecord[]> {
  if (!API_KEY) return [];
  const cacheKey = `fmp:divhist:${ticker}`;
  const cached   = getCached<FmpDividendRecord[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await fmpFetch<{ historical?: any[] }>(
      `/historical-price-full/stock_dividend/${ticker}`
    );
    const rows: FmpDividendRecord[] = (data.historical ?? [])
      .filter((r: any) => (r.adjDividend ?? r.dividend) > 0)
      .map((r: any) => ({
        date:            r.date,
        dividend:        r.adjDividend ?? r.dividend,
        declarationDate: r.declarationDate ?? null,
        recordDate:      r.recordDate ?? null,
        paymentDate:     r.paymentDate ?? null,
      }));

    setCached(cacheKey, rows, 60 * 60 * 1000);
    return rows;
  } catch { return []; }
}

// ─── 배당 주기 추정 ───────────────────────────────────────────────────────────
export function estimateFrequency(
  history: FmpDividendRecord[]
): "monthly" | "quarterly" | "semi-annual" | "annual" {
  if (history.length < 2) return "annual";
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const recent     = history.filter((h) => new Date(h.date) >= twoYearsAgo);
  const avgPerYear = recent.length / 2;
  if (avgPerYear >= 10) return "monthly";
  if (avgPerYear >= 3)  return "quarterly";
  if (avgPerYear >= 1.5) return "semi-annual";
  return "annual";
}

// ─── 연간 DPS 계산 (이력 기반) ───────────────────────────────────────────────
export function calcAnnualDps(history: FmpDividendRecord[]): number {
  if (!history.length) return 0;
  const freq = estimateFrequency(history);
  // 가장 최근 1회 배당금 × 연간 횟수
  const latest    = history[0].dividend;
  const multiplier = freq === "monthly" ? 12 : freq === "quarterly" ? 4 : freq === "semi-annual" ? 2 : 1;
  return latest * multiplier;
}

// ─── 완성된 FmpQuote (이력 포함, exDate/payDate 완성) ─────────────────────────
export async function getFmpFullQuote(ticker: string): Promise<FmpQuote | null> {
  if (!API_KEY) return null;
  const cacheKey = `fmp:full:${ticker}`;
  const cached   = getCached<FmpQuote>(cacheKey);
  if (cached) return cached;

  const [base, history] = await Promise.all([
    getFmpQuote(ticker),
    getFmpDividendHistory(ticker),
  ]);
  if (!base) return null;

  // 연간 DPS 계산
  const annualDps = history.length > 0 ? calcAnnualDps(history) : (base.dps ?? 0);

  // 가장 최근 배당 이력에서 ex-date, pay-date 추출 (7일 이내만)
  let exDate: string | null  = null;
  let payDate: string | null = null;
  if (history.length > 0) {
    const latestFmt = fmtDate(history[0].date);
    if (!isPastDate(latestFmt)) {
      exDate  = latestFmt;
      payDate = fmtDate(history[0].paymentDate);
    }
  }

  const result: FmpQuote = {
    ...base,
    dps:    annualDps > 0 ? annualDps : base.dps,
    exDate,
    payDate,
  };

  setCached(cacheKey, result, 5 * 60 * 1000);
  return result;
}

// ─── 배당 랭킹용 배치 조회 ────────────────────────────────────────────────────
export interface FmpRankItem {
  ticker:        string;
  name:          string;
  price:         number | null;
  dps:           number | null;
  dividendYield: number | null;
  market:        "US";
}

export async function getFmpRankItems(
  tickers: Array<{ ticker: string; name: string }>,
  batchSize = 10,
  delayMs   = 200
): Promise<FmpRankItem[]> {
  if (!API_KEY) return [];

  const results: FmpRankItem[] = [];

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async ({ ticker, name }) => {
        const q = await getFmpQuote(ticker);
        if (!q) return null;
        // 연간 DPS: dividendYield × price (역산)
        let dps = q.dps;
        if (!dps && q.dividendYield && q.price) {
          dps = q.dividendYield * q.price;
        }
        const dividendYield = (dps && q.price && q.price > 0)
          ? dps / q.price
          : q.dividendYield;

        if (!dividendYield || dividendYield <= 0) return null;
        return { ticker, name, price: q.price, dps, dividendYield, market: "US" as const };
      })
    );
    settled.forEach((r) => {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    });
    if (i + batchSize < tickers.length) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  return results;
}
