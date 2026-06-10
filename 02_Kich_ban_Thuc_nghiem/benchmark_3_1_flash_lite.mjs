/**
 * benchmark_3_1_flash_lite.mjs
 * Benchmark OCR cho model gemini-3.1-flash-lite trên 6 ảnh anhdaduocOCR/
 * Chạy: node benchmark_3_1_flash_lite.mjs
 */

import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dir, "..");
const IMAGE_DIR = join(PROJECT_ROOT, "anhdaduocOCR");
const OUTPUT_FILE = join(__dir, "benchmark_3_1_flash_lite_results.md");
const MODEL = "gemini-3.1-flash-lite";
const DELAY_MS = 3000;

const OCR_PROMPT = `Hãy đọc và trích xuất chính xác toàn bộ văn bản chữ viết tay trong ảnh này.\nChỉ trả về văn bản thuần túy, giữ nguyên xuống dòng. Không thêm giải thích hay bình luận.`;

function loadApiKeys() {
  try {
    const env = readFileSync(join(PROJECT_ROOT, ".env.local"), "utf-8");
    const m = env.match(/GEMINI_API_KEYS?=(.+)/);
    if (m) return m[1].trim().split(",").map(k => k.trim()).filter(k => k.length > 10);
  } catch {}
  if (process.env.GEMINI_API_KEY) return [process.env.GEMINI_API_KEY];
  return [];
}

function loadGroundTruth(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const sections = {};
  const regex = /## (Ảnh \d+)[^\n]*\n\n([\s\S]*?)(?=\n---|$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1].trim();
    const text = match[2]
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .trim();
    sections[key] = text;
  }
  return sections;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function similarity(a, b) {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const ca = a.replace(/\s+/g, " ").trim();
  const cb = b.replace(/\s+/g, " ").trim();
  const dist = levenshtein(ca, cb);
  return Math.max(0, Math.round((1 - dist / Math.max(ca.length, cb.length)) * 10000) / 100);
}

