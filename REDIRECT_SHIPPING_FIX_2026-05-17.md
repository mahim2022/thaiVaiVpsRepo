# Redirect Loop and Shipping Methods Fix - May 17, 2026

## Summary
Fixed three interconnected issues caused by country code case inconsistencies:
1. ✅ Infinite `/BD/BD/BD/...` redirect loop
2. ✅ Products showing as out-of-stock (inventory soft-deleted)
3. ✅ Shipping methods not appearing during checkout

## Root Cause Analysis

### Country Code Case Mismatch
The system had inconsistent handling of ISO-2 country codes:
- **Middleware**: Initially used `.toLowerCase()` on country codes
- **Backend/Database**: Stores uppercase ISO-2 codes (e.g., `"BD"`)
- **Storefront**: `getRegion()` expects uppercase codes for region lookups
- **Geo Zone**: Had lowercase `'bd'` instead of `'BD'` for country mapping

This caused:
- Region map lookups to fail (looking for lowercase "bd" when keys were uppercase)
- Redirect loops when middleware tried to resolve regions
- Shipping method lookups to fail (country code mismatch in geo_zone)
- Products to appear out-of-stock (inventory was incorrectly soft-deleted)

## Fixes Applied

### 1. Middleware Case Normalization (Code Fix)
**File**: `my-medusa-storefront/src/middleware.ts`

Changed all country code normalization from `.toLowerCase()` to `.toUpperCase()`:
```typescript
// Before (incorrect):
c.iso_2 ?? "").toLowerCase()
pathParts[0]?.toLowerCase()
request.headers.get("x-vercel-ip-country")?.toLowerCase()

// After (correct):
c.iso_2 ?? "").toUpperCase()
pathParts[0]?.toUpperCase()
request.headers.get("x-vercel-ip-country")?.toUpperCase()
```

**Commit**: `e37565a` - "fix: simplify middleware to prevent BD/BD/BD redirect loop"

### 2. Inventory Restoration (Database Fix)
**Issue**: All 8 inventory_level records were soft-deleted, causing products to show "Out of stock"

**Fix Applied**:
```sql
UPDATE inventory_level SET deleted_at = NULL 
WHERE deleted_at IS NOT NULL;
```

**Result**: ✅ Restored 8 inventory records with 100 units each

### 3. Geo Zone Country Code Fix (Database Fix)
**Issue**: The geo_zone table had country code stored as lowercase `'bd'`, but the backend API sends uppercase `'BD'` for shipping lookups

**Fix Applied**:
```sql
UPDATE geo_zone SET country_code = 'BD' 
WHERE country_code = 'bd' AND deleted_at IS NULL;
```

**Affected Record**:
- Service Zone: Bangladesh (`serzo_01KQBMCCK77D4DVJW66A1WG394`)
- Updated 1 row from `'bd'` to `'BD'`

**Result**: ✅ Shipping methods now appear on checkout with correct pricing

## Verification Results

### Checkout Flow Test
✅ **Redirect**: Domain redirects to `/BD` (uppercase)
✅ **Products**: 7 products display at `/BD/store` with stock levels
✅ **Cart**: Can add products to cart
✅ **Checkout Address**: Address form accepts input
✅ **Shipping Options**: Delivery step now shows:
   - Standard Shipping: BDT 350.00
   - Express Shipping: BDT 400.00
✅ **Cost Calculation**: 
   - Subtotal: BDT 1,000.00
   - Shipping: BDT 350.00 (after selecting Standard)
   - Total: BDT 1,350.00

## Technical Details

### Affected Components
1. **Middleware** (`my-medusa-storefront/src/middleware.ts`):
   - Edge runtime route normalization
   - Region validation and lookup
   - Country code extraction from Vercel IP headers
   
2. **Database Schema**:
   - `inventory_level`: Stores stock quantities per location
   - `geo_zone`: Maps country codes to service zones (for shipping)
   - `shipping_option`: Links to service zones
   - `service_zone`: Links to fulfillment sets

3. **Storefront** (`my-medusa-storefront/src/lib/data/regions.ts`):
   - `getRegion(countryCode)`: Already expects uppercase codes

### Why Case Matters
- ISO-2 country codes are standardized as uppercase (BD, US, GB, etc.)
- Backend Medusa API returns and expects uppercase codes
- Database keys must match API responses for lookups to succeed
- Middleware must normalize to uppercase when processing requests

## Future Prevention

To prevent similar issues:
1. **Enforce uppercase country codes** in all middleware transformations
2. **Add database constraints** to enforce uppercase for country codes
3. **Test region lookups** for each country code before deployment
4. **Validate inventory levels** aren't soft-deleted in staging
5. **Verify shipping options** are linked to correct geo zones

## Files Modified

### Database Changes
- `geo_zone`: Updated country_code 'bd' → 'BD' (1 row)
- `inventory_level`: Cleared deleted_at timestamps (8 rows)

### Code Changes
- Committed in previous deployment via `e37565a`

## Testing Commands

```bash
# Verify redirect
curl -I -sS https://thaibhai.shop/ | grep -E "HTTP|location"

# Verify products display
curl -s https://thaibhai.shop/BD/store | grep -c "thai-green-cup-noodle"

# Verify inventory
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) FROM inventory_level WHERE deleted_at IS NULL;"

# Verify shipping methods
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT id, name FROM shipping_option WHERE deleted_at IS NULL;"

# Verify geo zone country code
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT country_code FROM geo_zone WHERE service_zone_id = 'serzo_01KQBMCCK77D4DVJW66A1WG394';"
```

## Deployment Notes

- No code changes needed beyond previous middleware fix (`e37565a`)
- Database migrations are self-contained queries (idempotent)
- Can be safely re-run if needed
- Storefront container was restarted to clear caches after database updates
