"use client";

import { useState } from "react";

const SECTIONS = [
  {
    id: "beginner",
    icon: "📖",
    title: "초보자 가이드",
    cta: { label: "배당 계산기로 시작하기 →", href: "/" },
    relatedStocks: [
      { name: "삼성전자", ticker: "005930", desc: "국내 대표 분기배당" },
      { name: "SCHD", ticker: "SCHD", desc: "미국 배당 성장 ETF" },
    ],
    content: (
      <div className="space-y-4 text-[14px] text-toss-label leading-relaxed">
        <Section title="배당이란?">
          기업이 이익의 일부를 주주에게 나눠주는 것입니다. 주식을 보유하고 있으면 배당락일 전날까지 매수 시 배당을 받을 수 있습니다.
        </Section>
        <Section title="배당락일 (Ex-Dividend Date)">
          배당을 받을 주주를 확정하는 기준일입니다. <strong>배당락일 전날까지 매수</strong>해야 배당을 받을 수 있으며, 배당락일 당일부터는 배당권리가 소멸됩니다.
        </Section>
        <Section title="기준일 (Record Date)">
          주주명부에 등재된 주주를 확인하는 날입니다. 실제로는 배당락일 다음날이 기준일입니다 (한국 기준).
        </Section>
        <Section title="배당소득세">
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>한국주식:</strong> 배당소득세 14% + 지방소득세 1.4% = <strong className="text-toss-blue">15.4%</strong></li>
            <li><strong>미국주식:</strong> 한미조세조약에 의해 <strong className="text-green-600">15%</strong> 원천징수</li>
            <li>연간 금융소득 2,000만원 초과 시 종합과세 대상</li>
          </ul>
        </Section>
        <Section title="ISA 계좌 활용">
          ISA(개인종합자산관리계좌)를 활용하면 배당소득세 비과세 혜택을 받을 수 있습니다. 서민형 기준 400만원까지 비과세, 초과분은 9.9% 분리과세.
        </Section>
        <Section title="ETF 배당(분배금)">
          ETF는 분기 또는 월마다 분배금을 지급합니다. TIGER, KODEX 등 국내 ETF는 매년 4월/1월 등 정기 분배가 일반적이며, 일부 커버드콜 ETF는 월배당을 지급합니다.
        </Section>
      </div>
    ),
  },
  {
    id: "metrics",
    icon: "📊",
    title: "배당 핵심 지표",
    cta: { label: "배당 랭킹에서 고배당 종목 보기 →", href: "/ranking" },
    relatedStocks: [
      { name: "KT&G", ticker: "033780", desc: "고배당 대표주" },
      { name: "JEPI", ticker: "JEPI", desc: "월배당 커버드콜 ETF" },
    ],
    content: (
      <div className="space-y-4 text-[14px] text-toss-label leading-relaxed">
        <Section title="배당수익률 (Dividend Yield)">
          <code className="bg-toss-bg px-2 py-0.5 rounded text-[13px]">배당수익률 = 연간 DPS ÷ 현재 주가 × 100</code><br />
          예: 주가 50,000원 / 연 배당 2,500원 → 수익률 5%. <strong>단, 주가 하락으로 인한 고수익률은 '배당 트랩'일 수 있으니 주의</strong>하세요.
        </Section>
        <Section title="주당배당금 (DPS)">
          1주당 지급되는 배당금입니다. 보유 주수 × DPS = 총 배당금.
        </Section>
        <Section title="배당성향 (Payout Ratio)">
          <code className="bg-toss-bg px-2 py-0.5 rounded text-[13px]">배당성향 = DPS ÷ EPS × 100</code><br />
          순이익 중 배당으로 지급하는 비율. 70% 이상이면 지속 가능성을 점검해야 합니다.
        </Section>
        <Section title="YOC (Yield on Cost)">
          <code className="bg-toss-bg px-2 py-0.5 rounded text-[13px]">YOC = 연간 DPS ÷ 내 매수가 × 100</code><br />
          현재 주가가 아닌 내 취득원가 기준 수익률. 장기 보유 시 YOC가 커질 수 있습니다.
        </Section>
        <Section title="배당 성장률 (DGR)">
          매년 배당금이 얼마나 증가하는지를 나타냅니다. 미국의 '배당귀족(Dividend Aristocrat)'은 25년 이상 연속 배당 성장 기업입니다.
        </Section>
        <Section title="배당 지급 주기">
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>월배당:</strong> JEPI, JEPQ, Realty Income(O) 등</li>
            <li><strong>분기배당:</strong> 삼성전자(2024~), 대부분의 미국주식</li>
            <li><strong>반기배당:</strong> 일부 한국 금융주</li>
            <li><strong>연배당:</strong> 대부분의 한국 전통 종목</li>
          </ul>
        </Section>
      </div>
    ),
  },
  {
    id: "strategy",
    icon: "🏆",
    title: "투자 전략",
    cta: { label: "내 포트폴리오 구성하기 →", href: "/dashboard" },
    relatedStocks: [
      { name: "TIGER 미국배당+7%", ticker: "476550", desc: "국내 인기 월배당 ETF" },
      { name: "맥쿼리인프라", ticker: "088980", desc: "국내 고배당 리츠" },
    ],
    content: (
      <div className="space-y-4 text-[14px] text-toss-label leading-relaxed">
        <Section title="성장주 vs 고배당주">
          성장주는 배당이 적지만 주가 상승 기대가 크고, 고배당주는 안정적 현금흐름을 제공합니다. <strong>장기 투자자는 두 전략을 혼합</strong>하는 것이 일반적입니다.
        </Section>
        <Section title="배당귀족 전략">
          미국 S&P500 기업 중 25년 이상 연속 배당 성장 기업들(JNJ, KO, PG 등). 안정성이 높지만 수익률은 상대적으로 낮습니다.
        </Section>
        <Section title="DRIP (배당 재투자)">
          배당금을 자동으로 해당 주식에 재투자하는 전략. 복리 효과로 장기 수익률을 극대화할 수 있습니다.
        </Section>
        <Section title="월배당 포트폴리오">
          매달 배당을 받는 포트폴리오 구성 전략입니다.<br />
          예시: JEPI (1,4,7,10월) + JEPQ (2,5,8,11월) + O/STAG (매월) 조합.
        </Section>
        <Section title="커버드콜 ETF">
          콜옵션을 매도해 프리미엄 수익으로 배당을 지급하는 ETF. JEPI(S&P500), JEPQ(나스닥), TIGER 미국배당+7% 등. <strong>주가 상승 참여가 제한</strong>되는 특성이 있습니다.
        </Section>
        <Section title="리츠(REITs) 투자">
          부동산 임대수익을 배당으로 지급하는 상품. 국내: 맥쿼리인프라, SK리츠, 신한알파리츠. 미국: O, STAG, SPG 등. 이익의 90% 이상을 배당으로 지급합니다.
        </Section>
      </div>
    ),
  },
  {
    id: "faq",
    icon: "💡",
    title: "자주 묻는 질문",
    cta: { label: "배당 캘린더에서 일정 확인 →", href: "/calendar" },
    relatedStocks: null,
    content: (
      <div className="space-y-4 text-[14px] text-toss-label leading-relaxed">
        <Section title="배당락일 당일 매수하면?">
          배당락일 <strong>당일 매수는 이번 배당을 받을 수 없습니다</strong>. 반드시 배당락일 전날(D-1)까지 매수해야 합니다. 배당락일 이후 주가는 배당금만큼 하락하는 경향이 있습니다 (배당락 효과).
        </Section>
        <Section title="배당락일에 주가가 떨어지는 이유?">
          배당락일에는 배당 권리가 소멸되므로 이론상 주가가 배당금만큼 하락합니다. 실제로는 시장 상황에 따라 다르게 움직일 수 있습니다.
        </Section>
        <Section title="미국 배당을 원화로 받나요?">
          미국 주식 배당은 달러(USD)로 지급되며, 증권사가 원화로 환전해 입금하거나 달러 그대로 보유할 수 있습니다.
        </Section>
        <Section title="ISA 계좌에서 배당세 절약 방법?">
          ISA 계좌 내 배당은 비과세 혜택(서민형 400만원, 일반형 200만원)을 받을 수 있습니다. 초과분은 9.9% 분리과세로 15.4%보다 유리합니다.
        </Section>
        <Section title="배당 트랩이란?">
          비정상적으로 높은 배당수익률의 원인이 주가 급락인 경우를 말합니다. 기업 실적 악화나 일회성 배당일 수 있어 신중한 분석이 필요합니다.
        </Section>
      </div>
    ),
  },
  {
    id: "korea",
    icon: "🇰🇷",
    title: "한국 배당주 가이드",
    cta: { label: "한국 배당 랭킹 보기 →", href: "/ranking" },
    relatedStocks: [
      { name: "KB금융", ticker: "105560", desc: "은행 고배당" },
      { name: "SK텔레콤", ticker: "017670", desc: "통신주 안정 배당" },
    ],
    content: (
      <div className="space-y-4 text-[14px] text-toss-label leading-relaxed">
        <Section title="한국 배당 지급 시기">
          대부분 <strong>12월 결산법인은 4월경</strong>에 배당금을 지급합니다. 삼성전자는 2024년부터 분기 배당으로 전환했습니다. 배당락일은 보통 12월 말 기준.
        </Section>
        <Section title="고배당주 선별 기준">
          <ul className="space-y-1 ml-4 list-disc">
            <li>최근 5년 연속 배당 지급 여부</li>
            <li>배당성향 50% 이하 (지속 가능성)</li>
            <li>배당수익률 3~7% 구간 (트랩 주의)</li>
            <li>영업이익 성장 추세 확인</li>
          </ul>
        </Section>
        <Section title="삼성전자 분기배당">
          삼성전자는 2024년부터 분기 배당을 도입해 1·4·7·10월에 분기별 DPS를 지급합니다. 기말 배당은 별도 주주총회 결의를 거쳐 결정됩니다.
        </Section>
        <Section title="리츠(REITs) 특징">
          부동산 임대수익을 배당으로 지급. 국내 상장 리츠는 KRX에서 주식처럼 거래 가능하며, 분기 또는 반기 배당이 일반적입니다.
        </Section>
      </div>
    ),
  },
  {
    id: "usa",
    icon: "🇺🇸",
    title: "미국 배당주 가이드",
    cta: { label: "미국 배당 랭킹 보기 →", href: "/ranking" },
    relatedStocks: [
      { name: "SCHD", ticker: "SCHD", desc: "배당 성장 ETF" },
      { name: "JEPI", ticker: "JEPI", desc: "월배당 커버드콜" },
    ],
    content: (
      <div className="space-y-4 text-[14px] text-toss-label leading-relaxed">
        <Section title="세금 처리">
          미국 배당은 원천징수 15%(한미조세조약)로 미국에서 공제 후 지급됩니다. 한국 거주자는 금융소득 종합과세 시 외국납부세액 공제 적용 가능.
        </Section>
        <Section title="SCHD vs JEPI">
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>SCHD:</strong> 배당 성장 중심, 수익률 3~4%, 주가 상승 참여 가능</li>
            <li><strong>JEPI:</strong> 커버드콜 전략, 수익률 7~10%, 주가 상승 제한적, 월배당</li>
          </ul>
        </Section>
        <Section title="배당귀족 대표 종목">
          JNJ(존슨앤존슨), KO(코카콜라), PG(P&G), MMM(3M) 등 25년 이상 배당 성장 유지 기업. 안정성이 높아 방어적 포트폴리오에 적합.
        </Section>
        <Section title="월배당 포트폴리오 구성">
          O(리얼티인컴), STAG(스태그인더스트리얼)은 매월 배당. JEPI, JEPQ도 월배당. 3개 이상 조합하면 사실상 매월 배당 수령 가능.
        </Section>
        <Section title="환율 리스크 관리">
          원달러 환율에 따라 실수령 원화가 달라집니다. 환헤지(H) ETF를 활용하거나 달러 예수금으로 재투자하는 방법을 고려해보세요.
        </Section>
      </div>
    ),
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold text-toss-text mb-1.5">{title}</p>
      <div className="text-toss-label">{children}</div>
    </div>
  );
}

