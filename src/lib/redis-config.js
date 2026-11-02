import { isDatabaseConfigured } from '@/lib/supabase';

/** @deprecated Use isDatabaseConfigured — kept for existing API imports. */
export function isRedisConfigured() {
  return isDatabaseConfigured();
}

export { isDatabaseConfigured };
