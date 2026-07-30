/**
 * benchmark_flashlite_deeptest.mjs
 * ============================================================
 * Test ky 2 model flash lite tren toan bo anh anhchuaxuly/
 * - Chi dung 1 API key duy nhat (key dau tien trong .env.local)
 * - Delay 10s giua moi request (tranh rate limit)
 * - 2 model: gemini-3.5-flash-lite va gemini-3.1-flash-lite
 * - Dung system prompt thuc te cua ViHand Grade
 * - Phat hien hallucination chi tiet
 *
 * Chay: node benchmark_flashlite_deeptest.mjs
 * ============================================================
 */

import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = join(__dir, "..", "..", "image_datasets", "anhchuaxuly");
const OUTPUT_MD  = join(__dir, "benchmark_flashlite_deeptest_results.md");
const OUTPUT_JSON = join(__dir, "benchmark_flashlite_deeptest_results.json");

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

// Chi dung 1 key, delay lon de tranh rate limit
const DELAY_MS = 10000; // 10 giay

// System prompt thuc te cua ViHand Grade
const SYSTEM_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên sửa bài chính tả. Phân tích đoạn văn của học sinh được cung cấp trong ảnh, nhận diện chữ viết và sửa lại cho đúng chính tả. Trả về duy nhất định dạng JSON.

=== QUY TẮC NHẬN DIỆN (original_text) ===
1. Ghi lại CHÍNH XÁC từng chữ viết tay — KHÔNG tự sửa lỗi, KHÔNG bịa thêm nội dung.
2. Nếu có chữ bị gạch bỏ hoặc lem mực không đọc được, BỎ QUA phần đó, chỉ lấy chữ người viết đã sửa.
3. Giữ nguyên cấu trúc xuống dòng:
   - Văn xuôi: nối các dòng thành đoạn văn, chỉ xuống dòng khi người viết thụt lề bắt đầu đoạn mới.
   - Thơ: giữ nguyên từng câu thơ riêng dòng.
4. Nếu đầu trang có chữ luyện viết rời rạc (VD: "oac, ngoắc..."), BỎ QUA, chỉ bắt đầu từ tiêu đề bài viết.

=== QUY TẮC SỬA LỖI (fixed_text) ===
- Sửa đúng chính tả tiếng Việt: dấu thanh, phụ âm đầu (c/k/q, g/gh, d/gi/r, s/x, ch/tr, l/n), vần.
- Viết hoa đầu câu và tên riêng đúng quy tắc.
- Giữ nguyên cấu trúc dòng, ý nghĩa và nội dung của học sinh.