export default function WikiPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-toss-text">배당 위키</h1>
        <p className="text-base text-toss-sub">배당 투자의 모든 것을 알아보세요.</p>
      </div>

      {/* 초보자 시작 가이드 배너 */}
      <div className="bg-gradient-to-r from-toss-blue to-blue-600 rounded-2xl p-5 text-white">
        <p className="text-[16px] font-extrabold mb-1">💡 배당 투자 처음이세요?</p>
        <p className="text-[13px] opacity-85 mb-3">아래 순서대로 따라하면 첫 배당을 받을 수 있어요.</p>
        <div className="flex flex-wrap gap-2 text-[12px] font-bold">
          {[
            { step: "1", label: "초보자 가이드 읽기", href: "#" },
            { step: "2", label: "종목 검색·계산", href: "/" },
            { step: "3", label: "포트폴리오 추가", href: "/dashboard" },
            { step: "4", label: "캘린더로 추적", href: "/calendar" },
          ].map(({ step, label, href }) => (
            <a key={step} href={href}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors">
              <span className="w-4 h-4 rounded-full bg-white text-toss-blue text-[10px] font-black flex items-center justify-center flex-shrink-0">{step}</span>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* 아코디언 섹션들 */}
      <div className="space-y-3">
        {SECTIONS.map((sec) => (
          <div key={sec.id} className="bg-toss-card rounded-2xl shadow-card overflow-hidden">
            <button
              onClick={() => setOpen(open === sec.id ? null : sec.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-toss-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{sec.icon}</span>
                <span className="text-[16px] font-extrabold text-toss-text">{sec.title}</span>
              </div>
              <svg
                className={`w-5 h-5 text-toss-label transition-transform duration-200 ${open === sec.id ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open === sec.id && (
              <div className="px-5 pb-5 space-y-4 border-t border-toss-border">
                <div className="pt-4">{sec.content}</div>

                {/* 관련 종목 추천 */}
                {sec.relatedStocks && sec.relatedStocks.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[12px] font-semibold text-toss-sub">관련 추천 종목</p>
                    <div className="flex flex-wrap gap-2">
                      {sec.relatedStocks.map((s) => (
                        <a key={s.ticker} href={`/?ticker=${s.ticker}`}
                          className="flex items-center gap-2 px-3 py-2 bg-toss-bg rounded-xl
                                     border border-toss-border hover:border-toss-blue hover:bg-blue-50
                                     dark:hover:bg-blue-900/20 transition-colors">
                          <div>
                            <p className="text-[13px] font-bold text-toss-text">{s.name}</p>
                            <p className="text-[10px] text-toss-sub">{s.desc}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA 버튼 */}
                <a href={sec.cta.href}
                  className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl
                             bg-toss-blue/10 text-toss-blue hover:bg-toss-blue hover:text-white
                             text-[13px] font-bold transition-colors">
                  {sec.cta.label}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[12px] text-toss-sub text-center pb-4">
        * 본 내용은 투자 권유가 아닌 정보 제공 목적입니다. 투자 결정은 본인의 판단으로 하시기 바랍니다.
      </p>
    </div>
  );
}
