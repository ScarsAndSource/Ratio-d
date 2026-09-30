/**
 * Server-side validation + whitelisting of the synthesis request.
 *
 * The client already sends a minimal payload (src/lib/synthesis/payload.ts),
 * but the worker must not trust the client: this module rebuilds the request
 * from an explicit whitelist, so
 *   - anything not listed here (photos, landmark points, timestamps, unknown
 *     future fields, or stale cached clients that still send them) is dropped
 *     and never reaches the model;
 *   - every value is type- and range-checked;
 *   - free-text fields are single-line and length-capped, which bounds cost
 *     and limits how much a tampered client can smuggle into the prompt.
 *
 * Pure TypeScript (no Workers APIs) so it is unit-tested from the app's
 * test suite: src/lib/synthesis/workerPayload.test.ts.
 */

/** Hard ceiling on the raw request body. A real payload is ~2-4 KB. */
export const MAX_REQUEST_BYTES = 256 * 1024;

const MAX_ITEMS = 24;
const MAX_KEY = 48;
const MAX_LABEL = 80;
const MAX_TEXT = 300;

const REGIONS = ["shoulders", "chest", "waist", "arms", "legs", "posture"] as const;
const TRAINING_AGES = ["new", "under1y", "1to3y", "3plus", "unsure"] as const;
const UNDERTONES = ["warm", "cool", "neutral"] as const;
const TRENDS = ["up", "down", "flat"] as const;
const BANDS = ["lower", "moderate", "higher"] as const;

export interface FacePayload {
  overallScore: number;
  subScores: { key: string; label: string; value: number; actionable: boolean; trend?: (typeof TRENDS)[number] }[];
  priorityLever: { subScoreKey: string; label: string; reason: string };
  angles: { label: string; valueDeg: number }[];
  undertone: { classification: (typeof UNDERTONES)[number]; confidence: number };
}

export interface BodyPayload {
  overallSymmetry: number;
  zones: { key: string; label: string; region: (typeof REGIONS)[number]; value: number; actionable: boolean }[];
  priorityLever: { zoneKey: string; label: string; reason: string };
  bodyFatEstimate: { band: (typeof BANDS)[number]; note: string };
  trainingAge: (typeof TRAINING_AGES)[number];
}

export type SanitizeResult =
  | { ok: true; face: FacePayload | null; body: BodyPayload | null }
  | { ok: false; error: string };

class Invalid extends Error {}

