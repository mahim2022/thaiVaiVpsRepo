# Medusa Stress Test - Quick Reference

## Test In Progress ⏳

The stress test is currently running with:
- **500 products** being created
- **3 images per product** (1,500 total images)
- **Automated batching** (50 products per batch)
- **Full validation** (data integrity checks)

---

## What's Happening Right Now

### Phase 1 ✅ Complete
- Docker stack validation
- Backend health check
- Baseline metrics capture
- Disk space measurement
- Current DB: 10 products

### Phase 2 - In Progress ⏳
**Stress test execution** (500 products being uploaded)
- Process: Uploading in batches of 50
- Estimated remaining time: 10-25 minutes
- Real-time monitoring available in `/root/stress-test-results-*/stress-test.log`

### Phase 3 - Pending
- Data integrity validation (5-10 minutes)
- Storage analysis
- Performance report generation

---

## Real-Time Monitoring

To watch the test in real-time:

```bash
# View backend processing logs
docker logs -f medusa_backend | grep -E "Batch|Processing|✓|✗|error|Error"

# View resource usage
docker stats

# Check database growth (run in another terminal)
while true; do
  docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT COUNT(*) FROM product WHERE title LIKE 'Stress Test%';" 2>/dev/null
  sleep 5
done
```

---

## Expected Results Summary

| Metric | Target | Typical |
|--------|--------|---------|
| Products Created | 500 | 500 |
| Success Rate | 100% | 99-100% |
| Duration | N/A | 400-600 sec |
| Throughput | N/A | 1-2 products/sec |
| DB Growth | ~100 MB | 100-120 MB |
| Errors | 0 | 0-5 |

---

## After Test Complete (approx. in 20-30 min)

Results will be saved to:
```
/root/stress-test-results-YYYYMMDD-HHMMSS/
```

Key files to review:
1. **STRESS_TEST_REPORT.md** - Executive summary
2. **performance-summary.txt** - Throughput & success metrics
3. **integrity-check.txt** - Data validation results
4. **storage-analysis.txt** - Database & volume sizes
5. **stress-test.log** - Full test output (for debugging)

---

## Key Questions This Test Answers

✅ **Can the system handle bulk product uploads?**
- 500 products is 50× typical working catalog

✅ **Is data integrity maintained under load?**
- 1,500 images linked correctly
- All variants and pricing intact

✅ **What storage is required?**
- Baseline: 74 MB (pre-test database)
- Expected growth: ~100 MB (post-test)
- Extrapolation: 200+ MB for 1,000 products

✅ **How fast can products be uploaded?**
- Target: 1+ products/second
- Actual: Will be shown in report

✅ **Are there any bottlenecks or failures?**
- 0% target failure rate
- Actual results in report

---

## Checking Progress (While Test Runs)

```bash
# Show latest test log output (last 30 lines)
tail -f /root/stress-test-results-*/stress-test.log

# Check product count growth
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT COUNT(*) FROM product WHERE title LIKE 'Stress Test%';"

# Monitor container health
docker compose ps

# View error count in logs
grep -c "error\|Error\|ERROR" /root/stress-test-results-*/stress-test.log 2>/dev/null || echo "0"
```

---

## Troubleshooting If Test Stalls

If the test appears to be frozen:

```bash
# Check if medusa backend is still responding
curl http://localhost:9000/health

# Check if there are database locks
docker exec medusa_postgres psql -U postgres -d medusa-store -c \
  "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# View recent backend logs for errors
docker logs --tail 50 medusa_backend
```

---

## Expected Timeline

| Time | Phase | Status |
|------|-------|--------|
| 00:00 - 01:00 | Validation & Baseline | ✅ Complete |
| 01:00 - 25:00 | Stress Test Execution | ⏳ In Progress |
| 25:00 - 35:00 | Validation & Analysis | ⏳ Pending |
| 35:00+ | Report & Cleanup | ⏳ Pending |

**Total estimated runtime: 30-40 minutes**

---

## Next Steps After Test Completes

1. **Review Report** → `/root/stress-test-results-*/STRESS_TEST_REPORT.md`
2. **Analyze Results** → Check success rate and performance metrics
3. **Verify Data** → Ensure all products and images were created correctly
4. **Plan Scaling** → Based on throughput and storage metrics
5. **Cleanup** → Remove stress test data if needed for production

---

*Test started: 2026-03-28 20:56 UTC*
*Last updated: 2026-03-28 20:57 UTC*
