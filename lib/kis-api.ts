/**
 * 한국투자증권 (KIS) Open API helper
 * KR 주식 실시간 시세 + 배당 데이터
 * https://apiportal.koreainvestment.com/
 *
 * 필요 환경변수 (.env.local):
 *   KIS_APP_KEY=your_app_key
 *   KIS_APP_SECRET=your_app_secret
 *
 * (선택) 모의투자 환경 사용 시:
 *   KIS_IS_VIRTUAL=true
 */

const KIS_REAL_BASE    = "https://openapi.koreainvestment.com:9443";
const KIS_VIRTUAL_BASE = "https://openapivts.koreainvestment.com:29443";

const APP_KEY    = process.env.KIS_APP_KEY    ?? "";
const APP_SECRET = process.env.KIS_APP_SECRET ?? "";
const IS_VIRTUAL = process.env.KIS_IS_VIRTUAL === "true";

const KIS_BASE = IS_VIRTUAL ? KIS_VIRTUAL_BASE : KIS_REAL_BASE;

export function hasKisKey(): boolean {
  return APP_KEY.length > 0 && APP_SECRET.length > 0;
}

// ─── 토큰 캐시 ───────────────────────────────────────────────────────────────
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

  const token     = data.access_token as string;
  const expiresIn = (data.expires_in as number) * 1000; // seconds → ms
  // 만료 1분 전에 갱신하도록 여유 설정
  tokenCache = { token, expiresAt: Date.now() + expiresIn - 60_000 };
  return token;
}

