"use client";

export type StockType = "stock" | "etf" | "reit";

export interface MasterItem {
  name: string;
  ticker: string;
  exchange: "KS" | "KQ";
  type: StockType;
  market: "KR" | "US";
}

// Singleton cache
let masterCache: MasterItem[] | null = null;
let loadPromise: Promise<MasterItem[]> | null = null;

export async function loadMasterDB(): Promise<MasterItem[]> {
  if (masterCache) return masterCache;
  if (loadPromise) return loadPromise;
  loadPromise = fetch("/ticker_master.json")
    .then((r) => r.json())
    .then((data: MasterItem[]) => {
      masterCache = data;
      loadPromise = null;
      return data;
    });
  return loadPromise;
}

// Korean initial consonant table
const CHOSEONG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

function getChosung(char: string): string {
  const code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return char;
  return CHOSEONG[Math.floor(code / 28 / 21)];
}

function extractChosung(text: string): string {
  return text.split("").map(getChosung).join("");
}

function isChosung(text: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(text);
}

// Scoring: 0=exact, 1=tickerExact, 2=nameStartsWith, 3=tickerStartsWith, 4=chosungMatch, 5=contains, 6=fuzzy
function scoreItem(item: MasterItem, q: string, ql: string): number | null {
  const name = item.name.toLowerCase();
  const ticker = item.ticker.toLowerCase();

  if (name === ql || ticker === ql) return 0;
  if (ticker === ql) return 1;
  if (name.startsWith(ql)) return 2;
  if (ticker.startsWith(ql)) return 3;

  // Chosung match
  if (isChosung(q)) {
    const chosung = extractChosung(item.name);
    if (chosung.startsWith(q)) return 4;
    if (chosung.includes(q)) return 4.5;
  }

  if (name.includes(ql)) return 5;
  if (ticker.includes(ql)) return 5.5;

  // Simple fuzzy: all characters appear in order
  let idx = 0;
  for (const ch of ql) {
    const found = name.indexOf(ch, idx);
    if (found === -1) return null;
    idx = found + 1;
  }
  return 6;
}

export function searchMaster(items: MasterItem[], query: string, maxResults = 20): MasterItem[] {
  const q = query.trim();
  if (!q) return [];
  const ql = q.toLowerCase();

  const scored: Array<{ item: MasterItem; score: number }> = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.ticker)) continue;
    const score = scoreItem(item, q, ql);
    if (score !== null) {
      scored.push({ item, score });
      seen.add(item.ticker);
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, maxResults).map((s) => s.item);
}
