/**
 * test_preprocessingv6.mjs — Pipeline V6: Hough Line Transform
 *
 * Cải tiến: Xóa đường kẻ ô ly bằng Hough Line Transform tối ưu.
 * Phát hiện đường thẳng ngang (kể cả hơi nghiêng) bằng vote trong không gian (rho, theta).
 *
 * Bước 0  : EXIF Auto-rotate
 * Bước 0.5: Deskew
 * Bước 1  : Resize
 * Bước 2  : White Balance
 * Bước 3  : Grayscale
 * Bước 4  : Shadow Removal
 * Bước 5.5: Hough Line Transform (MỚI) — phát hiện + xóa đường kẻ
 * Bước 6  : CLAHE
 * Bước 7  : Sharpen
 * Bước 7.5: Quality Assessment
 * Bước 8  : Adaptive Threshold
 *
 * Chạy: node test_preprocessingv6.mjs
 * Output: anhdaxulyv6/<tên_ảnh>/step_XX_*.jpg
 */

import { Jimp } from "jimp";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir    = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR  = join(__dir, "anhchuaxuly");
const OUTPUT_DIR = join(__dir, "anhdaxulyv6");


// ══════════════════ CẤU HÌNH V6 ══════════════════
const CONFIG = {
  enableDeskew: true, deskewMaxAngle: 15,
  resizeMaxWidth: 1600,
  enableWhiteBalance: true,
  enableShadowRemoval: true, shadowKernelSize: 51,
  // Bước 5.5 — Hough Line Transform (MỚI)
  enableHoughRemoval: true,
  houghAngleRange: 5,       // Phạm vi góc quét ±degree từ nằm ngang (0-15).
                             //   Nhỏ = chỉ xóa đường ngang thẳng. Lớn = xử lý được đường nghiêng.
  houghThetaStep: 0.5,      // Bước góc (degree). Nhỏ = chính xác hơn nhưng chậm hơn.
  houghEdgeThresh: 80,      // Ngưỡng Sobel để coi pixel là "cạnh" (0-255).
  houghMinVotes: 0,         // Votes tối thiểu để coi là đường kẻ (0 = tự tính w×0.25).
  houghSuppRadius: 8,       // Bán kính non-max suppression (px). Tăng → gộp đường kẻ gần nhau.
  houghLineWidth: 2,        // Độ rộng vùng xóa quanh mỗi đường kẻ (px mỗi phía).
  houghInkThresh: 120,      // Ngưỡng xám: pixel tối hơn = mực → không xóa.
  // Bước 6 — CLAHE
  enableClahe: true, claheClipLimit: 2.0, claheTileGridSize: 8,
  // Bước 7 — Sharpen
  enableSharpen: true, sharpenAmount: 0.5,
  // Bước 8 — Threshold
  thresholdMode: "adaptive_gaussian", adaptiveBlockSize: 0, adaptiveC: 20,
  blurThreshold: 80, brightnessLow: 50, brightnessHigh: 220,
  minResolution: 250, minTextAreaRatio: 0.005,
};
// ══════════════════════════════════════════════════════

// ─── HELPERS ───

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

// ─── BƯỚC 0: EXIF Auto-rotate (đọc thủ công, Jimp v1 không tự xử lý) ───
function readExifOrientation(buf) {
  try {
    let offset = 2;
    while (offset + 4 < buf.length) {
      if (buf[offset] !== 0xFF) break;
      const marker = buf[offset + 1];
      const segLen = buf.readUInt16BE(offset + 2);
      if (marker === 0xE1) {
        if (buf.slice(offset + 4, offset + 10).toString("ascii") !== "Exif\0\0") break;
        const tiffBase = offset + 10;
        const le = buf.readUInt16BE(tiffBase) === 0x4949;
        const r16 = o => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
        const r32 = o => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
        const ifdOffset = tiffBase + r32(tiffBase + 4);
        const count = r16(ifdOffset);
        for (let i = 0; i < count; i++) {
          const base = ifdOffset + 2 + i * 12;
          if (base + 12 > buf.length) break;
          if (r16(base) === 0x0112) return r16(base + 8);
        }
        break;
      }
      offset += 2 + segLen;
    }
  } catch { /* bỏ qua */ }
  return 1;
}

