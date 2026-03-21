import { NextRequest, NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey"] });
}

export async function GET(req: NextRequest) {
  const q      = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const market = req.nextUrl.searchParams.get("market") ?? "US";

  if (!q) return NextResponse.json({ results: [] });

  // Korean stocks are now handled client-side via ticker_master.json
  // This endpoint only serves US stock searches
  if (market === "KR") {
    return NextResponse.json({ results: [] });
  }

  try {
    const yf = getClient();
    const res = await yf.search(q, { quotesCount: 20, newsCount: 0 });
    const quotes: any[] = res.quotes ?? [];

    const results = quotes
      .filter((item) => {
        const sym: string = item.symbol ?? "";
        return !sym.includes("."); // US tickers only
      })
      .map((item) => ({
        ticker:   item.symbol,
        name:     item.longname ?? item.shortname ?? item.symbol,
        market:   "US",
        exchange: null,
        type:     "stock" as const,
      }))
      .slice(0, 20);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
