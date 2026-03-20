import { NextRequest, NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// 랭킹은 1시간 캐시 (Yahoo Finance 호출 최소화)
export const revalidate = 3600;

function getClient() {
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey"] });
}

// ── 한국 KOSPI/KOSDAQ 주요 고배당 후보 (70개 이상 — Yahoo Finance 필터 후 상위 50개 반환)
const KR_TICKERS = [
  // 은행/금융
  { ticker: "105560.KS", name: "KB금융" },
  { ticker: "055550.KS", name: "신한지주" },
  { ticker: "086790.KS", name: "하나금융지주" },
  { ticker: "316140.KS", name: "우리금융지주" },
  { ticker: "024110.KS", name: "기업은행" },
  { ticker: "138930.KS", name: "BNK금융지주" },
  { ticker: "139130.KS", name: "DGB금융지주" },
  { ticker: "175330.KS", name: "JB금융지주" },
  { ticker: "138040.KS", name: "메리츠금융지주" },
  // 보험
  { ticker: "032830.KS", name: "삼성생명" },
  { ticker: "088350.KS", name: "한화생명" },
  { ticker: "005830.KS", name: "DB손해보험" },
  { ticker: "000810.KS", name: "삼성화재" },
  { ticker: "001450.KS", name: "현대해상" },
  { ticker: "000060.KS", name: "메리츠화재" },
  // 통신
  { ticker: "017670.KS", name: "SK텔레콤" },
  { ticker: "030200.KS", name: "KT" },
  { ticker: "032640.KS", name: "LG유플러스" },
  // 담배/소비재
  { ticker: "033780.KS", name: "KT&G" },
  // 인프라/유틸리티
  { ticker: "088980.KS", name: "맥쿼리인프라" },
  { ticker: "015760.KS", name: "한국전력" },
  { ticker: "036460.KS", name: "한국가스공사" },
  // 에너지/정유
  { ticker: "010950.KS", name: "S-Oil" },
  { ticker: "096770.KS", name: "SK이노베이션" },
  { ticker: "078930.KS", name: "GS" },
  // 철강/소재
  { ticker: "005490.KS", name: "POSCO홀딩스" },
  { ticker: "010130.KS", name: "고려아연" },
  { ticker: "000670.KS", name: "영풍" },
  { ticker: "002380.KS", name: "KCC" },
  { ticker: "073240.KS", name: "금호석유" },
  // 자동차/부품
  { ticker: "000270.KS", name: "기아" },
  { ticker: "005380.KS", name: "현대차" },
  { ticker: "012330.KS", name: "현대모비스" },
  { ticker: "161390.KS", name: "한국타이어앤테크놀로지" },
  // 지주사
  { ticker: "034730.KS", name: "SK" },
  { ticker: "003550.KS", name: "LG" },
  { ticker: "000150.KS", name: "두산" },
  { ticker: "000880.KS", name: "한화" },
  { ticker: "001040.KS", name: "CJ" },
  { ticker: "006260.KS", name: "LS" },
  { ticker: "028260.KS", name: "삼성물산" },
  { ticker: "267250.KS", name: "HD현대" },
  { ticker: "004800.KS", name: "효성" },
  // 전자/반도체
  { ticker: "005930.KS", name: "삼성전자" },
  { ticker: "009150.KS", name: "삼성전기" },
  { ticker: "011070.KS", name: "LG이노텍" },
  // 유통/식품/음료
  { ticker: "282330.KS", name: "BGF리테일" },
  { ticker: "007070.KS", name: "GS리테일" },
  { ticker: "139480.KS", name: "이마트" },
  { ticker: "023530.KS", name: "롯데쇼핑" },
  { ticker: "097950.KS", name: "CJ제일제당" },
  { ticker: "001680.KS", name: "대상" },
  { ticker: "000080.KS", name: "하이트진로" },
  { ticker: "004170.KS", name: "신세계" },
  { ticker: "069960.KS", name: "현대백화점" },
  // 엔터/레저
  { ticker: "035250.KS", name: "강원랜드" },
  // 건설/방산/조선
  { ticker: "000720.KS", name: "현대건설" },
  { ticker: "047810.KS", name: "한국항공우주" },
  { ticker: "009540.KS", name: "HD한국조선해양" },
  { ticker: "042660.KS", name: "한화오션" },
  { ticker: "064350.KS", name: "현대로템" },
  // 바이오/의약
  { ticker: "000100.KS", name: "유한양행" },
  // 화학/소재
  { ticker: "051910.KS", name: "LG화학" },
  { ticker: "006400.KS", name: "삼성SDI" },
  // 기타
  { ticker: "002790.KS", name: "아모레퍼시픽" },
  { ticker: "051900.KS", name: "LG생활건강" },
  { ticker: "003490.KS", name: "대한항공" },
  { ticker: "034020.KS", name: "두산에너빌리티" },
];

// ── 미국 고배당 후보 (70개 이상)
const US_TICKERS = [
  // 통신
  { ticker: "T",    name: "AT&T" },
  { ticker: "VZ",   name: "Verizon" },
  // 담배
  { ticker: "MO",   name: "Altria Group" },
  { ticker: "PM",   name: "Philip Morris" },
  { ticker: "BTI",  name: "British American Tobacco" },
  // REIT
  { ticker: "O",    name: "Realty Income" },
  { ticker: "WPC",  name: "W. P. Carey" },
  { ticker: "STAG", name: "STAG Industrial" },
  { ticker: "NLY",  name: "Annaly Capital" },
  { ticker: "AGNC", name: "AGNC Investment" },
  { ticker: "MPW",  name: "Medical Properties Trust" },
  { ticker: "LTC",  name: "LTC Properties" },
  { ticker: "EPR",  name: "EPR Properties" },
  // Covered Call / 고배당 ETF
  { ticker: "JEPI", name: "JPMorgan Equity Premium Income" },
  { ticker: "JEPQ", name: "JPMorgan Nasdaq Equity Premium" },
  { ticker: "SCHD", name: "Schwab US Dividend" },
  { ticker: "HDV",  name: "iShares Core High Dividend" },
  { ticker: "SPYD", name: "SPDR S&P 500 High Dividend" },
  { ticker: "DVY",  name: "iShares Select Dividend" },
  { ticker: "VYM",  name: "Vanguard High Dividend Yield" },
  { ticker: "QYLD", name: "Global X NASDAQ-100 Covered Call" },
  { ticker: "XYLD", name: "Global X S&P 500 Covered Call" },
  { ticker: "RYLD", name: "Global X Russell 2000 Covered Call" },
  // 소비재
  { ticker: "KO",   name: "Coca-Cola" },
  { ticker: "PEP",  name: "PepsiCo" },
  { ticker: "GIS",  name: "General Mills" },
  { ticker: "CAG",  name: "ConAgra Brands" },
  { ticker: "MCD",  name: "McDonald's" },
  { ticker: "TGT",  name: "Target" },
  { ticker: "WMT",  name: "Walmart" },
  // 헬스케어/제약
  { ticker: "JNJ",  name: "Johnson & Johnson" },
  { ticker: "ABBV", name: "AbbVie" },
  { ticker: "PFE",  name: "Pfizer" },
  { ticker: "BMY",  name: "Bristol-Myers Squibb" },
  { ticker: "MRK",  name: "Merck" },
  { ticker: "AMGN", name: "Amgen" },
  { ticker: "GILD", name: "Gilead Sciences" },
  { ticker: "CVS",  name: "CVS Health" },
  { ticker: "WBA",  name: "Walgreens Boots Alliance" },
  // 기술
  { ticker: "IBM",  name: "IBM" },
  { ticker: "INTC", name: "Intel" },
  { ticker: "TXN",  name: "Texas Instruments" },
  { ticker: "QCOM", name: "Qualcomm" },
  { ticker: "AVGO", name: "Broadcom" },
  { ticker: "STX",  name: "Seagate Technology" },
  // 에너지
  { ticker: "XOM",  name: "ExxonMobil" },
  { ticker: "CVX",  name: "Chevron" },
  { ticker: "EPD",  name: "Enterprise Products Partners" },
  { ticker: "ET",   name: "Energy Transfer" },
  { ticker: "OKE",  name: "ONEOK" },
  { ticker: "ENB",  name: "Enbridge" },
  { ticker: "MPC",  name: "Marathon Petroleum" },
  { ticker: "PSX",  name: "Phillips 66" },
  { ticker: "VLO",  name: "Valero Energy" },
  // 산업/소재
  { ticker: "MMM",  name: "3M" },
  { ticker: "LYB",  name: "LyondellBasell Industries" },
  { ticker: "DOW",  name: "Dow Inc" },
  { ticker: "CAT",  name: "Caterpillar" },
  { ticker: "EMR",  name: "Emerson Electric" },
  // 금융
  { ticker: "MAIN", name: "Main Street Capital" },
  { ticker: "ARCC", name: "Ares Capital" },
  { ticker: "FS",   name: "FS KKR Capital" },
  // 유틸리티
  { ticker: "D",    name: "Dominion Energy" },
  { ticker: "NEE",  name: "NextEra Energy" },
  { ticker: "ED",   name: "Consolidated Edison" },
  { ticker: "SO",   name: "Southern Company" },
  { ticker: "DUK",  name: "Duke Energy" },
  { ticker: "WEC",  name: "WEC Energy Group" },
  { ticker: "AEP",  name: "American Electric Power" },
  // 자동차
  { ticker: "F",    name: "Ford Motor" },
  // 광업
  { ticker: "RIO",  name: "Rio Tinto" },
  { ticker: "FCX",  name: "Freeport-McMoRan" },
];

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market") ?? "US";
  const list   = market === "KR" ? KR_TICKERS : US_TICKERS;
  const yf     = getClient();

  const results = await Promise.allSettled(
    list.map(async ({ ticker, name: koreanName }) => {
      const quote = await yf.quote(ticker);
      const price  = quote?.regularMarketPrice ?? null;
      const dps: number | null = (quote as any)?.trailingAnnualDividendRate ?? null;
      let dividendYield: number | null = (quote as any)?.trailingAnnualDividendYield ?? null;

      if (dividendYield == null && dps != null && price != null && price > 0) {
        dividendYield = dps / price;
      }

      return { ticker, name: koreanName, dividendYield, dps, price, market };
    })
  );

  const data = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((d) => d.dividendYield != null && d.dividendYield > 0)
    .sort((a, b) => b.dividendYield - a.dividendYield)
    .slice(0, 50); // 상위 50개만 반환

  return NextResponse.json({ market, data });
}
