import { TRPCError } from '@trpc/server';

/**
 * Typed domain errors that map to tRPC error codes. Throw these from services
 * instead of bare `new Error()` so the router layer doesn't have to translate.
 */
export class KycRequiredError extends TRPCError {
  constructor(message = 'Full KYC required before this action') {
    super({ code: 'PRECONDITION_FAILED', message });
  }
}

export class CapExceededError extends TRPCError {
  constructor(message = 'Monthly spending cap would be exceeded') {
    super({ code: 'PRECONDITION_FAILED', message });
  }
}

export class RateLimitedError extends TRPCError {
  constructor(message = 'Too many requests') {
    super({ code: 'TOO_MANY_REQUESTS', message });
  }
}

export class NotFoundError extends TRPCError {
  constructor(resource: string) {
    super({ code: 'NOT_FOUND', message: `${resource} not found` });
  }
}
