import { NextRequest, NextResponse } from "next/server";

function getClient() {
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey"] });
}

const KR_TICKERS = [
  { ticker: "105560.KS", name: "KB금융" },
  { ticker: "055550.KS", name: "신한지주" },
  { ticker: "086790.KS", name: "하나금융지주" },
  { ticker: "316140.KS", name: "우리금융지주" },
  { ticker: "032830.KS", name: "삼성생명" },
  { ticker: "088350.KS", name: "한화생명" },
  { ticker: "017670.KS", name: "SK텔레콤" },
  { ticker: "030200.KS", name: "KT" },
  { ticker: "033780.KS", name: "KT&G" },
  { ticker: "005930.KS", name: "삼성전자" },
  { ticker: "000660.KS", name: "SK하이닉스" },
  { ticker: "000270.KS", name: "기아" },
  { ticker: "005380.KS", name: "현대차" },
  { ticker: "015760.KS", name: "한국전력" },
  { ticker: "096770.KS", name: "SK이노베이션" },
  { ticker: "012330.KS", name: "현대모비스" },
  { ticker: "009150.KS", name: "삼성전기" },
  { ticker: "018260.KS", name: "삼성에스디에스" },
  { ticker: "034730.KS", name: "SK" },
  { ticker: "003550.KS", name: "LG" },
];

const US_TICKERS = [
  { ticker: "T",    name: "AT&T" },
  { ticker: "VZ",   name: "Verizon" },
  { ticker: "MO",   name: "Altria Group" },
  { ticker: "PM",   name: "Philip Morris" },
  { ticker: "O",    name: "Realty Income" },
  { ticker: "JEPI", name: "JPMorgan Equity Premium" },
  { ticker: "SCHD", name: "Schwab US Dividend" },
  { ticker: "KO",   name: "Coca-Cola" },
  { ticker: "PEP",  name: "PepsiCo" },
  { ticker: "JNJ",  name: "Johnson & Johnson" },
  { ticker: "ABBV", name: "AbbVie" },
  { ticker: "PFE",  name: "Pfizer" },
  { ticker: "IBM",  name: "IBM" },
  { ticker: "XOM",  name: "ExxonMobil" },
  { ticker: "CVX",  name: "Chevron" },
  { ticker: "MMM",  name: "3M" },
  { ticker: "D",    name: "Dominion Energy" },
  { ticker: "NEE",  name: "NextEra Energy" },
  { ticker: "WPC",  name: "W. P. Carey" },
  { ticker: "MAIN", name: "Main Street Capital" },
];

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market") ?? "US";
  const list = market === "KR" ? KR_TICKERS : US_TICKERS;
  const yf = getClient();

  const results = await Promise.allSettled(
    list.map(async ({ ticker, name: fallbackName }) => {
      const [quote, summary] = await Promise.all([
        yf.quote(ticker),
        yf.quoteSummary(ticker, { modules: ["summaryDetail"] }),
      ]);
      const detail = summary?.summaryDetail;
      const dividendYield = detail?.dividendYield ?? null;
      const dps           = detail?.dividendRate  ?? null;
      const price         = quote?.regularMarketPrice ?? null;
      const name          = quote?.longName ?? quote?.shortName ?? fallbackName;
      return { ticker, name, dividendYield, dps, price, market };
    })
  );

  const data = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((d) => d.dividendYield != null && d.dividendYield > 0)
    .sort((a, b) => b.dividendYield - a.dividendYield);

  return NextResponse.json({ market, data });
}
