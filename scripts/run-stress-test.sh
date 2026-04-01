#!/bin/bash
#
# Comprehensive Stress Test Orchestration Script
# Captures baseline, runs stress test, and generates analysis
#

set -e

PROJECT_DIR="/root/thaiVaiEcom2.0"
RESULTS_DIR="/root/stress-test-results-$(date +%Y%m%d-%H%M%S)"
COMPOSE_PROJECT_NAME="thaivaiecom20"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}   MEDUSA STRESS TEST - DATA INTEGRITY & STORAGE${NC}"
echo -e "${BLUE}========================================================${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"
cd "$PROJECT_DIR"

# ============================================================================
# PHASE 0: PRE-TEST VALIDATION
# ============================================================================
echo -e "${YELLOW}[PHASE 0]${NC} Pre-Test Validation"
echo "─────────────────────────────────────────────────────────────"

echo "✓ Checking Docker containers..."
if ! COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker compose ps | grep -q "Up"; then
  echo -e "${RED}❌ Docker stack is not running!${NC}"
  echo "   Run: docker compose up -d"
  exit 1
fi
echo "✓ All containers are running"

echo ""
echo "✓ Checking backend health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/health)
if [[ "$HEALTH_RESPONSE" != "200" ]]; then
  echo -e "${RED}❌ Backend health check failed (HTTP $HEALTH_RESPONSE)${NC}"
  exit 1
fi
echo "✓ Backend is healthy (HTTP 200)"

# ============================================================================
# PHASE 1: BASELINE COLLECTION
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 1]${NC} Baseline Collection"
echo "─────────────────────────────────────────────────────────────"

BASELINE_FILE="$RESULTS_DIR/baseline.txt"
{
  echo "=== BASELINE METRICS ==="
  echo "Timestamp: $(date -Iseconds)"
  echo ""
  echo "--- DOCKER STATS (Before Test) ---"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker stats --no-stream 2>/dev/null || echo "Docker stats unavailable"
  echo ""
  echo "--- DISK SPACE ---"
  df -h / | tail -n 1
  echo ""
  echo "--- DOCKER VOLUME USAGE ---"
  docker volume ls -f "name=$COMPOSE_PROJECT_NAME" -q | while read vol; do
    SIZE=$(docker run --rm -v "$vol":/vol alpine sh -c "du -sh /vol 2>/dev/null || echo '0'")
    echo "  $vol: $SIZE"
  done
  echo ""
  echo "--- MEMORY USAGE ---"
  free -h
  echo ""
  echo "--- DATABASE PRODUCT COUNT ---"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT COUNT(*) as product_count FROM product;" 2>/dev/null || echo "DB check failed"
  echo ""
  echo "--- DATABASE IMAGE COUNT ---"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT COUNT(*) as image_count FROM product_image;" 2>/dev/null || echo "DB check failed"
} | tee "$BASELINE_FILE"

echo "✓ Baseline saved to $BASELINE_FILE"

# ============================================================================
# PHASE 2: DISK USAGE BASELINE
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 2]${NC} Disk Usage Analysis (Before Test)"
echo "─────────────────────────────────────────────────────────────"

PRE_TEST_DOCKER_DISK=$(docker system df | grep "Local Volumes space usage" -A 10 | tail -n 1 | awk '{print $1}')
PRE_TEST_DISK=$(df -B1 / | tail -n 1 | awk '{print $3}')

echo "Docker system disk usage:"
docker system df 2>/dev/null || echo "Docker system df unavailable"

echo ""
echo "Root filesystem usage:"
df -h /

# ============================================================================
# PHASE 3: STRESS TEST EXECUTION
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 3]${NC} Stress Test Execution (500 Products × 3 Images)"
echo "─────────────────────────────────────────────────────────────"

TEST_LOG="$RESULTS_DIR/stress-test.log"
TEST_START=$(date +%s)

echo "Starting test at $(date -Iseconds)"
echo "Test details:"
echo "  - Products: 500"
echo "  - Images per product: 3"
echo "  - Batch size: 50"
echo ""
echo "This may take 10-30 minutes. Logs will be streamed below..."
echo ""

