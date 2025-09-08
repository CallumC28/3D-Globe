import { NextRequest, NextResponse } from "next/server";

type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();
const CAPACITY = 30; // tokens
const REFILL_PER_SEC = 0.5; // tokens per second (~30 req/min)

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anon";

    const now = Date.now();
    const bucket = buckets.get(ip) ?? { tokens: CAPACITY, last: now };
    // refill
    const deltaSec = (now - bucket.last) / 1000;
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + deltaSec * REFILL_PER_SEC);
    bucket.last = now;

    if (bucket.tokens < 1) {
      buckets.set(ip, bucket);
      return NextResponse.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }

    bucket.tokens -= 1;
    buckets.set(ip, bucket);

    return handler(req);
  };
}
