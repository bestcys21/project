"use client";

import { useState } from "react";
import { Market, DividendResult } from "@/lib/calculator";
import ResultCard from "./ResultCard";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

export default function CalculatorForm() {
  const today = new Date().toISOString().split("T")[0];

  const [stock,   setStock]   = useState("");
  const [qty,     setQty]     = useState("");
  const [date,    setDate]    = useState(today);
  const [market,  setMarket]  = useState<Market>("KR");
  const [result,  setResult]  = useState<DividendResult | null>(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    setError("");
    setResult(null);

    if (!stock.trim())       return setError("종목명 또는 티커를 입력해 주세요.");
    if (!qty || +qty <= 0)   return setError("수량을 1주 이상 입력해 주세요.");
    if (!date)               return setError("매수 예정일을 선택해 주세요.");

    setLoading(true);
    try {
      const ticker = market === "KR"
        ? `${stock.trim()}.KS`
        : stock.trim().toUpperCase();

      const res = await fetch(`/api/dividend?ticker=${encodeURIComponent(ticker)}`);

      // JSON 파싱 실패 방지: 응답이 JSON이 아닐 수 있음
      let data: any;
      try {
        data = await res.json();
      } catch {
        setError("서버 응답을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!res.ok || data?.error) {
        setError(data?.error ?? "데이터를 가져올 수 없습니다. 티커를 확인해 주세요.");
        return;
      }

      const taxRate     = TAX_RATE[market];
      const dps         = data.dps ?? 0;
      const grossAmount = dps * +qty;

      setResult({
        stock:        data.name ?? stock.trim(),
        quantity:     +qty,
        purchaseDate: date,
        market,
        dps,
        exDate:       data.exDate      ?? "미정",
        paymentDate:  data.paymentDate ?? "미정",
        grossAmount,
        netAmount:    grossAmount * (1 - taxRate),
        taxRate,
        currency:     data.currency ?? (market === "KR" ? "KRW" : "USD"),
      });

      // 배당 데이터 없는 종목 안내
      if (dps === 0) {
        setError("⚠️ 이 종목은 최근 배당 데이터가 없습니다. 배당락일/지급일은 참고용입니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const placeholder = market === "KR"
    ? "한국 종목코드 입력 (예: 005930)"
    : "미국 티커 입력 (예: AAPL)";

  const hint = market === "KR"
    ? "💡 삼성전자 → 005930 · SK하이닉스 → 000660 · NAVER → 035420"
    : "💡 Apple → AAPL · Microsoft → MSFT · Coca-Cola → KO";

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">

        {/* 종목 입력 */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-toss-label">
            종목 코드 (티커)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-toss-sub" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
              placeholder={placeholder}
              className="toss-input pl-10"
            />
          </div>
          <p className="text-[11px] text-toss-sub px-1">{hint}</p>

          {/* 시장 선택 */}
          <div className="flex gap-2 pt-0.5">
            {(["KR", "US"] as Market[]).map((m) => (
              <button key={m} onClick={() => { setMarket(m); setError(""); setResult(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                            border transition-all duration-150
                            ${market === m
                              ? "border-toss-blue bg-toss-blue text-white"
                              : "border-toss-border text-toss-label bg-white"}`}>
                {m === "KR" ? "🇰🇷 한국 (KRX)" : "🇺🇸 미국 (NYSE/NASDAQ)"}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-toss-border" />

        {/* 수량 + 날짜 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-toss-label">보유 수량</label>
            <div className="relative">
              <input type="number" min={1} value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0" className="toss-input pr-10" />
              <span className="absolute inset-y-0 right-4 flex items-center text-[13px] text-toss-sub font-medium pointer-events-none">주</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-toss-label">매수 예정일</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="toss-input" />
          </div>
        </div>

        {/* 세율 안내 */}
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl
          ${market === "KR" ? "bg-blue-50" : "bg-green-50"}`}>
          <svg className={`w-4 h-4 flex-shrink-0 ${market === "KR" ? "text-toss-blue" : "text-green-700"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          <span className={`text-[13px] font-medium ${market === "KR" ? "text-toss-blue" : "text-green-700"}`}>
            {market === "KR" ? "한국 배당소득세 15.4% 자동 적용" : "미국 배당소득세 15% 자동 적용 (원천징수)"}
          </span>
        </div>

        {/* 에러 */}
        {error && (
          <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-50">
            <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
            <p className="text-[13px] text-red-500 font-medium">{error}</p>
          </div>
        )}

        {/* CTA */}
        <button onClick={handleCalculate} disabled={loading}
          className="w-full bg-toss-blue hover:bg-toss-blueDark active:scale-[0.98] disabled:opacity-60
                     text-white font-bold text-[16px] py-4 rounded-2xl shadow-md
                     transition-all duration-150 flex items-center justify-center gap-2">
          {loading ? <><Spinner />데이터 불러오는 중...</> : "배당 수익 계산하기"}
        </button>
      </div>

      {result && <ResultCard result={result} />}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white mr-1" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 00-10 10h4z" />
    </svg>
  );
}