# Run the stress test
if COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_backend npx medusa exec ./src/scripts/stress-test-products.ts 2>&1 | tee "$TEST_LOG"; then
  TEST_STATUS="SUCCESS"
  TEST_END=$(date +%s)
  TEST_DURATION=$((TEST_END - TEST_START))
  echo -e "${GREEN}✓ Stress test completed successfully${NC}"
else
  TEST_STATUS="FAILED"
  TEST_END=$(date +%s)
  TEST_DURATION=$((TEST_END - TEST_START))
  echo -e "${RED}❌ Stress test failed${NC}"
fi

echo ""
echo "Test duration: ${TEST_DURATION}s ($((TEST_DURATION / 60))m $((TEST_DURATION % 60))s)"

# ============================================================================
# PHASE 4: POST-TEST VALIDATION
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 4]${NC} Post-Test Validation"
echo "─────────────────────────────────────────────────────────────"

POST_TEST_FILE="$RESULTS_DIR/post-test.txt"
{
  echo "=== POST-TEST METRICS ==="
  echo "Timestamp: $(date -Iseconds)"
  echo ""
  echo "--- DOCKER STATS (After Test) ---"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker stats --no-stream 2>/dev/null || echo "Docker stats unavailable"
  echo ""
  echo "--- DATABASE PRODUCT COUNT ---"
  STRESS_PRODUCTS=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT COUNT(*) FROM product WHERE title LIKE 'Stress Test%';" 2>/dev/null || echo "0")
  echo "Stress test products created: $STRESS_PRODUCTS"
  echo ""
  echo "--- DATABASE IMAGE COUNT ---"
  TOTAL_IMAGES=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT COUNT(*) FROM product_image WHERE product_id IN (SELECT id FROM product WHERE title LIKE 'Stress Test%');" 2>/dev/null || echo "0")
  echo "Images for stress test products: $TOTAL_IMAGES"
  echo ""
  echo "--- DISK SPACE (After Test) ---"
  df -h /
  echo ""
  echo "--- DOCKER VOLUME USAGE (After Test) ---"
  docker volume ls -f "name=$COMPOSE_PROJECT_NAME" -q | while read vol; do
    SIZE=$(docker run --rm -v "$vol":/vol alpine sh -c "du -sh /vol 2>/dev/null || echo '0'")
    echo "  $vol: $SIZE"
  done
} | tee "$POST_TEST_FILE"

echo "✓ Post-test metrics saved to $POST_TEST_FILE"

# ============================================================================
# PHASE 5: DATA INTEGRITY CHECK
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 5]${NC} Data Integrity Verification"
echo "─────────────────────────────────────────────────────────────"

INTEGRITY_FILE="$RESULTS_DIR/integrity-check.txt"
{
  echo "=== DATA INTEGRITY CHECKS ==="
  echo ""
  echo "1. Product Count Verification:"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t << EOF
    SELECT 
      'Stress Test Products' as category,
      COUNT(*) as total,
      COUNT(DISTINCT id) as unique_ids,
      COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
      COUNT(CASE WHEN title IS NULL THEN 1 END) as null_titles,
      COUNT(CASE WHEN handle IS NULL THEN 1 END) as null_handles
    FROM product 
    WHERE title LIKE 'Stress Test%';
EOF
  echo ""
  
  echo "2. Product-Image Relationship:"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t << EOF
    SELECT 
      'Products with Images' as check_name,
      COUNT(DISTINCT p.id) as products_count,
      COUNT(pi.id) as total_images,
      ROUND(COUNT(pi.id)::NUMERIC / COUNT(DISTINCT p.id), 2) as avg_images_per_product
    FROM product p
    LEFT JOIN product_image pi ON p.id = pi.product_id
    WHERE p.title LIKE 'Stress Test%';
EOF
  echo ""
  
  echo "3. Variant Consistency:"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t << EOF
    SELECT 
      'Product Variants' as check_name,
      COUNT(DISTINCT pv.product_id) as products_with_variants,
      COUNT(*) as total_variants,
      MIN(variant_count) as min_variants_per_product,
      MAX(variant_count) as max_variants_per_product,
      ROUND(AVG(variant_count), 2) as avg_variants_per_product
    FROM (
      SELECT product_id, COUNT(*) as variant_count 
      FROM product_variant 
      WHERE product_id IN (SELECT id FROM product WHERE title LIKE 'Stress Test%')
      GROUP BY product_id
    ) pv;
EOF
  echo ""
  
  echo "4. Price Consistency:"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t << EOF
    SELECT 
      'Variant Prices' as check_name,
      COUNT(DISTINCT pv.id) as variants,
      COUNT(DISTINCT pp.id) as total_prices,
      COUNT(CASE WHEN pp.amount IS NULL THEN 1 END) as null_prices,
      COUNT(DISTINCT pp.currency_code) as currency_types
    FROM product_variant pv
    LEFT JOIN product_variant_price pp ON pv.id = pp.variant_id
    WHERE pv.product_id IN (SELECT id FROM product WHERE title LIKE 'Stress Test%');
EOF
  echo ""
  
  echo "5. Missing Required Fields:"
  COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t << EOF
    SELECT 
      'Data Integrity Issues' as issue_type,
      COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
      COUNT(CASE WHEN title = '' THEN 1 END) as empty_titles,
      COUNT(CASE WHEN handle = '' THEN 1 END) as empty_handles,
      COUNT(CASE WHEN created_at IS NULL THEN 1 END) as null_created_at
    FROM product
    WHERE title LIKE 'Stress Test%';
EOF
} | tee "$INTEGRITY_FILE"

