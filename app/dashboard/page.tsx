"use client";

import { useEffect, useState } from "react";
import { getHoldings, addHolding, removeHolding } from "@/lib/storage";
import { calcStackedMonthly, holdingsToDividendEvents } from "@/lib/calculator";
import { Holding, Market, DividendEvent } from "@/lib/types";
import DividendChart, { STOCK_COLORS } from "@/components/DividendChart";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

export default function DashboardPage() {
  const [holdings,    setHoldings]   = useState<Holding[]>([]);
  const [apiData,     setApiData]    = useState<Record<string, { dps: number }>>({});
  const [loadingApi,  setLoadingApi] = useState(false);
  const [form, setForm] = useState({ ticker: "", name: "", market: "KR" as Market, quantity: "", purchaseDate: "" });
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const h = getHoldings();
    setHoldings(h);
    if (h.length > 0) fetchApiData(h);
  }, []);

  async function fetchApiData(h: Holding[]) {
    setLoadingApi(true);
    const results: Record<string, { dps: number }> = {};
    await Promise.allSettled(
      h.map(async (holding) => {
        const ticker = holding.market === "KR"
          ? `${holding.ticker}.KS`
          : holding.ticker.toUpperCase();
        const res  = await fetch(`/api/dividend?ticker=${encodeURIComponent(ticker)}`);
        const data = await res.json();
        if (!data.error && data.dps != null) {
          results[holding.ticker] = { dps: data.dps };
        }
      })
    );
    setApiData(results);
    setLoadingApi(false);
  }

  function handleAdd() {
    setFormError("");
    if (!form.ticker.trim()) return setFormError("티커를 입력해 주세요.");
    if (!form.name.trim())   return setFormError("종목명을 입력해 주세요.");
    if (!form.quantity || +form.quantity <= 0) return setFormError("수량을 1주 이상 입력해 주세요.");

    addHolding({ ...form, ticker: form.ticker.trim(), name: form.name.trim(), quantity: +form.quantity, purchaseDate: form.purchaseDate || new Date().toISOString().split("T")[0] });
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
  }

  const events = holdingsToDividendEvents(holdings, apiData);
  const { stackedData, tickers } = calcStackedMonthly(holdings, apiData);
  const annualNet  = stackedData.reduce((s, m) => s + m.total, 0);
  const bestMonth  = stackedData.reduce((a, b) => a.total > b.total ? a : b, stackedData[0] ?? { month: "-", total: 0 });

  // 다음 배당 D-day
  const nextEvent  = getNextEvent(events);
  const dday       = nextEvent ? getDday(nextEvent.paymentDate) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text">내 배당</h1>
        <p className="text-sm text-toss-sub">보유 종목 기반 연간 배당 수익을 한눈에 확인하세요.</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="보유 종목" value={`${holdings.length}개`} />
        <SummaryCard label="연간 세후 배당" value={`${Math.round(annualNet).toLocaleString("ko-KR")}원`} highlight />
        <SummaryCard label="최대 배당월" value={bestMonth.total > 0 ? bestMonth.month : "-"} />
        <SummaryCard
          label="다음 배당 D-day"
          value={dday !== null ? (dday === 0 ? "오늘!" : `D-${dday}`) : "-"}
          highlight={dday !== null && dday <= 7}
        />
      </div>

      {/* 월별 차트 */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-bold text-toss-text">월별 예상 배당금</p>
          {loadingApi && <span className="text-[12px] text-toss-sub animate-pulse">실시간 데이터 로딩 중...</span>}
        </div>

        {/* 종목 범례 */}
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

        {holdings.length === 0
          ? <EmptyChart />
          : <DividendChart data={[]} stackedData={stackedData} tickers={tickers} />
        }
      </div>

      {/* 보유 종목 목록 */}
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-toss-text">보유 종목</p>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-[13px] font-semibold text-toss-blue bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
            <span className="text-lg leading-none">+</span> 종목 추가
          </button>
        </div>

        {showForm && (
          <div className="border border-toss-border rounded-xl p-4 space-y-3 bg-toss-bg">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="티커 (예: 005930)" value={form.ticker} onChange={(v) => setForm({ ...form, ticker: v })} />
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
            {formError && (
              <p className="text-[13px] text-red-500 font-medium px-1">{formError}</p>
            )}
            <button onClick={handleAdd}
              className="w-full bg-toss-blue text-white font-bold text-[14px] py-3 rounded-xl hover:bg-toss-blueDark transition-colors">
              추가하기
            </button>
          </div>
        )}

        {holdings.length === 0
          ? <p className="text-[14px] text-toss-sub text-center py-8">아직 등록된 종목이 없어요.<br />종목을 추가하면 배당 수익을 계산해 드려요.</p>
          : (
            <div className="space-y-1">
              {events.map((e, i) => {
                const color = STOCK_COLORS[i % STOCK_COLORS.length];
                const liveData = apiData[e.ticker];
                return (
                  <div key={e.holdingId} className="flex items-center justify-between py-3 border-b border-toss-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: color }}>
                        {e.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-toss-text">{e.name}</p>
                        <p className="text-[12px] text-toss-sub">
                          {e.quantity.toLocaleString()}주 · {e.market}
                          {liveData && <span className="text-green-600 ml-1.5">· 실시간</span>}
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
          )
        }
      </div>
    </div>
  );
}

function getNextEvent(events: DividendEvent[]): DividendEvent | null {
  const today = new Date();
  const upcoming = events
    .map((e) => ({ ...e, date: parseEventDate(e.paymentDate) }))
    .filter((e) => e.date && e.date >= today)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());
  return upcoming[0] ?? null;
}

function parseEventDate(str: string): Date | null {
  const m = str.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function getDday(dateStr: string): number {
  const target = parseEventDate(dateStr);
  if (!target) return -1;
  const diff = target.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 space-y-1.5">
      <p className="text-[12px] text-toss-sub font-medium">{label}</p>
      <p className={`text-[17px] font-extrabold leading-tight ${highlight ? "text-toss-blue" : "text-toss-text"}`}>{value}</p>
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
    <div className="h-[240px] flex flex-col items-center justify-center text-toss-sub space-y-2">
      <span className="text-4xl">📊</span>
      <p className="text-[14px]">종목을 추가하면 배당 차트가 표시돼요.</p>
    </div>
  );
}
