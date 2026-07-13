// benchmark_thuc_te_76.mjs
// Benchmark Gemini API với ẢNH THẬT 76 ảnh viết tay thực tế (chụp tại trường)
// Test TOÀN BỘ ảnh trong folder (thực tế: 49 ảnh)
// Chạy: node 02_Kich_ban_Thuc_nghiem\benchmark_thuc_te_76.mjs

import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// Đọc API keys từ .env.local
const envPath = join(__dir, "..", ".env.local");
const envRaw  = readFileSync(envPath, "utf-8");
const keysRaw = envRaw.match(/GEMINI_API_KEYS=(.+)/)?.[1]?.trim() || "";
const API_KEYS = keysRaw.split(",").map(k => k.trim()).filter(k => k.length > 10);
if (API_KEYS.length === 0) {
  console.error("❌ Không tìm thấy GEMINI_API_KEYS trong .env.local");
  process.exit(1);
}

// === CẤU HÌNH ===
const GEMINI_MODEL   = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const DELAY_MS       = 3000; // Nghỉ giữa mỗi request

// Thư mục ảnh thực tế
const IMG_DIR = join(__dir, "Ảnh viết tay 76 thực tế");
if (!existsSync(IMG_DIR)) {
  console.error(`❌ Không tìm thấy thư mục: ${IMG_DIR}`);
  process.exit(1);
}

// Lấy toàn bộ ảnh, sắp xếp theo tên
const allImages = readdirSync(IMG_DIR)
  .filter(f => [".jpg",".jpeg",".png",".webp",".JPG",".JPEG",".PNG"].includes(extname(f)))
  .sort();

if (allImages.length === 0) {
  console.error("❌ Không có ảnh trong thư mục");
  process.exit(1);
}

