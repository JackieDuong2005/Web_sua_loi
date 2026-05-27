/**
 * test_preprocessing.mjs — Test Pipeline 10 bước tiền xử lý ảnh
 * Xuất ảnh trung gian từng bước để quan sát hiệu quả.
 * 
 * Chạy: node test_preprocessing.mjs
 * Output: thư mục anhdaxuly/<tên_ảnh>/step_XX_*.jpg
 */

import { Jimp } from "jimp";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = join(__dir, "anhchuaxuly");
const OUTPUT_DIR = join(__dir, "anhdaxuly");

// ══════════════════ CẤU HÌNH (THAY ĐỔI Ở ĐÂY) ══════════════════
const CONFIG = {
  resizeMaxWidth: 1600,       // Bước 2: max width (px). Giảm → xử lý nhanh hơn. Tăng → chi tiết hơn.
  enableWhiteBalance: true,   // Bước 3: true/false. Tắt nếu ảnh đã chuẩn màu.
  enableShadowRemoval: true,  // Bước 5: true/false. Tắt nếu ảnh không có bóng.
  shadowKernelSize: 51,       // Bước 5: kích thước kernel blur (phải lẻ). Tăng → xóa bóng lớn hơn.
  enableGridRemoval: true,    // Bước 6: true/false. Tắt nếu không phải vở ô ly.
  gridLineMinLength: 80,      // Bước 6: độ dài tối thiểu dòng kẻ (px). Giảm → nhạy hơn. Tăng → ít xóa nhầm.
  enableClahe: true,          // Bước 7: true/false. Tắt nếu ảnh đã đủ tương phản.
  claheClipLimit: 2.0,        // Bước 7: giới hạn clip (1.0–5.0). Tăng → tương phản mạnh hơn.
  claheTileGridSize: 8,       // Bước 7: số tile (4–16). Tăng → xử lý cục bộ chi tiết hơn.
  enableSharpen: true,        // Bước 8: true/false. Tắt nếu ảnh đã sắc nét.
  sharpenAmount: 0.5,         // Bước 8: mức sharpen (0.0–1.0). Tăng → nét hơn nhưng nhiều noise.
  thresholdMode: "adaptive_gaussian", // Bước 10: "otsu" | "adaptive_gaussian" | "adaptive_mean"
  adaptiveBlockSize: 31,      // Bước 10: kích thước khối (0 = tự tính). Phải lẻ, ≥21. Nhỏ hơn → ngưỡng cục bộ chính xác hơn.
  adaptiveC: 20,               // Bước 10: hằng số trừ (3–20). GIẢM → giữ nhiều nét chữ hơn. TĂNG → nhiều trắng hơn.
};
// ══════════════════════════════════════════════════════════════════

// ─── HELPERS (copy từ image-processor.ts) ───

function boxBlur(gray, w, h, kernelSize) {
  const ks = kernelSize % 2 === 0 ? kernelSize + 1 : kernelSize;
  const half = Math.floor(ks / 2);
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[y * w + x] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0);
    }
  }
  const result = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half), y1 = Math.max(0, y - half);
      const x2 = Math.min(w - 1, x + half), y2 = Math.min(h - 1, y + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[y2 * w + x2]
        - (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0)
        - (x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0)
        + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0);
      result[y * w + x] = Math.round(sum / count);
    }
  }
  return result;
}

function otsuThreshold(gray) {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (wB === 0) continue;
    const wF = total - wB; if (wF === 0) break;
    sumB += t * hist[t];
    const diff = sumB / wB - (sumAll - sumB) / wF;
    const variance = wB * wF * diff * diff;
    if (variance > best) { best = variance; threshold = t; }
  }
  return threshold;
}

function rgbaToGray(data, n) {
  const g = new Uint8Array(n);
  for (let i = 0; i < n; i++) g[i] = data[i * 4];
  return g;
}

