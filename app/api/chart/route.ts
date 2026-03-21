import { NextRequest, NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function getYfClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const YF = require("yahoo-finance2").default;
  return new YF({ suppressNotices: ["yahooSurvey"] });
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const period  = req.nextUrl.searchParams.get("period") ?? "1Y"; // "1M" | "3M" | "1Y"

  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  const now     = new Date();
  const period1 = new Date(now);
  if      (period === "1M") period1.setMonth(period1.getMonth() - 1);
  else if (period === "3M") period1.setMonth(period1.getMonth() - 3);
  else                      period1.setFullYear(period1.getFullYear() - 1);

  const interval = period === "1Y" ? "1wk" : "1d";

  // 한국 주식 후보 (KS 실패 시 KQ 시도)
  const isKorean = ticker.endsWith(".KS") || ticker.endsWith(".KQ");
  const candidates = isKorean
    ? ticker.endsWith(".KS")
      ? [ticker, ticker.replace(".KS", ".KQ")]
      : [ticker, ticker.replace(".KQ", ".KS")]
    : [ticker];

  const yf = getYfClient();

  for (const t of candidates) {
    try {
      const hist = await yf.historical(t, {
        period1: period1.toISOString().split("T")[0],
        period2: now.toISOString().split("T")[0],
        interval,
      });

      const points = ((hist as any[]) ?? [])
        .filter((h: any) => h.close != null)
        .map((h: any) => ({
          date:  new Date(h.date).toISOString().split("T")[0],
          price: Math.round(h.close * 100) / 100,
        }));

      if (points.length === 0) continue;

      return NextResponse.json({ points, ticker: t }, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      });
    } catch { /* try next */ }
  }

  return NextResponse.json({ error: "주가 데이터를 가져올 수 없습니다." }, { status: 404 });
}
