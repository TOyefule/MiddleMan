import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from './redis';

/**
 * Pre-built sliding-window rate limiters. Use `.limit(<userId|ip>)` from server code.
 *
 * Choose the tightest limiter that fits — the Edge auth webhook needs different limits
 * than user-facing tRPC procedures.
 */
export const rateLimits = {
  // Sign-in / sign-up brute force protection (per email or IP)
  authBurst: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'rl:auth',
  }),
  // Sub additions per user
  subAdd: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    analytics: true,
    prefix: 'rl:sub-add',
  }),
  // Payment method changes per user
  pmChange: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'rl:pm',
  }),
  // KYC retries per user
  kycRetry: new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(3, '24 h'),
    analytics: true,
    prefix: 'rl:kyc',
  }),
};
