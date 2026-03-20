interface LogoIconProps {
  size?: number;
}

/** 배당노트 아이콘 — 세련된 배당 성장 심볼 */
export function LogoIcon({ size = 32 }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 배경 — 부드러운 그라디언트 */}
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3182F6" />
          <stop offset="100%" stopColor="#1B64DA" />
        </linearGradient>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#bgGrad)" />

      {/* 상승 막대 차트 — 배당 성장 상징 */}
      <rect x="8"  y="24" width="5" height="9"  rx="2" fill="white" fillOpacity="0.45" />
      <rect x="15" y="18" width="5" height="15" rx="2" fill="white" fillOpacity="0.65" />
      <rect x="22" y="13" width="5" height="20" rx="2" fill="white" fillOpacity="0.85" />

      {/* 우상향 꺾은선 — 성장 트렌드 */}
      <polyline
        points="10.5,24 17.5,18 24.5,13 31,8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 끝점 강조 */}
      <circle cx="31" cy="8" r="2.5" fill="white" />

      {/* 원화 기호 작게 (우하단) */}
      <text x="29" y="34" fontSize="8" fontWeight="800" fill="white" fillOpacity="0.9"
        fontFamily="system-ui, sans-serif" textAnchor="middle">₩</text>
    </svg>
  );
}

/** 배당노트 텍스트 + 아이콘 풀 로고 */
export function LogoFull({ iconSize = 28 }: { iconSize?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon size={iconSize} />
      <div className="flex flex-col leading-none">
        <span className="text-[16px] font-extrabold text-toss-text tracking-tight">
          배당노트
        </span>
        <span className="text-[10px] font-semibold text-toss-sub tracking-widest uppercase">
          Dividend Note
        </span>
      </div>
    </div>
  );
}
