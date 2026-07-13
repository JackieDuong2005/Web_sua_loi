// benchmark_dung_chinh_ta.mjs
// Benchmark Gemini API với 10 ảnh chữ viết tay ô ly tự tạo ĐÚNG chính tả
// Mục tiêu: kiểm tra False Positive — AI có báo lỗi oan không?
// Chạy: node benchmark_dung_chinh_ta.mjs

import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// Đọc API keys từ .env.local (hỗ trợ GEMINI_API_KEYS nhiều key)
const envPath = join(__dir, "..", ".env.local");
const envRaw = readFileSync(envPath, "utf-8");
const keysRaw = envRaw.match(/GEMINI_API_KEYS=(.+)/)?.[1]?.trim() || "";
const API_KEYS = keysRaw.split(",").map(k => k.trim()).filter(k => k.length > 10);
if (API_KEYS.length === 0) { console.error("❌ Missing GEMINI_API_KEYS in .env.local"); process.exit(1); }

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GRADING_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên chấm bài chính tả. Phân tích đoạn văn của học sinh được cung cấp, sửa lỗi chính tả và chấm điểm theo barem chuẩn. Trả về duy nhất định dạng JSON.
=== BAREM (thang 10) ===
[A] CHÍNH TẢ & NGỮ PHÁP — 4.0đ max. Lớp 1–3: trừ 0.5đ/lỗi. Lỗi lặp chỉ trừ 1 lần.
[B] HÌNH THỨC — 3.0đ max
[C] NỘI DUNG — 2.0đ max
[D] SÁNG TẠO — 1.0đ max
Xếp loại: ≥9.0 Xuất sắc | ≥7.0 Tốt | ≥5.0 Khá | ≥3.0 Trung bình | <3.0 Cần cố gắng
=== OUTPUT (JSON only, no markdown) ===
{"original_text":"...","fixed_text":"...","corrections":[{"error":"...","suggestion":"...","error_type":"phu_am_dau|van|dau_thanh|viet_hoa|bo_sot_them","reason":"..."}],"score_breakdown":{"chinh_ta":{"raw":0,"max":4,"error_count":0,"deduction":0},"hinh_thuc":{"raw":0,"max":3,"note":""},"noi_dung":{"raw":0,"max":2,"note":""},"sang_tao":{"raw":0,"max":1,"note":""}},"score":"X.X/10","overall_rating":"...","feedback":"..."}`;

// Thư mục ảnh
const IMG_DIR = join(__dir, "Chữ viết tay nền ô ly tự tạo đúng chính tả 10");
if (!existsSync(IMG_DIR)) { console.error(`❌ Không tìm thấy thư mục: ${IMG_DIR}`); process.exit(1); }

const imageFiles = readdirSync(IMG_DIR)
  .filter(f => [".jpg",".jpeg",".png",".webp",".JPG",".JPEG",".PNG"].includes(extname(f)))
  .sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return (isNaN(na) || isNaN(nb)) ? a.localeCompare(b) : na - nb;
  });

if (imageFiles.length === 0) { console.error("❌ Không có ảnh trong thư mục"); process.exit(1); }

// Key rotation
let keyIdx = 0;
function getNextKey() {
  const key = API_KEYS[keyIdx % API_KEYS.length];
  keyIdx++;
  return key;
}

async function callGemini(imagePath, retries = API_KEYS.length) {
  const ext = extname(imagePath).toLowerCase();
  const mime = { ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp" }[ext] || "image/jpeg";
  const buf = readFileSync(imagePath);
  const b64 = buf.toString("base64");
  const sizeKB = (buf.length / 1024).toFixed(1);

  for (let attempt = 0; attempt < retries; attempt++) {
    const apiKey = getNextKey();
    const start = Date.now();
    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: GRADING_PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
          generationConfig: { temperature: 0.1, topP: 0.95, topK: 40, maxOutputTokens: 8192, responseMimeType: "application/json" },
        }),
      });
      const latencyMs = Date.now() - start;

      if (res.status === 429 || res.status === 503) {
        console.warn(`    ⚠️  Key #${(keyIdx-1)%API_KEYS.length+1} lỗi ${res.status} → chuyển key...`);
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const tokens = data.usageMetadata?.totalTokenCount || 0;
      let parsed = null, jsonOk = false;
      try {
        parsed = JSON.parse(raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim());
        jsonOk = true;
      } catch(_) {}
      return { latencyMs, tokens, jsonOk, parsed, sizeKB };
    } catch(err) {
      if (attempt === retries - 1) throw err;
      console.warn(`    ⚠️  Lỗi: ${err.message.slice(0,80)} → thử lại...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error("Hết lượt thử");
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — BENCHMARK ẢNH Ô LY TỰ TẠO ĐÚNG CHÍNH TẢ");
  console.log(`  Model: ${GEMINI_MODEL} | Keys: ${API_KEYS.length} | Ảnh: ${imageFiles.length}`);
  console.log(`  Thời gian: ${new Date().toLocaleString("vi-VN")}`);
  console.log(`  Thư mục: ${IMG_DIR}`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const results = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const f = imageFiles[i];
    const label = `B${String(i+1).padStart(2,"0")} — ${f}`;
    process.stdout.write(`[${i+1}/${imageFiles.length}] ${label.padEnd(30)} → `);

    try {
      const { latencyMs, tokens, jsonOk, parsed, sizeKB } = await callGemini(join(IMG_DIR, f));
      const score = parsed?.score || "N/A";
      const rating = parsed?.overall_rating || "N/A";
      const errCount = parsed?.corrections?.length ?? 0;
      const ocr = (parsed?.original_text || "").slice(0, 60).replace(/\n/g, " ");

      console.log(`✅ ${(latencyMs/1000).toFixed(2)}s | ${String(tokens).padStart(5)} tok | ${sizeKB}KB | JSON:${jsonOk?"✓":"✗"} | ${score} ${rating} | Lỗi phát hiện: ${errCount}`);
      if (jsonOk) console.log(`    OCR: "${ocr}..."`);

      // Cảnh báo nếu AI báo lỗi (False Positive)
      if (jsonOk && errCount > 0) {
        console.log(`    ⚠️  FALSE POSITIVE: AI báo ${errCount} lỗi trên bài đúng chính tả!`);
        for (const c of (parsed?.corrections || []).slice(0, 3)) {
          console.log(`       ❌ "${c.error}" → "${c.suggestion}" (${c.error_type}: ${c.reason || ""})`);
        }
      }

      results.push({ id: i+1, file: f, latencyMs, tokens, jsonOk, score, rating, errCount, sizeKB: parseFloat(sizeKB), success: true });
    } catch (err) {
      console.log(`❌ LỖI: ${err.message.slice(0,100)}`);
      results.push({ id: i+1, file: f, success: false, latencyMs: null, tokens: 0, jsonOk: false, score:"N/A", rating:"N/A", errCount: 0, sizeKB: 0 });
    }

    if (i < imageFiles.length - 1) await sleep(3000);
  }

  // Thống kê
  const ok = results.filter(r => r.success);
  const jsonOk = ok.filter(r => r.jsonOk);
  const lats = ok.filter(r => r.latencyMs).map(r => r.latencyMs);
  const avg = a => a.reduce((s,v)=>s+v,0)/a.length;
  const falsePos = jsonOk.filter(r => r.errCount > 0);
  const tokenList = jsonOk.map(r => r.tokens);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  TỔNG KẾT");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  Thành công       : ${ok.length}/${results.length}`);
  console.log(`  JSON hợp lệ      : ${jsonOk.length}/${ok.length} (${ok.length?((jsonOk.length/ok.length)*100).toFixed(1):0}%)`);
  if (lats.length) {
    console.log(`  Min latency      : ${(Math.min(...lats)/1000).toFixed(2)}s`);
    console.log(`  Max latency      : ${(Math.max(...lats)/1000).toFixed(2)}s`);
    console.log(`  Mean latency     : ${(avg(lats)/1000).toFixed(2)}s`);
    console.log(`  < 30s            : ${lats.filter(l=>l<30000).length}/${lats.length} (${((lats.filter(l=>l<30000).length/lats.length)*100).toFixed(1)}%)`);
  }
  if (tokenList.length) {
    console.log(`  Token TB/request : ${Math.round(avg(tokenList))}`);
  }
  console.log(`\n  FALSE POSITIVE   : ${falsePos.length}/${jsonOk.length} (bài đúng nhưng AI báo lỗi)`);
  console.log(`  Điểm TB          : ${jsonOk.length ? (jsonOk.reduce((s,r)=>s+parseFloat(r.score||"0"),0)/jsonOk.length).toFixed(2) : "N/A"}/10`);

  // Bảng kết quả
  console.log("\n  BẢNG KẾT QUẢ CHI TIẾT:");
  console.log("  " + "─".repeat(80));
  console.log(`  ${"Mẫu".padEnd(6)} ${"File".padEnd(8)} ${"Latency".padStart(9)} ${"Tokens".padStart(7)} ${"JSON".padStart(5)} ${"Điểm".padStart(8)} ${"FP".padStart(3)}`);
  console.log("  " + "─".repeat(80));
  for (const r of results) {
    const lat = r.latencyMs ? `${(r.latencyMs/1000).toFixed(2)}s` : "❌";
    const fp = r.errCount > 0 ? `⚠${r.errCount}` : "0";
    console.log(`  ${"B"+String(r.id).padStart(2,"0")} ${r.file.padEnd(10)} ${lat.padStart(9)} ${String(r.tokens).padStart(7)} ${(r.jsonOk?"✓":"✗").padStart(5)} ${String(r.score).padStart(8)} ${fp.padStart(3)}`);
  }
  console.log("  " + "─".repeat(80));

  // Lưu kết quả JSON
  const outFile = join(__dir, "benchmark_dung_chinh_ta_results.json");
  writeFileSync(outFile, JSON.stringify({ model: GEMINI_MODEL, date: new Date().toISOString(), results }, null, 2));
  console.log(`\n  📄 Kết quả lưu tại: benchmark_dung_chinh_ta_results.json`);
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
