// benchmark_error_images.mjs
// Benchmark Gemini API với ẢNH THẬT chữ viết tay học sinh CÓ LỖI CHÍNH TẢ
// Chạy: node benchmark_error_images.mjs

import { readFileSync, readdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(join(__dir, ".env.local"), "utf-8");
const GEMINI_API_KEY = envRaw.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!GEMINI_API_KEY) { console.error("❌ Missing GEMINI_API_KEY"); process.exit(1); }

const GEMINI_MODEL = "gemini-3-flash-preview";
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

const LABELS = {
  "err_01.jpg": "Vở TV lớp 1 – lỗi âm đầu/vần",
  "err_02.jpg": "Bài thơ 'Gió từ tay mẹ' – sai âm đầu",
  "err_04.jpg": "Thiệp 'con thít mẹ' – sai phụ âm cuối",
  "err_05.jpg": "Thiệp 'con quẻ mẹ' – sai âm đầu & dấu",
  "err_06.jpg": "Thiệp 'con chúp mẹ' – sai phụ âm cuối",
  "err_07.jpg": "Bài tập viết vần – sai phụ âm cuối",
};

const imgDir = join(__dir, "benchmark_images_errors");
if (!existsSync(imgDir)) { console.error("❌ Thư mục benchmark_images_errors/ không tồn tại"); process.exit(1); }
const imageFiles = readdirSync(imgDir).filter(f => [".jpg",".jpeg",".png",".webp"].includes(extname(f).toLowerCase())).sort();
if (imageFiles.length === 0) { console.error("❌ Không tìm thấy ảnh"); process.exit(1); }

async function callGemini(imagePath) {
  const ext = extname(imagePath).toLowerCase();
  const mime = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp" }[ext] || "image/jpeg";
  const buf = readFileSync(imagePath);
  const b64 = buf.toString("base64");
  const sizeKB = (buf.length/1024).toFixed(1);

  const start = Date.now();
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      contents: [{role:"user", parts:[{text:GRADING_PROMPT},{inline_data:{mime_type:mime,data:b64}}]}],
      generationConfig: { temperature:0.1, topP:0.95, topK:40, maxOutputTokens:8192 },
    }),
  });
  const latencyMs = Date.now() - start;
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0,200)}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokens = data.usageMetadata?.totalTokenCount || 0;
  let parsed = null, jsonOk = false;
  try { parsed = JSON.parse(raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim()); jsonOk = true; } catch(_) {}
  return { latencyMs, tokens, jsonOk, parsed, sizeKB };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — BENCHMARK ẢNH THẬT CÓ LỖI CHÍNH TẢ");
  console.log(`  Model: ${GEMINI_MODEL} | Ảnh: ${imageFiles.length}`);
  console.log(`  Thời gian: ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const results = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const f = imageFiles[i];
    const label = LABELS[f] || f;
    process.stdout.write(`[${i+1}/${imageFiles.length}] ${label.padEnd(48)} → `);
    try {
      const { latencyMs, tokens, jsonOk, parsed, sizeKB } = await callGemini(join(imgDir, f));
      const score = parsed?.score || "N/A";
      const rating = parsed?.overall_rating || "N/A";
      const errCount = parsed?.corrections?.length ?? "?";
      const ocr = (parsed?.original_text || "").slice(0,55).replace(/\n/g," ");
      console.log(`✅ ${(latencyMs/1000).toFixed(2)}s | ${String(tokens).padStart(5)} tok | ${sizeKB}KB | JSON:${jsonOk?"✓":"✗"} | ${score} ${rating} | Lỗi:${errCount}`);
      if (jsonOk) console.log(`       OCR: "${ocr}..."`);
      if (jsonOk && parsed?.corrections?.length > 0) {
        const top3 = parsed.corrections.slice(0,3);
        for (const c of top3) console.log(`       ❌ "${c.error}" → "${c.suggestion}" (${c.error_type || "?"}: ${c.reason || ""})`);
        if (parsed.corrections.length > 3) console.log(`       ... và ${parsed.corrections.length - 3} lỗi nữa`);
      }
      results.push({id:i+1,f,label,latencyMs,tokens,jsonOk,score,rating,errCount,sizeKB:parseFloat(sizeKB),success:true,corrections:parsed?.corrections||[]});
    } catch (err) {
      console.log(`❌ LỖI: ${err.message.slice(0,100)}`);
      results.push({id:i+1,f,label,latencyMs:null,success:false});
    }
    if (i < imageFiles.length - 1) await sleep(3000);
  }

  // Stats
  const ok = results.filter(r => r.success && r.latencyMs);
  const lats = ok.map(r => r.latencyMs);
  const avg = a => a.reduce((s,v)=>s+v,0)/a.length;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  KẾT QUẢ TỔNG HỢP");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Thành công      : ${ok.length}/${results.length}`);
  console.log(`  JSON hợp lệ     : ${ok.filter(r=>r.jsonOk).length}/${ok.length}`);
  if (lats.length) {
    console.log(`  Min latency     : ${(Math.min(...lats)/1000).toFixed(2)}s`);
    console.log(`  Max latency     : ${(Math.max(...lats)/1000).toFixed(2)}s`);
    console.log(`  Mean latency    : ${(avg(lats)/1000).toFixed(2)}s`);
    console.log(`  < 30s           : ${lats.filter(l=>l<30000).length}/${lats.length} (${((lats.filter(l=>l<30000).length/lats.length)*100).toFixed(1)}%)`);
    console.log(`  > 30s           : ${lats.filter(l=>l>=30000).length}/${lats.length}`);
  }
  // Error detection summary
  const withErrors = ok.filter(r => r.jsonOk && r.errCount > 0);
  console.log(`\n  🔍 PHÁT HIỆN LỖI CHÍNH TẢ:`);
  console.log(`  Ảnh có lỗi phát hiện: ${withErrors.length}/${ok.filter(r=>r.jsonOk).length}`);
  const totalErrs = withErrors.reduce((s,r) => s + r.errCount, 0);
  console.log(`  Tổng lỗi phát hiện  : ${totalErrs}`);
  if (withErrors.length) console.log(`  TB lỗi/ảnh          : ${(totalErrs/withErrors.length).toFixed(1)}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
