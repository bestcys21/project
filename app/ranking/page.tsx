"use client";

import { useEffect, useState, useRef } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import StockLogo from "@/components/StockLogo";

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
      {Array.from({ length: 10 }).map((_, i) => (
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
  // 탭 전환 시 이전 요청 응답이 늦게 오는 race condition 방지
  const reqIdRef = useRef(0);

  useEffect(() => {
    fetchRanking(market);
  }, [market]);

  async function fetchRanking(m: string) {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError("");
    setData([]);
    try {
      const res  = await fetch(`/api/ranking?market=${m}`);
      const json = await res.json();
      if (reqId !== reqIdRef.current) return; // 이미 다른 요청이 시작됨
      setData(json.data ?? []);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (reqId !== reqIdRef.current) return;
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-3xl font-extrabold text-toss-text">배당 랭킹</h1>
        <p className="text-base text-toss-sub">
          배당수익률 기준 상위 50위 종목입니다. (우선주 포함)
        </p>
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
            {m === "KR" ? "한국주식" : "미국주식"}
          </button>
        ))}
      </div>

      {/* 데이터 소스 안내 */}
      <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
        <span className="text-blue-400 flex-shrink-0 text-base">ℹ️</span>
        <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>데이터 출처:</strong> Yahoo Finance 실시간 API. 코스피/코스닥 주요 종목 및 우선주를 포함한 풀에서
          배당수익률이 확인된 종목을 수익률 순으로 정렬합니다.
          무료 API 특성상 일부 종목은 데이터가 누락될 수 있습니다.
        </p>
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
            <div>
              {/* PC 테이블 헤더 */}
              <div className="hidden md:grid md:grid-cols-[40px_50px_1fr_110px_110px] gap-3 px-2 pb-2 border-b border-toss-border mb-1">
                <span className="text-[11px] font-semibold text-toss-sub text-center">순위</span>
                <span />
                <span className="text-[11px] font-semibold text-toss-sub">종목명</span>
                <span className="text-[11px] font-semibold text-toss-sub text-right">현재가</span>
                <span className="text-[11px] font-semibold text-toss-sub text-right">배당수익률</span>
              </div>
              {data.map((stock, i) => (
                <div key={stock.ticker}
                  className="flex items-center gap-3 py-3.5 border-b border-toss-border last:border-0
                             md:grid md:grid-cols-[40px_50px_1fr_110px_110px]">

                  {/* 순위 */}
                  <div className="w-7 text-center flex-shrink-0 md:w-auto">
                    {i < 3
                      ? <span className="text-lg">{MEDAL[i]}</span>
                      : <span className="text-[14px] font-bold text-toss-sub">{i + 1}</span>
                    }
                  </div>

                  {/* 로고 */}
                  <StockLogo ticker={stock.ticker} name={stock.name} market={stock.market} size={40} />

                  {/* 이름 + 티커 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-toss-text truncate">{stock.name}</p>
                    <p className="text-[12px] text-toss-sub mt-0.5">
                      {stock.ticker.replace(/\.(KS|KQ)$/, "")}
                    </p>
                  </div>

                  {/* 현재가 */}
                  <div className="hidden md:block text-right flex-shrink-0">
                    {stock.price != null ? (
                      <p className="text-[14px] font-semibold text-toss-text">
                        {market === "KR"
                          ? `${stock.price.toLocaleString("ko-KR")}원`
                          : `$${stock.price.toFixed(2)}`}
                      </p>
                    ) : (
                      <p className="text-[13px] text-toss-sub">—</p>
                    )}
                    {stock.dps != null && (
                      <p className="text-[11px] text-toss-sub mt-0.5">
                        연 {market === "KR"
                          ? `${stock.dps.toLocaleString("ko-KR")}원`
                          : `$${stock.dps.toFixed(2)}`}
                      </p>
                    )}
                  </div>

                  {/* 배당수익률 */}
                  <div className="text-right flex-shrink-0 ml-auto md:ml-0">
                    <p className={`text-[16px] font-extrabold ${
                      stock.dividendYield >= 0.07 ? "text-red-500" :
                      stock.dividendYield >= 0.04 ? "text-toss-blue" : "text-toss-text"
                    }`}>
                      {(stock.dividendYield * 100).toFixed(2)}%
                    </p>
                    {/* 모바일에서만 현재가 표시 */}
                    {stock.price != null && (
                      <p className="text-[11px] text-toss-sub mt-0.5 md:hidden">
                        {market === "KR"
                          ? `${stock.price.toLocaleString("ko-KR")}원`
                          : `$${stock.price.toFixed(2)}`}
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
        * 실시간 시장 데이터 기준. 투자 권유가 아닙니다.
      </p>
    </div>
  );
}
