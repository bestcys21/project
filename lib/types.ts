export type Market = "KR" | "US";

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  market: Market;
  quantity: number;
  purchaseDate: string; // YYYY-MM-DD
}

export interface DividendEvent {
  holdingId: string;
  ticker: string;
  name: string;
  market: Market;
  exDate: string;       // "YYYY.MM.DD"
  paymentDate: string;  // "YYYY.MM.DD"
  dps: number;
  quantity: number;
  netAmount: number;
}

export interface MonthlyDividend {
  month: string; // "1월" ~ "12월"
  amount: number;
}
