// End-to-end test of the worker's /synthesis handler with fetch mocked, to
// verify what ACTUALLY reaches Anthropic and how quota is spent.
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker, { type Env } from "../../../worker/src/index";
import { toSynthesisBody } from "./payload";
import { buildBodyMetrics } from "../body/score";

const ENV: Env = {
  ANTHROPIC_API_KEY: "test-key",
  ALLOWED_ORIGIN: "http://localhost:5173",
  SUPABASE_URL: "https://real-project.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

const PHOTO = "data:image/jpeg;base64," + "Z".repeat(120_000);

function bodyPayload() {
  return toSynthesisBody(
    buildBodyMetrics({
      zones: [{ key: "postureTilt", label: "Shoulder level", region: "posture", value: 61, actionable: true, heatColor: "yellow" }],
      bodyFatEstimate: { band: "moderate", note: "n" },
      trainingAge: "unsure",
      frontReferenceImage: PHOTO,
    })
  );
}

interface Calls {
  anthropicBodies: string[];
  usageWrites: number;
}

let calls: Calls;

beforeEach(() => {
  calls = { anthropicBodies: [], usageWrites: 0 };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "user-1" }), { status: 200 });
      if (url.includes("/rest/v1/worker_usage") && init?.method === "POST") {
        calls.usageWrites++;
        return new Response("{}", { status: 201 });
      }
      if (url.includes("/rest/v1/worker_usage")) return new Response(JSON.stringify([]), { status: 200 });
      if (url === "https://api.anthropic.com/v1/messages") {
        calls.anthropicBodies.push(String(init?.body));
        const reply = { summary: "s", tips: [], priorityLeverNarrative: "p", timelineNarrative: "t", withinNormalRange: true };
        return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(reply) }] }), { status: 200 });
      }
      throw new Error("unexpected fetch " + url);
    })
  );
});

function post(body: string) {
  return worker.fetch(
    new Request("https://worker.example/", {
      method: "POST",
      headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      body,
    }),
    ENV
  );
}

describe("worker /synthesis handler", () => {
  it("forwards a valid request to Anthropic with NO photo and spends one read", async () => {
    const res = await post(JSON.stringify({ faceMetrics: null, bodyMetrics: bodyPayload() }));
    expect(res.status).toBe(200);
    expect(calls.anthropicBodies).toHaveLength(1);
    expect(calls.anthropicBodies[0]).not.toContain("data:image");
    expect(calls.anthropicBodies[0]).not.toContain("ZZZZZZZZZZ");
    expect(calls.anthropicBodies[0]!.length).toBeLessThan(6_000);
    expect(calls.usageWrites).toBe(1);
  });

  it("strips a photo from a stale client's request instead of forwarding it", async () => {
    const stale = { faceMetrics: null, bodyMetrics: { ...bodyPayload(), frontReferenceImage: PHOTO } };
    const res = await post(JSON.stringify(stale));
    expect(res.status).toBe(200);
    expect(calls.anthropicBodies[0]).not.toContain("frontReferenceImage");
    expect(calls.anthropicBodies[0]).not.toContain("data:image");
  });

  it("rejects an invalid payload with 400 and does NOT spend a read or call Anthropic", async () => {
    const res = await post(JSON.stringify({ bodyMetrics: { ...bodyPayload(), trainingAge: "wizard" } }));
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: string }).toMatchObject({ error: expect.stringContaining("trainingAge") });
    expect(calls.usageWrites).toBe(0);
    expect(calls.anthropicBodies).toHaveLength(0);
  });

  it("rejects malformed JSON with 400 and spends nothing", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
    expect(calls.usageWrites).toBe(0);
    expect(calls.anthropicBodies).toHaveLength(0);
  });

  it("rejects an empty request (neither face nor body) with 400 and spends nothing", async () => {
    const res = await post(JSON.stringify({ faceMetrics: null, bodyMetrics: null }));
    expect(res.status).toBe(400);
    expect(calls.usageWrites).toBe(0);
  });

  it("rejects an oversized body with 413 and spends nothing", async () => {
    const res = await post(JSON.stringify({ bodyMetrics: bodyPayload(), pad: "x".repeat(300 * 1024) }));
    expect(res.status).toBe(413);
    expect(calls.usageWrites).toBe(0);
    expect(calls.anthropicBodies).toHaveLength(0);
  });

  it("still requires sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const res = await post(JSON.stringify({ bodyMetrics: bodyPayload() }));
    expect(res.status).toBe(401);
  });
});
