#!/usr/bin/env node
/**
 * scripts/build-ticker-master.js
 * DART corpCode.xml (ZIP)에서 전체 KR 상장 종목을 가져와
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

/* ── 메인 ── */
async function main() {
  loadEnv();
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    console.error("❌ DART_API_KEY가 .env.local에 설정되어 있지 않습니다.");
    process.exit(1);
  }

  console.log("🚀 DART corpCode.xml 기반 종목 마스터 DB 재구축 시작\n");

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
    const all = companies.map((c) => {
      const ticker = c.stock_code;
      const name = c.corp_name;
      // exchange 추론: DART는 corp_cls 정보를 별도로 제공하지 않음
      // 6자리 숫자 ticker 기준으로 분류 불가이므로 일단 "KS"로 설정
      // (Yahoo Finance 검색 시 .KS/.KQ로 실제 구분됨)
      return {
        name,
        ticker,
        exchange: "KS", // 기본값; 실제 검색 시 Yahoo가 결정
        type: classifyType(name, ticker),
        market: "KR",
      };
    });

    // 가나다순 정렬
    all.sort((a, b) => a.name.localeCompare(b.name, "ko"));

    // 5. 저장
    const outPath = path.join(__dirname, "..", "public", "ticker_master.json");
    fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf-8");

    const stocks = all.filter((x) => x.type === "stock").length;
    const etfs   = all.filter((x) => x.type === "etf").length;
    const reits  = all.filter((x) => x.type === "reit").length;

    console.log("\n📊 결과:");
    console.log(`  전체: ${all.length}개`);
    console.log(`  주식: ${stocks}개`);
    console.log(`  ETF:  ${etfs}개`);
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
