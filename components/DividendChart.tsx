"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white rounded-xl shadow-card px-4 py-3 border border-toss-border text-[13px] min-w-[140px]">
      <p className="font-bold text-toss-text mb-2">{label}</p>
      {payload.map((p: any) => (
        p.value > 0 && (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.fill }} className="font-medium">{p.dataKey}</span>
            <span className="text-toss-text font-semibold">
              {Math.round(p.value).toLocaleString("ko-KR")}원
            </span>
          </div>
        )
      ))}
      {payload.length > 1 && (
        <div className="flex justify-between gap-4 border-t border-toss-border mt-2 pt-2">
          <span className="text-toss-label font-semibold">합계</span>
          <span className="text-toss-blue font-bold">{Math.round(total).toLocaleString("ko-KR")}원</span>
        </div>
      )}
    </div>
  );
}

export default function DividendChart({ data, stackedData, tickers }: Props) {
  // 종목별 스택 차트
  if (stackedData && tickers && tickers.length > 0) {
    const maxMonth = stackedData.reduce((a, b) => (a.total > b.total ? a : b), stackedData[0]);

    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={stackedData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8B95A1" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#8B95A1" }} axisLine={false} tickLine={false}
            tickFormatter={(v) => v === 0 ? "0" : `${(v / 10000).toFixed(0)}만`}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F2F4F6" }} />
          <ReferenceLine
            x={maxMonth.month}
            stroke="#3182F6"
            strokeDasharray="4 2"
            strokeWidth={1.5}
          />
          {tickers.map((ticker, i) => (
            <Bar
              key={ticker}
              dataKey={ticker}
              stackId="a"
              fill={STOCK_COLORS[i % STOCK_COLORS.length]}
              radius={i === tickers.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 단일 차트 (fallback)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8B95A1" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#8B95A1" }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v === 0 ? "0" : `${(v / 10000).toFixed(0)}만`}
          width={38}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F2F4F6" }} />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={STOCK_COLORS[i % STOCK_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