function applyExifRotation(image, buf) {
  const o = readExifOrientation(buf);
  switch (o) {
    case 2: image.flip({ horizontal: true }); break;
    case 3: image.rotate(180); break;
    case 4: image.flip({ vertical: true }); break;
    case 5: image.rotate(90); image.flip({ horizontal: true }); break;
    case 6: image.rotate(270); break;
    case 7: image.rotate(270); image.flip({ horizontal: true }); break;
    case 8: image.rotate(90); break;
    default: break;
  }
  return o;
}

// ─── BƯỚC 0.5: Deskew (Rotated Projection Profile + Otsu + lọc grid-line) ───
function rotatedProjectionVariance(binary, w, h, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);
  const cx = w / 2, cy = h / 2;
  const newH = Math.ceil(Math.abs(h * cosA) + Math.abs(w * Math.abs(sinA))) + 2;
  const offset = Math.floor(newH / 2);
  const counts = new Int32Array(newH);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (binary[y * w + x] === 0) {
        const ry = Math.round((x - cx) * sinA + (y - cy) * cosA) + offset;
        if (ry >= 0 && ry < newH) counts[ry]++;
      }
  let sum = 0;
  for (let i = 0; i < newH; i++) sum += counts[i];
  const mean = sum / newH;
  let variance = 0;
  for (let i = 0; i < newH; i++) { const d = counts[i] - mean; variance += d * d; }
  return variance / newH;
}

function detectSkewAngle(gray, w, h, maxAngle) {
  // Downsample
  let gw = w, gh = h, gg = gray;
  if (w > 400) {
    const scale = 400 / w;
    gw = Math.round(w * scale); gh = Math.round(h * scale);
    gg = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const sx = Math.min(Math.round(x / scale), w - 1);
        const sy = Math.min(Math.round(y / scale), h - 1);
        gg[y * gw + x] = gray[sy * w + sx];
      }
  }
  // Otsu threshold
  const thresh = otsuThreshold(gg);
  const binary = new Uint8Array(gw * gh);
  for (let i = 0; i < gg.length; i++) binary[i] = gg[i] < thresh ? 0 : 255;
  // Lọc grid-line
  for (let y = 0; y < gh; y++) {
    let dark = 0;
    for (let x = 0; x < gw; x++) if (binary[y * gw + x] === 0) dark++;
    if (dark / gw > 0.35)
      for (let x = 0; x < gw; x++) binary[y * gw + x] = 255;
  }
  // Tìm góc tốt nhất bước 1°
  let bestAngle = 0, bestVariance = -1;
  for (let a = -maxAngle; a <= maxAngle; a += 1.0) {
    const v = rotatedProjectionVariance(binary, gw, gh, a);
    if (v > bestVariance) { bestVariance = v; bestAngle = a; }
  }
  // Tinh chỉnh bước 0.1°
  for (let a = bestAngle - 1.0; a <= bestAngle + 1.0; a += 0.1) {
    const aa = Math.round(a * 10) / 10;
    const v = rotatedProjectionVariance(binary, gw, gh, aa);
    if (v > bestVariance) { bestVariance = v; bestAngle = aa; }
  }
  return Math.abs(bestAngle) > 0.3 ? Math.round(bestAngle * 10) / 10 : 0;
}

function deskewImageStep(image) {
  const w = image.bitmap.width, h = image.bitmap.height;
  const data = image.bitmap.data;
  const grayTemp = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    grayTemp[i] = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
  }
  const angle = detectSkewAngle(grayTemp, w, h, CONFIG.deskewMaxAngle);
  if (angle !== 0) image.rotate(-angle);
  return angle;
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

// ─── BƯỚC 6: CLAHE ───
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

// ─── BƯỚC 7: Sharpen ───
function sharpenText(gray, w, h, amount) {
  const blurred = boxBlur(gray, w, h, 3);
  const out = new Uint8Array(w * h);
  const a = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < out.length; i++) out[i] = Math.min(255, Math.max(0, Math.round(gray[i] + a * (gray[i] - blurred[i]))));
  return out;
}

