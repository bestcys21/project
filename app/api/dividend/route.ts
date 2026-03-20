import { NextRequest, NextResponse } from "next/server";

// 개발 환경: 기업 프록시/인트라넷 SSL 인증서 우회
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// 모듈 최상단 초기화 제거 → 핫리로드 충돌 방지
function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey"] });
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  const yf = getClient();

  try {
    const [quote, summary] = await Promise.all([
      yf.quote(ticker),
      yf.quoteSummary(ticker, { modules: ["summaryDetail", "calendarEvents"] }),
    ]);

    const detail   = summary.summaryDetail;
    const calendar = summary.calendarEvents;

    const dps        = detail?.dividendRate   ?? null;
    const exDateRaw  = detail?.exDividendDate ?? null;
    const payDateRaw = calendar?.dividendDate ?? null;
    const price      = quote.regularMarketPrice ?? null;

    const dividendYield: number | null =
      detail?.dividendYield ??
      (quote as any)?.trailingAnnualDividendYield ??
      (dps != null && price != null && price > 0 ? dps / price : null);

    function fmt(d: Date | null | undefined): string | null {
      if (!d) return null;
      const date = new Date(d);
      const y    = date.getFullYear();
      const m    = String(date.getMonth() + 1).padStart(2, "0");
      const day  = String(date.getDate()).padStart(2, "0");
      return `${y}.${m}.${day}`;
    }

    return NextResponse.json({
      ticker,
      name:          quote.longName ?? quote.shortName ?? ticker,
      price,
      dps,
      dividendYield,
      exDate:        fmt(exDateRaw),
      paymentDate:   fmt(payDateRaw),
      currency:      quote.currency ?? "USD",
    });
  } catch (err: any) {
    // 티커를 찾을 수 없는 경우 사용자 친화적 메시지
    const message = err?.message ?? "";
    const isNotFound =
      message.includes("No fundamentals") ||
      message.includes("Not Found") ||
      message.includes("404");

    return NextResponse.json(
      {
        error: isNotFound
          ? "종목을 찾을 수 없습니다. 올바른 티커를 입력해 주세요."
          : `데이터를 가져오지 못했습니다: ${message}`,
      },
      { status: 500 }
    );
  }
}
