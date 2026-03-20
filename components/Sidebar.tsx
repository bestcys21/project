"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { LogoFull } from "./Logo";

const NAV = [
  { href: "/",          icon: "🧮", label: "배당 계산기" },
  { href: "/dashboard", icon: "📊", label: "내 배당" },
  { href: "/calendar",  icon: "📅", label: "배당 캘린더" },
  { href: "/ranking",   icon: "🏆", label: "배당 랭킹" },
  { href: "/wiki",      icon: "📚", label: "배당 위키" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full w-64 z-40
        flex flex-col transition-transform duration-300 ease-in-out
        border-r border-toss-border sidebar-bg
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
    >
      {/* 로고 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-toss-border">
        <Link href="/landing" onClick={onClose}>
          <LogoFull iconSize={28} />
        </Link>
        <div className="flex items-center gap-1">
          {/* 다크모드 토글 */}
          <ThemeToggle />
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg hover:bg-toss-bg transition-colors"
          >
            <svg
              className="w-5 h-5 text-toss-label"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`
                relative flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold
                transition-all duration-150
                ${active
                  ? "bg-blue-50 dark:bg-blue-900/20 text-toss-blue"
                  : "text-toss-label hover:bg-toss-bg hover:text-toss-text"
                }
              `}
            >
              {/* 활성 상태 왼쪽 인디케이터 */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-toss-blue" />
              )}
              <span className="text-xl leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 */}
      <div className="px-5 py-5 border-t border-toss-border space-y-2">
        <span className="inline-flex text-xs font-semibold text-toss-sub bg-toss-bg px-3 py-1.5 rounded-full">
          BETA v0.1
        </span>
        <p className="text-[11px] text-toss-sub leading-relaxed">
          &copy; 2026 배당노트. 투자 정보 제공 목적.
        </p>
      </div>
    </aside>
  );
}