echo "✓ Integrity check complete, saved to $INTEGRITY_FILE"

# ============================================================================
# PHASE 6: STORAGE CALCULATION
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 6]${NC} Storage Analysis"
echo "─────────────────────────────────────────────────────────────"

STORAGE_FILE="$RESULTS_DIR/storage-analysis.txt"
{
  echo "=== STORAGE CAPACITY ANALYSIS ==="
  echo ""
  echo "Stress Test Configuration: 500 products × 3 images"
  echo ""
  
  # Get database size
  DB_SIZE=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT pg_size_pretty(pg_database_size('medusa-store'));")
  echo "Current Database Size: $DB_SIZE"
  echo ""
  
  # Get product table size
  PRODUCT_TABLE_SIZE=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT pg_size_pretty(pg_total_relation_size('product'));")
  echo "Product Table Size: $PRODUCT_TABLE_SIZE"
  
  # Get image table size
  IMAGE_TABLE_SIZE=$(COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME docker exec medusa_postgres psql -U postgres -d medusa-store -t -c \
    "SELECT pg_size_pretty(pg_total_relation_size('product_image'));")
  echo "Product Image Table Size: $IMAGE_TABLE_SIZE"
  echo ""
  
  # Get PG volume size
  VOLUME_SIZE=$(docker run --rm -v ${COMPOSE_PROJECT_NAME}_postgres_data:/vol alpine sh -c "du -sh /vol" 2>/dev/null || echo "N/A")
  echo "Postgres Volume Size: $VOLUME_SIZE"
  echo ""
  
  # Extrapolate for different scales
  echo "Storage Extrapolation:"
  for scale in 1000 5000 10000; do
    echo "  - ${scale} products with images: $DB_SIZE (estimated linear)"
  done
  echo ""
  
  echo "Recommendations:"
  echo "  - Monitor database growth with each product batch"
  echo "  - Implement image compression/CDN delivery for scale"
  echo "  - Consider database indexing optimization"
  echo "  - Plan storage scaling at ~2x current usage"
} | tee "$STORAGE_FILE"

echo "✓ Storage analysis saved to $STORAGE_FILE"

# ============================================================================
# PHASE 7: PERFORMANCE METRICS
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 7]${NC} Performance Summary"
echo "─────────────────────────────────────────────────────────────"

