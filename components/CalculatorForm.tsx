"use client";

import { useState } from "react";
import { Market, DividendResult, calculateDividend } from "@/lib/calculator";
import ResultCard from "./ResultCard";

export default function CalculatorForm() {
  const today = new Date().toISOString().split("T")[0];

  const [stock,    setStock]    = useState("");
  const [quantity, setQuantity] = useState("");
  const [date,     setDate]     = useState(today);
  const [market,   setMarket]   = useState<Market>("KR");
  const [result,   setResult]   = useState<DividendResult | null>(null);
  const [error,    setError]    = useState("");

  function handleCalculate() {
    setError("");
    if (!stock.trim())      return setError("종목명을 입력해 주세요.");
    if (!quantity || +quantity <= 0) return setError("수량을 1주 이상 입력해 주세요.");
    if (!date)              return setError("매수 예정일을 선택해 주세요.");

    setResult(
      calculateDividend({
        stock: stock.trim(),
        quantity: +quantity,
        purchaseDate: date,
        market,
      })
    );
  }

  const taxLabel = market === "KR" ? "한국 배당소득세 15.4% 자동 적용" : "미국 배당소득세 15% 자동 적용 (원천징수)";

  return (
    <div className="space-y-5">
      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">

        {/* 종목 */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-toss-label">
            종목명 또는 티커
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
              placeholder="예: 삼성전자 / AAPL"
              className="toss-input pl-10"
            />
          </div>

          {/* 시장 선택 칩 */}
          <div className="flex gap-2 pt-1">
            {(["KR", "US"] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                            border transition-all duration-150
                            ${market === m
                              ? "border-toss-blue bg-toss-blue text-white"
                              : "border-toss-border text-toss-label bg-white"
                            }`}
              >
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
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="toss-input pr-10"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-[13px] text-toss-sub font-medium pointer-events-none">
                주
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-toss-label">매수 예정일</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="toss-input"
            />
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
            {taxLabel}
          </span>
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-[13px] text-red-500 font-medium">{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleCalculate}
          className="w-full bg-toss-blue hover:bg-toss-blueDark active:scale-[0.98]
                     text-white font-bold text-[16px] py-4 rounded-2xl
                     shadow-md transition-all duration-150"
        >
          배당 수익 계산하기
        </button>
      </div>

      {/* 결과 카드 */}
      {result && <ResultCard result={result} />}
    </div>
  );
}
