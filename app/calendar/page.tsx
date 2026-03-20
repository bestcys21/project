"use client";

import { useEffect, useState } from "react";
import { getHoldings } from "@/lib/storage";
import { Holding, DividendEvent } from "@/lib/types";
import { STOCK_COLORS } from "@/components/DividendChart";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CalendarSkeleton } from "@/components/Skeleton";

const TAX_RATE = { KR: 0.154, US: 0.15 };

export default function CalendarPage() {
  const [today]        = useState(new Date());
  const [current,       setCurrent]     = useState(() => new Date());
  const [events,        setEvents]      = useState<DividendEvent[]>([]);
  const [loading,       setLoading]     = useState(true);
  const [selected,      setSelected]    = useState<DividendEvent[] | null>(null);
  const [selectedDate,  setSelectedDate] = useState("");

  useEffect(() => {
    const holdings = getHoldings();
    if (holdings.length === 0) { setLoading(false); return; }
    fetchEvents(holdings);
  }, []);

  async function fetchEvents(holdings: Holding[]) {
    setLoading(true);
    const results: DividendEvent[] = [];

    await Promise.allSettled(
      holdings.map(async (h) => {
        const ticker = h.market === "KR" ? `${h.ticker}.KS` : h.ticker.toUpperCase();
        const taxRate = TAX_RATE[h.market];
        try {
          const res  = await fetch(`/api/dividend?ticker=${encodeURIComponent(ticker)}`);
          let data: any = {};
          try { data = await res.json(); } catch { /* noop */ }

          const dps = data.dps ?? 0;
          results.push({
            holdingId:   h.id,
            ticker:      h.ticker,
            name:        data.name ?? h.name,
            market:      h.market,
            exDate:      data.exDate      ?? "미정",
            paymentDate: data.paymentDate ?? "미정",
            dps,
            quantity:    h.quantity,
            netAmount:   dps * h.quantity * (1 - taxRate),
          });
        } catch {
          results.push({
            holdingId:   h.id, ticker: h.ticker, name: h.name, market: h.market,
            exDate: "미정", paymentDate: "미정",
            dps: 0, quantity: h.quantity,
            netAmount: 0,
          });
        }
      })
    );

    setEvents(results);
    setLoading(false);
  }

  const year        = current.getFullYear();
  const month       = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() { setCurrent(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrent(new Date(year, month + 1, 1)); }

  function dateKey(y: number, m: number, d: number) {
    return `${y}.${String(m + 1).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
  }

  function getEventsForDate(d: number) {
    const key = dateKey(year, month, d);
    return {
      exDate:  events.filter((e) => e.exDate === key),
      payDate: events.filter((e) => e.paymentDate === key),
    };
  }

  function handleDayClick(d: number) {
    const key = dateKey(year, month, d);
    const { exDate, payDate } = getEventsForDate(d);
    const all = [...exDate, ...payDate];
    setSelected(all.length > 0 ? all : null);
    setSelectedDate(all.length > 0 ? key : "");
  }

  const cells = (Array.from({ length: firstDay }, () => null) as (null | number)[])
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const monthTotal = events.reduce((sum, e) => {
    const key = `${year}.${String(month + 1).padStart(2, "0")}`;
    return e.paymentDate.startsWith(key) ? sum + e.netAmount : sum;
  }, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text">배당 캘린더</h1>
        <p className="text-sm text-toss-sub">배당락일과 지급일을 한눈에 확인하세요.</p>
      </div>

      {/* 이번 달 요약 */}
      {!loading && events.length > 0 && (
        <div className="bg-toss-blue rounded-2xl p-5 flex items-center justify-between text-white fade-up">
          <div>
            <p className="text-[13px] font-medium opacity-80">{year}년 {month + 1}월 예상 배당</p>
            <p className="text-[26px] font-extrabold mt-0.5">
              {Math.round(monthTotal).toLocaleString("ko-KR")}원
            </p>
          </div>
          <div className="text-4xl opacity-80">💰</div>
        </div>
      )}

      <ErrorBoundary>
        <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-4">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-toss-bg transition-colors">
              <svg className="w-5 h-5 text-toss-label" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-extrabold text-toss-text">{year}년 {month + 1}월</p>
              {loading && (
                <span className="flex items-center gap-1 text-[11px] text-toss-sub">
                  <span className="w-1.5 h-1.5 rounded-full bg-toss-blue animate-pulse" />
                  로딩 중
                </span>
              )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-toss-bg transition-colors">
              <svg className="w-5 h-5 text-toss-label" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> 배당락일
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
              <span className="w-2.5 h-2.5 rounded-full bg-toss-blue" /> 지급일
            </span>
            {!loading && events.map((e, i) => (
              <span key={e.holdingId} className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STOCK_COLORS[i % STOCK_COLORS.length] }} />
                {e.name}
              </span>
            ))}
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 text-center">
            {["일","월","화","수","목","금","토"].map((d, i) => (
              <p key={d} className={`text-[12px] font-semibold py-1
                ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-toss-sub"}`}>
                {d}
              </p>
            ))}
          </div>

          {/* 날짜 그리드 or 스켈레톤 */}
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;
                const key = dateKey(year, month, day);
                const { exDate, payDate } = getEventsForDate(day);
                const isToday    = key === todayKey;
                const isSelected = key === selectedDate;
                const col        = idx % 7;
                const allDots    = [
                  ...exDate.map((e)  => ({ color: "#f87171",  holdingId: e.holdingId })),
                  ...payDate.map((e) => ({ color: "stock",    holdingId: e.holdingId })),
                ];

                return (
                  <button key={day} onClick={() => handleDayClick(day)}
                    className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors
                      ${isSelected ? "bg-blue-50" : "hover:bg-toss-bg"}
                      ${isToday ? "ring-1 ring-toss-blue" : ""}`}>
                    <span className={`text-[13px] font-semibold
                      ${isToday ? "text-toss-blue" : col === 0 ? "text-red-400" : col === 6 ? "text-blue-400" : "text-toss-text"}`}>
                      {day}
                    </span>
                    <div className="flex gap-0.5 mt-0.5 h-2">
                      {allDots.slice(0, 3).map((dot, di) => {
                        const eIdx = events.findIndex((e) => e.holdingId === dot.holdingId);
                        const bg   = dot.color === "stock"
                          ? STOCK_COLORS[eIdx >= 0 ? eIdx % STOCK_COLORS.length : 0]
                          : dot.color;
                        return <span key={di} className="w-1.5 h-1.5 rounded-full" style={{ background: bg }} />;
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* 선택된 날짜 상세 */}
      {selected && selected.length > 0 && (
        <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-3 fade-up">
          <p className="text-[14px] font-bold text-toss-text">{selectedDate} 배당 일정</p>
          {selected.map((e, i) => {
            const eIdx  = events.findIndex((ev) => ev.holdingId === e.holdingId);
            const color = STOCK_COLORS[eIdx >= 0 ? eIdx % STOCK_COLORS.length : 0];
            const isEx  = e.exDate === selectedDate;
            return (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-toss-border last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: color }}>
                  {e.ticker.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-toss-text truncate">{e.name}</p>
                  <p className="text-[12px] text-toss-sub mt-0.5">
                    {isEx ? "📌 배당락일" : "💰 배당 지급일"}
                    &nbsp;·&nbsp;{e.quantity.toLocaleString()}주
                    &nbsp;·&nbsp;주당 {e.market === "KR" ? `${e.dps}원` : `$${e.dps}`}
                  </p>
                </div>
                {!isEx && (
                  <div className="text-right">
                    <p className="text-[15px] font-extrabold" style={{ color }}>
                      {e.market === "KR"
                        ? `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`
                        : `$${e.netAmount.toFixed(2)}`}
                    </p>
                    <p className="text-[11px] text-toss-sub">세후</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 종목 없을 때 */}
      {!loading && events.length === 0 && (
        <div className="bg-toss-card rounded-2xl shadow-card p-10 text-center space-y-3">
          <p className="text-4xl">📅</p>
          <p className="text-[15px] font-bold text-toss-text">등록된 종목이 없어요</p>
          <p className="text-[13px] text-toss-sub">내 배당 탭에서 종목을 추가하면<br />캘린더에 일정이 자동으로 표시돼요.</p>
        </div>
      )}
    </div>
  );
}
