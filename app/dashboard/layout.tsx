import type { Metadata } from "next";
import { BASE_URL } from "../layout";

export const metadata: Metadata = {
  title: "내 배당 포트폴리오",
  description:
    "보유 종목의 월별 배당금 흐름을 한눈에 관리하세요. 배당 목표 설정부터 달성률 추적, 또래 배당러 비교까지 가능합니다.",
  alternates: { canonical: `${BASE_URL}/dashboard` },
  openGraph: {
    url: `${BASE_URL}/dashboard`,
    title: "내 배당 포트폴리오 | 배당노트",
    description:
      "보유 종목의 월별 배당금 흐름을 한눈에 관리하세요. 배당 목표 설정부터 달성률 추적, 또래 배당러 비교까지 가능합니다.",
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
