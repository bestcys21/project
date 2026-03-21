import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── 히어로 섹션 ── */}
      <div className="relative overflow-hidden bg-toss-bg dark:bg-toss-bg">

        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-14">

          {/* 메인 헤드라인 */}
          <h1 className="text-center text-[36px] md:text-[52px] font-extrabold text-toss-text dark:text-white leading-[1.15] mb-3">
            나의 배당금,<br />
            <span className="text-toss-blue">얼마나 받을까?</span>
          </h1>
          <p className="text-center text-[17px] md:text-[19px] text-toss-sub dark:text-toss-sub mb-8">
            종목, 수량, 매수일만 입력하면 세후 배당금을 즉시 알려드려요.
          </p>

          {/* 계산기 폼 — PC: 스플릿 2단, 모바일: 1단 */}
          <div className="w-full">
            <CalculatorForm />
          </div>

          {/* 배당 사이클 흐름 — 히어로 하단 인라인 */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              {
                icon: (
                  <div className="mx-auto mb-3" style={{ width: 56, height: 56, filter: "drop-shadow(0 6px 12px rgba(49,130,246,0.45))" }}>
                    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="bag-bg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60A5FA"/>
                          <stop offset="100%" stopColor="#1B64DA"/>
                        </linearGradient>
                        <linearGradient id="bag-body" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EFF6FF"/>
                          <stop offset="100%" stopColor="#BFDBFE"/>
                        </linearGradient>
                      </defs>
                      {/* 배경 */}
                      <rect width="56" height="56" rx="16" fill="url(#bag-bg)"/>
                      {/* 상단 광택 */}
                      <rect x="6" y="4" width="44" height="22" rx="12" fill="white" opacity="0.18"/>
                      {/* 쇼핑백 몸통 */}
                      <rect x="13" y="26" width="30" height="22" rx="5" fill="url(#bag-body)"/>
                      {/* 쇼핑백 상단 테두리 */}
                      <rect x="13" y="26" width="30" height="6" rx="3" fill="#93C5FD"/>
                      {/* 손잡이 */}
                      <path d="M20 26 C20 17 36 17 36 26" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round" fill="none"/>
                      <path d="M20 26 C20 18 36 18 36 26" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6"/>
                      {/* 원화 기호 */}
                      <text x="28" y="41" textAnchor="middle" fill="#1E40AF" fontSize="11" fontWeight="800">₩</text>
                    </svg>
                  </div>
                ),
                step: "1. 매수",
                desc: "배당락일 D-1까지",
              },
              {
                icon: (
                  <div className="mx-auto mb-3" style={{ width: 56, height: 56, filter: "drop-shadow(0 6px 12px rgba(245,158,11,0.45))" }}>
                    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="cal-bg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FCD34D"/>
                          <stop offset="100%" stopColor="#D97706"/>
                        </linearGradient>
                        <linearGradient id="cal-body" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFFFFF"/>
                          <stop offset="100%" stopColor="#FEF3C7"/>
                        </linearGradient>
                      </defs>
                      <rect width="56" height="56" rx="16" fill="url(#cal-bg)"/>
                      <rect x="6" y="4" width="44" height="22" rx="12" fill="white" opacity="0.18"/>
                      {/* 캘린더 몸통 */}
                      <rect x="11" y="18" width="34" height="28" rx="5" fill="url(#cal-body)"/>
                      {/* 캘린더 헤더 */}
                      <rect x="11" y="18" width="34" height="10" rx="5" fill="#F59E0B"/>
                      <rect x="11" y="23" width="34" height="5" fill="#F59E0B"/>
                      {/* 링 */}
                      <rect x="20" y="13" width="4" height="9" rx="2" fill="#92400E"/>
                      <rect x="32" y="13" width="4" height="9" rx="2" fill="#92400E"/>
                      {/* X 표시 (배당락일 = 권리 소멸) */}
                      <line x1="22" y1="33" x2="28" y2="39" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="28" y1="33" x2="22" y2="39" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
                      {/* 날짜 점 */}
                      <rect x="32" y="33" width="4" height="4" rx="1" fill="#D97706" opacity="0.5"/>
                      <rect x="32" y="40" width="4" height="4" rx="1" fill="#D97706" opacity="0.5"/>
                    </svg>
                  </div>
                ),
                step: "2. 배당락일",
                desc: "권리 소멸 기준일",
              },
              {
                icon: (
                  <div className="mx-auto mb-3" style={{ width: 56, height: 56, filter: "drop-shadow(0 6px 12px rgba(139,92,246,0.45))" }}>
                    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="clip-bg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A78BFA"/>
                          <stop offset="100%" stopColor="#6D28D9"/>
                        </linearGradient>
                        <linearGradient id="clip-body" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFFFFF"/>
                          <stop offset="100%" stopColor="#EDE9FE"/>
                        </linearGradient>
                      </defs>
                      <rect width="56" height="56" rx="16" fill="url(#clip-bg)"/>
                      <rect x="6" y="4" width="44" height="22" rx="12" fill="white" opacity="0.18"/>
                      {/* 클립보드 */}
                      <rect x="13" y="16" width="30" height="32" rx="5" fill="url(#clip-body)"/>
                      {/* 클립 */}
                      <rect x="21" y="12" width="14" height="8" rx="4" fill="#8B5CF6"/>
                      <rect x="23" y="14" width="10" height="4" rx="2" fill="#C4B5FD"/>
                      {/* 라인들 */}
                      <rect x="18" y="26" width="20" height="2.5" rx="1.25" fill="#DDD6FE"/>
                      <rect x="18" y="31" width="14" height="2.5" rx="1.25" fill="#DDD6FE"/>
                      {/* 체크마크 */}
                      <circle cx="34" cy="38" r="7" fill="#7C3AED"/>
                      <path d="M30.5 38 L33 40.5 L37.5 35.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ),
                step: "3. 기준일",
                desc: "주주명부 등재",
              },
              {
                icon: (
                  <div className="mx-auto mb-3" style={{ width: 56, height: 56, filter: "drop-shadow(0 6px 12px rgba(16,185,129,0.45))" }}>
                    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="coin-bg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34D399"/>
                          <stop offset="100%" stopColor="#059669"/>
                        </linearGradient>
                        <linearGradient id="coin-face" x1="0.2" y1="0" x2="0.8" y2="1">
                          <stop offset="0%" stopColor="#FDE68A"/>
                          <stop offset="60%" stopColor="#F59E0B"/>
                          <stop offset="100%" stopColor="#D97706"/>
                        </linearGradient>
                        <linearGradient id="coin-side" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#92400E"/>
                          <stop offset="100%" stopColor="#78350F"/>
                        </linearGradient>
                      </defs>
                      <rect width="56" height="56" rx="16" fill="url(#coin-bg)"/>
                      <rect x="6" y="4" width="44" height="22" rx="12" fill="white" opacity="0.18"/>
                      {/* 동전 측면 (두께감) */}
                      <ellipse cx="28" cy="35" rx="14" ry="4" fill="url(#coin-side)"/>
                      {/* 동전 앞면 */}
                      <ellipse cx="28" cy="28" rx="14" ry="9" fill="url(#coin-face)"/>
                      {/* 동전 테두리 */}
                      <ellipse cx="28" cy="28" rx="14" ry="9" stroke="#D97706" strokeWidth="1" fill="none"/>
                      {/* 동전 광택 */}
                      <ellipse cx="24" cy="24" rx="5" ry="3" fill="white" opacity="0.3" transform="rotate(-20 24 24)"/>
                      {/* 원화 기호 */}
                      <text x="28" y="32" textAnchor="middle" fill="#92400E" fontSize="11" fontWeight="900">₩</text>
                    </svg>
                  </div>
                ),
                step: "4. 지급일",
                desc: "세후 배당금 입금",
              },
            ].map((item) => (
              <div key={item.step}
                className="group bg-white dark:bg-toss-card border border-toss-border dark:border-toss-border
                           rounded-2xl p-4 text-center cursor-default
                           shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)]
                           hover:shadow-[0_8px_28px_rgba(49,130,246,0.18)] dark:hover:shadow-[0_8px_28px_rgba(49,130,246,0.25)]
                           hover:-translate-y-1 transition-all duration-200 ease-out">
                <div className="group-hover:scale-110 transition-transform duration-200 ease-out">
                  {item.icon}
                </div>
                <p className="text-[15px] font-bold text-toss-text dark:text-toss-text">{item.step}</p>
                <p className="text-[13px] text-toss-sub mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 세율 안내 — 미니멀 칩 (덜 중요한 정보라 작게) ── */}
      <div className="flex items-center justify-center gap-2 flex-wrap py-4 border-b border-toss-border bg-toss-card">
        <span className="text-[13px] text-toss-sub">세후 자동 계산</span>
        <span className="text-toss-border">·</span>
        <span className="inline-flex items-center gap-1 text-[13px] text-toss-sub font-medium">
          🇰🇷 한국주식 <strong className="text-toss-text font-bold">15.4%</strong>
        </span>
        <span className="text-toss-border">·</span>
        <span className="inline-flex items-center gap-1 text-[13px] text-toss-sub font-medium">
          🇺🇸 미국주식 <strong className="text-toss-text font-bold">15%</strong>
        </span>
        <span className="text-toss-border hidden sm:inline">·</span>
        <span className="text-[13px] text-toss-sub hidden sm:inline">원천징수 기준</span>
      </div>

      {/* ── 이런 분께 추천 ── */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-[15px] font-bold text-toss-sub text-center mb-8 tracking-wide">이런 분께 추천해요</p>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: "🔍",
              title: "매수 전 빠른 확인",
              desc: "배당락일 전날까지 사야 수령 가능한지\n종목·날짜만 입력하면 즉시 알 수 있어요",
              link: null,
            },
            {
              icon: "💵",
              title: "세후 실수령액 계산",
              desc: "한국 15.4%, 미국 15%\n세금을 자동 공제한 실수령액을 확인해요",
              link: null,
            },
            {
              icon: "📅",
              title: "배당 일정 관리",
              desc: "캘린더에서 배당락일·지급일을\n한눈에 보고 포트폴리오를 관리해요",
              link: "/calendar",
            },
          ].map((item) => (
            <div key={item.title}
              className="bg-toss-card rounded-2xl shadow-card p-7 text-center space-y-3
                         hover:shadow-[0_6px_24px_rgba(49,130,246,0.12)] hover:-translate-y-0.5 transition-all duration-200">
              <p className="text-4xl">{item.icon}</p>
              <p className="text-[18px] font-bold text-toss-text">{item.title}</p>
              <p className="text-[15px] text-toss-sub whitespace-pre-line leading-relaxed">{item.desc}</p>
              {item.link && (
                <a href={item.link}
                  className="inline-flex items-center gap-1 text-[14px] font-semibold text-toss-blue mt-1">
                  바로 가기 →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 포트폴리오 유도 배너 ── */}
      <div className="bg-toss-blue">
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
