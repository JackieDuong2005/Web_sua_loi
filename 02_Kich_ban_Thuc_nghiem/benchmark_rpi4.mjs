#!/usr/bin/env node
// ================================================================
//  ViHand Grade — Benchmark Hiệu năng Raspberry Pi 4
//  Đo lường: CPU, RAM, Latency end-to-end, Throughput đồng thời
//
//  CÁCH CHẠY (trên Raspberry Pi 4):
//    node benchmark_rpi4.mjs
//
//  KẾT QUẢ: benchmark_rpi4_results.json
// ================================================================

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { createReadStream } from "fs";
import { stat } from "fs/promises";

const __dir = dirname(fileURLToPath(import.meta.url));

// ─── Cấu hình ───────────────────────────────────────────────────
const BASE_URL   = process.env.BASE_URL || "http://localhost:3000";
const IMAGE_DIR  = join(__dir, "Ảnh viết tay 76 thực tế");
const SAMPLE_COUNT = parseInt(process.env.SAMPLE || "10"); // Số ảnh test (mặc định 10)
const CONCURRENT  = parseInt(process.env.CONCURRENT || "1"); // Số request đồng thời
const DELAY_MS    = 2000; // Delay giữa các request (ms)

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Đọc thông tin hệ thống RPi ─────────────────────────────────
function getSystemInfo() {
  const info = {};
  try {
    info.hostname    = execSync("hostname").toString().trim();
    info.os          = execSync("cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2").toString().trim();
    info.kernel      = execSync("uname -r").toString().trim();
    info.arch        = execSync("uname -m").toString().trim();
    info.cpuModel    = execSync("cat /proc/cpuinfo | grep 'Model name' | head -1 | cut -d':' -f2").toString().trim()
                    || execSync("cat /proc/cpuinfo | grep 'Model' | head -1 | cut -d':' -f2").toString().trim();
    info.cpuCores    = parseInt(execSync("nproc").toString().trim());
    info.cpuFreqMHz  = parseFloat(execSync("vcgencmd measure_clock arm 2>/dev/null | cut -d'=' -f2").toString().trim()) / 1e6
                    || parseFloat(execSync("cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq 2>/dev/null").toString().trim()) / 1000;
    info.totalRAM_MB = Math.round(parseInt(execSync("grep MemTotal /proc/meminfo | awk '{print $2}'").toString().trim()) / 1024);
    info.freeRAM_MB  = Math.round(parseInt(execSync("grep MemAvailable /proc/meminfo | awk '{print $2}'").toString().trim()) / 1024);
    info.nodeVersion = execSync("node -v").toString().trim();
    info.tempCelsius = parseFloat(execSync("vcgencmd measure_temp 2>/dev/null | cut -d'=' -f2").toString()) || null;
    info.uptime      = execSync("uptime -p").toString().trim();
  } catch(e) {
    info.error = e.message;
  }
  return info;
}

// ─── Đọc CPU/RAM hiện tại ───────────────────────────────────────
function getCpuRamSnapshot() {
  try {
    const cpuPercent = parseFloat(execSync(
      "top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4}'"
    ).toString().trim());
    const freeRAM = Math.round(parseInt(
      execSync("grep MemAvailable /proc/meminfo | awk '{print $2}'").toString().trim()
    ) / 1024);
    const usedRAM = Math.round(parseInt(
      execSync("grep MemTotal /proc/meminfo | awk '{print $2}'").toString().trim()
    ) / 1024) - freeRAM;
    const temp = parseFloat(
      execSync("vcgencmd measure_temp 2>/dev/null | cut -d'=' -f2").toString()
    ) || null;
    return { cpuPercent, usedRAM_MB: usedRAM, freeRAM_MB: freeRAM, tempCelsius: temp };
  } catch(e) {
    return { error: e.message };
  }
}

