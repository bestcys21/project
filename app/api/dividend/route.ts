import { NextRequest, NextResponse } from "next/server";
import { getDartDividend } from "@/lib/dart-api";
import {
  hasFmpKey,
  getFmpFullQuote,
  getFmpDividendHistory,
  estimateFrequency,
} from "@/lib/fmp-api";

// SSL 우회 (사내망/개발 환경)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function getYfClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YF = require("yahoo-finance2").default;
  // ripHistorical: Yahoo가 historical() API 삭제 → chart()로 내부 매핑됨, 경고 억제
  return new YF({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
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

function isPast(dateStr: string | null, daysAgo = 7): boolean {
  if (!dateStr) return false;
  const m = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysAgo);
  return new Date(+m[1], +m[2] - 1, +m[3]) < threshold;
}

/** 과거 날짜를 배당 주기에 맞춰 다음 미래 날짜로 이동 */
function projectToFuture(dateStr: string | null, freqMonths: number): string | null {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const today = new Date();
  if (d >= today) return dateStr; // 이미 미래
  while (d < today) d.setMonth(d.getMonth() + freqMonths);
  return fmt(d);
}

// ── US 주식: FMP 기반 처리 ───────────────────────────────────────────────────
async function handleUSWithFmp(rawTicker: string) {
  const fmp = await getFmpFullQuote(rawTicker.toUpperCase());
  if (!fmp) {
    return NextResponse.json(
      { error: "종목을 찾을 수 없습니다. 티커를 다시 확인해 주세요." },
      { status: 404 }
    );
  }

  // 배당 이력으로 지급 패턴 파악
  const history = await getFmpDividendHistory(rawTicker.toUpperCase());
  const dividendFrequency = estimateFrequency(history);

  // 지급 월 목록
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const recentHist = history.filter((h) => new Date(h.date) >= twoYearsAgo);

  const payMonthSet   = new Set<number>();
  const payDayByMonth: Record<number, number> = {};
  const payDaySums: Record<number, { sum: number; count: number }> = {};

  recentHist.forEach((h) => {
    const payTarget = h.paymentDate ?? h.date;
    const d  = new Date(payTarget);
    const mo = d.getMonth() + 1;
    const dy = d.getDate();
    payMonthSet.add(mo);
    if (!payDaySums[mo]) payDaySums[mo] = { sum: 0, count: 0 };
    payDaySums[mo].sum   += dy;
    payDaySums[mo].count += 1;
  });
  Object.entries(payDaySums).forEach(([mo, { sum, count }]) => {
    payDayByMonth[parseInt(mo)] = Math.round(sum / count);
  });

  let payMonths = [...payMonthSet].sort((a, b) => a - b);
  if (payMonths.length === 0) {
    payMonths = [3, 6, 9, 12];
  }

  // 향후 12개월 예상 지급일
  const today = new Date();
  const estimatedPayDates: string[] = [];
  for (let offset = 0; offset <= 12; offset++) {
    const d  = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const mo = d.getMonth() + 1;
    const yr = d.getFullYear();
    if (payMonths.includes(mo)) {
      const day     = payDayByMonth[mo] ?? 15;
      const dateStr = `${yr}.${String(mo).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
      estimatedPayDates.push(dateStr);
    }
  }

  return NextResponse.json({
    ticker:            rawTicker.toUpperCase(),
    name:              fmp.name,
    price:             fmp.price,
    dps:               fmp.dps,
    dividendYield:     fmp.dividendYield,
    exDate:            isPast(fmp.exDate) ? null : fmp.exDate,
    paymentDate:       isPast(fmp.payDate) ? null : fmp.payDate,
    currency:          fmp.currency,
    payMonths,
    dividendFrequency,
    estimatedPayDates,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// ── 한국/Yahoo Finance 기반 처리 ─────────────────────────────────────────────
async function handleWithYahoo(rawTicker: string) {
  const yf = getYfClient();

  const isKorean = rawTicker.endsWith(".KS") || rawTicker.endsWith(".KQ");
  const tickerCandidates: string[] = isKorean
    ? rawTicker.endsWith(".KS")
      ? [rawTicker, rawTicker.replace(".KS", ".KQ")]
      : [rawTicker, rawTicker.replace(".KQ", ".KS")]
    : [rawTicker];

  let quote: any;
  let ticker = rawTicker;

  for (const candidate of tickerCandidates) {
    try {
      const q = await yf.quote(candidate);
      if (q?.regularMarketPrice) { quote = q; ticker = candidate; break; }
    } catch { /* try next */ }
  }

  if (!quote) {
    return NextResponse.json(
      { error: "종목을 찾을 수 없습니다. 종목명 또는 티커를 다시 확인해 주세요." },
      { status: 404 }
    );
  }

  const price         = quote.regularMarketPrice ?? null;
  let   dps: number | null = (quote as any).trailingAnnualDividendRate ?? null;
  let   divYield      = (quote as any).trailingAnnualDividendYield      ?? null;
  let   exDateRaw     = (quote as any).exDividendDate                    ?? null;
  let   payDateRaw    = (quote as any).dividendDate                      ?? null;

  // quoteSummary — 더 정확한 배당 데이터
  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["summaryDetail", "calendarEvents"],
    });
    const det = summary?.summaryDetail;
    const cal = summary?.calendarEvents;

    if (det?.dividendRate   != null) dps        = det.dividendRate;
    if (det?.dividendYield  != null) divYield   = det.dividendYield;
    if (det?.exDividendDate != null) exDateRaw  = det.exDividendDate;
    if (cal?.dividendDate   != null) payDateRaw = cal.dividendDate;
    else if (det?.dividendDate != null) payDateRaw = det.dividendDate;
  } catch { /* 무시 */ }

  // 한국 주식 → Open DART 공시 데이터로 DPS 검증/보완
  const isKoreanStock = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  if (isKoreanStock && process.env.DART_API_KEY) {
    try {
      const stockCode = ticker.replace(".KS", "").replace(".KQ", "");
      const dartData  = await getDartDividend(stockCode);
      if (dartData) {
        if (dartData.dps != null && dartData.dps > 0) dps = dartData.dps;
        if (divYield == null && dartData.dividendYield != null) divYield = dartData.dividendYield;
        if (dps != null && price != null && price > 0) divYield = dps / price;
      }
    } catch { /* DART 실패 시 Yahoo 데이터로 진행 */ }
  }

  const fmtExDate  = fmt(exDateRaw);
  const fmtPayDate = fmt(payDateRaw);

  // 배당 지급 이력으로 패턴 파악
  let payMonths: number[] = [];
  let dividendFrequency: "annual" | "semi-annual" | "quarterly" | "monthly" = "annual";
  const payDayByMonth: Record<number, number> = {};
  let lastKnownDivDate: Date | null = null;   // 이력에서 가장 최근 배당락일

  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Yahoo Finance가 historical()을 삭제 → chart()로 직접 교체
    const chartResult = await yf.chart(ticker, {
      period1:  twoYearsAgo.toISOString().split("T")[0],
      period2:  new Date().toISOString().split("T")[0],
      interval: "1mo",
      events:   "dividends",
    });

    // chart()는 dividends를 { [timestamp]: { amount, date } } 형태로 반환
    const dividendsObj = (chartResult as any)?.events?.dividends ?? {};
    const divRows: Array<{ date: Date; amount: number }> = Object.values(dividendsObj)
      .map((d: any) => ({
        date:   d.date instanceof Date ? d.date : new Date((d.date as number) * 1000),
        amount: d.amount as number,
      }))
      .filter((d) => d.amount > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (divRows.length > 0) {
      payMonths = [...new Set(divRows.map((h) => h.date.getMonth() + 1))].sort((a, b) => a - b);
      const avgPerYear = divRows.length / 2;
      dividendFrequency =
        avgPerYear >= 10 ? "monthly" :
        avgPerYear >= 3  ? "quarterly" :
        avgPerYear >= 1.5 ? "semi-annual" : "annual";

      const daySums: Record<number, { sum: number; count: number }> = {};
      divRows.forEach((h) => {
        const mo = h.date.getMonth() + 1;
        const dy = h.date.getDate();
        if (!daySums[mo]) daySums[mo] = { sum: 0, count: 0 };
        daySums[mo].sum   += dy;
        daySums[mo].count += 1;
      });
      Object.entries(daySums).forEach(([mo, { sum, count }]) => {
        payDayByMonth[parseInt(mo)] = Math.round(sum / count);
      });
      lastKnownDivDate = divRows[divRows.length - 1].date;
    }
  } catch { /* 이력 없으면 기본값 */ }

  if (payMonths.length === 0) {
    const isKR = isKoreanStock;
    if (!isPast(fmtPayDate) && fmtPayDate) {
      const m = fmtPayDate.match(/\d{4}\.(\d{2})\.(\d{2})/);
      if (m) { payMonths = [parseInt(m[1])]; payDayByMonth[parseInt(m[1])] = parseInt(m[2]); }
    }
    if (payMonths.length === 0) {
      payMonths = isKR ? [4] : [3, 6, 9, 12];
      dividendFrequency = isKR ? "annual" : "quarterly";
    }
  }

  // 배당 주기(개월 수) 계산
  const freqMonths =
    dividendFrequency === "monthly"     ? 1  :
    dividendFrequency === "quarterly"   ? 3  :
    dividendFrequency === "semi-annual" ? 6  : 12;

  // 과거 배당락일/지급일을 다음 사이클로 투영 (미정 대신 예상 날짜 표시)
  let finalExDate  = projectToFuture(fmtExDate,  freqMonths);
  let finalPayDate = projectToFuture(fmtPayDate, freqMonths);

  // ex-date가 없으면 최근 배당 이력에서 추정
  if (!finalExDate && lastKnownDivDate) {
    const d = new Date(lastKnownDivDate);
    while (d < new Date()) d.setMonth(d.getMonth() + freqMonths);
    finalExDate = fmt(d);
  }

  // 지급일이 없고 ex-date가 있으면, 한국 주식은 ex-date로부터 약 3~4개월 후 추정
  if (!finalPayDate && finalExDate && isKoreanStock) {
    const m2 = finalExDate.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (m2) {
      const d2 = new Date(+m2[1], +m2[2] - 1, +m2[3]);
      const payOffset = dividendFrequency === "annual" ? 4 : dividendFrequency === "semi-annual" ? 2 : 1;
      d2.setMonth(d2.getMonth() + payOffset);
      finalPayDate = fmt(d2);
    }
  }

  const today = new Date();
  const estimatedPayDates: string[] = [];
  for (let offset = 0; offset <= 12; offset++) {
    const d  = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const mo = d.getMonth() + 1;
    const yr = d.getFullYear();
    if (payMonths.includes(mo)) {
      const day     = payDayByMonth[mo] ?? 15;
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
    exDate:            finalExDate,
    paymentDate:       finalPayDate,
    currency:          quote.currency ?? "USD",
    payMonths,
    dividendFrequency,
    estimatedPayDates,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// ── 라우트 핸들러 ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const rawTicker = req.nextUrl.searchParams.get("ticker");
  if (!rawTicker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  const isKorean = rawTicker.endsWith(".KS") || rawTicker.endsWith(".KQ");

  // US 주식 + FMP 키 있으면 FMP 사용
  if (!isKorean && hasFmpKey()) {
    return handleUSWithFmp(rawTicker);
  }

  // 한국 주식 또는 FMP 키 없는 경우 Yahoo Finance 사용
  return handleWithYahoo(rawTicker);
}
