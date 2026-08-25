const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const EXPECTED_ACTION = 'vote';

function expectedHostnames() {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );
}

/**
 * Canonical Turnstile siteverify for the vote surface.
 * Requires success, expected action, and an approved hostname.
 */
export async function verifyTurnstile(token, remoteIp) {
  const hostnames = expectedHostnames();
  const secret = process.env.TURNSTILE_SECRET;

  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > 2048 ||
    hostnames.size === 0 ||
    !secret
  ) {
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body,
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return (
      result.success === true &&
      result.action === EXPECTED_ACTION &&
      hostnames.has(result.hostname)
    );
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}
