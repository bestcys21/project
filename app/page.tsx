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
