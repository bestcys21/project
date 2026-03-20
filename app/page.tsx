import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <div className="min-h-screen px-4 md:px-8 lg:px-10 py-8">
      <div className="grid lg:grid-cols-[minmax(0,520px)_1fr] gap-8 items-start max-w-6xl mx-auto">

        {/* 왼쪽: 계산기 */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-[28px] font-extrabold text-toss-text leading-tight">
              몇 주 언제 사면<br />
              <span className="text-toss-blue">얼마 받을까?</span>
            </h1>
            <p className="text-[15px] text-toss-sub">
              종목·수량·매수일만 입력하면 세후 배당금을 바로 알려드려요.
            </p>
          </div>
          <CalculatorForm />
        </div>

        {/* 오른쪽: 정보 패널 (데스크톱 전용) */}
        <div className="hidden lg:flex flex-col gap-4 sticky top-8">

          {/* 배당 사이클 인포그래픽 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-5">
            <div>
              <p className="text-[15px] font-extrabold text-toss-text">배당 수령 흐름</p>
              <p className="text-[12px] text-toss-sub mt-0.5">배당락일 전날까지 매수해야 수령할 수 있어요.</p>
            </div>

            {/* 스텝 플로우 */}
            <div className="space-y-0">
              {[
                {
                  icon: "🛒",
                  step: "매수",
                  desc: "배당락일 D-1까지",
                  detail: "영업일 기준 하루 전 장 마감 전",
                  color: "#3182F6",
                  bg: "#EBF3FE",
                },
                {
                  icon: "📌",
                  step: "배당락일",
                  desc: "Ex-Dividend Date",
                  detail: "이날부터 매수하면 이번 배당 대상 제외",
                  color: "#8B5CF6",
                  bg: "#F5F3FF",
                },
                {
                  icon: "📋",
                  step: "기준일",
                  desc: "Record Date",
                  detail: "주주명부에 공식 등재되는 날",
                  color: "#F59E0B",
                  bg: "#FFFBEB",
                },
                {
                  icon: "💰",
                  step: "지급일",
                  desc: "Payment Date",
                  detail: "계좌로 세후 배당금 자동 입금",
                  color: "#10B981",
                  bg: "#ECFDF5",
                },
              ].map((item, i, arr) => (
                <div key={item.step}>
                  <div className="flex items-center gap-4 py-3">
                    {/* 아이콘 */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: item.bg }}
                    >
                      {item.icon}
                    </div>
                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold text-toss-text">{item.step}</p>
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: item.color, background: item.bg }}
                        >
                          {item.desc}
                        </span>
                      </div>
                      <p className="text-[11px] text-toss-sub mt-0.5">{item.detail}</p>
                    </div>
                    {/* 스텝 번호 */}
                    <span className="text-[11px] font-bold text-toss-sub flex-shrink-0">{i + 1}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="ml-5 flex items-center">
                      <div className="w-px h-3 bg-toss-border ml-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 배당소득세 — 컴팩트 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-5">
            <p className="text-[13px] font-bold text-toss-text mb-3">배당소득세 자동 적용</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-toss-border">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇰🇷</span>
                  <span className="text-[13px] font-semibold text-toss-text">한국주식</span>
                  <span className="text-[11px] text-toss-sub">소득세 14% + 지방세 1.4%</span>
                </div>
                <span className="text-[15px] font-extrabold text-toss-blue">15.4%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇺🇸</span>
                  <span className="text-[13px] font-semibold text-toss-text">미국주식</span>
                  <span className="text-[11px] text-toss-sub">한미 조세조약 원천징수</span>
                </div>
                <span className="text-[15px] font-extrabold text-green-600">15%</span>
              </div>
            </div>
          </div>

          {/* 이런 분께 — 단순하게 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-3">
            <p className="text-[13px] font-bold text-toss-text">이런 분께 추천해요</p>
            <div className="space-y-2">
              {[
                "매수 전 배당 수령 가능 여부를 확인하고 싶은 분",
                "세후 실수령액이 얼마인지 정확히 알고 싶은 분",
                "한·미 주식 배당금을 한 곳에서 관리하고 싶은 분",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="text-toss-blue mt-0.5 flex-shrink-0 text-[13px]">✓</span>
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
