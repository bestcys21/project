"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  AreaChart, Area, LineChart, Line, Legend,
} from "recharts";
import { MonthlyDividend } from "@/lib/types";

// 종목별 색상 팔레트
export const STOCK_COLORS = [
  "#3182F6", "#FF6B6B", "#4ECDC4", "#FFE66D",
  "#A78BFA", "#F97316", "#10B981", "#EC4899",
];

interface StackedData {
  month: string;
  total: number;
  [ticker: string]: number | string;
}

export type ChartPeriod = "N12M" | "THIS_YEAR" | "LAST_YEAR";

interface Props {
  data: MonthlyDividend[];
  stackedData?: StackedData[];
  tickers?: string[];
  period?: ChartPeriod;
  onPeriodChange?: (p: ChartPeriod) => void;
}

function fmt(v: number) {
  if (v === 0) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}백만`;
  if (v >= 10_000)    return `${(v / 10_000).toFixed(0)}만`;
  return v.toLocaleString("ko-KR");
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-toss-card rounded-xl shadow-card px-4 py-3 border border-toss-border text-[13px] min-w-[150px]">
      <p className="font-bold text-toss-text mb-2">{label}</p>
      {payload.map((p: any) =>
        p.value > 0 ? (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.fill }} className="font-medium truncate max-w-[80px]">{p.dataKey}</span>
            <span className="text-toss-text font-semibold">{Math.round(p.value).toLocaleString("ko-KR")}원</span>
          </div>
        ) : null
      )}
      {payload.length > 1 && total > 0 && (
        <div className="flex justify-between gap-4 border-t border-toss-border mt-2 pt-2">
          <span className="text-toss-label font-semibold">합계</span>
          <span className="text-toss-blue font-bold">{Math.round(total).toLocaleString("ko-KR")}원</span>
        </div>
      )}
    </div>
  );
}

function CumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-toss-card rounded-xl shadow-card px-4 py-3 border border-toss-border text-[13px] min-w-[150px]">
      <p className="font-bold text-toss-text mb-2">{label} 누적</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.stroke ?? p.fill }} className="font-medium">{p.dataKey === "total" ? "전체" : p.dataKey}</span>
          <span className="text-toss-text font-semibold">{Math.round(p.value).toLocaleString("ko-KR")}원</span>
        </div>
      ))}
    </div>
  );
}

export default function DividendChart({ data, stackedData, tickers, period = "N12M", onPeriodChange }: Props) {
  const [view, setView] = useState<"monthly" | "cumulative">("monthly");

  // 기간별 데이터 재정렬
  const displayedStackedData = useMemo(() => {
    if (!stackedData) return stackedData;
    const currentMonthIdx = new Date().getMonth(); // 0-indexed
    if (period === "N12M") {
      // 현재 월부터 향후 12개월 순환
      return [
        ...stackedData.slice(currentMonthIdx),
        ...stackedData.slice(0, currentMonthIdx),
      ];
    }
    if (period === "LAST_YEAR") {
      // 1년 전부터 현재 월까지 (currentMonthIdx+1 시작, 현재월로 끝)
      const startIdx = (currentMonthIdx + 1) % 12;
      return [
        ...stackedData.slice(startIdx),
        ...stackedData.slice(0, startIdx),
      ];
    }
    // THIS_YEAR: 1월부터 12월 그대로
    return stackedData;
  }, [stackedData, period]);

  if (!displayedStackedData || !tickers || tickers.length === 0) {
    // 단일 차트 fallback
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--toss-border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--toss-sub)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--toss-sub)" }} axisLine={false} tickLine={false}
            tickFormatter={fmt} width={42} />
          <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--toss-bg)" }} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => <Cell key={i} fill={STOCK_COLORS[i % STOCK_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 누적 데이터 계산
  const cumulativeData = displayedStackedData.reduce<{ month: string; total: number; [k: string]: number | string }[]>(
    (acc, row) => {
      const prev = acc[acc.length - 1];
      const cumRow: any = { month: row.month };
      let cumTotal = prev ? (prev.total as number) : 0;
      tickers.forEach((t) => {
        const prevTicker = prev ? (prev[t] as number ?? 0) : 0;
        cumRow[t] = prevTicker + (row[t] as number ?? 0);
      });
      cumTotal += row.total;
      cumRow.total = cumTotal;
      acc.push(cumRow);
      return acc;
    },
    []
  );

  const maxMonth = displayedStackedData.reduce((a, b) => (a.total > b.total ? a : b), displayedStackedData[0]);
  const annualTotal = displayedStackedData.reduce((s, r) => s + r.total, 0);
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3">
      {/* 뷰 탭 + 기간 필터 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex bg-toss-bg rounded-xl p-0.5">
          {(["monthly", "cumulative"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all
                ${view === v
                  ? "bg-toss-card text-toss-text shadow-sm"
                  : "text-toss-sub hover:text-toss-label"}`}
            >
              {v === "monthly" ? "월별 배당" : "누적 배당"}
            </button>
          ))}
        </div>

        {/* 기간 필터 */}
        {onPeriodChange && (
          <div className="flex bg-toss-bg rounded-xl p-0.5">
            {([
              ["N12M",      "향후 12개월"],
              ["THIS_YEAR", `${currentYear}년 기준`],
              ["LAST_YEAR", "최근 1년"],
            ] as [ChartPeriod, string][]).map(([p, label]) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap
                  ${period === p
                    ? "bg-toss-blue text-white shadow-sm"
                    : "text-toss-sub hover:text-toss-label"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {annualTotal > 0 && !onPeriodChange && (
          <p className="text-[13px] text-toss-sub">
            합계 <span className="text-toss-blue font-bold">{Math.round(annualTotal).toLocaleString("ko-KR")}원</span>
          </p>
        )}
      </div>

      {/* 월별 배당 — 스택 바 */}
      {view === "monthly" && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={displayedStackedData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--toss-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--toss-sub)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--toss-sub)" }} axisLine={false} tickLine={false}
              tickFormatter={fmt} width={42} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--toss-bg)" }} />
            <ReferenceLine x={maxMonth.month} stroke="var(--toss-blue)" strokeDasharray="4 2" strokeWidth={1.5} />
            {tickers.map((ticker, i) => (
              <Bar key={ticker} dataKey={ticker} stackId="a"
                fill={STOCK_COLORS[i % STOCK_COLORS.length]}
                radius={i === tickers.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={40} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* 누적 배당 — 에리어 차트 */}
      {view === "cumulative" && (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cumulativeData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3182F6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3182F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--toss-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--toss-sub)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--toss-sub)" }} axisLine={false} tickLine={false}
              tickFormatter={fmt} width={42} />
            <Tooltip content={<CumTooltip />} cursor={{ stroke: "var(--toss-blue)", strokeWidth: 1, strokeDasharray: "4 2" }} />
            {tickers.length > 1
              ? tickers.map((ticker, i) => (
                  <Area key={ticker} type="monotone" dataKey={ticker}
                    stroke={STOCK_COLORS[i % STOCK_COLORS.length]}
                    fill="transparent" strokeWidth={2} dot={false} />
                ))
              : null}
            <Area type="monotone" dataKey="total"
              stroke="#3182F6" fill="url(#cumGrad)" strokeWidth={2.5}
              dot={{ r: 3, fill: "#3182F6", strokeWidth: 0 }}
              activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
