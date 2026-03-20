"use client";

import ThemeToggle from "./ThemeToggle";

interface Props {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: Props) {
  return (
    <header className="md:hidden h-14 bg-toss-card border-b border-toss-border flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-toss-blue rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 8c-2.21 0-4 1.34-4 3s1.79 3 4 3 4 1.34 4 3-1.79 3-4 3m0-15v1.5M12 21v-1.5" />
          </svg>
        </div>
        <span className="text-[17px] font-bold text-toss-text tracking-tight">
          Dividend Insight
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-toss-bg transition-colors"
          aria-label="메뉴 열기"
        >
          <svg className="w-5 h-5 text-toss-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
