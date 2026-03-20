"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",          icon: "🧮", label: "배당 계산기" },
  { href: "/dashboard", icon: "📊", label: "내 배당" },
  { href: "/calendar",  icon: "📅", label: "배당 캘린더" },
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
        fixed top-0 left-0 h-full w-64 bg-white border-r border-toss-border z-40
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
    >
      {/* 로고 */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-toss-border">
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
        {/* 모바일 닫기 버튼 */}
        <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-toss-bg">
          <svg className="w-5 h-5 text-toss-label" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold
                transition-colors duration-150
                ${active
                  ? "bg-blue-50 text-toss-blue"
                  : "text-toss-label hover:bg-toss-bg hover:text-toss-text"
                }
              `}
            >
              <span className="text-xl">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 BETA 뱃지 */}
      <div className="px-6 py-5 border-t border-toss-border">
        <span className="text-xs font-medium text-toss-sub bg-toss-bg px-3 py-1.5 rounded-full">
          BETA v0.1
        </span>
      </div>
    </aside>
  );
}
