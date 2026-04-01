#!/bin/bash
#
# Stress Test Monitoring Script
# Captures resource metrics from Docker containers during stress testing
#

CONTAINER_PREFIX="medusa"
METRICS_FILE="/tmp/stress-test-metrics-$(date +%s).csv"
INTERVAL=5  # Capture metrics every 5 seconds
DURATION=${1:-3600}  # Default 1 hour, override with first argument

echo "Starting stress test monitoring..."
echo "Metrics will be saved to: $METRICS_FILE"
echo "Monitoring duration: ${DURATION}s"
echo "Capture interval: ${INTERVAL}s"
echo ""

# Create CSV header
echo "timestamp,container,cpu_percent,memory_usage_mb,memory_limit_mb,net_input_bytes,net_output_bytes,block_input_bytes,block_output_bytes" > "$METRICS_FILE"

# Get start time
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))

# Monitoring loop
while [[ $(date +%s) -lt $END_TIME ]]; do
  CURRENT_TIME=$(date +%s)
  
  # Get stats for each container
  docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null | tail -n +2 | while read -r line; do
    # Parse container stats
    CONTAINER=$(echo "$line" | awk '{print $1}' | cut -c1-12)
    CPU=$(echo "$line" | awk '{print $2}' | sed 's/%//')
    MEM=$(echo "$line" | awk '{print $3}' | sed 's/MiB.*//')
    MEM_LIMIT=$(echo "$line" | awk '{print $4}' | sed 's/MiB.*//')
    
    # For network and block I/O, we'd need docker inspect for detailed data
    echo "$CURRENT_TIME,$CONTAINER,$CPU,$MEM,$MEM_LIMIT,0,0,0,0" >> "$METRICS_FILE"
  done
  
  echo "$(date) - Monitoring... (Duration: $(($(date +%s) - START_TIME))s)"
  sleep "$INTERVAL"
done

echo ""
echo "Monitoring complete!"
echo "Metrics saved to: $METRICS_FILE"
echo ""
echo "Summary:"
tail -n 20 "$METRICS_FILE"

# Calculate and display statistics
echo ""
echo "Statistics:"
awk -F',' 'NR>1 {
  container[$2]++;
  cpu_sum[$2]+=$3;
  mem_max[$2]=($4>mem_max[$2])?$4:mem_max[$2];
}
END {
  for (c in container) {
    printf "Container: %s | Avg CPU: %.2f%% | Max Memory: %.1f MiB | Samples: %d\n", 
           c, cpu_sum[c]/container[c], mem_max[c], container[c]
  }
}' "$METRICS_FILE"
