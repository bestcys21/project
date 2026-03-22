import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { BASE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "배당노트 - 가장 쉬운 주식 배당금 계산기 및 포트폴리오 관리",
    template: "%s | 배당노트",
  },
  description:
    "보유하신 주식 종목과 수량만 입력하면 세후 배당금과 지급 일정을 즉시 알려드립니다. 로그인 없이 배당 포트폴리오를 구성해 보세요.",
  keywords: ["배당금 계산기", "배당 포트폴리오", "배당수익률", "주식 배당", "배당락일", "배당노트", "세후 배당금"],
  authors: [{ name: "배당노트" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "배당노트",
    title: "배당노트 - 가장 쉬운 주식 배당금 계산기 및 포트폴리오 관리",
    description:
      "보유하신 주식 종목과 수량만 입력하면 세후 배당금과 지급 일정을 즉시 알려드립니다. 로그인 없이 배당 포트폴리오를 구성해 보세요.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "배당노트 - 주식 배당금 계산기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "배당노트 - 가장 쉬운 주식 배당금 계산기 및 포트폴리오 관리",
    description: "보유하신 주식 종목과 수량만 입력하면 세후 배당금과 지급 일정을 즉시 알려드립니다.",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: BASE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
