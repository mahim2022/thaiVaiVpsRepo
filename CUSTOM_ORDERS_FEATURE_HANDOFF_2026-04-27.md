# Custom Orders Feature Handoff (2026-04-27)

## 1) Objective
Implement a full custom-order workflow:
- Customer creates custom order from storefront account page
- Customer can upload image attachments
- Admin can view custom orders, view customer attachments, and reply/update status

This document summarizes what has been implemented, what has been validated, what is currently not working, and how to resume.

---

## 2) Current Status At A Glance

### Implemented and mostly working
- Custom order backend module and data model
- Store APIs for create/list/detail custom orders
- Store API for attachments upload to custom orders
- Admin APIs for list/detail/update custom orders
- Storefront custom orders page and form UI
- Admin custom orders page with attachment preview/thumbnails
- URL normalization for attachment URLs so admin/store receive browser-reachable URLs
- Integration tests for custom orders and attachments (passing)

### Currently not working reliably
- **Customer image upload from real storefront UI is inconsistent/failing**
- API/integration test upload succeeds, but user-reported storefront upload path still not reliably producing attachments in saved custom orders

---

## 3) Files Added/Changed For This Feature

### Storefront
- `my-medusa-storefront/src/app/[countryCode]/(main)/account/@dashboard/custom-orders/page.tsx`
- `my-medusa-storefront/src/lib/data/custom-orders.ts`
- `my-medusa-storefront/src/modules/account/components/custom-orders/index.tsx`
- `my-medusa-storefront/next.config.js`
- `my-medusa-storefront/src/app/[countryCode]/(main)/customer-service/` (route alias folder created during routing fixes)

### Backend API
- `src/api/store/custom-orders/route.ts`
- `src/api/store/custom-orders/[id]/route.ts`
- `src/api/store/custom-orders/[id]/attachments/route.ts`
- `src/api/admin/custom-orders/route.ts`
- `src/api/admin/custom-orders/[id]/route.ts`
- `src/api/middlewares.ts`
- `src/api/utils/attachment-url.ts` (new utility)

### Admin UI
- `src/admin/routes/custom-orders/page.tsx`

### Module / DB
- `src/modules/custom-order/models/custom-order.ts`
- `src/modules/custom-order/models/custom-order.js`
- `src/modules/custom-order/service.ts`
- `src/modules/custom-order/service.js`
- `src/modules/custom-order/migrations/Migration20260422045425.ts`
- `src/modules/custom-order/migrations/Migration20260424133657.ts`

### Config
- `medusa-config.ts`
- `medusa-config.js`
- `docker-compose.yml`

---

## 4) Backend/Data Model Summary

Custom order supports:
- `id`, `customer_id`, `title`, `description`, `status`, `admin_reply`, timestamps
- `attachments` as JSON/JSONB array

Attachment object shape:
- `file_id`
- `url`
- `filename`
- `mime_type`
- `created_at`

