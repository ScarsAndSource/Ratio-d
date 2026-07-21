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

## Permanent no-list (see plan doc)
No comparison to other people, ever. No absolute-precision claims from
a phone camera. No "instant" on anything that isn't. No prescribing
effort against a structural (non-trainable) trait.
