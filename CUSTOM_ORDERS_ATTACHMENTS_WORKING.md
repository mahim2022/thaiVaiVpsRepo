# Custom Orders Attachments - Solution Documentation

**Status:** ✅ Working  
**Date Completed:** May 13, 2026  
**Scope:** Image upload and persistence for custom orders in Medusa admin dashboard

## Overview

Custom order image attachments now persist correctly to the PostgreSQL database and display properly in the Medusa admin dashboard. Images uploaded by customers are saved to the file system, metadata is stored in the database, and the admin can view and manage them without issues.

## Problems Solved

### 1. **Attachments Not Persisting**
Images uploaded via custom orders were lost after upload and never appeared in the admin dashboard.

**Root Cause:** The inherited `updateCustomOrders()` method from MedusaService was not correctly handling the JSONB `attachments` column in the database.

### 2. **Missing Display URLs**
Even when attachments were occasionally stored, the admin dashboard couldn't resolve the file URLs to display them.

**Root Cause:** URL resolution logic wasn't using the correct file backend base URL for browser-accessible paths.

## Solution Architecture

### Three-Layer Fix

#### Layer 1: Database Persistence (`src/modules/custom-order/service.ts`)

Added a custom `updateAttachments()` method that uses raw SQL to directly update the JSONB column:

```typescript
async updateAttachments(id: string, attachments: any[]) {
  const attachmentRepository = this.constructor_.createQueryBuilder(
    this.customOrderRepository,
    "custom_order"
  )
  
  const connection = this.constructor_.getConnection()
  const query = `UPDATE custom_order SET attachments = $1::jsonb WHERE id = $2`
  
  await connection.query(query, [JSON.stringify(attachments), id])
  return this.retrieveCustomOrder(id, {})
}
```

**Why Raw SQL?** The ORM's update mechanism didn't properly serialize JSONB structures. Raw SQL with explicit JSONB casting ensures the data is stored as proper JSON in Postgres.

#### Layer 2: API Integration (`src/api/store/custom-orders/[id]/attachments/route.ts`)

Modified the POST endpoint to:
1. Save new files via the file module service
2. Merge new attachments with existing ones
3. Call the persistence method
4. Return the updated order with normalized URLs

```typescript
// Merge existing attachments with new ones
const mergedAttachments = [
  ...(order.attachments || []),
  ...newAttachments,
]

// Persist to database
await customOrderService.updateAttachments(req.params.id, mergedAttachments)

// Retrieve and return updated order
const updatedOrder = await customOrderService.retrieveCustomOrder(
  req.params.id,
  {}
)
```

#### Layer 3: URL Resolution (`src/api/utils/attachment-url.ts`)

Enhanced the URL normalization utility to resolve attachment display URLs:

```typescript
export function resolvePublicBaseUrl(): string {
  return process.env.MEDUSA_FILE_BACKEND_URL || 
         process.env.MEDUSA_ADMIN_BACKEND_URL || 
         'http://localhost:9000'
}

export function normalizeAttachmentUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  
  const baseUrl = resolvePublicBaseUrl()
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}
```

**Priority:** File backend URL preferred for browser accessibility.

## Deployment

### Files Modified
- `src/modules/custom-order/service.ts` — Added persistence method
- `src/api/store/custom-orders/[id]/attachments/route.ts` — Integrated persistence call
- `src/api/utils/attachment-url.ts` — Added URL normalization logic

### Environment Variables Required
```bash
MEDUSA_FILE_BACKEND_URL=http://your-domain.com  # For browser access to files
```

### No Database Migrations Needed
The `attachments JSONB` column already exists in the `custom_order` table. Changes are purely in application logic.

## How It Works (End-to-End)

1. **Customer uploads image** via the storefront custom orders form
2. **File saved to filesystem** at `/server/static/` with a unique timestamp-based name
3. **API endpoint receives upload** and creates a file record via Medusa file module
4. **Attachment metadata created** (filename, URL, upload time)
5. **`updateAttachments()` called** — raw SQL persists metadata to Postgres JSONB
6. **Admin retrieves order** via `/admin/custom-orders/[id]`
7. **Attachments extracted from DB** with full metadata intact
8. **URLs normalized** using file backend URL for admin dashboard display
9. **Images render** in admin UI with full functionality (view, delete, reorder)

## Testing Verification

✅ **Database Persistence**
```sql
SELECT id, attachments FROM custom_order WHERE id = 'order_test_123';
```
Returns: JSONB array with attachment metadata

✅ **API Response**
```bash
GET /admin/custom-orders/order_test_123
```
Returns: Custom order object with attachments array populated

✅ **Admin Dashboard**
- Images load and display
- Image URLs resolve correctly
- Attachments persist across page reloads

## Performance Notes

- **File Storage:** All images stored in `/server/static/` — no S3 or external service required
- **Database:** JSONB storage is efficient for moderate attachment counts (typical: 2-10 per order)
- **URL Resolution:** Single environment variable lookup per request (negligible overhead)

## Troubleshooting

### Images Not Showing in Admin Panel
**Check:** `MEDUSA_FILE_BACKEND_URL` environment variable is set correctly and accessible from the browser.

### Attachments Disappear After Page Reload
**Check:** Raw SQL query completed successfully by verifying Postgres contains the data:
```sql
SELECT attachments FROM custom_order WHERE id = 'your_order_id' \gx
```

### Files Saved But No DB Entry
**Check:** The `updateAttachments()` method is being called in the endpoint and connection is available.

## Future Enhancements

- Move file storage to S3/cloud with pre-signed URLs for admin access
- Add attachment versioning (store upload history per attachment)
- Implement attachment quotas per order
- Add file type validation at upload time

---

**Maintained By:** Development Team  
**Last Updated:** May 13, 2026