// ============================================================
// PROMPT chấm điểm (đồng bộ với route.ts)
// ============================================================
const GRADING_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên chấm bài chính tả. Phân tích đoạn văn của học sinh được cung cấp, sửa lỗi chính tả và chấm điểm theo barem chuẩn. Trả về duy nhất định dạng JSON.
=== BAREM (thang 10) ===
[A] CHÍNH TẢ & NGỮ PHÁP — 4.0đ max. Lớp 1–3: trừ 0.5đ/lỗi. Lỗi lặp chỉ trừ 1 lần.
[B] HÌNH THỨC — 3.0đ max
[C] NỘI DUNG — 2.0đ max
[D] SÁNG TẠO — 1.0đ max
Xếp loại: ≥9.0 Xuất sắc | ≥7.0 Tốt | ≥5.0 Khá | ≥3.0 Trung bình | <3.0 Cần cố gắng
=== OUTPUT (JSON only, no markdown) ===
{"original_text":"...","fixed_text":"...","corrections":[{"error":"...","suggestion":"...","error_type":"phu_am_dau|van|dau_thanh|viet_hoa|bo_sot_them","reason":"..."}],"score_breakdown":{"chinh_ta":{"raw":0,"max":4,"error_count":0,"deduction":0},"hinh_thuc":{"raw":0,"max":3,"note":""},"noi_dung":{"raw":0,"max":2,"note":""},"sang_tao":{"raw":0,"max":1,"note":""}},"score":"X.X/10","overall_rating":"...","feedback":"..."}`;

// ============================================================
// Key rotation
// ============================================================
let keyIdx = Math.floor(Math.random() * API_KEYS.length);
function getNextKey() {
  const key = API_KEYS[keyIdx % API_KEYS.length];
  keyIdx++;
  return key;
}

// ============================================================
// Gọi Gemini với retry + key rotation
// ============================================================
async function callGemini(imagePath, retries = API_KEYS.length + 1) {
  const ext    = extname(imagePath).toLowerCase();
  const mime   = { ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp" }[ext] || "image/jpeg";
  const buf    = readFileSync(imagePath);
  const b64    = buf.toString("base64");
  const sizeKB = (buf.length / 1024).toFixed(1);

  for (let attempt = 0; attempt < retries; attempt++) {
    const apiKey = getNextKey();
    const start  = Date.now();
    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: GRADING_PROMPT },
              { inline_data: { mime_type: mime, data: b64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      });

      const latencyMs = Date.now() - start;

      if (res.status === 429 || res.status === 503) {
        console.warn(`    ⚠️  Key[${(keyIdx-1)%API_KEYS.length}] lỗi ${res.status} → chuyển key (${attempt+1}/${retries})...`);
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);

      const data   = await res.json();
      const raw    = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const tokens = data.usageMetadata?.totalTokenCount || 0;

      let parsed = null, jsonOk = false;
      try {
        parsed = JSON.parse(
          raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim()
        );
        jsonOk = true;
      } catch(_) {}

      return { latencyMs, tokens, jsonOk, parsed, sizeKB };
    } catch (err) {
      if (attempt === retries - 1) throw err;
      console.warn(`    ⚠️  ${err.message.slice(0, 70)} → thử lại (${attempt+1}/${retries})...`);
      await sleep(1500);
    }
  }
  throw new Error("Hết lượt thử");
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Lấy index của lần chạy từ command line (mặc định là "")
const runIndex = process.argv[2] || "";
const outFile = join(__dir, `benchmark_thuc_te_results${runIndex}.json`);

// ============================================================
// Main
// ============================================================
async function main() {
  const estimatedMinutes = Math.ceil(allImages.length * 3 * (5 + DELAY_MS/1000) / 60);

  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(`  VIHAND GRADE — BENCHMARK ẢNH THỰC TẾ (49 MẪU) - CHẠY 3 LẦN SO SÁNH`);
  console.log(`  Model   : ${GEMINI_MODEL}`);
  console.log(`  Keys    : ${API_KEYS.length} keys`);
  console.log(`  Ảnh     : ${allImages.length} ảnh (mỗi ảnh chạy 3 lần)`);
  console.log(`  Dự kiến : ~${estimatedMinutes} phút`);
  console.log(`  Bắt đầu : ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  const results = [];
  const startTotal = Date.now();

  for (let i = 0; i < allImages.length; i++) {
    const f     = allImages[i];
    const label = `D${String(i+1).padStart(2,"0")}`;
    const fname = f.slice(0, 38).padEnd(38);
    console.log(`[${String(i+1).padStart(2)}/${allImages.length}] ${label} ${fname}`);

    const runsData = [];
    try {
      for (let pass = 1; pass <= 3; pass++) {
        process.stdout.write(`    Lần ${pass} → `);
        const { latencyMs, tokens, jsonOk, parsed, sizeKB } = await callGemini(join(IMG_DIR, f));

        const score         = parsed?.score || "N/A";
        const errCount      = parsed?.corrections?.length ?? 0;
        const original_text = parsed?.original_text || "";
        const fixed_text    = parsed?.fixed_text || "";
        const ocr_preview   = original_text.slice(0, 40).replace(/\n/g, " ");

        const icon = jsonOk ? "✅" : "⚠️ ";
        console.log(`${icon} ${(latencyMs/1000).toFixed(2)}s | ${String(score).padStart(6)} | Lỗi:${String(errCount).padEnd(2)} | OCR: "${ocr_preview}..." (${original_text.length} ký tự)`);

        runsData.push({
          latencyMs, tokens, jsonOk, score,
          errCount, original_text, fixed_text,
          sizeKB: parseFloat(sizeKB)
        });

        if (pass < 3) await sleep(DELAY_MS);
      }

      // So sánh 3 lần chạy
      const ocr1 = runsData[0].original_text;
      const ocr2 = runsData[1].original_text;
      const ocr3 = runsData[2].original_text;
      const ocrMatch = (ocr1 === ocr2 && ocr2 === ocr3);

      const fix1 = runsData[0].fixed_text;
      const fix2 = runsData[1].fixed_text;
      const fix3 = runsData[2].fixed_text;
      const fixMatch = (fix1 === fix2 && fix2 === fix3);

      const scoreMatch = (runsData[0].score === runsData[1].score && runsData[1].score === runsData[2].score);

      console.log(`    → Đồng nhất 3 lần: OCR [${ocrMatch?"CÓ":"KHÔNG"}] | Sửa lỗi [${fixMatch?"CÓ":"KHÔNG"}] | Điểm [${scoreMatch?"CÓ":"KHÔNG"}]\n`);

      results.push({
        id: i + 1, file: f, label,
        ocrMatch, fixMatch, scoreMatch,
        runs: runsData,
        success: true,
      });

    } catch (err) {
      console.log(`❌ LỖI: ${err.message.slice(0, 80)}\n`);
      results.push({ id: i+1, file: f, label, success: false, runs: [] });
    }

    if (i < allImages.length - 1) await sleep(DELAY_MS);
  }

  const totalElapsed = ((Date.now() - startTotal) / 1000 / 60).toFixed(1);

  // ============================================================
  // THỐNG KÊ TỔNG HỢP
  // ============================================================
  const ok = results.filter(r => r.success);
  let totalOcrMatch = 0;
  let totalFixMatch = 0;
  let totalScoreMatch = 0;

  for (const r of ok) {
    if (r.ocrMatch) totalOcrMatch++;
    if (r.fixMatch) totalFixMatch++;
    if (r.scoreMatch) totalScoreMatch++;
  }

  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("  TỔNG KẾT — ĐỘ ĐỒNG NHẤT (3 LẦN CHẠY)");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(`  Tổng ảnh test    : ${ok.length}/${results.length}`);
  console.log(`  OCR giống hệt 3L : ${totalOcrMatch}/${ok.length} (${(totalOcrMatch/ok.length*100).toFixed(1)}%)`);
  console.log(`  Sửa lỗi giống 3L : ${totalFixMatch}/${ok.length} (${(totalFixMatch/ok.length*100).toFixed(1)}%)`);
  console.log(`  Điểm số giống 3L : ${totalScoreMatch}/${ok.length} (${(totalScoreMatch/ok.length*100).toFixed(1)}%)`);
  console.log(`  Tổng thời gian   : ${totalElapsed} phút`);

  // Lưu kết quả
  const summary = {
    model: GEMINI_MODEL,
    date: new Date().toISOString(),
    totalImages: allImages.length,
    totalTimeMinutes: totalElapsed,
    consistency: {
      ocrMatchCount: totalOcrMatch,
      ocrMatchRate: (totalOcrMatch/ok.length*100).toFixed(1) + "%",
      fixMatchCount: totalFixMatch,
      fixMatchRate: (totalFixMatch/ok.length*100).toFixed(1) + "%",
      scoreMatchCount: totalScoreMatch,
      scoreMatchRate: (totalScoreMatch/ok.length*100).toFixed(1) + "%",
    },
    results,
  };

  writeFileSync(outFile, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`\n  📄 Kết quả đầy đủ lưu tại: ${outFile}`);
  console.log(`  ⏰ Kết thúc: ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
