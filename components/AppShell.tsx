"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-toss-bg">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 min-h-0">{children}</main>
        <footer className="px-8 py-5 border-t border-toss-border mt-auto">
          <p className="text-[12px] text-toss-sub text-center">
            투자 정보 제공 목적이며 투자 권유가 아닙니다. 실제 배당금은 기업 공시를 확인하세요.
          </p>
        </footer>
      </div>
    </div>
  );
}
