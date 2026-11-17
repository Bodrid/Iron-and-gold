/** A short vibration where the browser supports it. iOS Safari has no web vibration API, so this does nothing there. */
export function haptic(kind: 'light' | 'heavy'): void {
  try { navigator.vibrate?.(kind === 'heavy' ? 30 : 10); } catch { /* unsupported */ }
}
