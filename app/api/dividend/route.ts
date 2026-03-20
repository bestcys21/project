import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// 최신 버전: 인스턴스를 먼저 생성한 뒤 사용
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(ticker),
      yahooFinance.quoteSummary(ticker, {
        modules: ["summaryDetail", "calendarEvents"],
      }),
    ]);

    const detail   = summary.summaryDetail;
    const calendar = summary.calendarEvents;

    const dps        = detail?.dividendRate     ?? null;
    const exDateRaw  = detail?.exDividendDate   ?? null;
    const payDateRaw = calendar?.dividendDate   ?? null;
    const name       = quote.longName ?? quote.shortName ?? ticker;
    const price      = quote.regularMarketPrice ?? null;

    function fmt(d: Date | null | undefined): string | null {
      if (!d) return null;
      const date = new Date(d);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}.${m}.${day}`;
    }

    return NextResponse.json({
      ticker,
      name,
      price,
      dps,
      exDate:      fmt(exDateRaw),
      paymentDate: fmt(payDateRaw),
      currency:    quote.currency ?? "USD",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `데이터를 가져올 수 없습니다: ${err?.message ?? "알 수 없는 오류"}` },
      { status: 500 }
    );
  }
}
