/**
 * test_preprocessingv3+5.mjs — Pipeline V3+V5: Kết hợp BG Estimation + Color Grid Removal
 *
 * Kết hợp 2 thuật toán mạnh nhất:
 *   V5 (Color HSV): Xóa đường kẻ có màu TRƯỚC khi chuyển grayscale (khai thác thông tin màu)
 *   V3 (BG Est.)  : Chuẩn hóa ánh sáng SAU grayscale bằng Multi-Scale Background Division
 *
 * Pipeline:
 *   [0]   EXIF Auto-rotate
 *   [0.5] Deskew
 *   [1]   Resize
 *   [2]   White Balance
 *   [3]   Color Grid Removal (V5) — trên RGB, xóa đường kẻ có màu → trắng
 *   [4]   Grayscale
 *   [5]   BG Estimation + Division (V3) — chuẩn hóa bóng và nền không đều
 *   [6]   CLAHE
 *   [7]   Sharpen
 *   [7.5] Quality Assessment
 *   [8]   Adaptive Threshold
 *
 * Chạy: node "test_preprocessingv3+5.mjs"
 * Output: anhdaxulyv3p5/<tên_ảnh>/step_XX_*.jpg
 */

import { Jimp } from "jimp";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir    = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR  = join(__dir, "anhchuaxuly");
const OUTPUT_DIR = join(__dir, "anhdaxulyv3p5");


// ══════════════════ CẤU HÌNH V3+V5 ══════════════════
const CONFIG = {
  enableDeskew: true, deskewMaxAngle: 15,
  resizeMaxWidth: 1600,
  enableWhiteBalance: true,
  // ── Bước 3 (V5): Color-Adaptive Grid Removal (trên RGB, TRƯỚC grayscale)
  enableColorGridRemoval: true,
  gridMinBrightness: 0.55,  // Ngưỡng V (HSV): pixel sáng hơn mới xét. Giảm → nhạy hơn.
  gridMinSaturation: 0.04,  // Ngưỡng S (HSV): pixel có màu mới xét. Giảm → nhạy hơn.
  gridHueMin: -1,           // -1 = bỏ qua lọc hue (xóa mọi đường kẻ có màu).
  gridHueMax: -1,           // Đặt 190-250 để chỉ xóa đường kẻ màu xanh dương.
  gridRepairRadius: 1,      // Blend biên sau khi xóa (0 = tắt).
  // ── Bước 5 (V3): Multi-Scale Background Estimation + Division (thay Shadow Removal)
  bgScales: [31, 61, 101],  // Kích thước blur đa tỷ lệ (px, phải lẻ).
  bgDivGamma: 1.0,          // Gamma trước chia (1.0 = tắt).
  bgBrightClip: 240,        // Clip background max để tránh noise.
  // ── Bước 6: CLAHE
  enableClahe: true, claheClipLimit: 2.0, claheTileGridSize: 8,
  // ── Bước 7: Sharpen
  enableSharpen: true, sharpenAmount: 0.6,  // Tăng nhẹ vì ảnh sau BG div mượt hơn.
  // ── Bước 8: Threshold
  thresholdMode: "adaptive_gaussian", adaptiveBlockSize: 0, adaptiveC: 18,
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



// ─── FUNCTIONS V3: Background Estimation + Division ──────────────────────────
function estimateBackground(gray, w, h, scales) {
  const n = w * h, bg = new Uint8Array(n);
  for (const ks of scales) {
    const blurred = boxBlur(gray, w, h, ks);
    for (let i = 0; i < n; i++) if (blurred[i] > bg[i]) bg[i] = blurred[i];
  }
  return bg;
}

function divideByBackground(gray, bg, n, gamma, brightClip) {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const bgVal = Math.min(bg[i], brightClip);
    if (bgVal < 10) { out[i] = gray[i]; continue; }
    let px = gray[i];
    if (gamma !== 1.0) px = Math.round(255 * Math.pow(px / 255, gamma));
    out[i] = Math.min(255, Math.round((px / bgVal) * 255));
  }
  return out;
}