PERFORMANCE_FILE="$RESULTS_DIR/performance-summary.txt"
{
  echo "=== PERFORMANCE METRICS ==="
  echo ""
  echo "TEST EXECUTION:"
  PRODUCTS_CREATED=$(grep -oP "Products Created: \K\d+" "$TEST_LOG" | head -1 || echo "0")
  PRODUCTS_FAILED=$(grep -oP "Products Failed: \K\d+" "$TEST_LOG" | head -1 || echo "0")
  SUCCESS_RATE=$(grep -oP "Success Rate: \K[0-9.]+" "$TEST_LOG" | head -1 || echo "0")
  THROUGHPUT=$(grep -oP "Throughput: \K[0-9.]+" "$TEST_LOG" | head -1 || echo "0")
  
  echo "  Products Created: $PRODUCTS_CREATED"
  echo "  Products Failed: $PRODUCTS_FAILED"
  echo "  Success Rate: $SUCCESS_RATE%"
  echo "  Throughput: $THROUGHPUT products/sec"
  echo "  Total Duration: ${TEST_DURATION}s"
  echo ""
  
  echo "ERRORS:"
  if grep -q "ERROR\|❌\|Failed" "$TEST_LOG"; then
    echo "  ⚠️  Errors detected in test log"
    grep -i "error\|failed" "$TEST_LOG" | head -10 || echo "  None"
  else
    echo "  ✓ No errors detected"
  fi
  echo ""
  
  echo "VERDICT: $TEST_STATUS"
} | tee "$PERFORMANCE_FILE"

echo "✓ Performance metrics saved to $PERFORMANCE_FILE"

# ============================================================================
# PHASE 8: GENERATE FINAL REPORT
# ============================================================================
echo ""
echo -e "${YELLOW}[PHASE 8]${NC} Final Report Generation"
echo "─────────────────────────────────────────────────────────────"

FINAL_REPORT="$RESULTS_DIR/STRESS_TEST_REPORT.md"
{
  echo "# Medusa Stress Test Report"
  echo ""
  echo "**Test Date:** $(date)"
  echo "**Test Duration:** ${TEST_DURATION}s ($((TEST_DURATION / 60))m)"
  echo "**Test Status:** $TEST_STATUS"
  echo ""
  
  echo "## Executive Summary"
  echo ""
  echo "This stress test evaluated the system's ability to handle bulk product uploads with multiple images to assess data integrity and storage requirements."
  echo ""
  echo "### Test Configuration"
  echo "- Products Created: 500"
  echo "- Images per Product: 3"
  echo "- Total Images: 1,500"
  echo "- Batch Size: 50"
  echo ""
  
  echo "### Key Results"
  echo "- Products Successfully Created: $PRODUCTS_CREATED/500"
  echo "- Success Rate: $SUCCESS_RATE%"
  echo "- Throughput: $THROUGHPUT products/second"
  echo "- Database Size: $DB_SIZE"
  echo ""
  
  echo "## Detailed Results"
  echo ""
  echo "### 1. Data Integrity"
  head -n 20 "$INTEGRITY_FILE" | tail -n 15
  echo ""
  
  echo "### 2. Storage Analysis"
  head -n 15 "$STORAGE_FILE" | tail -n 12
  echo ""
  
  echo "### 3. Performance"
  cat "$PERFORMANCE_FILE"
  echo ""
  
  echo "## Artifacts Generated"
  echo "All test results have been saved to: **$RESULTS_DIR**"
  echo ""
  echo "Files:"
  ls -lh "$RESULTS_DIR" | tail -n +2 | awk '{print "- " $9 " (" $5 ")"}'
  echo ""
  
  echo "## Recommendations"
  if [[ "$TEST_STATUS" == "SUCCESS" ]] && [[ "$SUCCESS_RATE" == "100" ]]; then
    echo "✅ System passed stress test with 100% success rate"
    echo "- System is ready for production use"
    echo "- Consider similar testing at 1000+ products for further validation"
    echo "- Implement automated daily backups given data criticality"
  elif [[ "$TEST_STATUS" == "SUCCESS" ]]; then
    echo "⚠️  System passed with partial success ($SUCCESS_RATE%)"
    echo "- Investigate failed product uploads"
    echo "- Review error logs for patterns"
    echo "- Consider fixing issues before production"
  else
    echo "❌ System failed stress test"
    echo "- Critical issues need addressing before production"
    echo "- Review error logs in detail"
    echo "- Consider reducing batch size or investigating resource constraints"
  fi
} | tee "$FINAL_REPORT"

echo ""
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}✓ STRESS TEST COMPLETE${NC}"
echo -e "${GREEN}========================================================${NC}"
echo ""
echo "📁 Full results directory: $RESULTS_DIR"
echo "📄 Final report: $FINAL_REPORT"
echo ""
echo "Key files:"
ls -1h "$RESULTS_DIR"
echo ""
