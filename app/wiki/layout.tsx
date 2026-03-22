import type { Metadata } from "next";
import { BASE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "배당 위키 - 배당 투자 기초 가이드",
  description:
    "배당금, 배당수익률, 배당락일 등 배당 투자에 필요한 핵심 개념을 쉽게 알아보세요. 초보자부터 중급 투자자까지 도움이 되는 배당 가이드입니다.",
  alternates: { canonical: `${BASE_URL}/wiki` },
  openGraph: {
    url: `${BASE_URL}/wiki`,
    title: "배당 위키 - 배당 투자 기초 가이드 | 배당노트",
    description:
      "배당금, 배당수익률, 배당락일 등 배당 투자에 필요한 핵심 개념을 쉽게 알아보세요. 초보자부터 중급 투자자까지 도움이 되는 배당 가이드입니다.",
  },
};

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
