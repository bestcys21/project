/**
 * 공공데이터포털 - 한국예탁결제원 주식시세정보 API
 *
 * API 신청 (개인 즉시 발급):
 *   https://www.data.go.kr/data/15094775/openapi.do
 *
 * 환경변수: DATA_GO_KR_API_KEY
 *
 * 제공 데이터: 일별 종가, 시가총액 (가격 교차검증용)
 * 주의: 배당금 DPS는 이 API에 없음 → DART 또는 Naver 사용
 */

const DATA_GO_KR_BASE =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService";
const API_KEY = process.env.DATA_GO_KR_API_KEY ?? "";

export function hasSeibroKey(): boolean {
  return API_KEY.length > 0;
}

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
export interface SeibroStockInfo {
  name:      string;
  price:     number | null;
  market:    "KOSPI" | "KOSDAQ" | string;
  marketCap: number | null;
}

// ─── 날짜 헬퍼 ─────────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

// ─── 주식 시세 조회 ────────────────────────────────────────────────────────
export async function getSeibroStockInfo(stockCode: string): Promise<SeibroStockInfo | null> {
  if (!API_KEY) return null;

  const cacheKey = `seibro:${stockCode}`;
  const cached = getCached<SeibroStockInfo>(cacheKey);
  if (cached) return cached;

  try {
    const end   = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7); // 최근 7일 (휴장일 고려)

    const url = new URL(`${DATA_GO_KR_BASE}/getStockPriceInfo`);
    url.searchParams.set("serviceKey", API_KEY);
    url.searchParams.set("numOfRows",  "1");
    url.searchParams.set("pageNo",     "1");
    url.searchParams.set("resultType", "json");
    url.searchParams.set("likeSrtnCd", stockCode);
    url.searchParams.set("beginBasDt", toDateStr(start));
    url.searchParams.set("endBasDt",   toDateStr(end));

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const items = json?.response?.body?.items?.item;
    // 결과가 배열일 수도, 단일 객체일 수도 있음
    const item = Array.isArray(items) ? items[items.length - 1] : items;
    if (!item) return null;

    const price     = parseInt((item.clpr ?? "").replace(/,/g, ""), 10) || null;
    const marketCap = parseInt((item.mrktTotAmt ?? "").replace(/,/g, ""), 10) || null;

    const result: SeibroStockInfo = {
      name:      item.itmsNm ?? stockCode,
      price,
      market:    item.mrktCtg ?? "",
      marketCap,
    };

    setCached(cacheKey, result, 60 * 60 * 1000); // 1시간 캐시
    return result;
  } catch {
    return null;
  }
}
