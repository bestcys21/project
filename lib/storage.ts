import { Holding } from "./types";

const KEY = "dividend_insight_holdings";

export function getHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  localStorage.setItem(KEY, JSON.stringify(holdings));
}

export function addHolding(holding: Omit<Holding, "id">): Holding {
  const holdings = getHoldings();
  const newHolding: Holding = { ...holding, id: crypto.randomUUID() };
  saveHoldings([...holdings, newHolding]);
  return newHolding;
}

export function removeHolding(id: string): void {
  saveHoldings(getHoldings().filter((h) => h.id !== id));
}
