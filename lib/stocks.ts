import { Market } from "./types";

export interface StockItem {
  ticker: string; // Yahoo Finance 용 (접미사 없음)
  name:   string;
  market: Market;
}

// ── KOSPI / KOSDAQ 주요 종목 (200+)
export const KR_STOCKS: StockItem[] = [
  // 반도체/전자
  { ticker: "005930", name: "삼성전자",              market: "KR" },
  { ticker: "000660", name: "SK하이닉스",             market: "KR" },
  { ticker: "009150", name: "삼성전기",               market: "KR" },
  { ticker: "011070", name: "LG이노텍",               market: "KR" },
  { ticker: "066570", name: "LG전자",                 market: "KR" },
  { ticker: "010140", name: "삼성중공업",              market: "KR" },
  { ticker: "042700", name: "한미반도체",              market: "KR" },
  { ticker: "surftec", name: "DB하이텍",               market: "KR" },
  { ticker: "000990", name: "DB하이텍",               market: "KR" },
  // 금융/은행
  { ticker: "105560", name: "KB금융",                 market: "KR" },
  { ticker: "055550", name: "신한지주",                market: "KR" },
  { ticker: "086790", name: "하나금융지주",             market: "KR" },
  { ticker: "316140", name: "우리금융지주",             market: "KR" },
  { ticker: "024110", name: "기업은행",                market: "KR" },
  { ticker: "138930", name: "BNK금융지주",             market: "KR" },
  { ticker: "139130", name: "DGB금융지주",             market: "KR" },
  { ticker: "175330", name: "JB금융지주",              market: "KR" },
  { ticker: "138040", name: "메리츠금융지주",           market: "KR" },
  { ticker: "323410", name: "카카오뱅크",              market: "KR" },
  { ticker: "377300", name: "카카오페이",              market: "KR" },
  // 보험
  { ticker: "032830", name: "삼성생명",               market: "KR" },
  { ticker: "088350", name: "한화생명",               market: "KR" },
  { ticker: "005830", name: "DB손해보험",              market: "KR" },
  { ticker: "000810", name: "삼성화재",               market: "KR" },
  { ticker: "001450", name: "현대해상",               market: "KR" },
  { ticker: "000060", name: "메리츠화재",              market: "KR" },
  // 통신
  { ticker: "017670", name: "SK텔레콤",               market: "KR" },
  { ticker: "030200", name: "KT",                    market: "KR" },
  { ticker: "032640", name: "LG유플러스",              market: "KR" },
  // 자동차
  { ticker: "005380", name: "현대차",                 market: "KR" },
  { ticker: "000270", name: "기아",                   market: "KR" },
  { ticker: "012330", name: "현대모비스",              market: "KR" },
  { ticker: "161390", name: "한국타이어앤테크놀로지",   market: "KR" },
  { ticker: "002390", name: "넥센타이어",              market: "KR" },
  { ticker: "004020", name: "현대제철",               market: "KR" },
  // IT/플랫폼
  { ticker: "035420", name: "NAVER",                 market: "KR" },
  { ticker: "035420", name: "네이버",                 market: "KR" },
  { ticker: "035720", name: "카카오",                 market: "KR" },
  { ticker: "259960", name: "크래프톤",               market: "KR" },
  { ticker: "036570", name: "엔씨소프트",              market: "KR" },
  { ticker: "251270", name: "넷마블",                 market: "KR" },
  { ticker: "263750", name: "펄어비스",               market: "KR" },
  // 에너지/정유
  { ticker: "010950", name: "S-Oil",                 market: "KR" },
  { ticker: "096770", name: "SK이노베이션",             market: "KR" },
  { ticker: "078930", name: "GS",                    market: "KR" },
  { ticker: "015760", name: "한국전력",               market: "KR" },
  { ticker: "036460", name: "한국가스공사",             market: "KR" },
  { ticker: "088980", name: "맥쿼리인프라",             market: "KR" },
  // 철강/소재/화학
  { ticker: "005490", name: "POSCO홀딩스",            market: "KR" },
  { ticker: "005490", name: "포스코홀딩스",            market: "KR" },
  { ticker: "010130", name: "고려아연",               market: "KR" },
  { ticker: "000670", name: "영풍",                   market: "KR" },
  { ticker: "002380", name: "KCC",                   market: "KR" },
  { ticker: "073240", name: "금호석유",               market: "KR" },
  { ticker: "051910", name: "LG화학",                 market: "KR" },
  { ticker: "006400", name: "삼성SDI",                market: "KR" },
  { ticker: "011170", name: "롯데케미칼",              market: "KR" },
  { ticker: "047050", name: "포스코인터내셔널",         market: "KR" },
  { ticker: "001230", name: "동국제강",               market: "KR" },
  // 지주사
  { ticker: "034730", name: "SK",                    market: "KR" },
  { ticker: "003550", name: "LG",                    market: "KR" },
  { ticker: "000150", name: "두산",                   market: "KR" },
  { ticker: "000880", name: "한화",                   market: "KR" },
  { ticker: "001040", name: "CJ",                    market: "KR" },
  { ticker: "006260", name: "LS",                    market: "KR" },
  { ticker: "028260", name: "삼성물산",               market: "KR" },
  { ticker: "267250", name: "HD현대",                 market: "KR" },
  { ticker: "004800", name: "효성",                   market: "KR" },
  // 바이오/제약
  { ticker: "207940", name: "삼성바이오로직스",         market: "KR" },
  { ticker: "068270", name: "셀트리온",               market: "KR" },
  { ticker: "000100", name: "유한양행",               market: "KR" },
  { ticker: "128940", name: "한미약품",               market: "KR" },
  { ticker: "185750", name: "종근당",                 market: "KR" },
  { ticker: "003090", name: "대웅",                   market: "KR" },
  { ticker: "069620", name: "대웅제약",               market: "KR" },
  // 유통/식품/음료
  { ticker: "282330", name: "BGF리테일",              market: "KR" },
  { ticker: "007070", name: "GS리테일",               market: "KR" },
  { ticker: "139480", name: "이마트",                 market: "KR" },
  { ticker: "023530", name: "롯데쇼핑",               market: "KR" },
  { ticker: "097950", name: "CJ제일제당",              market: "KR" },
  { ticker: "001680", name: "대상",                   market: "KR" },
  { ticker: "000080", name: "하이트진로",              market: "KR" },
  { ticker: "004170", name: "신세계",                 market: "KR" },
  { ticker: "069960", name: "현대백화점",              market: "KR" },
  { ticker: "271560", name: "오리온",                 market: "KR" },
  { ticker: "033780", name: "KT&G",                  market: "KR" },
  { ticker: "002790", name: "아모레퍼시픽",            market: "KR" },
  { ticker: "051900", name: "LG생활건강",              market: "KR" },
  // 건설/방산/조선
  { ticker: "000720", name: "현대건설",               market: "KR" },
  { ticker: "047810", name: "한국항공우주",             market: "KR" },
  { ticker: "009540", name: "HD한국조선해양",           market: "KR" },
  { ticker: "042660", name: "한화오션",               market: "KR" },
  { ticker: "064350", name: "현대로템",               market: "KR" },
  { ticker: "329180", name: "HD현대중공업",            market: "KR" },
  { ticker: "012450", name: "한화에어로스페이스",        market: "KR" },
  { ticker: "034020", name: "두산에너빌리티",           market: "KR" },
  { ticker: "267260", name: "HD현대일렉트릭",           market: "KR" },
  // 항공/운송
  { ticker: "003490", name: "대한항공",               market: "KR" },
  { ticker: "180640", name: "한진칼",                 market: "KR" },
  { ticker: "272450", name: "진에어",                 market: "KR" },
  { ticker: "089590", name: "제주항공",               market: "KR" },
  // 엔터/레저
  { ticker: "035250", name: "강원랜드",               market: "KR" },
  { ticker: "034230", name: "파라다이스",              market: "KR" },
  { ticker: "352820", name: "하이브",                 market: "KR" },
  { ticker: "041510", name: "SM엔터테인먼트",           market: "KR" },
  { ticker: "035900", name: "JYP엔터테인먼트",          market: "KR" },
  { ticker: "122870", name: "YG엔터테인먼트",           market: "KR" },
  // KOSDAQ 주요
  { ticker: "086520", name: "에코프로",               market: "KR" },
  { ticker: "247540", name: "에코프로비엠",             market: "KR" },
  { ticker: "373220", name: "LG에너지솔루션",           market: "KR" },
  { ticker: "091990", name: "셀트리온헬스케어",          market: "KR" },
  { ticker: "196170", name: "알테오젠",               market: "KR" },
  { ticker: "028300", name: "HLB",                   market: "KR" },
  { ticker: "293490", name: "카카오게임즈",             market: "KR" },
  { ticker: "058470", name: "리노공업",               market: "KR" },
  { ticker: "214150", name: "클래시스",               market: "KR" },
  { ticker: "403870", name: "HPSP",                  market: "KR" },
  { ticker: "357780", name: "솔브레인",               market: "KR" },
  { ticker: "036800", name: "나스미디어",              market: "KR" },
  { ticker: "112040", name: "위메이드",               market: "KR" },
  // 기타
  { ticker: "001740", name: "SK네트웍스",              market: "KR" },
  { ticker: "001230", name: "동국제강",               market: "KR" },
];

