#!/bin/bash
#
# Long-duration soak/capacity test for the full app stack.
# Runs transaction stress + container/host monitoring and outputs peak resource requirements.
#

set -euo pipefail

PROJECT_DIR="/root/thaiVaiEcom2.0"
cd "$PROJECT_DIR"

DURATION_SECONDS="${SOAK_DURATION_SECONDS:-21600}"   # 6h default
SAMPLE_INTERVAL_SECONDS="${SOAK_SAMPLE_INTERVAL_SECONDS:-5}"
CONCURRENCY="${SOAK_CONCURRENCY:-20}"
PRODUCTS_LIMIT="${SOAK_PRODUCTS_LIMIT:-24}"
CHECKOUT_ATTEMPT="${SOAK_CHECKOUT_ATTEMPT:-false}"

RESULTS_DIR="/root/soak-capacity-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

MONITOR_CSV="$RESULTS_DIR/container_metrics.csv"
HOST_CSV="$RESULTS_DIR/host_metrics.csv"
LOAD_LOG="$RESULTS_DIR/load_test.log"
SUMMARY_MD="$RESULTS_DIR/SOAK_CAPACITY_REPORT.md"
ENV_SUMMARY="$RESULTS_DIR/environment.txt"

echo "========================================================"
echo " Medusa Soak Capacity Test"
echo "========================================================"
echo "Results directory: $RESULTS_DIR"
echo "Duration: ${DURATION_SECONDS}s"
echo "Sample interval: ${SAMPLE_INTERVAL_SECONDS}s"
echo "Concurrency: $CONCURRENCY"
echo "Products limit per browse: $PRODUCTS_LIMIT"
echo "Checkout attempt: $CHECKOUT_ATTEMPT"
echo ""

if ! docker ps --format '{{.Names}}' | grep -Eq 'medusa|postgres|redis|storefront|nginx'; then
  echo "No expected app containers found running. Start the stack first (e.g. yarn docker:up)."
  exit 1
fi

if [[ -z "${STRESS_PUBLISHABLE_KEY:-}" ]]; then
  STRESS_PUBLISHABLE_KEY="$(docker exec medusa_backend sh -lc 'if [ -f /shared/publishable_key.env ]; then . /shared/publishable_key.env; fi; printf "%s" "${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}"' 2>/dev/null || true)"
  if [[ -n "$STRESS_PUBLISHABLE_KEY" ]]; then
    export STRESS_PUBLISHABLE_KEY
  fi
fi

CONTAINER_NAMES="$(docker ps --format '{{.Names}}' | grep -E 'medusa|postgres|redis|storefront|nginx' || true)"
if [[ -z "$CONTAINER_NAMES" ]]; then
  CONTAINER_NAMES="$(docker ps --format '{{.Names}}')"
fi

echo "container,mem_limit_bytes,cpu_limit,pids_limit" > "$RESULTS_DIR/container_limits.csv"
while IFS= read -r cname; do
  [[ -z "$cname" ]] && continue
  docker inspect --format '{{.Name}},{{.HostConfig.Memory}},{{.HostConfig.NanoCpus}},{{.HostConfig.PidsLimit}}' "$cname" \
    | sed 's#^/##' >> "$RESULTS_DIR/container_limits.csv" || true
done <<< "$CONTAINER_NAMES"

echo "timestamp,container,cpu_perc,mem_usage_raw,mem_perc,net_io_raw,block_io_raw,pids" > "$MONITOR_CSV"
echo "timestamp,mem_available_bytes,mem_total_bytes,load1,load5,load15,disk_used_bytes,disk_total_bytes" > "$HOST_CSV"

START_TS="$(date +%s)"
END_TS="$((START_TS + DURATION_SECONDS))"

ROOT_DISK_USED_START="$(df -B1 / | awk 'NR==2 {print $3}')"
PG_DB_SIZE_START="0"
if docker ps --format '{{.Names}}' | grep -q '^medusa_postgres$'; then
  PG_DB_SIZE_START="$(docker exec medusa_postgres psql -U postgres -d medusa-store -t -A -c "SELECT pg_database_size('medusa-store');" 2>/dev/null || echo 0)"
fi

{
  echo "Start timestamp: $(date -Iseconds)"
  echo "Duration seconds: $DURATION_SECONDS"
  echo "Sample interval seconds: $SAMPLE_INTERVAL_SECONDS"
  echo "Concurrency: $CONCURRENCY"
  echo "Products limit: $PRODUCTS_LIMIT"
  echo "Checkout attempt: $CHECKOUT_ATTEMPT"
  echo ""
  echo "Containers in scope:"
  echo "$CONTAINER_NAMES"
} > "$ENV_SUMMARY"

