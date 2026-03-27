import { NextRequest, NextResponse } from "next/server";
import { hasFmpKey, getFmpRankItems } from "@/lib/fmp-api";
import { getDartDividend, getCached } from "@/lib/dart-api";
import { getNaverBatch, getNaverDividendRanking } from "@/lib/naver-api";
import { hasKisKey, getKisDividendRanking, getKisDividendFrequency } from "@/lib/kis-api";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Vercel Edge 캐시: 1시간
export const revalidate = 3600;

// ── 서버 인메모리 캐시 (로컬 개발 포함, 첫 로드 후 즉시 응답) ──────────────
interface RankCache { data: any[]; expiresAt: number; }
const rankCache = new Map<string, RankCache>();

function getCachedRank(market: string): any[] | null {
  const entry = rankCache.get(market);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { rankCache.delete(market); return null; }
  return entry.data;
}
function setCachedRank(market: string, data: any[]) {
  // 딥 카피: 백그라운드 비동기 뮤테이션이 캐시를 오염시키는 것을 방지
  rankCache.set(market, { data: JSON.parse(JSON.stringify(data)), expiresAt: Date.now() + 60 * 60 * 1000 }); // 1시간
}

function getClient() {
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
}

// DART 보정: 전체 작업에 타임아웃을 걸어 느린 DART API가 응답을 블로킹하지 않도록 함
async function applyDartCorrection(data: any[], timeoutMs = 5000) {
  if (!process.env.DART_API_KEY) return;
  const correction = Promise.allSettled(
    data.map(async (item) => {
      const code     = item.ticker.replace(/\.(KS|KQ)$/, "");
      const dartData = await getDartDividend(code);
      if (dartData?.dps && dartData.dps > 0 && item.price > 0) {
        item.dps           = dartData.dps;
        item.dividendYield = dartData.dps / item.price;
      }
    }),
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([correction, timeout]);
}

// ── 한국 KOSPI/KOSDAQ 주요 고배당 후보 (Yahoo Finance 필터 후 상위 50개 반환)
// 중복 방지: 티커를 Set으로 관리하여 동일 종목 중복 제거
const KR_TICKERS_RAW = [
  // 우선주 (배당의 꽃 — 수익률 높음)
  { ticker: "005935.KS", name: "삼성전자우" },
  { ticker: "005385.KS", name: "현대차우" },
  { ticker: "005387.KS", name: "현대차2우B" },
  { ticker: "000215.KS", name: "DL이앤씨우" },
  { ticker: "051915.KS", name: "LG화학우" },
  { ticker: "000885.KS", name: "한화우" },
  { ticker: "032835.KS", name: "삼성생명우" },
  { ticker: "009155.KS", name: "삼성전기우" },
  { ticker: "096775.KS", name: "SK이노베이션우" },
  { ticker: "138041.KS", name: "메리츠금융지주우" },
  { ticker: "006405.KS", name: "삼성SDI우" },
  { ticker: "000070.KS", name: "하이트진로우" },   // 하이트진로우 = 000070, 하이트진로(보통주) = 000080
  { ticker: "000725.KS", name: "현대건설우" },
  { ticker: "003555.KS", name: "LG우" },
  { ticker: "003547.KS", name: "대웅제약우" },
  { ticker: "001465.KS", name: "현대해상우" },
  { ticker: "007575.KS", name: "이수화학우" },
  { ticker: "004545.KS", name: "삼양사우" },
  { ticker: "000815.KS", name: "삼성화재우" },
  { ticker: "003575.KS", name: "대신증권우" },
  { ticker: "010955.KS", name: "S-Oil우" },
  { ticker: "006080.KS", name: "SK디스커버리우" },
  { ticker: "009415.KS", name: "세아홀딩스우" },
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
  { ticker: "071050.KS", name: "한국금융지주" },
  // 보험
  { ticker: "032830.KS", name: "삼성생명" },
  { ticker: "088350.KS", name: "한화생명" },
  { ticker: "005830.KS", name: "DB손해보험" },
  { ticker: "000810.KS", name: "삼성화재" },
  { ticker: "001450.KS", name: "현대해상" },
  { ticker: "000060.KS", name: "메리츠화재" },
  { ticker: "082640.KS", name: "동양생명" },
  // 통신
  { ticker: "017670.KS", name: "SK텔레콤" },
  { ticker: "030200.KS", name: "KT" },
  { ticker: "032640.KS", name: "LG유플러스" },
  // 담배/소비재
  { ticker: "033780.KS", name: "KT&G" },
  // 인프라/유틸리티/리츠
  // 참고: 한국전력(015760), 한국가스공사(036460)는 만성 적자로 배당 중단 → 제외
  { ticker: "088980.KS", name: "맥쿼리인프라" },
  { ticker: "071970.KS", name: "스카이라이프" },
  { ticker: "330590.KS", name: "롯데리츠" },
  { ticker: "395400.KS", name: "SK리츠" },
  { ticker: "432320.KS", name: "KB스타리츠" },
  { ticker: "350520.KS", name: "이지스레지던스리츠" },
  { ticker: "334890.KS", name: "이지스밸류리츠" },
  { ticker: "293940.KS", name: "신한알파리츠" },
  // 에너지/정유
  { ticker: "010950.KS", name: "S-Oil" },
  { ticker: "096770.KS", name: "SK이노베이션" },
  { ticker: "078930.KS", name: "GS" },
  { ticker: "078935.KS", name: "GS우" },
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
  { ticker: "204320.KS", name: "HL만도" },
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
  { ticker: "004835.KS", name: "효성우" },
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
  { ticker: "007310.KS", name: "오뚜기" },
  { ticker: "002380.KS", name: "KCC" },
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
  { ticker: "003000.KS", name: "부광약품" },
  // 화학/소재
  { ticker: "051910.KS", name: "LG화학" },
  { ticker: "006400.KS", name: "삼성SDI" },
  // 증권/카드
  { ticker: "029780.KS", name: "삼성카드" },
  { ticker: "039490.KS", name: "키움증권" },
  { ticker: "037620.KS", name: "미래에셋증권" },
  { ticker: "016360.KS", name: "삼성증권" },
  // 보험
  { ticker: "003690.KS", name: "한국재보험" },
  // 에너지/정유 추가
  { ticker: "010960.KS", name: "한국쉘유" },
  { ticker: "071870.KS", name: "지역난방공사" },
  // 생활가전/서비스
  { ticker: "021240.KS", name: "코웨이" },
  // 산업재/전기
  { ticker: "010120.KS", name: "LS ELECTRIC" },
  { ticker: "001430.KS", name: "세아베스틸지주" },
  { ticker: "018880.KS", name: "한온시스템" },
  { ticker: "000220.KS", name: "대덕" },
  { ticker: "029530.KS", name: "신도리코" },
  // 교육/출판
  { ticker: "019680.KS", name: "대교" },
  // 제약
  { ticker: "033270.KS", name: "유나이티드제약" },
  // 도료/화학
  { ticker: "090350.KS", name: "노루페인트" },
  // 카지노/레저
  { ticker: "114090.KS", name: "GKL" },
  // 화학/무역
  { ticker: "005190.KS", name: "동성케미컬" },
  { ticker: "122900.KS", name: "아이마켓코리아" },
  { ticker: "079980.KS", name: "휴비스" },
  { ticker: "033240.KS", name: "자화전자" },
  { ticker: "011760.KS", name: "현대코퍼레이션" },
  { ticker: "001120.KS", name: "LX인터내셔널" },
  { ticker: "011790.KS", name: "SKC" },
  // 기타
  { ticker: "002790.KS", name: "아모레퍼시픽" },
  { ticker: "051900.KS", name: "LG생활건강" },
  { ticker: "003490.KS", name: "대한항공" },
  { ticker: "034020.KS", name: "두산에너빌리티" },
  { ticker: "042700.KQ", name: "한미반도체" },
];

// 중복 제거: 동일 ticker는 첫 번째만 유지
const seenKR = new Set<string>();
const KR_TICKERS = KR_TICKERS_RAW.filter(({ ticker }) => {
  if (seenKR.has(ticker)) return false;
  seenKR.add(ticker);
  return true;
});

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

// 배치 처리 (rate limit 방지)
async function batchFetch<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  batchSize = 10,
  delayMs = 300
): Promise<PromiseSettledResult<any>[]> {
  const results: PromiseSettledResult<any>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market") ?? "US";

  // 캐시 히트 시 즉시 반환 (로컬 개발 속도 개선)
  const cached = getCachedRank(market);
  if (cached) {
    return NextResponse.json(
      { market, data: cached },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", "X-Cache": "HIT" } },
    );
  }

  // ── US 주식: FMP 키가 있으면 FMP 사용 (배당 정확도 우수) ─────────────────
  if (market === "US" && hasFmpKey()) {
    const fmpItems = await getFmpRankItems(US_TICKERS, 10, 200);
    const data = fmpItems
      .sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0))
      .slice(0, 50);
    setCachedRank(market, data);
    return NextResponse.json({ market, data });
  }

  // ── KR 주식 ──────────────────────────────────────────────────────────────
  if (market === "KR") {
    // ─ 1순위: KIS + Naver 병렬 조회 후 병합 ─────────────────────────────
    // KIS는 수익률 상위 ~50개 종목, Naver는 KOSPI/KOSDAQ 스크리너로 누락 종목 보완
    // DART 보정은 핫 패스에서 제거 — 백그라운드 뮤테이션으로 정렬 순서 오염 방지
    const [kisResult, naverResult] = await Promise.allSettled([
      hasKisKey() ? getKisDividendRanking(100) : Promise.resolve([]),
      getNaverDividendRanking(100),
    ]);

    const kisItems   = kisResult.status   === "fulfilled" ? kisResult.value   : [];
    const naverItems = naverResult.status === "fulfilled" ? naverResult.value : [];

    if (kisItems.length > 0 || naverItems.length > 0) {
      const TAX_KR = 0.154; // 배당소득세 14% + 지방소득세 1.4%

      // Naver 현재가 맵 (KIS yield 재계산에 사용)
      const naverPriceMap = new Map<string, number>();
      for (const item of naverItems) {
        if (item.price > 0) naverPriceMap.set(item.ticker, item.price);
      }

      const merged = new Map<string, any>();

      // 1) Naver 데이터 먼저 채우기 (Naver는 이미 정제된 현재가·DPS)
      for (const item of naverItems) {
        if (!item.price || !item.dividendYield || item.dividendYield <= 0) continue;
        if (item.dividendYield > 0.20) {
          console.log(`[EXCLUDED >20%][Naver] ${item.ticker} ${item.name} | dps=${item.dps} | price=${item.price} | yield=${(item.dividendYield * 100).toFixed(2)}%`);
          continue;
        }
        const yieldPostTax = item.dividendYield * (1 - TAX_KR);
        merged.set(item.ticker, {
          ticker: item.ticker,
          name:   item.name,
          dividendYield: item.dividendYield,
          yieldPostTax,
          dps:    item.dps,
          price:  item.price,
          market: "KR",
          isHighYield: item.dividendYield >= 0.15,
          taxRisk: false, // 포트폴리오 수량 알아야 계산 가능 — dashboard에서 처리
        });
      }

      // 2) KIS 데이터로 덮어쓰기 — TTM DPS + Naver 현재가로 정방향 재계산
      for (const item of kisItems) {
        const naverPrice  = naverPriceMap.get(item.ticker);
        const price       = naverPrice ?? item.currentPrice; // Naver 우선, 없으면 KIS 역산가
        const dps         = item.dividendAmount;             // TTM 실제 지급 합계 (KIS)
        if (!price || !dps || price <= 0 || dps <= 0) continue;

        const dividendYield = dps / price; // 정방향 계산: TTM DPS ÷ 현재가

        // >20% = 데이터 오류로 간주 → 랭킹 제외
        if (dividendYield > 0.20) {
          console.log(`[EXCLUDED >20%][KIS] ${item.ticker} ${item.name} | dps=${dps} | price=${price}(${naverPrice ? "naver" : "back-calc"}) | yield=${(dividendYield * 100).toFixed(2)}%`);
          continue;
        }

        const yieldPostTax = dividendYield * (1 - TAX_KR);
        const isHighYield  = dividendYield >= 0.15;

        if (isHighYield) {
          console.log(`[WARN ≥15%][KIS] ${item.ticker} ${item.name} | dps=${dps} | price=${price} | yield=${(dividendYield * 100).toFixed(2)}%`);
        }

        merged.set(item.ticker, {
          ticker: item.ticker,
          name:   item.name,
          dividendYield,
          yieldPostTax,
          dps,
          price,
          market: "KR",
          isHighYield,
          taxRisk: false,
        });
      }

      const sorted = Array.from(merged.values())
        .sort((a, b) => b.dividendYield - a.dividendYield)
        .slice(0, 50);

      // 배당 주기 + 다음 배당락일: 상위 10개만 조회 (3초 타임아웃)
      // 전체 50개 조회 시 50번 KIS 호출로 응답이 수십 초 지연됨
      if (hasKisKey()) {
        const top10 = sorted.slice(0, 10);
        const freqWork = Promise.allSettled(
          top10.map(async (item) => {
            const code   = item.ticker.replace(/\.(KS|KQ)$/, "");
            const result = await getKisDividendFrequency(code);
            if (result) {
              item.frequency   = result.frequency;
              item.nextExDate  = result.nextExDate;
            }
          }),
        );
        await Promise.race([freqWork, new Promise<void>((r) => setTimeout(r, 3000))]);
      }

      // 검증 로그 — 상위 10개 출력
      console.log(`[RANKING KR] ticker | dividendTTM | currentPrice | yieldPreTax | yieldPostTax`);
      sorted.slice(0, 10).forEach((item) => {
        console.log(`[RANKING KR] ${item.ticker} ${item.name} | dps=${item.dps} | price=${item.price} | ${(item.dividendYield * 100).toFixed(2)}% | postTax=${(item.yieldPostTax * 100).toFixed(2)}% | freq=${item.frequency ?? "?"} | exDate=${item.nextExDate ?? "?"}`);
      });

      const source = kisItems.length > 0 && naverItems.length > 0
        ? "KIS+Naver"
        : kisItems.length > 0 ? "KIS" : "Naver";

      setCachedRank(market, sorted);
      return NextResponse.json(
        { market, data: sorted },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", "X-Source": source } },
      );
    }

    // ─ 2순위(최후 fallback): Yahoo Finance + Naver 배치 (하드코딩 목록 필터링 방식) ─
    // KIS와 Naver 스크리너 모두 실패했을 때만 사용
    const yf         = getClient();
    const tickerSyms = KR_TICKERS.map((t) => t.ticker);
    const nameMap    = new Map(KR_TICKERS.map((t) => [t.ticker, t.name]));
    const stockCodes = KR_TICKERS.map((t) => t.ticker.replace(/\.(KS|KQ)$/, ""));

    let yahooMap = new Map<string, any>();
    try {
      const quotes: any[] = await yf.quote(tickerSyms);
      const quoteArr = Array.isArray(quotes) ? quotes : [quotes];
      quoteArr.forEach((q: any) => { if (q?.symbol) yahooMap.set(q.symbol, q); });
    } catch { /* Naver/DART만으로 진행 */ }

    const naverMap = await getNaverBatch(stockCodes, 15, 100);

    const data: any[] = [];
    for (const { ticker } of KR_TICKERS) {
      const stockCode  = ticker.replace(/\.(KS|KQ)$/, "");
      const koreanName = nameMap.get(ticker) ?? stockCode;
      const naver      = naverMap.get(stockCode);
      const yahoo      = yahooMap.get(ticker);

      // 가격: Naver 우선 (더 정확), Yahoo 보조
      const price = naver?.price ?? yahoo?.regularMarketPrice ?? null;

      // 배당수익률: Naver 우선 (이미 정제된 값), Yahoo는 KR 종목에서 신뢰도 낮음
      let dividendYield: number | null = naver?.dividendYield ?? null;
      let dps: number | null           = naver?.dps ?? null;

      if (!dividendYield) {
        // Yahoo 배당 데이터로 보조 (KR에서 부정확할 수 있음)
        const rawYield = yahoo?.trailingAnnualDividendYield ?? null;
        if (rawYield != null && rawYield > 0) {
          dividendYield = rawYield > 1 ? rawYield / 100 : rawYield;
        }
        const rawDps = yahoo?.trailingAnnualDividendRate ?? yahoo?.dividendRate ?? null;
        if (rawDps != null && rawDps > 0 && price != null && price > 0) {
          dps           = rawDps;
          dividendYield = rawDps / price;
        }
      }

      if (!price || !dividendYield || dividendYield <= 0) continue;
      if (dividendYield > 0.20) {
        console.log(`[EXCLUDED >20%][Yahoo/KR] ${ticker} ${koreanName} | yield=${(dividendYield * 100).toFixed(2)}%`);
        continue;
      }
      if (!dps && price) dps = Math.round(price * dividendYield);
      const yieldPostTax = dividendYield * (1 - 0.154);
      data.push({ ticker, name: koreanName, dividendYield, yieldPostTax, dps, price, market: "KR", isHighYield: dividendYield >= 0.15, taxRisk: false });
    }

    const sorted = data
      .sort((a, b) => b.dividendYield - a.dividendYield)
      .slice(0, 50);

    setCachedRank(market, sorted);
    return NextResponse.json(
      { market, data: sorted },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  }

  // ── US 주식: Yahoo Finance fallback (FMP 없을 때) ─────────────────────
  const yf = getClient();

  const results = await batchFetch(
    US_TICKERS,
    async ({ ticker, name: fallbackName }) => {
      const quote = await yf.quote(ticker);
      const price = quote?.regularMarketPrice ?? null;

      let dps: number | null =
        (quote as any)?.trailingAnnualDividendRate ??
        (quote as any)?.dividendRate ??
        null;

      const raw =
        (quote as any)?.trailingAnnualDividendYield ??
        (quote as any)?.dividendYield ??
        null;
      const dividendYield =
        dps != null && price != null && price > 0
          ? dps / price
          : raw != null
          ? raw > 1 ? raw / 100 : raw
          : null;

      const yieldPostTax = dividendYield != null ? dividendYield * (1 - 0.15) : null; // US 배당세 15%
      return { ticker, name: quote?.longName ?? fallbackName, dividendYield, yieldPostTax, dps, price, market, isHighYield: (dividendYield ?? 0) >= 0.15, taxRisk: false };
    },
    10,
    300,
  );

  const data = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((d) => d.dividendYield != null && d.dividendYield > 0 && d.dividendYield <= 0.20)
    .sort((a, b) => b.dividendYield - a.dividendYield)
    .slice(0, 50);

  setCachedRank(market, data);
  return NextResponse.json(
    { market, data },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
