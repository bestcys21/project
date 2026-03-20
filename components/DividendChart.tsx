"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MonthlyDividend } from "@/lib/types";

interface Props {
  data: MonthlyDividend[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-card px-4 py-3 border border-toss-border text-[13px]">
      <p className="font-bold text-toss-text">{label}</p>
      <p className="text-toss-blue font-semibold mt-0.5">
        {Math.round(payload[0].value).toLocaleString("ko-KR")}원
      </p>
    </div>
  );
}

export default function DividendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#8B95A1" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#8B95A1" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v === 0 ? "0" : `${(v / 10000).toFixed(0)}만`}
          width={38}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F2F4F6" }} />
        <Bar dataKey="amount" fill="#3182F6" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
