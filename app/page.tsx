import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <div className="min-h-screen px-4 md:px-8 lg:px-10 py-8">
      <div className="grid lg:grid-cols-[minmax(0,580px)_1fr] gap-10 items-start max-w-6xl mx-auto">

        {/* 왼쪽: 계산기 — 핵심 */}
        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-[26px] font-extrabold text-toss-text leading-tight">
              몇 주, 언제 사면 <span className="text-toss-blue">얼마 받을까?</span>
            </h1>
            <p className="text-[14px] text-toss-sub">
              종목·수량·매수일 입력 → 세후 배당금 즉시 계산
            </p>
          </div>
          <CalculatorForm />
        </div>

        {/* 오른쪽: 정보 (서브, 데스크톱 전용) */}
        <div className="hidden lg:flex flex-col gap-3 sticky top-8">

          {/* 배당 수령 흐름 — 인포그래픽 스타일 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-5">
            <p className="text-[13px] font-bold text-toss-text mb-4">배당 수령 흐름</p>

            <div className="relative">
              {/* 수직 연결선 */}
              <div className="absolute left-[18px] top-5 bottom-5 w-px bg-toss-border" />

              <div className="space-y-0">
                {[
                  { icon: "🛒", step: "매수", desc: "배당락일 D-1까지 완료", color: "#3182F6", bg: "#EBF3FE" },
                  { icon: "📌", step: "배당락일", desc: "이날부터 매수 시 미수령", color: "#8B5CF6", bg: "#F5F3FF" },
                  { icon: "📋", step: "기준일", desc: "주주명부 공식 등재", color: "#F59E0B", bg: "#FFFBEB" },
                  { icon: "💰", step: "지급일", desc: "세후 배당금 자동 입금", color: "#10B981", bg: "#ECFDF5" },
                ].map((item, i) => (
                  <div key={item.step} className="flex items-center gap-3 py-2.5 relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 relative z-10"
                      style={{ background: item.bg }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-toss-text">{item.step}</p>
                      <p className="text-[12px] text-toss-sub">{item.desc}</p>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: item.color, background: item.bg }}
                    >
                      {i + 1}단계
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 배당소득세 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-5">
            <p className="text-[13px] font-bold text-toss-text mb-3">배당소득세 자동 적용</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-toss-border">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇰🇷</span>
                  <div>
                    <p className="text-[13px] font-semibold text-toss-text">한국주식</p>
                    <p className="text-[11px] text-toss-sub">소득세 14% + 지방세 1.4%</p>
                  </div>
                </div>
                <span className="text-[16px] font-extrabold text-toss-blue">15.4%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇺🇸</span>
                  <div>
                    <p className="text-[13px] font-semibold text-toss-text">미국주식</p>
                    <p className="text-[11px] text-toss-sub">한미 조세조약 원천징수</p>
                  </div>
                </div>
                <span className="text-[16px] font-extrabold text-green-600">15%</span>
              </div>
            </div>
          </div>

          {/* 이런 분께 추천 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-5">
            <p className="text-[13px] font-bold text-toss-text mb-3">이런 분께 추천해요</p>
            <div className="space-y-2">
              {[
                "매수 전 배당 수령 가능 여부 확인",
                "세후 실수령액 정확히 알고 싶을 때",
                "한·미 배당금 한 곳에서 관리",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="text-toss-blue mt-0.5 flex-shrink-0 text-sm">✓</span>
                  <p className="text-[13px] text-toss-label leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
