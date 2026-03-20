"use client";

import { useEffect, useState } from "react";
import { getHoldings, addHolding, removeHolding } from "@/lib/storage";
import { calcMonthlyDividends, holdingsToDividendEvents } from "@/lib/calculator";
import { Holding, Market } from "@/lib/types";
import DividendChart from "@/components/DividendChart";

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [form, setForm] = useState({ ticker: "", name: "", market: "KR" as Market, quantity: "", purchaseDate: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setHoldings(getHoldings()); }, []);

  function handleAdd() {
    if (!form.ticker || !form.name || !form.quantity) return;
    const updated = addHolding({ ...form, quantity: +form.quantity, purchaseDate: form.purchaseDate || new Date().toISOString().split("T")[0] });
    setHoldings(getHoldings());
    setForm({ ticker: "", name: "", market: "KR", quantity: "", purchaseDate: "" });
    setShowForm(false);
  }

  function handleRemove(id: string) {
    removeHolding(id);
    setHoldings(getHoldings());
  }

  const events    = holdingsToDividendEvents(holdings);
  const monthly   = calcMonthlyDividends(holdings);
  const annualNet = monthly.reduce((s, m) => s + m.amount, 0);
  const avgYield  = holdings.length > 0 ? ((annualNet / holdings.reduce((s, h) => s + h.quantity * (h.market === "KR" ? 70000 : 200), 0)) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      {/* 타이틀 */}
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text">내 배당</h1>
        <p className="text-sm text-toss-sub">보유 종목 기반 연간 배당 수익을 한눈에 확인하세요.</p>
      </div>

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="보유 종목" value={`${holdings.length}개`} />
        <SummaryCard label="연간 세후 배당" value={`${Math.round(annualNet).toLocaleString("ko-KR")}원`} highlight />
        <SummaryCard label="평균 배당 수익률" value={`${avgYield.toFixed(2)}%`} />
      </div>

      {/* 월별 차트 */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <p className="text-[14px] font-bold text-toss-text mb-4">월별 예상 배당금</p>
        {holdings.length === 0
          ? <EmptyChart />
          : <DividendChart data={monthly} />
        }
      </div>

      {/* 보유 종목 목록 */}
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-toss-text">보유 종목</p>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-[13px] font-semibold text-toss-blue bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <span className="text-lg leading-none">+</span> 종목 추가
          </button>
        </div>

        {/* 추가 폼 */}
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
            <button onClick={handleAdd}
              className="w-full bg-toss-blue text-white font-bold text-[14px] py-3 rounded-xl hover:bg-toss-blueDark transition-colors">
              추가하기
            </button>
          </div>
        )}

        {/* 종목 리스트 */}
        {holdings.length === 0
          ? <p className="text-[14px] text-toss-sub text-center py-8">아직 등록된 종목이 없어요.<br />종목을 추가하면 배당 수익을 계산해 드려요.</p>
          : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.holdingId} className="flex items-center justify-between py-3 border-b border-toss-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-toss-bg rounded-xl flex items-center justify-center text-sm font-bold text-toss-blue">
                      {e.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-toss-text">{e.name}</p>
                      <p className="text-[12px] text-toss-sub">{e.quantity.toLocaleString()}주 · {e.market}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-toss-blue">
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
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 space-y-1.5">
      <p className="text-[12px] text-toss-sub font-medium">{label}</p>
      <p className={`text-[17px] font-extrabold leading-tight ${highlight ? "text-toss-blue" : "text-toss-text"}`}>
        {value}
      </p>
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
    <div className="h-[220px] flex flex-col items-center justify-center text-toss-sub space-y-2">
      <span className="text-4xl">📊</span>
      <p className="text-[14px]">종목을 추가하면 배당 차트가 표시돼요.</p>
    </div>
  );
}
