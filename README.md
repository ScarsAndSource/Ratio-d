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

## Progressive Web App (PWA) Support
Plumbline is configured as an installable standalone PWA for mobile browsers (iOS Safari & Android Chrome):
- **Web Manifest**: `public/manifest.webmanifest` specifies `display: standalone`, `theme_color: #12161C`, and background colors matching the dark viewfinder (`ink`).
- **PWA Assets**: `public/favicon-32.png`, `public/apple-touch-icon.png`, and `public/og-image.png`.
- **Icon Generation**: To regenerate PNG assets from SVGs, run `npm run icons` (uses `sharp` with anti-aliasing and padding).

## Production Deploy & Security Checklist

### 1. Database Setup
- Execute `supabase/schema.sql` in your Supabase SQL Editor to create `face_scans`, `body_scans`, `user_consent`, and `worker_usage` tables with Row Level Security (RLS).
- Run `supabase/migrations/2026-10-strip-duplicate-body-photo.sql` if upgrading an existing deployment.

### 2. Cloudflare Worker (Backend AI Synthesis & Auth Gate)
Both `worker/wrangler.toml` and frontend `.env` files ship with placeholder values on purpose:
1. In `worker/wrangler.toml`, configure `[env.production.vars]`:
   - `ALLOWED_ORIGIN`: Exact frontend origin (e.g. `https://plumbline.app` - no trailing slash).
   - `SUPABASE_URL` & `SUPABASE_ANON_KEY`: Matching your Supabase project API credentials.
2. Set production secrets via Wrangler:
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY --env production
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
   ```
3. Deploy the worker:
   ```bash
   cd worker && npx wrangler deploy --env production
   ```
4. **Security & Rate-Limiting Features**:
   - Validates Supabase auth JWT token on every call.
   - Enforces a 30 call/day limit per user via `worker_usage` table.
   - Restricts API payload to sanitized numbers (re-validated in `worker/src/payload.ts`).
   - Serves secure `DELETE /account` endpoint for self-serve user account deletion.

### 3. Frontend Deployment
1. Set host environment variables (Vercel / Netlify / Cloudflare Pages):
   - `VITE_SYNTHESIS_ENDPOINT`: Deployed Worker URL.
   - `VITE_SUPABASE_URL`: Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon key.
2. Run `npm run build` (executes `tsc -b && vite build`).
3. In `index.html`, update `og:image` and `twitter:image` to absolute production URLs (`https://YOUR-DOMAIN/og-image.png`).

## Privacy & Data Handling
- **Local Frame Analysis**: All camera frames are analyzed in-browser via MediaPipe WASM. No video feeds or raw frames ever leave your device.
- **On-Device Reference Images**: Representative images are stored locally in client IndexedDB / Supabase user storage strictly for drawing explainability overlays and ghost comparisons.
- **Anonymized AI Prompts**: Only computed numeric measurements are sent to Claude for narration. No names, photos, landmarks, or timestamps are attached.

## Permanent Design Directives
- No comparison to other people, ever.
- No absolute-precision claims from a mobile camera.
- No "instant" claims on physical progression.
- No prescribing effort against structural (non-trainable) traits.
