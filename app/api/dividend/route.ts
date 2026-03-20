import { NextRequest, NextResponse } from "next/server";

// SSL 우회 (사내망/개발 환경)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YF = require("yahoo-finance2").default;
  return new YF({ suppressNotices: ["yahooSurvey"] });
}

function fmt(d: unknown): string | null {
  if (!d) return null;
  try {
    const date = new Date(d as string | number | Date);
    if (isNaN(date.getTime())) return null;
    const y   = date.getFullYear();
    const m   = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  const yf = getClient();

  // 1단계: quote() — 기본 주가·배당 정보
  let quote: any;
  try {
    quote = await yf.quote(ticker);
  } catch (e: any) {
    const msg = e?.message ?? "";
    const notFound = msg.includes("No fundamentals") || msg.includes("404") ||
                     msg.includes("Not Found") || msg.includes("Will not feed");
    return NextResponse.json(
      { error: notFound
          ? "종목을 찾을 수 없습니다. 종목명 또는 티커를 다시 확인해 주세요."
          : "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  // quote()에서 배당 정보 추출 (항상 사용 가능)
  const price         = quote.regularMarketPrice          ?? null;
  let   dps: number | null = (quote as any).trailingAnnualDividendRate ?? null;
  let   divYield      = (quote as any).trailingAnnualDividendYield      ?? null;
  let   exDateRaw     = (quote as any).exDividendDate                    ?? null;
  let   payDateRaw    = (quote as any).dividendDate                      ?? null;

  // 2단계: quoteSummary() — 더 정확한 배당 데이터 (실패해도 무시)
  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["summaryDetail", "calendarEvents"],
    });
    const det = summary?.summaryDetail;
    const cal = summary?.calendarEvents;

    // 더 정확한 값이 있으면 덮어씀
    if (det?.dividendRate   != null) dps        = det.dividendRate;
    if (det?.dividendYield  != null) divYield   = det.dividendYield;
    if (det?.exDividendDate != null) exDateRaw  = det.exDividendDate;
    if (cal?.dividendDate   != null) payDateRaw = cal.dividendDate;
    else if (det?.dividendDate != null) payDateRaw = det.dividendDate;
  } catch { /* 무시 — quote() 데이터로 진행 */ }

  // 과거 배당락일(7일 이상 지난 경우)은 미정 처리 — 2014년 등 과거 날짜 반환 방지
  const fmtExDate = fmt(exDateRaw);
  const fmtPayDate = fmt(payDateRaw);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  function isPast(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const m = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (!m) return false;
    return new Date(+m[1], +m[2] - 1, +m[3]) < sevenDaysAgo;
  }

  // 3단계: 배당 지급 이력으로 실제 지급 월 + 빈도 + 월별 대표 지급일 파악
  let payMonths: number[] = [];
  let dividendFrequency: "annual" | "semi-annual" | "quarterly" | "monthly" = "annual";
  // 월별 대표 지급일 (1~12 → 일(day))
  const payDayByMonth: Record<number, number> = {};

  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const hist = await yf.historical(ticker, {
      period1: twoYearsAgo.toISOString().split("T")[0],
      period2: new Date().toISOString().split("T")[0],
      events: "dividends",
    });
    const divRows = ((hist as any[]) ?? []).filter(
      (h: any) => h.dividends != null && h.dividends > 0
    );
    if (divRows.length > 0) {
      payMonths = [...new Set(divRows.map((h: any) => new Date(h.date).getMonth() + 1 as number))].sort((a, b) => a - b);
      const avgPerYear = divRows.length / 2;
      dividendFrequency =
        avgPerYear >= 10 ? "monthly" :
        avgPerYear >= 3  ? "quarterly" :
        avgPerYear >= 1.5 ? "semi-annual" : "annual";

      // 월별 평균 지급일 계산
      const daySums: Record<number, { sum: number; count: number }> = {};
      divRows.forEach((h: any) => {
        const d = new Date(h.date);
        const mo = d.getMonth() + 1;
        const day = d.getDate();
        if (!daySums[mo]) daySums[mo] = { sum: 0, count: 0 };
        daySums[mo].sum   += day;
        daySums[mo].count += 1;
      });
      Object.entries(daySums).forEach(([mo, { sum, count }]) => {
        payDayByMonth[parseInt(mo)] = Math.round(sum / count);
      });
    }
  } catch { /* 이력 없으면 기본값 */ }

  // 이력 없으면 시장/지급일 기반 추정
  if (payMonths.length === 0) {
    const isKR = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
    if (!isPast(fmtPayDate) && fmtPayDate) {
      const m = fmtPayDate.match(/\d{4}\.(\d{2})\.(\d{2})/);
      if (m) { payMonths = [parseInt(m[1])]; payDayByMonth[parseInt(m[1])] = parseInt(m[2]); }
    }
    if (payMonths.length === 0) {
      payMonths = isKR ? [4] : [3, 6, 9, 12];
      dividendFrequency = isKR ? "annual" : "quarterly";
    }
  }

  // 4단계: 향후 12개월 예상 지급일 생성
  const today = new Date();
  const estimatedPayDates: string[] = [];
  for (let offset = 0; offset <= 12; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const mo = d.getMonth() + 1;
    const yr = d.getFullYear();
    if (payMonths.includes(mo)) {
      const day = payDayByMonth[mo] ?? 15;
      const dateStr = `${yr}.${String(mo).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
      estimatedPayDates.push(dateStr);
    }
  }

  return NextResponse.json({
    ticker,
    name:              quote.longName ?? quote.shortName ?? ticker,
    price,
    dps,
    dividendYield:     divYield,
    exDate:            isPast(fmtExDate)  ? null : fmtExDate,
    paymentDate:       isPast(fmtPayDate) ? null : fmtPayDate,
    currency:          quote.currency ?? "USD",
    payMonths,
    dividendFrequency,
    estimatedPayDates,  // 향후 12개월 예상 지급일 배열
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
