const requestWindows = new Map();

const DEFAULT_WINDOW_MS = 10_000;
const DEFAULT_MAX_REQUESTS = 120;
const DEFAULT_BLOCK_MS = 30_000;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getRateLimitConfig(env = process.env) {
  return {
    windowMs: parsePositiveInt(env.WS_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
    maxRequests: parsePositiveInt(
      env.WS_RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_MAX_REQUESTS
    ),
    blockMs: parsePositiveInt(env.WS_RATE_LIMIT_BLOCK_MS, DEFAULT_BLOCK_MS),
  };
}

function checkRequestRateLimit(identifier, now = Date.now(), config) {
  if (!identifier) {
    return { allowed: true, retryAfterMs: 0 };
  }

  const activeConfig = config || getRateLimitConfig();
  let state = requestWindows.get(identifier);

  if (!state) {
    state = {
      windowStart: now,
      count: 0,
      blockedUntil: 0,
    };
  }

  if (now < state.blockedUntil) {
    return {
      allowed: false,
      retryAfterMs: state.blockedUntil - now,
    };
  }

  if (now - state.windowStart >= activeConfig.windowMs) {
    state.windowStart = now;
    state.count = 0;
  }

  state.count += 1;

  if (state.count > activeConfig.maxRequests) {
    state.blockedUntil = now + activeConfig.blockMs;
    requestWindows.set(identifier, state);
    return {
      allowed: false,
      retryAfterMs: activeConfig.blockMs,
    };
  }

  requestWindows.set(identifier, state);
  return { allowed: true, retryAfterMs: 0 };
}

function cleanupRateLimitWindows(now = Date.now(), config) {
  const activeConfig = config || getRateLimitConfig();

  for (const [identifier, state] of requestWindows) {
    const staleWindow = now - state.windowStart > activeConfig.windowMs * 3;
    const blockExpired = state.blockedUntil < now;

    if (staleWindow && blockExpired) {
      requestWindows.delete(identifier);
    }
  }
}

function getRequestWindows() {
  return requestWindows;
}

module.exports = {
  checkRequestRateLimit,
  cleanupRateLimitWindows,
  getRequestWindows,
  getRateLimitConfig,
};
