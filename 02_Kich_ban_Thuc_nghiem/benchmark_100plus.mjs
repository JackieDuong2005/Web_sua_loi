// benchmark_100plus.mjs
// Benchmark Gemini API với ẢNH THẬT chữ viết tay học sinh tiểu học (nguồn Internet/CamScanner)
// Chọn random 50 ảnh từ tổng số 104+ ảnh trong folder
// Chạy: node 02_Kich_ban_Thuc_nghiem\benchmark_100plus.mjs

import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// Đọc API keys từ .env.local
const envPath = join(__dir, "..", ".env.local");
const envRaw = readFileSync(envPath, "utf-8");
const keysRaw = envRaw.match(/GEMINI_API_KEYS=(.+)/)?.[1]?.trim() || "";
const API_KEYS = keysRaw.split(",").map(k => k.trim()).filter(k => k.length > 10);
if (API_KEYS.length === 0) {
  console.error("❌ Không tìm thấy GEMINI_API_KEYS trong .env.local");
  process.exit(1);
}

// === CẤU HÌNH ===
const GEMINI_MODEL   = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const SAMPLE_SIZE    = 50;     // Số ảnh random cần test
const DELAY_MS       = 3000;   // Nghỉ giữa mỗi request (tránh Rate Limit)
const SEED           = Date.now(); // Seed random (ghi lại để tái hiện nếu cần)

// Thư mục ảnh
const IMG_DIR = join(__dir, "chữ viết tay 100+");
if (!existsSync(IMG_DIR)) {
  console.error(`❌ Không tìm thấy thư mục: ${IMG_DIR}`);
  process.exit(1);
}