function grayToRgba(gray, data, n) {
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    data[idx] = data[idx + 1] = data[idx + 2] = gray[i];
    data[idx + 3] = 255;
  }
}

// ─── BƯỚC 3: White Balance ───
function applyWhiteBalance(data, n) {
  let sR = 0, sG = 0, sB = 0;
  for (let i = 0; i < n; i++) { const idx = i * 4; sR += data[idx]; sG += data[idx + 1]; sB += data[idx + 2]; }
  const aR = sR / n, aG = sG / n, aB = sB / n, avg = (aR + aG + aB) / 3;
  const kR = aR > 0 ? avg / aR : 1, kG = aG > 0 ? avg / aG : 1, kB = aB > 0 ? avg / aB : 1;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    data[idx] = Math.min(255, Math.round(data[idx] * kR));
    data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * kG));
    data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * kB));
  }
}

// ─── BƯỚC 5: Shadow Removal ───
function removeShadow(gray, w, h, ks) {
  const bg = boxBlur(gray, w, h, ks);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = bg[i] > 0 ? Math.min(255, Math.round((gray[i] / bg[i]) * 255)) : gray[i];
  return out;
}

// ─── BƯỚC 6: Grid Line Removal ───
function removeGridLines(gray, w, h, minLen) {
  const result = new Uint8Array(gray);
  const thresh = otsuThreshold(gray);
  for (let y = 0; y < h; y++) {
    let rs = -1;
    for (let x = 0; x <= w; x++) {
      const dark = x < w && gray[y * w + x] < thresh;
      if (dark && rs === -1) rs = x;
      else if (!dark && rs !== -1) {
        if (x - rs >= minLen) {
          let thin = true;
          for (let cx = rs; cx < x && thin; cx += Math.max(1, Math.floor((x - rs) / 8))) {
            let vc = 0;
            for (let dy = -2; dy <= 2; dy++) { const ny = y + dy; if (ny >= 0 && ny < h && gray[ny * w + cx] < thresh) vc++; }
            if (vc > 3) thin = false;
          }
          if (thin) for (let ex = rs; ex < x; ex++) result[y * w + ex] = 255;
        }
        rs = -1;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let rs = -1;
    for (let y = 0; y <= h; y++) {
      const dark = y < h && gray[y * w + x] < thresh;
      if (dark && rs === -1) rs = y;
      else if (!dark && rs !== -1) {
        if (y - rs >= minLen) {
          let thin = true;
          for (let cy = rs; cy < y && thin; cy += Math.max(1, Math.floor((y - rs) / 8))) {
            let hc = 0;
            for (let dx = -2; dx <= 2; dx++) { const nx = x + dx; if (nx >= 0 && nx < w && gray[cy * w + nx] < thresh) hc++; }
            if (hc > 3) thin = false;
          }
          if (thin) for (let ey = rs; ey < y; ey++) result[ey * w + x] = 255;
        }
        rs = -1;
      }
    }
  }
  return result;
}

// ─── BƯỚC 7: CLAHE ───
function applyCLAHE(gray, w, h, clipLimit, numTiles) {
  const tileW = Math.ceil(w / numTiles), tileH = Math.ceil(h / numTiles);
  const cdfs = [];
  for (let ty = 0; ty < numTiles; ty++) {
    cdfs[ty] = [];
    for (let tx = 0; tx < numTiles; tx++) {
      const hist = new Float64Array(256); let count = 0;
      const ys = ty * tileH, ye = Math.min(h, ys + tileH);
      const xs = tx * tileW, xe = Math.min(w, xs + tileW);
      for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { hist[gray[y * w + x]]++; count++; }
      if (count > 0) {
        const clip = clipLimit * count / 256; let excess = 0;
        for (let i = 0; i < 256; i++) { if (hist[i] > clip) { excess += hist[i] - clip; hist[i] = clip; } }
        const add = excess / 256;
        for (let i = 0; i < 256; i++) hist[i] += add;
      }
      const cdf = new Uint8Array(256); let cum = 0;
      for (let i = 0; i < 256; i++) { cum += hist[i]; cdf[i] = count > 0 ? Math.min(255, Math.round((cum / count) * 255)) : i; }
      cdfs[ty][tx] = cdf;
    }
  }
  const result = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const val = gray[y * w + x];
    const txF = (x / tileW) - 0.5, tyF = (y / tileH) - 0.5;
    const tx1 = Math.max(0, Math.floor(txF)), ty1 = Math.max(0, Math.floor(tyF));
    const tx2 = Math.min(numTiles - 1, tx1 + 1), ty2 = Math.min(numTiles - 1, ty1 + 1);
    const fx = Math.max(0, Math.min(1, txF - tx1)), fy = Math.max(0, Math.min(1, tyF - ty1));
    const top = cdfs[ty1][tx1][val] * (1 - fx) + cdfs[ty1][tx2][val] * fx;
    const bot = cdfs[ty2][tx1][val] * (1 - fx) + cdfs[ty2][tx2][val] * fx;
    result[y * w + x] = Math.min(255, Math.max(0, Math.round(top * (1 - fy) + bot * fy)));
  }
  return result;
}

// ─── BƯỚC 8: Sharpen ───
function sharpenText(gray, w, h, amount) {
  const blurred = boxBlur(gray, w, h, 3);
  const out = new Uint8Array(w * h);
  const a = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < out.length; i++) out[i] = Math.min(255, Math.max(0, Math.round(gray[i] + a * (gray[i] - blurred[i]))));
  return out;
}

