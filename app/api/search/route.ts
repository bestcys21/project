import { NextRequest, NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
}

const KR_REIT_TICKERS = new Set([
  "088980","395400","432320","448730","330590","293940","357430","334890",
  "365550","396690","348950","370090","417310","350520","475560","466920",
  "350360","323250","396420","404990","451800","377190","466980","462940",
  "437080","445680","412580",
]);

function detectKrType(quoteType: string, name: string, ticker: string): "stock" | "etf" | "reit" {
  if (KR_REIT_TICKERS.has(ticker)) return "reit";
  if (quoteType === "ETF") return "etf";
  // 이름 기반 ETF 패턴
  if (/^(KODEX|TIGER|KBSTAR|HANARO|SOL\s|ACE\s|ARIRANG|KOSEF|TIMEFOLIO|PLUS\s|MASTER|파워\s|히어로)/i.test(name)) return "etf";
  return "stock";
}

function detectUsType(quoteType: string): "stock" | "etf" | "reit" {
  if (quoteType === "ETF" || quoteType === "MUTUALFUND") return "etf";
  if (quoteType === "EQUITY") return "stock";
  return "stock";
}

export async function GET(req: NextRequest) {
  const q      = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const market = req.nextUrl.searchParams.get("market") ?? "US";

  if (!q) return NextResponse.json({ results: [] });

  // Korean stocks: local DB first (client-side), API used as fallback
  if (market === "KR") {
    try {
      const yf = getClient();
      const res = await yf.search(q, { quotesCount: 20, newsCount: 0 });
      const quotes: any[] = res.quotes ?? [];
      const results = quotes
        .filter((item) => {
          const sym: string = item.symbol ?? "";
          return sym.endsWith(".KS") || sym.endsWith(".KQ");
        })
        .map((item) => {
          const sym: string  = item.symbol ?? "";
          const exchange     = sym.endsWith(".KQ") ? "KQ" : "KS";
          const ticker       = sym.replace(/\.(KS|KQ)$/, "");
          const name         = item.longname ?? item.shortname ?? ticker;
          const quoteType    = item.quoteType ?? "";
          return {
            ticker,
            name,
            market: "KR",
            exchange,
            type: detectKrType(quoteType, name, ticker),
          };
        })
        .slice(0, 15);
      return NextResponse.json({ results });
    } catch {
      return NextResponse.json({ results: [] });
    }
  }

  try {
    const yf = getClient();
    const res = await yf.search(q, { quotesCount: 20, newsCount: 0 });
    const quotes: any[] = res.quotes ?? [];

    const results = quotes
      .filter((item) => {
        const sym: string = item.symbol ?? "";
        const qt: string  = item.quoteType ?? "";
        return sym.length > 0 && !sym.includes(".") && qt !== "INDEX" && qt !== "CRYPTOCURRENCY";
      })
      .map((item) => ({
        ticker:   item.symbol as string,
        name:     item.longname ?? item.shortname ?? item.symbol ?? "",
        market:   "US",
        exchange: null,
        type:     detectUsType(item.quoteType ?? ""),
      }))
      .slice(0, 20);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
