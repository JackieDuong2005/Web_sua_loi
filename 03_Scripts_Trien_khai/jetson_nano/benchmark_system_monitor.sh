#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: GIÁM SÁT HỆ THỐNG KHI BENCHMARK
# Ghi lại thông số: %CPU, %GPU, RAM (MB), Nhiệt độ (°C), Công suất (mW) vào CSV
# ==============================================================================

OUTPUT_CSV="${1:-system_benchmark_metrics.csv}"
INTERVAL_SEC="${2:-1}"

echo "Timestamp,CPU_Percent,GPU_Percent,RAM_Used_MB,RAM_Total_MB,Temp_C,Power_mW" > "$OUTPUT_CSV"

get_gpu_load() {
    # Đọc GPU load trên Tegra
    if [ -f /sys/devices/gpu.0/load ]; then
        cat /sys/devices/gpu.0/load
    elif [ -f /sys/devices/platform/host1x/17000000.gp10b/load ]; then
        cat /sys/devices/platform/host1x/17000000.gp10b/load
    else
        echo "0"
    fi
}

get_temp() {
    # Đọc thermal zone 0 hoặc vcgencmd
    if [ -f /sys/devices/virtual/thermal/thermal_zone0/temp ]; then
        local raw=$(cat /sys/devices/virtual/thermal/thermal_zone0/temp)
        echo "scale=1; $raw / 1000" | bc 2>/dev/null || echo "$raw"
    elif command -v vcgencmd &>/dev/null; then
        vcgencmd measure_temp | grep -oP '\d+\.\d+'
    else
        echo "N/A"
    fi
}

get_power() {
    # Đọc power meter INA3221 trên Jetson Nano
    local p_file="/sys/bus/i2c/drivers/ina3221x/6-0040/iio:device0/in_power0_input"
    if [ -f "$p_file" ]; then
        cat "$p_file"
    else
        echo "0"
    fi
}

echo "📊 Đang ghi dữ liệu phần cứng vào $OUTPUT_CSV (tần suất: ${INTERVAL_SEC}s)..."
echo "👉 Nhấn Ctrl+C để dừng thu thập."

cleanup() {
    echo -e "\n🛑 Đã dừng thu thập thông số hệ thống. File kết quả: $OUTPUT_CSV"
    exit 0
}
trap cleanup SIGINT SIGTERM

while true; do
    TS=$(date '+%Y-%m-%d %H:%M:%S')

    # CPU total load
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}' 2>/dev/null || echo "0")

    # RAM
    RAM_INFO=$(free -m | awk '/^Mem:/{print $3","$2}')

    # GPU
    GPU_RAW=$(get_gpu_load)
    # GPU load trên Tegra là scale 0-1000 (1000 = 100%)
    GPU_USAGE=$(echo "scale=1; $GPU_RAW / 10" | bc 2>/dev/null || echo "$GPU_RAW")

    # Temp
    TEMP=$(get_temp)

    # Power
    POWER=$(get_power)

    echo "$TS,$CPU_USAGE,$GPU_USAGE,$RAM_INFO,$TEMP,$POWER" >> "$OUTPUT_CSV"
    sleep "$INTERVAL_SEC"
done
