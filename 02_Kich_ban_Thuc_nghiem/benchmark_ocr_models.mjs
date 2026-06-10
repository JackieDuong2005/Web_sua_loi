/**
 * benchmark_ocr_models.mjs — So sánh khả năng OCR chữ viết tay của các model Gemini
 * 
 * Chạy: node benchmark_ocr_models.mjs
 * Output: benchmark_ocr_results.md
 * 
 * Yêu cầu: Biến môi trường GEMINI_API_KEY hoặc file .env.local
 */

import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dir, "..");
const IMAGE_DIR = join(PROJECT_ROOT, "anhdaduocOCR");
const OUTPUT_FILE = join(__dir, "benchmark_ocr_results.md");

// ═══════════════════ CẤU HÌNH ═══════════════════

// Danh sách model Gemini cần benchmark (từ 2.5 đến 3.5)
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
];

// Prompt OCR đơn giản — chỉ trích xuất văn bản, không chấm điểm
const OCR_PROMPT = `Hãy đọc và trích xuất chính xác toàn bộ văn bản chữ viết tay trong ảnh này.
Chỉ trả về văn bản thuần túy, giữ nguyên xuống dòng. Không thêm giải thích hay bình luận.`;

// Delay giữa các lần gọi API (ms) để tránh rate limit
const DELAY_MS = 4000;

// ═══════════════════ HELPERS ═══════════════════

// Đọc API keys từ .env.local
function loadApiKeys() {
  try {
    const envContent = readFileSync(join(PROJECT_ROOT, ".env.local"), "utf-8");
    const match = envContent.match(/GEMINI_API_KEYS?=(.+)/);
    if (match) {
      return match[1].trim().split(",").map(k => k.trim()).filter(k => k.length > 10);
    }
  } catch {}
  if (process.env.GEMINI_API_KEY) return [process.env.GEMINI_API_KEY];
  if (process.env.GEMINI_API_KEYS) return process.env.GEMINI_API_KEYS.split(",").map(k => k.trim());
  return [];
}

// Đọc ground truth từ file .md
function loadGroundTruth(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const sections = {};
  const regex = /## (Ảnh \d+)[^\n]*\n\n([\s\S]*?)(?=\n---|\n## |$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1].trim(); // "Ảnh 1", "Ảnh 2", etc.
    const text = match[2].replace(/\*\*([^*]+)\*\*/g, "$1")  // remove bold
                          .replace(/\*([^*]+)\*/g, "$1")      // remove italic
                          .trim();
    sections[key] = text;
  }
  return sections;
}

// Tính độ tương đồng Levenshtein (character-level)
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Tính % tương đồng
function similarity(a, b) {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const cleanA = a.replace(/\s+/g, " ").trim();
  const cleanB = b.replace(/\s+/g, " ").trim();
  const dist = levenshtein(cleanA, cleanB);
  const maxLen = Math.max(cleanA.length, cleanB.length);
  return maxLen === 0 ? 100 : Math.round((1 - dist / maxLen) * 10000) / 100;
}

