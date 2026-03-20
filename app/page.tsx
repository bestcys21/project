import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── 히어로 섹션 ── */}
      <div className="relative overflow-hidden bg-toss-bg dark:bg-[#0d1b35]">
        {/* 장식 원형 블러 (다크모드 전용) */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-0 dark:opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent 70%)" }} />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-0 dark:opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />

        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-14 pb-16">

          {/* 메인 헤드라인 */}
          <h1 className="text-center text-[36px] md:text-[52px] font-extrabold text-toss-text dark:text-white leading-[1.15] mb-4">
            몇 주, 언제 사면<br />
            <span className="text-toss-blue">얼마 받을까?</span>
          </h1>
          <p className="text-center text-[16px] md:text-[18px] text-toss-sub dark:text-blue-200 mb-10">
            종목·수량·매수일만 입력하면 세후 배당금을 즉시 알려드려요.
          </p>

          {/* 계산기 폼 — 중앙 정렬, 최대 너비 제한 */}
          <div className="max-w-xl mx-auto">
            <CalculatorForm />
          </div>

          {/* 배당 사이클 흐름 — 히어로 하단 인라인 */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              {
                icon: (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: "linear-gradient(135deg, #3182F6, #1B64DA)" }}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                ),
                step: "1. 매수",
                desc: "배당락일 D-1까지",
              },
              {
                icon: (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  </div>
                ),
                step: "2. 배당락일",
                desc: "권리 소멸 기준일",
              },
              {
                icon: (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                ),
                step: "3. 기준일",
                desc: "주주명부 등재",
              },
              {
                icon: (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ),
                step: "4. 지급일",
                desc: "세후 배당금 입금",
              },
            ].map((item) => (
              <div key={item.step}
                className="bg-white dark:bg-white/10 border border-toss-border dark:border-white/15
                           rounded-2xl p-4 text-center shadow-card dark:shadow-none dark:backdrop-blur-sm">
                {item.icon}
                <p className="text-[13px] font-bold text-toss-text dark:text-white">{item.step}</p>
                <p className="text-[12px] text-toss-sub dark:text-blue-200 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 배당소득세 안내 (히어로 하단 서브섹션) ── */}
      <div className="bg-toss-card border-b border-toss-border">
        <div className="max-w-3xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇰🇷</span>
            <div>
              <p className="text-[14px] font-bold text-toss-text">한국주식</p>
              <p className="text-[12px] text-toss-sub">소득세 14% + 지방세 1.4%</p>
            </div>
            <span className="text-[20px] font-extrabold text-toss-blue ml-2">15.4%</span>
          </div>
          <div className="hidden sm:block w-px h-10 bg-toss-border" />
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇺🇸</span>
            <div>
              <p className="text-[14px] font-bold text-toss-text">미국주식</p>
              <p className="text-[12px] text-toss-sub">한미 조세조약 원천징수</p>
            </div>
            <span className="text-[20px] font-extrabold text-green-600 ml-2">15%</span>
          </div>
          <div className="hidden sm:block w-px h-10 bg-toss-border" />
          <p className="text-[13px] text-toss-sub text-center">
            세후 실수령액 <span className="text-toss-text font-semibold">자동 계산</span>됩니다
          </p>
        </div>
      </div>

      {/* ── 이런 분께 추천 ── */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-[13px] font-bold text-toss-sub text-center mb-5 uppercase tracking-wider">이런 분께 추천해요</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: "🔍", title: "매수 전 확인", desc: "배당락일 전날까지 사야\n수령 가능한지 즉시 확인" },
            { icon: "💵", title: "세후 실수령액", desc: "한국 15.4%, 미국 15%\n자동 공제된 실수령액 계산" },
            { icon: "📅", title: "일정 관리", desc: "캘린더에서 배당락일·\n지급일을 한눈에 확인" },
          ].map((item) => (
            <div key={item.title}
              className="bg-toss-card rounded-2xl shadow-card p-5 text-center space-y-2">
              <p className="text-3xl">{item.icon}</p>
              <p className="text-[14px] font-bold text-toss-text">{item.title}</p>
              <p className="text-[13px] text-toss-sub whitespace-pre-line leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
