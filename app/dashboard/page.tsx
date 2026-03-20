"use client";

import { useEffect, useState } from "react";
import { getHoldings, addHolding, removeHolding } from "@/lib/storage";
import { calcStackedMonthly, holdingsToDividendEvents } from "@/lib/calculator";
import { Holding, Market, DividendEvent } from "@/lib/types";
import DividendChart, { STOCK_COLORS } from "@/components/DividendChart";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SummaryCardSkeleton, ChartSkeleton, HoldingRowSkeleton } from "@/components/Skeleton";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

export default function DashboardPage() {
  const [holdings,   setHoldings]   = useState<Holding[]>([]);
  const [apiData,    setApiData]    = useState<Record<string, { dps: number }>>({});
  const [initLoading, setInitLoading] = useState(true);   // 첫 로드
  const [apiLoading,  setApiLoading]  = useState(false);  // API 갱신
  const [form, setForm]     = useState({ ticker: "", name: "", market: "KR" as Market, quantity: "", purchaseDate: "" });
  const [formError, setFormError] = useState("");
  const [showForm,  setShowForm]  = useState(false);

  useEffect(() => {
    const h = getHoldings();
    setHoldings(h);
    if (h.length > 0) {
      fetchApiData(h).finally(() => setInitLoading(false));
    } else {
      setInitLoading(false);
    }
  }, []);

  async function fetchApiData(h: Holding[]) {
    setApiLoading(true);
    const results: Record<string, { dps: number }> = {};
    await Promise.allSettled(
      h.map(async (holding) => {
        const ticker = holding.market === "KR"
          ? `${holding.ticker}.KS`
          : holding.ticker.toUpperCase();
        try {
          const res  = await fetch(`/api/dividend?ticker=${encodeURIComponent(ticker)}`);
          const data = await res.json();
          if (!data.error && data.dps != null) {
            results[holding.ticker] = { dps: data.dps };
          }
        } catch { /* 개별 종목 실패는 무시 */ }
      })
    );
    setApiData(results);
    setApiLoading(false);
  }

  function handleAdd() {
    setFormError("");
    if (!form.ticker.trim()) return setFormError("티커를 입력해 주세요.");
    if (!form.name.trim())   return setFormError("종목명을 입력해 주세요.");
    if (!form.quantity || +form.quantity <= 0) return setFormError("수량을 1주 이상 입력해 주세요.");

    addHolding({
      ...form,
      ticker:       form.ticker.trim().toUpperCase(),
      name:         form.name.trim(),
      quantity:     +form.quantity,
      purchaseDate: form.purchaseDate || new Date().toISOString().split("T")[0],
    });
    const updated = getHoldings();
    setHoldings(updated);
    fetchApiData(updated);
    setForm({ ticker: "", name: "", market: "KR", quantity: "", purchaseDate: "" });
    setFormError("");
    setShowForm(false);
  }

  function handleRemove(id: string) {
    removeHolding(id);
    const updated = getHoldings();
    setHoldings(updated);
    if (updated.length > 0) fetchApiData(updated);
    else setApiData({});
  }

  const events = holdingsToDividendEvents(holdings, apiData);
  const { stackedData, tickers } = calcStackedMonthly(holdings, apiData);
  const annualNet = stackedData.reduce((s, m) => s + m.total, 0);
  const bestMonth = stackedData.reduce((a, b) => a.total > b.total ? a : b, stackedData[0] ?? { month: "-", total: 0 });
  const nextEvent = getNextEvent(events);
  const dday      = nextEvent ? getDday(nextEvent.paymentDate) : null;

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
          <SummaryCard label="보유 종목"     value={`${holdings.length}개`} />
          <SummaryCard label="연간 세후 배당" value={`${Math.round(annualNet).toLocaleString("ko-KR")}원`} highlight />
          <SummaryCard label="최대 배당월"   value={bestMonth.total > 0 ? bestMonth.month : "-"} />
          <SummaryCard
            label="다음 배당 D-day"
            value={dday !== null ? (dday === 0 ? "오늘! 🎉" : `D-${dday}`) : "-"}
            highlight={dday !== null && dday <= 7}
          />
        </div>
      )}

      {/* 월별 차트 */}
      <ErrorBoundary>
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-bold text-toss-text">월별 예상 배당금</p>
            {apiLoading && (
              <span className="flex items-center gap-1.5 text-[12px] text-toss-sub">
                <span className="w-2 h-2 rounded-full bg-toss-blue animate-pulse" />
                실시간 업데이트 중
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

          {initLoading
            ? <ChartSkeleton />
            : holdings.length === 0
              ? <EmptyChart />
              : <DividendChart data={[]} stackedData={stackedData} tickers={tickers} />
          }
        </div>
      </ErrorBoundary>

      {/* 보유 종목 목록 */}
      <ErrorBoundary>
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-toss-text">보유 종목</p>
            <button onClick={() => { setShowForm((v) => !v); setFormError(""); }}
              className="flex items-center gap-1 text-[13px] font-semibold text-toss-blue bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
              <span className="text-lg leading-none">+</span> 종목 추가
            </button>
          </div>

          {/* 추가 폼 */}
          {showForm && (
            <div className="border border-toss-border rounded-xl p-4 space-y-3 bg-toss-bg">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Input placeholder="티커 (예: 005930)" value={form.ticker} onChange={(v) => setForm({ ...form, ticker: v })} />
                  <p className="text-[11px] text-toss-sub px-1">한국: 종목코드 · 미국: AAPL</p>
                </div>
                <Input placeholder="종목명 (예: 삼성전자)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex gap-2">
                  {(["KR", "US"] as Market[]).map((m) => (
                    <button key={m} onClick={() => setForm({ ...form, market: m })}
                      className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors
                        ${form.market === m ? "bg-toss-blue text-white border-toss-blue" : "bg-white text-toss-label border-toss-border"}`}>
                      {m === "KR" ? "🇰🇷 KR" : "🇺🇸 US"}
                    </button>
                  ))}
                </div>
                <Input placeholder="수량" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
                <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className="toss-input text-[13px]" />
              </div>
              {formError && <p className="text-[13px] text-red-500 font-medium px-1">{formError}</p>}
              <button onClick={handleAdd}
                className="w-full bg-toss-blue text-white font-bold text-[14px] py-3 rounded-xl hover:bg-toss-blueDark transition-colors">
                추가하기
              </button>
            </div>
          )}

          {/* 종목 리스트 */}
          {initLoading ? (
            <div>{Array.from({ length: 3 }).map((_, i) => <HoldingRowSkeleton key={i} />)}</div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-3xl">📭</p>
              <p className="text-[14px] text-toss-sub">아직 등록된 종목이 없어요.<br />종목을 추가하면 배당 수익을 계산해 드려요.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {events.map((e, i) => {
                const color    = STOCK_COLORS[i % STOCK_COLORS.length];
                const isLive   = !!apiData[e.ticker];
                const ddayVal  = getDday(e.paymentDate);
                return (
                  <div key={e.holdingId} className="flex items-center justify-between py-3 border-b border-toss-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: color }}>
                        {e.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[14px] font-bold text-toss-text">{e.name}</p>
                          {isLive && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">실시간</span>}
                        </div>
                        <p className="text-[12px] text-toss-sub">
                          {e.quantity.toLocaleString()}주 · {e.market}
                          {ddayVal >= 0 && ddayVal <= 30 && (
                            <span className="ml-1.5 text-toss-blue font-semibold">
                              · D-{ddayVal}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[14px] font-bold" style={{ color }}>
                          {Math.round(e.netAmount).toLocaleString("ko-KR")}원
                        </p>
                        <p className="text-[11px] text-toss-sub">세후 배당</p>
                      </div>
                      <button onClick={() => handleRemove(e.holdingId)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-toss-sub hover:text-red-400 transition-colors">
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
  return Math.ceil((target.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
}

/* ── sub components ── */
function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 space-y-1.5">
      <p className="text-[12px] text-toss-sub font-medium">{label}</p>
      <p className={`text-[16px] font-extrabold leading-tight ${highlight ? "text-toss-blue" : "text-toss-text"}`}>{value}</p>
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text" }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className="toss-input text-[13px]" />
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