// ── 미국 주요 종목 (S&P500 + 고배당 + 인기 종목 150+)
export const US_STOCKS: StockItem[] = [
  // 빅테크
  { ticker: "AAPL",  name: "Apple",                         market: "US" },
  { ticker: "MSFT",  name: "Microsoft",                     market: "US" },
  { ticker: "GOOGL", name: "Alphabet (Google)",              market: "US" },
  { ticker: "AMZN",  name: "Amazon",                        market: "US" },
  { ticker: "NVDA",  name: "NVIDIA",                        market: "US" },
  { ticker: "META",  name: "Meta (Facebook)",               market: "US" },
  { ticker: "TSLA",  name: "Tesla",                         market: "US" },
  // 통신
  { ticker: "T",     name: "AT&T",                          market: "US" },
  { ticker: "VZ",    name: "Verizon",                       market: "US" },
  // 담배
  { ticker: "MO",    name: "Altria Group",                  market: "US" },
  { ticker: "PM",    name: "Philip Morris",                 market: "US" },
  { ticker: "BTI",   name: "British American Tobacco",      market: "US" },
  // REIT
  { ticker: "O",     name: "Realty Income",                 market: "US" },
  { ticker: "WPC",   name: "W. P. Carey",                   market: "US" },
  { ticker: "STAG",  name: "STAG Industrial",               market: "US" },
  { ticker: "NLY",   name: "Annaly Capital",                market: "US" },
  { ticker: "AGNC",  name: "AGNC Investment",               market: "US" },
  { ticker: "MPW",   name: "Medical Properties Trust",      market: "US" },
  { ticker: "AMT",   name: "American Tower",                market: "US" },
  { ticker: "PLD",   name: "Prologis",                      market: "US" },
  { ticker: "SPG",   name: "Simon Property Group",          market: "US" },
  // 고배당 ETF
  { ticker: "JEPI",  name: "JPMorgan Equity Premium Income ETF", market: "US" },
  { ticker: "JEPQ",  name: "JPMorgan Nasdaq Equity Premium ETF", market: "US" },
  { ticker: "SCHD",  name: "Schwab US Dividend ETF",        market: "US" },
  { ticker: "HDV",   name: "iShares Core High Dividend ETF", market: "US" },
  { ticker: "SPYD",  name: "SPDR S&P 500 High Dividend ETF", market: "US" },
  { ticker: "DVY",   name: "iShares Select Dividend ETF",   market: "US" },
  { ticker: "VYM",   name: "Vanguard High Dividend Yield ETF", market: "US" },
  { ticker: "QYLD",  name: "Global X NASDAQ-100 Covered Call ETF", market: "US" },
  { ticker: "XYLD",  name: "Global X S&P 500 Covered Call ETF", market: "US" },
  { ticker: "RYLD",  name: "Global X Russell 2000 Covered Call ETF", market: "US" },
  // 소비재
  { ticker: "KO",    name: "Coca-Cola",                     market: "US" },
  { ticker: "PEP",   name: "PepsiCo",                       market: "US" },
  { ticker: "GIS",   name: "General Mills",                 market: "US" },
  { ticker: "CAG",   name: "ConAgra Brands",                market: "US" },
  { ticker: "MCD",   name: "McDonald's",                    market: "US" },
  { ticker: "TGT",   name: "Target",                        market: "US" },
  { ticker: "WMT",   name: "Walmart",                       market: "US" },
  { ticker: "COST",  name: "Costco",                        market: "US" },
  { ticker: "HD",    name: "Home Depot",                    market: "US" },
  { ticker: "LOW",   name: "Lowe's",                        market: "US" },
  { ticker: "NKE",   name: "Nike",                          market: "US" },
  { ticker: "SBUX",  name: "Starbucks",                     market: "US" },
  { ticker: "YUM",   name: "Yum! Brands",                   market: "US" },
  { ticker: "HSY",   name: "Hershey",                       market: "US" },
  { ticker: "CPB",   name: "Campbell Soup",                 market: "US" },
  { ticker: "CLX",   name: "Clorox",                        market: "US" },
  { ticker: "KMB",   name: "Kimberly-Clark",                market: "US" },
  { ticker: "PG",    name: "Procter & Gamble",              market: "US" },
  { ticker: "CL",    name: "Colgate-Palmolive",             market: "US" },
  // 헬스케어/제약
  { ticker: "JNJ",   name: "Johnson & Johnson",             market: "US" },
  { ticker: "ABBV",  name: "AbbVie",                        market: "US" },
  { ticker: "PFE",   name: "Pfizer",                        market: "US" },
  { ticker: "BMY",   name: "Bristol-Myers Squibb",          market: "US" },
  { ticker: "MRK",   name: "Merck",                         market: "US" },
  { ticker: "AMGN",  name: "Amgen",                         market: "US" },
  { ticker: "GILD",  name: "Gilead Sciences",               market: "US" },
  { ticker: "CVS",   name: "CVS Health",                    market: "US" },
  { ticker: "UNH",   name: "UnitedHealth",                  market: "US" },
  { ticker: "ELV",   name: "Elevance Health",               market: "US" },
  { ticker: "ABT",   name: "Abbott Laboratories",           market: "US" },
  { ticker: "MDT",   name: "Medtronic",                     market: "US" },
  // 기술
  { ticker: "IBM",   name: "IBM",                           market: "US" },
  { ticker: "INTC",  name: "Intel",                         market: "US" },
  { ticker: "TXN",   name: "Texas Instruments",             market: "US" },
  { ticker: "QCOM",  name: "Qualcomm",                      market: "US" },
  { ticker: "AVGO",  name: "Broadcom",                      market: "US" },
  { ticker: "STX",   name: "Seagate Technology",            market: "US" },
  { ticker: "CSCO",  name: "Cisco",                         market: "US" },
  { ticker: "ORCL",  name: "Oracle",                        market: "US" },
  { ticker: "ACN",   name: "Accenture",                     market: "US" },
  // 에너지
  { ticker: "XOM",   name: "ExxonMobil",                    market: "US" },
  { ticker: "CVX",   name: "Chevron",                       market: "US" },
  { ticker: "EPD",   name: "Enterprise Products Partners",  market: "US" },
  { ticker: "ET",    name: "Energy Transfer",               market: "US" },
  { ticker: "OKE",   name: "ONEOK",                         market: "US" },
  { ticker: "ENB",   name: "Enbridge",                      market: "US" },
  { ticker: "MPC",   name: "Marathon Petroleum",            market: "US" },
  { ticker: "PSX",   name: "Phillips 66",                   market: "US" },
  { ticker: "VLO",   name: "Valero Energy",                 market: "US" },
  { ticker: "COP",   name: "ConocoPhillips",                market: "US" },
  { ticker: "SLB",   name: "Schlumberger",                  market: "US" },
  // 산업/소재
  { ticker: "MMM",   name: "3M",                            market: "US" },
  { ticker: "LYB",   name: "LyondellBasell",                market: "US" },
  { ticker: "DOW",   name: "Dow Inc",                       market: "US" },
  { ticker: "CAT",   name: "Caterpillar",                   market: "US" },
  { ticker: "EMR",   name: "Emerson Electric",              market: "US" },
  { ticker: "HON",   name: "Honeywell",                     market: "US" },
  { ticker: "GE",    name: "GE Aerospace",                  market: "US" },
  { ticker: "UPS",   name: "UPS",                           market: "US" },
  { ticker: "FDX",   name: "FedEx",                         market: "US" },
  { ticker: "BA",    name: "Boeing",                        market: "US" },
  { ticker: "LMT",   name: "Lockheed Martin",               market: "US" },
  { ticker: "RTX",   name: "RTX (Raytheon)",                market: "US" },
  // 금융
  { ticker: "JPM",   name: "JPMorgan Chase",                market: "US" },
  { ticker: "BAC",   name: "Bank of America",               market: "US" },
  { ticker: "WFC",   name: "Wells Fargo",                   market: "US" },
  { ticker: "C",     name: "Citigroup",                     market: "US" },
  { ticker: "GS",    name: "Goldman Sachs",                 market: "US" },
  { ticker: "MS",    name: "Morgan Stanley",                market: "US" },
  { ticker: "AXP",   name: "American Express",              market: "US" },
  { ticker: "V",     name: "Visa",                          market: "US" },
  { ticker: "MA",    name: "Mastercard",                    market: "US" },
  { ticker: "BLK",   name: "BlackRock",                     market: "US" },
  { ticker: "MAIN",  name: "Main Street Capital",           market: "US" },
  { ticker: "ARCC",  name: "Ares Capital",                  market: "US" },
  // 유틸리티
  { ticker: "D",     name: "Dominion Energy",               market: "US" },
  { ticker: "NEE",   name: "NextEra Energy",                market: "US" },
  { ticker: "ED",    name: "Consolidated Edison",           market: "US" },
  { ticker: "SO",    name: "Southern Company",              market: "US" },
  { ticker: "DUK",   name: "Duke Energy",                   market: "US" },
  { ticker: "WEC",   name: "WEC Energy Group",              market: "US" },
  { ticker: "AEP",   name: "American Electric Power",       market: "US" },
  { ticker: "EXC",   name: "Exelon",                        market: "US" },
  // 자동차
  { ticker: "F",     name: "Ford Motor",                    market: "US" },
  { ticker: "GM",    name: "General Motors",                market: "US" },
  // 광업
  { ticker: "RIO",   name: "Rio Tinto",                     market: "US" },
  { ticker: "FCX",   name: "Freeport-McMoRan",              market: "US" },
  { ticker: "NEM",   name: "Newmont",                       market: "US" },
];

/** 관련성 기준으로 정렬된 검색 결과 반환 */
export function searchStocks(query: string, market: Market): StockItem[] {
  const q    = query.trim().toLowerCase();
  if (!q)    return [];

  const list = market === "KR" ? KR_STOCKS : US_STOCKS;

  const seen    = new Set<string>();
  const results = list.filter((s) => {
    if (seen.has(s.ticker)) return false; // 중복 제거
    const nameMatch   = s.name.toLowerCase().includes(q);
    const tickerMatch = s.ticker.toLowerCase().includes(q);
    if (nameMatch || tickerMatch) { seen.add(s.ticker); return true; }
    return false;
  });

  // 관련성 정렬: 시작 일치 > 포함
  results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aScore = aName === q ? 0 : aName.startsWith(q) ? 1 : 2;
    const bScore = bName === q ? 0 : bName.startsWith(q) ? 1 : 2;
    return aScore - bScore;
  });

  return results.slice(0, 8);
}
