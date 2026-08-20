const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, remoteIp) {
  if (!token) return false;

  const secret =
    process.env.TURNSTILE_SECRET_KEY ||
    '1x0000000000000000000000000000000AA';

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}
