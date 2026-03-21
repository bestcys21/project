"use client";

import { useEffect, useState } from "react";
import { getHoldings } from "@/lib/storage";
import { Holding, DividendEvent } from "@/lib/types";
import { STOCK_COLORS } from "@/components/DividendChart";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CalendarSkeleton } from "@/components/Skeleton";
import StockLogo from "@/components/StockLogo";

const TAX_RATE = { KR: 0.154, US: 0.15 };

// 캘린더용 이벤트 (예상 지급일 포함)
interface CalEvent extends DividendEvent {
  estimated?: boolean; // 예상 날짜 여부
  koreanName?: string;  // 한글 종목명 (localStorage 기준)
}

export default function CalendarPage() {
  const [today]        = useState(new Date());
  const [current,       setCurrent]     = useState(() => new Date());
  const [events,        setEvents]      = useState<CalEvent[]>([]);
  const [loading,       setLoading]     = useState(true);
  const [selected,      setSelected]    = useState<CalEvent[] | null>(null);
  const [selectedDate,  setSelectedDate] = useState("");

  useEffect(() => {
    const holdings = getHoldings();
    if (holdings.length === 0) { setLoading(false); return; }
    fetchEvents(holdings);
  }, []);

  async function fetchEvents(holdings: Holding[]) {
    setLoading(true);
    const results: CalEvent[] = [];

    await Promise.allSettled(
      holdings.map(async (h) => {
        const ticker  = h.market === "KR" ? `${h.ticker}.KS` : h.ticker.toUpperCase();
        const taxRate = TAX_RATE[h.market];
        // 한글 이름은 localStorage 기준 우선 사용
        const koreanName = h.name;
        try {
          const res  = await fetch(`/api/dividend?ticker=${encodeURIComponent(ticker)}`);
          let data: any = {};
          try { data = await res.json(); } catch { /* noop */ }

          const dps              = data.dps ?? 0;
          const netAmount        = dps * h.quantity * (1 - taxRate);
          const estimatedDates: string[] = data.estimatedPayDates ?? [];

          // 실제 지급일이 있으면 우선 사용
          if (data.paymentDate) {
            results.push({
              holdingId: h.id, ticker: h.ticker,
              name: koreanName, market: h.market, koreanName,
              exDate: data.exDate ?? "미정", paymentDate: data.paymentDate,
              dps, quantity: h.quantity, netAmount, estimated: false,
            });
          } else if (estimatedDates.length > 0) {
            // 예상 지급일을 각각 이벤트로 추가
            estimatedDates.forEach((pd) => {
              results.push({
                holdingId: h.id, ticker: h.ticker,
                name: koreanName, market: h.market, koreanName,
                exDate: data.exDate ?? "미정", paymentDate: pd,
                dps, quantity: h.quantity, netAmount, estimated: true,
              });
            });
          } else {
            results.push({
              holdingId: h.id, ticker: h.ticker,
              name: koreanName, market: h.market, koreanName,
              exDate: data.exDate ?? "미정", paymentDate: "미정",
              dps: 0, quantity: h.quantity, netAmount: 0,
            });
          }
        } catch {
          results.push({
            holdingId: h.id, ticker: h.ticker, name: koreanName, market: h.market, koreanName,
            exDate: "미정", paymentDate: "미정",
            dps: 0, quantity: h.quantity, netAmount: 0,
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

  // 종목 중복 제거 (색상 매핑용)
  const uniqueHoldings = events.reduce<{ holdingId: string; name: string; ticker: string }[]>((acc, e) => {
    if (!acc.find((u) => u.holdingId === e.holdingId)) acc.push({ holdingId: e.holdingId, name: e.name, ticker: e.ticker });
    return acc;
  }, []);
  function holdingColor(holdingId: string) {
    const idx = uniqueHoldings.findIndex((u) => u.holdingId === holdingId);
    return STOCK_COLORS[(idx >= 0 ? idx : 0) % STOCK_COLORS.length];
  }

  const monthTotal = events.reduce((sum, e) => {
    const key = `${year}.${String(month + 1).padStart(2, "0")}`;
    return e.paymentDate.startsWith(key) ? sum + e.netAmount : sum;
  }, 0);

  // 이번 달 전체 이벤트 목록 (날짜순 정렬)
  const monthKey = `${year}.${String(month + 1).padStart(2, "0")}`;
  const monthEvents = events
    .filter((e) => e.paymentDate.startsWith(monthKey) || e.exDate.startsWith(monthKey))
    .sort((a, b) => {
      const da = a.paymentDate.startsWith(monthKey) ? a.paymentDate : a.exDate;
      const db = b.paymentDate.startsWith(monthKey) ? b.paymentDate : b.exDate;
      return da.localeCompare(db);
    });

  // 날짜 포맷: "2025.04.15" → "4월 15일"
  function fmtDate(d: string) {
    const m = d.match(/\d{4}\.(\d{2})\.(\d{2})/);
    if (!m) return d;
    return `${parseInt(m[1])}월 ${parseInt(m[2])}일`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-toss-text">배당 캘린더</h1>
        <p className="text-base text-toss-sub">배당락일과 지급일을 한눈에 확인하세요.</p>
      </div>

      {/* PC: 2열 레이아웃 */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
        <div className="space-y-5">

      {/* 이번 주 배당 강조 */}
      {!loading && events.length > 0 && (() => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const thisWeekEvents = events.filter(e => {
          const m = e.paymentDate.match(/(\d{4})\.(\d{2})\.(\d{2})/);
          if (!m) return false;
          const d = new Date(+m[1], +m[2]-1, +m[3]);
          return d >= weekStart && d <= weekEnd;
        });

        if (thisWeekEvents.length === 0) return null;

        const weekTotal = thisWeekEvents.reduce((s, e) => s + e.netAmount, 0);
        return (
          <div className="bg-green-500 rounded-2xl p-4 flex items-center justify-between text-white fade-up">
            <div>
              <p className="text-[12px] font-medium opacity-80">🔔 이번 주 배당 지급 예정</p>
              <p className="text-[22px] font-extrabold mt-0.5">
                {Math.round(weekTotal).toLocaleString("ko-KR")}원
              </p>
              <p className="text-[11px] opacity-75 mt-0.5">{thisWeekEvents.length}건</p>
            </div>
            <span className="text-4xl opacity-80">📬</span>
          </div>
        );
      })()}

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
              <span className="w-2.5 h-2.5 rounded-full bg-toss-blue" /> 실제 지급일
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-toss-blue" /> 예상 지급일
            </span>
            {!loading && uniqueHoldings.map((h, i) => (
              <span key={h.holdingId} className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STOCK_COLORS[i % STOCK_COLORS.length] }} />
                {h.name}
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
                if (!day) return <div key={`e-${idx}`} className="h-14" />;
                const key = dateKey(year, month, day);
                const { exDate, payDate } = getEventsForDate(day);
                const isToday    = key === todayKey;
                const isSelected = key === selectedDate;
                const col        = idx % 7;
                type DotItem = { holdingId: string; isExDate: boolean; estimated: boolean };
                const allDots: DotItem[] = [
                  ...exDate.map((e)  => ({ holdingId: e.holdingId, isExDate: true,  estimated: false })),
                  ...payDate.map((e) => ({ holdingId: e.holdingId, isExDate: false, estimated: !!(e as CalEvent).estimated })),
                ];

                return (
                  <button key={day} onClick={() => handleDayClick(day)}
                    className={`relative flex flex-col items-center justify-center h-14 rounded-xl transition-colors
                      ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-toss-bg"}
                      ${isToday ? "ring-1 ring-toss-blue" : ""}`}>
                    <span className={`text-[14px] font-semibold leading-none
                      ${isToday ? "text-toss-blue" : col === 0 ? "text-red-400" : col === 6 ? "text-blue-400" : "text-toss-text"}`}>
                      {day}
                    </span>
                    <div className="flex gap-0.5 mt-1.5 h-2 items-center">
                      {allDots.slice(0, 3).map((dot, di) => {
                        const bg = dot.isExDate ? "#f87171" : holdingColor(dot.holdingId);
                        return dot.estimated
                          ? <span key={di} className="w-1.5 h-1.5 rounded-full border border-dashed" style={{ borderColor: bg, background: "transparent" }} />
                          : <span key={di} className="w-1.5 h-1.5 rounded-full" style={{ background: bg }} />;
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* 종목 없을 때 */}
      {!loading && events.length === 0 && (
        <div className="bg-toss-card rounded-2xl shadow-card p-10 text-center space-y-4">
          <p className="text-4xl">📅</p>
          <p className="text-[15px] font-bold text-toss-text">등록된 종목이 없어요</p>
          <p className="text-[13px] text-toss-sub">내 배당 탭에서 종목을 추가하면<br />캘린더에 일정이 자동으로 표시돼요.</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <a href="/dashboard"
              className="px-5 py-2.5 bg-toss-blue text-white text-[13px] font-bold rounded-xl hover:bg-toss-blueDark transition-colors">
              내 배당에서 종목 추가 →
            </a>
            <a href="/ranking"
              className="px-5 py-2.5 border border-toss-border text-toss-label text-[13px] font-bold rounded-xl hover:border-toss-blue hover:text-toss-blue transition-colors">
              배당 랭킹 보기
            </a>
          </div>
        </div>
      )}

        </div>{/* end lg 왼쪽 */}

        {/* 오른쪽: 선택 날짜 상세 + 이번 달 전체 일정 */}
        <div className="space-y-4">
          {selected && selected.length > 0 && (
            <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-3 fade-up">
              <p className="text-[14px] font-bold text-toss-text">{selectedDate} 배당 일정</p>
              {selected.map((e, i) => {
                const color = holdingColor(e.holdingId);
                const isEx  = e.exDate === selectedDate;
                const isEst = !!(e as CalEvent).estimated;
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-toss-border last:border-0">
                    <StockLogo ticker={e.ticker} name={e.koreanName ?? e.name} market={e.market} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[14px] font-bold text-toss-text truncate">{e.koreanName ?? e.name}</p>
                        {isEst && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">예상</span>
                        )}
                      </div>
                      <p className="text-[12px] text-toss-sub mt-0.5">
                        {isEx
                          ? <><span className="text-red-500 font-semibold">📌 배당락일</span></>
                          : <><span className="text-toss-blue font-semibold">💰 배당 지급일</span></>
                        }
                        &nbsp;·&nbsp;{e.quantity.toLocaleString()}주
                        &nbsp;·&nbsp;주당 {e.market === "KR" ? `${e.dps}원` : `$${e.dps}`}
                      </p>
                    </div>
                    {!isEx && (
                      <div className="text-right">
                        <p className="text-[15px] font-extrabold text-toss-text">
                          {e.market === "KR"
                            ? `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`
                            : `$${e.netAmount.toFixed(2)}`}
                        </p>
                        <p className="text-[11px] text-toss-sub">{isEst ? "예상 세후" : "세후"}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* ── 이번 달 전체 일정 목록 ── */}
          {!loading && monthEvents.length > 0 && (
            <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-3">
              <p className="text-[15px] font-extrabold text-toss-text">{year}년 {month + 1}월 전체 일정</p>
              <div className="space-y-2">
                {monthEvents.map((e, i) => {
                  const isPayInMonth = e.paymentDate.startsWith(monthKey);
                  const isExInMonth  = e.exDate.startsWith(monthKey);
                  const isEst = !!(e as CalEvent).estimated;
                  return (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-toss-border last:border-0">
                      <div className="flex-shrink-0 w-14 text-center">
                        {isPayInMonth && (
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-lg
                            ${isEst ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-toss-blue bg-blue-50 dark:bg-blue-900/20"}`}>
                            {fmtDate(e.paymentDate)}
                          </span>
                        )}
                        {!isPayInMonth && isExInMonth && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500">
                            {fmtDate(e.exDate)}
                          </span>
                        )}
                      </div>
                      <StockLogo ticker={e.ticker} name={e.koreanName ?? e.name} market={e.market} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[14px] font-bold text-toss-text truncate">{e.koreanName ?? e.name}</p>
                          {isPayInMonth && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0
                              ${isEst ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-toss-blue bg-blue-50 dark:bg-blue-900/20"}`}>
                              {isEst ? "예상 지급일" : "실제 지급일"}
                            </span>
                          )}
                          {!isPayInMonth && isExInMonth && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 text-red-500 bg-red-50 dark:bg-red-900/20">
                              배당락일
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-toss-sub mt-0.5">
                          {e.quantity.toLocaleString()}주 · 주당 {e.market === "KR" ? `${e.dps}원` : `$${e.dps}`}
                        </p>
                      </div>
                      {isPayInMonth && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-[15px] font-extrabold text-toss-text">
                            {e.market === "KR"
                              ? `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`
                              : `$${e.netAmount.toFixed(2)}`}
                          </p>
                          <p className="text-[11px] text-toss-sub">{isEst ? "예상 세후" : "세후"}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>{/* end 오른쪽 */}

      </div>{/* end PC 2열 */}
    </div>
  );
}
