/**
 * 통합 주식 데이터 엔드포인트
 * GET /api/stock/[code]?market=KR|US
 *
 * KR 우선순위:
 *   1. KIS (현재가) + DART (배당금)  ← 병렬
 *   2. Naver 모바일 API              ← DART 실패 시 fallback
 *   3. Yahoo Finance                 ← 최후 수단
 *
 * US 우선순위:
 *   1. FMP (메인)
 *   2. Yahoo Finance (fallback)
 *
 * 캐시:
 *   - 현재가: 5분  (max-age=300)
 *   - 배당 데이터: 24시간 (s-maxage=86400)
 */

import { NextRequest, NextResponse } from "next/server";
import { hasKisKey, getKisPrice }                        from "@/lib/kis-api";
import { getDartDividend }                               from "@/lib/dart-api";
import { getNaverStockData }                             from "@/lib/naver-api";
import { hasFmpKey, getFmpFullQuote, getFmpDividendHistory, estimateFrequency, calcAnnualDps } from "@/lib/fmp-api";
import { hasSeibroKey, getSeibroStockInfo }              from "@/lib/seibro-api";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ─── 공통 응답 형식 ───────────────────────────────────────────────────────
export interface StockApiResponse {
  ticker:            string;
  name:              string;
  market:            "KR" | "US";
  currentPrice:      number | null;
  dividendAmount:    number | null;   // 연간 DPS
  dividendYield:     number | null;   // 소수 (0.03 = 3%)
  paymentDate:       string | null;   // YYYY.MM.DD
  exDate:            string | null;
  payMonths:         number[];
  dividendFrequency: string;
  currency:          string;
  lastUpdate:        string;          // ISO 8601
  source:            string;          // 데이터 출처 (디버깅용)
}

