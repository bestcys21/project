import { NextRequest, NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker") ?? "";
  const market = req.nextUrl.searchParams.get("market") ?? "US";

  // KR 종목: .KS/.KQ 접미사 제거 (alphasquare는 6자리 코드만 사용)
  const code = ticker.replace(/\.(KS|KQ)$/i, "");
  const url =
    market === "KR"
      ? `https://file.alphasquare.co.kr/media/images/stock_logo/kr/${code}.png`
      : `https://financialmodelingprep.com/image-stock/${ticker}.png`;

  try {
    const res = await fetch(url);
    if (!res.ok) return new NextResponse(null, { status: 404 });

    // 응답이 이미지인지 확인 (placeholder HTML 방지)
    const contentType = res.headers.get("Content-Type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
