"use client";

import { useState, useEffect } from "react";

interface Props {
  ticker: string;
  name:   string;
  market: string;
  size?:  number; // px
}

const COLORS = [
  "#3182F6","#FF6B6B","#4ECDC4","#F59E0B",
  "#8B5CF6","#F97316","#10B981","#EC4899",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function StockLogo({ ticker, name, market, size = 36 }: Props) {
  const [err, setErr] = useState(false);

  const src = `/api/logo?ticker=${encodeURIComponent(ticker)}&market=${market}`;

  // ticker/market이 바뀌면 err 상태 리셋 → 새 로고 재시도
  useEffect(() => { setErr(false); }, [src]);

  const radius = Math.round(size * 0.28); // ~28% → rounded-lg feel
  const fontSize = Math.round(size * 0.33);
  const initials = name.replace(/[^가-힣a-zA-Z0-9]/g, "").slice(0, 2) || name.slice(0, 2);

  if (!err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: radius }}
        className="object-contain bg-white border border-toss-border flex-shrink-0"
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: radius,
        background: colorFor(name),
        fontSize,
      }}
      className="flex items-center justify-center font-bold text-white flex-shrink-0"
    >
      {initials}
    </div>
  );
}