// ─── BƯỚC 9: Quality Assessment ───
function assessQuality(gray, w, h) {
  const n = gray.length, warnings = [];
  let lapSum = 0, lapSqSum = 0, lapCount = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const lap = gray[(y - 1) * w + x] + gray[(y + 1) * w + x] + gray[y * w + x - 1] + gray[y * w + x + 1] - 4 * gray[y * w + x];
    lapSum += lap; lapSqSum += lap * lap; lapCount++;
  }
  const lapMean = lapSum / lapCount;
  const blur_score = Math.round((lapSqSum / lapCount - lapMean * lapMean) * 100) / 100;
  if (blur_score < 80) warnings.push("Ảnh bị mờ");
  let brightSum = 0;
  for (let i = 0; i < n; i++) brightSum += gray[i];
  const brightness = Math.round((brightSum / n) * 100) / 100;
  if (brightness < 50) warnings.push("Ảnh quá tối");
  else if (brightness > 220) warnings.push("Ảnh cháy sáng");
  let darkCount = 0;
  for (let i = 0; i < n; i++) if (gray[i] < 100) darkCount++;
  const dark_pixel_ratio = Math.round((darkCount / n) * 10000) / 10000;
  if (dark_pixel_ratio < 0.02) warnings.push("Nét chữ quá nhạt");
  const t = otsuThreshold(gray);
  let textPixels = 0;
  for (let i = 0; i < n; i++) if (gray[i] < t) textPixels++;
  const text_area_ratio = Math.round((textPixels / n) * 10000) / 10000;
  if (text_area_ratio < 0.005) warnings.push("Chữ quá nhỏ");
  return { is_good: warnings.length === 0, warnings, blur_score, brightness, resolution: Math.min(w, h), dark_pixel_ratio, text_area_ratio };
}

// ─── BƯỚC 10: Threshold ───
function applyThresholdFn(gray, w, h, mode, blockSize, c) {
  const out = new Uint8Array(w * h);
  if (mode === "otsu") { const t = otsuThreshold(gray); for (let i = 0; i < out.length; i++) out[i] = gray[i] < t ? 0 : 255; return out; }
  let bs = blockSize > 0 ? blockSize : Math.max(21, Math.floor(w / 40));
  if (bs % 2 === 0) bs++;
  const half = Math.floor(bs / 2);
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) { let rs = 0; for (let x = 0; x < w; x++) { rs += gray[y * w + x]; integral[y * w + x] = rs + (y > 0 ? integral[(y - 1) * w + x] : 0); } }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x1 = Math.max(0, x - half), y1 = Math.max(0, y - half), x2 = Math.min(w - 1, x + half), y2 = Math.min(h - 1, y + half);
    const cnt = (x2 - x1 + 1) * (y2 - y1 + 1);
    const sum = integral[y2 * w + x2] - (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0) - (x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0) + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0);
    out[y * w + x] = gray[y * w + x] < (sum / cnt - c) ? 0 : 255;
  }
  return out;
}

