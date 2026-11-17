import { AppError } from '../lib/app-error.js';

const attempts = new Map();

function getConfig() {
  const isDev = process.env.NODE_ENV === 'development';
  const parsedWindow = Number.parseInt(process.env.LOGIN_RATE_WINDOW_MINUTES, 10);
  const parsedMax = Number.parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10);

  const windowMinutes = Number.isInteger(parsedWindow) && parsedWindow > 0 ? parsedWindow : (isDev ? 1 : 15);
  const maxAttempts = Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : (isDev ? 50 : 5);

  return {
    windowMs: windowMinutes * 60 * 1000,
    maximumAttempts: maxAttempts,
  };
}

export function loginRateLimit(req, _res, next) {
  const { windowMs, maximumAttempts } = getConfig();
  const key = req.ip ?? 'unknown';
  req.loginRateLimitKey = key;
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.startedAt > windowMs) {
    attempts.set(key, { startedAt: now, count: 1 });
    return next();
  }

  if (entry.count >= maximumAttempts) {
    return next(new AppError(429, 'RATE_LIMITED', 'Too many login attempts; try again later'));
  }

  entry.count += 1;
  next();
}

export function clearLoginAttempts(key) {
  if (key) {
    attempts.delete(key);
  } else {
    attempts.clear();
  }
}

