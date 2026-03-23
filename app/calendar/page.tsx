"use client";

import { useEffect, useState, useMemo } from "react";
import { getHoldings } from "@/lib/storage";
import { Holding } from "@/lib/types";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CalendarSkeleton } from "@/components/Skeleton";
import StockLogo from "@/components/StockLogo";

const TAX: Record<string, number> = { KR: 0.154, US: 0.15 };

interface CalEvent {
  holdingId: string;
  ticker:    string;
  name:      string;
  market:    "KR" | "US";
  dateKey:   string;          // "YYYY.MM.DD"
  type:      "exDate" | "payDate";
  dps:       number;
  quantity:  number;
  netAmount: number;          // 원래 통화 기준 (KR=원, US=달러)
  currency:  "KRW" | "USD";
  estimated: boolean;         // false = API 확정, true = 주기 기반 추정
}

// ── 미래 배당 이벤트 프로젝션 ─────────────────────────────────────────────────
// payMonths + dps 기반으로 현재~N년 후까지 지급일/배당락일 이벤트 생성
function buildProjectedEvents(
  holding: Holding,
  dps: number,
  payMonths: number[],
  yearsAhead = 3,
): CalEvent[] {
  if (!payMonths.length) return [];
  const events: CalEvent[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endYear = today.getFullYear() + yearsAhead;
  const taxRate  = TAX[holding.market] ?? 0.154;
  const currency = holding.market === "US" ? "USD" : "KRW";

  for (let y = today.getFullYear(); y <= endYear; y++) {
    for (const m of payMonths) {
      // 지급일: 해당 월 15일 (실무 평균)
      const payDay = `${y}.${String(m).padStart(2, "0")}.15`;
      const payDate = new Date(y, m - 1, 15);
      if (payDate >= today) {
        events.push({
          holdingId: holding.id, ticker: holding.ticker,
          name: holding.name, market: holding.market as "KR" | "US",
          dateKey: payDay, type: "payDate",
          dps, quantity: holding.quantity,
          netAmount: dps * holding.quantity * (1 - taxRate),
          currency, estimated: true,
        });
      }

      // 배당락일: 지급 2개월 전 25일 (한국 기준 추정)
      const exM = m - 2 <= 0 ? m - 2 + 12 : m - 2;
      const exY = m - 2 <= 0 ? y - 1 : y;
      const exDay = `${exY}.${String(exM).padStart(2, "0")}.25`;
      const exDate = new Date(exY, exM - 1, 25);
      if (exDate >= today) {
        events.push({
          holdingId: holding.id, ticker: holding.ticker,
          name: holding.name, market: holding.market as "KR" | "US",
          dateKey: exDay, type: "exDate",
          dps, quantity: holding.quantity, netAmount: 0,
          currency, estimated: true,
        });
      }
    }
  }
  return events;
}

export default function CalendarPage() {
  const [today]        = useState(() => new Date());
  const [current,      setCurrent]    = useState(() => new Date());
  const [allEvents,    setAllEvents]  = useState<CalEvent[]>([]);
  const [loading,      setLoading]    = useState(true);
  const [hasHoldings,  setHasHoldings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [usdKrw,       setUsdKrw]    = useState(1350); // 환율 기본값

  useEffect(() => {
    const holdings = getHoldings();
    setHasHoldings(holdings.length > 0);
    if (!holdings.length) { setLoading(false); return; }
    // 환율 fetch (실패 시 기본값 1350 유지)
    fetch("/api/chart?ticker=USDKRW%3DX&period=1M")
      .then(r => r.json())
      .then(d => { if (d.points?.length) setUsdKrw(d.points[d.points.length - 1].price); })
      .catch(() => {});
    fetchAndProject(holdings);
  }, []);

  async function fetchAndProject(holdings: Holding[]) {
    setLoading(true);
    const confirmed: CalEvent[] = [];
    const projected: CalEvent[] = [];

    await Promise.allSettled(
      holdings.map(async (h) => {
        const ticker  = h.market === "KR" ? `${h.ticker}.KS` : h.ticker.toUpperCase();
        const taxRate = TAX[h.market] ?? 0.154;
        const currency = h.market === "US" ? "USD" : "KRW";
        try {
          const res  = await fetch(`/api/dividend?ticker=${encodeURIComponent(ticker)}`);
          const data = await res.json();
          const dps        = data.dps ?? 0;
          const payMonths: number[] = data.payMonths ?? [];

          // ① 확정 지급일
          if (data.paymentDate) {
            confirmed.push({
              holdingId: h.id, ticker: h.ticker, name: h.name,
              market: h.market as "KR" | "US",
              dateKey: data.paymentDate, type: "payDate",
              dps, quantity: h.quantity,
              netAmount: dps * h.quantity * (1 - taxRate),
              currency, estimated: false,
            });
          }
          // ① 확정 배당락일
          if (data.exDate) {
            confirmed.push({
              holdingId: h.id, ticker: h.ticker, name: h.name,
              market: h.market as "KR" | "US",
              dateKey: data.exDate, type: "exDate",
              dps, quantity: h.quantity, netAmount: 0,
              currency, estimated: false,
            });
          }

          // ② API 추정 지급일 목록도 confirmed 처리
          if (data.estimatedPayDates?.length) {
            for (const pd of data.estimatedPayDates as string[]) {
              confirmed.push({
                holdingId: h.id, ticker: h.ticker, name: h.name,
                market: h.market as "KR" | "US",
                dateKey: pd, type: "payDate",
                dps, quantity: h.quantity,
                netAmount: dps * h.quantity * (1 - taxRate),
                currency, estimated: true,
              });
            }
          }

          // ③ payMonths 기반 프로젝션 (확정 dateKey 중복 제거)
          const confirmedKeys = new Set(
            confirmed.filter(e => e.holdingId === h.id).map(e => e.dateKey),
          );
          const fallbackMonths = payMonths.length
            ? payMonths
            : h.market === "KR" ? [4] : [3, 6, 9, 12];

          buildProjectedEvents(h, dps, fallbackMonths)
            .filter(e => !confirmedKeys.has(e.dateKey))
            .forEach(e => projected.push(e));

        } catch {
          // API 실패 → 기본 주기로만 프로젝션
          const fallback = h.market === "KR" ? [4] : [3, 6, 9, 12];
          buildProjectedEvents(h, 0, fallback).forEach(e => projected.push(e));
        }
      })
    );

    setAllEvents([...confirmed, ...projected]);
    setLoading(false);
  }

  // 파생 값들
  const year        = current.getFullYear();
  const month       = current.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey    = `${year}.${String(month + 1).padStart(2, "0")}`;
  const todayKey    = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  function dk(d: number) {
    return `${year}.${String(month + 1).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
  }

  // 이 달 이벤트
  const monthEvents = useMemo(() =>
    allEvents
      .filter(e => e.dateKey.startsWith(monthKey))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [allEvents, monthKey],
  );

  // 선택 날짜 또는 월 전체
  const panelEvents = selectedDate
    ? allEvents.filter(e => e.dateKey === selectedDate)
    : monthEvents;

  // 집계 — USD는 환율로 KRW 환산 후 합산
  const monthPayTotal  = monthEvents.filter(e => e.type === "payDate").reduce((s, e) =>
    s + (e.currency === "USD" ? e.netAmount * usdKrw : e.netAmount), 0);
  const monthExCount   = monthEvents.filter(e => e.type === "exDate").length;
  const hasUsdEvents   = monthEvents.some(e => e.type === "payDate" && e.currency === "USD");

  const cells = (Array.from({ length: firstDay }, () => null) as (null | number)[])
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  function fmtDate(d: string) {
    const m = d.match(/\d{4}\.(\d{2})\.(\d{2})/);
    return m ? `${parseInt(m[1])}월 ${parseInt(m[2])}일` : d;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-toss-text">배당 캘린더</h1>
        <p className="text-base text-toss-sub">배당락일과 지급일을 한눈에 확인하세요.</p>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
        <div className="space-y-4">

          {/* ── 상단 요약: 지급일/배당락일 이원화 ── */}
          {!loading && hasHoldings && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* 💰 현금 입금 */}
                <div className="bg-toss-blue rounded-2xl p-4 text-white">
                  <p className="text-[11px] font-medium opacity-80">💰 {month + 1}월 현금 입금</p>
                  <p className="text-[22px] font-extrabold mt-0.5 leading-tight">
                    {Math.round(monthPayTotal).toLocaleString("ko-KR")}원
                  </p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {monthPayTotal === 0
                      ? "이번 달은 배당락 집중 월이에요"
                      : hasUsdEvents ? `세후 기준 · 원화 환산 합산 (1$ ≈ ${usdKrw.toLocaleString()}원)` : "세후 기준 · 지급일 합산"}
                  </p>
                </div>
                {/* 📉 권리 확보 */}
                <div className="bg-toss-card rounded-2xl p-4 border border-toss-border">
                  <p className="text-[11px] font-medium text-toss-sub">📉 {month + 1}월 권리 확보</p>
                  <p className="text-[22px] font-extrabold mt-0.5 text-toss-text leading-tight">
                    {monthExCount}건
                  </p>
                  <p className="text-[10px] text-toss-sub mt-1">이날까지 보유 시 배당 수령</p>
                </div>
              </div>

              {/* 상태값 메시지 */}
              {monthEvents.length > 0 && (
                <p className="text-[13px] text-toss-sub px-1 [word-break:keep-all]">
                  {monthPayTotal === 0 && monthExCount > 0
                    ? "💬 이번 달은 현금 입금보다 권리 확보(배당락)가 집중된 달입니다."
                    : monthPayTotal >= 500_000
                      ? "🚀 이번 달은 보너스 월급이 들어오는 즐거운 달입니다!"
                      : monthPayTotal > 0
                        ? `💬 이번 달 예상 수령액 ${Math.round(monthPayTotal).toLocaleString("ko-KR")}원 (세후)`
                        : "💬 이번 달에는 배당 일정이 없어요."}
                </p>
              )}
            </>
          )}

          <ErrorBoundary>
            <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-4">

              {/* 월 네비게이션 */}
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
                  className="p-2 rounded-xl hover:bg-toss-bg transition-colors">
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
                <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
                  className="p-2 rounded-xl hover:bg-toss-bg transition-colors">
                  <svg className="w-5 h-5 text-toss-label" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* 범례 — 아이콘 기반 */}
              <div className="flex gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                  <span>💰</span> 지급일 (현금 입금)
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                  <span>📉</span> 배당락일 (권리 확보)
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                  <span className="text-amber-500 font-bold">(예상)</span> 주기 기반 추정
                </span>
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
              {loading ? (
                <CalendarSkeleton />
              ) : (
                <div className="grid grid-cols-7 gap-y-1">
                  {cells.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} className="h-16" />;
                    const key       = dk(day);
                    const dayEvents = allEvents.filter(e => e.dateKey === key);
                    const payEvts   = dayEvents.filter(e => e.type === "payDate");
                    const exEvts    = dayEvents.filter(e => e.type === "exDate");
                    const isToday    = key === todayKey;
                    const isSelected = key === selectedDate;
                    const col = idx % 7;

                    return (
                      <button key={day}
                        onClick={() => setSelectedDate(isSelected ? null : key)}
                        className={`relative flex flex-col items-center justify-start pt-1.5 h-16 rounded-xl transition-colors
                          ${isSelected ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-toss-blue"
                            : isToday ? "ring-1 ring-toss-blue hover:bg-toss-bg"
                            : "hover:bg-toss-bg"}`}>
                        <span className={`text-[13px] font-semibold leading-none
                          ${isToday ? "text-toss-blue font-extrabold"
                            : col === 0 ? "text-red-400"
                            : col === 6 ? "text-blue-400"
                            : "text-toss-text"}`}>
                          {day}
                        </span>
                        {/* 아이콘 배지 — 최대 2종류, 3건 이상은 +N */}
                        <div className="flex gap-0.5 mt-1 items-center justify-center">
                          {exEvts.length > 0 && (
                            <span className="text-[11px] leading-none whitespace-nowrap">
                              📉{exEvts.length > 1 && (
                                <span className="text-[9px] font-bold text-toss-sub">+{exEvts.length - 1}</span>
                              )}
                            </span>
                          )}
                          {payEvts.length > 0 && (
                            <span className="text-[11px] leading-none whitespace-nowrap">
                              💰{payEvts.length > 1 && (
                                <span className="text-[9px] font-bold text-toss-sub">+{payEvts.length - 1}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ErrorBoundary>

          {/* 종목 없음 */}
          {!loading && !hasHoldings && (
            <div className="bg-toss-card rounded-2xl shadow-card p-10 text-center space-y-4">
              <p className="text-4xl">📅</p>
              <p className="text-[15px] font-bold text-toss-text">등록된 종목이 없어요</p>
              <p className="text-[13px] text-toss-sub">내 배당 탭에서 종목을 추가하면<br/>캘린더에 일정이 자동으로 표시돼요.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <a href="/dashboard" className="px-5 py-2.5 bg-toss-blue text-white text-[13px] font-bold rounded-xl hover:bg-toss-blueDark transition-colors">
                  내 배당에서 종목 추가 →
                </a>
                <a href="/ranking" className="px-5 py-2.5 border border-toss-border text-toss-label text-[13px] font-bold rounded-xl hover:border-toss-blue hover:text-toss-blue transition-colors">
                  배당 랭킹 보기
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── 오른쪽 패널: 날짜 클릭 시 실시간 필터링 ── */}
        <div className="space-y-3">
          {!loading && hasHoldings && (
            <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-extrabold text-toss-text">
                  {selectedDate ? `${fmtDate(selectedDate)} 일정` : `${month + 1}월 전체 일정`}
                </p>
                {selectedDate && (
                  <button onClick={() => setSelectedDate(null)}
                    className="text-[11px] text-toss-sub hover:text-toss-blue transition-colors font-medium">
                    전체 보기
                  </button>
                )}
              </div>

              {panelEvents.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <p className="text-[14px] font-bold text-toss-text">
                    {selectedDate ? "이 날에는 일정이 없어요" : "이번 달 일정이 없어요"}
                  </p>
                  <p className="text-[12px] text-toss-sub">
                    {selectedDate
                      ? "다른 날짜를 선택하거나 전체 보기를 눌러보세요."
                      : "배당락/지급일이 다른 달에 있을 수 있어요."}
                  </p>
                  {selectedDate && (
                    <button onClick={() => setSelectedDate(null)}
                      className="text-[12px] text-toss-blue font-semibold hover:underline mt-1">
                      이번 달 전체 일정 보기
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1 max-h-[520px] overflow-y-auto">
                  {panelEvents.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-toss-border last:border-0">
                      <StockLogo ticker={e.ticker} name={e.name} market={e.market} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-toss-text truncate">
                          {e.name}
                          {e.estimated && (
                            <span className="ml-1 text-[10px] font-semibold text-amber-500">(예상)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[11px] font-semibold ${e.type === "payDate" ? "text-toss-blue" : "text-red-500"}`}>
                            {e.type === "payDate" ? "💰 지급일" : "📉 배당락일"}
                          </span>
                          <span className="text-[11px] text-toss-sub">
                            {fmtDate(e.dateKey)} · {e.quantity.toLocaleString()}주
                          </span>
                        </div>
                        {e.type === "exDate" && (
                          <p className="text-[10px] text-toss-sub mt-0.5">이날까지 보유해야 배당을 받아요</p>
                        )}
                      </div>
                      {e.type === "payDate" && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-[14px] font-extrabold text-toss-text">
                            {e.currency === "USD"
                              ? `$${e.netAmount.toFixed(2)}`
                              : `${Math.round(e.netAmount).toLocaleString("ko-KR")}원`}
                          </p>
                          {e.currency === "USD" && (
                            <p className="text-[10px] text-toss-sub">
                              ≈ {Math.round(e.netAmount * usdKrw).toLocaleString("ko-KR")}원
                            </p>
                          )}
                          {e.currency !== "USD" && (
                            <p className="text-[10px] text-toss-sub">{e.estimated ? "예상 세후" : "세후"}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
