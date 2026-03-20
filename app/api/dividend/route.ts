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

  return NextResponse.json({
    ticker,
    name:          quote.longName ?? quote.shortName ?? ticker,
    price,
    dps,
    dividendYield: divYield,
    exDate:        isPast(fmtExDate)  ? null : fmtExDate,
    paymentDate:   isPast(fmtPayDate) ? null : fmtPayDate,
    currency:      quote.currency ?? "USD",
  });
}
