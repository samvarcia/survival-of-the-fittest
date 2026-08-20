function findEnvKey(suffix, { exclude = [] } = {}) {
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (exclude.some((part) => key.includes(part))) continue;
    if (key === suffix || key.endsWith(`_${suffix}`)) {
      return value;
    }
  }
  return undefined;
}

export function getRedisCredentials() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL_KV_REST_API_URL ||
    findEnvKey('KV_REST_API_URL');

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_URL_KV_REST_API_TOKEN ||
    findEnvKey('KV_REST_API_TOKEN', { exclude: ['READ_ONLY'] });

  return { url, token };
}

export function isRedisConfigured() {
  const { url, token } = getRedisCredentials();
  return Boolean(url && token);
}

export function createRedisClient(Redis) {
  const { url, token } = getRedisCredentials();
  if (url && token) {
    return new Redis({ url, token });
  }
  return Redis.fromEnv();
}