function wordAccuracy(gt, ocr) {
  if (!gt || !ocr) return 0;
  const gtW = gt.replace(/\s+/g, " ").trim().split(" ");
  const ocrW = ocr.replace(/\s+/g, " ").trim().split(" ");
  let matched = 0;
  for (const w of gtW) if (ocrW.includes(w)) matched++;
  return gtW.length === 0 ? 100 : Math.round((matched / gtW.length) * 10000) / 100;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const apiKeys = loadApiKeys();
  if (!apiKeys.length) { console.error("❌ Không tìm thấy API key trong .env.local"); process.exit(1); }

  const files = readdirSync(IMAGE_DIR);
  const imageFiles = files
    .filter(f => [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase()))
    .sort();
  const gtFile = files.find(f => f.endsWith(".md"));
  const groundTruth = gtFile ? loadGroundTruth(join(IMAGE_DIR, gtFile)) : {};

  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  BENCHMARK: ${MODEL}`);
  console.log(`  Ảnh: ${imageFiles.length} | Ground truth: ${Object.keys(groundTruth).length} mục`);
  console.log(`  API Keys: ${apiKeys.length} key(s)`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const results = [];
  let keyIndex = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const imgFile = imageFiles[i];
    const imgPath = join(IMAGE_DIR, imgFile);
    const imgBuffer = readFileSync(imgPath);
    const base64 = imgBuffer.toString("base64");
    const mimeType = extname(imgFile).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
    const imgLabel = `Ảnh ${i + 1}`;
    const gt = groundTruth[imgLabel] || "";

    const apiKey = apiKeys[keyIndex % apiKeys.length];
    keyIndex++;
    const client = new GoogleGenAI({ apiKey });

    console.log(`[${i + 1}/${imageFiles.length}] ${imgLabel} — ${imgFile}`);

    try {
      const t0 = Date.now();
      const response = await client.models.generateContent({
        model: MODEL,
        contents: [{ inlineData: { mimeType, data: base64 } }, OCR_PROMPT],
        config: { temperature: 0.1, maxOutputTokens: 4096 },
      });
      const latency = Date.now() - t0;
      const text = (response.text ?? "").trim();
      const tokens = response.usageMetadata?.totalTokenCount || 0;
      const sim = gt ? similarity(gt, text) : -1;
      const wAcc = gt ? wordAccuracy(gt, text) : -1;

      results.push({ image: imgFile, label: imgLabel, text, latency, tokens, similarity: sim, wordAccuracy: wAcc, error: null, gt });

      console.log(`  ✅ ${latency}ms | ${tokens} tokens | sim=${sim}% | wordAcc=${wAcc}%`);
      console.log(`  OCR: "${text.replace(/\n/g, " ").substring(0, 80)}..."`);
    } catch (err) {
      const msg = err?.message || String(err);
      const status = err?.status || 0;
      results.push({ image: imgFile, label: imgLabel, text: "", latency: 0, tokens: 0, similarity: 0, wordAccuracy: 0, error: `[${status}] ${msg.substring(0, 200)}`, gt });
      console.log(`  ❌ LỖI: ${msg.substring(0, 100)}`);
    }

    if (i < imageFiles.length - 1) {
      console.log(`  ⏳ Chờ ${DELAY_MS/1000}s...\n`);
      await sleep(DELAY_MS);
    }
  }

  // ── Tổng kết console
  const success = results.filter(r => !r.error);
  const errors = results.filter(r => r.error);
  const avgLatency = success.length ? (success.reduce((s,r)=>s+r.latency,0)/success.length/1000).toFixed(2) : 0;
  const avgTokens = success.length ? Math.round(success.reduce((s,r)=>s+r.tokens,0)/success.length) : 0;
  const validSim = success.filter(r=>r.similarity>=0);
  const avgSim = validSim.length ? (validSim.reduce((s,r)=>s+r.similarity,0)/validSim.length).toFixed(1) : "—";
  const validWAcc = success.filter(r=>r.wordAccuracy>=0);
  const avgWAcc = validWAcc.length ? (validWAcc.reduce((s,r)=>s+r.wordAccuracy,0)/validWAcc.length).toFixed(1) : "—";

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  TỔNG KẾT");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Thành công  : ${success.length}/${results.length}`);
  console.log(`  Lỗi         : ${errors.length}`);
  console.log(`  Latency TB  : ${avgLatency}s`);
  console.log(`  Tokens TB   : ${avgTokens}`);
  console.log(`  Similarity  : ${avgSim}%`);
  console.log(`  Word Acc    : ${avgWAcc}%`);

  // ── Xuất Markdown
  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  let md = `# Benchmark OCR — ${MODEL}\n\n`;
  md += `> Ngày thực hiện: ${now}\n`;
  md += `> Số ảnh: ${imageFiles.length} | Model: \`${MODEL}\`\n`;
  md += `> API Keys: ${apiKeys.length} key(s)\n\n---\n\n`;

  md += `## 1. Kết quả tổng hợp\n\n`;
  md += `| Chỉ số | Giá trị |\n|---|---|\n`;
  md += `| Thành công | ${success.length}/${results.length} |\n`;
  md += `| Lỗi API | ${errors.length} |\n`;
  md += `| Latency TB | ${avgLatency}s |\n`;
  md += `| Tokens TB | ${avgTokens} |\n`;
  md += `| Similarity TB | ${avgSim}% |\n`;
  md += `| Word Accuracy TB | ${avgWAcc}% |\n\n`;

  md += `## 2. Chi tiết từng ảnh\n\n`;
  md += `| Ảnh | File | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.error) {
      md += `| Ảnh ${i+1} | ${r.image} | — | — | — | — | ❌ |\n`;
    } else {
      md += `| Ảnh ${i+1} | ${r.image} | ${(r.latency/1000).toFixed(2)} | ${r.tokens} | ${r.similarity} | ${r.wordAccuracy} | ✅ |\n`;
    }
  }

  md += `\n---\n\n## 3. So sánh OCR với Ground Truth\n\n`;
  for (const r of results) {
    md += `### ${r.label} — \`${r.image}\`\n\n`;
    md += `**Ground Truth:**\n\`\`\`\n${r.gt || "(không có)"}\n\`\`\`\n\n`;
    if (r.error) {
      md += `**Kết quả:** ❌ ${r.error}\n\n`;
    } else {
      md += `**OCR bởi \`${MODEL}\`** (sim=${r.similarity}%, wordAcc=${r.wordAccuracy}%):\n\`\`\`\n${r.text}\n\`\`\`\n\n`;
    }
    if (r.similarity >= 0 && !r.error) {
      const diff = r.similarity >= 99 ? "🟢 Gần như hoàn hảo" : r.similarity >= 95 ? "🟡 Rất tốt" : r.similarity >= 90 ? "🟠 Tốt" : "🔴 Cần cải thiện";
      md += `**Đánh giá:** ${diff}\n\n`;
    }
    md += `---\n\n`;
  }

  writeFileSync(OUTPUT_FILE, md, "utf-8");
  console.log(`\n  📄 Đã lưu: ${OUTPUT_FILE}`);
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch(err => { console.error("❌ Fatal:", err); process.exit(1); });
