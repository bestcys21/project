import type { Metadata } from "next";
import { BASE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "배당 캘린더 - 배당락일·지급일 한눈에",
  description:
    "보유 종목의 배당락일과 지급일을 월별 캘린더로 한눈에 확인하세요. 놓치지 말아야 할 배당 일정을 미리 파악하세요.",
  alternates: { canonical: `${BASE_URL}/calendar` },
  openGraph: {
    url: `${BASE_URL}/calendar`,
    title: "배당 캘린더 - 배당락일·지급일 한눈에 | 배당노트",
    description:
      "보유 종목의 배당락일과 지급일을 월별 캘린더로 한눈에 확인하세요. 놓치지 말아야 할 배당 일정을 미리 파악하세요.",
  },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