// ─── BƯỚC 8: Quality Assessment ───
function assessQuality(gray, w, h, cfg) {
  const n = gray.length, warnings = [];
  let lapSum = 0, lapSqSum = 0, lapCount = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const lap = gray[(y - 1) * w + x] + gray[(y + 1) * w + x] + gray[y * w + x - 1] + gray[y * w + x + 1] - 4 * gray[y * w + x];
    lapSum += lap; lapSqSum += lap * lap; lapCount++;
  }
  const lapMean = lapSum / lapCount;
  const blur_score = Math.round((lapSqSum / lapCount - lapMean * lapMean) * 100) / 100;
  if (blur_score < cfg.blurThreshold) warnings.push("Ảnh bị mờ");
  
  let brightSum = 0;
  for (let i = 0; i < n; i++) brightSum += gray[i];
  const brightness = Math.round((brightSum / n) * 100) / 100;
  if (brightness < cfg.brightnessLow) warnings.push("Ảnh quá tối");
  else if (brightness > cfg.brightnessHigh) warnings.push("Ảnh cháy sáng");
  
  const resolution = Math.min(w, h);
  if (resolution < cfg.minResolution) warnings.push("Độ phân giải quá thấp");

  let darkCount = 0;
  for (let i = 0; i < n; i++) if (gray[i] < 100) darkCount++;
  const dark_pixel_ratio = Math.round((darkCount / n) * 10000) / 10000;
  if (dark_pixel_ratio < 0.02) warnings.push("Nét chữ quá nhạt");
  
  const t = otsuThreshold(gray);
  let textPixels = 0;
  for (let i = 0; i < n; i++) if (gray[i] < t) textPixels++;
  const text_area_ratio = Math.round((textPixels / n) * 10000) / 10000;
  if (text_area_ratio < cfg.minTextAreaRatio) warnings.push("Chữ quá nhỏ");
  
  return { is_good: warnings.length === 0, warnings, blur_score, brightness, resolution, dark_pixel_ratio, text_area_ratio };
}

// ─── BƯỚC 9: Threshold ───
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



// ─── BƯỚC 5.5: Hough Line Transform ──────────────────────────────────────────
//
// Thuật toán:
//   1. Otsu threshold → binary; Sobel Y → cạnh ngang
//   2. Hough accumulator: mỗi edge pixel (x,y) vote cho
//      rho = x·cos(θ) + y·sin(θ) với θ ∈ [90°-range, 90°+range]
//      (chỉ quét góc gần nằm ngang → nhanh hơn Hough đầy đủ)
//   3. Tìm peak (rho, θ) với votes > minVotes → đây là đường kẻ ô ly
//   4. Non-maximum suppression để gộp các line gần nhau
//   5. Xóa đường kẻ: với mỗi peak, set pixel trong băng ±lineWidth về trắng
//      → CHỈ xóa pixel sáng (gray > inkThresh), bảo toàn mực chữ
//
// Ưu điểm so với Morphological (V2):
//   - Phát hiện cả đường kẻ hơi nghiêng (không cần deskew hoàn hảo)
//   - Không cần biết trước khoảng cách đường kẻ
//   - Có thể xóa chính xác từng đường kẻ theo góc thực của nó

/** Sobel Y kernel — phát hiện cạnh ngang (horizontal edges) */
function sobelY(gray, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const gy = Math.abs(
        -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
        +gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)]
      );
      out[y*w+x] = Math.min(255, gy >> 2); // scale down để tránh overflow
    }
  }
  return out;
}

/**
 * Hough Line Transform tối ưu cho đường kẻ ngang.
 * Chỉ quét θ ∈ [90° - angleRange, 90° + angleRange] để tăng tốc độ.
 */
