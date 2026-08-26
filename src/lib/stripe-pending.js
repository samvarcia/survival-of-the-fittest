import { Redis } from '@upstash/redis';
import { createRedisClient } from '@/lib/redis-config';

const redis = createRedisClient(Redis);

const CHECKOUT_PREFIX = 'checkout_pending:';
const STRIPE_SESSION_PREFIX = 'stripe_processed:';
const CHECKOUT_TTL_SECONDS = 60 * 60 * 2;

export async function savePendingCheckout(referenceId, data) {
  const key = `${CHECKOUT_PREFIX}${referenceId}`;
  await redis.set(key, data, { ex: CHECKOUT_TTL_SECONDS });
}

export async function getPendingCheckout(referenceId) {
  if (!referenceId) return null;
  const key = `${CHECKOUT_PREFIX}${referenceId}`;
  const data = await redis.get(key);
  if (!data) return null;
  return typeof data === 'object' ? data : JSON.parse(data);
}

export async function deletePendingCheckout(referenceId) {
  if (!referenceId) return;
  await redis.del(`${CHECKOUT_PREFIX}${referenceId}`);
}

/** Returns true if this session was already handled (idempotency). */
export async function claimStripeSession(sessionId) {
  if (!sessionId) return false;
  const key = `${STRIPE_SESSION_PREFIX}${sessionId}`;
  const result = await redis.set(key, Date.now(), { nx: true, ex: 60 * 60 * 24 * 30 });
  return result === 'OK';
}