// Tính word-level accuracy
function wordAccuracy(groundTruth, ocrText) {
  if (!groundTruth || !ocrText) return 0;
  const gtWords = groundTruth.replace(/\s+/g, " ").trim().split(" ");
  const ocrWords = ocrText.replace(/\s+/g, " ").trim().split(" ");
  let matched = 0;
  for (const w of gtWords) {
    if (ocrWords.includes(w)) matched++;
  }
  return gtWords.length === 0 ? 100 : Math.round((matched / gtWords.length) * 10000) / 100;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════ MAIN ═══════════════════

async function main() {
  const apiKeys = loadApiKeys();
  if (apiKeys.length === 0) {
    console.error("❌ Không tìm thấy API key. Cần GEMINI_API_KEYS trong .env.local");
    process.exit(1);
  }

  // Tìm ảnh và ground truth
  const files = readdirSync(IMAGE_DIR);
  const imageFiles = files
    .filter(f => [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase()))
    .sort();
  const gtFile = files.find(f => f.endsWith(".md"));
  
  if (imageFiles.length === 0) {
    console.error("❌ Không tìm thấy ảnh trong", IMAGE_DIR);
    process.exit(1);
  }

  const groundTruth = gtFile ? loadGroundTruth(join(IMAGE_DIR, gtFile)) : {};

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — BENCHMARK OCR CÁC MODEL GEMINI");
  console.log(`  Ảnh: ${imageFiles.length} | Models: ${MODELS.length}`);
  console.log(`  Ground truth: ${Object.keys(groundTruth).length} sections`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Kết quả: results[modelName][imageIndex] = { text, latency, tokens, similarity, wordAcc, error }
  const results = {};
  let keyIndex = 0;

  for (const model of MODELS) {
    results[model] = [];
    console.log(`\n🔄 Model: ${model}`);
    console.log("─".repeat(60));

    for (let i = 0; i < imageFiles.length; i++) {
      const imgFile = imageFiles[i];
      const imgPath = join(IMAGE_DIR, imgFile);
      const imgBuffer = readFileSync(imgPath);
      const base64 = imgBuffer.toString("base64");
      const mimeType = extname(imgFile).toLowerCase() === ".png" ? "image/png" : "image/jpeg";

      // Xoay vòng key
      const apiKey = apiKeys[keyIndex % apiKeys.length];
      keyIndex++;
      const client = new GoogleGenAI({ apiKey });

      const imgLabel = `Ảnh ${i + 1}`;
      const gt = groundTruth[imgLabel] || "";

      try {
        const startTime = Date.now();

        const response = await client.models.generateContent({
          model: model,
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64,
              },
            },
            OCR_PROMPT,
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        });

        const latency = Date.now() - startTime;
        const text = response.text ?? "";
        const tokens = response.usageMetadata?.totalTokenCount || 0;

        const sim = gt ? similarity(gt, text) : -1;
        const wAcc = gt ? wordAccuracy(gt, text) : -1;

        results[model].push({
          image: imgFile,
          text: text.trim(),
          latency,
          tokens,
          similarity: sim,
          wordAccuracy: wAcc,
          error: null,
        });

        console.log(`  ✅ ${imgLabel} (${imgFile}): ${latency}ms, ${tokens} tokens, sim=${sim}%, wordAcc=${wAcc}%`);

      } catch (err) {
        const msg = err?.message || String(err);
        const status = err?.status || 0;

        results[model].push({
          image: imgFile,
          text: "",
          latency: 0,
          tokens: 0,
          similarity: 0,
          wordAccuracy: 0,
          error: `${status ? `[${status}] ` : ""}${msg.substring(0, 150)}`,
        });

        console.log(`  ❌ ${imgLabel}: ${msg.substring(0, 100)}`);
      }

      // Delay giữa các request
      if (i < imageFiles.length - 1 || MODELS.indexOf(model) < MODELS.length - 1) {
        await sleep(DELAY_MS);
      }
    }
  }

  // ═══════════════════ XUẤT REPORT ═══════════════════
  
  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  let md = `# Benchmark OCR — So sánh các Model Gemini\n\n`;
  md += `> Ngày thực hiện: ${now}\n`;
  md += `> Số ảnh: ${imageFiles.length} | Số model: ${MODELS.length}\n`;
  md += `> API Keys: ${apiKeys.length} key(s) xoay vòng\n\n`;
  md += `---\n\n`;

  // Bảng tổng hợp
  md += `## 1. Bảng tổng hợp\n\n`;
  md += `| Model | Latency TB (s) | Tokens TB | Similarity TB (%) | Word Accuracy TB (%) | Lỗi |\n`;
  md += `|---|---|---|---|---|---|\n`;

  for (const model of MODELS) {
    const data = results[model];
    const success = data.filter(r => !r.error);
    const errors = data.filter(r => r.error);

    if (success.length === 0) {
      md += `| \`${model}\` | — | — | — | — | ${errors.length} lỗi |\n`;
      continue;
    }

    const avgLatency = (success.reduce((s, r) => s + r.latency, 0) / success.length / 1000).toFixed(2);
    const avgTokens = Math.round(success.reduce((s, r) => s + r.tokens, 0) / success.length);
    const validSim = success.filter(r => r.similarity >= 0);
    const avgSim = validSim.length > 0
      ? (validSim.reduce((s, r) => s + r.similarity, 0) / validSim.length).toFixed(1)
      : "—";
    const validWAcc = success.filter(r => r.wordAccuracy >= 0);
    const avgWAcc = validWAcc.length > 0
      ? (validWAcc.reduce((s, r) => s + r.wordAccuracy, 0) / validWAcc.length).toFixed(1)
      : "—";

    md += `| \`${model}\` | ${avgLatency} | ${avgTokens} | ${avgSim} | ${avgWAcc} | ${errors.length} |\n`;
  }

  // Chi tiết từng model
  md += `\n---\n\n## 2. Kết quả chi tiết từng model\n\n`;

  for (const model of MODELS) {
    md += `### Model: \`${model}\`\n\n`;
    md += `| Ảnh | Latency (s) | Tokens | Similarity (%) | Word Acc (%) | Trạng thái |\n`;
    md += `|---|---|---|---|---|---|\n`;

    const data = results[model];
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (r.error) {
        md += `| Ảnh ${i + 1} | — | — | — | — | ❌ ${r.error.substring(0, 80)} |\n`;
      } else {
        md += `| Ảnh ${i + 1} | ${(r.latency / 1000).toFixed(2)} | ${r.tokens} | ${r.similarity >= 0 ? r.similarity : "—"} | ${r.wordAccuracy >= 0 ? r.wordAccuracy : "—"} | ✅ |\n`;
      }
    }
    md += `\n`;
  }

  // Văn bản OCR thực tế
  md += `---\n\n## 3. Văn bản OCR trích xuất (so sánh)\n\n`;

  for (let i = 0; i < imageFiles.length; i++) {
    const imgLabel = `Ảnh ${i + 1}`;
    const gt = groundTruth[imgLabel] || "(không có ground truth)";

    md += `### ${imgLabel} — \`${imageFiles[i]}\`\n\n`;
    md += `**Ground Truth:**\n\`\`\`\n${gt}\n\`\`\`\n\n`;

    for (const model of MODELS) {
      const r = results[model][i];
      if (r && !r.error) {
        md += `**${model}** (sim=${r.similarity}%):\n\`\`\`\n${r.text}\n\`\`\`\n\n`;
      } else if (r) {
        md += `**${model}**: ❌ ${r.error}\n\n`;
      }
    }
    md += `---\n\n`;
  }

  // Ghi file
  writeFileSync(OUTPUT_FILE, md, "utf-8");
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  ✅ BENCHMARK HOÀN THÀNH`);
  console.log(`  📄 Kết quả: ${OUTPUT_FILE}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
