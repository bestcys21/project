"use client";

import { useState } from "react";
import { DividendResult, formatAmount, formatDate } from "@/lib/calculator";
import { addHolding } from "@/lib/storage";
import StockLogo from "./StockLogo";

interface Props {
  result: DividendResult;
  ticker?: string;
  exchange?: "KS" | "KQ";
  onAdded?: () => void;
  onAddAnother?: () => void;
}

export default function ResultCard({ result, ticker, exchange, onAdded, onAddAnother }: Props) {
  const { stock, quantity, purchaseDate, market, dps, exDate, paymentDate,
          grossAmount, netAmount, taxRate, eligible } = result;

  const [added, setAdded] = useState(false);

  // 연간/월간 배당 추정 (KR=1회/년, US=4회/년 기본값)
  const freq         = market === "US" ? 4 : 1;
  const annualGross  = grossAmount * freq;
  const annualNet    = netAmount * freq;
  const monthlyNet   = annualNet / 12;

  function handleAddPortfolio() {
    addHolding({
      ticker:       ticker ?? stock,
      name:         stock,
      market,
      quantity,
      purchaseDate,
    });
    setAdded(true);
    onAdded?.();
  }

  return (
    <div className="fade-up bg-toss-card rounded-2xl shadow-card p-6 space-y-4">
      {/* 헤더: 타이틀 + 거래소 배지 */}
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-extrabold text-toss-text">계산 결과</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
          market === "KR"
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
            : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
        }`}>
          {market === "KR" ? "KRX" : "NYSE/NASDAQ"}
        </span>
      </div>

      {/* 종목 */}
      <div className="flex items-center gap-3">
        <StockLogo ticker={ticker ?? stock} name={stock} market={market} size={44} />
        <div>
          <p className="text-[17px] font-extrabold text-toss-text">{stock}</p>
          <p className="text-[12px] text-toss-sub mt-0.5">
            {quantity.toLocaleString()}주 · {formatDate(purchaseDate)} 매수 예정
          </p>
        </div>
      </div>

      {/* 배당락일 이후 매수 경고 */}
      {!eligible && (
        <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <span className="text-orange-400 flex-shrink-0 text-lg">⚠️</span>
          <div>
            <p className="text-[13px] font-bold text-orange-600">이번 배당은 받을 수 없어요</p>
            <p className="text-[12px] text-orange-500 mt-0.5">
              배당락일({exDate})에 이미 권리가 확정돼요.<br />
              배당락일 전날까지 매수해야 배당을 받을 수 있어요.
            </p>
          </div>
        </div>
      )}

      {/* ── 세후 실수령액 HERO (최우선 노출) ── */}
      <div className={`rounded-2xl px-5 py-4 ${eligible ? "bg-toss-blue" : "bg-toss-bg"}`}>
        <p className={`text-[11px] font-semibold mb-1 ${eligible ? "text-white/70" : "text-toss-sub"}`}>
          세후 실수령액
        </p>
        <p className={`text-[30px] font-extrabold leading-none tracking-tight ${eligible ? "text-white" : "text-toss-sub"}`}>
          {eligible ? formatAmount(netAmount, market) : (market === "KR" ? "0원" : "$0.00")}
        </p>
        {eligible && (
          <p className="text-[11px] text-white/60 mt-1.5">
            배당소득세 {(taxRate * 100).toFixed(1)}% 원천징수 기준
          </p>
        )}
      </div>

      {/* 핵심 지표 3개: 연간 예상 강조 */}
      {eligible && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-toss-bg rounded-xl p-3 text-center">
            <p className="text-[10px] text-toss-sub font-medium mb-1">1회 세후</p>
            <p className="text-[13px] font-bold text-toss-label">
              {market === "KR"
                ? `${Math.round(netAmount).toLocaleString()}원`
                : `$${netAmount.toFixed(2)}`}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center ring-1 ring-toss-blue/20">
            <p className="text-[10px] text-toss-blue font-semibold mb-1">연간 예상</p>
            <p className="text-[15px] font-extrabold text-toss-blue">
              {market === "KR"
                ? `${Math.round(annualNet).toLocaleString()}원`
                : `$${annualNet.toFixed(2)}`}
            </p>
          </div>
          <div className="bg-toss-bg rounded-xl p-3 text-center">
            <p className="text-[10px] text-toss-sub font-medium mb-1">월 평균</p>
            <p className="text-[13px] font-bold text-toss-label">
              {market === "KR"
                ? `${Math.round(monthlyNet).toLocaleString()}원`
                : `$${monthlyNet.toFixed(2)}`}
            </p>
          </div>
        </div>
      )}

      {/* 상세 수치 */}
      <div className="space-y-2.5">
        <Row label="예상 배당락일" value={exDate} />
        <Row label="배당 지급일"   value={paymentDate} />
        <Row label="주당 배당금"   value={formatAmount(dps, market)} />
        <hr className="border-toss-border" />
        <Row label="세전 배당금"   value={eligible ? formatAmount(grossAmount, market) : "-"} dimValue />
      </div>

      {/* 포트폴리오 추가 CTA */}
      <div className="pt-1">
        {added ? (
          <div className="space-y-2.5">
            {/* 저장 확인 */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <span className="text-green-500 flex-shrink-0">✓</span>
              <span className="text-[13px] font-bold text-green-600">포트폴리오에 추가되었습니다</span>
            </div>

            {/* 현재 월 배당금 표시 */}
            {eligible && monthlyNet > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-center">
                <p className="text-[11px] text-toss-sub mb-0.5">현재 예상 배당금</p>
                <p className="text-[22px] font-extrabold text-toss-blue leading-tight">
                  {market === "KR"
                    ? `월 ${Math.round(monthlyNet).toLocaleString()}원`
                    : `월 $${monthlyNet.toFixed(2)}`}
                </p>
              </div>
            )}

            {/* 부족함 느끼게 하는 메시지 */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3.5 py-2.5 text-center">
              <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                💡 다른 종목도 추가해볼까요?
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                여러 종목으로 분산할수록 배당이 더 안정적이에요
              </p>
            </div>

            {/* 종목 더 추가하기 — PRIMARY CTA */}
            {onAddAnother && (
              <button
                onClick={onAddAnother}
                className="w-full flex items-center justify-center gap-2
                           bg-toss-blue hover:bg-toss-blueDark active:scale-[0.98]
                           text-white font-bold text-[15px] py-3.5 rounded-2xl
                           transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                종목 더 추가하기
              </button>
            )}

            {/* 내 배당 보러가기 — secondary */}
            <a href="/dashboard"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl
                         border border-toss-border text-toss-sub text-[13px] font-semibold
                         hover:border-toss-blue hover:text-toss-blue transition-colors">
              내 배당 현황 보러가기 →
            </a>
          </div>
        ) : (
          <button
            onClick={handleAddPortfolio}
            className="w-full flex items-center justify-center gap-2
                       bg-toss-blue hover:bg-toss-blueDark active:scale-[0.98]
                       text-white font-bold text-[15px] py-3.5 rounded-2xl
                       transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            내 포트폴리오에 추가
          </button>
        )}
      </div>

      {/* 연간 배당 추정 안내 */}
      {eligible && (
        <p className="text-[11px] text-toss-sub leading-relaxed">
          * 연간·월 평균은 {market === "KR" ? "연 1회" : "분기 1회(연 4회)"} 기준 추정치입니다.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, dimValue }: { label: string; value: string; dimValue?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] font-medium text-toss-sub">{label}</span>
      <span className={`text-[14px] font-bold ${dimValue ? "text-toss-label" : "text-toss-text"}`}>{value}</span>
    </div>
  );
}
