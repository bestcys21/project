"use client";

import { useState } from "react";
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

interface Props {
  data: MonthlyDividend[];
  stackedData?: StackedData[];
  tickers?: string[];
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
    <div className="bg-white rounded-xl shadow-card px-4 py-3 border border-toss-border text-[13px] min-w-[150px]">
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
    <div className="bg-white rounded-xl shadow-card px-4 py-3 border border-toss-border text-[13px] min-w-[150px]">
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

export default function DividendChart({ data, stackedData, tickers }: Props) {
  const [view, setView] = useState<"monthly" | "cumulative">("monthly");

  if (!stackedData || !tickers || tickers.length === 0) {
    // 단일 차트 fallback
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8B95A1" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#8B95A1" }} axisLine={false} tickLine={false}
            tickFormatter={fmt} width={42} />
          <Tooltip content={<BarTooltip />} cursor={{ fill: "#F2F4F6" }} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => <Cell key={i} fill={STOCK_COLORS[i % STOCK_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 누적 데이터 계산
  const cumulativeData = stackedData.reduce<{ month: string; total: number; [k: string]: number | string }[]>(
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

  const maxMonth = stackedData.reduce((a, b) => (a.total > b.total ? a : b), stackedData[0]);
  const annualTotal = stackedData.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-3">
      {/* 탭 + 연간 합계 */}
      <div className="flex items-center justify-between">
        <div className="flex bg-toss-bg rounded-xl p-0.5">
          {(["monthly", "cumulative"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all
                ${view === v
                  ? "bg-white text-toss-text shadow-sm"
                  : "text-toss-sub hover:text-toss-label"}`}
            >
              {v === "monthly" ? "월별 배당" : "누적 배당"}
            </button>
          ))}
        </div>
        {annualTotal > 0 && (
          <p className="text-[13px] text-toss-sub">
            연간 합계 <span className="text-toss-blue font-bold">{Math.round(annualTotal).toLocaleString("ko-KR")}원</span>
          </p>
        )}
      </div>

      {/* 월별 배당 — 스택 바 */}
      {view === "monthly" && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stackedData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8B95A1" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#8B95A1" }} axisLine={false} tickLine={false}
              tickFormatter={fmt} width={42} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "#F2F4F6" }} />
            <ReferenceLine x={maxMonth.month} stroke="#3182F6" strokeDasharray="4 2" strokeWidth={1.5} />
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
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8B95A1" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#8B95A1" }} axisLine={false} tickLine={false}
              tickFormatter={fmt} width={42} />
            <Tooltip content={<CumTooltip />} cursor={{ stroke: "#3182F6", strokeWidth: 1, strokeDasharray: "4 2" }} />
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
