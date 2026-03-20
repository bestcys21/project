interface LogoIconProps {
  size?: number;
}

/** 배당노트 아이콘 (노트 + 배당 코인 뱃지) */
export function LogoIcon({ size = 32 }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 배경 */}
      <rect width="36" height="36" rx="10" fill="#3182F6" />

      {/* 노트 본체 */}
      <rect x="7" y="7" width="16" height="20" rx="2.5" fill="white" fillOpacity="0.15" />
      <rect x="7" y="7" width="16" height="20" rx="2.5" stroke="white" strokeWidth="1.6" />

      {/* 노트 라인 3줄 */}
      <line x1="10.5" y1="12.5" x2="19.5" y2="12.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="10.5" y1="16.5" x2="19.5" y2="16.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="10.5" y1="20.5" x2="16"   y2="20.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />

      {/* 배당 코인 뱃지 (우하단) */}
      <circle cx="25.5" cy="25.5" r="7.5" fill="#1B64DA" />
      <circle cx="25.5" cy="25.5" r="6"   fill="#3182F6" />

      {/* 코인 안 상승 화살표 */}
      <polyline
        points="22,27.5 25.5,23.5 29,27.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="25.5" y1="23.5" x2="25.5" y2="28.5"
        stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** 배당노트 텍스트 + 아이콘 풀 로고 */
export function LogoFull({ iconSize = 28 }: { iconSize?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon size={iconSize} />
      <div className="flex flex-col leading-none">
        <span className="text-[15px] font-extrabold text-toss-text tracking-tight">
          배당노트
        </span>
        <span className="text-[10px] font-medium text-toss-sub tracking-wide">
          Baedang Note
        </span>
      </div>
    </div>
  );
}
