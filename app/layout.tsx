import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "배당노트 — 배당 수익 계산기",
  description: "종목·수량·매수일만 입력하면 배당락일과 세후 배당금을 바로 알려드려요. 배당노트(Baedang Note)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
