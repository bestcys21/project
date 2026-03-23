/**
 * 한국투자증권 (KIS) Open API helper
 * - 실시간 주식 현재가 조회 (Yahoo Finance보다 정확)
 * - 배당 순위 조회: FHPST01720000 (KOSPI/KOSDAQ/ETF 병렬)
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

// ─── 토큰 캐시 ────────────────────────────────────────────────────────────────
// Vercel KV(Redis)가 있으면 인스턴스 간 토큰 공유 → 재발급 최소화
// KV가 없으면 인메모리 캐시만 사용 (로컬 개발)
let tokenMemCache: { token: string; expiresAt: number } | null = null;

async function kvGet(key: string): Promise<{ token: string; expiresAt: number } | null> {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
    const { kv } = await import("@vercel/kv");
    return await kv.get<{ token: string; expiresAt: number }>(key);
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: { token: string; expiresAt: number }, ttlSec: number) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return;
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value, { ex: ttlSec });
  } catch {
    // KV 저장 실패 시 인메모리 캐시만 사용
  }
}

async function getAccessToken(): Promise<string> {
  // 1) 인메모리 캐시 확인 (가장 빠름)
  if (tokenMemCache && Date.now() < tokenMemCache.expiresAt) {
    return tokenMemCache.token;
  }

  // 2) Vercel KV 캐시 확인 (인스턴스 간 공유 — 재발급 방지 핵심)
  const kvCache = await kvGet("kis:token");
  if (kvCache && Date.now() < kvCache.expiresAt) {
    tokenMemCache = kvCache;
    return tokenMemCache.token;
  }

  // 3) 만료/없음 → 신규 발급
  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey:     APP_KEY,
      appsecret:  APP_SECRET,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`KIS token error HTTP ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(`KIS token missing: ${data.msg1 ?? ""}`);

  const expiresIn  = (data.expires_in as number);
  const expiresAt  = Date.now() + expiresIn * 1000 - 60_000;
  const newCache   = { token: data.access_token, expiresAt };

  tokenMemCache = newCache;
  await kvSet("kis:token", newCache, expiresIn - 60); // KV에 TTL과 함께 저장

  return tokenMemCache.token;
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

// ─── 배당 순위 조회 ───────────────────────────────────────────────────────────
// TR: FHPST01720000 — 국내주식 배당 순위 조회 (KOSPI/KOSDAQ/ETF)
export interface KisDividendRankItem {
  ticker:         string;   // 6자리 종목코드
  name:           string;
  currentPrice:   number;
  dividendAmount: number;   // 주당 배당금 (원)
  dividendYield:  number;   // 소수 (0.05 = 5%)
}

async function fetchKisDividendRank(
  marketCode: string,   // "J" = KOSPI, "Q" = KOSDAQ, "ETF"
): Promise<KisDividendRankItem[]> {
  const cacheKey = `kis:rank:${marketCode}`;
  const cached = getCached<KisDividendRankItem[]>(cacheKey);
  if (cached) return cached;

  const token = await getAccessToken();
  // TR: HHKDB13470100 — CTS_AREA 페이지네이션으로 전체 배당주 수집
  // 페이지당 ~19건, 최대 10페이지(~190건)까지 순회
  const allItems: KisDividendRankItem[] = [];
  const seen = new Set<string>();
  let ctsArea = "";
  let page = 0;
  const MAX_PAGES = 10;

  do {
    const url = new URL(`${KIS_BASE}/uapi/domestic-stock/v1/ranking/dividend-rate`);
    url.searchParams.set("fid_cond_mrkt_div_code",  marketCode);
    url.searchParams.set("fid_cond_scr_div_code",   "20171");
    url.searchParams.set("fid_input_iscd",           "0000");
    url.searchParams.set("fid_div_cls_code",          "0");
    url.searchParams.set("fid_blng_cls_code",         "0");
    url.searchParams.set("fid_rank_sort_cls_code",    "0");
    url.searchParams.set("fid_trgt_cls_code",         "0");
    url.searchParams.set("fid_trgt_exls_cls_code",    "0");
    url.searchParams.set("fid_vol_cnt",               "0");
    url.searchParams.set("fid_input_cnt_1",           "0");
    url.searchParams.set("fid_input_price_1",         "");
    url.searchParams.set("fid_input_price_2",         "");
    url.searchParams.set("fid_rsfl_rate1",            "");
    url.searchParams.set("fid_rsfl_rate2",            "");
    url.searchParams.set("CTS_AREA",                  ctsArea);
    url.searchParams.set("GB1",                       "0");
    url.searchParams.set("UPJONG",                    "");
    url.searchParams.set("GB2",                       "0");
    url.searchParams.set("GB3",                       "1");
    url.searchParams.set("F_DT",                      "20240101");
    url.searchParams.set("T_DT",                      "20241231");
    url.searchParams.set("GB4",                       "0");

    const res = await fetch(url.toString(), {
      headers: {
        authorization:  `Bearer ${token}`,
        appkey:         APP_KEY,
        appsecret:      APP_SECRET,
        "tr_id":        "HHKDB13470100",
        "custtype":     "P",
        "Content-Type": "application/json; charset=utf-8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) break;
    const json = await res.json();
    if (json.rt_cd !== "0" || !Array.isArray(json.output)) break;

    for (const o of json.output as any[]) {
      if (!o.sht_cd || parseFloat(o.divi_rate ?? "0") <= 0) continue;
      if (seen.has(String(o.sht_cd))) continue;
      seen.add(String(o.sht_cd));

      const dividendAmount = parseFloat(String(o.per_sto_divi_amt ?? "0").replace(/,/g, "")) || 0;
      const yieldPct       = parseFloat(String(o.divi_rate       ?? "0").replace(/,/g, "")) || 0;
      const dividendYield  = yieldPct > 1 ? yieldPct / 100 : yieldPct;
      const currentPrice   = dividendYield > 0 ? Math.round(dividendAmount / dividendYield) : 0;

      if (dividendYield > 0 && currentPrice > 0) {
        allItems.push({
          ticker:        String(o.sht_cd),
          name:          String(o.isin_name ?? o.sht_cd),
          currentPrice,
          dividendAmount,
          dividendYield,
        });
      }
    }

    // 다음 페이지 토큰 — 빈 문자열이면 마지막 페이지
    ctsArea = String(json.CTS_AREA ?? "").trim();
    page++;
  } while (ctsArea !== "" && page < MAX_PAGES);

  if (allItems.length > 0) {
    setCached(cacheKey, allItems, 60 * 60 * 1000); // 1시간 캐시
  }
  return allItems;
}

/**
 * KOSPI + KOSDAQ + ETF 배당 순위를 병렬로 가져와 병합·정렬
 * KIS 키 없으면 빈 배열 반환 (caller에서 fallback 처리)
 * 전체 작업에 20초 타임아웃 적용
 */