// Lấy tất cả ảnh hợp lệ
const allImages = readdirSync(IMG_DIR)
  .filter(f => [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG"].includes(extname(f)))
  .sort();

if (allImages.length === 0) {
  console.error("❌ Không có ảnh trong thư mục");
  process.exit(1);
}

// Fisher-Yates shuffle (deterministic với seed đơn giản)
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Random 50 ảnh
const selectedImages = shuffleArray(allImages).slice(0, Math.min(SAMPLE_SIZE, allImages.length));

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
  const ext  = extname(imagePath).toLowerCase();
  const mime = { ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp" }[ext] || "image/jpeg";
  const buf  = readFileSync(imagePath);
  const b64  = buf.toString("base64");
  const sizeKB = (buf.length / 1024).toFixed(1);

  for (let attempt = 0; attempt < retries; attempt++) {
    const apiKey = getNextKey();
    const start = Date.now();
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
        console.warn(`    ⚠️  Key[${(keyIdx-1)%API_KEYS.length}] lỗi ${res.status} → chuyển key...`);
        await sleep(1000 * (attempt + 1)); // backoff
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

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — BENCHMARK ẢNH HỌC SINH TIỂU HỌC (INTERNET 100+)");
  console.log(`  Model : ${GEMINI_MODEL}`);
  console.log(`  Keys  : ${API_KEYS.length} keys | Tổng ảnh: ${allImages.length} | Chọn random: ${selectedImages.length}`);
  console.log(`  Seed  : ${SEED}`);
  console.log(`  Bắt đầu: ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  // Ghi lại danh sách ảnh được chọn để tái hiện sau
  console.log("📋 Danh sách 50 ảnh được chọn ngẫu nhiên:");
  selectedImages.forEach((f, i) => console.log(`   [${String(i+1).padStart(2,"0")}] ${f}`));
  console.log("");

  const results = [];

  for (let i = 0; i < selectedImages.length; i++) {
    const f     = selectedImages[i];
    const label = `C${String(i+1).padStart(2,"0")}`;
    process.stdout.write(`[${i+1}/${selectedImages.length}] ${label} ${f.slice(0, 38).padEnd(38)} → `);

    try {
      const { latencyMs, tokens, jsonOk, parsed, sizeKB } = await callGemini(join(IMG_DIR, f));

      const score    = parsed?.score || "N/A";
      const rating   = parsed?.overall_rating || "N/A";
      const errCount = parsed?.corrections?.length ?? 0;
      const ocr      = (parsed?.original_text || "").slice(0, 50).replace(/\n/g, " ");

      console.log(`${jsonOk?"✅":"⚠️ "} ${(latencyMs/1000).toFixed(2)}s | ${String(tokens).padStart(5)} tok | ${String(sizeKB).padStart(7)}KB | JSON:${jsonOk?"✓":"✗"} | ${String(score).padStart(8)} | Lỗi:${errCount}`);
      if (jsonOk && ocr) console.log(`    OCR: "${ocr}..."`);

      // Hiển thị top lỗi
      if (jsonOk && errCount > 0) {
        for (const c of (parsed.corrections || []).slice(0, 2)) {
          console.log(`    ✏️  "${c.error}" → "${c.suggestion}" [${c.error_type}]`);
        }
        if (errCount > 2) console.log(`    ... và ${errCount - 2} lỗi nữa`);
      }

      results.push({
        id: i + 1, file: f, label,
        latencyMs, tokens, jsonOk, score, rating,
        errCount, sizeKB: parseFloat(sizeKB),
        corrections: parsed?.corrections || [],
        success: true,
      });
    } catch (err) {
      console.log(`❌ LỖI: ${err.message.slice(0, 80)}`);
      results.push({ id: i+1, file: f, label, success: false, latencyMs: null, tokens: 0, jsonOk: false, errCount: 0, sizeKB: 0, corrections: [] });
    }

    if (i < selectedImages.length - 1) await sleep(DELAY_MS);
  }

  // ============================================================
  // THỐNG KÊ TỔNG HỢP
  // ============================================================
  const ok        = results.filter(r => r.success);
  const jsonOkArr = ok.filter(r => r.jsonOk);
  const lats      = ok.filter(r => r.latencyMs).map(r => r.latencyMs);
  const tokens    = jsonOkArr.map(r => r.tokens);
  const avg       = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const sd        = a => { if (!a.length) return 0; const m = avg(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length); };

  // Thống kê điểm
  const scores = jsonOkArr.map(r => parseFloat(r.score)).filter(s => !isNaN(s));
  const avgScore = avg(scores);

  // Phân phối latency
  const lt10  = lats.filter(l => l < 10000).length;
  const lt20  = lats.filter(l => l >= 10000 && l < 20000).length;
  const lt30  = lats.filter(l => l >= 20000 && l < 30000).length;
  const gt30  = lats.filter(l => l >= 30000).length;

  // Phân loại lỗi chính tả
  const errTypes = { phu_am_dau: 0, van: 0, dau_thanh: 0, viet_hoa: 0, bo_sot_them: 0, other: 0 };
  let totalErrors = 0;
  for (const r of jsonOkArr) {
    for (const c of r.corrections) {
      totalErrors++;
      const t = c.error_type || "other";
      if (t in errTypes) errTypes[t]++;
      else errTypes.other++;
    }
  }

  // Phân phối xếp loại
  const ratings = {};
  for (const r of jsonOkArr) {
    const rt = r.rating || "N/A";
    ratings[rt] = (ratings[rt] || 0) + 1;
  }

  // Ảnh có/không có lỗi
  const withErrors    = jsonOkArr.filter(r => r.errCount > 0);
  const withoutErrors = jsonOkArr.filter(r => r.errCount === 0);

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("  TỔNG KẾT KẾT QUẢ");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(`\n  📊 TỶ LỆ THÀNH CÔNG:`);
  console.log(`  Tổng ảnh đã test   : ${results.length}`);
  console.log(`  Thành công         : ${ok.length}/${results.length} (${(ok.length/results.length*100).toFixed(1)}%)`);
  console.log(`  JSON hợp lệ        : ${jsonOkArr.length}/${ok.length} (${ok.length?(jsonOkArr.length/ok.length*100).toFixed(1):0}%)`);

  if (lats.length) {
    console.log(`\n  ⏱️  LATENCY:`);
    console.log(`  Min                : ${(Math.min(...lats)/1000).toFixed(2)}s`);
    console.log(`  Max                : ${(Math.max(...lats)/1000).toFixed(2)}s`);
    console.log(`  Mean               : ${(avg(lats)/1000).toFixed(2)}s`);
    console.log(`  Độ lệch chuẩn (SD) : ${(sd(lats)/1000).toFixed(2)}s`);
    console.log(`  Phân phối:`);
    console.log(`    < 10s            : ${lt10} (${(lt10/lats.length*100).toFixed(1)}%)`);
    console.log(`    10–20s           : ${lt20} (${(lt20/lats.length*100).toFixed(1)}%)`);
    console.log(`    20–30s           : ${lt30} (${(lt30/lats.length*100).toFixed(1)}%)`);
    console.log(`    > 30s            : ${gt30} (${(gt30/lats.length*100).toFixed(1)}%)`);
  }

  if (tokens.length) {
    console.log(`\n  🔤 TOKEN:`);
    console.log(`  TB/request         : ${Math.round(avg(tokens))}`);
    console.log(`  Min                : ${Math.min(...tokens)}`);
    console.log(`  Max                : ${Math.max(...tokens)}`);
  }

  if (scores.length) {
    console.log(`\n  🎯 ĐIỂM SỐ:`);
    console.log(`  Điểm TB            : ${avgScore.toFixed(2)}/10`);
    console.log(`  Cao nhất           : ${Math.max(...scores).toFixed(1)}/10`);
    console.log(`  Thấp nhất          : ${Math.min(...scores).toFixed(1)}/10`);
    console.log(`  Phân loại xếp loại:`);
    for (const [rt, cnt] of Object.entries(ratings).sort((a,b)=>b[1]-a[1])) {
      console.log(`    ${rt.padEnd(20)}: ${cnt} (${(cnt/jsonOkArr.length*100).toFixed(1)}%)`);
    }
  }

  console.log(`\n  🔍 LỖI CHÍNH TẢ:`);
  console.log(`  Ảnh có lỗi         : ${withErrors.length}/${jsonOkArr.length} (${jsonOkArr.length?(withErrors.length/jsonOkArr.length*100).toFixed(1):0}%)`);
  console.log(`  Ảnh không lỗi      : ${withoutErrors.length}/${jsonOkArr.length}`);
  console.log(`  Tổng lỗi phát hiện : ${totalErrors}`);
  if (withErrors.length) console.log(`  TB lỗi/ảnh có lỗi  : ${(totalErrors/withErrors.length).toFixed(1)}`);
  console.log(`  Phân loại lỗi:`);
  const typeLabels = {
    phu_am_dau: "Phụ âm đầu   (ch/tr, s/x, d/gi)",
    van:        "Vần           (an/ang, iê/yê)",
    dau_thanh:  "Dấu thanh     (hỏi/ngã)",
    viet_hoa:   "Viết hoa      (đầu câu, tên riêng)",
    bo_sot_them:"Bỏ sót/thêm  (thiếu/thừa chữ)",
    other:      "Khác",
  };
  for (const [t, cnt] of Object.entries(errTypes)) {
    if (cnt > 0) console.log(`    ${typeLabels[t].padEnd(38)}: ${cnt} (${totalErrors?(cnt/totalErrors*100).toFixed(1):0}%)`);
  }

  // ============================================================
  // Lưu kết quả
  // ============================================================
  const summary = {
    model: GEMINI_MODEL,
    date: new Date().toISOString(),
    seed: SEED,
    totalImagesInFolder: allImages.length,
    sampleSize: selectedImages.length,
    selectedFiles: selectedImages,
    stats: {
      success: ok.length,
      jsonOk: jsonOkArr.length,
      latency: lats.length ? {
        min: (Math.min(...lats)/1000).toFixed(2),
        max: (Math.max(...lats)/1000).toFixed(2),
        mean: (avg(lats)/1000).toFixed(2),
        sd: (sd(lats)/1000).toFixed(2),
        lt10, lt20, lt30, gt30,
      } : null,
      avgScore: avgScore.toFixed(2),
      totalErrors,
      errTypes,
      withErrors: withErrors.length,
      withoutErrors: withoutErrors.length,
    },
    results,
  };

  const outFile = join(__dir, "benchmark_100plus_results.json");
  writeFileSync(outFile, JSON.stringify(summary, null, 2), "utf-8");
  console.log(`\n  📄 Kết quả đầy đủ lưu tại: benchmark_100plus_results.json`);
  console.log(`  ⏰ Kết thúc: ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