// ─── Hàm lưu ảnh gray ───
async function saveGrayImage(gray, w, h, filePath) {
  const img = new Jimp({ width: w, height: h, color: 0xFFFFFFFF });
  grayToRgba(gray, img.bitmap.data, w * h);
  const buf = await img.getBuffer("image/jpeg", { quality: 90 });
  writeFileSync(filePath, buf);
}

async function saveJimpImage(image, filePath) {
  const buf = await image.getBuffer("image/jpeg", { quality: 90 });
  writeFileSync(filePath, buf);
}

// ═══════════════════ MAIN ═══════════════════

async function processImage(inputPath, outputSubDir) {
  const fileName = basename(inputPath, extname(inputPath));
  const outDir = join(outputSubDir, fileName);
  mkdirSync(outDir, { recursive: true });

  const buffer = readFileSync(inputPath);
  const start = Date.now();

  // ── Bước 1: EXIF Auto-rotate (Jimp tự xử lý)
  const image = await Jimp.read(buffer);
  await saveJimpImage(image, join(outDir, "step_01_exif_rotate.jpg"));
  console.log(`  [1] EXIF Auto-rotate    : ${image.bitmap.width}x${image.bitmap.height}`);

  // ── Bước 2: Resize
  const origW = image.bitmap.width, origH = image.bitmap.height;
  if (origW > CONFIG.resizeMaxWidth) {
    const ratio = CONFIG.resizeMaxWidth / origW;
    image.resize({ w: CONFIG.resizeMaxWidth, h: Math.round(origH * ratio) });
  }
  await saveJimpImage(image, join(outDir, "step_02_resize.jpg"));
  console.log(`  [2] Resize (max ${CONFIG.resizeMaxWidth}px) : ${image.bitmap.width}x${image.bitmap.height}`);

  const w = image.bitmap.width, h = image.bitmap.height, n = w * h;
  const data = image.bitmap.data;

  // ── Bước 3: White Balance
  if (CONFIG.enableWhiteBalance) {
    applyWhiteBalance(data, n);
    await saveJimpImage(image, join(outDir, "step_03_white_balance.jpg"));
    console.log(`  [3] White Balance       : ✅ (Gray World Assumption)`);
  } else console.log(`  [3] White Balance       : ⏭️ SKIP`);

  // ── Bước 4: Grayscale
  image.greyscale();
  await saveJimpImage(image, join(outDir, "step_04_grayscale.jpg"));
  console.log(`  [4] Grayscale           : ✅`);

  let gray = rgbaToGray(data, n);

  // ── Bước 5: Shadow Removal
  if (CONFIG.enableShadowRemoval) {
    gray = removeShadow(gray, w, h, CONFIG.shadowKernelSize);
    await saveGrayImage(gray, w, h, join(outDir, "step_05_shadow_removal.jpg"));
    console.log(`  [5] Shadow Removal      : ✅ (kernel=${CONFIG.shadowKernelSize})`);
  } else console.log(`  [5] Shadow Removal      : ⏭️ SKIP`);

  // ── Bước 6: Grid Line Removal
  if (CONFIG.enableGridRemoval) {
    gray = removeGridLines(gray, w, h, CONFIG.gridLineMinLength);
    await saveGrayImage(gray, w, h, join(outDir, "step_06_grid_removal.jpg"));
    console.log(`  [6] Grid Line Removal   : ✅ (minLen=${CONFIG.gridLineMinLength}px)`);
  } else console.log(`  [6] Grid Line Removal   : ⏭️ SKIP`);

  // ── Bước 7: CLAHE
  if (CONFIG.enableClahe) {
    gray = applyCLAHE(gray, w, h, CONFIG.claheClipLimit, CONFIG.claheTileGridSize);
    await saveGrayImage(gray, w, h, join(outDir, "step_07_clahe.jpg"));
    console.log(`  [7] CLAHE               : ✅ (clip=${CONFIG.claheClipLimit}, tiles=${CONFIG.claheTileGridSize})`);
  } else console.log(`  [7] CLAHE               : ⏭️ SKIP`);

  // ── Bước 8: Sharpen
  if (CONFIG.enableSharpen) {
    gray = sharpenText(gray, w, h, CONFIG.sharpenAmount);
    await saveGrayImage(gray, w, h, join(outDir, "step_08_sharpen.jpg"));
    console.log(`  [8] Sharpen             : ✅ (amount=${CONFIG.sharpenAmount})`);
  } else console.log(`  [8] Sharpen             : ⏭️ SKIP`);

  // ── Bước 9: Quality Assessment
  const quality = assessQuality(gray, w, h);
  console.log(`  [9] Quality Assessment  : ${quality.is_good ? "✅ TỐT" : "⚠️ " + quality.warnings.join(", ")}`);
  console.log(`       Blur: ${quality.blur_score} | Brightness: ${quality.brightness} | DarkRatio: ${quality.dark_pixel_ratio} | TextArea: ${quality.text_area_ratio}`);

  // ── Bước 10: Threshold
  gray = applyThresholdFn(gray, w, h, CONFIG.thresholdMode, CONFIG.adaptiveBlockSize, CONFIG.adaptiveC);
  await saveGrayImage(gray, w, h, join(outDir, "step_10_threshold.jpg"));
  console.log(`  [10] Threshold          : ✅ (mode=${CONFIG.thresholdMode}, C=${CONFIG.adaptiveC})`);

  const elapsed = Date.now() - start;
  console.log(`  ⏱️  Tổng thời gian: ${elapsed}ms`);

  // Lưu report JSON
  writeFileSync(join(outDir, "quality_report.json"), JSON.stringify({ fileName, config: CONFIG, quality, elapsed_ms: elapsed }, null, 2));

  return { fileName, quality, elapsed };
}