// ─── FUNCTIONS V5: Color-Adaptive Grid Removal ───────────────────────────────
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  const v = max, s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) {
    if      (max === r) h = ((g-b)/d + 6) % 6;
    else if (max === g) h = (b-r)/d + 2;
    else                h = (r-g)/d + 4;
    h *= 60;
  }
  return [h, s, v];
}

function colorGridRemoval(data, w, h, cfg) {
  const n = w * h;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const [hue, sat, val] = rgbToHsv(data[i*4], data[i*4+1], data[i*4+2]);
    const isBright  = val > cfg.gridMinBrightness;
    const isColored = sat > cfg.gridMinSaturation;
    let inHue = true;
    if (cfg.gridHueMin >= 0 && cfg.gridHueMax >= 0)
      inHue = hue >= cfg.gridHueMin && hue <= cfg.gridHueMax;
    if (isBright && isColored && inHue) mask[i] = 1;
  }
  // Lọc run-length (≥3 pixel liên tiếp ngang)
  const cleanMask = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && mask[y*w+x] === 1) { run++; }
      else {
        if (run >= 3) for (let k = x - run; k < x; k++) cleanMask[y*w+k] = 1;
        run = 0;
      }
    }
  }
  // Xóa → trắng
  let removed = 0;
  for (let i = 0; i < n; i++) {
    if (cleanMask[i] === 1) { data[i*4] = data[i*4+1] = data[i*4+2] = 255; removed++; }
  }
  // Repair blend
  if (cfg.gridRepairRadius > 0) {
    const rr = cfg.gridRepairRadius;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (cleanMask[y*w+x] === 1) continue;
      let nw = 0, tot = (2*rr+1)*(2*rr+1);
      for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        const ny = y+dy, nx = x+dx;
        if (ny>=0&&ny<h&&nx>=0&&nx<w&&cleanMask[ny*w+nx]===1) nw++;
      }
      if (nw > tot*0.4) {
        const b = nw/tot, idx = (y*w+x)*4;
        data[idx]  =Math.min(255,Math.round(data[idx]  +b*(255-data[idx])));
        data[idx+1]=Math.min(255,Math.round(data[idx+1]+b*(255-data[idx+1])));
        data[idx+2]=Math.min(255,Math.round(data[idx+2]+b*(255-data[idx+2])));
      }
    }
  }
  return removed;
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

    // ── Bước 3: Color-Adaptive Grid Removal (V5 — trên kênh màu RGB)
  if (CONFIG.enableColorGridRemoval) {
    const removedPx = colorGridRemoval(data, w, h, CONFIG);
    await saveJimpImage(image, join(outDir, "step_03_color_grid_removed.jpg"));
    console.log(`  [3] Color Grid Removal  : ✅ (removed ${removedPx} px = ${(removedPx/n*100).toFixed(1)}%)`);
  } else console.log(`  [3] Color Grid Removal  : ⏭️ SKIP`);

  // ── Bước 4: Grayscale
  image.greyscale();
  await saveJimpImage(image, join(outDir, "step_03_grayscale.jpg"));
  console.log(`  [3] Grayscale           : ✅`);

  let gray = rgbaToGray(data, n);
  const originalGray = new Uint8Array(gray); // Giữ bản gốc để đánh giá chất lượng

    // ── Bước 5: BG Estimation + Division (V3 — thay Shadow Removal)
  {
    const bg = estimateBackground(gray, w, h, CONFIG.bgScales);
    await saveGrayImage(bg, w, h, join(outDir, "step_05a_bg_estimate.jpg"));
    gray = divideByBackground(gray, bg, w * h, CONFIG.bgDivGamma, CONFIG.bgBrightClip);
    await saveGrayImage(gray, w, h, join(outDir, "step_05b_bg_normalized.jpg"));
    console.log(`  [5] BG Estimation+Div   : ✅ (scales=[${CONFIG.bgScales}], gamma=${CONFIG.bgDivGamma}, clip=${CONFIG.bgBrightClip})`);
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
  console.log("  VIHAND GRADE — TEST PIPELINE TIỀN XỬ LÝ ẢNH (13 BƯỚC (V3+V5))");
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