function fmt(d: unknown): string | null {
  if (!d) return null;
  try {
    const date = new Date(d as string | number | Date);
    if (isNaN(date.getTime())) return null;
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
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

// ─── KR 주식 처리 ────────────────────────────────────────────────────────
async function handleKR(stockCode: string): Promise<NextResponse> {
  // 1단계: KIS(가격) + DART(배당) 병렬 호출
  const [kisResult, dartResult] = await Promise.allSettled([
    hasKisKey() ? getKisPrice(stockCode) : Promise.resolve(null),
    process.env.DART_API_KEY ? getDartDividend(stockCode) : Promise.resolve(null),
  ]);

  const kisData  = kisResult.status  === "fulfilled" ? kisResult.value  : null;
  const dartData = dartResult.status === "fulfilled" ? dartResult.value : null;

  let price:         number | null = kisData?.price ?? null;
  let name:          string        = kisData?.name  ?? stockCode;
  let dps:           number | null = dartData?.dps  ?? null;
  let dividendYield: number | null = dartData?.dividendYield ?? null;
  let source = "";

  if (price)      source += "KIS ";
  if (dartData)   source += "DART ";

  // 2단계: Naver fallback (가격 또는 배당 데이터 누락 시)
  if (!price || !dps) {
    const naver = await getNaverStockData(stockCode);
    if (naver) {
      if (!price && naver.price)           price = naver.price;
      if (!name || name === stockCode)     name  = naver.name;
      if (!dps  && naver.dps)              dps   = naver.dps;
      if (!dividendYield && naver.dividendYield) dividendYield = naver.dividendYield;
      source += "Naver ";
    }
  }

  // SEIBro 가격 교차 검증 (KIS 없을 때)
  if (!price && hasSeibroKey()) {
    const seibro = await getSeibroStockInfo(stockCode);
    if (seibro?.price) {
      price = seibro.price;
      if (!name || name === stockCode) name = seibro.name;
      source += "SEIBro ";
    }
  }

  // 3단계: Yahoo Finance 최후 수단
  if (!price || !dps) {
    try {
      const YF   = require("yahoo-finance2").default;
      const yf   = new YF({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
      const yTicker = `${stockCode}.KS`;
      const quote    = await yf.quote(yTicker).catch(() => null);
      if (quote?.regularMarketPrice) {
        if (!price) price = quote.regularMarketPrice;
        if (!name || name === stockCode) name = quote.longName ?? quote.shortName ?? name;
        if (!dps && quote.trailingAnnualDividendRate) dps = quote.trailingAnnualDividendRate;
        source += "Yahoo ";
      }
    } catch { /* 완전 실패 */ }
  }

  // DPS로 수익률 재계산 (DART DPS + 현재가 기준)
  if (dps != null && price != null && price > 0) {
    dividendYield = dps / price;
  }

  if (!price) {
    return NextResponse.json(
      { error: "종목을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const body: StockApiResponse = {
    ticker:            stockCode,
    name,
    market:            "KR",
    currentPrice:      price,
    dividendAmount:    dps,
    dividendYield,
    paymentDate:       null,   // KR 지급일은 /api/dividend에서 상세 계산
    exDate:            null,
    payMonths:         [4],    // KR 연배당 기본: 4월 지급
    dividendFrequency: "annual",
    currency:          "KRW",
    lastUpdate:        new Date().toISOString(),
    source:            source.trim(),
  };

  return NextResponse.json(body, {
    headers: {
      // 현재가 5분, 배당 데이터는 엣지에서 24시간 캐시
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}

// ─── US 주식 처리 ────────────────────────────────────────────────────────
async function handleUS(ticker: string): Promise<NextResponse> {
  const upperTicker = ticker.toUpperCase();

  // 1단계: FMP (메인)
  if (hasFmpKey()) {
    const [fmp, history] = await Promise.allSettled([
      getFmpFullQuote(upperTicker),
      getFmpDividendHistory(upperTicker),
    ]);
    const fmpData    = fmp.status     === "fulfilled" ? fmp.value     : null;
    const histData   = history.status === "fulfilled" ? history.value : [];

    if (fmpData) {
      const freq      = estimateFrequency(histData);
      const annualDps = histData.length > 0 ? calcAnnualDps(histData) : (fmpData.dps ?? 0);
      const divYield  = annualDps > 0 && fmpData.price
        ? annualDps / fmpData.price
        : fmpData.dividendYield;

      const body: StockApiResponse = {
        ticker:            upperTicker,
        name:              fmpData.name,
        market:            "US",
        currentPrice:      fmpData.price,
        dividendAmount:    annualDps || fmpData.dps,
        dividendYield:     divYield,
        paymentDate:       isPast(fmpData.payDate) ? null : fmpData.payDate,
        exDate:            isPast(fmpData.exDate)  ? null : fmpData.exDate,
        payMonths:         [],
        dividendFrequency: freq,
        currency:          fmpData.currency,
        lastUpdate:        new Date().toISOString(),
        source:            "FMP",
      };

      return NextResponse.json(body, {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=3600",
        },
      });
    }
  }

  // 2단계: Yahoo Finance fallback
  try {
    const YF    = require("yahoo-finance2").default;
    const yf    = new YF({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
    const quote  = await yf.quote(upperTicker);
    if (!quote?.regularMarketPrice) throw new Error("no data");

    const dps       = quote.trailingAnnualDividendRate ?? null;
    const rawYield  = quote.trailingAnnualDividendYield ?? null;
    const divYield  = rawYield != null ? (rawYield > 1 ? rawYield / 100 : rawYield) : null;

    const body: StockApiResponse = {
      ticker:            upperTicker,
      name:              quote.longName ?? quote.shortName ?? upperTicker,
      market:            "US",
      currentPrice:      quote.regularMarketPrice,
      dividendAmount:    dps,
      dividendYield:     divYield,
      paymentDate:       fmt(quote.dividendDate),
      exDate:            fmt(quote.exDividendDate),
      payMonths:         [3, 6, 9, 12],
      dividendFrequency: "quarterly",
      currency:          quote.currency ?? "USD",
      lastUpdate:        new Date().toISOString(),
      source:            "Yahoo",
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "종목을 찾을 수 없습니다." }, { status: 404 });
  }
}

// ─── 라우트 핸들러 ────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!code) {
    return NextResponse.json({ error: "종목코드가 필요합니다." }, { status: 400 });
  }

  // market 파라미터 또는 코드 형식으로 자동 판별
  const marketParam = req.nextUrl.searchParams.get("market");
  const isKR =
    marketParam === "KR" ||
    (!marketParam && /^\d{6}$/.test(code)); // 6자리 숫자면 KR

  return isKR ? handleKR(code) : handleUS(code);
}
