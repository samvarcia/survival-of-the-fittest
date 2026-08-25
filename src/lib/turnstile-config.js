/** Public Turnstile site key — safe to expose to the client. */
export function getTurnstileSiteKey() {
  return (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.TURNSTILE_SITE_KEY ||
    ''
  ).trim();
}

export function isTurnstileConfigured() {
  return getTurnstileSiteKey().length > 0;
}