=== ĐỊNH DẠNG OUTPUT (JSON duy nhất, không kèm markdown) ===
{
  "original_text": "văn bản gốc nhận diện được từ ảnh (chưa sửa)",
  "fixed_text": "văn bản đã được sửa hết lỗi chính tả và viết hoa đúng quy tắc"
}`;

function loadFirstKey() {
  const envPath = join(__dir, "..", "..", "..", ".env.local");
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, "utf-8");
    const m = env.match(/GEMINI_API_KEYS?=(.+)/);
    if (m) {
      const keys = m[1].trim().split(",").map(k => k.trim()).filter(k => k.length > 10);
      if (keys.length) {
        console.log(`  Key dang dung: ${keys[0].substring(0, 15)}...`);
        return keys[0]; // Chi lay key DAU TIEN
      }
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getMime(f) {
  const e = extname(f).toLowerCase();
  return e === ".png" ? "image/png" : e === ".webp" ? "image/webp" : "image/jpeg";
}

// Levenshtein similarity giua original_text va fixed_text
function similarity(a, b) {
  if (!a || !b) return 0;
  const ca = a.replace(/\s+/g," ").trim();
  const cb = b.replace(/\s+/g," ").trim();
  const m = ca.length, n = cb.length;
  if (!m || !n) return 0;
  const dp = Array.from({length: m+1}, () => new Uint16Array(n+1));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++)
    for (let j=1;j<=n;j++)
      dp[i][j] = ca[i-1]===cb[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return Math.round((1-dp[m][n]/Math.max(m,n))*10000)/100;
}

function analyzeHallucination(parsedOriginal, parsedFixed) {
  if (parsedOriginal === null) {
    return {
      score: 30,
      riskLevel: "JSON_LOI",
      flags: ["JSON_INVALID: Model khong tra ve JSON hop le"],
      wordCountOriginal: 0,
      wordCountFixed: 0,
      sim_orig_fixed: 0,
    };
  }

  const origWords = parsedOriginal.trim().split(/\s+/).filter(w=>w.length>0);
  const fixedWords = parsedFixed ? parsedFixed.trim().split(/\s+/).filter(w=>w.length>0) : [];
  const simOrigFixed = parsedFixed ? similarity(parsedOriginal, parsedFixed) : 100;
  const flags = [];
  let score = 0;

  // 1. Noi dung qua dai (>300 tu)
  if (origWords.length > 300) {
    flags.push(`CONTENT_INFLATION: ${origWords.length} tu (nghi ngo them noi dung)`);
    score += 30;
  } else if (origWords.length > 200) {
    flags.push(`CONTENT_LONG: ${origWords.length} tu (kha dai, can kiem tra)`);
    score += 10;
  }

  // 2. fixed_text them >30% so voi original_text
  if (fixedWords.length > 0 && origWords.length > 0) {
    const addedRatio = (fixedWords.length - origWords.length) / origWords.length;
    if (addedRatio > 0.3) {
      flags.push(`FIXED_DEVIATION: +${(addedRatio*100).toFixed(0)}% tu so voi original (them noi dung)`);
      score += 20;
    } else if (addedRatio > 0.15) {
      flags.push(`FIXED_EXPANSION: +${(addedRatio*100).toFixed(0)}% tu so voi original`);
      score += 5;
    }
  }

  // 3. Similarity giua original va fixed qua thap (<50%) -> model thay doi nhieu
  if (simOrigFixed < 50 && origWords.length > 10) {
    flags.push(`LOW_FIDELITY: Similarity original vs fixed chi ${simOrigFixed}% (model co the thay doi noi dung lon)`);
    score += 25;
  }

  // 4. Lap dong
  const lines = parsedOriginal.split("\n").filter(l=>l.trim().length>5);
  const lineSet = new Set(lines.map(l=>l.trim()));
  if (lines.length > 4 && lineSet.size < lines.length * 0.7) {
    flags.push(`REPETITION: ${lines.length - lineSet.size} dong lap lai`);
    score += 20;
  }

  // 5. Qua ngan (model tu choi)
  if (origWords.length < 3) {
    flags.push(`TOO_SHORT: Chi ${origWords.length} tu (co the model tu choi OCR)`);
    score += 15;
  }

  // Muc rui ro
  let riskLevel;
  if (score === 0) riskLevel = "✅ BINH_THUONG";
  else if (score <= 10) riskLevel = "🟡 RUI_RO_THAP";
  else if (score <= 30) riskLevel = "🟠 TRUNG_BINH";
  else riskLevel = "🔴 CAO — NGHI_NGO_BIA_DAT";

  return { score, riskLevel, flags, wordCountOriginal: origWords.length, wordCountFixed: fixedWords.length, sim_orig_fixed: simOrigFixed };
}

async function callGemini(client, model, base64, mimeType) {
  const t0 = Date.now();
  const response = await client.models.generateContent({
    model,
    contents: [
      { inlineData: { mimeType, data: base64 } },
      SYSTEM_PROMPT,
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.05,
      maxOutputTokens: 8192,  // Tang len de tranh JSON bi cat giua chung
    },
  });
  const latencyMs = Date.now() - t0;
  const rawText = (response.text ?? "").trim();
  const tokens = response.usageMetadata?.totalTokenCount || 0;

  let parsedOriginal = null, parsedFixed = null, parseError = null;
  try {
    const cleaned = rawText.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
    const obj = JSON.parse(cleaned);
    parsedOriginal = typeof obj.original_text === "string" ? obj.original_text : null;
    parsedFixed    = typeof obj.fixed_text   === "string" ? obj.fixed_text   : null;
  } catch(e) {
    parseError = e.message;
  }

  const hallucination = analyzeHallucination(parsedOriginal, parsedFixed);
  return { latencyMs, tokens, rawOutput: rawText, parsedOriginal, parsedFixed, parseError, hallucination };
}

async function main() {
  console.log("=================================================================");
  console.log("  DEEPTEST — 2 Flash Lite Models");
  console.log("  gemini-3.5-flash-lite vs gemini-3.1-flash-lite");
  console.log("  19 anh anhchuaxuly | 1 key | delay 10s | maxTokens 8192");
  console.log("=================================================================\n");

  const apiKey = loadFirstKey();
  if (!apiKey) { console.error("Khong tim thay API key!"); process.exit(1); }

  if (!existsSync(IMAGE_DIR)) { console.error("Khong tim thay thu muc anh:", IMAGE_DIR); process.exit(1); }

  const imageFiles = readdirSync(IMAGE_DIR)
    .filter(f => [".jpg",".jpeg",".png",".webp"].includes(extname(f).toLowerCase()))
    .sort();

  console.log(`  Dataset : ${IMAGE_DIR}`);
  console.log(`  So anh  : ${imageFiles.length}`);
  console.log(`  Models  : ${MODELS.join(" vs ")}\n`);
  console.log(`  Uoc luong thoi gian: ~${Math.ceil(imageFiles.length * MODELS.length * (DELAY_MS/1000 + 5) / 60)} phut\n`);

  const allResults = {};
  const client = new GoogleGenAI({ apiKey });
  let requestCount = 0;

  for (const model of MODELS) {
    allResults[model] = [];
    console.log(`\n${"=".repeat(65)}`);
    console.log(`  MODEL: ${model}`);
    console.log("=".repeat(65));

    for (let i = 0; i < imageFiles.length; i++) {
      const imgFile = imageFiles[i];
      const imgPath = join(IMAGE_DIR, imgFile);

      // Delay truoc moi request (tru request dau)
      if (requestCount > 0) {
        process.stdout.write(`  [${i+1}/${imageFiles.length}] Cho ${DELAY_MS/1000}s... `);
        await sleep(DELAY_MS);
        process.stdout.write("Go!\n");
      }
      requestCount++;

      console.log(`  [${i+1}/${imageFiles.length}] ${imgFile}`);

      let buf;
      try { buf = readFileSync(imgPath); }
      catch(e) {
        console.log(`    LOC DOC ANH: ${e.message}`);
        allResults[model].push({ image: imgFile, success: false, error: `Doc anh loi: ${e.message}`, latencyMs:0, tokens:0, parsedOriginal:null, parsedFixed:null, hallucination:{score:0,riskLevel:"—",flags:[],wordCountOriginal:0,wordCountFixed:0,sim_orig_fixed:0} });
        continue;
      }

      try {
        const result = await callGemini(client, model, buf.toString("base64"), getMime(imgFile));
        allResults[model].push({ image: imgFile, success: true, error: null, ...result });

        const jsonOk = result.parsedOriginal !== null;
        console.log(`    ${jsonOk ? "OK" : "JSON_FAIL"} | ${result.latencyMs}ms | ${result.tokens} tok | H-Score:${result.hallucination.score} | ${result.hallucination.riskLevel}`);
        if (result.hallucination.flags.length) result.hallucination.flags.forEach(f => console.log(`    ! ${f}`));
        if (result.parsedOriginal) {
          console.log(`    OCR: "${result.parsedOriginal.replace(/\n/g," ").substring(0,75)}"`);
        } else if (result.parseError) {
          console.log(`    JSON ERR: ${result.parseError}`);
          console.log(`    RAW (200c): ${result.rawOutput.substring(0,200)}`);
        }
      } catch(err) {
        const status = err?.status || 0;
        const msg = err?.message || String(err);
        console.log(`    API LOI [${status}]: ${msg.substring(0,120)}`);
        allResults[model].push({ image: imgFile, success: false, error: `[${status}] ${msg.substring(0,200)}`, latencyMs:0, tokens:0, parsedOriginal:null, parsedFixed:null, hallucination:{score:0,riskLevel:"—",flags:[],wordCountOriginal:0,wordCountFixed:0,sim_orig_fixed:0} });
      }
    }
  }

  // === TONG KET CONSOLE ===
  console.log("\n\n" + "=".repeat(65));
  console.log("  TOM TAT KET QUA");
  console.log("=".repeat(65));

  for (const model of MODELS) {
    const data = allResults[model];
    const ok = data.filter(r => r.success && r.parsedOriginal !== null);
    const apiErr = data.filter(r => !r.success);
    const jsonErr = data.filter(r => r.success && r.parsedOriginal === null);
    const clean = ok.filter(r => r.hallucination.score === 0);
    const warn = ok.filter(r => r.hallucination.score > 0 && r.hallucination.score <= 30);
    const high = ok.filter(r => r.hallucination.score > 30);
    const avgLat = ok.length ? (ok.reduce((s,r)=>s+r.latencyMs,0)/ok.length/1000).toFixed(2) : "—";
    const avgTok = ok.length ? Math.round(ok.reduce((s,r)=>s+r.tokens,0)/ok.length) : "—";
    const avgWords = ok.length ? Math.round(ok.reduce((s,r)=>s+r.hallucination.wordCountOriginal,0)/ok.length) : 0;

    console.log(`\n  ${model}`);
    console.log(`    Xu ly thanh cong: ${ok.length}/${data.length}`);
    console.log(`    Loi API         : ${apiErr.length}`);
    console.log(`    JSON khong hop le: ${jsonErr.length}`);
    console.log(`    Binh thuong (0) : ${clean.length}`);
    console.log(`    Canh bao (1-30) : ${warn.length}`);
    console.log(`    Rui ro cao (>30): ${high.length}`);
    console.log(`    Latency TB      : ${avgLat}s`);
    console.log(`    Tokens TB       : ${avgTok}`);
    console.log(`    So tu TB        : ${avgWords} tu/anh`);
  }

  // === XUAT JSON ===
  writeFileSync(OUTPUT_JSON, JSON.stringify(allResults, null, 2), "utf-8");

  // === XUAT MARKDOWN ===
  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  let md = `# Benchmark Deep Test — gemini-3.5-flash-lite vs gemini-3.1-flash-lite\n\n`;
  md += `> **Mục đích:** Test kỹ 2 mô hình Flash Lite để phát hiện hallucination (bịa đặt nội dung) khi OCR chữ viết tay tiếng Việt.\n>\n`;
  md += `> Ngày: ${now}\n`;
  md += `> Dataset: \`image_datasets/anhchuaxuly/\` — ${imageFiles.length} ảnh thực tế\n`;
  md += `> Cấu hình: 1 API key | delay 10s | maxOutputTokens 8192 | temperature 0.05\n\n`;
  md += `---\n\n`;

  // Bang tong hop
  md += `## 1. Bảng Tổng Hợp\n\n`;
  md += `| Chỉ số | gemini-3.5-flash-lite | gemini-3.1-flash-lite |\n`;
  md += `|---|---|---|\n`;

  const stats = {};
  for (const model of MODELS) {
    const data = allResults[model];
    const ok = data.filter(r => r.success && r.parsedOriginal !== null);
    stats[model] = {
      ok: ok.length, total: data.length,
      apiErr: data.filter(r=>!r.success).length,
      jsonErr: data.filter(r=>r.success && r.parsedOriginal===null).length,
      clean: ok.filter(r=>r.hallucination.score===0).length,
      warn: ok.filter(r=>r.hallucination.score>0&&r.hallucination.score<=30).length,
      high: ok.filter(r=>r.hallucination.score>30).length,
      avgLat: ok.length ? (ok.reduce((s,r)=>s+r.latencyMs,0)/ok.length/1000).toFixed(2) : "—",
      avgTok: ok.length ? Math.round(ok.reduce((s,r)=>s+r.tokens,0)/ok.length) : "—",
      avgWords: ok.length ? Math.round(ok.reduce((s,r)=>s+r.hallucination.wordCountOriginal,0)/ok.length) : 0,
    };
  }

  const [m1, m2] = MODELS;
  const s1 = stats[m1], s2 = stats[m2];
  md += `| Thành công (JSON OK) | ${s1.ok}/${s1.total} | ${s2.ok}/${s2.total} |\n`;
  md += `| Lỗi API | ${s1.apiErr} | ${s2.apiErr} |\n`;
  md += `| JSON không hợp lệ | ${s1.jsonErr} | ${s2.jsonErr} |\n`;
  md += `| ✅ Bình thường (H=0) | ${s1.clean} ảnh | ${s2.clean} ảnh |\n`;
  md += `| 🟡 Cảnh báo nhẹ (H≤30) | ${s1.warn} ảnh | ${s2.warn} ảnh |\n`;
  md += `| 🔴 Rủi ro cao (H>30) | ${s1.high} ảnh | ${s2.high} ảnh |\n`;
  md += `| Latency TB | ${s1.avgLat}s | ${s2.avgLat}s |\n`;
  md += `| Tokens TB | ${s1.avgTok} | ${s2.avgTok} |\n`;
  md += `| Số từ TB (original) | ${s1.avgWords} từ | ${s2.avgWords} từ |\n\n`;
  md += `---\n\n`;

  // Chi tiet tung model
  for (const model of MODELS) {
    md += `## 2. Chi tiết — \`${model}\`\n\n`;
    md += `| # | Ảnh | Latency | Tokens | JSON | H-Score | Rủi ro | Flags |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;
    allResults[model].forEach((r, i) => {
      if (!r.success) {
        md += `| ${i+1} | ${r.image} | — | — | ❌ | — | Lỗi API | ${(r.error||"").substring(0,60)} |\n`;
      } else if (!r.parsedOriginal) {
        md += `| ${i+1} | ${r.image} | ${(r.latencyMs/1000).toFixed(2)}s | ${r.tokens} | ❌ | 30 | 🟠 JSON lỗi | ${(r.parseError||"").substring(0,50)} |\n`;
      } else {
        const fc = r.hallucination.flags.length > 0 ? `${r.hallucination.flags.length} cảnh báo` : "✅ Sạch";
        md += `| ${i+1} | ${r.image} | ${(r.latencyMs/1000).toFixed(2)}s | ${r.tokens} | ✅ | ${r.hallucination.score} | ${r.hallucination.riskLevel} | ${fc} |\n`;
      }
    });
    md += `\n`;
  }
  md += `---\n\n`;

  // So sanh tung anh
  md += `## 3. So sánh OCR từng Ảnh\n\n`;
  for (let i = 0; i < imageFiles.length; i++) {
    md += `### Ảnh ${i+1} — \`${imageFiles[i]}\`\n\n`;
    for (const model of MODELS) {
      const r = allResults[model][i];
      md += `#### \`${model}\`\n\n`;
      if (!r || !r.success) {
        md += `**❌ Lỗi API:** ${r?.error || "Không có dữ liệu"}\n\n`;
      } else if (!r.parsedOriginal) {
        md += `**❌ JSON không hợp lệ** | Latency: ${(r.latencyMs/1000).toFixed(2)}s | Tokens: ${r.tokens}\n\n`;
        md += `Parse Error: \`${r.parseError}\`\n\nRaw (300 ký tự đầu):\n\`\`\`\n${r.rawOutput.substring(0,300)}\n\`\`\`\n\n`;
      } else {
        md += `- **Latency:** ${(r.latencyMs/1000).toFixed(2)}s | **Tokens:** ${r.tokens} | **Số từ:** orig=${r.hallucination.wordCountOriginal} / fixed=${r.hallucination.wordCountFixed}\n`;
        md += `- **Sim(orig↔fixed):** ${r.hallucination.sim_orig_fixed}% | **H-Score:** ${r.hallucination.score} | **Rủi ro:** ${r.hallucination.riskLevel}\n`;
        if (r.hallucination.flags.length) {
          md += `- **Cảnh báo:**\n`;
          r.hallucination.flags.forEach(f => { md += `  - ${f}\n`; });
        }
        md += `\n**original_text:**\n\`\`\`\n${r.parsedOriginal}\n\`\`\`\n\n`;
        md += `**fixed_text:**\n\`\`\`\n${r.parsedFixed || "(trống)"}\n\`\`\`\n\n`;
      }
    }
    md += `---\n\n`;
  }

  md += `*Tạo bởi \`benchmark_flashlite_deeptest.mjs\` — ViHand Grade*\n`;
  writeFileSync(OUTPUT_MD, md, "utf-8");

  console.log(`\n\n  Markdown : ${OUTPUT_MD}`);
  console.log(`  JSON     : ${OUTPUT_JSON}`);
  console.log("=================================================================\n");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
