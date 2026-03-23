/**
 * Open DART API 헬퍼
 * 공식 공시 기반 배당 데이터 조회 (배당금, 배당성향, 배당 기준일 등)
 * https://opendart.fss.or.kr
 *
 * 수정 이력:
 *   - dividend.json → alotMatter.json (올바른 배당 정보 엔드포인트)
 *   - getCorpCode: corpCode.xml ZIP 다운로드로 stock_code → corp_code 정확히 매핑
 */

const DART_BASE = "https://opendart.fss.or.kr/api";
const API_KEY   = process.env.DART_API_KEY ?? "";

// ─── 인메모리 캐시 ─────────────────────────────────────────────────────────
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

// ─── corp_code 매핑 테이블 (stock_code 6자리 → corp_code 8자리) ────────────
let corpCodeMap: Map<string, string> | null = null;
let corpCodeMapExpiresAt = 0;

/**
 * DART corpCode.xml ZIP을 다운로드하여 stock_code → corp_code 매핑 빌드
 * 24시간 캐시
 */
async function buildCorpCodeMap(): Promise<Map<string, string>> {
  if (corpCodeMap && Date.now() < corpCodeMapExpiresAt) {
    return corpCodeMap;
  }

  try {
    const res = await fetch(
      `${DART_BASE}/corpCode.xml?crtfc_key=${API_KEY}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) throw new Error(`corpCode.xml HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());

    // adm-zip으로 ZIP 해제
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AdmZip = require("adm-zip");
    const zip    = new AdmZip(buffer);
    const xmlEntry = zip.getEntries().find((e: any) =>
      e.entryName.toLowerCase().includes("corpcode"),
    );
    if (!xmlEntry) throw new Error("CORPCODE.xml not found in ZIP");

    const xml = xmlEntry.getData().toString("utf8");

    // XML 파싱 (정규식 — 의존성 추가 없이)
    const map = new Map<string, string>();
    const re  = /<list>[\s\S]*?<corp_code>(\d{8})<\/corp_code>[\s\S]*?<stock_code>\s*(\d{6})\s*<\/stock_code>[\s\S]*?<\/list>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      map.set(m[2], m[1]); // stock_code → corp_code
    }

    corpCodeMap          = map;
    corpCodeMapExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    return map;
  } catch (e) {
    // 실패 시 빈 맵 반환 (다음 요청에서 재시도)
    return new Map();
  }
}

// ─── stock_code → corp_code ────────────────────────────────────────────────
export async function getCorpCode(stockCode: string): Promise<string | null> {
  const cacheKey = `corp:${stockCode}`;
  const cached   = getCached<string>(cacheKey);
  if (cached) return cached;

  const map      = await buildCorpCodeMap();
  const corpCode = map.get(stockCode) ?? null;
  if (corpCode) setCached(cacheKey, corpCode);
  return corpCode;
}

// ─── 배당 공시 조회 (alotMatter.json) ─────────────────────────────────────
export interface DartDividend {
  /** 주당 현금 배당금 (원) */
  dps:           number | null;
  /** 시가 배당율 (소수, 0.027 = 2.7%) */
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
 */
export async function getDartDividend(
  stockCode: string,
  year?: number,
): Promise<DartDividend | null> {
  if (!API_KEY) return null;

  // 현재 연도 기준으로 전년도부터 시도 (사업보고서는 익년 3~4월에 제출)
  const currentYear = new Date().getFullYear();
  const yearsToTry  = year
    ? [year]
    : [currentYear - 1, currentYear - 2]; // 2025 → 2024 순으로 시도

  for (const fiscalYear of yearsToTry) {
    const result = await fetchDartDividend(stockCode, fiscalYear);
    if (result) return result;
  }
  return null;
}

async function fetchDartDividend(
  stockCode: string,
  fiscalYear: number,
): Promise<DartDividend | null> {
  const cacheKey = `div:${stockCode}:${fiscalYear}`;
  const cached   = getCached<DartDividend>(cacheKey);
  if (cached) return cached;

  const corpCode = await getCorpCode(stockCode);
  if (!corpCode) return null;

  try {
    const url =
      `${DART_BASE}/alotMatter.json` +
      `?crtfc_key=${API_KEY}` +
      `&corp_code=${corpCode}` +
      `&bsns_year=${fiscalYear}` +
      `&reprt_code=11011`;

    const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const json = await res.json();

    if (json.status !== "000" || !json.list?.length) return null;

    const rows: any[] = json.list;

    const parseNum = (val: string | undefined): number | null => {
      if (!val || val === "-" || val.trim() === "") return null;
      const n = parseFloat(val.replace(/,/g, ""));
      return isNaN(n) ? null : n;
    };

    // 주당 현금배당금 (보통주 우선)
    const dpsRow = rows.find(
      (r: any) =>
        r.se?.includes("주당 현금배당금") &&
        (!r.stock_knd || r.stock_knd === "보통주"),
    );
    // 현금배당수익률 (보통주)
    const yieldRow = rows.find(
      (r: any) =>
        r.se?.includes("현금배당수익률") &&
        (!r.stock_knd || r.stock_knd === "보통주"),
    );
    // 현금배당성향
    const payoutRow = rows.find(
      (r: any) =>
        r.se?.includes("현금배당성향") || r.se?.includes("배당성향"),
    );

    const dps           = parseNum(dpsRow?.thstrm);
    const yieldPct      = parseNum(yieldRow?.thstrm);
    const dividendYield = yieldPct != null ? yieldPct / 100 : null;
    const payoutRatio   = parseNum(payoutRow?.thstrm);

    // 결산일에서 기준일 추출
    const recordDate = rows[0]?.stlm_dt ?? null;

    if (dps == null && dividendYield == null) return null;

    const result: DartDividend = {
      dps,
      dividendYield,
      payoutRatio,
      recordDate,
      fiscalYear: String(fiscalYear),
    };

    setCached(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ─── 배당 관련 공시 목록 조회 ──────────────────────────────────────────────
export interface DartDisclosure {
  reportName: string;
  receiptNo:  string;
  date:       string;
  url:        string;
  corpName:   string;
}

export async function getDartDisclosures(
  stockCode: string,
  limit = 5,
): Promise<DartDisclosure[]> {
  if (!API_KEY) return [];

  const cacheKey = `disc:${stockCode}`;
  const cached   = getCached<DartDisclosure[]>(cacheKey);
  if (cached) return cached;

  const corpCode = await getCorpCode(stockCode);
  if (!corpCode) return [];

  try {
    const url =
      `${DART_BASE}/list.json` +
      `?crtfc_key=${API_KEY}` +
      `&corp_code=${corpCode}` +
      `&pblntf_ty=A` +
      `&page_no=1` +
      `&page_count=20`;

    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();

    if (json.status !== "000" || !json.list?.length) return [];

    const KEYWORDS = ["배당", "결산", "이익잉여금", "현금배당"];
    const filtered: DartDisclosure[] = (json.list as any[])
      .filter((item: any) =>
        KEYWORDS.some((kw) => (item.report_nm ?? "").includes(kw)),
      )
      .slice(0, limit)
      .map((item: any) => ({
        reportName: item.report_nm,
        receiptNo:  item.rcept_no,
        date:       item.rcept_dt?.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") ?? "",
        url:        `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
        corpName:   item.corp_name ?? "",
      }));

    setCached(cacheKey, filtered, 6 * 60 * 60 * 1000);
    return filtered;
  } catch {
    return [];
  }
}