function houghLineRemoval(gray, w, h, cfg) {
  // 1. Binary + edge detection
  const t      = otsuThreshold(gray);
  const binary = new Uint8Array(w*h);
  for (let i = 0; i < gray.length; i++) binary[i] = gray[i] < t ? 0 : 255;
  const edges  = sobelY(binary, w, h);

  // 2. Thiết lập tham số Hough
  const aRange  = cfg.houghAngleRange || 5;       // ±degrees
  const aStep   = cfg.houghThetaStep  || 0.5;     // degree per step
  const edgeThr = cfg.houghEdgeThresh || 80;
  const nTheta  = Math.round(2 * aRange / aStep) + 1;
  const thetas  = Array.from({length: nTheta}, (_, i) => (90 - aRange + i * aStep) * Math.PI / 180);
  const diag    = Math.ceil(Math.sqrt(w*w + h*h));
  const nRho    = 2 * diag + 1;

  // Accumulator [theta_idx][rho_idx]
  const acc = new Int32Array(nTheta * nRho);

  // 3. Vote
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y*w+x] <= edgeThr) continue;
      for (let ti = 0; ti < nTheta; ti++) {
        const rho = Math.round(x * Math.cos(thetas[ti]) + y * Math.sin(thetas[ti]));
        const ri  = rho + diag;
        if (ri >= 0 && ri < nRho) acc[ti * nRho + ri]++;
      }
    }
  }

  // 4. Tìm peaks + non-max suppression
  const minVotes  = cfg.houghMinVotes > 0 ? cfg.houghMinVotes : Math.round(w * 0.25);
  const suppR     = cfg.houghSuppRadius || 8;
  const lines     = [];

  for (let ti = 0; ti < nTheta; ti++) {
    for (let ri = 0; ri < nRho; ri++) {
      const votes = acc[ti * nRho + ri];
      if (votes < minVotes) continue;
      // Non-max suppression: kiểm tra hàng xóm
      let isMax = true;
      outer: for (let dt = -1; dt <= 1 && isMax; dt++) {
        for (let dr = -suppR; dr <= suppR; dr++) {
          const nti = ti + dt, nri = ri + dr;
          if (nti < 0 || nti >= nTheta || nri < 0 || nri >= nRho) continue;
          if ((dt !== 0 || dr !== 0) && acc[nti * nRho + nri] >= votes)
            { isMax = false; break outer; }
        }
      }
      if (isMax) {
        const theta = thetas[ti];
        const rho   = ri - diag;
        lines.push({ theta, rho, votes });
      }
    }
  }

  // 5. Xóa đường kẻ
  const result    = new Uint8Array(gray);
  const lineWidth = cfg.houghLineWidth || 2;
  const inkThr    = cfg.houghInkThresh || 120;

  for (const line of lines) {
    const { theta, rho } = line;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dist = Math.abs(x * cosT + y * sinT - rho);
        if (dist <= lineWidth && gray[y*w+x] > inkThr) {
          result[y*w+x] = 255; // xóa về trắng (chỉ pixel sáng, bảo toàn mực)
        }
      }
    }
  }

  return { result, lineCount: lines.length };
}


// ═══════════════════ MAIN ═══════════════════

