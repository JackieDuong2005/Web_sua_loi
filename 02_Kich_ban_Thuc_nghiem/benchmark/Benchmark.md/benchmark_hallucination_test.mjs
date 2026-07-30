/**
 * benchmark_hallucination_test.mjs
 * ============================================================
 * Benchmark phat hien "ao tuong" (Hallucination) cua cac model Gemini
 * khi thuc hien OCR chu viet tay tieng Viet bang SYSTEM PROMPT THUC TE
 * cua he thong ViHand Grade.
 *
 * Models: gemini-3.5-flash-lite | gemini-3.1-flash-lite | gemini-3.5-flash
 * Dataset: image_datasets/anhchuaxuly/ (19 anh thuc te chua xu ly)
 * Prompt: System prompt thuc te cua ViHand Grade (JSON output)
 *
 * Chay: node benchmark_hallucination_test.mjs
 * ============================================================
 */

import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
// Benchmark.md thu muc la con cua benchmark, benchmark la con cua 02_Kich_ban_Thuc_nghiem
const PROJECT_ROOT = join(__dir, "..", "..", ".."); // Web_sua_loi
const IMAGE_DIR = join(__dir, "..", "..", "image_datasets", "anhchuaxuly");
const OUTPUT_MD = join(__dir, "benchmark_hallucination_results.md");
const OUTPUT_JSON = join(__dir, "benchmark_hallucination_results.json");

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
];

const DELAY_MS = 4500;
const MAX_RETRIES = 2;

// System prompt thuc te cua ViHand Grade
const SYSTEM_PROMPT = `Ban la giao vien tieu hoc Viet Nam chuyen sua bai chinh ta. Phan tich doan van cua hoc sinh duoc cung cap trong anh, nhan dien chu viet va sua lai cho dung chinh ta. Tra ve duy nhat dinh dang JSON.

=== QUY TAC NHAN DIEN (original_text) ===
1. Ghi lai CHINH XAC tung chu viet tay - KHONG tu sua loi, KHONG bia them noi dung.
2. Neu co chu bi gach bo hoac lem muc khong doc duoc, BO QUA phan do, chi lay chu nguoi viet da sua.
3. Giu nguyen cau truc xuong dong:
   - Van xuoi: noi cac dong thanh doan van, chi xuong dong khi nguoi viet thut le bat dau doan moi.
   - Tho: giu nguyen tung cau tho rieng dong.
4. Neu dau trang co chu luyen viet roi rac (VD: "oac, ngoac..."), BO QUA, chi bat dau tu tieu de bai viet.

=== QUY TAC SUA LOI (fixed_text) ===
- Sua dung chinh ta tieng Viet: dau thanh, phu am dau (c/k/q, g/gh, d/gi/r, s/x, ch/tr, l/n), van.
- Viet hoa dau cau va ten rieng dung quy tac.
- Giu nguyen cau truc dong, y nghia va noi dung cua hoc sinh.

=== DINH DANG OUTPUT (JSON duy nhat, khong kem markdown) ===
{
  "original_text": "van ban goc nhan dien duoc tu anh (chua sua)",
  "fixed_text": "van ban da duoc sua het loi chinh ta va viet hoa dung quy tac"
}`;

function loadApiKeys() {
  const candidates = [
    join(__dir, "..", "..", "..", "..", ".env.local"),
    join(__dir, "..", "..", "..", ".env.local"),
  ];
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        const env = readFileSync(p, "utf-8");
        const m = env.match(/GEMINI_API_KEYS?=(.+)/);
        if (m) {
          const keys = m[1].trim().split(",").map(k => k.trim()).filter(k => k.length > 10);
          if (keys.length) { console.log("  API keys loaded from:", p); return keys; }
        }
      }
    } catch {}
  }
  if (process.env.GEMINI_API_KEY) return [process.env.GEMINI_API_KEY];
  return [];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getMimeType(f) {
  const e = extname(f).toLowerCase();
  return e === ".png" ? "image/png" : e === ".webp" ? "image/webp" : "image/jpeg";
}

