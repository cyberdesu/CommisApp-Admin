import "server-only";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_EMAIL = 5;
const SWEEP_INTERVAL_MS = 60 * 1000;
const MAX_BUCKET_KEYS = 10_000;

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitState = {
  ipBuckets: Map<string, Bucket>;
  emailBuckets: Map<string, Bucket>;
  lastSweepAt: number;
};

declare global {
  var __loginRateLimitState: RateLimitState | undefined;
}

function getState(): RateLimitState {
  if (!globalThis.__loginRateLimitState) {
    globalThis.__loginRateLimitState = {
      ipBuckets: new Map(),
      emailBuckets: new Map(),
      lastSweepAt: Date.now(),
    };
  }
  return globalThis.__loginRateLimitState;
}

function sweep(state: RateLimitState, now: number) {
  if (now - state.lastSweepAt < SWEEP_INTERVAL_MS) return;
  state.lastSweepAt = now;

  for (const map of [state.ipBuckets, state.emailBuckets]) {
    for (const [key, bucket] of map) {
      if (bucket.resetAt <= now) map.delete(key);
    }
    if (map.size > MAX_BUCKET_KEYS) {
      const overflow = map.size - MAX_BUCKET_KEYS;
      const iter = map.keys();
      for (let i = 0; i < overflow; i += 1) {
        const next = iter.next();
        if (next.done) break;
        map.delete(next.value);
      }
    }
  }
}

function inspect(map: Map<string, Bucket>, key: string, max: number, now: number) {
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    return { blocked: false, retryAfterSec: 0 };
  }
  if (bucket.count >= max) {
    return {
      blocked: true,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { blocked: false, retryAfterSec: 0 };
}

function increment(map: Map<string, Bucket>, key: string, now: number) {
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export type LoginRateLimitCheck = {
  blocked: boolean;
  retryAfterSec: number;
  reason: "ip" | "email" | null;
};

export function checkLoginRateLimit(options: {
  ip: string | null;
  email: string;
}): LoginRateLimitCheck {
  const state = getState();
  const now = Date.now();
  sweep(state, now);

  const emailKey = options.email.trim().toLowerCase();
  const ipKey = options.ip?.trim() || null;

  if (ipKey) {
    const ipResult = inspect(state.ipBuckets, ipKey, MAX_ATTEMPTS_PER_IP, now);
    if (ipResult.blocked) {
      return { blocked: true, retryAfterSec: ipResult.retryAfterSec, reason: "ip" };
    }
  }

  if (emailKey) {
    const emailResult = inspect(
      state.emailBuckets,
      emailKey,
      MAX_ATTEMPTS_PER_EMAIL,
      now,
    );
    if (emailResult.blocked) {
      return {
        blocked: true,
        retryAfterSec: emailResult.retryAfterSec,
        reason: "email",
      };
    }
  }

  return { blocked: false, retryAfterSec: 0, reason: null };
}

export function recordFailedLogin(options: {
  ip: string | null;
  email: string;
}) {
  const state = getState();
  const now = Date.now();
  sweep(state, now);

  const emailKey = options.email.trim().toLowerCase();
  const ipKey = options.ip?.trim() || null;

  if (ipKey) increment(state.ipBuckets, ipKey, now);
  if (emailKey) increment(state.emailBuckets, emailKey, now);
}

export function clearLoginRateLimit(options: { email: string }) {
  const state = getState();
  const emailKey = options.email.trim().toLowerCase();
  if (emailKey) state.emailBuckets.delete(emailKey);
}
