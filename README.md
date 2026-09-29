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
Phase 0/1 scaffold: build tooling + design tokens + shell only.
No MediaPipe wiring yet.

## Next
1. Wire `@mediapipe/tasks-vision` (Face + Pose Landmarker) into the capture
   flow, feeding live pose/lighting data into `ReadingRing`'s `progress`.
2. Build the internal calibration harness (raw threshold readout on
   screen) before tuning real auto-capture thresholds.
3. Quality-gate + multi-frame averaging.

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

## Permanent no-list (see plan doc)
No comparison to other people, ever. No absolute-precision claims from
a phone camera. No "instant" on anything that isn't. No prescribing
effort against a structural (non-trainable) trait.
