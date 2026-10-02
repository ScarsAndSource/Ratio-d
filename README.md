# Plumbline (working title)

An instrument, not a mirror. Camera-based face and body measurement,
read only against your own baseline — never against anyone else's.

## Design language
- **Capture / analysis screens** run dark (`ink`) — a viewfinder should be
  quiet, low-noise, easy on the eyes during a live scan.
- **Results / reflection screens** run light (`paper`) — warmth matters
  more once a number is on screen.
- **Every measurement is mono** (`IBM Plex Mono`, `.reading` class). No
  exceptions — it's the one strict typographic rule in the app.
- **Brass** = actionable (priority levers, CTAs). **Reading teal** =
  measured data only, never decoration. **Signal rust** = reserved for
  genuine outlier flags, used rarely on purpose.
- Signature element: `ReadingRing` — an aperture dial reused for capture
  guidance, score dials, and loading states.

## Status
Production ready! Fully wired with `@mediapipe/tasks-vision` (Face + Pose Landmarker), quality-gated multi-angle capture, isotropic face & body metric compute modules, Cloudflare Worker AI synthesis, Supabase auth/storage persistence, PWA manifest/assets, and calibration harnesses.

## System Architecture & Metric Engine
- **Browser-Side Landmarking**: Camera frames are processed locally using MediaPipe Tasks Vision (`FaceLandmarker` and `PoseLandmarker`). Raw frames never leave the client device.
- **Quality Gating & Stability**: Live capture gates analyze lighting, head pose (pitch/yaw/roll from transformation matrix), and landmark jitter standard deviation (`landmarkJitterSd`) across consecutive frames. Captures only fire when stability thresholds are met.
- **Isotropic Geometry Math**: All face and body measurements convert 2D pixel landmarks to aspect-corrected isotropic space (`src/lib/geometry/space.ts`), making canthal tilt, face height/width ratios, and shoulder/waist/hip taper scores aspect-ratio invariant across different camera sensors.
- **Unified Compute Modules**:
  - Face metrics (`src/lib/face/compute.ts`): Computes canthal tilt, face shape ratio, symmetry, and skin tone/smoothness metrics from single captures.
  - Body metrics (`src/lib/body/fromSession.ts`): Aggregates front, side, and back pose captures into a unified body session reading, calculating shoulder-to-waist taper, chest depth proxy, and body fat band estimates.

## Calibration & Repeatability Harness
The repository includes an automated internal calibration harness to measure measurement noise and compute Minimum Detectable Change ($MDC_{95}$):
1. Dev-only harness (`useRepeatabilityRun.ts` and `RepeatabilityPanel.tsx`) runs $N$ consecutive captures under fixed positioning.
2. `summarizeRuns()` calculates metric mean, standard deviation ($SD$), standard error of measurement ($SEM = SD \times \sqrt{1 - R}$), and $MDC_{95} = SEM \times 1.96 \times \sqrt{2}$.
3. Measured $MDC_{95}$ values populate `src/lib/progress/thresholds.ts` so progress trend indicators only trigger when a change exceeds sensor measurement noise.

## Deploying (frontend + worker)
Both `worker/wrangler.toml` and the frontend's env files ship with
placeholder values on purpose - a fresh clone should never accidentally
point at someone else's Supabase project. Before a real deploy:

1. Copy `.env.example` -> `.env.local` for local dev, and
   `.env.production.example` -> `.env.production.local` for a production
   build, filling in your real Supabase project and worker URL in each.
2. In `worker/wrangler.toml`, fill in `[env.production.vars]` with your
   real Supabase project and the exact origin your frontend is served
   from, then set the two production secrets:
   `wrangler secret put ANTHROPIC_API_KEY --env production` and
   `wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production`.
3. Deploy the worker with `wrangler deploy --env production` (a plain
   `wrangler deploy` intentionally uses the dev config, not this one).
   If a placeholder was missed, the worker fails every request with a
   clear "still set to its placeholder value" error instead of silently
   calling a broken URL - check the response body if requests 500 right
   after deploying.
4. Point the frontend's `VITE_SYNTHESIS_ENDPOINT` at the worker URL
   `wrangler deploy` prints out, then run `npm run build`.
5. In `index.html`, change `og:image` and `twitter:image` from
   `/og-image.png` to an absolute URL (`https://YOUR-DOMAIN/og-image.png`)
   - most link-preview crawlers won't fetch a relative path.

## Privacy: what leaves the device
- Camera frames are analysed in the browser (MediaPipe). They are not uploaded.
- One representative photo per scan is stored in your Supabase account
  (`face_scans.representative_image`, `body_scans.front_reference_image`).
- For the written summary, only a whitelisted set of computed numbers is sent
  to the worker and on to Claude (`src/lib/synthesis/payload.ts`, re-validated
  in `worker/src/payload.ts`). Photos, landmark coordinates and timestamps are
  never included; the worker drops any extra field and rejects oversized or
  malformed requests. Keep the consent screen in sync with this list and bump
  `CURRENT_CONSENT_VERSION` whenever it changes.
- After deploying this version, run
  `supabase/migrations/2026-10-strip-duplicate-body-photo.sql` once to remove
  the duplicate photo copy from older `body_scans` rows.

## Permanent no-list (see plan doc)
No comparison to other people, ever. No absolute-precision claims from
a phone camera. No "instant" on anything that isn't. No prescribing
effort against a structural (non-trainable) trait.
