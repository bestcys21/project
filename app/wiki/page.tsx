import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "배당 위키 — 배당노트",
  description: "배당금이란 무엇인가? 배당락일, 세금, 배당 귀족주까지 쉽게 알아보세요.",
};

const ARTICLES = [
  {
    category: "📖 초보자 가이드",
    color: "#3182F6",
    bgColor: "#EBF3FE",
    items: [
      {
        q: "배당금이란 무엇인가요?",
        a: "배당금은 기업이 영업 이익의 일부를 주주에게 나눠주는 현금입니다. 주식을 보유하고 있으면 별도의 행동 없이 지정된 날에 계좌로 입금돼요.",
      },
      {
        q: "배당락일(Ex-Date)과 지급일(Payment Date)의 차이는?",
        a: "배당락일은 '이 날부터는 배당을 받을 자격이 없다'는 기준일입니다. 배당을 받으려면 반드시 배당락일 하루 전날까지 주식을 매수해야 해요. 지급일은 실제로 배당금이 계좌에 입금되는 날입니다.",
      },
      {
        q: "국가별 배당 소득세율은 얼마인가요?",
        a: "한국 주식은 배당소득세 15.4%(소득세 14% + 지방소득세 1.4%)가 원천징수됩니다. 미국 주식은 한미 조세조약에 따라 15%가 원천징수돼요.",
      },
    ],
  },
  {
    category: "🏆 고급 투자 전략",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    items: [
      {
        q: "배당 성장주 vs 고배당주, 어떤 게 더 나을까요?",
        a: "고배당주는 지금 당장 높은 배당 수익률을 제공하지만 성장성이 낮을 수 있습니다. 배당 성장주는 현재 수익률은 낮지만 매년 배당을 꾸준히 늘려 장기적으로 더 높은 수익을 기대할 수 있어요.",
      },
      {
        q: "배당 귀족주(Dividend Aristocrats)란?",
        a: "미국 S&P 500 편입 기업 중 25년 이상 연속으로 배당금을 늘려온 기업을 뜻합니다. 코카콜라, 존슨앤드존슨, 프록터앤드갬블 등이 대표적이에요.",
      },
      {
        q: "배당 재투자(DRIP)가 왜 중요한가요?",
        a: "받은 배당금으로 같은 주식을 다시 매수하면 주식 수가 늘어나고, 다음 배당이 더 커지는 복리 효과가 발생합니다. 장기적으로 원금 대비 배당 수익률(YOC)이 크게 올라갈 수 있어요.",
      },
    ],
  },
  {
    category: "💡 자주 묻는 질문",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    items: [
      {
        q: "배당락일 당일 매수하면 배당을 받을 수 있나요?",
        a: "아니요. 배당락일 당일 매수하면 해당 회차 배당을 받을 수 없습니다. 반드시 배당락일 하루 전 영업일 장 마감 전까지 매수를 완료해야 해요.",
      },
      {
        q: "ETF도 배당을 받나요?",
        a: "네. ETF도 편입 종목에서 받은 배당금을 투자자에게 분배합니다. 분배금 지급 주기는 ETF마다 다르며 월 1회, 분기 1회, 연 1회 등 다양합니다.",
      },
      {
        q: "배당소득이 연 2,000만 원을 넘으면 어떻게 되나요?",
        a: "금융소득(배당소득 + 이자소득)이 연 2,000만 원을 초과하면 금융소득종합과세 대상이 됩니다. 초과분은 다른 소득과 합산해 누진세율(6~45%)이 적용될 수 있으므로 세무사 상담을 권장합니다.",
      },
    ],
  },
];

export default function WikiPage() {
  return (
    <div className="px-4 md:px-8 lg:px-10 py-8 max-w-6xl mx-auto space-y-10">
      {/* 헤더 */}
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-extrabold text-toss-text">배당 위키</h1>
        <p className="text-[15px] text-toss-sub">배당 투자에 필요한 모든 것을 쉽게 알아보세요.</p>
      </div>

      {ARTICLES.map((section) => (
        <div key={section.category} className="space-y-4">
          {/* 섹션 헤더 */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ background: section.color }} />
            <h2 className="text-[17px] font-extrabold text-toss-text">{section.category}</h2>
          </div>

          {/* 2열 그리드 (데스크톱) */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.items.map((item) => (
              <article
                key={item.q}
                className="bg-toss-card rounded-2xl shadow-card p-6 space-y-3 hover:shadow-card-hover transition-shadow"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: section.bgColor }}
                >
                  <span className="text-sm font-bold" style={{ color: section.color }}>Q</span>
                </div>
                <h3 className="text-[14px] font-bold text-toss-text leading-snug">{item.q}</h3>
                <p className="text-[13px] text-toss-label leading-relaxed">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-[12px] text-toss-sub py-4 border-t border-toss-border">
        본 내용은 투자 권유가 아닌 교육 목적의 정보입니다.
      </p>
    </div>
  );
}
