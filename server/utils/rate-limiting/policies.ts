export type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
};

export const BILLING_SESSION_RATE_LIMIT: RateLimitPolicy = {
  limit: 10,
  windowSeconds: 60,
};

export const DAILY_FINALIZATION_RATE_LIMIT: RateLimitPolicy = {
  limit: 10,
  windowSeconds: 60,
};
