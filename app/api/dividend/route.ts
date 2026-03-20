import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    // 기본 종목 정보 + 배당 데이터
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(ticker),
      yahooFinance.quoteSummary(ticker, {
        modules: ["summaryDetail", "calendarEvents"],
      }),
    ]);

    const detail   = summary.summaryDetail;
    const calendar = summary.calendarEvents;

    const dps         = detail?.dividendRate ?? null;
    const exDateRaw   = detail?.exDividendDate ?? null;
    const payDateRaw  = calendar?.dividendDate ?? null;
    const name        = quote.longName ?? quote.shortName ?? ticker;
    const price       = quote.regularMarketPrice ?? null;

    function fmt(d: Date | null | undefined) {
      if (!d) return null;
      return new Date(d).toLocaleDateString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
      }).replace(/\. /g, ".").replace(/\.$/, "");
    }

    return NextResponse.json({
      ticker,
      name,
      price,
      dps,
      exDate:      fmt(exDateRaw),
      paymentDate: fmt(payDateRaw),
      currency: quote.currency ?? "USD",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `데이터를 가져올 수 없습니다: ${err?.message ?? "알 수 없는 오류"}` },
      { status: 500 }
    );
  }
}
