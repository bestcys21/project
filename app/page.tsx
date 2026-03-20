import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── 히어로 섹션 ── */}
      <div className="relative overflow-hidden">
        {/* 배경 그라디언트 */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "linear-gradient(135deg, #0f1f3d 0%, #1a3a6b 40%, #1B64DA 75%, #3182F6 100%)",
          }}
        />
        {/* 장식 원형 블러 */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 -z-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent 70%)" }} />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-15 -z-10"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />

        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-14 pb-16">
          {/* 뱃지 */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20
                             text-white text-[13px] font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Yahoo Finance 실시간 배당 데이터
            </span>
          </div>

          {/* 메인 헤드라인 */}
          <h1 className="text-center text-[36px] md:text-[52px] font-extrabold text-white leading-[1.15] mb-4">
            몇 주, 언제 사면<br />
            <span style={{ color: "#93C5FD" }}>얼마 받을까?</span>
          </h1>
          <p className="text-center text-[16px] md:text-[18px] text-blue-200 mb-10">
            종목·수량·매수일만 입력하면 세후 배당금을 즉시 알려드려요.
          </p>

          {/* 계산기 폼 — 중앙 정렬, 최대 너비 제한 */}
          <div className="max-w-xl mx-auto">
            <CalculatorForm />
          </div>

          {/* 배당 사이클 흐름 — 히어로 하단 인라인 */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { icon: "🛒", step: "1. 매수", desc: "배당락일 D-1까지" },
              { icon: "📌", step: "2. 배당락일", desc: "권리 소멸 기준일" },
              { icon: "📋", step: "3. 기준일", desc: "주주명부 등재" },
              { icon: "💰", step: "4. 지급일", desc: "세후 배당금 입금" },
            ].map((item) => (
              <div key={item.step}
                className="bg-white/10 backdrop-blur-sm border border-white/15
                           rounded-2xl p-4 text-center space-y-1">
                <p className="text-2xl">{item.icon}</p>
                <p className="text-[13px] font-bold text-white">{item.step}</p>
                <p className="text-[12px] text-blue-200">{item.desc}</p>
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
