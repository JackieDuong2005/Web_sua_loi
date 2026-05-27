// benchmark_gemini_images.mjs
// Benchmark Gemini API với ẢNH THẬT chữ viết tay học sinh tiểu học
// Chạy: node benchmark_gemini_images.mjs

import { readFileSync, readdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Load API key ─────────────────────────────────────────────────────────────
const envRaw = readFileSync(join(__dir, ".env.local"), "utf-8");
const GEMINI_API_KEY = envRaw.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!GEMINI_API_KEY) { console.error("❌ Không tìm thấy GEMINI_API_KEY"); process.exit(1); }

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── System prompt (giống route.ts) ───────────────────────────────────────────
const GRADING_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên chấm bài chính tả. Phân tích đoạn văn của học sinh được cung cấp, sửa lỗi chính tả và chấm điểm theo barem chuẩn. Trả về duy nhất định dạng JSON.

=== THÔNG TIN ĐẦU VÀO ===
- Khối lớp: 3
- Vùng phương ngữ: nam

=== BAREM CHẤM ĐIỂM (thang 10) ===

[A] CHÍNH TẢ & NGỮ PHÁP — Tối đa 4.0đ
Điểm khởi đầu: 4.0đ, trừ dần theo lỗi. Điểm sàn: 0đ.
Lớp 1–3: trừ 0.5đ / lỗi khác nhau. Lỗi lặp chỉ trừ 1 lần.

[B] HÌNH THỨC — Tối đa 3.0đ
3.0đ: Chữ viết rõ ràng, đúng độ cao, khoảng cách đều
2.0đ: Tương đối rõ, một vài chỗ sai
1.0đ: Chữ khó đọc
0.0đ: Không thể đọc được

[C] NỘI DUNG & Ý TƯỞNG — Tối đa 2.0đ
[D] SÁNG TẠO — Tối đa 1.0đ (từ láy, so sánh, nhân hóa)

Xếp loại: ≥9.0 Xuất sắc | ≥7.0 Tốt | ≥5.0 Khá | ≥3.0 Trung bình | <3.0 Cần cố gắng