capture_sample() {
  local ts
  ts="$(date +%s)"

  while IFS= read -r cname; do
    [[ -z "$cname" ]] && continue
    docker stats --no-stream --format '{{.Container}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}' "$cname" 2>/dev/null \
      | awk -v t="$ts" 'NF {print t","$0}' >> "$MONITOR_CSV" || true
  done <<< "$CONTAINER_NAMES"

  local mem_avail mem_total load1 load5 load15 disk_used disk_total
  mem_avail="$(awk '/MemAvailable:/ {print $2 * 1024}' /proc/meminfo)"
  mem_total="$(awk '/MemTotal:/ {print $2 * 1024}' /proc/meminfo)"
  read -r load1 load5 load15 _ < /proc/loadavg
  disk_used="$(df -B1 / | awk 'NR==2 {print $3}')"
  disk_total="$(df -B1 / | awk 'NR==2 {print $2}')"
  echo "$ts,$mem_avail,$mem_total,$load1,$load5,$load15,$disk_used,$disk_total" >> "$HOST_CSV"
}

echo "Starting monitor loop and workload..."

(
  while [[ "$(date +%s)" -lt "$END_TS" ]]; do
    capture_sample
    sleep "$SAMPLE_INTERVAL_SECONDS"
  done
  # One final sample at end.
  capture_sample
) &
MONITOR_PID=$!

set +e
STRESS_BASE_URL="${STRESS_BASE_URL:-http://localhost:9000}" \
STRESS_CONCURRENCY="$CONCURRENCY" \
STRESS_DURATION_SECONDS="$DURATION_SECONDS" \
STRESS_PRODUCTS_LIMIT="$PRODUCTS_LIMIT" \
STRESS_CHECKOUT_ATTEMPT="$CHECKOUT_ATTEMPT" \
node ./scripts/stress-test-transactions.mjs 2>&1 | tee "$LOAD_LOG"
LOAD_EXIT=${PIPESTATUS[0]}
set -e

wait "$MONITOR_PID" || true

END_TS_REAL="$(date +%s)"
ELAPSED="$((END_TS_REAL - START_TS))"

ROOT_DISK_USED_END="$(df -B1 / | awk 'NR==2 {print $3}')"
PG_DB_SIZE_END="0"
if docker ps --format '{{.Names}}' | grep -q '^medusa_postgres$'; then
  PG_DB_SIZE_END="$(docker exec medusa_postgres psql -U postgres -d medusa-store -t -A -c "SELECT pg_database_size('medusa-store');" 2>/dev/null || echo 0)"
fi

node - "$MONITOR_CSV" "$HOST_CSV" "$RESULTS_DIR/container_limits.csv" "$LOAD_LOG" "$SUMMARY_MD" "$ELAPSED" "$ROOT_DISK_USED_START" "$ROOT_DISK_USED_END" "$PG_DB_SIZE_START" "$PG_DB_SIZE_END" "$LOAD_EXIT" <<'NODE'
const fs = require("fs")

const [monitorCsv, hostCsv, limitsCsv, loadLog, summaryPath, elapsedStr, rootDiskStartStr, rootDiskEndStr, pgStartStr, pgEndStr, loadExitStr] = process.argv.slice(2)

const elapsed = Number(elapsedStr || 0)
const rootDiskStart = Number(rootDiskStartStr || 0)
const rootDiskEnd = Number(rootDiskEndStr || 0)
const pgStart = Number(pgStartStr || 0)
const pgEnd = Number(pgEndStr || 0)
const loadExit = Number(loadExitStr || 1)

function parseUnit(value) {
  if (!value) return 0
  const cleaned = String(value).trim()
  const m = cleaned.match(/^([0-9]*\.?[0-9]+)\s*([kmgtp]?i?b)?$/i)
  if (!m) return Number(cleaned) || 0
  const n = Number(m[1])
  const unit = (m[2] || "b").toLowerCase()
  const table = {
    b: 1,
    kb: 1000,
    mb: 1000 ** 2,
    gb: 1000 ** 3,
    tb: 1000 ** 4,
    pb: 1000 ** 5,
    kib: 1024,
    mib: 1024 ** 2,
    gib: 1024 ** 3,
    tib: 1024 ** 4,
    pib: 1024 ** 5,
  }
  return n * (table[unit] || 1)
}

function parsePair(raw) {
  if (!raw) return [0, 0]
  const parts = raw.split("/").map((p) => p.trim())
  return [parseUnit(parts[0]), parseUnit(parts[1] || "0")]
}