// ─── Gọi API /api/grade (End-to-End) ────────────────────────────
async function callGradeAPI(imagePath) {
  const fileStat = await stat(imagePath);
  const sizeKB   = (fileStat.size / 1024).toFixed(1);

  // Tạo multipart form data
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2);
  const imageData = readFileSync(imagePath);
  const filename  = imagePath.split(/[\\/]/).pop();

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
    imageData,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const startMs = Date.now();
  let response, data;
  try {
    response = await fetch(`${BASE_URL}/api/grade`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length.toString(),
      },
      body,
    });
    const text = await response.text();
    const latencyMs = Date.now() - startMs;

    try {
      data = JSON.parse(text);
    } catch {
      return { success: false, latencyMs, sizeKB, error: "JSON parse fail", rawLength: text.length };
    }

    return {
      success: response.ok,
      statusCode: response.status,
      latencyMs,
      sizeKB: parseFloat(sizeKB),
      score: data.score || data.result?.score || "N/A",
      errCount: data.corrections?.length ?? data.result?.corrections?.length ?? 0,
      jsonOk: true,
    };
  } catch(err) {
    return { success: false, latencyMs: Date.now() - startMs, sizeKB, error: err.message, jsonOk: false };
  }
}

// ─── Kiểm tra server đang chạy ─────────────────────────────────
async function pingServer() {
  try {
    const r = await fetch(`${BASE_URL}/api/auth/login`, { method: "HEAD" });
    return r.status < 500;
  } catch {
    return false;
  }
}