=== OUTPUT FORMAT (JSON only, no markdown) ===
{"original_text":"văn bản gốc AI nhận dạng từ ảnh","fixed_text":"văn bản đã sửa","corrections":[{"error":"từ sai","suggestion":"từ đúng","error_type":"phu_am_dau|van|dau_thanh|viet_hoa|bo_sot_them|dau_cau","reason":"lý do ngắn gọn"}],"score_breakdown":{"chinh_ta":{"raw":0.0,"max":4.0,"error_count":0,"deduction":0.0},"hinh_thuc":{"raw":0.0,"max":3.0,"note":""},"noi_dung":{"raw":0.0,"max":2.0,"note":""},"sang_tao":{"raw":0.0,"max":1.0,"note":""}},"score":"X.X/10","overall_rating":"...","feedback":"..."}`;

// ── Mô tả từng ảnh ──────────────────────────────────────────────────────────
const IMAGE_LABELS = {
  "img_01.png": "Bài chính tả 'Chiều trên quê hương' (vở ô ly)",
  "img_02.jpg": "Bài dự thi viết chữ đẹp 'Em yêu nhà em'",
  "img_03.png": "Bài chính tả 'Đất quê ta mênh mông' (vở ô ly)",
  "img_04.jpg": "Mẫu chữ lớp 1 viết tập vở ô ly",
  "img_05.jpg": "Bài dự thi viết chữ đẹp 'Dòng sông mặc áo'",
  "img_07.jpg": "Hướng dẫn viết vở ô ly (Hải Tiến)",
};

// ── Scan thư mục ảnh ─────────────────────────────────────────────────────────
const imgDir = join(__dir, "benchmark_images");
if (!existsSync(imgDir)) { console.error("❌ Thư mục benchmark_images/ không tồn tại"); process.exit(1); }

const imageFiles = readdirSync(imgDir)
  .filter((f) => [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase()))
  .sort();

if (imageFiles.length === 0) { console.error("❌ Không tìm thấy ảnh trong benchmark_images/"); process.exit(1); }

// ── Hàm gọi Gemini API (image mode) ─────────────────────────────────────────
async function callGeminiWithImage(imagePath) {
  const ext = extname(imagePath).toLowerCase();
  const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
  const mimeType = mimeMap[ext] || "image/jpeg";

  const imageBuffer = readFileSync(imagePath);
  const base64Data = imageBuffer.toString("base64");
  const fileSizeKB = (imageBuffer.length / 1024).toFixed(1);

  const parts = [
    { text: GRADING_PROMPT },
    { inline_data: { mime_type: mimeType, data: base64Data } },
  ];

  const startTime = Date.now();
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    }),
  });
  const latencyMs = Date.now() - startTime;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokenCount = data.usageMetadata?.totalTokenCount || 0;

  let parsed = null;
  let jsonOk = false;
  try {
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
    jsonOk = true;
  } catch (_) {
    jsonOk = false;
  }

  return { latencyMs, tokenCount, jsonOk, parsed, rawText, fileSizeKB, mimeType };
}

// ── Delay ────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main benchmark ───────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — BENCHMARK GEMINI API (IMAGE MODE - ẢNH THẬT)");
  console.log(`  Model: ${GEMINI_MODEL}`);
  console.log(`  Số ảnh: ${imageFiles.length} | Thời gian: ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const results = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const imagePath = join(imgDir, file);
    const label = IMAGE_LABELS[file] || file;

    process.stdout.write(`[${String(i+1).padStart(2,"0")}/${imageFiles.length}] ${label.padEnd(50)} → `);

    try {
      const { latencyMs, tokenCount, jsonOk, parsed, fileSizeKB } = await callGeminiWithImage(imagePath);
      const score = parsed?.score || "N/A";
      const rating = parsed?.overall_rating || "N/A";
      const errorCount = parsed?.corrections?.length ?? "?";
      const ocrPreview = (parsed?.original_text || "").slice(0, 60).replace(/\n/g, " ");

      console.log(
        `✅ ${(latencyMs/1000).toFixed(2)}s | ${String(tokenCount).padStart(5)} tok | ${fileSizeKB}KB | JSON:${jsonOk?"✓":"✗"} | ${score} ${rating} | Lỗi:${errorCount}`
      );
      if (jsonOk) {
        console.log(`       OCR: "${ocrPreview}..."`);
      }

      results.push({
        id: i+1, file, label, latencyMs, tokenCount, jsonOk, score, rating, errorCount,
        fileSizeKB: parseFloat(fileSizeKB), ocrText: parsed?.original_text || "", success: true,
        breakdown: parsed?.score_breakdown || null,
      });
    } catch (err) {
      console.log(`❌ LỖI: ${err.message.slice(0, 100)}`);
      results.push({ id: i+1, file, label, latencyMs: null, success: false });
    }

    // Chờ giữa các request
    if (i < imageFiles.length - 1) await sleep(3000);
  }

  // ── Tổng hợp ──────────────────────────────────────────────────────────────
  const ok = results.filter((r) => r.success && r.latencyMs !== null);
  const failed = results.filter((r) => !r.success);
  const jsonBad = results.filter((r) => r.success && !r.jsonOk);

  const latencies = ok.map((r) => r.latencyMs);
  const tokens = ok.map((r) => r.tokenCount);

  const avg = (a) => a.reduce((s,v) => s+v, 0) / a.length;
  const min = (a) => Math.min(...a);
  const max = (a) => Math.max(...a);
  const median = (a) => {
    const s = [...a].sort((x,y) => x-y);
    const m = Math.floor(s.length/2);
    return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
  };
  const p90 = (a) => { const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length*0.9)]; };
  const stddev = (a) => { const m=avg(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length); };

  const u10 = latencies.filter((l)=>l<10000).length;
  const u20 = latencies.filter((l)=>l<20000).length;
  const u30 = latencies.filter((l)=>l<30000).length;
  const o30 = latencies.filter((l)=>l>=30000).length;

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  KẾT QUẢ BENCHMARK — CHẾ ĐỘ ẢNH THẬT");
  console.log("═══════════════════════════════════════════════════════════════════");

  console.log(`\n📊 TỶ LỆ THÀNH CÔNG:`);
  console.log(`   Tổng ảnh test        : ${results.length}`);
  console.log(`   API thành công       : ${ok.length}/${results.length} (${((ok.length/results.length)*100).toFixed(1)}%)`);
  console.log(`   Lỗi API             : ${failed.length}`);
  console.log(`   JSON parse thất bại  : ${jsonBad.length}`);

  if (latencies.length > 0) {
    console.log(`\n⏱️  THỜI GIAN PHẢN HỒI — IMAGE MODE (giây):`);
    console.log(`   Min      : ${(min(latencies)/1000).toFixed(2)}s`);
    console.log(`   Max      : ${(max(latencies)/1000).toFixed(2)}s`);
    console.log(`   Mean     : ${(avg(latencies)/1000).toFixed(2)}s`);
    console.log(`   Median   : ${(median(latencies)/1000).toFixed(2)}s`);
    console.log(`   P90      : ${(p90(latencies)/1000).toFixed(2)}s`);
    console.log(`   StdDev   : ${(stddev(latencies)/1000).toFixed(2)}s`);

    console.log(`\n📈 PHÂN PHỐI LATENCY:`);
    console.log(`   < 10s   : ${u10}/${ok.length} (${((u10/ok.length)*100).toFixed(1)}%)`);
    console.log(`   10–20s  : ${u20-u10}/${ok.length} (${(((u20-u10)/ok.length)*100).toFixed(1)}%)`);
    console.log(`   20–30s  : ${u30-u20}/${ok.length} (${(((u30-u20)/ok.length)*100).toFixed(1)}%)`);
    console.log(`   > 30s   : ${o30}/${ok.length} (${((o30/ok.length)*100).toFixed(1)}%)`);

    console.log(`\n🔢 TOKEN USAGE:`);
    console.log(`   TB/request : ${avg(tokens).toFixed(0)} tokens`);
    console.log(`   Min        : ${min(tokens)} tokens`);
    console.log(`   Max        : ${max(tokens)} tokens`);

    console.log(`\n📉 LATENCY BAR CHART:`);
    const maxBar = 40;
    const maxLat = max(latencies);
    const line30 = Math.round((30000/Math.max(maxLat,30000))*maxBar);
    for (const r of results) {
      if (!r.success) {
        console.log(`   [${String(r.id).padStart(2)}] ${"✗ ERROR".padEnd(maxBar+1)}`);
        continue;
      }
      const barLen = Math.round((r.latencyMs/Math.max(maxLat,30000))*maxBar);
      const bar = "█".repeat(barLen);
      const warn = r.latencyMs>=30000 ? " ⚠️ >30s" : "";
      console.log(`   [${String(r.id).padStart(2)}] ${bar.padEnd(maxBar)} ${(r.latencyMs/1000).toFixed(2)}s${warn}`);
    }
  }

  // ── So sánh với text mode ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SO SÁNH: TEXT MODE vs IMAGE MODE");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  (Text mode: benchmark trước đó với 15 mẫu văn bản)`);
  console.log(`  `);
  console.log(`  ┌──────────────────┬──────────────────┬──────────────────┐`);
  console.log(`  │ Chỉ số           │ Text Mode (15)   │ Image Mode (${ok.length})   │`);
  console.log(`  ├──────────────────┼──────────────────┼──────────────────┤`);
  if (latencies.length > 0) {
    console.log(`  │ Mean             │ 11.30s           │ ${(avg(latencies)/1000).toFixed(2).padStart(6)}s           │`);
    console.log(`  │ Median           │  8.27s           │ ${(median(latencies)/1000).toFixed(2).padStart(6)}s           │`);
    console.log(`  │ Min              │  6.11s           │ ${(min(latencies)/1000).toFixed(2).padStart(6)}s           │`);
    console.log(`  │ Max              │ 26.29s           │ ${(max(latencies)/1000).toFixed(2).padStart(6)}s           │`);
    console.log(`  │ JSON OK          │ 93.3%            │ ${(((ok.length-jsonBad.length)/ok.length)*100).toFixed(1).padStart(5)}%            │`);
    console.log(`  │ < 30s            │ 100.0%           │ ${((u30/ok.length)*100).toFixed(1).padStart(5)}%            │`);
  }
  console.log(`  └──────────────────┴──────────────────┴──────────────────┘`);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  KẾT LUẬN CHO BÁO CÁO");
  console.log("═══════════════════════════════════════════════════════════════════");
  if (latencies.length > 0) {
    console.log(`  ✔ Thời gian chấm TB (ảnh thật): ${(avg(latencies)/1000).toFixed(1)} giây/bài`);
    console.log(`  ✔ Nhanh nhất: ${(min(latencies)/1000).toFixed(1)}s | Chậm nhất: ${(max(latencies)/1000).toFixed(1)}s`);
    console.log(`  ✔ Tỷ lệ hoàn thành < 30s: ${((u30/ok.length)*100).toFixed(1)}%`);
    console.log(`  ✔ Tỷ lệ > 30s: ${((o30/ok.length)*100).toFixed(1)}%`);
    console.log(`  ✔ Tỷ lệ JSON hợp lệ: ${(((ok.length-jsonBad.length)/ok.length)*100).toFixed(1)}%`);
  }
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
