"use client";

import { useEffect, useState, useRef } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import StockLogo from "@/components/StockLogo";
import { addHolding } from "@/lib/storage";

interface StockData {
  ticker:        string;
  name:          string;
  dividendYield: number;
  dps:           number | null;
  price:         number | null;
  market:        string;
}

type SortKey = "yield" | "stability" | "growth";

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

// 위험 수준 판정
function getRiskLevel(yld: number): { label: string; cls: string; msg: string } | null {
  if (yld >= 0.15) return {
    label: "⚠️ 주의",
    cls: "bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800",
    msg: "배당수익률이 비정상적으로 높아요. 주가 급락 또는 일회성 배당일 수 있습니다.",
  };
  if (yld >= 0.10) return {
    label: "⚡ 고위험",
    cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 border border-orange-200 dark:border-orange-800",
    msg: "매우 높은 수익률. 지속 가능성을 반드시 확인하세요.",
  };
  return null;
}

const MEDAL = ["🥇", "🥈", "🥉"];

// 안정형 추천 (KR/US 공통 티커 키워드)
const STABLE_TICKERS_KR = ["105560","055550","086790","033780","017670","051600"];
const STABLE_TICKERS_US = ["JNJ","KO","PG","ABBV","VZ","SCHD","VYM"];
const GROWTH_TICKERS_KR = ["005930","000660","373220","051910","207940"];
const GROWTH_TICKERS_US = ["MSFT","AAPL","V","MA","UNH","AVGO"];
const ETF_TICKERS_KR    = ["476550","458730","091160","446720","479850","329200"];
const ETF_TICKERS_US    = ["JEPI","JEPQ","SCHD","QYLD","VYM","HDV","DVY"];

