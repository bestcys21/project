"use client";

import { useEffect, useState } from "react";
import { getHoldings } from "@/lib/storage";
import { holdingsToDividendEvents } from "@/lib/calculator";
import { DividendEvent } from "@/lib/types";

export default function CalendarPage() {
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(() => new Date());
  const [events, setEvents] = useState<DividendEvent[]>([]);
  const [selected, setSelected] = useState<DividendEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const holdings = getHoldings();
    setEvents(holdingsToDividendEvents(holdings));
  }, []);

  const year  = current.getFullYear();
  const month = current.getMonth(); // 0-based

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() { setCurrent(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrent(new Date(year, month + 1, 1)); }

  function dateKey(y: number, m: number, d: number) {
    return `${y}.${String(m + 1).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
  }

  function getEventsForDate(d: number): { exDate: DividendEvent[]; payDate: DividendEvent[] } {
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
    if (all.length > 0) { setSelected(all); setSelectedDate(key); }
    else { setSelected(null); setSelectedDate(""); }
  }

  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text">배당 캘린더</h1>
        <p className="text-sm text-toss-sub">배당락일과 지급일을 한눈에 확인하세요.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-toss-bg transition-colors">
            <svg className="w-5 h-5 text-toss-label" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-[17px] font-extrabold text-toss-text">
            {year}년 {month + 1}월
          </p>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-toss-bg transition-colors">
            <svg className="w-5 h-5 text-toss-label" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 범례 */}
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> 배당락일
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
            <span className="w-2.5 h-2.5 rounded-full bg-toss-blue" /> 지급일
          </span>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 text-center">
          {["일","월","화","수","목","금","토"].map((d, i) => (
            <p key={d} className={`text-[12px] font-semibold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-toss-sub"}`}>
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
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const col = idx % 7;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors
                  ${isSelected ? "bg-blue-50" : "hover:bg-toss-bg"}
                  ${isToday ? "ring-1 ring-toss-blue" : ""}
                `}
              >
                <span className={`text-[13px] font-semibold
                  ${isToday ? "text-toss-blue" : col === 0 ? "text-red-400" : col === 6 ? "text-blue-400" : "text-toss-text"}`}>
                  {day}
                </span>
                <div className="flex gap-0.5 mt-0.5 h-2">
                  {exDate.length  > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  {payDate.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-toss-blue" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 이벤트 */}
      {selected && selected.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <p className="text-[14px] font-bold text-toss-text">{selectedDate} 배당 일정</p>
          {selected.map((e, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-toss-border last:border-0">
              <div>
                <p className="text-[14px] font-semibold text-toss-text">{e.name} ({e.ticker})</p>
                <p className="text-[12px] text-toss-sub mt-0.5">
                  {e.exDate === selectedDate ? "📌 배당락일" : "💰 배당 지급일"} · {e.quantity.toLocaleString()}주
                </p>
              </div>
              <p className="text-[14px] font-bold text-toss-blue">
                {Math.round(e.netAmount).toLocaleString("ko-KR")}원
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 등록 종목 없을 때 안내 */}
      {events.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center space-y-2">
          <p className="text-3xl">📅</p>
          <p className="text-[14px] text-toss-sub">내 배당 탭에서 종목을 추가하면<br />캘린더에 일정이 표시돼요.</p>
        </div>
      )}
    </div>
  );
}
