"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-toss-bg">
      {/* 사이드바 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1">{children}</main>
        <footer className="px-6 py-6 text-center">
          <p className="text-[12px] text-toss-sub">
            투자 정보 제공 목적이며 투자 권유가 아닙니다. 실제 배당금은 기업 공시를 확인하세요.
          </p>
        </footer>
      </div>
    </div>
  );
}
