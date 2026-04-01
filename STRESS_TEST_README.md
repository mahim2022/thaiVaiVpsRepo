# Medusa Stress Testing Guide

## Overview

This guide explains how to run comprehensive stress tests on the Medusa backend to verify data integrity, identify potential issues, and determine storage requirements when uploading products with images at scale.

## Quick Start

### One-Command Full Stress Test

```bash
cd /root/thaiVaiEcom2.0
yarn stress-test:full
```

This automatically:
1. ✅ Validates Docker stack health
2. 📊 Captures baseline metrics
3. 🔥 Uploads 500 products with 3 images each
4. ✔️  Validates data integrity
5. 💾 Analyzes storage usage
6. 📈 Generates comprehensive report

**Estimated Duration:** 15-30 minutes (depending on system resources)

---

## Individual Commands

### 1. Quick Baseline Check
```bash
yarn docker:up  # Ensure stack is running first

# Check database state
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) as product_count FROM product;"

# Check disk usage
docker system df
```

### 2. Run Stress Test Only (No Orchestration)
```bash
docker exec medusa_backend npx medusa exec ./src/scripts/stress-test-products.ts
```

### 3. Run with Monitoring
```bash
# Terminal 1: Start monitoring (30-minute duration)
yarn stress-test:monitor

# Terminal 2: Run the stress test
# (after monitor starts)
docker exec medusa_backend npx medusa exec ./src/scripts/stress-test-products.ts
```

### 4. Full Orchestrated Test (Recommended)
```bash
yarn stress-test:full
```

---

## What Gets Tested

### Test Configuration
| Parameter | Value |
|-----------|-------|
| Products | 500 |
| Images per Product | 3 |
| Total Images Created | 1,500 |
| Batch Size | 50 |
| Total Variants per Product | 4 (2 sizes × 2 colors) |

### Data Integrity Checks
The stress test validates:
- ✅ All 500 products created successfully
- ✅ All 1,500 images linked correctly
- ✅ Product-image relationships intact
- ✅ Variant pricing consistency
- ✅ No NULL required fields
- ✅ Category assignments correct
- ✅ Status flags (published, etc.)

### Performance Metrics Captured
- Products created per second
- Success/failure rate
- Database performance
- Memory usage
- Disk space consumed
- Query response times

### Storage Analysis
- Baseline disk usage (before test)
- Growth during test
- Estimated storage for 1000, 5000, 10000 products
- Database table sizes
- Docker volume sizes

---

## Understanding the Results

### Result Files Location
```
/root/stress-test-results-YYYYMMDD-HHMMSS/
├── baseline.txt                    # Pre-test metrics
├── stress-test.log                 # Full test output
├── post-test.txt                   # Post-test metrics
├── integrity-check.txt             # Data validation results
├── storage-analysis.txt            # Storage calculations
├── performance-summary.txt         # Performance metrics
└── STRESS_TEST_REPORT.md          # Executive summary
```

### Key Metrics Explained

**Success Rate**
```
(Products Created / Products Attempted) × 100
Expected: 100%
```

**Throughput**
```
Products Created / Total Duration (seconds)
Expected: 2-5 products/second (depending on hardware)
```

**Storage Per Product** (approximate)
```
Database Size / Number of Products
Typical: 50-150 KB per product (with images)
```

---

## Example Output & Interpretation

### Successful Test Output
```
✓ Stress test completed successfully

═════════════════════════════════════════
📈 STRESS TEST SUMMARY
═════════════════════════════════════════
Total Duration: 480.42s
Products Created: 500/500
Products Failed: 0
Throughput: 1.04 products/sec
Success Rate: 100.00%
```

**Interpretation:**
- ✅ All 500 products uploaded without errors
- ✅ Data integrity maintained
- ✅ System is stable under load
- ✅ Ready for similar workloads in production

### Partial Success Output
```
Products Created: 475/500
Products Failed: 25
Success Rate: 95.00%
```

**Interpretation:**
- ⚠️  Some products failed (likely batch-specific issues)
- 🔍 Check logs for error patterns
- 🔧 May need to adjust batch size or resource allocation
- 📍 Identify which batches failed

---

## Troubleshooting

### "Backend health check failed"
```bash
# Check if backend is running
docker compose ps | grep medusa_backend

# If not running or restarting:
docker logs -f medusa_backend
docker compose restart medusa_backend
```

### "JavaScript heap out of memory"
```bash
# Docker backend needs more resources
# Option 1: Increase Docker memory limit (in docker-compose.yml)
# Option 2: Reduce batch size (in stress-test-products.ts: BATCH_SIZE = 30)
# Option 3: Add swap on VPS
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### "Timeout" or "Connection refused"
```bash
# Increase Docker timeout/limits
docker compose restart