export async function getKisDividendRanking(limit = 100): Promise<KisDividendRankItem[]> {
  if (!hasKisKey()) return [];

  const work = async (): Promise<KisDividendRankItem[]> => {
    const [kospi, kosdaq, etf] = await Promise.allSettled([
      fetchKisDividendRank("J"),
      fetchKisDividendRank("Q"),
      fetchKisDividendRank("ETF"),
    ]);

    const all: KisDividendRankItem[] = [];
    const seen = new Set<string>();

    for (const result of [kospi, kosdaq, etf]) {
      if (result.status !== "fulfilled") continue;
      for (const item of result.value) {
        if (!seen.has(item.ticker)) {
          seen.add(item.ticker);
          all.push(item);
        }
      }
    }

    return all
      .sort((a, b) => b.dividendYield - a.dividendYield)
      .slice(0, limit);
  };

  try {
    const timeout = new Promise<KisDividendRankItem[]>((resolve) =>
      setTimeout(() => resolve([]), 20000),
    );
    return await Promise.race([work(), timeout]);
  } catch {
    return [];
  }
}

// ─── 예탁원 배당 일정 조회 ────────────────────────────────────────────────────
// TR: HHKDB669102C0 — 예탁원정보(배당일정) [국내주식-145]
export interface KisDividendSchedule {
  exDate:      string | null;   // 배당락일  YYYY.MM.DD
  recordDate:  string | null;   // 기준일    YYYY.MM.DD
  paymentDate: string | null;   // 지급일    YYYY.MM.DD
  dps:         number | null;   // 주당 배당금 (원)
}

