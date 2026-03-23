/**
 * 종목 배당 공시 목록
 * GET /api/stock/[code]/disclosure
 *
 * - DART 공시만 담당 (메인 계산 엔진과 분리)
 * - 종목 상세 뷰에서만 호출 (지연 로딩)
 * - 캐시: 6시간
 */

import { NextRequest, NextResponse } from "next/server";
import { getDartDisclosures } from "@/lib/dart-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!code) {
    return NextResponse.json({ error: "종목코드가 필요합니다." }, { status: 400 });
  }

  if (!process.env.DART_API_KEY) {
    return NextResponse.json(
      { disclosures: [], message: "DART_API_KEY 미설정" },
      {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      },
    );
  }

  const disclosures = await getDartDisclosures(code, 5);

  return NextResponse.json(
    { disclosures },
    {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    },
  );
}
