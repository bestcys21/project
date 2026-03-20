"use client";

import { useState, useRef, useEffect } from "react";
import { Market, DividendResult } from "@/lib/calculator";
import { searchTickers, TickerItem } from "@/lib/tickers";
import ResultCard from "./ResultCard";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

export default function CalculatorForm() {
  const today = new Date().toISOString().split("T")[0];

  const [query,       setQuery]       = useState("");          // 입력창에 보이는 텍스트
  const [ticker,      setTicker]      = useState("");          // 실제 API에 넘길 티커
  const [qty,         setQty]         = useState("");
  const [date,        setDate]        = useState(today);
  const [market,      setMarket]      = useState<Market>("KR");
  const [result,      setResult]      = useState<DividendResult | null>(null);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState<TickerItem[]>([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    setTicker("");        // 직접 입력 중이면 선택 초기화
    setError("");
    setResult(null);
    const hits = searchTickers(val, market);
    setSuggestions(hits);
    setShowDrop(hits.length > 0);
  }

  function handleSelect(item: TickerItem) {
    setQuery(item.name);
    setTicker(item.ticker);
    setSuggestions([]);
    setShowDrop(false);
  }

  function handleMarketChange(m: Market) {
    setMarket(m);
    setQuery("");
    setTicker("");
    setError("");
    setResult(null);
    setSuggestions([]);
    setShowDrop(false);
  }

  async function handleCalculate() {
    setError("");
    setResult(null);

    if (!query.trim()) return setError("종목명을 입력해 주세요.");
    if (!qty || +qty <= 0) return setError("수량을 1주 이상 입력해 주세요.");
    if (!date) return setError("매수 예정일을 선택해 주세요.");

    // 자동완성으로 선택했으면 ticker 사용, 아니면 query를 티커로 간주
    const rawTicker = ticker || query.trim();
    const apiTicker =
      market === "KR"
        ? rawTicker.includes(".") ? rawTicker : `${rawTicker}.KS`
        : rawTicker.toUpperCase();

    setLoading(true);
    try {
      const res = await fetch(`/api/dividend?ticker=${encodeURIComponent(apiTicker)}`);

      let data: any;
      try {
        data = await res.json();
      } catch {
        setError("서버 응답을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!res.ok || data?.error) {
        setError(data?.error ?? "데이터를 가져올 수 없습니다. 종목명 또는 티커를 확인해 주세요.");
        return;
      }

      const taxRate     = TAX_RATE[market];
      const dps         = data.dps ?? 0;
      const exDate      = data.exDate      ?? "미정";
      const payDate     = data.paymentDate ?? "미정";
      const eligible    = isEligible(date, exDate);
      const grossAmount = eligible ? dps * +qty : 0;

      setResult({
        stock:        data.name ?? query.trim(),
        quantity:     +qty,
        purchaseDate: date,
        market,
        dps,
        exDate,
        paymentDate:  payDate,
        grossAmount,
        netAmount:    grossAmount * (1 - taxRate),
        taxRate,
        currency:     data.currency ?? (market === "KR" ? "KRW" : "USD"),
        eligible,
      });

      if (dps === 0) {
        setError("⚠️ 이 종목은 최근 배당 데이터가 없습니다. 배당락일/지급일은 참고용입니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  const placeholder =
    market === "KR"
      ? "종목명 또는 코드 검색 (예: 삼성전자)"
      : "종목명 또는 티커 검색 (예: Coca-Cola)";

  return (
    <div className="space-y-5">
      <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-5">

        {/* 종목 검색 */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-toss-label">
            종목명
          </label>

          <div ref={wrapRef} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowDrop(false); handleCalculate(); }
                if (e.key === "Escape") setShowDrop(false);
              }}
              placeholder={placeholder}
              className="toss-input"
              autoComplete="off"
            />

            {/* 자동완성 드롭다운 */}
            {showDrop && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 top-full mt-1.5
                             bg-toss-card border border-toss-border rounded-2xl
                             shadow-[0_8px_24px_rgba(0,0,0,0.10)] overflow-hidden">
                {suggestions.map((item) => (
                  <li key={item.ticker}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                      className="w-full flex items-center justify-between px-4 py-3
                                 hover:bg-toss-bg transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-toss-bg flex items-center justify-center
                                        text-[11px] font-bold text-toss-label flex-shrink-0">
                          {item.name.slice(0, 2)}
                        </div>
                        <span className="text-[14px] font-semibold text-toss-text">{item.name}</span>
                      </div>
                      <span className="text-[12px] text-toss-sub font-medium">{item.ticker}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 시장 선택 */}
          <div className="flex gap-2 pt-0.5">
            {(["KR", "US"] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => handleMarketChange(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                            border transition-all duration-150
                            ${market === m
                              ? "border-toss-blue bg-toss-blue text-white"
                              : "border-toss-border text-toss-label bg-toss-card"}`}
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
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                className="toss-input pr-10"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-[13px] text-toss-sub font-medium pointer-events-none">주</span>
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
          <svg
            className={`w-4 h-4 flex-shrink-0 ${market === "KR" ? "text-toss-blue" : "text-green-700"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
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
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full bg-toss-blue hover:bg-toss-blueDark active:scale-[0.98] disabled:opacity-60
                     text-white font-bold text-[16px] py-4 rounded-2xl shadow-md
                     transition-all duration-150 flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner />데이터 불러오는 중...</> : "배당 수익 계산하기"}
        </button>
      </div>

      {result && <ResultCard result={result} />}
    </div>
  );
}

/** 매수 예정일이 배당락일 전인지 확인 */
function isEligible(purchaseDateStr: string, exDateStr: string): boolean {
  if (exDateStr === "미정") return true;
  const pMatch = purchaseDateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  const eMatch = exDateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!pMatch || !eMatch) return true;
  const purchase = new Date(+pMatch[1], +pMatch[2] - 1, +pMatch[3]);
  const exDiv    = new Date(+eMatch[1], +eMatch[2] - 1, +eMatch[3]);
  return purchase < exDiv;
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white mr-1" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 00-10 10h4z" />
    </svg>
  );
}