function fail(path: string, expectation: string): never {
  throw new Invalid(`${path} ${expectation}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function record(v: unknown, path: string): Record<string, unknown> {
  if (!isRecord(v)) fail(path, "must be an object");
  return v;
}

function list(v: unknown, path: string, max = MAX_ITEMS): unknown[] {
  if (!Array.isArray(v)) fail(path, "must be an array");
  if (v.length > max) fail(path, `must have at most ${max} items`);
  return v;
}

/** Single-line, trimmed, length-capped text. Control characters become spaces. */
function text(v: unknown, path: string, max: number): string {
  if (typeof v !== "string") fail(path, "must be a string");
  // eslint-disable-next-line no-control-regex
  const cleaned = v.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) fail(path, "must not be empty");
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

function key(v: unknown, path: string): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9_]{1,48}$/.test(v)) {
    fail(path, `must match [A-Za-z0-9_] and be 1-${MAX_KEY} characters`);
  }
  return v;
}

function num(v: unknown, path: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    fail(path, `must be a finite number between ${min} and ${max}`);
  }
  return v;
}

function bool(v: unknown, path: string): boolean {
  if (typeof v !== "boolean") fail(path, "must be a boolean");
  return v;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], path: string): T {
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    fail(path, `must be one of: ${allowed.join(", ")}`);
  }
  return v as T;
}

function sanitizeFace(raw: unknown): FacePayload {
  const o = record(raw, "faceMetrics");
  return {
    overallScore: num(o.overallScore, "faceMetrics.overallScore", 0, 100),
    subScores: list(o.subScores, "faceMetrics.subScores").map((item, i) => {
      const p = `faceMetrics.subScores[${i}]`;
      const s = record(item, p);
      const out: FacePayload["subScores"][number] = {
        key: key(s.key, `${p}.key`),
        label: text(s.label, `${p}.label`, MAX_LABEL),
        value: num(s.value, `${p}.value`, 0, 100),
        actionable: bool(s.actionable, `${p}.actionable`),
      };
      if (s.trend !== undefined) out.trend = oneOf(s.trend, TRENDS, `${p}.trend`);
      return out;
    }),
    priorityLever: (() => {
      const l = record(o.priorityLever, "faceMetrics.priorityLever");
      return {
        subScoreKey: key(l.subScoreKey, "faceMetrics.priorityLever.subScoreKey"),
        label: text(l.label, "faceMetrics.priorityLever.label", MAX_LABEL),
        reason: text(l.reason, "faceMetrics.priorityLever.reason", MAX_TEXT),
      };
    })(),
    angles: list(o.angles, "faceMetrics.angles").map((item, i) => {
      const p = `faceMetrics.angles[${i}]`;
      const a = record(item, p);
      return {
        label: text(a.label, `${p}.label`, MAX_LABEL),
        valueDeg: num(a.valueDeg, `${p}.valueDeg`, -180, 180),
      };
    }),
    undertone: (() => {
      const u = record(o.undertone, "faceMetrics.undertone");
      return {
        classification: oneOf(u.classification, UNDERTONES, "faceMetrics.undertone.classification"),
        confidence: num(u.confidence, "faceMetrics.undertone.confidence", 0, 1),
      };
    })(),
  };
}

function sanitizeBody(raw: unknown): BodyPayload {
  const o = record(raw, "bodyMetrics");
  return {
    overallSymmetry: num(o.overallSymmetry, "bodyMetrics.overallSymmetry", 0, 100),
    zones: list(o.zones, "bodyMetrics.zones").map((item, i) => {
      const p = `bodyMetrics.zones[${i}]`;
      const z = record(item, p);
      return {
        key: key(z.key, `${p}.key`),
        label: text(z.label, `${p}.label`, MAX_LABEL),
        region: oneOf(z.region, REGIONS, `${p}.region`),
        value: num(z.value, `${p}.value`, 0, 100),
        actionable: bool(z.actionable, `${p}.actionable`),
      };
    }),
    priorityLever: (() => {
      const l = record(o.priorityLever, "bodyMetrics.priorityLever");
      return {
        zoneKey: key(l.zoneKey, "bodyMetrics.priorityLever.zoneKey"),
        label: text(l.label, "bodyMetrics.priorityLever.label", MAX_LABEL),
        reason: text(l.reason, "bodyMetrics.priorityLever.reason", MAX_TEXT),
      };
    })(),
    bodyFatEstimate: (() => {
      const b = record(o.bodyFatEstimate, "bodyMetrics.bodyFatEstimate");
      return {
        band: oneOf(b.band, BANDS, "bodyMetrics.bodyFatEstimate.band"),
        note: text(b.note, "bodyMetrics.bodyFatEstimate.note", MAX_TEXT),
      };
    })(),
    trainingAge: oneOf(o.trainingAge, TRAINING_AGES, "bodyMetrics.trainingAge"),
  };
}

/**
 * `raw` is the parsed JSON body. Returns a rebuilt, whitelisted request or a
 * human-readable reason it was rejected. Unknown fields are ignored (dropped),
 * not rejected, so an older cached client keeps working.
 */
export function sanitizeSynthesisRequest(raw: unknown): SanitizeResult {
  if (!isRecord(raw)) return { ok: false, error: "Request body must be a JSON object" };

  const hasFace = raw.faceMetrics !== undefined && raw.faceMetrics !== null;
  const hasBody = raw.bodyMetrics !== undefined && raw.bodyMetrics !== null;
  if (!hasFace && !hasBody) {
    return { ok: false, error: "At least one of faceMetrics or bodyMetrics is required" };
  }

  try {
    return {
      ok: true,
      face: hasFace ? sanitizeFace(raw.faceMetrics) : null,
      body: hasBody ? sanitizeBody(raw.bodyMetrics) : null,
    };
  } catch (err) {
    if (err instanceof Invalid) return { ok: false, error: `Invalid metrics: ${err.message}` };
    throw err;
  }
}

/** Byte length of a string as UTF-8, without needing TextEncoder typings. */
export function utf8ByteLength(s: string): number {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      bytes += 4; // surrogate pair encodes one 4-byte code point
      i++;
    } else bytes += 3;
  }
  return bytes;
}
