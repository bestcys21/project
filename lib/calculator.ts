import { Market, Holding, DividendEvent, MonthlyDividend } from "./types";

export type { Market };

export interface DividendInput {
  stock: string;
  quantity: number;
  purchaseDate: string;
  market: Market;
}

export interface DividendResult {
  stock: string;
  quantity: number;
  purchaseDate: string;
  market: Market;
  dps: number;
  exDate: string;
  paymentDate: string;
  grossAmount: number;
  netAmount: number;
  taxRate: number;
  currency: string;
}

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };
const CURRENCY: Record<Market, string> = { KR: "원", US: "$" };

/** 단일 종목 세후 배당 계산 (데모 데이터 기반) */
export function calculateDividend(input: DividendInput): DividendResult {
  const taxRate = TAX_RATE[input.market];
  const dps         = input.market === "KR" ? 361 : 0.24;
  const exDate      = input.market === "KR" ? "2025.12.28" : "2025.11.14";
  const paymentDate = input.market === "KR" ? "2026.04.15" : "2025.12.06";
  const grossAmount = dps * input.quantity;

  return {
    stock: input.stock,
    quantity: input.quantity,
    purchaseDate: input.purchaseDate,
    market: input.market,
    dps,
    exDate,
    paymentDate,
    grossAmount,
    netAmount: grossAmount * (1 - taxRate),
    taxRate,
    currency: CURRENCY[input.market],
  };
}

/** 보유 종목 → DividendEvent 목록 */
export function holdingsToDividendEvents(holdings: Holding[]): DividendEvent[] {
  return holdings.map((h) => {
    const taxRate = TAX_RATE[h.market];
    const dps = h.market === "KR" ? 361 : 0.24;
    return {
      holdingId: h.id,
      ticker: h.ticker,
      name: h.name,
      market: h.market,
      exDate: h.market === "KR" ? "2025.12.28" : "2025.11.14",
      paymentDate: h.market === "KR" ? "2026.04.15" : "2025.12.06",
      dps,
      quantity: h.quantity,
      netAmount: dps * h.quantity * (1 - taxRate),
    };
  });
}

/** 보유 종목 → 월별 배당금 집계 (데모: 분기 배당 가정) */
export function calcMonthlyDividends(holdings: Holding[]): MonthlyDividend[] {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}월`, amount: 0 }));
  const payMonths: Record<Market, number[]> = {
    KR: [3, 6, 9, 12],
    US: [1, 4, 7, 10],
  };
  holdings.forEach((h) => {
    const taxRate = TAX_RATE[h.market];
    const dps = h.market === "KR" ? 361 : 0.24;
    const quarterly = dps * h.quantity * (1 - taxRate) / 4;
    payMonths[h.market].forEach((m) => {
      months[m - 1].amount += quarterly;
    });
  });
  return months;
}

export function formatAmount(amount: number, market: Market): string {
  if (market === "KR") return Math.round(amount).toLocaleString("ko-KR") + "원";
  return "$" + amount.toFixed(2);
}

export function formatDate(iso: string): string {
  return iso.replace(/-/g, ".");
}
