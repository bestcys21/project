"use client";

import { useState, useRef, useEffect } from "react";
import { Market, DividendResult } from "@/lib/calculator";
import { searchStocks, StockItem } from "@/lib/stocks";
import StockLogo from "./StockLogo";
import ResultCard from "./ResultCard";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

export default function CalculatorForm() {
  const today = new Date().toISOString().split("T")[0];

  const [query,       setQuery]       = useState("");
  const [ticker,      setTicker]      = useState("");
  const [exchange,    setExchange]    = useState<"KS" | "KQ" | undefined>(undefined);
  const [showUSTip,   setShowUSTip]   = useState(false);
  const [qty,         setQty]         = useState("");
  const [date,        setDate]        = useState(today);
  const [market,      setMarket]      = useState<Market>("KR");
  const [result,      setResult]      = useState<DividendResult | null>(null);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState<StockItem[]>([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [searching,   setSearching]   = useState(false);

  const wrapRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    setTicker("");
    setError("");
    setResult(null);
    setActiveIdx(-1);

    // 로컬 결과 즉시 표시
    const local = searchStocks(val, market);
    setSuggestions(local);
    setShowDrop(local.length > 0 || val.trim().length > 0);

    // debounce로 Yahoo Finance API 검색 병합
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!val.trim()) { setSearching(false); return; }

    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}&market=${market}`);
        const data = await res.json();
        const api: StockItem[] = (data.results ?? []).map((r: any) => ({
          ticker: r.ticker, name: r.name, market, exchange: r.exchange,
        }));
        setSuggestions((prev) => {
          const seen = new Set(prev.map((s) => s.ticker));
          const merged = [...prev, ...api.filter((a) => !seen.has(a.ticker))];
          return merged.slice(0, 20);
        });
        setShowDrop(true);
      } catch { /* 무시 */ } finally {
        setSearching(false);
      }
    }, 400);
  }

  function handleSelect(item: StockItem) {
    setQuery(item.name);
    setTicker(item.ticker);
    setExchange(item.exchange);
    setSuggestions([]);
    setShowDrop(false);
    setActiveIdx(-1);
  }

  function handleMarketChange(m: Market) {
    setMarket(m);
    setQuery("");
    setTicker("");
    setExchange(undefined);
    setError("");
    setResult(null);
    setSuggestions([]);
    setShowDrop(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDrop || suggestions.length === 0) {
      if (e.key === "Enter") handleCalculate();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0) handleSelect(suggestions[activeIdx]);
      else { setShowDrop(false); handleCalculate(); }
    } else if (e.key === "Escape") {
      setShowDrop(false);
      setActiveIdx(-1);
    }
  }

  async function handleCalculate() {
    setError("");
    setResult(null);
    if (!query.trim())       return setError("종목명을 입력해 주세요.");
    if (!qty || +qty <= 0)   return setError("수량을 1주 이상 입력해 주세요.");
    if (!date)               return setError("매수 예정일을 선택해 주세요.");

    const rawTicker = ticker || query.trim();
    const apiTicker = market === "KR"
      ? (rawTicker.includes(".")
          ? rawTicker
          : `${rawTicker}.${exchange ?? "KS"}`)  // 검색에서 exchange 정보 활용, 없으면 .KS 기본
      : rawTicker.toUpperCase();

    setLoading(true);
    try {
      const res = await fetch(`/api/dividend?ticker=${encodeURIComponent(apiTicker)}`);
      let data: any;
      try { data = await res.json(); }
      catch { setError("서버 응답을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요."); return; }

      if (!res.ok || data?.error) {
        setError(data?.error ?? "데이터를 가져올 수 없습니다. 종목명이나 티커를 확인해 주세요.");
        return;
      }

      const taxRate     = TAX_RATE[market];
      const dps         = data.dps ?? 0;
      const exDate      = data.exDate      ?? "미정";
      const payDate     = data.paymentDate ?? "미정";
      const eligible    = isEligible(date, exDate);
      const grossAmount = eligible ? dps * +qty : 0;

      setResult({
        stock:        query.trim() || (data.name ?? ticker),  // 검색어(한국어 종목명) 우선 사용
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
        setError("⚠️ 이 종목은 최근 배당 데이터가 없거나 배당을 지급하지 않습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-5">

        {/* 종목 검색 */}
        <div className="space-y-2">
          <label className="block text-[13px] font-semibold text-toss-label">종목명</label>

          <div ref={wrapRef} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              onKeyDown={handleKeyDown}
              placeholder={market === "KR"
                ? "종목명 또는 코드 (예: 삼성전자, 005930)"
                : "종목명 또는 코드 (예: Apple, AAPL, JEPI)"}
              className="toss-input"
              autoComplete="off"
            />

            {showDrop && (suggestions.length > 0 || searching) && (
              <ul className="absolute z-50 left-0 right-0 top-[calc(100%+6px)]
                             bg-toss-card border border-toss-border rounded-2xl
                             shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                {searching && suggestions.length === 0 && (
                  <li className="px-4 py-3 text-[13px] text-toss-sub flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
                    검색 중...
                  </li>
                )}
                {suggestions.map((item, i) => (
                  <li key={`${item.ticker}-${i}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left
                                  transition-colors
                                  ${activeIdx === i ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-toss-bg"}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StockLogo ticker={item.ticker} name={item.name} market={item.market} size={34} />
                        <span className="text-[14px] font-semibold text-toss-text truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[12px] text-toss-sub font-medium ml-3 flex-shrink-0">
                        {item.ticker}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 시장 선택 */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => { handleMarketChange("KR"); setShowUSTip(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                          border transition-all duration-150
                          ${market === "KR"
                            ? "border-toss-blue bg-toss-blue text-white"
                            : "border-toss-border text-toss-label bg-toss-card hover:border-toss-blue hover:text-toss-blue"}`}
            >
              한국주식
            </button>

            {/* 미국주식 — 준비 중 툴팁 */}
            <div className="relative">
              <button
                onClick={() => { setShowUSTip((v) => !v); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                           border border-toss-border text-toss-sub bg-toss-card opacity-60 cursor-pointer"
              >
                미국주식
              </button>
              {showUSTip && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-48
                               bg-toss-text dark:bg-toss-card text-white dark:text-toss-text
                               text-[12px] font-medium px-3 py-2 rounded-xl shadow-lg
                               border border-toss-border whitespace-nowrap">
                  🚧 미국 주식 서비스 준비 중입니다
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="border-toss-border" />

        {/* 수량 + 날짜 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-toss-label">보유 수량</label>
            <div className="relative">
              <input
                type="number" min={1} value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0" className="toss-input pr-10"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-[13px]
                               text-toss-sub font-medium pointer-events-none">주</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-toss-label">매수 예정일</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="toss-input" />
          </div>
        </div>

        {/* 세율 안내 */}
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl
          ${market === "KR" ? "bg-blue-50 dark:bg-blue-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
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
          <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <span className="text-red-400 mt-0.5 flex-shrink-0 text-sm">⚠</span>
            <p className="text-[13px] text-red-500 font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full bg-toss-blue hover:bg-toss-blueDark active:scale-[0.98] disabled:opacity-60
                     text-white font-bold text-[16px] py-4 rounded-2xl
                     transition-all duration-150 flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner />계산 중...</> : "내 배당금 계산하기"}
        </button>
      </div>

      {result && <ResultCard result={result} />}
    </div>
  );
}

function isEligible(purchaseDateStr: string, exDateStr: string): boolean {
  if (exDateStr === "미정") return true;
  const pM = purchaseDateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  const eM = exDateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!pM || !eM) return true;
  return new Date(+pM[1], +pM[2] - 1, +pM[3]) < new Date(+eM[1], +eM[2] - 1, +eM[3]);
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 00-10 10h4z" />
    </svg>
  );
}
