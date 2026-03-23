#!/usr/bin/env node
/**
 * scripts/build-ticker-master.js
 * DART corpCode.xml + Yahoo Finance ETF 검색으로
 * public/ticker_master.json을 재구축합니다.
 *
 * 실행: node scripts/build-ticker-master.js
 * (DART_API_KEY를 .env.local에서 자동으로 읽습니다)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/* ── .env.local 로드 ── */
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

/* ── 분류 상수 ── */
const REIT_TICKERS = new Set([
  "088980","395400","432320","448730","330590","293940","357430","334890",
  "365550","396690","348950","370090","417310","350520","475560","466920",
  "350360","323250","396420","404990","451800","377190","466980","462940",
  "437080","445680","412580",
]);

const ETF_NAME_PATTERNS = [
  /^KODEX/, /^TIGER/, /^KBSTAR/, /^HANARO/, /^SOL\s/, /^ACE\s/,
  /^ARIRANG/, /^KOSEF/, /^FOCUS/, /^SMART/, /^TIMEFOLIO/,
  /^PLUS\s/, /^MASTER/, /^파워\s/, /^히어로/, /ETF$/i,
];

function classifyType(name, ticker) {
  if (REIT_TICKERS.has(ticker)) return "reit";
  if (ETF_NAME_PATTERNS.some((p) => p.test(name))) return "etf";
  return "stock";
}

/* ── ZIP 파일 다운로드 ── */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
    }).on("error", reject);
  });
}

/* ── XML 파싱 (regex 기반) ── */
function parseCorpCodeXml(xmlContent) {
  const results = [];
  // 각 <list>...</list> 블록 추출
  const listRegex = /<list>([\s\S]*?)<\/list>/g;
  let match;
  while ((match = listRegex.exec(xmlContent)) !== null) {
    const block = match[1];
    const extract = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
      return m ? m[1].trim() : "";
    };
    const stockCode = extract("stock_code");
    const corpName  = extract("corp_name");
    if (stockCode) {
      results.push({ corp_name: corpName, stock_code: stockCode });
    }
  }
  return results;
}

/* ── 네이버 Finance로 전체 KR ETF 목록 조회 ── */
// 네이버 금융 ETF 리스트 API — 인증 불필요, 한국어 ETF명 + 전체 목록 제공
async function fetchEtfListFromNaver() {
  // 네이버 금융 ETF 목록 (전체 조회, 시가총액 내림차순)
  const url = "https://finance.naver.com/api/sise/etfItemList.naver?etfType=0&targetColumn=market_sum&sortOrder=desc";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer":    "https://finance.naver.com/",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`Naver Finance HTTP ${res.status}`);
  const json = await res.json();

  if (json.resultCode !== "success") throw new Error(`Naver 응답 오류: ${json.resultCode}`);
  const items = json.result?.etfItemList ?? [];
  if (!items.length) throw new Error("Naver ETF 목록 비어있음");

  return items.map((item) => ({
    name:     String(item.itemname ?? ""),
    ticker:   String(item.itemcode ?? "").trim(),
    exchange: "KS",
    type:     "etf",
    market:   "KR",
  })).filter((e) => e.ticker && /^\d{6}$/.test(e.ticker) && e.name);
}

