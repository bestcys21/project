import CalculatorForm from "@/components/CalculatorForm";

export default function Home() {
  return (
    <div className="min-h-screen px-4 md:px-8 lg:px-10 py-8">
      {/* 모바일: 단열, 데스크톱: 2열 */}
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

        {/* 오른쪽: 참고 패널 (데스크톱 전용) */}
        <div className="hidden lg:flex flex-col gap-5 sticky top-8">

          {/* 그라데이션 히어로 카드 */}
          <div
            className="rounded-2xl p-6 text-white space-y-4"
            style={{ background: "linear-gradient(135deg, #3182F6 0%, #1B64DA 100%)" }}
          >
            <div>
              <p className="text-[13px] font-semibold opacity-80">배당노트와 함께</p>
              <p className="text-[22px] font-extrabold leading-snug mt-1">
                스마트한 배당 투자,<br />지금 시작하세요
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["한국 15.4% 원천징수", "미국 15% 원천징수", "배당락일 전날까지 매수"].map((t) => (
                <span
                  key={t}
                  className="text-[12px] font-semibold bg-white/20 px-3 py-1.5 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* 배당 사이클 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-4">
            <p className="text-[14px] font-bold text-toss-text">배당 사이클 이해</p>
            <div className="flex items-center justify-between">
              {[
                { step: "매수", desc: "배당락일\n전날까지", color: "#3182F6" },
                { step: "배당락일", desc: "Ex-Date\n권리 확정", color: "#8B5CF6" },
                { step: "기준일", desc: "Record\nDate", color: "#F59E0B" },
                { step: "지급일", desc: "Payment\n입금", color: "#10B981" },
              ].map((item, i, arr) => (
                <div key={item.step} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                      style={{ background: item.color }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-[11px] font-bold text-toss-text text-center">{item.step}</p>
                    <p className="text-[10px] text-toss-sub text-center whitespace-pre-line leading-tight">{item.desc}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex-1 h-[2px] bg-toss-border mx-2 mb-6 min-w-[12px]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 세율 비교 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-3">
            <p className="text-[14px] font-bold text-toss-text">국가별 배당소득세</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 space-y-1">
                <p className="text-lg">🇰🇷</p>
                <p className="text-[22px] font-extrabold text-toss-blue">15.4%</p>
                <p className="text-[11px] text-toss-label leading-relaxed">
                  소득세 14%<br />+ 지방소득세 1.4%
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 space-y-1">
                <p className="text-lg">🇺🇸</p>
                <p className="text-[22px] font-extrabold text-green-700">15%</p>
                <p className="text-[11px] text-toss-label leading-relaxed">
                  한미 조세조약<br />원천징수 적용
                </p>
              </div>
            </div>
          </div>

          {/* 이런 분께 */}
          <div className="bg-toss-card rounded-2xl shadow-card p-6 space-y-3">
            <p className="text-[14px] font-bold text-toss-text">이런 분께 추천해요</p>
            <div className="space-y-2.5">
              {[
                "매수 전 배당 수령 가능 여부를 확인하고 싶은 분",
                "세후 실수령액이 얼마인지 정확히 알고 싶은 분",
                "한국·미국 주식 배당금을 한 곳에서 관리하고 싶은 분",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-toss-blue"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
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
