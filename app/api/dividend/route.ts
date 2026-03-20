import { NextRequest, NextResponse } from "next/server";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YahooFinance = require("yahoo-finance2").default;
  return new YahooFinance({ suppressNotices: ["yahooSurvey"] });
}

function fmt(d: Date | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  const y    = date.getFullYear();
  const m    = String(date.getMonth() + 1).padStart(2, "0");
  const day  = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  const yf = getClient();

  try {
    // quote는 필수, quoteSummary는 실패해도 계속 진행
    const quote = await yf.quote(ticker);

    // summaryDetail + calendarEvents 동시 시도, 실패 시 summaryDetail만 재시도
    const summary = await yf
      .quoteSummary(ticker, { modules: ["summaryDetail", "calendarEvents"] })
      .catch(() =>
        yf.quoteSummary(ticker, { modules: ["summaryDetail"] }).catch(() => null)
      );

    const detail   = (summary as any)?.summaryDetail   ?? null;
    const calendar = (summary as any)?.calendarEvents  ?? null;

    const price = quote.regularMarketPrice ?? null;

    // DPS: summaryDetail → quote 필드 순으로 폴백
    const dps: number | null =
      detail?.dividendRate ??
      (quote as any)?.trailingAnnualDividendRate ??
      null;

    // 배당수익률: summaryDetail → quote 필드 → 직접 계산 순으로 폴백
    const dividendYield: number | null =
      detail?.dividendYield ??
      (quote as any)?.trailingAnnualDividendYield ??
      (dps != null && price != null && price > 0 ? dps / price : null);

    // 배당락일: summaryDetail → quote 필드 순으로 폴백
    const exDateRaw: Date | null =
      detail?.exDividendDate ??
      (quote as any)?.exDividendDate ??
      null;

    // 지급일: calendarEvents → summaryDetail 순으로 폴백
    const payDateRaw: Date | null =
      calendar?.dividendDate ??
      detail?.dividendDate ??
      null;

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
    const message = err?.message ?? "";
    const isNotFound =
      message.includes("No fundamentals") ||
      message.includes("Not Found") ||
      message.includes("404") ||
      message.includes("Will not feed");

    return NextResponse.json(
      {
        error: isNotFound
          ? "종목을 찾을 수 없습니다. 올바른 종목명 또는 티커를 입력해 주세요."
          : "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