function fmtKisDate(raw: string | undefined): string | null {
  if (!raw || raw.length < 8) return null;
  // YYYYMMDD → YYYY.MM.DD
  return `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
}

export async function getKisDividendSchedule(stockCode: string): Promise<KisDividendSchedule | null> {
  if (!hasKisKey()) return null;

  const cacheKey = `kis:divschedule:${stockCode}`;
  const cached = getCached<KisDividendSchedule>(cacheKey);
  if (cached) return cached;

  try {
    const token = await getAccessToken();
    const today  = new Date();
    const start  = new Date(today.getFullYear() - 1, 0, 1);
    const end    = new Date(today.getFullYear() + 1, 11, 31);
    const yyyymmdd = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    const url = new URL(`${KIS_BASE}/uapi/domestic-stock/v1/ksdinfo/dividend`);
    url.searchParams.set("SHT_CD",       stockCode);
    url.searchParams.set("INQR_STRT_DT", yyyymmdd(start));
    url.searchParams.set("INQR_END_DT",  yyyymmdd(end));
    url.searchParams.set("PDNO",         "");
    url.searchParams.set("PRDT_TYPE_CD", "300"); // 주식

    const res = await fetch(url.toString(), {
      headers: {
        authorization:  `Bearer ${token}`,
        appkey:         APP_KEY,
        appsecret:      APP_SECRET,
        "tr_id":        "HHKDB669102C0",
        "custtype":     "P",
        "Content-Type": "application/json; charset=utf-8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.rt_cd !== "0") return null;

    // output 또는 output1 배열 탐색
    const rows: any[] = Array.isArray(json.output)  ? json.output :
                        Array.isArray(json.output1) ? json.output1 : [];
    if (rows.length === 0) return null;

    // 가장 최근 배당 일정 선택 (ex-date 기준 내림차순)
    const todayStr = yyyymmdd(today);
    const sorted = [...rows].sort((a, b) => {
      const da = a.ex_divi_dt ?? a.bsop_dtt ?? a.stnd_dt ?? "";
      const db = b.ex_divi_dt ?? b.bsop_dtt ?? b.stnd_dt ?? "";
      return db.localeCompare(da);
    });

    // 미래 또는 최근 과거 중 가장 가까운 것
    const best = sorted.find((r) => {
      const exRaw = r.ex_divi_dt ?? r.bsop_dtt ?? r.stnd_dt ?? "";
      return exRaw >= todayStr;
    }) ?? sorted[0];

    if (!best) return null;

    // 가능한 필드명으로 값 추출 (KIS 버전에 따라 다름)
    const exRaw  = best.ex_divi_dt  ?? best.bsop_dtt   ?? best.stnd_dt   ?? null;
    const recRaw = best.base_dt     ?? best.stnd_dt     ?? null;
    const payRaw = best.divi_pay_dt ?? best.pay_dt      ?? null;
    const dpsRaw = best.stkl_divi_amt ?? best.per_sher_divi_amt ?? best.divi_amt ?? null;

    const result: KisDividendSchedule = {
      exDate:      fmtKisDate(exRaw  ?? undefined),
      recordDate:  fmtKisDate(recRaw ?? undefined),
      paymentDate: fmtKisDate(payRaw ?? undefined),
      dps:         dpsRaw ? parseFloat(String(dpsRaw).replace(/,/g, "")) || null : null,
    };

    // 유효한 날짜가 하나도 없으면 null 반환
    if (!result.exDate && !result.paymentDate) return null;

    setCached(cacheKey, result, 6 * 60 * 60 * 1000); // 6시간 캐시
    return result;
  } catch {
    return null;
  }
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