function AddButton({ stock, market }: { stock: StockData; market: "KR" | "US" }) {
  const [added, setAdded] = useState(false);
  function handle() {
    const rawTicker = stock.ticker.replace(/\.(KS|KQ)$/, "");
    addHolding({
      ticker: rawTicker,
      name:   stock.name,
      market: market,
      quantity: 1,
      purchaseDate: new Date().toISOString().split("T")[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }
  return (
    <button onClick={handle}
      className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all
        ${added
          ? "bg-green-100 dark:bg-green-900/20 text-green-600"
          : "bg-toss-blue/10 text-toss-blue hover:bg-toss-blue hover:text-white"}`}>
      {added ? "✓ 추가됨" : "+ 추가"}
    </button>
  );
}

export default function RankingPage() {
  const [market,  setMarket]  = useState<"KR" | "US">("KR");
  const [data,    setData]    = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("yield");
  const reqIdRef = useRef(0);

  useEffect(() => { fetchRanking(market); }, [market]);

  async function fetchRanking(m: string) {
    const reqId = ++reqIdRef.current;
    setLoading(true); setError(""); setData([]);
    try {
      const res  = await fetch(`/api/ranking?market=${m}`);
      const json = await res.json();
      if (reqId !== reqIdRef.current) return;
      setData(json.data ?? []);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (reqId !== reqIdRef.current) return;
      setLoading(false);
    }
  }

  // 정렬 적용
  const sorted = [...data].sort((a, b) => {
    if (sortKey === "yield") return b.dividendYield - a.dividendYield;
    if (sortKey === "stability") {
      const stList = market === "KR" ? STABLE_TICKERS_KR : STABLE_TICKERS_US;
      const aS = stList.includes(a.ticker.replace(/\.(KS|KQ)$/,"")) ? 1 : 0;
      const bS = stList.includes(b.ticker.replace(/\.(KS|KQ)$/,"")) ? 1 : 0;
      return bS - aS || b.dividendYield - a.dividendYield;
    }
    // growth
    const grList = market === "KR" ? GROWTH_TICKERS_KR : GROWTH_TICKERS_US;
    const aG = grList.includes(a.ticker.replace(/\.(KS|KQ)$/,"")) ? 1 : 0;
    const bG = grList.includes(b.ticker.replace(/\.(KS|KQ)$/,"")) ? 1 : 0;
    return bG - aG || b.dividendYield - a.dividendYield;
  });

  // 추천 섹션 데이터
  const stablePicks  = data.filter(d => (market === "KR" ? STABLE_TICKERS_KR : STABLE_TICKERS_US).includes(d.ticker.replace(/\.(KS|KQ)$/,""))).slice(0,3);
  const etfPicks     = data.filter(d => (market === "KR" ? ETF_TICKERS_KR : ETF_TICKERS_US).includes(d.ticker.replace(/\.(KS|KQ)$/,""))).slice(0,3);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-3xl font-extrabold text-toss-text">배당 랭킹</h1>
        <p className="text-base text-toss-sub">수익률·안정성·성장성 기준으로 배당 종목을 분석해보세요.</p>
      </div>

      {/* 시장 탭 */}
      <div className="flex gap-2">
        {(["KR", "US"] as const).map((m) => (
          <button key={m} onClick={() => setMarket(m)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[14px] font-bold transition-all
              ${market === m
                ? "bg-toss-blue text-white"
                : "bg-toss-card text-toss-label border border-toss-border hover:border-toss-blue hover:text-toss-blue"
              }`}>
            {m === "KR" ? "🇰🇷 한국주식" : "🇺🇸 미국주식"}
          </button>
        ))}
      </div>

      {/* 정렬 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[12px] font-semibold text-toss-sub">정렬 기준</span>
        {([
          { key: "yield",     label: "📈 수익률 순",  desc: "배당수익률 높은 순" },
          { key: "stability", label: "🛡️ 안정형 우선", desc: "지속적 배당 종목 상단" },
          { key: "growth",    label: "🚀 성장형 우선", desc: "성장 + 배당 겸비 종목" },
        ] as { key: SortKey; label: string; desc: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setSortKey(key)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all border
              ${sortKey === key
                ? "bg-toss-blue text-white border-toss-blue"
                : "bg-toss-card text-toss-label border-toss-border hover:border-toss-blue hover:text-toss-blue"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 추천 섹션 */}
      {!loading && data.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* 안정형 추천 */}
          {stablePicks.length > 0 && (
            <div className="bg-toss-card rounded-2xl shadow-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <div>
                  <p className="text-[14px] font-extrabold text-toss-text">안정형 배당 추천</p>
                  <p className="text-[11px] text-toss-sub">배당 지속성이 높은 종목</p>
                </div>
              </div>
              {stablePicks.map((s) => (
                <div key={s.ticker} className="flex items-center gap-2 py-1.5 border-b border-toss-border last:border-0">
                  <StockLogo ticker={s.ticker.replace(/\.(KS|KQ)$/,"")} name={s.name} market={market} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-toss-text truncate">{s.name}</p>
                    <p className="text-[11px] text-toss-blue font-semibold">{(s.dividendYield*100).toFixed(2)}%</p>
                  </div>
                  <AddButton stock={s} market={market} />
                </div>
              ))}
            </div>
          )}
          {/* ETF 추천 */}
          {etfPicks.length > 0 && (
            <div className="bg-toss-card rounded-2xl shadow-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <div>
                  <p className="text-[14px] font-extrabold text-toss-text">ETF 중심 포트폴리오</p>
                  <p className="text-[11px] text-toss-sub">분산 투자로 리스크 최소화</p>
                </div>
              </div>
              {etfPicks.map((s) => (
                <div key={s.ticker} className="flex items-center gap-2 py-1.5 border-b border-toss-border last:border-0">
                  <StockLogo ticker={s.ticker.replace(/\.(KS|KQ)$/,"")} name={s.name} market={market} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-toss-text truncate">{s.name}</p>
                    <p className="text-[11px] text-purple-600 font-semibold">{(s.dividendYield*100).toFixed(2)}%</p>
                  </div>
                  <AddButton stock={s} market={market} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 데이터 소스 안내 */}
      <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
        <span className="text-blue-400 flex-shrink-0 text-base">ℹ️</span>
        <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>데이터 출처:</strong>{" "}
          {market === "KR"
            ? "Open DART(금융감독원 공시) + Yahoo Finance."
            : "Financial Modeling Prep(FMP) API."}
          {" "}배당수익률이 10% 이상인 종목은 주의 표시가 적용됩니다.
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
              <div className="hidden md:grid md:grid-cols-[40px_50px_1fr_110px_110px_80px] gap-3 px-2 pb-2 border-b border-toss-border mb-1">
                <span className="text-[11px] font-semibold text-toss-sub text-center">순위</span>
                <span />
                <span className="text-[11px] font-semibold text-toss-sub">종목명</span>
                <span className="text-[11px] font-semibold text-toss-sub text-right">현재가</span>
                <span className="text-[11px] font-semibold text-toss-sub text-right">배당수익률</span>
                <span />
              </div>

              {sorted.map((stock, i) => {
                const risk = getRiskLevel(stock.dividendYield);
                return (
                  <div key={stock.ticker}>
                    <div className="flex items-center gap-3 py-3.5 border-b border-toss-border last:border-0
                                   md:grid md:grid-cols-[40px_50px_1fr_110px_110px_80px]">
                      {/* 순위 */}
                      <div className="w-7 text-center flex-shrink-0 md:w-auto">
                        {i < 3
                          ? <span className="text-lg">{MEDAL[i]}</span>
                          : <span className="text-[14px] font-bold text-toss-sub">{i + 1}</span>
                        }
                      </div>
                      {/* 로고 */}
                      <StockLogo ticker={stock.ticker.replace(/\.(KS|KQ)$/,"")} name={stock.name} market={market} size={40} />
                      {/* 이름 + 티커 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[15px] font-bold text-toss-text truncate">{stock.name}</p>
                          {risk && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${risk.cls}`}>
                              {risk.label}
                            </span>
                          )}
                        </div>
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
                        ) : <p className="text-[13px] text-toss-sub">—</p>}
                        {stock.dps != null && (
                          <p className="text-[11px] text-toss-sub mt-0.5">
                            연 {market === "KR" ? `${stock.dps.toLocaleString("ko-KR")}원` : `$${stock.dps.toFixed(2)}`}
                          </p>
                        )}
                      </div>
                      {/* 배당수익률 */}
                      <div className="text-right flex-shrink-0 ml-auto md:ml-0">
                        <p className={`text-[16px] font-extrabold ${
                          stock.dividendYield >= 0.10 ? "text-red-500" :
                          stock.dividendYield >= 0.07 ? "text-orange-500" :
                          stock.dividendYield >= 0.04 ? "text-toss-blue" : "text-toss-text"
                        }`}>
                          {(stock.dividendYield * 100).toFixed(2)}%
                        </p>
                        {stock.price != null && (
                          <p className="text-[11px] text-toss-sub mt-0.5 md:hidden">
                            {market === "KR" ? `${stock.price.toLocaleString("ko-KR")}원` : `$${stock.price.toFixed(2)}`}
                          </p>
                        )}
                      </div>
                      {/* 추가 버튼 */}
                      <div className="hidden md:flex justify-end">
                        <AddButton stock={stock} market={market} />
                      </div>
                    </div>

                    {/* 위험 경고 (고위험 종목만) */}
                    {risk && i < 20 && (
                      <div className={`mx-2 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed ${risk.cls}`}>
                        {risk.msg}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ErrorBoundary>

      <p className="text-[12px] text-toss-sub text-center px-4">
        * 실시간 시장 데이터 기준. 투자 권유가 아닙니다. 높은 배당수익률이 반드시 좋은 투자를 의미하지 않습니다.
      </p>
    </div>
  );
}