async function main() {
  if (!existsSync(INPUT_DIR)) { console.error(`❌ Thư mục ${INPUT_DIR} không tồn tại!`); process.exit(1); }

  const files = readdirSync(INPUT_DIR).filter(f => [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase()));
  if (files.length === 0) { console.error("❌ Không tìm thấy ảnh trong anhchuaxuly/"); process.exit(1); }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — TEST PIPELINE TIỀN XỬ LÝ ẢNH (10 BƯỚC)");
  console.log(`  Input: ${INPUT_DIR}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`  Ảnh: ${files.length}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const results = [];
  for (let i = 0; i < files.length; i++) {
    console.log(`\n[${i + 1}/${files.length}] ${files[i]}`);
    console.log("─".repeat(50));
    try {
      const r = await processImage(join(INPUT_DIR, files[i]), OUTPUT_DIR);
      results.push(r);
    } catch (err) {
      console.error(`  ❌ LỖI: ${err.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  TỔNG KẾT");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Thành công: ${results.length}/${files.length}`);
  if (results.length > 0) {
    const avgTime = results.reduce((s, r) => s + r.elapsed, 0) / results.length;
    console.log(`  Thời gian TB: ${avgTime.toFixed(0)}ms`);
    const good = results.filter(r => r.quality.is_good).length;
    console.log(`  Chất lượng tốt: ${good}/${results.length}`);
  }
  console.log(`\n  📂 Kết quả: ${OUTPUT_DIR}`);
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
