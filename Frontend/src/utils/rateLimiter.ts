interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMITS = {
  login: { max: 5, window: 15 * 60 * 1000 },
  register: { max: 3, window: 60 * 60 * 1000 },
  api: { max: 100, window: 60 * 1000 },
  default: { max: 30, window: 60 * 1000 }
};
export const checkRateLimit = (key: string, type: keyof typeof RATE_LIMITS = "default"): boolean => {
  const limit = RATE_LIMITS[type] || RATE_LIMITS.default;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.window
    });
    return true;
  }
  if (entry.count >= limit.max) {
    return false;
  }
  entry.count += 1;
  return true;
};
export const getRemainingAttempts = (key: string, type: keyof typeof RATE_LIMITS = "default"): number => {
  const limit = RATE_LIMITS[type] || RATE_LIMITS.default;
  const entry = rateLimitStore.get(key);
  if (!entry) return limit.max;
  const now = Date.now();
  if (now > entry.resetTime) return limit.max;
  return Math.max(0, limit.max - entry.count);
};
export const getResetTime = (key: string): number | null => {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;
  return entry.resetTime;
};
