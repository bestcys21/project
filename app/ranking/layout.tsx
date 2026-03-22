import type { Metadata } from "next";
import { BASE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "배당 랭킹 - 고배당 종목 순위",
  description:
    "한국·미국 주식 배당수익률 랭킹을 확인하세요. 안정형·성장형 기준으로 배당 종목을 분석하고 내 포트폴리오에 바로 추가할 수 있습니다.",
  alternates: { canonical: `${BASE_URL}/ranking` },
  openGraph: {
    url: `${BASE_URL}/ranking`,
    title: "배당 랭킹 - 고배당 종목 순위 | 배당노트",
    description:
      "한국·미국 주식 배당수익률 랭킹을 확인하세요. 안정형·성장형 기준으로 배당 종목을 분석하고 내 포트폴리오에 바로 추가할 수 있습니다.",
  },
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
