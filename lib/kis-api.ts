/**
 * 한국투자증권 (KIS) Open API helper
 * - 실시간 주식 현재가 조회 (Yahoo Finance보다 정확)
 * - 배당 API는 이 플랜에서 미지원 → DPS는 DART 사용
 *
 * 환경변수 (.env.local):
 *   KIS_APP_KEY=...
 *   KIS_APP_SECRET=...
 *
 * https://apiportal.koreainvestment.com/
 */

const KIS_BASE   = "https://openapi.koreainvestment.com:9443";
const APP_KEY    = process.env.KIS_APP_KEY    ?? "";
const APP_SECRET = process.env.KIS_APP_SECRET ?? "";

export function hasKisKey(): boolean {
  return APP_KEY.length > 0 && APP_SECRET.length > 0;
}

// ─── 토큰 캐시 (24시간 유효, 1분 여유) ───────────────────────────────────────
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey:     APP_KEY,
      appsecret:  APP_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`KIS token error HTTP ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(`KIS token missing: ${data.msg1 ?? ""}`);

  const expiresIn = (data.expires_in as number) * 1000;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + expiresIn - 60_000 };
  return tokenCache.token;
}

// ─── 인메모리 캐시 ────────────────────────────────────────────────────────────
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

// ─── 주식 현재가 조회 ─────────────────────────────────────────────────────────
// TR: FHKST01010100 — 주식현재가 시세
export interface KisPrice {
  price: number;
  name:  string;
}

export async function getKisPrice(stockCode: string): Promise<KisPrice | null> {
  if (!hasKisKey()) return null;

  const cacheKey = `kis:price:${stockCode}`;
  const cached = getCached<KisPrice>(cacheKey);
  if (cached) return cached;

  try {
    const token = await getAccessToken();
    const url   = new URL(`${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price`);
    url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
    url.searchParams.set("FID_INPUT_ISCD", stockCode);

    const res  = await fetch(url.toString(), {
      headers: {
        authorization:  `Bearer ${token}`,
        appkey:         APP_KEY,
        appsecret:      APP_SECRET,
        "tr_id":        "FHKST01010100",
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.rt_cd && json.rt_cd !== "0") return null;

    const o     = json.output;
    const price = parseFloat(o?.stck_prpr);
    const name  = o?.hts_kor_isnm ?? "";

    if (!price || isNaN(price)) return null;

    const result: KisPrice = { price, name };
    setCached(cacheKey, result, 5 * 60 * 1000); // 5분 캐시
    return result;
  } catch {
    return null;
  }
}
