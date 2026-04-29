# Checkout Order Submission Incident (2026-04-29)

## Summary
Intermittent checkout failures occurred when placing orders from the storefront. Users saw a server component error and sometimes this message:

- "Failed to find Server Action \"x\""
- "Error setting up the request: The request conflicted with another request. You may retry the request with the provided Idempotency-Key."

In many cases, clicking "Place order" a second time succeeded.

## Root Cause
Two related behaviors created a race condition during checkout completion:

1. Duplicate / overlapping order completion submissions from the storefront checkout button path.
2. The completion request to Medusa (`/store/carts/{id}/complete`) did not include an idempotency key from the storefront action.

This allowed conflicting in-flight completion attempts for the same cart.

## Why the "Failed to find Server Action" appeared
That message can surface as a generic production-side failure when an action invocation path breaks. In this incident, the practical trigger was request conflict during order completion (duplicate submit window), not a business logic validation failure.

## Fix Implemented
### 1) Server action now supports idempotency key forwarding
File changed:
- `my-medusa-storefront/src/lib/data/cart.ts`

Change:
- Updated `placeOrder` signature to accept an optional `idempotencyKey`.
- Forwarded the key as `Idempotency-Key` header when calling `sdk.store.cart.complete(...)`.

### 2) Checkout payment button hardened against duplicate submits
File changed:
- `my-medusa-storefront/src/modules/checkout/components/payment-button/index.tsx`

Changes:
- Added in-flight guard (`orderSubmissionInFlight`) to prevent concurrent `placeOrder` calls.
- Added stable per-attempt UUID (`crypto.randomUUID()`) reused for retries in the same attempt.
- Disabled button while submitting.
- Set button `type="button"` explicitly for Stripe and manual flows.

## Commit Reference
Main branch commit:
- `e1a180d`

Commit message:
- `fix: prevent duplicate checkout order submissions with idempotency key and in-flight guard`

## Verification Notes
- Edited files passed editor diagnostics for the touched areas.
- Full storefront typecheck still has unrelated pre-existing errors in other modules; no new errors were introduced by this fix in the modified files.

## Future Prevention
- Keep idempotency handling in any action that can be retried or double-submitted.
- Keep client-side submit guards for critical checkout transitions.
- If similar errors recur, inspect for overlapping cart mutation requests around completion.