// ─── 공통 GET 요청 ────────────────────────────────────────────────────────────
async function kisFetch(
  path:   string,
  trId:   string,
  params: Record<string, string>
): Promise<any> {
  const token = await getAccessToken();
  const url   = new URL(`${KIS_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      "authorization": `Bearer ${token}`,
      "appkey":        APP_KEY,
      "appsecret":     APP_SECRET,
      "tr_id":         trId,
      "Content-Type":  "application/json; charset=utf-8",
    },
    // Next.js 캐싱: 5분 revalidate
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`KIS HTTP ${res.status}: ${trId} ${path}`);
  const json = await res.json();

  // KIS API는 성공 시 rt_cd = "0"
  if (json.rt_cd && json.rt_cd !== "0") {
    throw new Error(`KIS API error [${json.rt_cd}]: ${json.msg1}`);
  }
  return json;
}

// ─── 날짜 유틸 ───────────────────────────────────────────────────────────────
function yyyymmddToDisplay(s: string | null | undefined): string | null {
  if (!s || s.length < 8) return null;
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  return `${y}.${m}.${d}`;
}

function isFutureOrRecent(dateStr: string | null, toleranceDays = 7): boolean {
  if (!dateStr) return false;
  const m = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - toleranceDays);
  return new Date(+m[1], +m[2] - 1, +m[3]) >= threshold;
}

function todayYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function pastYYYYMMDD(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
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

// ─── 타입 정의 ───────────────────────────────────────────────────────────────
export interface KisQuote {
  ticker:        string;
  name:          string;
  price:         number | null;
  dps:           number | null;
  dividendYield: number | null;
  exDate:        string | null;  // YYYY.MM.DD
  payDate:       string | null;  // YYYY.MM.DD
  currency:      "KRW";
  dividendFrequency: "annual" | "semi-annual" | "quarterly" | "monthly";
  payMonths:     number[];
  estimatedPayDates: string[];
}

// ─── 주식 현재가 조회 ─────────────────────────────────────────────────────────
// TR: FHKST01010100 — 주식현재가 시세
export async function getKisPrice(stockCode: string): Promise<{ price: number; name: string } | null> {
  const cacheKey = `kis:price:${stockCode}`;
  const cached = getCached<{ price: number; name: string }>(cacheKey);
  if (cached) return cached;

  try {
    const data   = await kisFetch(
      "/uapi/domestic-stock/v1/quotations/inquire-price",
      "FHKST01010100",
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD:         stockCode,
      }
    );
    const o = data.output;
    if (!o) return null;

    const price = parseFloat(o.stck_prpr);  // 주식현재가
    const name  = o.hts_kor_isnm ?? "";     // HTS 한글 종목명

    if (!price || isNaN(price)) return null;

    const result = { price, name };
    setCached(cacheKey, result, 5 * 60 * 1000); // 5분 캐시
    return result;
  } catch { return null; }
}

// ─── 배당 이력 조회 ───────────────────────────────────────────────────────────
// TR: FHKST66430400 — 주식 배당 이력
interface KisDivRecord {
  record_date:      string; // 기준일 YYYYMMDD (배당기준일/기록일)
  dvdn_pay_dt:      string; // 배당 지급일 YYYYMMDD
  per_sto_dvdn_amt: string; // 1주당 배당금 (원)
  dvdn_rt:          string; // 배당률 (%) 주의: 배당수익률 아님, (배당금/액면가) × 100
  stck_prpr:        string; // 기준일 주가
}

export async function getKisDividendHistory(stockCode: string): Promise<KisDivRecord[]> {
  const cacheKey = `kis:divhist:${stockCode}`;
  const cached = getCached<KisDivRecord[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await kisFetch(
      "/uapi/domestic-stock/v1/finance/dividend",
      "FHKST66430400",
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD:         stockCode,
        FID_DIV_CLS_CODE:       "1", // 1: 현금배당
        FID_INPUT_DATE_1:       pastYYYYMMDD(3),
        FID_INPUT_DATE_2:       todayYYYYMMDD(),
      }
    );

    const rows: KisDivRecord[] = (data.output2 ?? []).filter(
      (r: any) => r.per_sto_dvdn_amt && parseFloat(r.per_sto_dvdn_amt) > 0
    );

    setCached(cacheKey, rows, 60 * 60 * 1000); // 1시간 캐시
    return rows;
  } catch { return []; }
}

// ─── 배당 주기 추정 ───────────────────────────────────────────────────────────
function estimateKisFrequency(
  records: KisDivRecord[]
): "annual" | "semi-annual" | "quarterly" | "monthly" {
  if (records.length < 2) return "annual";
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const recent = records.filter((r) => {
    const y = parseInt(r.record_date.slice(0, 4));
    const m = parseInt(r.record_date.slice(4, 6));
    const d = parseInt(r.record_date.slice(6, 8));
    return new Date(y, m - 1, d) >= twoYearsAgo;
  });
  const avgPerYear = recent.length / 2;
  if (avgPerYear >= 10) return "monthly";
  if (avgPerYear >= 3)  return "quarterly";
  if (avgPerYear >= 1.5) return "semi-annual";
  return "annual";
}

// ─── ex-month → 지급월 변환 (한국 결산 패턴) ──────────────────────────────────
function exMonthToPayMonth(exMonth: number): number {
  if (exMonth === 12) return 4; // 12월 기준 → 익년 4월 지급
  const pay = exMonth + 2;
  return pay > 12 ? pay - 12 : pay;
}

// ─── 완전한 배당 데이터 조회 (랭킹/배당 상세 공용) ────────────────────────────
export async function getKisFullQuote(stockCode: string): Promise<KisQuote | null> {
  if (!hasKisKey()) return null;

  const cacheKey = `kis:full:${stockCode}`;
  const cached = getCached<KisQuote>(cacheKey);
  if (cached) return cached;

  const [priceResult, history] = await Promise.all([
    getKisPrice(stockCode),
    getKisDividendHistory(stockCode),
  ]);

  if (!priceResult && history.length === 0) return null;

  const price = priceResult?.price ?? null;
  const name  = priceResult?.name  ?? stockCode;

  // 배당 주기 추정
  const dividendFrequency = estimateKisFrequency(history);
  const freqMonths =
    dividendFrequency === "monthly"     ? 1  :
    dividendFrequency === "quarterly"   ? 3  :
    dividendFrequency === "semi-annual" ? 6  : 12;

  // 연간 DPS 계산: 최근 1년 합산
  let dps: number | null = null;
  if (history.length > 0) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentRows = history.filter((r) => {
      const y = parseInt(r.record_date.slice(0, 4));
      const m = parseInt(r.record_date.slice(4, 6));
      const d = parseInt(r.record_date.slice(6, 8));
      return new Date(y, m - 1, d) >= oneYearAgo;
    });
    if (recentRows.length > 0) {
      dps = recentRows.reduce((sum, r) => sum + parseFloat(r.per_sto_dvdn_amt), 0);
    } else {
      // 최근 1년 데이터 없으면 최신 1건 × 연간 횟수
      const latest = parseFloat(history[0].per_sto_dvdn_amt);
      const multiplier = freqMonths === 1 ? 12 : freqMonths === 3 ? 4 : freqMonths === 6 ? 2 : 1;
      dps = latest * multiplier;
    }
  }

  // 배당수익률 계산
  let dividendYield: number | null = null;
  if (dps != null && price != null && price > 0) {
    dividendYield = dps / price;
  }

  // 지급월 목록 추출 (record_date의 월 → 지급월 변환)
  const exMonthSet = new Set<number>();
  history.slice(0, Math.min(history.length, 4)).forEach((r) => {
    exMonthSet.add(parseInt(r.record_date.slice(4, 6)));
  });
  const payMonths = [...new Set([...exMonthSet].map(exMonthToPayMonth))].sort((a, b) => a - b);

  // exDate / payDate (가장 최근 기록, 미래거나 최근 7일 이내인 것)
  let exDate:  string | null = null;
  let payDate: string | null = null;

  for (const r of history) {
    const fmtEx  = yyyymmddToDisplay(r.record_date);
    const fmtPay = yyyymmddToDisplay(r.dvdn_pay_dt);
    if (isFutureOrRecent(fmtPay)) {
      exDate  = fmtEx;
      payDate = fmtPay;
      break;
    }
  }

  // payDate가 없으면 최근 기록에서 다음 주기로 투영
  if (!payDate && history.length > 0) {
    const latest = history[0];
    const fmtPay = yyyymmddToDisplay(latest.dvdn_pay_dt);
    if (fmtPay) {
      const m2 = fmtPay.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      if (m2) {
        const d2 = new Date(+m2[1], +m2[2] - 1, +m2[3]);
        const today = new Date();
        while (d2 < today) d2.setMonth(d2.getMonth() + freqMonths);
        payDate = `${d2.getFullYear()}.${String(d2.getMonth() + 1).padStart(2, "0")}.${String(d2.getDate()).padStart(2, "0")}`;
        exDate  = yyyymmddToDisplay(latest.record_date);
      }
    }
  }

  // 향후 12개월 예상 지급일
  const today = new Date();
  const estimatedPayDates: string[] = [];
  const finalPayMonths = payMonths.length > 0 ? payMonths : [4]; // 기본: 4월

  for (let offset = 0; offset <= 12; offset++) {
    const d  = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const mo = d.getMonth() + 1;
    const yr = d.getFullYear();
    if (finalPayMonths.includes(mo)) {
      estimatedPayDates.push(`${yr}.${String(mo).padStart(2, "0")}.15`);
    }
  }

  const result: KisQuote = {
    ticker:            stockCode,
    name,
    price,
    dps,
    dividendYield,
    exDate,
    payDate,
    currency:          "KRW",
    dividendFrequency,
    payMonths:         finalPayMonths,
    estimatedPayDates,
  };

  setCached(cacheKey, result, 5 * 60 * 1000); // 5분 캐시
  return result;
}

// ─── 랭킹용 배치 조회 ──────────────────────────────────────────────────────────
export interface KisRankItem {
  ticker:        string;
  name:          string;
  price:         number | null;
  dps:           number | null;
  dividendYield: number | null;
  market:        "KR";
}

export async function getKisRankItems(
  tickers:   Array<{ ticker: string; name: string }>,
  batchSize = 5,
  delayMs   = 500
): Promise<KisRankItem[]> {
  if (!hasKisKey()) return [];

  const results: KisRankItem[] = [];

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async ({ ticker, name: koreanName }) => {
        // ticker는 "005930.KS" 형식 → 6자리 코드 추출
        const stockCode = ticker.replace(/\.(KS|KQ)$/, "");
        const q = await getKisFullQuote(stockCode);
        if (!q || q.dividendYield == null || q.dividendYield <= 0) return null;

        return {
          ticker,
          name:          koreanName,
          price:         q.price,
          dps:           q.dps,
          dividendYield: q.dividendYield,
          market:        "KR" as const,
        };
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