# OR manually run with explicit wait
sleep 30 && docker exec medusa_backend npx medusa exec ./src/scripts/stress-test-products.ts
```

### Products Created but Images Missing
```bash
# Check image count in database
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) FROM product_image WHERE product_id IN 
   (SELECT id FROM product WHERE title LIKE 'Stress Test%');"

# Should equal: number of products × 3
```

---

## Performance Baseline Reference

### Typical Results (2GB RAM VPS)
| Metric | Value |
|--------|-------|
| Batch Duration | 40-60 seconds |
| Throughput | 0.8-1.2 products/sec |
| Success Rate | 95-100% |
| Database Growth | ~100 MB |
| Test Duration | 400-600 seconds (7-10 min) |

### Typical Results (4GB RAM VPS)
| Metric | Value |
|--------|-------|
| Batch Duration | 30-45 seconds |
| Throughput | 1.1-1.7 products/sec |
| Success Rate | 98-100% |
| Database Growth | ~100-120 MB |
| Test Duration | 300-400 seconds (5-7 min) |

### Typical Results (8GB+ RAM)
| Metric | Value |
|--------|-------|
| Batch Duration | 20-30 seconds |
| Throughput | 1.7-2.5 products/sec |
| Success Rate | 99.5-100% |
| Database Growth | ~120 MB |
| Test Duration | 200-300 seconds (3-5 min) |

---

## Cleanup After Testing

### Remove All Stress Test Products
```bash
docker exec medusa_backend npm run seed  # Re-runs with clean slate

# OR manually delete:
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "DELETE FROM product WHERE title LIKE 'Stress Test%';"

docker compose restart medusa_backend
```

### Free Up Disk Space
```bash
docker system prune -af --volumes
```

---

## Scaling Beyond 500 Products

To test larger scales:

### Modify stress-test-products.ts
```typescript
const TEST_PRODUCTS_COUNT = 1000;  // Change from 500
const BATCH_SIZE = 50;             // Keep reasonable
```

Then run:
```bash
docker exec medusa_backend npx medusa exec ./src/scripts/stress-test-products.ts
```

### Recommended Incremental Testing
1. **Day 1:** Test with 500 products (current)
2. **Day 2:** Test with 1,000 products
3. **Day 3:** Test with 5,000 products (if resources permit)

Each test helps identify bottlenecks.

---

## Data Integrity Verification

After running the stress test, manually verify key metrics:

```bash
# Total products
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) FROM product WHERE title LIKE 'Stress Test%';"

# Total images
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) FROM product_image WHERE product_id IN 
   (SELECT id FROM product WHERE title LIKE 'Stress Test%');"

# Orphaned images (should be 0)
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) FROM product_image 
   WHERE product_id NOT IN (SELECT id FROM product);"

# Total variants
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) FROM product_variant WHERE product_id IN 
   (SELECT id FROM product WHERE title LIKE 'Stress Test%');"
```

---

## Production Recommendations

### Based on Stress Test Results

✅ **If Success Rate = 100%**
- System is production-ready for similar workloads
- Monitor peak loads carefully
- Implement automated backups
- Consider CDN for image delivery at scale

⚠️ **If Success Rate = 95-99%**
- Address identified failures before production
- Reduce batch size for production use
- Increase resource allocation
- Add retry logic for failed operations

❌ **If Success Rate < 95%**
- System may not be ready for production
- Investigate root causes
- Consider infrastructure upgrades
- Test with reduced batch sizes (25-30 products)

---

## Performance Tuning Tips

### Increase Throughput
1. **Increase Docker memory:** Modify `docker-compose.yml` - increase `memory: 4g` to `8g`
2. **Reduce batch sleep:** Edit `run-stress-test.sh` - reduce `sleep 5000` to `2000`
3. **Increase batch size:** Edit `stress-test-products.ts` - increase `BATCH_SIZE` from 50 to 100
4. **Add more CPU cores:** Docker desktop settings or VPS plan upgrade

### Reduce Database Strain
1. **Reduce images per product:** Edit `stress-test-products.ts` - decrease `IMAGES_PER_PRODUCT`
2. **Simplify variants:** Reduce variant count (currently 4 per product)
3. **Stagger tests:** Run multiple smaller tests instead of one large test

---

## Next Steps

1. **Run the full test:** `yarn stress-test:full`
2. **Review results** in `/root/stress-test-results-*/STRESS_TEST_REPORT.md`
3. **Document findings** for your team
4. **Plan for scale** based on metrics
5. **Schedule regular tests** (weekly or monthly)

---

## Support & Questions

For detailed logs or debugging:
```bash
# View backend logs during test
docker logs -f medusa_backend

# View database logs
docker logs -f medusa_postgres

# View container resources in real-time
docker stats
```

---

*Last Updated: March 2026*