/* ── KIS API로 ETF 목록 동적 조회 (fallback) ── */
// KIS 배당순위 조회 (ETF 시장) → 배당 지급 ETF 수집 (전체 목록이 아닌 배당주 위주)
async function fetchEtfListFromKis(appKey, appSecret) {
  // 1. Access Token 발급
  const tokenRes = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
    method:  "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body:    JSON.stringify({ grant_type: "client_credentials", appkey: appKey, appsecret: appSecret }),
    signal:  AbortSignal.timeout(12000),
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  if (!token) throw new Error(`KIS token 발급 실패: ${tokenData.msg1 ?? ""}`);

  // 2. ETF 배당순위 페이지네이션 (HHKDB13470100, ETF 시장)
  const today    = new Date();
  const ttmStart = new Date(today); ttmStart.setDate(ttmStart.getDate() - 365);
  const F_DT     = ttmStart.toISOString().split("T")[0].replace(/-/g, "");
  const T_DT     = today.toISOString().split("T")[0].replace(/-/g, "");

  const etfs  = [];
  const seen  = new Set();
  let ctsArea = "";
  let page    = 0;

  do {
    const url = new URL("https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/ranking/dividend-rate");
    url.searchParams.set("fid_cond_mrkt_div_code",  "ETF");
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
    url.searchParams.set("F_DT",                      F_DT);
    url.searchParams.set("T_DT",                      T_DT);
    url.searchParams.set("GB4",                       "0");

    const res = await fetch(url.toString(), {
      headers: {
        "authorization":  `Bearer ${token}`,
        "appkey":         appKey,
        "appsecret":      appSecret,
        "tr_id":          "HHKDB13470100",
        "custtype":       "P",
        "Content-Type":   "application/json; charset=utf-8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) { console.warn(`  KIS ETF 조회 HTTP ${res.status}`); break; }
    const json = await res.json();
    if (json.rt_cd !== "0" || !Array.isArray(json.output)) break;

    for (const o of json.output) {
      if (!o.sht_cd) continue;
      const ticker = String(o.sht_cd).trim();
      if (seen.has(ticker)) continue;
      seen.add(ticker);
      etfs.push({
        name:     String(o.isin_name ?? ticker),
        ticker,
        exchange: "KS",
        type:     "etf",
        market:   "KR",
      });
    }

    ctsArea = String(json.CTS_AREA ?? "").trim();
    page++;
    await new Promise((r) => setTimeout(r, 200)); // rate limit
  } while (ctsArea !== "" && page < 15);

  return etfs;
}

/* ── 메인 ── */
async function main() {
  loadEnv();
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    console.error("❌ DART_API_KEY가 .env.local에 설정되어 있지 않습니다.");
    process.exit(1);
  }

  console.log("🚀 DART corpCode.xml + Yahoo ETF 기반 종목 마스터 DB 재구축 시작\n");

  // 임시 디렉터리 설정
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dart-"));
  const zipPath = path.join(tmpDir, "corpCode.zip");
  const extractDir = path.join(tmpDir, "extracted");

  try {
    // 1. ZIP 다운로드
    const dartUrl = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`;
    process.stdout.write("⬇️  DART corpCode.zip 다운로드 중... ");
    await downloadFile(dartUrl, zipPath);
    const zipSize = (fs.statSync(zipPath).size / 1024).toFixed(1);
    console.log(`완료 (${zipSize} KB)`);

    // 2. ZIP 압축 해제 (PowerShell)
    process.stdout.write("📦 압축 해제 중... ");
    fs.mkdirSync(extractDir, { recursive: true });
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
      { stdio: "pipe" }
    );
    console.log("완료");

    // 3. XML 파일 찾기
    const xmlFiles = fs.readdirSync(extractDir).filter((f) => f.endsWith(".xml"));
    if (xmlFiles.length === 0) {
      throw new Error("압축 해제된 XML 파일을 찾을 수 없습니다.");
    }
    const xmlPath = path.join(extractDir, xmlFiles[0]);
    process.stdout.write(`📄 XML 파싱 중 (${xmlFiles[0]})... `);
    const xmlContent = fs.readFileSync(xmlPath, "utf-8");
    const companies = parseCorpCodeXml(xmlContent);
    console.log(`${companies.length}개 회사 파싱`);

    // 4. 데이터 변환 및 필터
    const dartItems = companies.map((c) => {
      const ticker = c.stock_code;
      const name = c.corp_name;
      return {
        name,
        ticker,
        exchange: "KS", // 기본값; Yahoo가 실제 KS/KQ 결정
        type: classifyType(name, ticker),
        market: "KR",
      };
    });

    // 5. ETF 목록 조회 — Naver Finance(primary) → KIS(fallback)
    process.stdout.write("🔍 네이버 금융에서 전체 ETF 목록 조회 중... ");
    let allEtfs = [];
    try {
      allEtfs = await fetchEtfListFromNaver();
      console.log(`네이버 금융에서 ETF ${allEtfs.length}개 조회`);
    } catch (e) {
      console.warn(`네이버 금융 조회 실패: ${e.message} → KIS fallback 시도`);
      const kisAppKey    = process.env.KIS_APP_KEY    ?? "";
      const kisAppSecret = process.env.KIS_APP_SECRET ?? "";
      if (kisAppKey && kisAppSecret) {
        try {
          allEtfs = await fetchEtfListFromKis(kisAppKey, kisAppSecret);
          console.log(`KIS fallback에서 ETF ${allEtfs.length}개 조회`);
        } catch (e2) {
          console.warn(`KIS ETF 조회도 실패: ${e2.message}`);
        }
      }
    }

    // 6. 병합 (DART에 없는 ETF만 추가)
    const dartTickers = new Set(dartItems.map((x) => x.ticker));
    const newEtfs = allEtfs.filter((e) => !dartTickers.has(e.ticker));
    const all = [...dartItems, ...newEtfs];

    // 가나다순 정렬
    all.sort((a, b) => a.name.localeCompare(b.name, "ko"));

    // 7. 저장
    const outPath = path.join(__dirname, "..", "public", "ticker_master.json");
    fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf-8");

    const stocks = all.filter((x) => x.type === "stock").length;
    const etfs   = all.filter((x) => x.type === "etf").length;
    const reits  = all.filter((x) => x.type === "reit").length;

    console.log("\n📊 결과:");
    console.log(`  전체: ${all.length}개`);
    console.log(`  주식: ${stocks}개`);
    console.log(`  ETF:  ${etfs}개 (KRX/KIS 보강 ${newEtfs.length}개 포함)`);
    console.log(`  리츠: ${reits}개`);
    console.log(`\n✅ 저장 완료: ${outPath}`);

    // 6. 검증
    const checkList = [
      { name: "SK가스",    ticker: "018670" },
      { name: "이크레더블", ticker: "092130" },
      { name: "맥쿼리인프라", ticker: "088980" },
      { name: "삼성전자",  ticker: "005930" },
      { name: "KODEX 200", ticker: "069500" },
    ];
    console.log("\n🔍 주요 종목 확인:");
    for (const { name, ticker } of checkList) {
      const found = all.find((x) => x.ticker === ticker);
      console.log(`  ${name} (${ticker}): ${found ? `✅ ${found.name}` : "❌ 없음"}`);
    }

  } finally {
    // 임시 파일 정리
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((e) => {
  console.error("\n💥 오류:", e.message);
  process.exit(1);
});
