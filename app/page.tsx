import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── 히어로 섹션 ── */}
      <div className="relative overflow-hidden bg-toss-bg dark:bg-toss-bg">
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-14">

          {/* 메인 헤드라인 — 한 줄 */}
          <h1 className="text-center text-[36px] md:text-[52px] font-extrabold text-toss-text dark:text-white leading-tight mb-3">
            나의 배당금, <span className="text-toss-blue">얼마나 받을까?</span>
          </h1>
          <p className="text-center text-[17px] md:text-[19px] text-toss-sub dark:text-toss-sub mb-8">
            종목, 수량, 매수일만 입력하면 세후 배당금을 즉시 알려드려요.
          </p>

          {/* 계산기 폼 — PC: 스플릿 2단, 모바일: 1단 */}
          <div className="w-full">
            <CalculatorForm />
          </div>

          {/* ── 가로형 스텝 UI (플랫) ── */}
          <div className="mt-14 max-w-3xl mx-auto">
            <div className="flex items-start justify-center gap-0 md:gap-0">
              {[
                {
                  emoji: "🛒",
                  step: "1단계",
                  label: "매수",
                  desc: "배당락일 D-1까지",
                  color: "text-toss-blue",
                },
                {
                  emoji: "📅",
                  step: "2단계",
                  label: "배당락일",
                  desc: "권리 소멸 기준일",
                  color: "text-amber-500",
                },
                {
                  emoji: "📋",
                  step: "3단계",
                  label: "기준일",
                  desc: "주주명부 등재",
                  color: "text-violet-500",
                },
                {
                  emoji: "💰",
                  step: "4단계",
                  label: "지급일",
                  desc: "세후 배당금 입금",
                  color: "text-emerald-500",
                },
              ].map((item, idx) => (
                <div key={item.step} className="flex items-start flex-1 min-w-0">
                  {/* 스텝 아이템 */}
                  <div className="flex-1 flex flex-col items-center text-center px-1 md:px-3">
                    {/* 아이콘 */}
                    <div className={`text-3xl md:text-4xl mb-2`}>{item.emoji}</div>
                    {/* 스텝 번호 */}
                    <span className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${item.color}`}>
                      {item.step}
                    </span>
                    {/* 라벨 */}
                    <p className="text-[15px] md:text-[16px] font-bold text-toss-text">{item.label}</p>
                    {/* 설명 */}
                    <p className="text-[12px] md:text-[13px] text-toss-sub mt-0.5 leading-snug">{item.desc}</p>
                  </div>

                  {/* 화살표 (마지막 아이템 제외) */}
                  {idx < 3 && (
                    <div className="flex-shrink-0 mt-5 text-toss-border text-[18px] md:text-[22px] font-light select-none">
                      ›
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 세율 안내 — 인라인 알림 박스 */}
            <div className="mt-6 flex items-center justify-center gap-2 flex-wrap
                            bg-gray-50 dark:bg-white/5 border border-toss-border
                            rounded-2xl px-5 py-3">
              <span className="text-[13px] text-toss-sub">💡 세후 자동 계산</span>
              <span className="text-toss-border">·</span>
              <span className="text-[13px] text-toss-sub">
                🇰🇷 한국주식 <strong className="text-toss-text font-semibold">15.4%</strong>
              </span>
              <span className="text-toss-border">·</span>
              <span className="text-[13px] text-toss-sub">
                🇺🇸 미국주식 <strong className="text-toss-text font-semibold">15%</strong>
              </span>
              <span className="text-toss-border hidden sm:inline">·</span>
              <span className="text-[13px] text-toss-sub hidden sm:inline">원천징수 기준 적용</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── 이런 분께 추천해요 (클린 그리드) ── */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-8">
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

      {/* ── 포트폴리오 유도 배너 (자연스러운 간격) ── */}
      <div className="mt-24 bg-toss-blue">
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
