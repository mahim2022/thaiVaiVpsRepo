# Admin Custom Orders PATCH Fix - May 14, 2026

## Issue
**Error:** `PATCH http://159.65.10.177:9000/admin/custom-orders/01KRGN8X2PTCDE9KS4QZWBA880 500 (Internal Server Error)`

**Context:** Admin users attempting to reply to custom orders with `status: "in_review"` and `admin_reply` were receiving a 500 Internal Server Error.

---

## Root Causes

### 1. Invalid Manager Connection Access (src/api/admin/custom-orders/[id]/route.ts)
**Problem:** The PATCH handler attempted to access `customOrderService.manager_.connection`, which was undefined in the request scope.

**Error Log:**
```
error: Cannot read properties of undefined (reading 'connection')
TypeError: Cannot read properties of undefined (reading 'connection')
    at PATCH (/server/src/api/admin/custom-orders/[id]/route.ts:123:50)
```

**Original Code:**
```typescript
const connection = customOrderService.manager_.connection
const updates = Object.keys(updateData).map((key, idx) => `${key} = $${idx + 1}`).join(", ")
const values = Object.values(updateData)

if (updates) {
  await connection.query(
    `UPDATE custom_order SET ${updates} WHERE id = $${values.length + 1}`,
    [...values, req.params.id]
  )
}
```

### 2. Missing Request Body Validation
**Problem:** The `buildUpdatePayload()` function had no guard against `undefined` or `null` request bodies, causing a TypeError when accessing `body.status` and `body.admin_reply`.

**Original Code:**
```typescript
const buildUpdatePayload = (
  currentStatus: string,
  body: {
    status?: string
    admin_reply?: string
  }
) => {
  const nextStatus = typeof body.status === "string" ? body.status.trim() : undefined
  // ...
}
```

---

## Solutions Implemented

### 1. Replaced Raw SQL with Service API (src/api/admin/custom-orders/[id]/route.ts)

**Fixed Code:**
```typescript
const buildUpdatePayload = (
  currentStatus: string,
  body: {
    status?: string
    admin_reply?: string
  } = {}  // ← Default parameter guard
) => {
  // ... validation logic
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  // ... setup code ...

  const normalized = buildUpdatePayload(
    current.status,
    (req.validatedBody as {
      status?: string
      admin_reply?: string
    }) || {}  // ← Defensive fallback
  )

  // ... validation ...

  // Build update object with proper field names
  const updateData: Record<string, string | null> = {}
  if (normalized.payload.status) {
    updateData.status = normalized.payload.status
  }
  if (normalized.payload.admin_reply !== undefined) {
    updateData.admin_reply = normalized.payload.admin_reply || null
  }

  if (Object.keys(updateData).length > 0) {
    await customOrderService.updateCustomOrders({  // ← Use service API
      id: req.params.id,
      ...updateData,
    })
  }

  const custom_order = await customOrderService.retrieveCustomOrder(req.params.id)

  return res.status(200).json({
    custom_order: withAttachments(custom_order, publicBaseUrl),
  })
}
```

**Key Changes:**
- Replaced `manager_.connection.query()` with `customOrderService.updateCustomOrders()`
- Added default parameter `= {}` to `buildUpdatePayload()`
- Added defensive fallback `|| {}` when passing `req.validatedBody`
- Properly type `updateData` as `Record<string, string | null>`

### 2. Enhanced Integration Tests (integration-tests/http/custom-orders.spec.ts)

**Changes:**
- Modified `readPublishableApiKey()` to accept `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` from environment
- Modified `loginAdmin()` to accept `ADMIN_EMAIL` and `ADMIN_PASSWORD` from environment
- Added focused integration test: `admin can transition a custom order to in_review with admin_reply`

**Environment Variable Support:**
```typescript
const readPublishableApiKey = () => {
  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  }
  // ... fallback to file read ...
}

const loginAdmin = async () => {
  const email = process.env.ADMIN_EMAIL || "admin@example.com"
  const password = process.env.ADMIN_PASSWORD || "supersecret"
  // ... login logic ...
}
```

**New Test Case:**
```typescript
it("admin can transition a custom order to in_review with admin_reply", async () => {
  // Verifies: admin can set status to 'in_review' with 'admin_reply'
  // Verifies: response includes updated status and reply text
  // Verifies: no 500 error occurs
})
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/api/admin/custom-orders/[id]/route.ts` | Replaced raw SQL with `updateCustomOrders()` service API; added request body validation guards |
| `integration-tests/http/custom-orders.spec.ts` | Added env var support for credentials; added focused in_review transition test |

---

## Testing & Verification

### Integration Test Results
```
PASS  integration-tests/http/custom-orders.spec.ts
  Custom orders HTTP API
    ✓ handles customer auth, custom order creation, attachments, ownership, and admin replies (2289 ms)
    ✓ rejects invalid attachments and invalid admin status transitions (1484 ms)
    ✓ admin can transition a custom order to in_review with admin_reply (780 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### Test Command
```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_b1a6351adc14ffa6ebf49b2eeaaeee4c3643c28812939c45043760c153dc8706 \
ADMIN_EMAIL='admin+20260509b@thaivaiecom.local' \
ADMIN_PASSWORD='ThaiVai@2026!Admin' \
yarn test:integration:custom-orders
```

---

## Affected Feature Flow

### Admin Reply Workflow (Fixed)
1. **Admin Dashboard:** Admin selects custom order and clicks "Reply"
2. **Frontend Form:** Collects `status: "in_review"` and `admin_reply: "message"`
3. **API Call:** `PATCH /admin/custom-orders/{id}` with JSON payload
4. **Backend Handler:** 
   - ✅ Validates request body (no 500 error)
   - ✅ Checks status transition rules (submitted → in_review is valid)
   - ✅ Updates record via service API (no manager_.connection error)
5. **Database:** Custom order record updated with new status and reply
6. **Customer View:** Customer can see updated status and admin reply in their custom orders list

### Status Transition Rules
```
submitted  → in_review, closed
in_review  → replied, closed
replied    → closed, in_review
closed     → closed (terminal state)
```

---

## Impact Summary

✅ **Fixed:** Admin can now reply to custom orders with `in_review` status without 500 error
✅ **Verified:** All 3 integration tests pass
✅ **Safe:** Proper API usage prevents future connector access issues
✅ **Testable:** Environment variable support enables flexible test runs

---

## Notes for Future Development

1. **Service API Pattern:** Always use `customOrderService.updateCustomOrders()` for persistence, not `manager_.connection`
2. **Request Body Safety:** Always provide default parameters or fallbacks for request body objects
3. **Status Transitions:** Refer to `ALLOWED_TRANSITIONS` map for valid state changes
4. **Admin Reply Display:** Frontend correctly handles `admin_reply: null` with conditional rendering

---

**Date:** May 14, 2026  
**Status:** ✅ Complete and verified
