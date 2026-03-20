"use client";

import { useEffect, useState } from "react";
import { getHoldings } from "@/lib/storage";
import { Holding, DividendEvent } from "@/lib/types";
import { STOCK_COLORS } from "@/components/DividendChart";

const TAX_RATE = { KR: 0.154, US: 0.15 };

export default function CalendarPage() {
  const [today]   = useState(new Date());
  const [current, setCurrent] = useState(() => new Date());
  const [events,  setEvents]  = useState<DividendEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected,     setSelected]     = useState<DividendEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const holdings = getHoldings();
    if (holdings.length === 0) return;
    fetchEvents(holdings);
  }, []);

  async function fetchEvents(holdings: Holding[]) {
    setLoading(true);
    const results: DividendEvent[] = [];

    await Promise.allSettled(
      holdings.map(async (h, i) => {
        const ticker = h.market === "KR" ? `${h.ticker}.KS` : h.ticker.toUpperCase();
        try {
          const res  = await fetch(`/api/dividend?ticker=${encodeURIComponent(ticker)}`);
          const data = await res.json();
          const taxRate   = TAX_RATE[h.market];
          const dps       = data.dps ?? (h.market === "KR" ? 361 : 0.24);
          const netAmount = dps * h.quantity * (1 - taxRate);

          results.push({
            holdingId:   h.id,
            ticker:      h.ticker,
            name:        data.name ?? h.name,
            market:      h.market,
            exDate:      data.exDate      ?? (h.market === "KR" ? "2025.12.28" : "2025.11.14"),
            paymentDate: data.paymentDate ?? (h.market === "KR" ? "2026.04.15" : "2025.12.06"),
            dps,
            quantity:    h.quantity,
            netAmount,
          });
        } catch {
          // API 실패 시 기본값 유지
          results.push({
            holdingId:   h.id,
            ticker:      h.ticker,
            name:        h.name,
            market:      h.market,
            exDate:      h.market === "KR" ? "2025.12.28" : "2025.11.14",
            paymentDate: h.market === "KR" ? "2026.04.15" : "2025.12.06",
            dps:         h.market === "KR" ? 361 : 0.24,
            quantity:    h.quantity,
            netAmount:   (h.market === "KR" ? 361 : 0.24) * h.quantity * (1 - TAX_RATE[h.market]),
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

  const cells   = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // 이번 달 예정 배당 합계
  const monthTotal = events.reduce((sum, e) => {
    const key = `${year}.${String(month + 1).padStart(2, "0")}`;
    if (e.paymentDate.startsWith(key)) sum += e.netAmount;
    return sum;
  }, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text">배당 캘린더</h1>
        <p className="text-sm text-toss-sub">배당락일과 지급일을 한눈에 확인하세요.</p>
      </div>

      {/* 이번 달 요약 */}
      {events.length > 0 && (
        <div className="bg-toss-blue rounded-2xl p-5 flex items-center justify-between text-white">
          <div>
            <p className="text-[13px] font-medium opacity-80">{year}년 {month + 1}월 예상 배당</p>
            <p className="text-[24px] font-extrabold mt-0.5">
              {Math.round(monthTotal).toLocaleString("ko-KR")}원
            </p>
          </div>
          <div className="text-4xl opacity-80">💰</div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-toss-bg transition-colors">
            <svg className="w-5 h-5 text-toss-label" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-extrabold text-toss-text">{year}년 {month + 1}월</p>
            {loading && <span className="text-[11px] text-toss-sub animate-pulse">로딩 중...</span>}
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
          {events.map((e, i) => (
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

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const key = dateKey(year, month, day);
            const { exDate, payDate } = getEventsForDate(day);
            const isToday    = key === todayKey;
            const isSelected = key === selectedDate;
            const col        = idx % 7;
            const allDots    = [
              ...exDate.map((e) => ({ color: "bg-red-400", holdingId: e.holdingId })),
              ...payDate.map((e) => ({ color: "bg-toss-blue", holdingId: e.holdingId })),
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
                    return (
                      <span key={di} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: dot.color === "bg-red-400" ? "#f87171" : STOCK_COLORS[eIdx >= 0 ? eIdx % STOCK_COLORS.length : 0] }} />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 이벤트 */}
      {selected && selected.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3 fade-up">
          <p className="text-[14px] font-bold text-toss-text">{selectedDate} 배당 일정</p>
          {selected.map((e, i) => {
            const eIdx = events.findIndex((ev) => ev.holdingId === e.holdingId);
            const color = STOCK_COLORS[eIdx >= 0 ? eIdx % STOCK_COLORS.length : 0];
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-toss-border last:border-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: color }}>
                  {e.ticker.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-toss-text">{e.name}</p>
                  <p className="text-[12px] text-toss-sub mt-0.5">
                    {e.exDate === selectedDate ? "📌 배당락일" : "💰 배당 지급일"} · {e.quantity.toLocaleString()}주 · 주당 {e.dps}
                    {e.market === "KR" ? "원" : "$"}
                  </p>
                </div>
                <p className="text-[15px] font-bold" style={{ color }}>
                  {e.market === "KR"
                    ? `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`
                    : `$${e.netAmount.toFixed(2)}`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* 등록 종목 없을 때 */}
      {events.length === 0 && !loading && (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center space-y-2">
          <p className="text-3xl">📅</p>
          <p className="text-[14px] text-toss-sub">내 배당 탭에서 종목을 추가하면<br />캘린더에 일정이 표시돼요.</p>
        </div>
      )}
    </div>
  );
}
