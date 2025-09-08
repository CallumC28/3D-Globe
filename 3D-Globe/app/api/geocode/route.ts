import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rateLimit";
import { googleGeocode } from "@/lib/google";

export const runtime = "edge";

export const GET = withRateLimit(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    const result = await googleGeocode(q);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Geocode failed" }, { status: 500 });
  }
});