// === PHAT HIEN HALLUCINATION ===
function analyzeHallucination(parsedOriginal, parsedFixed) {
  const flags = [];
  let score = 0;

  if (parsedOriginal === null) {
    flags.push("JSON_INVALID: Model khong tra ve JSON hop le");
    score += 30;
    return { score, riskLevel: getRisk(score), flags, wordCountOriginal: 0, wordCountFixed: 0 };
  }

  const origWords = parsedOriginal.trim().split(/\s+/).filter(w => w.length > 0);
  const fixedWords = parsedFixed ? parsedFixed.trim().split(/\s+/).filter(w => w.length > 0) : [];

  // Check 1: Content inflation
  if (origWords.length > 300) {
    flags.push(`CONTENT_INFLATION: original_text co ${origWords.length} tu (bat thuong cao - nghi ngo bia them)`);
    score += 30;
  } else if (origWords.length > 180) {
    flags.push(`CONTENT_LONG: original_text co ${origWords.length} tu (kha dai)`);
    score += 10;
  }

  // Check 2: Fixed text deviation
  if (fixedWords.length > 0 && origWords.length > 0) {
    const addedRatio = (fixedWords.length - origWords.length) / origWords.length;
    if (addedRatio > 0.3) {
      flags.push(`FIXED_DEVIATION: fixed_text dai hon original ${(addedRatio*100).toFixed(0)}% (nguy co them noi dung)`);
      score += 20;
    } else if (addedRatio > 0.15) {
      flags.push(`FIXED_EXPANSION: fixed_text dai hon original ${(addedRatio*100).toFixed(0)}%`);
      score += 8;
    }
  }

  // Check 3: Repetition
  const lines = parsedOriginal.split("\n").filter(l => l.trim().length > 5);
  const lineSet = new Set(lines.map(l => l.trim()));
  if (lines.length > 4 && lineSet.size < lines.length * 0.7) {
    flags.push(`REPETITION: ${lines.length - lineSet.size} dong lap lai trong output`);
    score += 20;
  }

  // Check 4: Too short
  if (origWords.length < 3) {
    flags.push(`TOO_SHORT: original_text chi co ${origWords.length} tu (model co the tu choi OCR)`);
    score += 15;
  }

  // Check 5: Common poem fill-in
  const poemFrags = ["non song gam voc", "bon nghin nam van hien", "con rong chau tien"];
  for (const frag of poemFrags) {
    if (parsedOriginal.toLowerCase().replace(/[àáạảãâầấậẩẫăặắẳẵặèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, 'a').includes(frag)) {
      flags.push(`POEM_HALLUCINATION: Phat hien cum tu "${frag}" - co the model tu them`);
      score += 15;
    }
  }

  return {
    score,
    riskLevel: getRisk(score),
    flags,
    wordCountOriginal: origWords.length,
    wordCountFixed: fixedWords.length,
  };
}

function getRisk(score) {
  if (score === 0) return "BINH_THUONG";
  if (score <= 15) return "RUI_RO_THAP";
  if (score <= 35) return "RUI_RO_TRUNG_BINH";
  return "RUI_RO_CAO_NGHI_NGO_BIA_DAT";
}

function getRiskEmoji(level) {
  const map = { BINH_THUONG: "✅", RUI_RO_THAP: "🟡", RUI_RO_TRUNG_BINH: "🟠", RUI_RO_CAO_NGHI_NGO_BIA_DAT: "🔴" };
  return (map[level] || "❓") + " " + level;
}

async function callGemini(client, model, base64, mimeType, retries = 0) {
  const t0 = Date.now();
  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType, data: base64 } },
        SYSTEM_PROMPT,
      ],
      config: { responseMimeType: "application/json", temperature: 0.05, maxOutputTokens: 4096 },
    });

    const latencyMs = Date.now() - t0;
    const rawText = (response.text ?? "").trim();
    const tokens = response.usageMetadata?.totalTokenCount || 0;

    let parsedOriginal = null, parsedFixed = null, parseError = null;
    try {
      const cleaned = rawText.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
      const obj = JSON.parse(cleaned);
      parsedOriginal = obj.original_text ?? null;
      parsedFixed = obj.fixed_text ?? null;
    } catch(e) { parseError = e.message; }

    const hallucination = analyzeHallucination(parsedOriginal, parsedFixed);
    return { success: true, latencyMs, tokens, rawOutput: rawText, parsedOriginal, parsedFixed, parseError, hallucination, error: null };
  } catch(err) {
    const latencyMs = Date.now() - t0;
    const status = err?.status || 0;
    const msg = err?.message || String(err);
    if ((status === 429 || status === 503) && retries < MAX_RETRIES) {
      const wait = status === 429 ? 15000 : 8000;
      console.log(`    [${status}] Cho ${wait/1000}s roi thu lai (${retries+1}/${MAX_RETRIES})...`);
      await sleep(wait);
      return callGemini(client, model, base64, mimeType, retries + 1);
    }
    return { success: false, latencyMs, tokens: 0, rawOutput: "", parsedOriginal: null, parsedFixed: null, parseError: null, hallucination: { score: 0, riskLevel: "—", flags: [], wordCountOriginal: 0, wordCountFixed: 0 }, error: `[${status}] ${msg.substring(0,200)}` };
  }
}

