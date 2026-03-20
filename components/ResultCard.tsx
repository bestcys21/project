import { DividendResult, formatAmount, formatDate } from "@/lib/calculator";

interface Props {
  result: DividendResult;
}

export default function ResultCard({ result }: Props) {
  const { stock, quantity, purchaseDate, market, dps, exDate, paymentDate, grossAmount, netAmount, taxRate, eligible } = result;

  return (
    <div className="fade-up bg-toss-card rounded-2xl shadow-card p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-toss-label">계산 결과</span>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
          market === "KR"
            ? "bg-blue-50 text-blue-700"
            : "bg-green-50 text-green-700"
        }`}>
          {market === "KR" ? "KRX" : "NYSE/NASDAQ"}
        </span>
      </div>

      {/* 종목 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-toss-bg rounded-xl flex items-center justify-center text-xl">
          {eligible ? "📈" : "📉"}
        </div>
        <div>
          <p className="text-[17px] font-extrabold text-toss-text">{stock}</p>
          <p className="text-xs text-toss-sub mt-0.5">
            {quantity.toLocaleString()}주 · {formatDate(purchaseDate)} 매수 예정
          </p>
        </div>
      </div>

      {/* 배당락일 이후 매수 경고 */}
      {!eligible && (
        <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-orange-50 border border-orange-200">
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

      <hr className="border-toss-border" />

      {/* 수치 */}
      <div className="space-y-3">
        <Row label="예상 배당락일" value={exDate} />
        <Row label="배당 지급일"   value={paymentDate} />
        <Row label="주당 배당금"   value={formatAmount(dps, market)} />
        <hr className="border-toss-border" />
        <Row label="세전 배당금"   value={eligible ? formatAmount(grossAmount, market) : "-"} />
        <div className={`flex justify-between items-center -mx-1 px-3 py-2.5 rounded-xl ${
          eligible ? "bg-blue-50" : "bg-toss-bg"
        }`}>
          <span className={`text-[15px] font-bold ${eligible ? "text-toss-blue" : "text-toss-sub"}`}>
            세후 실수령액
          </span>
          <span className={`text-[20px] font-extrabold ${eligible ? "text-toss-blue" : "text-toss-sub"}`}>
            {eligible ? formatAmount(netAmount, market) : (market === "KR" ? "0원" : "$0.00")}
          </span>
        </div>
      </div>

      <p className="text-[12px] text-toss-sub leading-relaxed">
        * 배당소득세 {(taxRate * 100).toFixed(1)}% 원천징수 적용 기준입니다.<br />
        * 배당락일 전날까지 매수해야 배당을 받을 수 있어요.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[14px] text-toss-label">{label}</span>
      <span className="text-[15px] font-bold text-toss-text">{value}</span>
    </div>
  );
}
