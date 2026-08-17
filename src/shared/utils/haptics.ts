// shared/utils/haptics.ts
// ═══════════════════════════════════════════════════════════════════════
// HAPTIC FEEDBACK — Micro-vibrations for tactile UX.
//
// Uses the Vibration API (supported on Android Chrome, some PWAs).
// Silent no-op on iOS/unsupported browsers (never crashes).
//
// Patterns inspired by Apple's Taptic Engine:
//   light  → selection change, chip tap
//   medium → node tap, navigation
//   heavy  → achievement unlocked, error
//   success → profile generated, job match
//   warning → limit reached
// ═══════════════════════════════════════════════════════════════════════

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Light tap — selection, chip tap (10ms) */
export function hapticLight(): void {
  if (canVibrate) navigator.vibrate(10);
}

/** Medium tap — node tap, navigation (18ms) */
export function hapticMedium(): void {
  if (canVibrate) navigator.vibrate(18);
}

/** Heavy tap — error, destructive action (30ms) */
export function hapticHeavy(): void {
  if (canVibrate) navigator.vibrate(30);
}

/** Success pattern — achievement, completion (buzz-pause-buzz) */
export function hapticSuccess(): void {
  if (canVibrate) navigator.vibrate([15, 50, 15]);
}

/** Warning pattern — limit reached, alert (short-long) */
export function hapticWarning(): void {
  if (canVibrate) navigator.vibrate([8, 30, 25]);
}

/** Triple tap — streak milestone, level up */
export function hapticCelebrate(): void {
  if (canVibrate) navigator.vibrate([10, 40, 10, 40, 20]);
}
