import type { Metadata } from "next";
import CalculatorForm from "@/components/CalculatorForm";
import { BASE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "배당금 계산기 - 세후 배당금 즉시 계산",
  description:
    "보유하신 주식 종목과 수량만 입력하면 세후 배당금과 지급 일정을 즉시 알려드립니다. 로그인 없이 배당 포트폴리오를 구성해 보세요.",
  alternates: { canonical: BASE_URL },
  openGraph: {
    url: BASE_URL,
    title: "배당노트 - 가장 쉬운 주식 배당금 계산기 및 포트폴리오 관리",
    description:
      "보유하신 주식 종목과 수량만 입력하면 세후 배당금과 지급 일정을 즉시 알려드립니다. 로그인 없이 배당 포트폴리오를 구성해 보세요.",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── 히어로 섹션 ── */}
      <div className="relative overflow-hidden bg-toss-bg dark:bg-toss-bg">
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-14">

          {/* 메인 헤드라인 — 모바일: 가운데 / PC: 좌측 */}
          <h1 className="text-center lg:text-left text-[26px] md:text-[36px] font-extrabold text-toss-text dark:text-white leading-tight mb-3">
            나의 배당금, <span className="text-toss-blue">얼마나 받을까?</span>
          </h1>
          <p className="text-center lg:text-left text-[15px] md:text-[17px] text-toss-sub dark:text-toss-sub mb-8">
            종목, 수량, 매수일만 입력하면 세후 배당금을 즉시 알려드려요.
          </p>

          {/* 계산기 폼 — PC: 스플릿 2단, 모바일: 1단 */}
          <div className="w-full">
            <CalculatorForm />
          </div>

        </div>
      </div>

      {/* ── 이런 분께 추천해요 (연한 회색 배경으로 섹션 분리) ── */}
      <div className="bg-gray-50 dark:bg-white/5">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          {/* 섹션 타이틀 */}
          <h2 className="text-2xl md:text-3xl font-bold text-toss-text text-center mb-3">
            이런 분께 추천해요
          </h2>
          <p className="text-[16px] text-toss-sub text-center mb-12">
            배당 투자를 처음 시작하거나 더 체계적으로 관리하고 싶다면
          </p>

          {/* 카드 없는 클린 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              {
                emoji: "🔍",
                title: "매수 전 빠른 확인",
                desc: "배당락일 전날까지 사야 수령 가능한지\n종목·날짜만 입력하면 즉시 알 수 있어요",
                link: null,
              },
              {
                emoji: "💵",
                title: "세후 실수령액 계산",
                desc: "한국 15.4%, 미국 15%\n세금을 자동 공제한 정확한 실수령액을 확인해요",
                link: null,
              },
              {
                emoji: "📅",
                title: "배당 일정 관리",
                desc: "캘린더에서 배당락일·지급일을\n한눈에 보고 포트폴리오를 관리해요",
                link: "/calendar",
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center gap-3">
                {/* 아이콘 */}
                <div className="text-5xl mb-1">{item.emoji}</div>
                {/* 제목 */}
                <p className="text-[19px] font-bold text-toss-text">{item.title}</p>
                {/* 설명 */}
                <p className="text-[15px] text-toss-sub whitespace-pre-line leading-relaxed">{item.desc}</p>
                {/* 링크 */}
                {item.link && (
                  <a href={item.link}
                    className="inline-flex items-center gap-1 text-[14px] font-semibold text-toss-blue
                               hover:underline transition-colors mt-1">
                    캘린더 보러가기 →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 포트폴리오 유도 배너 (Footer 바로 위, 미세한 앵글 그라데이션) ── */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-white text-center sm:text-left">
            <p className="text-[22px] font-extrabold leading-snug">내 배당 포트폴리오 만들기</p>
            <p className="text-[16px] opacity-80 mt-1.5">종목을 추가하고 월별 배당 흐름을 한눈에 관리해요</p>
          </div>
          <a href="/dashboard"
            className="flex-shrink-0 bg-white text-toss-blue font-bold text-[16px]
                       px-8 py-3.5 rounded-2xl hover:bg-blue-50 transition-colors whitespace-nowrap shadow-md">
            내 배당 보러가기 →
          </a>
        </div>
      </div>

    </div>
  );
}
