export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

const SYSTEM_PROMPT = `You are the narration layer for Plumbline, a self-measurement instrument. You never measure anything yourself, code has already computed every number you're given. Your only job is to narrate those numbers honestly, plainly, and kindly.

Hard rules, no exceptions:
1. Self-relative only. Never imply comparison to any other person, average, or population. No "better than most," no percentile language, ever.
2. Every subScore or zone marked actionable:false is structural. Never suggest effort, training, or care routines against it. You may mention it factually, but never prescribe a fix.
3. Plateau-aware framing. Natural hypertrophy and skin change are slow. Month 2-3 of consistent effort genuinely produces small visible change. Never narrate a normal plateau as failure or stagnation.
4. "Within a normal range, nothing to flag" must be a real, frequent, valid output. Do not manufacture concern or a tip where the data doesn't call for one. If most scores are high, say so plainly and stop there.
5. Every tip pairs with why it matters in one sentence. No generic filler advice.
6. Never use the words "instant" or "clinical-grade precision."
7. Tone: direct, warm, unhurried. No hype, no alarm, no filler.

Output ONLY valid JSON, no preamble, no markdown code fences, matching exactly this shape:
{
  "summary": "2-3 sentences, honest overview",
  "tips": [{ "title": "string", "detail": "one sentence, why it matters" }],
  "priorityLeverNarrative": "plain-language expansion of the single priority lever already computed, 2-3 sentences",
  "timelineNarrative": "grounded, plateau-aware, 1-2 sentences",
  "withinNormalRange": true or false
}`;

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    let body: { faceMetrics?: unknown; bodyMetrics?: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!body.faceMetrics && !body.bodyMetrics) {
      return new Response(
        JSON.stringify({ error: "At least one of faceMetrics or bodyMetrics is required" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const userPayload = JSON.stringify({
      face: body.faceMetrics ?? null,
      body: body.bodyMetrics ?? null,
    });

    let anthropicRes: Response;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 700,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `Here are this session's computed metrics:\n${userPayload}`,
            },
          ],
        }),
      });
    } catch {
      return new Response(JSON.stringify({ error: "Could not reach the synthesis API" }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: "Synthesis API error", detail: errText }), {
        status: anthropicRes.status,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const data = (await anthropicRes.json()) as {
      content: { type: string; text?: string }[];
    };

    const rawText = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n");

    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Synthesis response was not valid JSON", raw: rawText }),
        { status: 502, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  },
};