function fmtBytes(bytes) {
  const n = Number(bytes || 0)
  if (n <= 0) return "0 B"
  const units = ["B", "KiB", "MiB", "GiB", "TiB"]
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`
}

function fmtRate(bytesPerSec) {
  return `${fmtBytes(bytesPerSec)}/s`
}

const lines = fs.readFileSync(monitorCsv, "utf8").trim().split("\n").slice(1).filter(Boolean)
const perContainer = new Map()
const totalMemByTs = new Map()
const prevByContainer = new Map()

for (const line of lines) {
  const [tsRaw, container, cpuRaw, memUsageRaw, memPercRaw, netRaw, blockRaw, pidsRaw] = line.split(",")
  const ts = Number(tsRaw)
  const cpu = Number(String(cpuRaw || "0").replace("%", "")) || 0
  const memPerc = Number(String(memPercRaw || "0").replace("%", "")) || 0
  const [memUsed, memLimit] = parsePair(memUsageRaw)
  const [netIn, netOut] = parsePair(netRaw)
  const [blkIn, blkOut] = parsePair(blockRaw)
  const pids = Number(pidsRaw || 0)

  totalMemByTs.set(ts, (totalMemByTs.get(ts) || 0) + memUsed)

  if (!perContainer.has(container)) {
    perContainer.set(container, {
      maxCpu: 0,
      maxMem: 0,
      maxMemPerc: 0,
      maxPids: 0,
      memLimit: 0,
      maxNetInBps: 0,
      maxNetOutBps: 0,
      maxBlkInBps: 0,
      maxBlkOutBps: 0,
    })
  }

  const item = perContainer.get(container)
  item.maxCpu = Math.max(item.maxCpu, cpu)
  item.maxMem = Math.max(item.maxMem, memUsed)
  item.maxMemPerc = Math.max(item.maxMemPerc, memPerc)
  item.maxPids = Math.max(item.maxPids, pids)
  item.memLimit = Math.max(item.memLimit, memLimit)

  const prev = prevByContainer.get(container)
  if (prev && ts > prev.ts) {
    const dt = ts - prev.ts
    item.maxNetInBps = Math.max(item.maxNetInBps, (netIn - prev.netIn) / dt)
    item.maxNetOutBps = Math.max(item.maxNetOutBps, (netOut - prev.netOut) / dt)
    item.maxBlkInBps = Math.max(item.maxBlkInBps, (blkIn - prev.blkIn) / dt)
    item.maxBlkOutBps = Math.max(item.maxBlkOutBps, (blkOut - prev.blkOut) / dt)
  }
  prevByContainer.set(container, { ts, netIn, netOut, blkIn, blkOut })
}

let maxTotalMem = 0
for (const v of totalMemByTs.values()) {
  maxTotalMem = Math.max(maxTotalMem, v)
}

const hostLines = fs.readFileSync(hostCsv, "utf8").trim().split("\n").slice(1).filter(Boolean)
let hostMemTotal = 0
let minHostMemAvailable = Number.MAX_SAFE_INTEGER
let maxHostLoad1 = 0
let maxHostDiskUsed = 0
let hostDiskTotal = 0

for (const line of hostLines) {
  const [_, memAvailRaw, memTotalRaw, load1Raw, , , diskUsedRaw, diskTotalRaw] = line.split(",")
  const memAvail = Number(memAvailRaw || 0)
  const memTotal = Number(memTotalRaw || 0)
  const load1 = Number(load1Raw || 0)
  const diskUsed = Number(diskUsedRaw || 0)
  const diskTotal = Number(diskTotalRaw || 0)

  hostMemTotal = Math.max(hostMemTotal, memTotal)
  minHostMemAvailable = Math.min(minHostMemAvailable, memAvail)
  maxHostLoad1 = Math.max(maxHostLoad1, load1)
  maxHostDiskUsed = Math.max(maxHostDiskUsed, diskUsed)
  hostDiskTotal = Math.max(hostDiskTotal, diskTotal)
}

const limits = fs.readFileSync(limitsCsv, "utf8").trim().split("\n").slice(1).filter(Boolean).map((line) => {
  const [container, memLimitRaw, nanoCpusRaw, pidsLimitRaw] = line.split(",")
  const memLimitBytes = Number(memLimitRaw || 0)
  const cpus = Number(nanoCpusRaw || 0) / 1e9
  const pidsLimit = Number(pidsLimitRaw || 0)
  return { container, memLimitBytes, cpus, pidsLimit }
})

const limitsByContainer = new Map(limits.map((x) => [x.container, x]))

const rootDiskGrowth = Math.max(0, rootDiskEnd - rootDiskStart)
const pgGrowth = Math.max(0, pgEnd - pgStart)
const perDayFactor = elapsed > 0 ? 86400 / elapsed : 0
const rootDiskPerDay = rootDiskGrowth * perDayFactor
const pgPerDay = pgGrowth * perDayFactor

const loadLogText = fs.readFileSync(loadLog, "utf8")
const totalFlows = Number((loadLogText.match(/Total flows:\s*(\d+)/) || [])[1] || 0)
const successRate = Number((loadLogText.match(/Flow success rate:\s*([0-9.]+)%/) || [])[1] || 0)
const flowsPerSecond = Number((loadLogText.match(/Flows per second:\s*([0-9.]+)/) || [])[1] || 0)

const ordered = [...perContainer.entries()].sort((a, b) => b[1].maxMem - a[1].maxMem)

const linesOut = []
linesOut.push("# Soak Capacity Report")
linesOut.push("")
linesOut.push(`- Duration tested: ${elapsed}s (${(elapsed / 3600).toFixed(2)}h)`)
linesOut.push(`- Load generator exit code: ${loadExit}`)
linesOut.push(`- Total shopper flows: ${totalFlows}`)
linesOut.push(`- Flow success rate: ${successRate ? `${successRate.toFixed(2)}%` : "N/A"}`)
linesOut.push(`- Throughput: ${flowsPerSecond ? flowsPerSecond.toFixed(2) : "0.00"} flows/s`)
linesOut.push("")
linesOut.push("## Peak Resource Usage")
linesOut.push("")
linesOut.push(`- Peak combined container memory: ${fmtBytes(maxTotalMem)}`)
linesOut.push(`- Host minimum available memory: ${fmtBytes(minHostMemAvailable)} (of ${fmtBytes(hostMemTotal)})`)
linesOut.push(`- Host max load average (1m): ${maxHostLoad1.toFixed(2)}`)
linesOut.push(`- Host peak root disk used: ${fmtBytes(maxHostDiskUsed)} (of ${fmtBytes(hostDiskTotal)})`)
linesOut.push("")
linesOut.push("## Growth During Test")
linesOut.push("")
linesOut.push(`- Root filesystem growth during test: ${fmtBytes(rootDiskGrowth)}`)
linesOut.push(`- Estimated root growth per day at this load: ${fmtBytes(rootDiskPerDay)}/day`)
linesOut.push(`- Postgres DB growth during test: ${fmtBytes(pgGrowth)}`)
linesOut.push(`- Estimated Postgres growth per day at this load: ${fmtBytes(pgPerDay)}/day`)
linesOut.push("")
linesOut.push("## Per-Container Peaks")
linesOut.push("")
linesOut.push("| Container | Max CPU % | Max Mem | Max Mem % | Mem Limit | Max Net In | Max Net Out | Max Block In | Max Block Out | Max PIDs |")
linesOut.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")

for (const [container, item] of ordered) {
  const limitFromStats = item.memLimit > 0 ? item.memLimit : 0
  const limitFromInspect = limitsByContainer.get(container)?.memLimitBytes || 0
  const limit = Math.max(limitFromStats, limitFromInspect)
  linesOut.push(
    `| ${container} | ${item.maxCpu.toFixed(2)} | ${fmtBytes(item.maxMem)} | ${item.maxMemPerc.toFixed(2)}% | ${limit ? fmtBytes(limit) : "unlimited"} | ${fmtRate(item.maxNetInBps)} | ${fmtRate(item.maxNetOutBps)} | ${fmtRate(item.maxBlkInBps)} | ${fmtRate(item.maxBlkOutBps)} | ${item.maxPids} |`
  )
}

linesOut.push("")
linesOut.push("## Capacity Recommendation For Indefinite Runtime")
linesOut.push("")
const recommendedMem = Math.ceil((maxTotalMem * 1.35) / (1024 ** 2))
const recommendedDiskDay = rootDiskPerDay * 2
const recommendedPgDay = pgPerDay * 2
linesOut.push(`- Recommended minimum aggregate container memory budget: ${recommendedMem} MiB (35% headroom over observed peak).`)
linesOut.push(`- Recommended daily disk budget at this load: ${fmtBytes(recommendedDiskDay)}/day (2x observed growth headroom).`)
linesOut.push(`- Recommended daily Postgres budget at this load: ${fmtBytes(recommendedPgDay)}/day (2x observed growth headroom).`)
linesOut.push("- Re-run this soak test with your expected peak concurrency before production sizing decisions.")

fs.writeFileSync(summaryPath, `${linesOut.join("\n")}\n`)
NODE

echo ""
echo "Soak capacity test complete."
echo "- Environment summary: $ENV_SUMMARY"
echo "- Container metrics CSV: $MONITOR_CSV"
echo "- Host metrics CSV: $HOST_CSV"
echo "- Load test log: $LOAD_LOG"
echo "- Final report: $SUMMARY_MD"

if [[ "$LOAD_EXIT" -ne 0 ]]; then
  echo "Load generator exited non-zero ($LOAD_EXIT). Review $LOAD_LOG"
  exit "$LOAD_EXIT"
fi