async function main() {
  console.log("=================================================================");
  console.log("  VIHAND GRADE — BENCHMARK HALLUCINATION TEST");
  console.log("  Kiem tra 'ao tuong' cua model Gemini OCR");
  console.log("=================================================================\n");

  const apiKeys = loadApiKeys();
  if (!apiKeys.length) { console.error("Khong tim thay API key!"); process.exit(1); }
  console.log(`  API Keys: ${apiKeys.length} key(s)`);

  if (!existsSync(IMAGE_DIR)) { console.error("Thu muc anh khong ton tai:", IMAGE_DIR); process.exit(1); }
  const imageFiles = readdirSync(IMAGE_DIR)
    .filter(f => [".jpg",".jpeg",".png",".webp"].includes(extname(f).toLowerCase()))
    .sort();

  console.log(`  Dataset: ${IMAGE_DIR}`);
  console.log(`  So anh: ${imageFiles.length}`);
  console.log(`  Models: ${MODELS.join(" | ")}\n`);

  const allResults = {};
  let keyIdx = 0;

  for (const model of MODELS) {
    allResults[model] = [];
    console.log(`\n${"=".repeat(65)}`);
    console.log(`  Model: ${model}`);
    console.log("=".repeat(65));

    for (let i = 0; i < imageFiles.length; i++) {
      const imgFile = imageFiles[i];
      const apiKey = apiKeys[keyIdx++ % apiKeys.length];
      const client = new GoogleGenAI({ apiKey });
      console.log(`\n  [${i+1}/${imageFiles.length}] ${imgFile}`);

      let buf;
      try { buf = readFileSync(join(IMAGE_DIR, imgFile)); }
      catch(e) {
        console.log(`    Khong doc duoc: ${e.message}`);
        allResults[model].push({ image: imgFile, success: false, error: e.message, latencyMs:0, tokens:0, parsedOriginal:null, parsedFixed:null, hallucination:{score:0,riskLevel:"—",flags:[],wordCountOriginal:0,wordCountFixed:0} });
        continue;
      }

      const result = await callGemini(client, model, buf.toString("base64"), getMimeType(imgFile));
      allResults[model].push({ image: imgFile, ...result });

      if (result.success) {
        console.log(`    OK ${result.latencyMs}ms | ${result.tokens} tokens | JSON:${result.hallucination.score !== undefined && result.parsedOriginal !== null ? "OK" : "FAIL"} | H-Score:${result.hallucination.score} | ${result.hallucination.riskLevel}`);
        if (result.hallucination.flags.length) result.hallucination.flags.forEach(f => console.log(`    ! ${f}`));
        if (result.parsedOriginal) console.log(`    OCR: "${result.parsedOriginal.replace(/\n/g," ").substring(0,70)}..."`);
      } else {
        console.log(`    LOI: ${result.error?.substring(0,100)}`);
      }

      const isLast = i === imageFiles.length-1 && MODELS.indexOf(model) === MODELS.length-1;
      if (!isLast) await sleep(DELAY_MS);
    }
  }

  // Luu JSON
  writeFileSync(OUTPUT_JSON, JSON.stringify(allResults, null, 2), "utf-8");

  // Tao Markdown report
  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  let md = `# Benchmark Hallucination — So sanh 3 Model Gemini\n\n`;
  md += `> **Muc dich:** Kiem tra xem cac model Gemini co "ao tuong" (hallucination) — bia dat noi dung khong co trong anh — khi thuc hien OCR chu viet tay tieng Viet bang system prompt thuc te cua ViHand Grade hay khong.\n>\n`;
  md += `> Ngay: ${now}\n`;
  md += `> Dataset: \`image_datasets/anhchuaxuly/\` (${imageFiles.length} anh thuc te)\n`;
  md += `> Models: \`${MODELS.join("\\` | \\`")}\`\n`;
  md += `> Temperature: 0.05\n\n---\n\n`;

  md += `## 1. Bang Tong Hop\n\n`;
  md += `| Model | Thanh cong | JSON hop le | Latency TB | Tokens TB | H-Score TB | Rui ro cao |\n`;
  md += `|---|---|---|---|---|---|---|\n`;

  for (const model of MODELS) {
    const data = allResults[model];
    const ok = data.filter(r => r.success);
    const jsonOk = ok.filter(r => r.parsedOriginal !== null);
    const highRisk = ok.filter(r => r.hallucination.score > 35);
    const avgLat = ok.length ? (ok.reduce((s,r)=>s+r.latencyMs,0)/ok.length/1000).toFixed(2) : "—";
    const avgTok = ok.length ? Math.round(ok.reduce((s,r)=>s+r.tokens,0)/ok.length) : "—";
    const avgScore = ok.length ? (ok.reduce((s,r)=>s+r.hallucination.score,0)/ok.length).toFixed(1) : "—";
    md += `| \`${model}\` | ${ok.length}/${data.length} | ${jsonOk.length}/${ok.length} | ${avgLat}s | ${avgTok} | ${avgScore} | ${highRisk.length} anh |\n`;
  }
  md += `\n> **H-Score:** 0 = binh thuong, >35 = nguy co bia dat cao\n\n---\n\n`;

  md += `## 2. Chi tiet Hallucination tung Model\n\n`;
  for (const model of MODELS) {
    md += `### Model: \`${model}\`\n\n`;
    md += `| # | Anh | Latency | Tokens | JSON | H-Score | Rui ro | Flags |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;
    allResults[model].forEach((r,i) => {
      if (!r.success) {
        md += `| ${i+1} | ${r.image} | — | — | ❌ | — | LOI API | ${(r.error||"").substring(0,50)} |\n`;
      } else {
        const flagSummary = r.hallucination.flags.length > 0 ? `${r.hallucination.flags.length} canh bao` : "✅ Sach";
        const riskEmoji = { BINH_THUONG:"✅", RUI_RO_THAP:"🟡", RUI_RO_TRUNG_BINH:"🟠", RUI_RO_CAO_NGHI_NGO_BIA_DAT:"🔴" }[r.hallucination.riskLevel] || "❓";
        md += `| ${i+1} | ${r.image} | ${(r.latencyMs/1000).toFixed(2)}s | ${r.tokens} | ${r.parsedOriginal!==null?"✅":"❌"} | ${r.hallucination.score} | ${riskEmoji} ${r.hallucination.riskLevel} | ${flagSummary} |\n`;
      }
    });
    md += "\n";
  }
  md += `---\n\n`;

  md += `## 3. So sanh OCR Chi tiet Tung Anh\n\n`;
  for (let i = 0; i < imageFiles.length; i++) {
    md += `### Anh ${i+1} — \`${imageFiles[i]}\`\n\n`;
    for (const model of MODELS) {
      const r = allResults[model][i];
      md += `#### \`${model}\`\n\n`;
      if (!r || !r.success) {
        md += `**Trang thai:** ❌ Loi — ${r?.error || "Khong co du lieu"}\n\n`;
      } else {
        md += `- **Latency:** ${(r.latencyMs/1000).toFixed(2)}s | **Tokens:** ${r.tokens} | **JSON:** ${r.parsedOriginal!==null?"✅":"❌"}\n`;
        md += `- **Hallucination:** ${r.hallucination.riskLevel} (Score: ${r.hallucination.score})\n`;
        if (r.hallucination.flags.length) {
          md += `- **Canh bao:**\n`;
          r.hallucination.flags.forEach(f => { md += `  - ${f}\n`; });
        }
        md += "\n";
        if (r.parsedOriginal) md += `**original_text** (${r.hallucination.wordCountOriginal} tu):\n\`\`\`\n${r.parsedOriginal}\n\`\`\`\n\n`;
        if (r.parsedFixed) md += `**fixed_text** (${r.hallucination.wordCountFixed} tu):\n\`\`\`\n${r.parsedFixed}\n\`\`\`\n\n`;
        if (r.parseError) md += `**Parse Error:** ${r.parseError}\n\nRaw output:\n\`\`\`\n${r.rawOutput.substring(0,400)}\n\`\`\`\n\n`;
      }
    }
    md += `---\n\n`;
  }

  md += `## 4. Tong Ket & Phan Tich\n\n`;
  for (const model of MODELS) {
    const data = allResults[model];
    const ok = data.filter(r => r.success && r.parsedOriginal !== null);
    const allFlags = ok.flatMap(r => r.hallucination.flags);
    const avgWords = ok.length ? (ok.reduce((s,r)=>s+r.hallucination.wordCountOriginal,0)/ok.length).toFixed(0) : 0;
    md += `### \`${model}\`\n\n`;
    md += `| Chi so | Gia tri |\n|---|---|\n`;
    md += `| Anh xu ly thanh cong (JSON hop le) | ${ok.length}/${data.length} |\n`;
    md += `| So tu TB (original_text) | ${avgWords} tu |\n`;
    md += `| Content Inflation (>300 tu) | ${allFlags.filter(f=>f.includes("INFLATION")).length} anh |\n`;
    md += `| Fixed Deviation (+30%+) | ${allFlags.filter(f=>f.includes("FIXED_DEVIATION")).length} anh |\n`;
    md += `| Repetition | ${allFlags.filter(f=>f.includes("REPETITION")).length} anh |\n`;
    md += `| Qua ngan (<3 tu) | ${allFlags.filter(f=>f.includes("TOO_SHORT")).length} anh |\n\n`;
  }
  md += `---\n\n*Tu dong tao boi \`benchmark_hallucination_test.mjs\` — ViHand Grade*\n`;

  writeFileSync(OUTPUT_MD, md, "utf-8");

  console.log("\n=================================================================");
  console.log("  BENCHMARK HOAN THANH");
  console.log(`  Markdown : ${OUTPUT_MD}`);
  console.log(`  JSON     : ${OUTPUT_JSON}`);
  console.log("=================================================================\n");
  console.log("  TOM TAT:\n");
  for (const model of MODELS) {
    const data = allResults[model];
    const ok = data.filter(r=>r.success);
    const highRisk = ok.filter(r=>r.hallucination.score > 35);
    const clean = ok.filter(r=>r.hallucination.score === 0);
    const avgLat = ok.length ? (ok.reduce((s,r)=>s+r.latencyMs,0)/ok.length/1000).toFixed(2) : "—";
    console.log(`  ${model}:`);
    console.log(`    Thanh cong : ${ok.length}/${data.length}`);
    console.log(`    Sach (0)   : ${clean.length} anh`);
    console.log(`    Rui ro cao : ${highRisk.length} anh`);
    console.log(`    Latency TB : ${avgLat}s\n`);
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
