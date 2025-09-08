import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rateLimit";
import { getOpenAI } from "@/lib/openai";
import { inMemoryLRU } from "@/lib/cache";

export const runtime = "edge";

type Landmark = { name: string; city: string };
type Facts = {
  summary: string;
  landmarks: Landmark[];
  languages: string[];
  fun_fact: string;
};

const SCHEMA_KEYS = ["summary", "landmarks", "languages", "fun_fact"] as const;

function isFacts(obj: unknown): obj is Facts {
  if (!obj || typeof obj !== "object") return false;
  const rec = obj as Record<string, unknown>;

  for (const k of SCHEMA_KEYS) {
    if (!(k in rec)) return false;
  }

  if (typeof rec.summary !== "string" || rec.summary.length > 600) return false;

  if (!Array.isArray(rec.landmarks)) return false;
  for (const l of rec.landmarks as unknown[]) {
    if (
      !l ||
      typeof l !== "object" ||
      typeof (l as any).name !== "string" ||
      typeof (l as any).city !== "string"
    ) {
      return false;
    }
  }

  if (!Array.isArray(rec.languages)) return false;
  for (const x of rec.languages as unknown[]) {
    if (typeof x !== "string") return false;
  }

  if (typeof rec.fun_fact !== "string") return false;

  return true;
}

// Ephemeral in-memory cache (resets on cold start)
const CACHE = inMemoryLRU<Facts>({ max: 200, ttlMs: 1000 * 60 * 60 * 12 }); // 12h

export const GET = withRateLimit(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const raw = searchParams.get("country")?.trim() ?? "";
  let iso3: string | null = null;
  let name: string | null = null;

  // Accept ISO3 or NAME:<string>
  if (raw.startsWith("NAME:")) {
    name = raw.slice(5).trim();
  } else if (/^[A-Z]{3}$/i.test(raw)) {
    iso3 = raw.toUpperCase();
  } else {
    return NextResponse.json(
      { error: "Invalid or missing country identifier." },
      { status: 400 }
    );
  }

  const cacheKey = iso3 ? `facts:${iso3}` : `facts:name:${name}`;
  const cached = await CACHE.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const openai = getOpenAI();

  const systemPrompt = `
You are a neutral, concise country facts writer.
Return STRICT JSON matching this schema:
{
  "summary": "string (<= 120 words)",
  "landmarks": [{"name":"", "city":""}],
  "languages": ["English", "..."],
  "fun_fact": "string"
}
Guidelines:
- 120–200 words TOTAL across all text.
- Include 3–5 bullet-point style items internally: history snapshot, 2–3 notable landmarks (with cities), a cultural note, primary language(s), and one fun fact.
- Avoid sensitive or controversial topics (politics, conflict, adult content). If necessary, replace with a benign cultural or geographic detail.
- Use globally recognized, verifiable facts.
- Keep names short; avoid URLs or lists of dates.
- Landmarks should be well-known places within the country.
`.trim();

  const userPrompt = iso3
    ? `Provide facts for country ISO3 code: ${iso3}. Return only JSON per schema.`
    : `Provide facts for the country named "${name}". Return only JSON per schema.`;

  // OpenAI call (Edge-compatible)
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 400,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });

  const rawResp = resp.choices?.[0]?.message?.content ?? "{}";

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResp);
  } catch {
    return NextResponse.json({ error: "Bad AI response." }, { status: 502 });
  }

  if (!isFacts(parsed)) {
    return NextResponse.json({ error: "Invalid AI schema." }, { status: 502 });
  }

  const facts = parsed as Facts;
  await CACHE.set(cacheKey, facts);

  return NextResponse.json(facts, { status: 200 });
});
