"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Market, DividendResult } from "@/lib/calculator";
import { StockItem } from "@/lib/stocks";
import { loadMasterDB, searchMaster, MasterItem, StockType } from "@/lib/master-search";
import StockLogo from "./StockLogo";
import ResultCard from "./ResultCard";

// 시장별 인기 종목 빠른 선택
const POPULAR_KR: Record<"인기" | "고배당" | "ETF", Array<{ ticker: string; name: string; exchange: "KS" | "KQ"; type: "stock" | "etf" | "reit" }>> = {
  인기:   [
    { ticker: "005930", name: "삼성전자",     exchange: "KS", type: "stock" },
    { ticker: "000660", name: "SK하이닉스",   exchange: "KS", type: "stock" },
    { ticker: "005490", name: "POSCO홀딩스",  exchange: "KS", type: "stock" },
    { ticker: "105560", name: "KB금융",       exchange: "KS", type: "stock" },
    { ticker: "017670", name: "SK텔레콤",     exchange: "KS", type: "stock" },
    { ticker: "088980", name: "맥쿼리인프라", exchange: "KS", type: "reit"  },
  ],
  고배당: [
    { ticker: "033780", name: "KT&G",         exchange: "KS", type: "stock" },
    { ticker: "055550", name: "신한지주",      exchange: "KS", type: "stock" },
    { ticker: "086790", name: "하나금융지주",  exchange: "KS", type: "stock" },
    { ticker: "010950", name: "S-Oil",         exchange: "KS", type: "stock" },
    { ticker: "293940", name: "신한알파리츠",  exchange: "KS", type: "reit"  },
    { ticker: "395400", name: "SK리츠",        exchange: "KS", type: "reit"  },
  ],
  ETF: [
    { ticker: "476550", name: "TIGER 미국배당+7%",  exchange: "KS", type: "etf" },
    { ticker: "458730", name: "TIGER 미국배당",      exchange: "KS", type: "etf" },
    { ticker: "091160", name: "KODEX 고배당",         exchange: "KS", type: "etf" },
    { ticker: "446720", name: "SOL 미국배당",         exchange: "KS", type: "etf" },
    { ticker: "479850", name: "ACE 미국배당",         exchange: "KS", type: "etf" },
    { ticker: "329200", name: "TIGER 리츠부동산",     exchange: "KS", type: "etf" },
  ],
};

const POPULAR_US: Record<"인기" | "고배당" | "ETF", Array<{ ticker: string; name: string; type: "stock" | "etf" | "reit" }>> = {
  인기:   [
    { ticker: "AAPL",  name: "Apple",          type: "stock" },
    { ticker: "MSFT",  name: "Microsoft",      type: "stock" },
    { ticker: "NVDA",  name: "NVIDIA",         type: "stock" },
    { ticker: "JNJ",   name: "J&J",            type: "stock" },
    { ticker: "KO",    name: "Coca-Cola",      type: "stock" },
    { ticker: "O",     name: "Realty Income",  type: "reit"  },
  ],
  고배당: [
    { ticker: "T",     name: "AT&T",           type: "stock" },
    { ticker: "MO",    name: "Altria",         type: "stock" },
    { ticker: "ABBV",  name: "AbbVie",         type: "stock" },
    { ticker: "EPD",   name: "Enterprise Prod",type: "stock" },
    { ticker: "NLY",   name: "Annaly Capital", type: "reit"  },
    { ticker: "MAIN",  name: "Main Street Cap",type: "stock" },
  ],
  ETF: [
    { ticker: "JEPI",  name: "JEPI",    type: "etf" },
    { ticker: "JEPQ",  name: "JEPQ",    type: "etf" },
    { ticker: "SCHD",  name: "SCHD",    type: "etf" },
    { ticker: "QYLD",  name: "QYLD",    type: "etf" },
    { ticker: "VYM",   name: "VYM",     type: "etf" },
    { ticker: "HDV",   name: "HDV",     type: "etf" },
  ],
};
import StockPriceChart from "./StockPriceChart";
import Toast from "./Toast";

const TAX_RATE: Record<Market, number> = { KR: 0.154, US: 0.15 };

