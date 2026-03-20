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

  try {
    const res = await yf.search(q, { quotesCount: 10, newsCount: 0 });

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
        const ticker = sym.replace(".KS", "").replace(".KQ", "");
        const name   = item.longname ?? item.shortname ?? sym;
        return { ticker, name, market };
      });

    return NextResponse.json({ results: filtered.slice(0, 8) });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
