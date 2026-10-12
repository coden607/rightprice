import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPublicRateLimit, createRateLimiter } from "./rate-limit.ts";

test("allows requests under the limit and blocks beyond it", () => {
  const check = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });
  const start = Date.now();

  assert.deepEqual(check("ip-a", start), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(check("ip-a", start + 1000), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(check("ip-a", start + 2000), { allowed: true, retryAfterSeconds: 0 });

  const blocked = check("ip-a", start + 3000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  assert.ok(blocked.retryAfterSeconds <= 60);
});

test("tracks keys independently", () => {
  const check = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

  assert.equal(check("ip-a", Date.now()).allowed, true);
  assert.equal(check("ip-b", Date.now()).allowed, true);
});

test("sliding window frees capacity after entries expire", () => {
  const check = createRateLimiter({ windowMs: 10_000, maxRequests: 1 });
  const start = 1_000_000;

  assert.equal(check("ip-a", start).allowed, true);
  assert.equal(check("ip-a", start + 1000).allowed, false);
  assert.equal(check("ip-a", start + 11_000).allowed, true);
});

test("public route limiters are wired with per-route budgets", () => {
  assert.equal(checkPublicRateLimit("search", "rate-limit-smoke").allowed, true);
  assert.equal(checkPublicRateLimit("clickout", "rate-limit-smoke").allowed, true);
});
