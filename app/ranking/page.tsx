"use client";

import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

interface StockData {
  ticker:        string;
  name:          string;
  dividendYield: number;
  dps:           number | null;
  price:         number | null;
  market:        string;
}

function RankingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-toss-border animate-pulse">
          <div className="w-7 h-5 bg-toss-bg rounded" />
          <div className="w-10 h-10 bg-toss-bg rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-toss-bg rounded w-28" />
            <div className="h-3 bg-toss-bg rounded w-16" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-4 bg-toss-bg rounded w-16" />
            <div className="h-3 bg-toss-bg rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const [market,  setMarket]  = useState<"KR" | "US">("KR");
  const [data,    setData]    = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetchRanking(market);
  }, [market]);

  async function fetchRanking(m: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ranking?market=${m}`);
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text">배당 랭킹</h1>
        <p className="text-sm text-toss-sub">배당 수익률 기준 고배당주 실시간 순위에요.</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {(["KR", "US"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[14px] font-bold transition-all
              ${market === m
                ? "bg-toss-blue text-white"
                : "bg-toss-card text-toss-label border border-toss-border hover:border-toss-blue hover:text-toss-blue"
              }`}
          >
            {m === "KR" ? "🇰🇷 한국" : "🇺🇸 미국"}
          </button>
        ))}
      </div>

      <ErrorBoundary>
        <div className="bg-toss-card rounded-2xl shadow-card p-5">
          {loading ? (
            <RankingSkeleton />
          ) : error ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-3xl">😵</p>
              <p className="text-[14px] text-toss-sub">{error}</p>
              <button onClick={() => fetchRanking(market)}
                className="mt-2 px-4 py-2 bg-toss-blue text-white text-[13px] font-bold rounded-xl">
                다시 시도
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[14px] text-toss-sub">데이터가 없어요.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {data.map((stock, i) => (
                <div key={stock.ticker}
                  className="flex items-center gap-3 py-3.5 border-b border-toss-border last:border-0">
                  {/* 순위 */}
                  <div className="w-7 text-center flex-shrink-0">
                    {i < 3
                      ? <span className="text-lg">{MEDAL[i]}</span>
                      : <span className="text-[14px] font-bold text-toss-sub">{i + 1}</span>
                    }
                  </div>

                  {/* 아이콘 */}
                  <div className="w-10 h-10 rounded-xl bg-toss-bg flex items-center justify-center text-[13px] font-bold text-toss-text flex-shrink-0">
                    {stock.ticker.replace(".KS", "").slice(0, 3)}
                  </div>

                  {/* 이름 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-toss-text truncate">{stock.name}</p>
                    <p className="text-[12px] text-toss-sub mt-0.5">
                      {stock.ticker.replace(".KS", "")}
                      {stock.price != null && (
                        <span className="ml-1.5">
                          · {market === "KR"
                            ? `${stock.price.toLocaleString("ko-KR")}원`
                            : `$${stock.price.toFixed(2)}`}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 수익률 + DPS */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[16px] font-extrabold ${
                      stock.dividendYield >= 0.07 ? "text-red-500" :
                      stock.dividendYield >= 0.04 ? "text-toss-blue" : "text-toss-text"
                    }`}>
                      {(stock.dividendYield * 100).toFixed(2)}%
                    </p>
                    {stock.dps != null && (
                      <p className="text-[11px] text-toss-sub mt-0.5">
                        연 {market === "KR"
                          ? `${stock.dps.toLocaleString("ko-KR")}원`
                          : `$${stock.dps.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ErrorBoundary>

      <p className="text-[12px] text-toss-sub text-center px-4">
        * Yahoo Finance 실시간 데이터 기준. 투자 권유가 아닙니다.
      </p>
    </div>
  );
}
