import { NextRequest, NextResponse } from "next/server";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey"] });
}

export async function GET(req: NextRequest) {
  const q      = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const market = req.nextUrl.searchParams.get("market") ?? "KR";

  if (!q) return NextResponse.json({ results: [] });

  const yf = getClient();

  // 6자리 숫자 → 한국 티커 직접 조회
  if (market === "KR" && /^\d{5,6}$/.test(q)) {
    const padded = q.padStart(6, "0");
    // .KS 먼저, 실패 시 .KQ
    for (const suffix of [".KS", ".KQ"]) {
      try {
        const quote = await yf.quote(`${padded}${suffix}`);
        if (quote?.regularMarketPrice != null) {
          const name     = quote.longName ?? quote.shortName ?? padded;
          const exchange = suffix === ".KS" ? "KS" : "KQ";
          return NextResponse.json({
            results: [{ ticker: padded, name, market: "KR", exchange }],
          });
        }
      } catch { /* try next suffix */ }
    }
    return NextResponse.json({ results: [] });
  }

  try {
    // 영문+한글 검색 모두 시도 (KR은 한글 종목명 검색 지원)
    const res = await yf.search(q, { quotesCount: 20, newsCount: 0 });

    const quotes: any[] = res.quotes ?? [];

    const filtered = quotes
      .filter((item) => {
        const sym: string = item.symbol ?? "";
        if (market === "KR") return sym.endsWith(".KS") || sym.endsWith(".KQ");
        // US: 점 없는 심볼 (AAPL, KO 등), ETF 포함
        return !sym.includes(".");
      })
      .map((item) => {
        const sym: string = item.symbol ?? "";
        const exchange = sym.endsWith(".KQ") ? "KQ" : sym.endsWith(".KS") ? "KS" : null;
        const ticker   = sym.replace(".KS", "").replace(".KQ", "");
        const name     = item.longname ?? item.shortname ?? sym;
        return { ticker, name, market, exchange };
      });

    return NextResponse.json({ results: filtered.slice(0, 20) });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
