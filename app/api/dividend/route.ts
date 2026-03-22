import { NextRequest, NextResponse } from "next/server";
import { getDartDividend } from "@/lib/dart-api";
import {
  hasFmpKey,
  getFmpFullQuote,
  getFmpDividendHistory,
  estimateFrequency,
} from "@/lib/fmp-api";
import { hasKisKey, getKisPrice } from "@/lib/kis-api";

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

/**
 * 한국 주식: ex-dividend month → 실제 지급월 변환
 * Yahoo Finance chart()는 ex-date만 반환하므로 반드시 변환 필요
 *   3월 기준일 → 5월 지급  (+2)
 *   6월 기준일 → 8월 지급  (+2)
 *   9월 기준일 → 11월 지급 (+2)
 *  12월 기준일 → 4월 지급  (+4, 결산 배당)
 */
function exMonthToPayMonth(exMonth: number): number {
  if (exMonth === 12) return 4;           // 결산 배당: 12월 기준 → 익년 4월 지급
  const pay = exMonth + 2;
  return pay > 12 ? pay - 12 : pay;      // +2개월 (분기/반기 공통)
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

  // KIS 실시간 가격 우선 사용 (KR 주식만, Yahoo보다 정확)
  const isKoreanStock = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  let price: number | null = quote.regularMarketPrice ?? null;
  if (isKoreanStock && hasKisKey()) {
    try {
      const stockCode = ticker.replace(/\.(KS|KQ)$/, "");
      const kisPrice  = await getKisPrice(stockCode);
      if (kisPrice?.price) {
        price = kisPrice.price;
        // KIS 종목명이 더 정확하면 사용 (quote.longName이 없을 때)
        if (!quote.longName && !quote.shortName && kisPrice.name) {
          quote = { ...quote, longName: kisPrice.name };
        }
      }
    } catch { /* KIS 실패 시 Yahoo 가격 유지 */ }
  }

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

    if (det?.dividendRate   != null && det.dividendRate > 0) dps = det.dividendRate;
    if (det?.dividendYield  != null) divYield   = det.dividendYield;
    if (det?.exDividendDate != null) exDateRaw  = det.exDividendDate;
    if (cal?.dividendDate   != null) payDateRaw = cal.dividendDate;
    else if (det?.dividendDate != null) payDateRaw = det.dividendDate;
  } catch { /* 무시 */ }

  // 한국 주식 → Open DART 공시 데이터로 DPS 검증/보완
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
      // ex-date 기준 월 목록
      const exMonths = [...new Set(divRows.map((h) => h.date.getMonth() + 1))].sort((a, b) => a - b);

      const avgPerYear = divRows.length / 2;
      dividendFrequency =
        avgPerYear >= 10 ? "monthly" :
        avgPerYear >= 3  ? "quarterly" :
        avgPerYear >= 1.5 ? "semi-annual" : "annual";

      // ★ 핵심 수정: 한국 주식은 ex-date → 지급월 변환 (Yahoo Finance는 ex-date만 제공)
      //   미국 주식: FMP 루트에서 paymentDate 직접 사용하므로 여기선 Yahoo(=한국)만 해당
      if (isKoreanStock) {
        payMonths = [...new Set(exMonths.map(exMonthToPayMonth))].sort((a, b) => a - b);
      } else {
        // US Yahoo fallback: ex-date 그대로 사용 (FMP 없을 때)
        payMonths = exMonths;
      }

      // payDayByMonth: 변환된 지급월 기준으로 기본 지급일 15일 설정 (Yahoo는 지급일 미제공)
      payMonths.forEach((mo) => { payDayByMonth[mo] = 15; });

      lastKnownDivDate = divRows[divRows.length - 1].date;

      // ETF 등 Yahoo Finance가 DPS를 0으로 반환하는 경우: 이력 합산으로 보완
      if ((dps === 0 || dps == null) && divRows.length > 0) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const recentRows = divRows.filter(d => d.date >= oneYearAgo);
        if (recentRows.length > 0) {
          dps = recentRows.reduce((sum, d) => sum + d.amount, 0);
          if (price != null && price > 0) divYield = dps / price;
        }
      }
    }
  } catch { /* 이력 없으면 기본값 */ }

  if (payMonths.length === 0) {
    const isKR = isKoreanStock;
    if (!isPast(fmtPayDate) && fmtPayDate) {
      const m = fmtPayDate.match(/\d{4}\.(\d{2})\.(\d{2})/);
      if (m) { payMonths = [parseInt(m[1])]; payDayByMonth[parseInt(m[1])] = parseInt(m[2]); }
    }
    if (payMonths.length === 0) {
      // 한국 연배당 기본: 12월 결산 → 4월 지급
      // 미국 분기 기본: 3, 6, 9, 12월 지급
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

  // KR 주식 or FMP 없는 US: Yahoo Finance 사용
  // (KIS 실시간 가격은 handleWithYahoo 내부에서 오버라이드)
  return handleWithYahoo(rawTicker);
}
