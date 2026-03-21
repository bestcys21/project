"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

type Period = "1M" | "3M" | "1Y";

interface ChartPoint { date: string; price: number; }

interface Props {
  ticker:        string;          // e.g. "005930.KS" or "AAPL"
  stockName?:    string;
  currency?:     string;          // "KRW" | "USD"
  dividendYield?: number | null;  // 0~1 소수 (e.g. 0.035)
}

const PERIOD_LABELS: Record<Period, string> = { "1M": "1개월", "3M": "3개월", "1Y": "1년" };

function formatPrice(price: number, currency: string) {
  if (currency === "USD") return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${Math.round(price).toLocaleString("ko-KR")}원`;
}

function formatDate(dateStr: string, period: Period) {
  const d = new Date(dateStr);
  if (period === "1M") return `${d.getMonth() + 1}/${d.getDate()}`;
  if (period === "3M") return `${d.getMonth() + 1}/${d.getDate()}`;
  return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const price: number = payload[0]?.value;
  return (
    <div className="bg-toss-card border border-toss-border rounded-xl px-3 py-2 shadow-lg text-left">
      <p className="text-[11px] text-toss-sub mb-0.5">{label}</p>
      <p className="text-[14px] font-bold text-toss-text">{formatPrice(price, currency ?? "KRW")}</p>
    </div>
  );
}

export default function StockPriceChart({ ticker, stockName, currency = "KRW", dividendYield }: Props) {
  const [period,  setPeriod]  = useState<Period>("1Y");
  const [points,  setPoints]  = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const fetchChart = useCallback(async (t: string, p: Period) => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch(`/api/chart?ticker=${encodeURIComponent(t)}&period=${p}`);
      const data = await res.json();
      if (!res.ok || data.error || !data.points?.length) { setError(true); return; }
      setPoints(data.points);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ticker) fetchChart(ticker, period);
  }, [ticker, period, fetchChart]);

  // 등락률 계산
  const first = points[0]?.price ?? null;
  const last  = points[points.length - 1]?.price ?? null;
  const changeRate = first && last ? ((last - first) / first) * 100 : null;
  const isUp = changeRate != null && changeRate >= 0;

  // X축 라벨 간격 조정
  const tickCount = period === "1M" ? 5 : period === "3M" ? 6 : 6;
  const step = points.length > 0 ? Math.max(1, Math.floor(points.length / tickCount)) : 1;
  const ticks = points.filter((_, i) => i % step === 0 || i === points.length - 1).map(p => p.date);

  // Y축 범위
  const prices = points.map(p => p.price);
  const minP   = prices.length ? Math.min(...prices) : 0;
  const maxP   = prices.length ? Math.max(...prices) : 0;
  const pad    = (maxP - minP) * 0.08 || maxP * 0.05 || 1;
  const yMin   = Math.max(0, minP - pad);
  const yMax   = maxP + pad;

  return (
    <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-bold text-toss-text">
            {stockName ? `${stockName} 주가` : "주가 차트"}
          </p>
          {!loading && !error && changeRate != null && (
            <p className={`text-[12px] font-semibold mt-0.5 ${isUp ? "text-red-500" : "text-blue-500"}`}>
              {isUp ? "▲" : "▼"} {Math.abs(changeRate).toFixed(2)}%
              <span className="text-toss-sub font-normal ml-1.5">({PERIOD_LABELS[period]})</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 배당수익률 뱃지 */}
          {dividendYield != null && dividendYield > 0 && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-toss-blue">
              배당률 {(dividendYield * 100).toFixed(2)}%
            </span>
          )}
          {/* 기간 필터 */}
          <div className="flex bg-toss-bg rounded-lg p-0.5">
            {(["1M", "3M", "1Y"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all
                  ${period === p
                    ? "bg-toss-card text-toss-blue shadow-sm"
                    : "text-toss-sub hover:text-toss-label"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 차트 영역 */}
      {loading ? (
        <div className="h-[160px] flex items-center justify-center">
          <span className="w-5 h-5 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <div className="h-[160px] flex flex-col items-center justify-center text-toss-sub space-y-1">
          <p className="text-[13px]">주가 데이터를 불러올 수 없어요.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #F2F4F6)" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={(v) => formatDate(v, period)}
              tick={{ fontSize: 10, fill: "var(--color-sub, #8B95A1)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v) => currency === "USD"
                ? `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
                : v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()}
              tick={{ fontSize: 10, fill: "var(--color-sub, #8B95A1)" }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickCount={4}
            />
            <Tooltip
              content={<CustomTooltip currency={currency} />}
              cursor={{ stroke: "#2563EB", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            {/* 시작가 기준선 */}
            {first != null && (
              <ReferenceLine
                y={first}
                stroke="#D1D5DB"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* 현재가 */}
      {!loading && !error && last != null && (
        <p className="text-[11px] text-toss-sub text-right">
          현재가 <span className="font-bold text-toss-text">{formatPrice(last, currency)}</span>
        </p>
      )}
    </div>
  );
}