// ─── Kiểm tra độ trễ trang web (HTTP GET) ──────────────────────
async function benchmarkPageLoad(path = "/") {
  const start = Date.now();
  try {
    const r = await fetch(`${BASE_URL}${path}`);
    const text = await r.text();
    return { path, latencyMs: Date.now() - start, status: r.status, sizeBytes: text.length };
  } catch(e) {
    return { path, latencyMs: Date.now() - start, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — BENCHMARK RASPBERRY PI 4");
  console.log(`  Server  : ${BASE_URL}`);
  console.log(`  Mẫu test: ${SAMPLE_COUNT} ảnh | Concurrent: ${CONCURRENT}`);
  console.log(`  Bắt đầu : ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════\n");

  // ── Thông tin hệ thống ────────────────────────────────────────
  console.log("📋 THÔNG TIN HỆ THỐNG:");
  const sysInfo = getSystemInfo();
  console.log(`  Hostname : ${sysInfo.hostname}`);
  console.log(`  OS       : ${sysInfo.os}`);
  console.log(`  CPU      : ${sysInfo.cpuModel || "Raspberry Pi 4 Cortex-A72"}`);
  console.log(`  CPU Cores: ${sysInfo.cpuCores}`);
  console.log(`  CPU Freq : ~${sysInfo.cpuFreqMHz?.toFixed(0) || 1500}MHz`);
  console.log(`  RAM      : ${sysInfo.totalRAM_MB}MB total | ${sysInfo.freeRAM_MB}MB free`);
  console.log(`  Temp     : ${sysInfo.tempCelsius || "N/A"}°C`);
  console.log(`  Node.js  : ${sysInfo.nodeVersion}\n`);

  // ── Kiểm tra server ───────────────────────────────────────────
  console.log("🔍 Kiểm tra server...");
  const alive = await pingServer();
  if (!alive) {
    console.error("❌ Server không phản hồi! Kiểm tra: sudo systemctl status vihand");
    process.exit(1);
  }
  console.log("✅ Server đang chạy\n");

  // ── Benchmark 1: Page Load ────────────────────────────────────
  console.log("📄 BENCHMARK 1: ĐỘ TRỄ TẢI TRANG (Page Load Latency)");
  const pages = ["/", "/teacher/grade", "/student", "/admin"];
  const pageResults = [];
  for (const page of pages) {
    const result = await benchmarkPageLoad(page);
    pageResults.push(result);
    const status = result.error ? "❌ " + result.error : `✅ ${result.latencyMs}ms (${(result.sizeBytes/1024).toFixed(1)}KB)`;
    console.log(`  ${page.padEnd(20)} → ${status}`);
    await sleep(500);
  }

  // ── Benchmark 2: End-to-End API Grade ────────────────────────
  console.log("\n🧪 BENCHMARK 2: END-TO-END CHẤM ĐIỂM (API /api/grade)");

  // Tìm ảnh để test
  let images = [];
  if (existsSync(IMAGE_DIR)) {
    const { readdirSync } = await import("fs");
    images = readdirSync(IMAGE_DIR)
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      .slice(0, SAMPLE_COUNT)
      .map(f => join(IMAGE_DIR, f));
  }

  if (images.length === 0) {
    console.log("  ⚠️  Không tìm thấy ảnh trong thư mục. Bỏ qua benchmark API.");
  }

  const apiResults = [];
  const snapshotsBefore = getCpuRamSnapshot();

  for (let i = 0; i < images.length; i++) {
    const imgPath = images[i];
    const fname   = imgPath.split(/[\\/]/).pop().slice(0, 40).padEnd(40);
    process.stdout.write(`  [${String(i+1).padStart(2)}/${images.length}] ${fname} → `);

    const result = await callGradeAPI(imgPath);
    const icon   = result.success ? "✅" : "❌";
    console.log(`${icon} ${(result.latencyMs/1000).toFixed(2)}s | Score: ${result.score} | Lỗi: ${result.errCount}`);

    apiResults.push({ file: imgPath.split(/[\\/]/).pop(), ...result });
    if (i < images.length - 1) await sleep(DELAY_MS);
  }

  const snapshotsAfter = getCpuRamSnapshot();

  // ── Tổng kết ─────────────────────────────────────────────────
  const successApi = apiResults.filter(r => r.success);
  const lats       = successApi.map(r => r.latencyMs);
  const avg        = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  TỔNG KẾT BENCHMARK RASPBERRY PI 4");
  console.log("═══════════════════════════════════════════════════════");

  console.log("\n  📄 Page Load Latency:");
  for (const p of pageResults) {
    if (!p.error) console.log(`    ${p.path.padEnd(20)}: ${p.latencyMs}ms`);
  }
  const avgPageLoad = pageResults.filter(p=>!p.error).map(p=>p.latencyMs);
  console.log(`    Trung bình             : ${Math.round(avg(avgPageLoad))}ms`);

  if (lats.length > 0) {
    console.log("\n  🧪 End-to-End API Grade:");
    console.log(`    Thành công             : ${successApi.length}/${apiResults.length}`);
    console.log(`    Latency Min            : ${(Math.min(...lats)/1000).toFixed(2)}s`);
    console.log(`    Latency Max            : ${(Math.max(...lats)/1000).toFixed(2)}s`);
    console.log(`    Latency Mean           : ${(avg(lats)/1000).toFixed(2)}s`);
    console.log(`    < 10s                  : ${lats.filter(l=>l<10000).length}/${lats.length}`);
    console.log(`    < 30s                  : ${lats.filter(l=>l<30000).length}/${lats.length}`);
  }

  console.log("\n  💾 Tài nguyên hệ thống:");
  console.log(`    RAM trước khi test     : ${snapshotsBefore.usedRAM_MB}MB used`);
  console.log(`    RAM sau khi test       : ${snapshotsAfter.usedRAM_MB}MB used`);
  console.log(`    Nhiệt độ CPU           : ${snapshotsAfter.tempCelsius || "N/A"}°C`);

  // ── Lưu kết quả ───────────────────────────────────────────────
  const outFile = join(__dir, "benchmark_rpi4_results.json");
  const output = {
    date: new Date().toISOString(),
    serverUrl: BASE_URL,
    systemInfo: sysInfo,
    benchmark_pageLoad: pageResults,
    benchmark_apiGrade: {
      sampleCount: images.length,
      successCount: successApi.length,
      latency: lats.length ? {
        min:  (Math.min(...lats)/1000).toFixed(2),
        max:  (Math.max(...lats)/1000).toFixed(2),
        mean: (avg(lats)/1000).toFixed(2),
        lt10: lats.filter(l=>l<10000).length,
        lt30: lats.filter(l=>l<30000).length,
      } : null,
      results: apiResults,
    },
    resourceUsage: {
      before: snapshotsBefore,
      after: snapshotsAfter,
    },
  };

  writeFileSync(outFile, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n  📄 Kết quả: ${outFile}`);
  console.log(`  ⏰ Kết thúc: ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch(console.error);
