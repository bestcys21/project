/**
 * Open DART API 헬퍼
 * 공식 공시 기반 배당 데이터 조회 (배당금, 배당성향, 배당 기준일 등)
 * https://opendart.fss.or.kr
 */

const DART_BASE = "https://opendart.fss.or.kr/api";
const API_KEY   = process.env.DART_API_KEY ?? "";

// ─── 인메모리 캐시 (TTL: 24시간) ─────────────────────────────────────────────
interface CacheEntry<T> { data: T; expiresAt: number; }
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data as T;
}
function setCached<T>(key: string, data: T, ttlMs = 24 * 60 * 60 * 1000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── 회사 정보 조회 (종목코드 → corp_code) ───────────────────────────────────
interface DartCompany {
  corp_code:  string;   // 8자리 고유코드
  corp_name:  string;
  stock_code: string;   // 6자리 종목코드
}

export async function getCorpCode(stockCode: string): Promise<string | null> {
  const cacheKey = `corp:${stockCode}`;
  const cached   = getCached<string>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${DART_BASE}/company.json?crtfc_key=${API_KEY}&stock_code=${stockCode}`;
    const res  = await fetch(url, { next: { revalidate: 86400 } });
    const json = await res.json();
    if (json.status !== "000") return null;

    const corpCode: string = json.corp_code;
    setCached(cacheKey, corpCode);
    return corpCode;
  } catch {
    return null;
  }
}

// ─── 배당 공시 조회 ──────────────────────────────────────────────────────────
export interface DartDividend {
  /** 주당 현금 배당금 (원) */
  dps:           number | null;
  /** 시가 배당율 (%) */
  dividendYield: number | null;
  /** 배당성향 (%) */
  payoutRatio:   number | null;
  /** 배당 기준일 */
  recordDate:    string | null;
  /** 회계연도 */
  fiscalYear:    string;
}

/**
 * reprt_code:
 *   11011 = 사업보고서 (연간 / 가장 정확)
 *   11012 = 반기보고서
 *   11013 = 1분기 보고서
 *   11014 = 3분기 보고서
 */
export async function getDartDividend(
  stockCode: string,
  year?: number
): Promise<DartDividend | null> {
  if (!API_KEY) return null;

  const fiscalYear = (year ?? new Date().getFullYear() - 1).toString();
  const cacheKey   = `div:${stockCode}:${fiscalYear}`;
  const cached     = getCached<DartDividend>(cacheKey);
  if (cached) return cached;

  const corpCode = await getCorpCode(stockCode);
  if (!corpCode) return null;

  try {
    const url =
      `${DART_BASE}/dividend.json` +
      `?crtfc_key=${API_KEY}` +
      `&corp_code=${corpCode}` +
      `&bsns_year=${fiscalYear}` +
      `&reprt_code=11011`;  // 사업보고서

    const res  = await fetch(url, { next: { revalidate: 3600 } });
    const json = await res.json();

    if (json.status !== "000" || !json.list?.length) return null;

    // 보통주/우선주 행 중 "주당 현금배당금" 항목 추출
    const rows: any[] = json.list;

    // "주당 현금배당금(원)" 행
    const dpsRow = rows.find(
      (r: any) =>
        r.se?.includes("주당 현금배당금") ||
        r.se?.includes("현금배당금(원)")
    );
    // "시가배당율" 행
    const yieldRow = rows.find(
      (r: any) => r.se?.includes("시가배당율") || r.se?.includes("배당수익률")
    );
    // "배당성향" 행
    const payoutRow = rows.find(
      (r: any) => r.se?.includes("배당성향") || r.se?.includes("배당 성향")
    );

    const parseNum = (val: string | undefined) => {
      if (!val || val === "-" || val === "") return null;
      const n = parseFloat(val.replace(/,/g, ""));
      return isNaN(n) ? null : n;
    };

    // DART는 보통주(thstrm), 우선주(frmtrm) 컬럼이 있음 — 보통주 우선 사용
    const dps = parseNum(dpsRow?.thstrm ?? dpsRow?.frmtrm ?? dpsRow?.lwfr);
    const dividendYield = parseNum(yieldRow?.thstrm ?? yieldRow?.frmtrm);
    const payoutRatio   = parseNum(payoutRow?.thstrm ?? payoutRow?.frmtrm);

    // 배당 기준일 (사업보고서에서 추출)
    const recordDate = rows
      .find((r: any) => r.se?.includes("기준일") || r.se?.includes("배당기준일"))
      ?.thstrm ?? null;

    const result: DartDividend = {
      dps,
      dividendYield: dividendYield != null ? dividendYield / 100 : null,  // % → 소수
      payoutRatio,
      recordDate,
      fiscalYear,
    };

    setCached(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
