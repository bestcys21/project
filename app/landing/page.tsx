import Link from "next/link";
import { LogoIcon } from "@/components/Logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-toss-bg px-6 text-center space-y-8">
      <LogoIcon size={72} />
      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold text-toss-text">배당노트</h1>
        <p className="text-lg text-toss-sub">서비스 소개 페이지 준비 중입니다.</p>
      </div>
      <Link
        href="/"
        className="px-6 py-3 bg-toss-blue text-white font-bold text-[15px] rounded-2xl hover:bg-toss-blueDark transition-colors"
      >
        배당 계산기 바로가기
      </Link>
    </div>
  );
}
