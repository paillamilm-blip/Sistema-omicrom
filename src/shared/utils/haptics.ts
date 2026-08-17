const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
export function hapticLight(): void { if (canVibrate) navigator.vibrate(10); }
export function hapticMedium(): void { if (canVibrate) navigator.vibrate(18); }
export function hapticHeavy(): void { if (canVibrate) navigator.vibrate(30); }
export function hapticSuccess(): void { if (canVibrate) navigator.vibrate([15, 50, 15]); }
export function hapticWarning(): void { if (canVibrate) navigator.vibrate([8, 30, 25]); }
export function hapticCelebrate(): void { if (canVibrate) navigator.vibrate([10, 40, 10, 40, 20]); }
