import { NextRequest, NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const dynamic = "force-dynamic";

const REIT_TICKERS = new Set([
  "088980","395400","432320","448730","330590","293940","357430","334890",
  "365550","396690","348950","370090","417310","350520","475560","466920",
  "350360","323250","396420",
]);

const ETF_NAME_PATTERNS = [
  /^KODEX/, /^TIGER/, /^KBSTAR/, /^HANARO/, /^SOL\s/, /^ACE\s/,
  /^ARIRANG/, /^KOSEF/, /^FOCUS/, /^SMART/, /인덱스/, /ETF/,
];

function classifyType(name: string, ticker: string): "stock" | "etf" | "reit" {
  if (REIT_TICKERS.has(ticker)) return "reit";
  if (ETF_NAME_PATTERNS.some(p => p.test(name))) return "etf";
  return "stock";
}

// GET: 현재 마스터 DB 통계
export async function GET() {
  try {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const raw  = readFileSync(join(process.cwd(), "public", "ticker_master.json"), "utf-8");
    const data = JSON.parse(raw);

    const stats = {
      total:       data.length,
      stocks:      data.filter((d: any) => d.type === "stock").length,
      etfs:        data.filter((d: any) => d.type === "etf").length,
      reits:       data.filter((d: any) => d.type === "reit").length,
      lastChecked: new Date().toISOString(),
    };
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "마스터 DB를 읽을 수 없습니다." }, { status: 500 });
  }
}

// POST: DART 기반 마스터 DB 업데이트
export async function POST(req: NextRequest) {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DART_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    // ① DART company.json에서 상장 법인 전체 조회 (corp_cls=Y: 주권상장법인)
    const url = `https://opendart.fss.or.kr/api/company.json?crtfc_key=${apiKey}&corp_cls=Y&page_no=1&page_count=100`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
      return NextResponse.json({ error: `DART API 오류: ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    if (json.status !== "000") {
      return NextResponse.json({
        error: `DART 응답 오류: ${json.message ?? json.status}`,
        hint: "DART API는 corpCode.zip 방식의 전체 조회를 권장합니다. /api/refresh-master의 POST는 샘플 확인용입니다.",
        sampleData: json,
      }, { status: 200 });
    }

    const list = json.list ?? (json.stock_code ? [json] : []);
    const newItems = list
      .filter((c: any) => c.stock_code?.trim())
      .map((c: any) => ({
        name:     c.corp_name,
        ticker:   c.stock_code.trim(),
        exchange: c.corp_cls === "K" ? "KQ" : "KS",
        type:     classifyType(c.corp_name, c.stock_code.trim()),
        market:   "KR",
      }));

    return NextResponse.json({
      message:      "DART 조회 성공 (샘플)",
      fetched:      newItems.length,
      sample:       newItems.slice(0, 5),
      instructions: [
        "전체 KRX 종목 업데이트를 위해서는:",
        "1. DART corpCode.zip을 다운받아 XML 파싱",
        "2. 또는 KIS API의 국내주식 종목코드 마스터 사용",
        "3. 파싱 결과를 public/ticker_master.json에 저장",
      ],
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      hint: "네트워크 오류 또는 DART API 제한일 수 있습니다.",
    }, { status: 500 });
  }
}
