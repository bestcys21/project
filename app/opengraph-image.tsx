import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "배당노트 - 가장 쉬운 주식 배당금 계산기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #3182F6 0%, #1a5fd8 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* 로고 + 서비스명 */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "white",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
            }}
          >
            📊
          </div>
          <div style={{ color: "white", fontSize: "56px", fontWeight: 900, letterSpacing: "-1px" }}>배당노트</div>
        </div>

        {/* 메인 카피 */}
        <div
          style={{
            color: "white",
            fontSize: "34px",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.4,
            marginBottom: "16px",
          }}
        >
          가장 쉬운 주식 배당금 계산기 & 포트폴리오 관리
        </div>

        {/* 서브 카피 */}
        <div
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "22px",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.5,
          }}
        >
          종목·수량 입력만으로 세후 배당금과 지급 일정을 즉시 확인 · 로그인 없이 무료
        </div>

        {/* URL 뱃지 */}
        <div
          style={{
            marginTop: "40px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "40px",
            padding: "10px 28px",
            color: "rgba(255,255,255,0.9)",
            fontSize: "18px",
            fontWeight: 600,
          }}
        >
          project-ruby-rho-88.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
