"use client";

import { useEffect, useRef, useState } from "react";
import { getHoldings, addHolding, removeHolding, getGoal, saveGoal } from "@/lib/storage";
import { calcStackedMonthly, holdingsToDividendEvents } from "@/lib/calculator";
import { Holding, Market, DividendEvent } from "@/lib/types";
import { searchStocks, StockItem } from "@/lib/stocks";
import StockLogo from "@/components/StockLogo";
import DividendChart, { STOCK_COLORS, ChartPeriod } from "@/components/DividendChart";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SummaryCardSkeleton, ChartSkeleton, HoldingRowSkeleton } from "@/components/Skeleton";
import Toast from "@/components/Toast";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as ReTooltip,
} from "recharts";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

type ApiEntry = {
  dps: number;
  dividendYield?: number | null;
  exDate?: string | null;
  paymentDate?: string | null;
  payMonths?: number[];
  dividendFrequency?: string;
};

/* ── 종목 검색 인풋 (자동완성 + Yahoo Finance API 병합) ── */
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
  const [searching,   setSearching]   = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const local = searchStocks(val, market);
    setSuggestions(local);
    setShowDrop(local.length > 0 || val.trim().length > 0);

    if (searchRef.current) clearTimeout(searchRef.current);
    if (!val.trim()) { setSearching(false); return; }

    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}&market=${market}`);
        const data = await res.json();
        const api: StockItem[] = (data.results ?? []).map((r: any) => ({
          ticker: r.ticker, name: r.name, market,
        }));
        setSuggestions((prev) => {
          const seen = new Set(prev.map((s) => s.ticker));
          const merged = [...prev, ...api.filter((a) => !seen.has(a.ticker))];
          return merged.slice(0, 20);
        });
        setShowDrop(true);
      } catch { /* 무시 */ } finally {
        setSearching(false);
      }
    }, 400);
  }

  function handleSelect(item: StockItem) {
    setSuggestions([]);
    setShowDrop(false);
    onSelect(item);
    setQuery("");
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
        placeholder={market === "KR" ? "종목명, 코드, 초성으로 검색" : "종목명 또는 티커로 검색 (예: Apple, JEPI)"}
        className="toss-input"
        autoComplete="off"
      />
      {showDrop && (suggestions.length > 0 || searching) && (
        <ul className="absolute z-50 left-0 right-0 top-[calc(100%+6px)]
                       bg-toss-card border border-toss-border rounded-2xl
                       shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden max-h-72 overflow-y-auto">
          {searching && suggestions.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-toss-sub flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
              검색 중...
            </li>
          )}
          {suggestions.map((item, i) => (
            <li key={`${item.ticker}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors
                            ${activeIdx === i ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-toss-bg"}`}
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

  // 종목 필터
  const [filterMarket, setFilterMarket] = useState<"ALL" | "KR" | "US">("ALL");

  // 차트 기간 필터 (N12M = 향후 12개월, THIS_YEAR = 올해)
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("N12M");

  // 보유 종목 뷰 모드
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");

  // 토스트
  const [showToast, setShowToast] = useState(false);

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
              dps:               data.dps,
              dividendYield:     data.dividendYield ?? null,
              exDate:            data.exDate ?? null,
              paymentDate:       data.paymentDate ?? null,
              payMonths:         data.payMonths ?? undefined,
              dividendFrequency: data.dividendFrequency ?? undefined,
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
    setShowToast(true);
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

  // 샘플 포트폴리오 (삼성전자 100주, SCHD 50주, 리얼티인컴 20주)
  function handleSamplePortfolio() {
    const today = new Date().toISOString().split("T")[0];
    const samples = [
      { ticker: "005930", name: "삼성전자",  market: "KR" as Market, quantity: 100, purchaseDate: today },
      { ticker: "SCHD",   name: "SCHD",      market: "US" as Market, quantity: 50,  purchaseDate: today },
      { ticker: "O",      name: "리얼티인컴", market: "US" as Market, quantity: 20,  purchaseDate: today },
    ];
    samples.forEach(s => addHolding(s));
    const updated = getHoldings();
    setHoldings(updated);
    fetchApiData(updated);
  }

  function handleGoalSave() {
    const v = parseFloat(goalInput.replace(/,/g, ""));
    if (!isNaN(v) && v > 0) { setGoalAmount(v); saveGoal(v); }
    setEditingGoal(false);
    setGoalInput("");
  }

  const events      = holdingsToDividendEvents(holdings, apiData);
  const { stackedData, tickers } = calcStackedMonthly(holdings, apiData);
  // N12M: 향후 12개월 합계 (전체), THIS_YEAR: 이번 연도 남은 월 합계
  const currentMonthIdx = new Date().getMonth(); // 0-indexed (March=2)
  const annualNet = chartPeriod === "THIS_YEAR"
    ? stackedData.slice(currentMonthIdx).reduce((s, m) => s + m.total, 0)
    : stackedData.reduce((s, m) => s + m.total, 0); // N12M & LAST_YEAR = full year
  const nextPayment = getNextSmartPayment(events, apiData);
  const nextEvent   = nextPayment?.event ?? null;
  const dday        = nextPayment ? getDdayFromDate(nextPayment.date) : null;
  const avgYield    = calcAvgYield(holdings, apiData, events);
  const goalProgress = goalAmount && goalAmount > 0
    ? Math.min((annualNet / goalAmount) * 100, 100) : null;
  const fullYearNet = stackedData.reduce((s, m) => s + m.total, 0);

  // 이번 달 vs 지난달 비교
  const thisMonthTotal = stackedData[currentMonthIdx]?.total ?? 0;
  const prevMonthIdx   = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
  const prevMonthTotal = stackedData[prevMonthIdx]?.total ?? 0;
  const monthDiff      = thisMonthTotal - prevMonthTotal;
  const monthDiffPct   = prevMonthTotal > 0
    ? Math.round((monthDiff / prevMonthTotal) * 100)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-extrabold text-toss-text">내 배당</h1>
          <p className="text-base text-toss-sub">보유 종목 기반 연간 배당 수익을 한눈에 확인하세요.</p>
        </div>
        {/* 글로벌 종목 추가 CTA */}
        {!showForm && (
          <button
            onClick={openForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-toss-blue hover:bg-toss-blueDark
                       active:scale-[0.97] text-white font-bold text-[14px] transition-all flex-shrink-0 shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            종목 추가
          </button>
        )}
      </div>

      {/* 요약 카드 */}
      {initLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SummaryCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 연간 세후 배당 — 주인공 카드 (col-span-2) */}
          <SummaryCard
            label={
              chartPeriod === "N12M" ? "향후 12개월 세후 배당"
              : chartPeriod === "THIS_YEAR" ? `${new Date().getFullYear()}년 기준 세후 배당`
              : "최근 1년 세후 배당"
            }
            value={`${Math.round(annualNet).toLocaleString("ko-KR")}원`}
            hero
            tooltip={`DPS × 수량 × (1-세율)\n연간 합계: ${Math.round(fullYearNet).toLocaleString("ko-KR")}원`}
          />
          <SummaryCard
            label="보유 종목"
            value={`${holdings.length}개`}
            tooltip={`총 ${holdings.length}개 종목 보유 중`}
          />
          <SummaryCard
            label="평균 배당수익률"
            value={avgYield != null ? `${(avgYield * 100).toFixed(2)}%` : "-"}
            tooltip={avgYield != null ? `배당수익률 = 연간 배당금 / 현재가\n포트폴리오 가중평균` : "데이터 로딩 중"}
          />
          <SummaryCard
            label="다음 배당 D-day"
            value={dday !== null ? (dday === 0 ? "오늘! 🎉" : `D-${dday}`) : "-"}
            highlight={dday !== null && dday <= 7}
            large={dday !== null && dday > 7}
            tooltip={nextPayment ? `${nextPayment.event.name} 배당 예정: ${nextPayment.date.getFullYear()}.${String(nextPayment.date.getMonth() + 1).padStart(2, "0")}월경` : "예정 배당 없음"}
          />
        </div>
      )}

      {/* PC: 12컬럼 비대칭 그리드 (8:4) */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
        {/* 왼쪽 col-span-8: 목표 배당금 + 차트 */}
        <div className="lg:col-span-8 space-y-5">

      {/* 목표 배당금 */}
      {!initLoading && (
        <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-toss-text">연간 목표 배당금</p>
            <button
              onClick={() => { setEditingGoal(v => !v); setGoalInput(goalAmount ? Math.round(goalAmount).toString() : ""); }}
              className="text-[12px] font-semibold text-toss-blue bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              {goalAmount ? "수정" : "목표 설정"}
            </button>
          </div>

          {editingGoal && (
            <div className="flex items-center gap-2">
              <input type="number" placeholder="목표 금액 입력"
                value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGoalSave()}
                className="toss-input flex-1 min-w-0 text-[13px]" />
              <span className="text-[14px] text-toss-sub font-medium flex-shrink-0 select-none">원</span>
              <button onClick={handleGoalSave}
                className="flex-shrink-0 px-4 py-2 bg-toss-blue text-white font-bold text-[13px] rounded-xl hover:bg-toss-blueDark transition-colors">
                저장
              </button>
            </div>
          )}

          {goalAmount ? (
            <div className="space-y-3">
              {/* 달성/목표 금액 한 줄 표시 */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[12px] text-toss-sub mb-0.5">현재 달성</p>
                  <p className="text-[22px] font-extrabold text-toss-blue leading-tight">
                    {Math.round(annualNet).toLocaleString("ko-KR")}
                    <span className="text-[14px] font-bold ml-0.5">원</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-toss-sub mb-0.5">목표</p>
                  <p className="text-[16px] font-bold text-toss-text">
                    {Math.round(goalAmount).toLocaleString("ko-KR")}
                    <span className="text-[12px] font-semibold ml-0.5">원</span>
                  </p>
                </div>
              </div>
              {/* 프로그레스 바 */}
              <div className="space-y-1.5">
                <div className="h-3 bg-toss-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${goalProgress ?? 0}%`,
                      background: (goalProgress ?? 0) >= 100 ? "#22c55e"
                        : (goalProgress ?? 0) >= 60 ? "#3182F6" : "#f59e0b",
                    }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-toss-sub">
                    {(goalProgress ?? 0) >= 100 ? "🎉 목표 달성!"
                      : `남은 금액 ${Math.round(Math.max(goalAmount - annualNet, 0)).toLocaleString("ko-KR")}원`}
                  </span>
                  <span className={`text-[15px] font-extrabold ${
                    (goalProgress ?? 0) >= 100 ? "text-green-500"
                    : (goalProgress ?? 0) >= 60 ? "text-toss-blue" : "text-amber-500"}`}>
                    {(goalProgress ?? 0).toFixed(1)}%
                  </span>
                </div>
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
            : holdings.length === 0 ? <EmptyChart onSample={handleSamplePortfolio} />
            : <DividendChart data={[]} stackedData={stackedData} tickers={tickers}
                period={chartPeriod} onPeriodChange={setChartPeriod} />}

          {/* 이번 달 vs 지난달 비교 */}
          {!initLoading && holdings.length > 0 && (
            <div className="mt-4 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                <span>이번 달</span>
                <span className="font-bold text-toss-text">
                  {Math.round(thisMonthTotal).toLocaleString("ko-KR")}원
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px]">
                {monthDiffPct !== null ? (
                  <span className={`font-bold ${monthDiff >= 0 ? "text-toss-blue" : "text-red-500"}`}>
                    {monthDiff >= 0 ? "▲" : "▼"} {Math.abs(monthDiffPct)}%
                  </span>
                ) : null}
                <span className="text-toss-sub">vs 지난달</span>
                <span className="font-semibold text-toss-label">
                  {Math.round(prevMonthTotal).toLocaleString("ko-KR")}원
                </span>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>

        </div>{/* end lg 왼쪽 */}

        {/* 오른쪽 col-span-4: 보유 종목 (sticky) */}
      <ErrorBoundary>
        <div className="lg:col-span-4 lg:sticky lg:top-24 bg-toss-card rounded-2xl shadow-card p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-bold text-toss-text">
                보유 종목
                {filterMarket !== "ALL" && (
                  <span className="ml-2 text-[12px] font-semibold text-toss-blue">
                    {filterMarket === "KR" ? "한국주식" : "미국주식"}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                {/* 뷰 모드 토글 */}
                {holdings.length > 0 && !showForm && (
                  <div className="flex bg-toss-bg rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode("card")}
                      title="카드 뷰"
                      className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-toss-card shadow-sm text-toss-text" : "text-toss-sub hover:text-toss-label"}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode("compact")}
                      title="컴팩트 뷰"
                      className={`p-1.5 rounded-md transition-colors ${viewMode === "compact" ? "bg-toss-card shadow-sm text-toss-text" : "text-toss-sub hover:text-toss-label"}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                )}
                {!showForm && (
                  <button onClick={openForm}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-toss-blue
                               bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    종목 추가
                  </button>
                )}
              </div>
            </div>
            {/* 필터 탭 */}
            {events.length > 0 && (
              <div className="flex gap-1.5">
                {(["ALL", "KR", "US"] as const).map((f) => (
                  <button key={f}
                    onClick={() => setFilterMarket(f)}
                    className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all
                      ${filterMarket === f
                        ? "bg-toss-blue text-white"
                        : "bg-toss-bg text-toss-sub hover:text-toss-text"}`}>
                    {f === "ALL" ? "전체" : f === "KR" ? "한국" : "미국"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 종목 추가 폼 */}
          {showForm && (
            <div className="bg-toss-card rounded-2xl p-5 space-y-4 border-2 border-toss-blue/30 shadow-card">
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
                <label className="block text-[13px] font-semibold text-toss-label mb-1.5">시장</label>
                <div className="flex gap-2">
                  {(["KR", "US"] as Market[]).map((m) => (
                    <button key={m}
                      onClick={() => { setFormMarket(m); setSelected(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold
                                  border transition-all
                                  ${formMarket === m
                                    ? "border-toss-blue bg-toss-blue text-white"
                                    : "border-toss-border text-toss-label bg-toss-card hover:border-toss-blue hover:text-toss-blue"}`}>
                      {m === "KR" ? "한국주식" : "미국주식"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 종목 검색 */}
              <div>
                <label className="block text-[13px] font-semibold text-toss-label mb-1.5">종목명</label>
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
                  <label className="block text-[13px] font-semibold text-toss-label mb-1.5">수량</label>
                  <div className="relative">
                    <input type="number" min={1} placeholder="0"
                      value={quantity} onChange={(e) => setQuantity(e.target.value)}
                      className="toss-input pr-12" />
                    <span className="absolute inset-y-0 right-4 flex items-center text-[14px] text-toss-sub font-medium pointer-events-none select-none">주</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-toss-label mb-1.5">매수일 (선택)</label>
                  <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)}
                    className="toss-input" />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
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

          {/* 저장 안내 배너 */}
          {!initLoading && holdings.length > 0 && (
            <div className="bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5">
              <p className="text-[12px] text-toss-text font-medium leading-snug [word-break:keep-all]">
                💡 현재 기기(브라우저)에 안전하게 자동 저장됩니다.
              </p>
              <p className="text-[11px] text-toss-sub mt-0.5 [word-break:keep-all]">
                캐시 삭제 시 데이터가 초기화될 수 있습니다.
              </p>
            </div>
          )}

          {/* 종목 리스트 */}
          {initLoading ? (
            <div className="overflow-y-auto max-h-[700px]">{Array.from({ length: 3 }).map((_, i) => <HoldingRowSkeleton key={i} />)}</div>
          ) : holdings.length === 0 ? (
            <PopularStocksWidget onSelect={(item) => {
              setFormMarket(item.market as Market);
              setSelected(item);
              setShowForm(true);
            }} />
          ) : viewMode === "compact" ? (
            /* ── 컴팩트 리스트 뷰 ── */
            <div className="divide-y divide-toss-border overflow-y-auto max-h-[700px]">
              {/* 헤더 */}
              <div className="grid grid-cols-[1fr_56px_76px_28px] gap-1.5 pb-1.5 text-[10px] font-semibold text-toss-sub uppercase tracking-wide">
                <span>종목</span>
                <span className="text-right">수익률</span>
                <span className="text-right">세후 배당</span>
                <span />
              </div>
              {events.filter(e => filterMarket === "ALL" || e.market === filterMarket).map((e, i) => {
                const color     = STOCK_COLORS[i % STOCK_COLORS.length];
                const yieldRate = apiData[e.ticker]?.dividendYield ?? null;
                return (
                  <div key={e.holdingId} className="grid grid-cols-[1fr_56px_76px_28px] gap-1.5 items-center py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* 차트 매핑 컬러 도트 */}
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-toss-text truncate">{e.name}</p>
                        <p className="text-[10px] text-toss-sub">{e.quantity.toLocaleString()}주</p>
                      </div>
                    </div>
                    <p className={`text-[12px] font-bold text-right ${
                      yieldRate == null ? "text-toss-sub"
                      : yieldRate >= 0.07 ? "text-red-500"
                      : yieldRate >= 0.04 ? "text-toss-blue" : "text-toss-text"}`}>
                      {yieldRate != null ? `${(yieldRate * 100).toFixed(1)}%` : "—"}
                    </p>
                    <p className="text-[12px] font-bold text-right text-toss-text">
                      {e.market === "KR"
                        ? `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`
                        : `$${e.netAmount.toFixed(2)}`}
                    </p>
                    <button onClick={() => handleRemove(e.holdingId)}
                      className="p-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-toss-sub hover:text-red-400 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── 카드 뷰 (기본) ── */
            <div className="divide-y divide-toss-border overflow-y-auto max-h-[700px]">
              {events.filter(e => filterMarket === "ALL" || e.market === filterMarket).map((e, i) => {
                const color     = STOCK_COLORS[i % STOCK_COLORS.length];
                const isLive    = !!apiData[e.ticker];
                const ddayVal   = getDday(e.paymentDate);
                const yieldRate = apiData[e.ticker]?.dividendYield ?? null;
                return (
                  <div key={e.holdingId} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StockLogo ticker={e.ticker} name={e.name} market={e.market} size={38} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* 차트 매핑 컬러 도트 */}
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <p className="text-[14px] font-bold text-toss-text truncate">{e.name}</p>
                          {isLive && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20
                                             px-1.5 py-0.5 rounded-full flex-shrink-0">실시간</span>
                          )}
                          {yieldRate != null && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              yieldRate >= 0.07 ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                              : yieldRate >= 0.04 ? "bg-blue-50 dark:bg-blue-900/20 text-toss-blue"
                              : "bg-toss-bg text-toss-label"}`}>
                              {(yieldRate * 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-toss-sub mt-0.5">
                          {e.quantity.toLocaleString()}주 · {e.market}
                          {apiData[e.ticker]?.dividendFrequency && (
                            <span className="ml-1 text-[11px] bg-toss-bg px-1.5 py-0.5 rounded-full">
                              {apiData[e.ticker]!.dividendFrequency === "monthly" ? "월배당" :
                               apiData[e.ticker]!.dividendFrequency === "quarterly" ? "분기배당" :
                               apiData[e.ticker]!.dividendFrequency === "semi-annual" ? "반기배당" : "연배당"}
                            </span>
                          )}
                          {ddayVal >= 0 && ddayVal <= 30 && (
                            <span className="ml-1.5 text-toss-blue font-semibold">· D-{ddayVal}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[14px] font-bold text-toss-text">
                          {e.market === "KR"
                            ? `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`
                            : `$${e.netAmount.toFixed(2)}`}
                        </p>
                        <p className="text-[12px] text-toss-sub">세후 배당</p>
                      </div>
                      <button onClick={() => handleRemove(e.holdingId)}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-toss-sub hover:text-red-400 transition-colors">
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

      </div>{/* end PC 2열 */}

      {/* 또래 평균 비교 인사이트 */}
      {!initLoading && holdings.length > 0 && (
        <PeerInsight
          annualNet={annualNet}
          avgYield={avgYield}
          stockCount={holdings.length}
        />
      )}

      {/* ── 포트폴리오 인사이트 ── */}
      {holdings.length > 0 && (() => {
        const krCount   = holdings.filter(h => h.market === "KR").length;
        const usCount   = holdings.filter(h => h.market === "US").length;
        const total     = holdings.length;
        const krPct     = Math.round((krCount / total) * 100);
        const usPct     = 100 - krPct;

        // 종목 집중도 체크 (단일 종목 > 30%)
        const tickerCounts: Record<string, number> = {};
        holdings.forEach(h => { tickerCounts[h.ticker] = (tickerCounts[h.ticker] ?? 0) + 1; });
        const maxConc = Math.max(...Object.values(tickerCounts));
        const concPct = Math.round((maxConc / total) * 100);

        return (
          <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-toss-text">포트폴리오 인사이트</h3>
              <span className="text-xl">🔍</span>
            </div>

            {/* 국가 비중 */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-toss-sub">국가 비중</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-toss-bg overflow-hidden">
                  <div className="h-full rounded-full bg-toss-blue transition-all duration-500"
                    style={{ width: `${krPct}%` }} />
                </div>
                <div className="flex gap-3 text-[12px] font-bold flex-shrink-0">
                  <span className="text-toss-blue">🇰🇷 {krPct}%</span>
                  <span className="text-green-600">🇺🇸 {usPct}%</span>
                </div>
              </div>
              {krPct > 80 && (
                <p className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg">
                  💡 한국 비중이 높아요. 미국 ETF(JEPI, SCHD)로 분산을 고려해보세요.
                </p>
              )}
            </div>

            {/* 집중도 경고 */}
            {concPct >= 30 && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <span className="text-orange-400 flex-shrink-0">⚠️</span>
                <p className="text-[12px] text-orange-600">
                  특정 종목 집중도가 {concPct}%예요. 배당 리스크 분산을 위해 여러 종목에 나눠 투자를 권장해요.
                </p>
              </div>
            )}

            {/* 추천 행동 */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-toss-sub">다음 액션 추천</p>
              <div className="space-y-2">
                {total < 5 && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <span className="text-blue-500 text-base flex-shrink-0">📌</span>
                    <p className="text-[12px] text-blue-700 dark:text-blue-300 flex-1">
                      종목이 {total}개예요. 5개 이상으로 늘려 배당 안정성을 높여보세요.
                    </p>
                    <a href="/ranking"
                      className="flex-shrink-0 text-[11px] font-bold text-toss-blue border border-toss-blue px-2 py-1 rounded-lg hover:bg-toss-blue hover:text-white transition-colors">
                      랭킹 보기
                    </a>
                  </div>
                )}
                {usCount === 0 && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                    <span className="text-green-500 text-base flex-shrink-0">🇺🇸</span>
                    <p className="text-[12px] text-green-700 dark:text-green-300 flex-1">
                      미국 ETF 추가로 월배당 포트폴리오를 만들어 보세요.
                    </p>
                    <a href="/ranking"
                      className="flex-shrink-0 text-[11px] font-bold text-green-600 border border-green-400 px-2 py-1 rounded-lg hover:bg-green-500 hover:text-white transition-colors">
                      ETF 보기
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <Toast
        visible={showToast}
        message="종목이 추가되었습니다."
        sub="현재 기기에 임시 보관됨"
        onClose={() => setShowToast(false)}
      />
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

/**
 * payMonths 기반으로 다음 배당 지급일을 계산.
 * API paymentDate는 과거 기준 날짜인 경우가 많으므로 payMonths를 우선 사용.
 */
function getNextSmartPayment(
  events: DividendEvent[],
  apiData: Record<string, ApiEntry>
): { event: DividendEvent; date: Date } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear  = today.getFullYear();
  const thisMonth = today.getMonth() + 1; // 1-indexed

  let best: { event: DividendEvent; date: Date } | null = null;

  for (const e of events) {
    const payMonths = apiData[e.ticker]?.payMonths;

    if (payMonths && payMonths.length > 0) {
      // 이번 달 이후 가장 빠른 지급 월 탐색
      let nextMonth = payMonths.find(m => m >= thisMonth) ?? null;
      let nextYear  = thisYear;
      if (!nextMonth) {
        // 올해 지급 월이 모두 지났으면 내년 첫 번째 달
        nextMonth = payMonths[0];
        nextYear  = thisYear + 1;
      }
      // 지급일 미상 → 해당 월 15일로 근사
      const candidate = new Date(nextYear, nextMonth - 1, 15);
      if (!best || candidate < best.date) {
        best = { event: e, date: candidate };
      }
    } else {
      // payMonths 없으면 API paymentDate 사용 (fallback)
      const d = parseDate(e.paymentDate);
      if (d && d >= today && (!best || d < best.date)) {
        best = { event: e, date: d };
      }
    }
  }
  return best;
}

function getDdayFromDate(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
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
function SummaryCard({ label, value, highlight, hero, large, tooltip }: {
  label: string; value: string; highlight?: boolean; hero?: boolean; large?: boolean; tooltip?: string;
}) {
  return (
    <div className={`relative bg-toss-card rounded-xl shadow-card group cursor-default flex flex-col justify-between
      ${hero
        ? "p-4 border border-toss-blue/20 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-900/10 dark:to-toss-card"
        : "p-3.5"}`}>
      <p className={`font-medium leading-tight ${hero ? "text-[11px] text-toss-blue" : "text-[11px] text-toss-sub"}`}>
        {label}
      </p>
      <p className={`font-extrabold leading-tight mt-1 ${
        hero ? "text-[20px] text-toss-blue" :
        highlight ? "text-[22px] text-toss-blue" :
        large ? "text-[22px] text-toss-text" : "text-[15px] text-toss-text"}`}>
        {value}
      </p>
      {tooltip && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                        w-56 px-3 py-2.5 rounded-xl bg-[#191F28] text-white text-[11px] leading-relaxed text-center
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-pre-line shadow-lg">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#191F28]" />
        </div>
      )}
    </div>
  );
}

function EmptyChart({ onSample }: { onSample?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-toss-sub space-y-4 py-10">
      <span className="text-5xl">📊</span>
      <div className="text-center space-y-1">
        <p className="text-[16px] font-extrabold text-toss-text">아직 구성된 배당 포트폴리오가 없습니다.</p>
        <p className="text-[13px] text-toss-sub">오른쪽에서 종목을 추가하면 월별 배당 차트가 표시돼요</p>
      </div>
      {onSample && (
        <button
          onClick={onSample}
          className="px-5 py-2.5 text-[13px] font-bold text-toss-blue bg-blue-50 dark:bg-blue-900/20
                     rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          샘플 포트폴리오 한 번에 적용해 보기
        </button>
      )}
    </div>
  );
}

/* ── 인기 배당주 추천 위젯 (Empty State 대체) ── */
const POPULAR_STOCKS: StockItem[] = [
  { ticker: "005930", name: "삼성전자",         market: "KR", exchange: "KS" },
  { ticker: "088980", name: "맥쿼리인프라",     market: "KR", exchange: "KS" },
  { ticker: "SCHD",   name: "SCHD (미국 고배당 ETF)", market: "US" },
  { ticker: "O",      name: "리얼티인컴 (월배당)",    market: "US" },
];

function PopularStocksWidget({ onSelect }: { onSelect: (item: StockItem) => void }) {
  return (
    <div className="space-y-3 py-2">
      <div className="text-center space-y-0.5">
        <p className="text-[13px] font-bold text-toss-text">🔥 인기 배당주로 시작하기</p>
        <p className="text-[11px] text-toss-sub">많은 분들이 이 종목으로 시작해요</p>
      </div>
      <div className="space-y-2">
        {POPULAR_STOCKS.map((stock) => (
          <div
            key={stock.ticker}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-toss-bg hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <StockLogo ticker={stock.ticker} name={stock.name} market={stock.market} size={32} />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-toss-text truncate">{stock.name}</p>
                <p className="text-[11px] text-toss-sub">{stock.ticker} · {stock.market === "KR" ? "한국" : "미국"}</p>
              </div>
            </div>
            <button
              onClick={() => onSelect(stock)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-toss-blue text-white
                         text-[12px] font-bold hover:bg-toss-blueDark transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 또래 평균 비교 인사이트 ── */
// 30대 배당 투자자 mock 평균 데이터
const PEER_MOCK = {
  yield:  3.8,   // 평균 배당수익률 %
  annual: 840000, // 연간 배당금 (원)
  stocks: 4,     // 평균 보유 종목 수
};

function scorify(value: number, peer: number, max: number): number {
  // 0~100 점수로 정규화. peer가 기준(60점)
  const ratio = value / peer;
  return Math.min(Math.round(ratio * 60), 100);
}

function PeerInsight({
  annualNet,
  avgYield,
  stockCount,
}: {
  annualNet:  number;
  avgYield:   number | null;
  stockCount: number;
}) {
  const yieldPct  = avgYield != null ? avgYield * 100 : 0;
  const myScores  = {
    yield:  scorify(yieldPct,    PEER_MOCK.yield,   10),
    annual: scorify(annualNet,   PEER_MOCK.annual,  5_000_000),
    stocks: scorify(stockCount,  PEER_MOCK.stocks,  10),
  };

  const radarData = [
    { subject: "배당수익률",  me: myScores.yield,  peer: 60 },
    { subject: "연간배당금",  me: myScores.annual, peer: 60 },
    { subject: "종목 분산",   me: myScores.stocks, peer: 60 },
  ];

  // 부족한 항목 → 팁 생성 (데이터 기반 동적 액션 아이템)
  const tips: { icon: string; label: string; text: string }[] = [];
  if (myScores.yield < 50) {
    const diff = PEER_MOCK.yield - yieldPct;
    const actionText = diff >= 2
      ? `또래 대비 배당수익률이 ${diff.toFixed(1)}%p 낮습니다. 리얼티인컴(O), SCHD, JEPI 같은 고배당 ETF 비중 확대를 고려해 보세요. 현재 포트폴리오에 월배당 ETF를 10~20% 편입하면 즉각적인 현금흐름 개선 효과가 있습니다.`
      : `현재 수익률(${yieldPct.toFixed(1)}%)이 또래 평균(${PEER_MOCK.yield}%)보다 낮아요. SCHD·JEPI 등 고배당 ETF를 일부 편입하거나, 보유 종목의 배당 재투자(DRIP)를 활성화하면 수익률을 높일 수 있어요.`;
    tips.push({ icon: "📈", label: "배당수익률", text: actionText });
  }
  if (myScores.annual < 50) {
    const shortfall = PEER_MOCK.annual - annualNet;
    tips.push({ icon: "💰", label: "연간 배당금", text: `또래 평균(${(PEER_MOCK.annual / 10000).toFixed(0)}만원)까지 약 ${(shortfall / 10000).toFixed(0)}만원이 부족해요. 배당수익률 4% 기준으로 약 ${Math.round(shortfall / 0.04 / 10000)}만원 추가 투자 시 목표에 도달할 수 있습니다. 꾸준한 적립식 매수를 권장합니다.` });
  }
  if (myScores.stocks < 50)
    tips.push({ icon: "🗂️", label: "종목 분산", text: `보유 종목(${stockCount}개)이 또래 평균(${PEER_MOCK.stocks}개)보다 적어요. 금융·에너지·통신·리츠 등 섹터별로 1종목씩 추가하면 배당 안정성과 지급 빈도가 높아집니다.` });
  if (tips.length === 0)
    tips.push({ icon: "🎉", label: "잘 하고 있어요!", text: "배당수익률·연간 배당금·종목 분산 모두 또래 평균을 웃돌고 있어요. 이 페이스를 유지하며 배당 재투자(DRIP)로 복리 효과를 극대화해 보세요!" });

  return (
    <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🔍</span>
        <div>
          <p className="text-[14px] font-bold text-toss-text">또래 배당러 비교 인사이트</p>
          <p className="text-[12px] text-toss-sub">30대 배당 투자자 평균 데이터와 나를 비교해요 (Mock)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr] gap-6 items-center">
        {/* 레이더 차트 */}
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--toss-border)" />
              <PolarAngleAxis dataKey="subject"
                tick={{ fontSize: 12, fill: "var(--toss-sub)", fontWeight: 600 }} />
              <Radar name="또래 평균" dataKey="peer"
                stroke="#E5E8EB" fill="#E5E8EB" fillOpacity={0.4} strokeWidth={1.5} />
              <Radar name="나" dataKey="me"
                stroke="#3182F6" fill="#3182F6" fillOpacity={0.25} strokeWidth={2} />
              <ReTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const subject = (payload[0]?.payload as any)?.subject ?? "";
                  const me   = payload.find((p: any) => p.name === "나")?.value ?? 0;
                  const peer = payload.find((p: any) => p.name === "또래 평균")?.value ?? 0;
                  return (
                    <div className="bg-toss-card rounded-xl shadow-card border border-toss-border px-3 py-2 text-[12px]">
                      <p className="font-bold text-toss-text mb-1">{subject}</p>
                      <p className="text-toss-blue font-semibold">나: {me}점</p>
                      <p className="text-toss-sub">평균: {peer}점</p>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 팁 카드 */}
        <div className="space-y-3">
          <p className="text-[12px] font-bold text-toss-sub uppercase tracking-wider">이런 점을 보완하면 좋아요</p>
          {tips.map((tip) => (
            <div key={tip.label}
              className="flex gap-3 p-3.5 rounded-xl bg-toss-bg border border-toss-border">
              <span className="text-xl flex-shrink-0 mt-0.5">{tip.icon}</span>
              <div>
                <p className="text-[13px] font-bold text-toss-text mb-0.5">{tip.label}</p>
                <p className="text-[12px] text-toss-sub leading-relaxed">{tip.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 비교 바 */}
      <div className="space-y-3 pt-1 border-t border-toss-border">
        {[
          { label: "배당수익률", my: `${yieldPct.toFixed(1)}%`, peer: `${PEER_MOCK.yield}%`, score: myScores.yield },
          { label: "연간 배당금", my: `${Math.round(annualNet / 10000)}만원`, peer: `${PEER_MOCK.annual / 10000}만원`, score: myScores.annual },
          { label: "종목 수",    my: `${stockCount}개`, peer: `${PEER_MOCK.stocks}개`, score: myScores.stocks },
        ].map(({ label, my, peer, score }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-toss-label">{label}</span>
              <span className="text-toss-sub">나 <span className="font-bold text-toss-text">{my}</span> · 평균 <span className="font-medium">{peer}</span></span>
            </div>
            <div className="relative h-2 bg-toss-bg rounded-full overflow-hidden">
              {/* 평균 기준선 */}
              <div className="absolute top-0 left-0 h-full rounded-full bg-toss-border" style={{ width: "60%" }} />
              {/* 나의 점수 */}
              <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                style={{ width: `${score}%`, background: score >= 60 ? "#3182F6" : score >= 40 ? "#f59e0b" : "#f87171" }} />
            </div>
          </div>
        ))}
        <p className="text-[11px] text-toss-sub pt-1">* 30대 배당 투자자 표본 기반 추정 데이터 (Mock). 실제 통계와 다를 수 있습니다.</p>
      </div>
    </div>
  );
}
