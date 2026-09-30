/** Distinct video frames to accept per capture. */
export const TARGET_FRAMES = 30;
/**
 * Minimum wall-clock span of a capture. Landmark jitter is temporally
 * correlated, so 30 frames in 0.4 s carry far less information than 30 frames
 * over 1.5 s.
 */
export const MIN_CAPTURE_SPAN_MS = 1500;