Upload constraints implemented:
- Allowed mime types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`
- Max per file: 5MB
- Max attachments per order: 5

---

## 5) What Was Verified

### Verified from DB
- Attachments are persisted for multiple orders in `custom_order.attachments`.
- Orders exist with `attachment_count > 0`.

Example IDs that have attachments (from latest verification window):
- `01KQ08Q37RN228NWERMYTG7EJE`
- `01KQ06E5BJC327P2QNNYM9XM1E`
- `01KQ0664A8T6VDHSPTCPCDH4QM`
- `01KQ063T4J8J5YE19QCT9PTGND`
- `01KQ03Y1M9MP49ZXZG6S4MNMPR`
- `01KPZXC4YSQ4A0TVSAHJHDH6Z4`

### Verified file storage
- Attachment file paths exist in Medusa static storage (`/server/static/...`).
- Sample file URL returned HTTP 200.

### Verified tests/build
- Storefront build succeeded (`yarn build` in storefront)
- Backend build succeeded (`yarn build` in root)
- Custom-orders integration tests passed in previous run (`yarn test:integration:custom-orders`)

---

## 6) Admin Panel State

Admin page includes:
- Request list
- Detail pane
- Attachment preview image and thumbnails
- Click-to-switch selected attachment
- Status and admin reply controls

Recent UX updates were made to reduce confusion:
- Auto-select first order with attachments if available
- Show per-order image count badges in list
- Show explicit "No images were uploaded for this request" when none exist

---

## 7) Known Open Issue (Primary Blocker)

## Problem
From real storefront usage, customer image uploads still reported as not reliably saved/visible, even though API test upload path succeeds.

## Observed mismatch
- Integration/API upload path works and stores attachments.
- Real storefront UI path has reports of uploads not appearing in resulting order.

## Why this is likely path-specific
- Data layer and upload route both work under direct/integration calls.
- Failures appear tied to browser form submission / server action path / request payload handling from storefront runtime.

---

## 8) Suspected Root Causes To Investigate Next

1. Storefront server action file serialization behavior in production runtime
- `my-medusa-storefront/src/lib/data/custom-orders.ts`
- `fileToBase64` uses `File.arrayBuffer()` + `Buffer.from(...)`

2. Server action payload size and platform limits
- `my-medusa-storefront/next.config.js` includes:
  - `experimental.serverActions.bodySizeLimit = "35mb"`
- Need runtime confirmation that this is active in deployed build.

3. Frontend submission edge cases
- Multiple file selection resets/validation behavior
- Form action timing and `router.refresh()` sequencing after submit

4. Session/auth headers at upload call time
- Ensure `getAuthHeaders()` still valid when create request succeeds and upload request fires.

5. Silent error masking on storefront action
- Catch currently returns generic message in `createCustomOrder`
- Need richer logs for upload-specific failure branch.

---

## 9) Recommended Next Debug Session Plan

1. Add temporary structured logging in `createCustomOrder` server action:
- Log create response order ID
- Log number of files detected from FormData
- Log upload request body file count
- Log upload response status/body or exact thrown error

2. Add temporary logging in `POST /store/custom-orders/[id]/attachments`:
- Log `req.params.id`
- Log `body.files.length`
- Log mime types and derived byte sizes
- Log early validation failures

3. Run one manual storefront submission with 1 tiny PNG (<100KB)
- Confirm logs show all steps
- Query DB immediately for that order ID attachments

4. If needed, bypass server action for upload only:
- Test client-side direct call to attachments endpoint after order create
- Compare behavior vs server action path

5. Keep the order ID from each manual run and verify with SQL:
```sql
SELECT id, title, jsonb_array_length(COALESCE(attachments, '[]'::jsonb)) AS attachment_count, attachments
FROM custom_order
WHERE id = '<ORDER_ID>';
```

---

## 10) Useful Commands For Resume

### Build
```bash
cd /root/thaiVaiEcom2.0/my-medusa-storefront && yarn build
cd /root/thaiVaiEcom2.0 && yarn build
```

### Rebuild containers
```bash
cd /root/thaiVaiEcom2.0
docker compose up -d --build storefront medusa
```

### Verify medusa status/logs
```bash
cd /root/thaiVaiEcom2.0
docker compose ps medusa
docker compose logs --no-color --tail=200 medusa | cat
```

### DB checks
```bash
cd /root/thaiVaiEcom2.0
docker exec -i medusa_postgres psql -U postgres -d medusa-store -c "SELECT id, title, status, jsonb_array_length(COALESCE(attachments, '[]'::jsonb)) AS attachment_count FROM custom_order ORDER BY created_at DESC LIMIT 20;"
```

---

## 11) Current Working Conclusion
- The custom-order feature is mostly implemented and functional across backend/admin.
- Attachment storage pipeline works at API/test level.
- The remaining unresolved issue is the **storefront real-user upload path reliability**.
- Resume focus should be **instrumenting and tracing storefront action-to-upload execution path** for one manual submission.