/** Map MasterItem → StockItem */
function toStockItem(m: MasterItem): StockItem {
  return { ticker: m.ticker, name: m.name, market: m.market as Market, exchange: m.exchange, type: m.type };
}

/** Badge color + label for stock type */
const TYPE_CONFIG: Record<StockType, { label: string; cls: string }> = {
  stock: { label: "주식", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  etf:   { label: "ETF",  cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  reit:  { label: "리츠", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

export default function CalculatorForm() {
  const today = new Date().toISOString().split("T")[0];

  const [query,         setQuery]         = useState("");
  const [ticker,        setTicker]        = useState("");
  const [exchange,      setExchange]      = useState<"KS" | "KQ" | undefined>(undefined);
  const [qty,           setQty]           = useState("");
  const [date,          setDate]          = useState(today);
  const [market,        setMarket]        = useState<Market>("KR");
  const [result,        setResult]        = useState<DividendResult | null>(null);
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [suggestions,   setSuggestions]   = useState<StockItem[]>([]);
  const [showDrop,      setShowDrop]      = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(-1);
  const [searching,     setSearching]     = useState(false);
  const [masterDB,      setMasterDB]      = useState<MasterItem[]>([]);
  const [chartTicker,   setChartTicker]   = useState("");
  const [chartCurrency, setChartCurrency] = useState("KRW");
  const [dividendYield, setDividendYield] = useState<number | null>(null);
  const [popularTab,    setPopularTab]    = useState<"인기" | "고배당" | "ETF">("인기");
  const [showToast,     setShowToast]     = useState(false);

  const wrapRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load master DB once on mount
  useEffect(() => {
    loadMasterDB().then(setMasterDB).catch(console.error);
  }, []);

  // Outside click → close dropdown
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDrop(false); setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    setTicker("");
    setError("");
    setResult(null);
    setActiveIdx(-1);

    if (!val.trim()) {
      setSuggestions([]);
      setShowDrop(false);
      setSearching(false);
      if (searchRef.current) clearTimeout(searchRef.current);
      return;
    }

    if (market === "KR") {
      // 1) 로컬 마스터 DB 즉시 검색
      const localResults = searchMaster(masterDB, val).map(toStockItem);
      setSuggestions(localResults);
      setShowDrop(true);

      // 2) Yahoo Finance API 병합 (마스터 DB에 없는 종목 fallback)
      if (searchRef.current) clearTimeout(searchRef.current);
      setSearching(true);
      searchRef.current = setTimeout(async () => {
        try {
          const res  = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}&market=KR`);
          const data = await res.json();
          const api: StockItem[] = (data.results ?? []).map((r: any) => ({
            ticker: r.ticker, name: r.name, market: "KR" as Market, exchange: r.exchange, type: r.type ?? "stock",
          }));
          setSuggestions((prev) => {
            const seen = new Set(prev.map((s) => s.ticker));
            const merged = [...prev, ...api.filter((a) => !seen.has(a.ticker))];
            return merged.slice(0, 20);
          });
          setShowDrop(true);
        } catch { /* ignore */ } finally {
          setSearching(false);
        }
      }, 400);
    } else {
      // US: Yahoo Finance via API (debounced)
      setSuggestions([]);
      setShowDrop(true);
      setSearching(true);
      if (searchRef.current) clearTimeout(searchRef.current);
      searchRef.current = setTimeout(async () => {
        try {
          const res  = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}&market=US`);
          const data = await res.json();
          const api: StockItem[] = (data.results ?? []).map((r: any) => ({
            ticker: r.ticker, name: r.name, market: "US" as Market, exchange: r.exchange, type: r.type ?? "stock",
          }));
          setSuggestions(api.slice(0, 20));
          setShowDrop(true);
        } catch { /* ignore */ } finally {
          setSearching(false);
        }
      }, 250);
    }
  }, [market, masterDB]);

  function handleSelect(item: StockItem) {
    setQuery(item.name);
    setTicker(item.ticker);
    setExchange(item.exchange);
    setSuggestions([]);
    setShowDrop(false);
    setActiveIdx(-1);
    const apiTicker = market === "KR"
      ? `${item.ticker}.${item.exchange ?? "KS"}`
      : item.ticker.toUpperCase();
    setChartTicker(apiTicker);
    setChartCurrency(market === "KR" ? "KRW" : "USD");
    setDividendYield(null);
    // 차트 표시 시 배당수익률 즉시 노출 (계산 전에도)
    fetch(`/api/dividend?ticker=${encodeURIComponent(apiTicker)}`)
      .then(r => r.json())
      .then(d => { if (d.dividendYield != null) setDividendYield(d.dividendYield); })
      .catch(() => {});
  }

  function handleMarketChange(m: Market) {
    setMarket(m);
    setQuery(""); setTicker(""); setExchange(undefined);
    setError(""); setResult(null); setSuggestions([]);
    setShowDrop(false); setActiveIdx(-1);
    setChartTicker(""); setDividendYield(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDrop || suggestions.length === 0) {
      if (e.key === "Enter") handleCalculate();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0) handleSelect(suggestions[activeIdx]);
      else { setShowDrop(false); handleCalculate(); }
    } else if (e.key === "Escape") {
      setShowDrop(false); setActiveIdx(-1);
    }
  }

  async function handleCalculate() {
    setError(""); setResult(null);
    if (!query.trim())     return setError("종목명을 입력해 주세요.");
    if (!qty || +qty <= 0) return setError("수량을 1주 이상 입력해 주세요.");
    if (!date)             return setError("매수 예정일을 선택해 주세요.");

    const rawTicker = ticker || query.trim();
    const apiTicker = market === "KR"
      ? (rawTicker.includes(".") ? rawTicker : `${rawTicker}.${exchange ?? "KS"}`)
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
        stock:        query.trim() || (data.name ?? ticker),
        quantity:     +qty,
        purchaseDate: date,
        market,
        dps, exDate,
        paymentDate:  payDate,
        grossAmount,
        netAmount:    grossAmount * (1 - taxRate),
        taxRate,
        currency:     data.currency ?? (market === "KR" ? "KRW" : "USD"),
        eligible,
      });

      if (data.dividendYield != null) setDividendYield(data.dividendYield);
      if (!chartTicker) { setChartTicker(apiTicker); setChartCurrency(market === "KR" ? "KRW" : "USD"); }
      if (dps === 0) setError("⚠️ 이 종목은 최근 배당 데이터가 없거나 배당을 지급하지 않습니다.");
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function handleAddAnother() {
    setQuery(""); setTicker(""); setExchange(undefined);
    setQty(""); setResult(null); setError("");
    setChartTicker(""); setDividendYield(null);
    setSuggestions([]); setShowDrop(false);
  }

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

      {/* ── 좌측: 입력 폼 ── */}
      <div className="space-y-5">
      <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-5">

        {/* 시장 선택 — 최상위 개념 */}
        <div className="flex gap-2 items-center">
          {(["KR", "US"] as Market[]).map((m) => (
            <button key={m}
              onClick={() => handleMarketChange(m)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold
                          border transition-all duration-150
                          ${market === m
                            ? "border-toss-blue bg-toss-blue text-white shadow-sm"
                            : "border-toss-border text-toss-label bg-toss-card hover:border-toss-blue hover:text-toss-blue"}`}
            >
              {m === "KR" ? "한국주식" : "미국주식"}
            </button>
          ))}
        </div>

        {/* 종목 검색 */}
        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-toss-text">종목명</label>

          <div ref={wrapRef} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              onKeyDown={handleKeyDown}
              placeholder="종목명, 코드, 초성으로 검색"
              className="toss-input"
              autoComplete="off"
            />

            {showDrop && (suggestions.length > 0 || searching) && (
              <ul className="absolute z-50 left-0 right-0 top-[calc(100%+6px)]
                             bg-toss-card border border-toss-border rounded-2xl
                             shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden max-h-[320px] overflow-y-auto">
                {searching && suggestions.length === 0 && (
                  <li className="px-4 py-3 text-[13px] text-toss-sub flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
                    검색 중...
                  </li>
                )}
                {suggestions.map((item, i) => {
                  const typeCfg = TYPE_CONFIG[(item.type as StockType) ?? "stock"];
                  return (
                    <li key={`${item.ticker}-${i}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left
                                    transition-colors gap-3
                                    ${activeIdx === i ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-toss-bg"}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StockLogo ticker={item.ticker} name={item.name} market={item.market} size={34} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[14px] font-semibold text-toss-text truncate">
                                {item.name}
                              </span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${typeCfg.cls}`}>
                                {typeCfg.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-toss-sub font-medium">{item.ticker}</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 인기 종목 빠른 선택 (검색어 없을 때) */}
          {!query.trim() && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-toss-sub">빠른 선택</span>
                <div className="flex gap-1">
                  {(["인기", "고배당", "ETF"] as const).map((tab) => (
                    <button key={tab} onClick={() => setPopularTab(tab)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors
                        ${popularTab === tab
                          ? "bg-toss-blue text-white"
                          : "bg-toss-bg text-toss-sub hover:text-toss-blue"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(market === "KR"
                  ? POPULAR_KR[popularTab]
                  : POPULAR_US[popularTab]
                ).map((s) => {
                  const typeCls =
                    s.type === "etf"  ? "border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-300" :
                    s.type === "reit" ? "border-amber-200  text-amber-700  dark:border-amber-700  dark:text-amber-300"  :
                                        "border-toss-border text-toss-label";
                  return (
                    <button key={s.ticker}
                      onClick={() => handleSelect({
                        ticker:   s.ticker,
                        name:     s.name,
                        market,
                        exchange: (s as any).exchange,
                        type:     s.type,
                      })}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border
                                  bg-toss-card hover:bg-toss-bg transition-colors ${typeCls}`}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        <hr className="border-toss-border" />

        {/* 수량 + 날짜 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-toss-text">보유 수량</label>
            <div className="relative">
              <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                className="toss-input pr-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
              <span className="absolute inset-y-0 right-3 flex items-center text-[13px]
                               text-toss-sub font-medium pointer-events-none">주</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-toss-text">매수 예정일</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="toss-input" />
          </div>
        </div>

        {/* 세율 안내 */}
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border
          ${market === "KR"
            ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
            : "bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"}`}>
          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${market === "KR" ? "text-blue-400" : "text-green-500"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          <span className={`text-[12px] font-medium ${market === "KR" ? "text-blue-500 dark:text-blue-400" : "text-green-600 dark:text-green-400"}`}>
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
        <button onClick={handleCalculate} disabled={loading}
          className="w-full bg-toss-blue hover:bg-toss-blueDark active:scale-[0.98] disabled:opacity-60
                     text-white font-bold text-[16px] py-4 rounded-2xl
                     transition-all duration-150 flex items-center justify-center gap-2">
          {loading ? <><Spinner />계산 중...</> : "내 배당금 계산하기"}
        </button>
      </div>
      </div>{/* end 좌측 폼 col */}

      {/* ── 우측: 결과 카드 + 차트 (sticky) ── */}
      <div className="mt-5 lg:mt-0 lg:sticky lg:top-24 space-y-4">
        {result && (
          <ResultCard
            result={result}
            ticker={ticker || undefined}
            exchange={exchange}
            onAdded={() => setShowToast(true)}
            onAddAnother={handleAddAnother}
          />
        )}
        {chartTicker && (
          <StockPriceChart ticker={chartTicker} stockName={query.trim() || undefined}
            currency={chartCurrency} dividendYield={dividendYield} />
        )}
        {!result && !chartTicker && (
          <div className="hidden lg:flex bg-toss-card rounded-2xl shadow-card
                          items-center justify-center min-h-[320px] text-center
                          border border-dashed border-toss-border">
            <div className="space-y-3 px-8">
              <p className="text-5xl">📊</p>
              <p className="text-[16px] font-bold text-toss-text">계산 결과가 여기에 표시돼요</p>
              <p className="text-[13px] text-toss-sub leading-relaxed">
                종목을 선택하고 수량·매수일 입력 후<br />계산하기 버튼을 눌러보세요
              </p>
            </div>
          </div>
        )}
      </div>

    <Toast
      visible={showToast}
      message="종목이 추가되었습니다."
      sub="현재 기기에 임시 보관됨"
      onClose={() => setShowToast(false)}
    />
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
