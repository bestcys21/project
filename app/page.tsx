import CalculatorForm from "@/components/CalculatorForm";
import InfoCards from "@/components/InfoCards";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <h1 className="text-2xl font-extrabold text-toss-text leading-snug">
          몇 주 언제 사면<br />언제 얼마 받을까?
        </h1>
        <p className="text-sm text-toss-sub">
          종목·수량·매수일만 입력하면 세후 배당금을 바로 알려드려요.
        </p>
      </div>
      <CalculatorForm />
      <InfoCards />
    </div>
  );
}
