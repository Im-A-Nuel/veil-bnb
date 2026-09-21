// Shared reduced-motion check for canvas animations.
// SSR-safe: returns false when window/matchMedia is unavailable.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
