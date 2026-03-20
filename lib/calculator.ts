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

export function calculateDividend(input: DividendInput): DividendResult {
  const taxRate     = TAX_RATE[input.market];
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

export function holdingsToDividendEvents(
  holdings: Holding[],
  apiData?: Record<string, { dps: number; exDate: string | null; paymentDate: string | null }>
): DividendEvent[] {
  return holdings.map((h) => {
    const taxRate = TAX_RATE[h.market];
    const api     = apiData?.[h.ticker];
    const dps     = api?.dps ?? (h.market === "KR" ? 361 : 0.24);
    return {
      holdingId:   h.id,
      ticker:      h.ticker,
      name:        h.name,
      market:      h.market,
      exDate:      api?.exDate      ?? (h.market === "KR" ? "2025.12.28" : "2025.11.14"),
      paymentDate: api?.paymentDate ?? (h.market === "KR" ? "2026.04.15" : "2025.12.06"),
      dps,
      quantity:    h.quantity,
      netAmount:   dps * h.quantity * (1 - taxRate),
    };
  });
}

/** 종목별 스택 데이터 (차트용) */
export function calcStackedMonthly(
  holdings: Holding[],
  apiData?: Record<string, { dps: number }>
): { stackedData: any[]; tickers: string[] } {
  const tickers = holdings.map((h) => h.name || h.ticker);
  const months  = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
  const payMonths: Record<Market, number[]> = {
    KR: [3, 6, 9, 12],
    US: [1, 4, 7, 10],
  };

  const stackedData = months.map((month, mi) => {
    const row: any = { month, total: 0 };
    holdings.forEach((h) => {
      const taxRate  = TAX_RATE[h.market];
      const dps      = apiData?.[h.ticker]?.dps ?? (h.market === "KR" ? 361 : 0.24);
      const quarterly = dps * h.quantity * (1 - taxRate) / 4;
      const val = payMonths[h.market].includes(mi + 1) ? quarterly : 0;
      row[h.name || h.ticker] = val;
      row.total += val;
    });
    return row;
  });

  return { stackedData, tickers };
}

export function calcMonthlyDividends(holdings: Holding[]): MonthlyDividend[] {
  const { stackedData } = calcStackedMonthly(holdings);
  return stackedData.map((d) => ({ month: d.month, amount: d.total }));
}

export function formatAmount(amount: number, market: Market): string {
  if (market === "KR") return Math.round(amount).toLocaleString("ko-KR") + "원";
  return "$" + amount.toFixed(2);
}

export function formatDate(iso: string): string {
  return iso.replace(/-/g, ".");
}
