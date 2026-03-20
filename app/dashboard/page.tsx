"use client";

import { useEffect, useRef, useState } from "react";
import { getHoldings, addHolding, removeHolding, getGoal, saveGoal } from "@/lib/storage";
import { calcStackedMonthly, holdingsToDividendEvents } from "@/lib/calculator";
import { Holding, Market, DividendEvent } from "@/lib/types";
import { searchStocks, StockItem } from "@/lib/stocks";
import StockLogo from "@/components/StockLogo";
import DividendChart, { STOCK_COLORS } from "@/components/DividendChart";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SummaryCardSkeleton, ChartSkeleton, HoldingRowSkeleton } from "@/components/Skeleton";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

type ApiEntry = {
  dps: number;
  dividendYield?: number | null;
  exDate?: string | null;
  paymentDate?: string | null;
};

/* ── 종목 검색 인풋 (자동완성) ── */
function StockSearchInput({
  market,
  onSelect,
}: {
  market: Market;
  onSelect: (item: StockItem) => void;
}) {
  const [query,       setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState<StockItem[]>([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOut = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    setActiveIdx(-1);
    const hits = searchStocks(val, market);
    setSuggestions(hits);
    setShowDrop(hits.length > 0);
  }

  function handleSelect(item: StockItem) {
    setQuery(item.name);
    setSuggestions([]);
    setShowDrop(false);
    onSelect(item);
    setQuery(""); // 선택 후 초기화
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDrop) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    else if (e.key === "Escape") setShowDrop(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
        onKeyDown={handleKeyDown}
        placeholder={market === "KR" ? "종목명 검색 (예: 삼성전자, 카카오)" : "Search stock (e.g. Apple, JEPI)"}
        className="toss-input"
        autoComplete="off"
      />
      {showDrop && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-[calc(100%+6px)]
                       bg-toss-card border border-toss-border rounded-2xl
                       shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          {suggestions.map((item, i) => (
            <li key={`${item.ticker}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors
                            ${activeIdx === i ? "bg-blue-50" : "hover:bg-toss-bg"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StockLogo ticker={item.ticker} name={item.name} market={item.market} size={34} />
                  <span className="text-[14px] font-semibold text-toss-text truncate">{item.name}</span>
                </div>
                <span className="text-[12px] text-toss-sub font-medium ml-3 flex-shrink-0">{item.ticker}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function DashboardPage() {
  const [holdings,    setHoldings]    = useState<Holding[]>([]);
  const [apiData,     setApiData]     = useState<Record<string, ApiEntry>>({});
  const [initLoading, setInitLoading] = useState(true);
  const [apiLoading,  setApiLoading]  = useState(false);

  // 폼 상태
  const [showForm,    setShowForm]    = useState(false);
  const [selected,    setSelected]    = useState<StockItem | null>(null);
  const [formMarket,  setFormMarket]  = useState<Market>("KR");
  const [quantity,    setQuantity]    = useState("");
  const [buyDate,     setBuyDate]     = useState("");
  const [formError,   setFormError]   = useState("");

  // 목표 배당금
  const [goalAmount,  setGoalAmount]  = useState<number | null>(null);
  const [goalInput,   setGoalInput]   = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    const h = getHoldings();
    setHoldings(h);
    setGoalAmount(getGoal());
    if (h.length > 0) {
      fetchApiData(h).finally(() => setInitLoading(false));
    } else {
      setInitLoading(false);
    }
  }, []);

  async function fetchApiData(h: Holding[]) {
    setApiLoading(true);
    const results: Record<string, ApiEntry> = {};
    await Promise.allSettled(
      h.map(async (holding) => {
        const t = holding.market === "KR" ? `${holding.ticker}.KS` : holding.ticker.toUpperCase();
        try {
          const res  = await fetch(`/api/dividend?ticker=${encodeURIComponent(t)}`);
          const data = await res.json();
          if (!data.error && data.dps != null) {
            results[holding.ticker] = {
              dps:           data.dps,
              dividendYield: data.dividendYield ?? null,
              exDate:        data.exDate ?? null,
              paymentDate:   data.paymentDate ?? null,
            };
          }
        } catch { /* 개별 실패 무시 */ }
      })
    );
    setApiData(results);
    setApiLoading(false);
  }

  function openForm() {
    setShowForm(true);
    setSelected(null);
    setFormMarket("KR");
    setQuantity("");
    setBuyDate("");
    setFormError("");
  }

  function handleAdd() {
    setFormError("");
    if (!selected)                          return setFormError("종목을 검색해서 선택해 주세요.");
    if (!quantity || +quantity <= 0)        return setFormError("수량을 1주 이상 입력해 주세요.");

    addHolding({
      ticker:       selected.ticker,
      name:         selected.name,
      market:       formMarket,
      quantity:     +quantity,
      purchaseDate: buyDate || new Date().toISOString().split("T")[0],
    });
    const updated = getHoldings();
    setHoldings(updated);
    fetchApiData(updated);
    setShowForm(false);
    setSelected(null);
    setQuantity("");
    setBuyDate("");
  }

  function handleRemove(id: string) {
    removeHolding(id);
    const updated = getHoldings();
    setHoldings(updated);
    if (updated.length > 0) fetchApiData(updated);
    else setApiData({});
  }

  function handleGoalSave() {
    const v = parseFloat(goalInput.replace(/,/g, ""));
    if (!isNaN(v) && v > 0) { setGoalAmount(v); saveGoal(v); }
    setEditingGoal(false);
    setGoalInput("");
  }

  const events      = holdingsToDividendEvents(holdings, apiData);
  const { stackedData, tickers } = calcStackedMonthly(holdings, apiData);
  const annualNet   = stackedData.reduce((s, m) => s + m.total, 0);
  const nextEvent   = getNextEvent(events);
  const dday        = nextEvent ? getDday(nextEvent.paymentDate) : null;
  const avgYield    = calcAvgYield(holdings, apiData, events);
  const goalProgress = goalAmount && goalAmount > 0
    ? Math.min((annualNet / goalAmount) * 100, 100) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text">내 배당</h1>
        <p className="text-sm text-toss-sub">보유 종목 기반 연간 배당 수익을 한눈에 확인하세요.</p>
      </div>

      {/* 요약 카드 */}
      {initLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SummaryCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="보유 종목"       value={`${holdings.length}개`} />
          <SummaryCard label="연간 세후 배당"  value={`${Math.round(annualNet).toLocaleString("ko-KR")}원`} highlight />
          <SummaryCard label="평균 배당수익률" value={avgYield != null ? `${(avgYield * 100).toFixed(2)}%` : "-"} />
          <SummaryCard
            label="다음 배당 D-day"
            value={dday !== null ? (dday === 0 ? "오늘! 🎉" : `D-${dday}`) : "-"}
            highlight={dday !== null && dday <= 7}
          />
        </div>
      )}

      {/* 목표 배당금 */}
      {!initLoading && (
        <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-toss-text">연간 목표 배당금</p>
            <button
              onClick={() => { setEditingGoal(v => !v); setGoalInput(goalAmount ? Math.round(goalAmount).toString() : ""); }}
              className="text-[12px] font-semibold text-toss-blue bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
            >
              {goalAmount ? "수정" : "목표 설정"}
            </button>
          </div>

          {editingGoal && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="number" placeholder="연간 목표 금액 (원)"
                  value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGoalSave()}
                  className="toss-input pr-8 text-[13px]" />
                <span className="absolute inset-y-0 right-3 flex items-center text-[13px] text-toss-sub pointer-events-none">원</span>
              </div>
              <button onClick={handleGoalSave}
                className="px-4 py-2 bg-toss-blue text-white font-bold text-[13px] rounded-xl hover:bg-toss-blueDark transition-colors">
                저장
              </button>
            </div>
          )}

          {goalAmount ? (
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-toss-label font-medium">
                  달성: <span className="text-toss-blue font-bold">{Math.round(annualNet).toLocaleString("ko-KR")}원</span>
                </span>
                <span className="text-toss-sub">목표: {Math.round(goalAmount).toLocaleString("ko-KR")}원</span>
              </div>
              <div className="h-3 bg-toss-bg rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${goalProgress ?? 0}%`,
                    background: (goalProgress ?? 0) >= 100 ? "#22c55e"
                      : (goalProgress ?? 0) >= 60 ? "#3182F6" : "#f59e0b",
                  }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-toss-sub">
                  {(goalProgress ?? 0) >= 100 ? "🎉 목표 달성!"
                    : `남은 금액: ${Math.round(Math.max(goalAmount - annualNet, 0)).toLocaleString("ko-KR")}원`}
                </span>
                <span className={`text-[14px] font-extrabold ${
                  (goalProgress ?? 0) >= 100 ? "text-green-500"
                  : (goalProgress ?? 0) >= 60 ? "text-toss-blue" : "text-amber-500"}`}>
                  {(goalProgress ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 space-y-1">
              <p className="text-3xl">🎯</p>
              <p className="text-[13px] text-toss-sub">연간 목표 배당금을 설정하면 달성률을 확인할 수 있어요.</p>
            </div>
          )}
        </div>
      )}

      {/* 월별 차트 */}
      <ErrorBoundary>
        <div className="bg-toss-card rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-bold text-toss-text">월별 예상 배당금</p>
            {apiLoading && (
              <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                <span className="w-2 h-2 rounded-full bg-toss-blue animate-pulse" />
                업데이트 중
              </span>
            )}
          </div>
          {tickers.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {tickers.map((t, i) => (
                <span key={t} className="flex items-center gap-1.5 text-[12px] text-toss-label">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: STOCK_COLORS[i % STOCK_COLORS.length] }} />
                  {t}
                </span>
              ))}
            </div>
          )}
          {initLoading ? <ChartSkeleton />
            : holdings.length === 0 ? <EmptyChart />
            : <DividendChart data={[]} stackedData={stackedData} tickers={tickers} />}
        </div>
      </ErrorBoundary>

      {/* 보유 종목 */}
      <ErrorBoundary>
        <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-toss-text">보유 종목</p>
            {!showForm && (
              <button onClick={openForm}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-toss-blue
                           bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                종목 추가
              </button>
            )}
          </div>

          {/* 종목 추가 폼 */}
          {showForm && (
            <div className="bg-toss-bg rounded-2xl p-5 space-y-4 border border-toss-border">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-toss-text">종목 추가</p>
                <button onClick={() => setShowForm(false)}
                  className="p-1.5 rounded-lg hover:bg-toss-border transition-colors text-toss-sub">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 시장 선택 */}
              <div>
                <label className="block text-[12px] font-semibold text-toss-label mb-1.5">시장</label>
                <div className="flex gap-2">
                  {(["KR", "US"] as Market[]).map((m) => (
                    <button key={m}
                      onClick={() => { setFormMarket(m); setSelected(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold
                                  border transition-all
                                  ${formMarket === m
                                    ? "border-toss-blue bg-toss-blue text-white"
                                    : "border-toss-border text-toss-label bg-toss-card hover:border-toss-blue hover:text-toss-blue"}`}>
                      {m === "KR" ? "🇰🇷 한국" : "🇺🇸 미국"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 종목 검색 */}
              <div>
                <label className="block text-[12px] font-semibold text-toss-label mb-1.5">종목명</label>
                {selected ? (
                  <div className="flex items-center justify-between bg-toss-card border border-toss-blue
                                  rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <StockLogo ticker={selected.ticker} name={selected.name} market={formMarket} size={36} />
                      <div>
                        <p className="text-[14px] font-bold text-toss-text">{selected.name}</p>
                        <p className="text-[11px] text-toss-sub">{selected.ticker}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)}
                      className="text-[12px] text-toss-sub hover:text-toss-blue transition-colors font-medium">
                      변경
                    </button>
                  </div>
                ) : (
                  <StockSearchInput market={formMarket} onSelect={(item) => setSelected(item)} />
                )}
              </div>

              {/* 수량 + 매수일 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-toss-label mb-1.5">수량</label>
                  <div className="relative">
                    <input type="number" min={1} placeholder="0"
                      value={quantity} onChange={(e) => setQuantity(e.target.value)}
                      className="toss-input pr-8" />
                    <span className="absolute inset-y-0 right-3 flex items-center text-[13px] text-toss-sub pointer-events-none">주</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-toss-label mb-1.5">매수일 (선택)</label>
                  <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)}
                    className="toss-input" />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <span className="text-red-400 text-sm">⚠</span>
                  <p className="text-[13px] text-red-500 font-medium">{formError}</p>
                </div>
              )}

              <button onClick={handleAdd}
                className="w-full bg-toss-blue hover:bg-toss-blueDark text-white font-bold
                           text-[14px] py-3.5 rounded-2xl transition-colors">
                추가하기
              </button>
            </div>
          )}

          {/* 종목 리스트 */}
          {initLoading ? (
            <div>{Array.from({ length: 3 }).map((_, i) => <HoldingRowSkeleton key={i} />)}</div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-4xl">📭</p>
              <p className="text-[14px] font-semibold text-toss-text">등록된 종목이 없어요</p>
              <p className="text-[13px] text-toss-sub">종목을 추가하면 배당 수익을 계산해 드려요.</p>
            </div>
          ) : (
            <div className="divide-y divide-toss-border">
              {events.map((e, i) => {
                const color     = STOCK_COLORS[i % STOCK_COLORS.length];
                const isLive    = !!apiData[e.ticker];
                const ddayVal   = getDday(e.paymentDate);
                const yieldRate = apiData[e.ticker]?.dividendYield ?? null;
                return (
                  <div key={e.holdingId} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <StockLogo ticker={e.ticker} name={e.name} market={e.market} size={40} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[14px] font-bold text-toss-text truncate">{e.name}</p>
                          {isLive && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50
                                             px-1.5 py-0.5 rounded-full flex-shrink-0">실시간</span>
                          )}
                          {yieldRate != null && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              yieldRate >= 0.07 ? "bg-red-50 text-red-500"
                              : yieldRate >= 0.04 ? "bg-blue-50 text-toss-blue"
                              : "bg-toss-bg text-toss-label"}`}>
                              {(yieldRate * 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-toss-sub mt-0.5">
                          {e.quantity.toLocaleString()}주 · {e.market}
                          {ddayVal >= 0 && ddayVal <= 30 && (
                            <span className="ml-1.5 text-toss-blue font-semibold">· D-{ddayVal}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[14px] font-bold" style={{ color }}>
                          {e.market === "KR"
                            ? `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`
                            : `$${e.netAmount.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] text-toss-sub">세후 배당</p>
                      </div>
                      <button onClick={() => handleRemove(e.holdingId)}
                        className="p-2 rounded-xl hover:bg-red-50 text-toss-sub hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}

/* ── helpers ── */
function calcAvgYield(holdings: Holding[], apiData: Record<string, ApiEntry>, events: DividendEvent[]): number | null {
  const withYield = events.filter((e) => apiData[e.ticker]?.dividendYield != null);
  if (withYield.length === 0) return null;
  const totalNet = withYield.reduce((s, e) => s + e.netAmount, 0);
  if (totalNet === 0) return null;
  return withYield.reduce((s, e) => s + (apiData[e.ticker]!.dividendYield! * e.netAmount), 0) / totalNet;
}

function getNextEvent(events: DividendEvent[]): DividendEvent | null {
  const today = new Date();
  return events
    .map((e) => ({ ...e, _date: parseDate(e.paymentDate) }))
    .filter((e) => e._date && e._date >= today)
    .sort((a, b) => a._date!.getTime() - b._date!.getTime())[0] ?? null;
}

function parseDate(str: string): Date | null {
  const m = str.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function getDday(dateStr: string): number {
  const target = parseDate(dateStr);
  if (!target) return -1;
  return Math.ceil((target.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

/* ── sub components ── */
function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-toss-card rounded-2xl shadow-card p-4 space-y-1.5">
      <p className="text-[12px] text-toss-sub font-medium">{label}</p>
      <p className={`text-[16px] font-extrabold leading-tight ${highlight ? "text-toss-blue" : "text-toss-text"}`}>{value}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-toss-sub space-y-2">
      <span className="text-4xl">📊</span>
      <p className="text-[14px]">종목을 추가하면 배당 차트가 표시돼요.</p>
    </div>
  );
}