async function processImage(inputPath, outputSubDir) {
  const fileName = basename(inputPath, extname(inputPath));
  const outDir = join(outputSubDir, fileName);
  mkdirSync(outDir, { recursive: true });

  const buffer = readFileSync(inputPath);
  const start = Date.now();

  // ── Bước 0: EXIF Auto-rotate (thủ công — Jimp v1 không tự xử lý EXIF)
  const image = await Jimp.read(buffer);
  const exifOrientation = applyExifRotation(image, buffer);
  await saveJimpImage(image, join(outDir, "step_00_exif_rotate.jpg"));
  console.log(`  [0] EXIF Auto-rotate    : orientation=${exifOrientation} → ${image.bitmap.width}x${image.bitmap.height}`);

  // ── Bước 0.5: Deskew (Rotated Projection Profile)
  if (CONFIG.enableDeskew) {
    const angle = deskewImageStep(image);
    await saveJimpImage(image, join(outDir, "step_00b_deskew.jpg"));
    console.log(`  [0.5] Deskew            : ${angle !== 0 ? `✅ xoay ${-angle}°` : "⏭️ ảnh đã thẳng (< 0.3°)"}`);
  } else {
    console.log(`  [0.5] Deskew            : ⏭️ SKIP`);
  }

  // ── Bước 1: Resize
  const origW = image.bitmap.width, origH = image.bitmap.height;
  if (origW > CONFIG.resizeMaxWidth) {
    const ratio = CONFIG.resizeMaxWidth / origW;
    image.resize({ w: CONFIG.resizeMaxWidth, h: Math.round(origH * ratio) });
  }
  await saveJimpImage(image, join(outDir, "step_01_resize.jpg"));
  console.log(`  [1] Resize (max ${CONFIG.resizeMaxWidth}px) : ${image.bitmap.width}x${image.bitmap.height}`);

  const w = image.bitmap.width, h = image.bitmap.height, n = w * h;
  const data = image.bitmap.data;

  // ── Bước 2: White Balance
  if (CONFIG.enableWhiteBalance) {
    applyWhiteBalance(data, n);
    await saveJimpImage(image, join(outDir, "step_02_white_balance.jpg"));
    console.log(`  [2] White Balance       : ✅ (Gray World Assumption)`);
  } else console.log(`  [2] White Balance       : ⏭️ SKIP`);

  // ── Bước 3: Grayscale
  image.greyscale();
  await saveJimpImage(image, join(outDir, "step_03_grayscale.jpg"));
  console.log(`  [3] Grayscale           : ✅`);

  let gray = rgbaToGray(data, n);
  const originalGray = new Uint8Array(gray); // Giữ bản gốc để đánh giá chất lượng

  // ── Bước 4: Shadow Removal
  if (CONFIG.enableShadowRemoval) {
    gray = removeShadow(gray, w, h, CONFIG.shadowKernelSize);
    await saveGrayImage(gray, w, h, join(outDir, "step_04_shadow_removal.jpg"));
    console.log(`  [4] Shadow Removal      : ✅ (kernel=${CONFIG.shadowKernelSize})`);
  } else console.log(`  [4] Shadow Removal      : ⏭️ SKIP`);

    // ── Bước 4.5: Hough Line Transform — Xóa đường kẻ ô ly (MỚI)
  if (CONFIG.enableHoughRemoval) {
    const { result: grayH, lineCount } = houghLineRemoval(gray, w, h, CONFIG);
    gray = grayH;
    await saveGrayImage(gray, w, h, join(outDir, "step_04b_hough_removed.jpg"));
    console.log(`  [4.5] Hough Line Removal: ✅ (detected ${lineCount} lines | minVotes=${CONFIG.houghMinVotes||Math.round(w*0.25)} angleRange=±${CONFIG.houghAngleRange}°)`);
  } else {
    console.log(`  [4.5] Hough Line Removal: ⏭️ SKIP`);
  }

  // ── Bước 5: CLAHE
  if (CONFIG.enableClahe) {
    gray = applyCLAHE(gray, w, h, CONFIG.claheClipLimit, CONFIG.claheTileGridSize);
    await saveGrayImage(gray, w, h, join(outDir, "step_05_clahe.jpg"));
    console.log(`  [5] CLAHE               : ✅ (clip=${CONFIG.claheClipLimit}, tiles=${CONFIG.claheTileGridSize})`);
  } else console.log(`  [5] CLAHE               : ⏭️ SKIP`);

  // ── Bước 6: Sharpen
  if (CONFIG.enableSharpen) {
    gray = sharpenText(gray, w, h, CONFIG.sharpenAmount);
    await saveGrayImage(gray, w, h, join(outDir, "step_06_sharpen.jpg"));
    console.log(`  [6] Sharpen             : ✅ (amount=${CONFIG.sharpenAmount})`);
  } else console.log(`  [6] Sharpen             : ⏭️ SKIP`);

  // ── Bước 7: Quality Assessment
  const quality = assessQuality(originalGray, w, h, CONFIG);
  console.log(`  [7] Quality Assessment  : ${quality.is_good ? "✅ TỐT" : "⚠️ " + quality.warnings.join(", ")}`);
  console.log(`       Blur: ${quality.blur_score} | Brightness: ${quality.brightness} | DarkRatio: ${quality.dark_pixel_ratio} | TextArea: ${quality.text_area_ratio}`);

  // ── Bước 8: Threshold
  gray = applyThresholdFn(gray, w, h, CONFIG.thresholdMode, CONFIG.adaptiveBlockSize, CONFIG.adaptiveC);
  await saveGrayImage(gray, w, h, join(outDir, "step_08_threshold.jpg"));
  console.log(`  [8] Threshold           : ✅ (mode=${CONFIG.thresholdMode}, C=${CONFIG.adaptiveC})`);

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
  console.log("  VIHAND GRADE — TEST PIPELINE TIỀN XỬ LÝ ẢNH (12 BƯỚC (Hough Line V6))");
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
