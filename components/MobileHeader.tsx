"use client";

import ThemeToggle from "./ThemeToggle";
import { LogoFull } from "./Logo";

interface Props {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: Props) {
  return (
    <header className="md:hidden h-14 bg-toss-card border-b border-toss-border flex items-center justify-between px-4 sticky top-0 z-30">
      <LogoFull iconSize={30} />
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
