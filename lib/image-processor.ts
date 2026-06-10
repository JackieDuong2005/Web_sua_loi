/**
 * image-processor.ts — Pipeline tiền xử lý ảnh cho OCR chữ viết tay học sinh tiểu học.
 *
 * Port từ image_utils.py (Python/OpenCV) sang TypeScript/Jimp thuần.
 * Tối ưu cho: giấy ô ly, bút chì nhạt, ảnh chụp điện thoại, tiếng Việt có dấu.
 * Chỉ dùng: Jimp + thuật toán pixel-level thuần JS.
 */

import { Jimp } from "jimp";

// ═══════════════════════════════ CONFIG ═══════════════════════════════

export interface PreprocessConfig {
  resizeMaxWidth: number;
  enableWhiteBalance: boolean;
  enableShadowRemoval: boolean;
  shadowKernelSize: number;
  enableClahe: boolean;
  claheClipLimit: number;
  claheTileGridSize: number;
  enableSharpen: boolean;
  sharpenAmount: number;
  thresholdMode: "otsu" | "adaptive_gaussian" | "adaptive_mean";
  adaptiveBlockSize: number;
  adaptiveC: number;
  blurThreshold: number;
  brightnessLow: number;
  brightnessHigh: number;
  minResolution: number;
  minTextAreaRatio: number;
  enableDeskew: boolean;      // Tự động phát hiện và chỉnh góc nghiêng
  deskewMaxAngle: number;     // Góc tối đa tìm kiếm (độ), mặc định 15
}

export interface QualityReport {
  is_good: boolean;
  warnings: string[];
  blur_score: number;
  brightness: number;
  resolution: number;
  dark_pixel_ratio: number;
  text_area_ratio: number;
}

const DEFAULT_CONFIG: PreprocessConfig = {
  resizeMaxWidth: 1600,
  enableWhiteBalance: true,
  enableShadowRemoval: true,
  shadowKernelSize: 51,
  enableClahe: true,
  claheClipLimit: 2.0,
  claheTileGridSize: 8,
  enableSharpen: true,
  sharpenAmount: 0.5,
  thresholdMode: "adaptive_gaussian",
  adaptiveBlockSize: 0,
  adaptiveC: 20,
  blurThreshold: 80,
  brightnessLow: 50,
  brightnessHigh: 220,
  minResolution: 250,
  minTextAreaRatio: 0.005,
  enableDeskew: true,
  deskewMaxAngle: 15,
};

// ═══════════════════════════ HELPERS ═══════════════════════════════

/** Box blur O(1)/pixel bằng integral image — dùng cho shadow removal & sharpen */
function boxBlur(gray: Uint8Array, w: number, h: number, kernelSize: number): Uint8Array {
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
      const x1 = Math.max(0, x - half);
      const y1 = Math.max(0, y - half);
      const x2 = Math.min(w - 1, x + half);
      const y2 = Math.min(h - 1, y + half);
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

/** Tính ngưỡng Otsu tối ưu */
function otsuThreshold(gray: Uint8Array): number {
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const diff = sumB / wB - (sumAll - sumB) / wF;
    const variance = wB * wF * diff * diff;
    if (variance > best) { best = variance; threshold = t; }
  }
  return threshold;
}

/** Trích grayscale 1-channel từ RGBA buffer */
function rgbaToGray(data: Buffer | Uint8Array, n: number): Uint8Array {
  const g = new Uint8Array(n);
  for (let i = 0; i < n; i++) g[i] = data[i * 4];
  return g;
}

/** Ghi grayscale về RGBA buffer */
function grayToRgba(gray: Uint8Array, data: Buffer | Uint8Array, n: number): void {
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    data[idx] = data[idx + 1] = data[idx + 2] = gray[i];
    data[idx + 3] = 255;
  }
}

// ═══════════════════════ PROCESSING STEPS ═══════════════════════

/** 1. White Balance — Gray World Assumption (trên ảnh màu RGBA) */
function applyWhiteBalance(data: Buffer | Uint8Array, n: number): void {
  let sR = 0, sG = 0, sB = 0;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    sR += data[idx]; sG += data[idx + 1]; sB += data[idx + 2];
  }
  const aR = sR / n, aG = sG / n, aB = sB / n;
  const avg = (aR + aG + aB) / 3;
  const kR = aR > 0 ? avg / aR : 1, kG = aG > 0 ? avg / aG : 1, kB = aB > 0 ? avg / aB : 1;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    data[idx]     = Math.min(255, Math.round(data[idx] * kR));
    data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * kG));
    data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * kB));
  }
}

/** 2. Shadow Removal — chia ảnh cho background ước lượng bằng blur lớn */
function removeShadow(gray: Uint8Array, w: number, h: number, ks: number): Uint8Array {
  const bg = boxBlur(gray, w, h, ks);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    out[i] = bg[i] > 0 ? Math.min(255, Math.round((gray[i] / bg[i]) * 255)) : gray[i];
  }
  return out;
}

/** 3. CLAHE — Contrast Limited Adaptive Histogram Equalization */
function applyCLAHE(gray: Uint8Array, w: number, h: number, clipLimit: number, numTiles: number): Uint8Array {
  const tileW = Math.ceil(w / numTiles);
  const tileH = Math.ceil(h / numTiles);

  // Tính CDF cho mỗi tile
  const cdfs: Uint8Array[][] = [];
  for (let ty = 0; ty < numTiles; ty++) {
    cdfs[ty] = [];
    for (let tx = 0; tx < numTiles; tx++) {
      const hist = new Float64Array(256);
      let count = 0;
      const ys = ty * tileH, ye = Math.min(h, ys + tileH);
      const xs = tx * tileW, xe = Math.min(w, xs + tileW);
      for (let y = ys; y < ye; y++)
        for (let x = xs; x < xe; x++) { hist[gray[y * w + x]]++; count++; }

      // Clip histogram & redistribute
      if (count > 0) {
        const clip = clipLimit * count / 256;
        let excess = 0;
        for (let i = 0; i < 256; i++) {
          if (hist[i] > clip) { excess += hist[i] - clip; hist[i] = clip; }
        }
        const add = excess / 256;
        for (let i = 0; i < 256; i++) hist[i] += add;
      }

      // CDF
      const cdf = new Uint8Array(256);
      let cum = 0;
      for (let i = 0; i < 256; i++) {
        cum += hist[i];
        cdf[i] = count > 0 ? Math.min(255, Math.round((cum / count) * 255)) : i;
      }
      cdfs[ty][tx] = cdf;
    }
  }

  // Áp dụng với nội suy song tuyến giữa các tile
  const result = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const val = gray[y * w + x];
      const txF = (x / tileW) - 0.5, tyF = (y / tileH) - 0.5;
      const tx1 = Math.max(0, Math.floor(txF));
      const ty1 = Math.max(0, Math.floor(tyF));
      const tx2 = Math.min(numTiles - 1, tx1 + 1);
      const ty2 = Math.min(numTiles - 1, ty1 + 1);
      const fx = Math.max(0, Math.min(1, txF - tx1));
      const fy = Math.max(0, Math.min(1, tyF - ty1));
      const top = cdfs[ty1][tx1][val] * (1 - fx) + cdfs[ty1][tx2][val] * fx;
      const bot = cdfs[ty2][tx1][val] * (1 - fx) + cdfs[ty2][tx2][val] * fx;
      result[y * w + x] = Math.min(255, Math.max(0, Math.round(top * (1 - fy) + bot * fy)));
    }
  }
  return result;
}

/** 4. Sharpen Text — Unsharp Mask */
function sharpenText(gray: Uint8Array, w: number, h: number, amount: number): Uint8Array {
  const blurred = boxBlur(gray, w, h, 3);
  const out = new Uint8Array(w * h);
  const a = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.min(255, Math.max(0, Math.round(gray[i] + a * (gray[i] - blurred[i]))));
  }
  return out;
}

/** 5. Adaptive / Otsu Threshold */
function applyThreshold(
  gray: Uint8Array, w: number, h: number,
  mode: string, blockSize: number, c: number
): Uint8Array {
  const out = new Uint8Array(w * h);

  if (mode === "otsu") {
    const t = otsuThreshold(gray);
    for (let i = 0; i < out.length; i++) out[i] = gray[i] < t ? 0 : 255;
    return out;
  }

  // Adaptive threshold dùng integral image
  let bs = blockSize > 0 ? blockSize : Math.max(21, Math.floor(w / 40));
  if (bs % 2 === 0) bs++;
  const half = Math.floor(bs / 2);
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[y * w + x] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half), y1 = Math.max(0, y - half);
      const x2 = Math.min(w - 1, x + half), y2 = Math.min(h - 1, y + half);
      const cnt = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[y2 * w + x2]
        - (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0)
        - (x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0)
        + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0);
      out[y * w + x] = gray[y * w + x] < (sum / cnt - c) ? 0 : 255;
    }
  }
  return out;
}

// ═══════════════════════ QUALITY ASSESSMENT ═══════════════════════

/** Đánh giá chất lượng ảnh trước khi OCR */
function assessQuality(gray: Uint8Array, w: number, h: number, cfg: PreprocessConfig): QualityReport {
  const warnings: string[] = [];
  const n = gray.length;

  // Blur score — Laplacian variance (kernel 3×3 xấp xỉ)
  let lapSum = 0, lapSqSum = 0, lapCount = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const lap = gray[(y - 1) * w + x] + gray[(y + 1) * w + x]
        + gray[y * w + x - 1] + gray[y * w + x + 1] - 4 * gray[y * w + x];
      lapSum += lap; lapSqSum += lap * lap; lapCount++;
    }
  }
  const lapMean = lapSum / lapCount;
  const blur_score = Math.round((lapSqSum / lapCount - lapMean * lapMean) * 100) / 100;
  if (blur_score < cfg.blurThreshold) warnings.push("Ảnh bị mờ (blur score thấp)");

  // Brightness
  let brightSum = 0;
  for (let i = 0; i < n; i++) brightSum += gray[i];
  const brightness = Math.round((brightSum / n) * 100) / 100;
  if (brightness < cfg.brightnessLow) warnings.push("Ảnh quá tối");
  else if (brightness > cfg.brightnessHigh) warnings.push("Ảnh bị cháy sáng");

  // Resolution
  const resolution = Math.min(w, h);
  if (resolution < cfg.minResolution) warnings.push("Độ phân giải quá thấp");

  // Nét chữ nhạt
  let darkCount = 0;
  for (let i = 0; i < n; i++) if (gray[i] < 100) darkCount++;
  const dark_pixel_ratio = Math.round((darkCount / n) * 10000) / 10000;
  if (dark_pixel_ratio < 0.02) warnings.push("Nét chữ quá nhạt, khó nhận dạng");

  // Chữ quá nhỏ (dùng Otsu để tìm vùng chữ)
  const t = otsuThreshold(gray);
  let textPixels = 0;
  for (let i = 0; i < n; i++) if (gray[i] < t) textPixels++;
  const text_area_ratio = Math.round((textPixels / n) * 10000) / 10000;
  if (text_area_ratio < cfg.minTextAreaRatio) warnings.push("Chữ viết quá nhỏ hoặc ảnh chụp quá xa");

  return {
    is_good: warnings.length === 0,
    warnings,
    blur_score,
    brightness,
    resolution,
    dark_pixel_ratio,
    text_area_ratio,
  };
}

// ═══════════════════════ EXIF ROTATION ═══════════════════════

/**
 * Đọc EXIF Orientation tag từ raw JPEG buffer (thuần JS, không cần package).
 * Cấu trúc: FF E1 [len] 'Exif\0\0' [TIFF header] [IFD0 entries] ...
 * Tag Orientation = 0x0112, value offset phụ thuộc endian.
 */
function readExifOrientation(buf: Buffer): number {
  try {
    // Tìm APP1 marker (0xFF 0xE1)
    let offset = 2; // bỏ SOI (0xFF 0xD8)
    while (offset + 4 < buf.length) {
      if (buf[offset] !== 0xFF) break;
      const marker = buf[offset + 1];
      const segLen = buf.readUInt16BE(offset + 2);

      if (marker === 0xE1) { // APP1
        // Kiểm tra chữ ký 'Exif\0\0'
        if (buf.slice(offset + 4, offset + 10).toString("ascii") !== "Exif\0\0") break;

        const tiffBase = offset + 10;
        // TIFF header: byte order (II = little-endian, MM = big-endian)
        const littleEndian = buf.readUInt16BE(tiffBase) === 0x4949; // 'II'
        const read16 = (o: number) => littleEndian ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
        const read32 = (o: number) => littleEndian ? buf.readUInt32LE(o) : buf.readUInt32BE(o);

        // Offset tới IFD0 (tính từ tiffBase)
        const ifdOffset = tiffBase + read32(tiffBase + 4);
        const entryCount = read16(ifdOffset);

        for (let i = 0; i < entryCount; i++) {
          const entryBase = ifdOffset + 2 + i * 12;
          if (entryBase + 12 > buf.length) break;
          const tag = read16(entryBase);
          if (tag === 0x0112) { // Orientation
            return read16(entryBase + 8); // value (SHORT = 2 bytes tại value offset)
          }
        }
        break;
      }

      offset += 2 + segLen;
    }
  } catch { /* bỏ qua nếu không parse được */ }
  return 1; // mặc định = không xoay
}

/**
 * Áp dụng EXIF Orientation — xoay/lật ảnh Jimp về đúng chiều.
 * Jimp v1 KHÔNG tự xử lý EXIF — phải gọi hàm này thủ công.
 *
 * Orientation values (EXIF spec):
 *   1 = bình thường, 3 = 180°, 6 = 90° CW (điện thoại chụp ngang phải),
 *   8 = 90° CCW (điện thoại chụp ngang trái)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyExifRotation(image: any, rawBuffer: Buffer): void {
  const orientation = readExifOrientation(rawBuffer);
  switch (orientation) {
    case 2: image.flip({ horizontal: true }); break;
    case 3: image.rotate(180); break;
    case 4: image.flip({ vertical: true }); break;
    case 5: image.rotate(90); image.flip({ horizontal: true }); break;
    case 6: image.rotate(270); break;  // 90° CW → xoay ngược 270°
    case 7: image.rotate(270); image.flip({ horizontal: true }); break;
    case 8: image.rotate(90); break;   // 90° CCW
    default: break;                    // 1 = không cần xoay
  }
}

// ═══════════════════════ DESKEW (CHỈNH GÓC NGHIÊNG) ═══════════════════════

/**
 * Tính variance histogram hàng sau khi chiếu ảnh nhị phân theo góc thực.
 * Dùng tọa độ xoay cos/sin — KHÔNG dùng shear gần đúng.
 * Mỗi pixel tối được ánh xạ lên hàng trong không gian đã xoay,
 * rồi đếm số pixel/hàng. Variance lớn = chữ thẳng hàng = góc đúng.
 */
function rotatedProjectionVariance(
  binary: Uint8Array, w: number, h: number, angleDeg: number
): number {
  const rad    = (angleDeg * Math.PI) / 180;
  const cosA   = Math.cos(rad);
  const sinA   = Math.sin(rad);
  const cx     = w / 2;
  const cy     = h / 2;
  const newH   = Math.ceil(Math.abs(h * cosA) + Math.abs(w * Math.abs(sinA))) + 2;
  const offset = Math.floor(newH / 2);
  const counts = new Int32Array(newH);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (binary[y * w + x] === 0) {
        const ry = Math.round((x - cx) * sinA + (y - cy) * cosA) + offset;
        if (ry >= 0 && ry < newH) counts[ry]++;
      }
    }
  }

  let sum = 0;
  for (let i = 0; i < newH; i++) sum += counts[i];
  const mean = sum / newH;
  let variance = 0;
  for (let i = 0; i < newH; i++) { const d = counts[i] - mean; variance += d * d; }
  return variance / newH;
}

/**
 * Phát hiện góc nghiêng văn bản — thuật toán cải tiến:
 *   1. Downsample về ≤ 400px để tính nhanh trên RPi4
 *   2. Otsu threshold → ảnh nhị phân sạch (mực/nền)
 *   3. Lọc bỏ hàng đường kẻ ô ly (> 35% pixel đen = grid line)
 *   4. Tìm góc tốt nhất bước 1°, tinh chỉnh 0.1° trong ±1° quanh đó
 * Trả về góc (độ) cần xoay để chỉnh thẳng, 0 nếu ảnh đã thẳng (< 0.3°).
 */
function detectSkewAngle(gray: Uint8Array, w: number, h: number, maxAngle: number): number {
  // 1. Downsample
  let gw = w, gh = h, gg = gray;
  if (w > 400) {
    const scale = 400 / w;
    gw = Math.round(w * scale);
    gh = Math.round(h * scale);
    gg = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const sx = Math.min(Math.round(x / scale), w - 1);
        const sy = Math.min(Math.round(y / scale), h - 1);
        gg[y * gw + x] = gray[sy * w + sx];
      }
  }

  // 2. Otsu threshold → binary
  const thresh = otsuThreshold(gg);
  const binary = new Uint8Array(gw * gh);
  for (let i = 0; i < gg.length; i++) binary[i] = gg[i] < thresh ? 0 : 255;

  // 3. Lọc hàng grid-line (> 35% pixel đen = đường kẻ ô ly, không phải chữ)
  for (let y = 0; y < gh; y++) {
    let dark = 0;
    for (let x = 0; x < gw; x++) if (binary[y * gw + x] === 0) dark++;
    if (dark / gw > 0.35)
      for (let x = 0; x < gw; x++) binary[y * gw + x] = 255;
  }

  // 4. Tìm góc tốt nhất bước 1°
  let bestAngle = 0, bestVariance = -1;
  for (let a = -maxAngle; a <= maxAngle; a += 1.0) {
    const v = rotatedProjectionVariance(binary, gw, gh, a);
    if (v > bestVariance) { bestVariance = v; bestAngle = a; }
  }

  // 5. Tinh chỉnh bước 0.1° trong ±1° quanh góc tốt nhất
  for (let a = bestAngle - 1.0; a <= bestAngle + 1.0; a += 0.1) {
    const aa = Math.round(a * 10) / 10;
    const v = rotatedProjectionVariance(binary, gw, gh, aa);
    if (v > bestVariance) { bestVariance = v; bestAngle = aa; }
  }

  return Math.abs(bestAngle) > 0.3 ? Math.round(bestAngle * 10) / 10 : 0;
}

/**
 * Áp dụng deskew lên ảnh Jimp.
 * Tạo grayscale tạm để phân tích góc mà không thay đổi ảnh gốc màu.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deskewImage(image: any, cfg: PreprocessConfig): void {
  const w    = image.bitmap.width;
  const h    = image.bitmap.height;
  const data = image.bitmap.data as Buffer;

  const grayTemp = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx   = i * 4;
    grayTemp[i] = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
  }

  const angle = detectSkewAngle(grayTemp, w, h, cfg.deskewMaxAngle);
  if (angle !== 0) {
    // Văn bản nghiêng +angle° → xoay -angle° để chỉnh thẳng
    image.rotate(-angle);
  }
}

// ═══════════════════════ MAIN PIPELINE ═══════════════════════

/**
 * Pipeline tiền xử lý đầy đủ cho OCR chữ viết tay học sinh tiểu học.
 *
 * Pipeline:
 *   0. EXIF auto-rotate     — xoay đúng chiều theo metadata điện thoại
 *   0.5. Deskew             — tự động phát hiện & chỉnh góc nghiêng văn bản
 *   1. Resize               — giới hạn chiều rộng tối đa
 *   2. White balance        — cân bằng màu sắc
 *   3. Grayscale            — chuyển xám
 *   4. Shadow removal       — loại bóng đổ
 *   5. CLAHE                — tăng tương phản cục bộ
 *   6. Sharpen              — làm nét chữ
 *   7. Quality assessment   — đánh giá chất lượng
 *   8. Threshold            — nhị phân hóa
 *
 * @param base64Data - Ảnh dạng base64 (không có prefix data:...)
 * @param userConfig - Cấu hình tuỳ chỉnh (partial, merge với default)
 * @returns base64 string của ảnh đã xử lý (không prefix)
 */
export async function preprocessImage(
  base64Data: string,
  userConfig?: Partial<PreprocessConfig>
): Promise<{ processedBase64: string; quality: QualityReport }> {
  const cfg = { ...DEFAULT_CONFIG, ...userConfig };

  const buffer = Buffer.from(base64Data, "base64");
  const image = await Jimp.read(buffer);

  // 0. EXIF Orientation — xoay ảnh về đúng chiều trước khi xử lý
  //    (Jimp v1 không tự đọc EXIF, phải xử lý thủ công)
  applyExifRotation(image, buffer);

  // 0.5. Deskew — tự động phát hiện & chỉnh góc nghiêng văn bản
  //      Dùng Projection Profile: tìm góc làm histogram hàng có variance lớn nhất
  if (cfg.enableDeskew) deskewImage(image, cfg);

  // 1. Resize (sau khi đã xoay & deskew — width/height đã đúng)
  if (image.bitmap.width > cfg.resizeMaxWidth) {
    const ratio = cfg.resizeMaxWidth / image.bitmap.width;
    image.resize({ w: cfg.resizeMaxWidth, h: Math.round(image.bitmap.height * ratio) });
  }

  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const n = w * h;
  const data = image.bitmap.data;

  // 2. White balance (trên ảnh màu, trước khi chuyển grayscale)
  if (cfg.enableWhiteBalance) applyWhiteBalance(data, n);

  // 3. Grayscale
  image.greyscale();

  // Trích 1-channel để xử lý nhanh
  let gray = rgbaToGray(data, n);
  const originalGray = new Uint8Array(gray); // Giữ bản gốc để đánh giá chất lượng

  // 4. Shadow removal
  if (cfg.enableShadowRemoval) gray = removeShadow(gray, w, h, cfg.shadowKernelSize);

  // 5. CLAHE
  if (cfg.enableClahe) gray = applyCLAHE(gray, w, h, cfg.claheClipLimit, cfg.claheTileGridSize);

  // 6. Sharpen
  if (cfg.enableSharpen) gray = sharpenText(gray, w, h, cfg.sharpenAmount);

  // 7. Quality assessment (trước threshold để đo trên ảnh liên tục)
  const quality = assessQuality(originalGray, w, h, cfg);

  // 8. Threshold
  gray = applyThreshold(gray, w, h, cfg.thresholdMode, cfg.adaptiveBlockSize, cfg.adaptiveC);

  // Ghi kết quả về RGBA buffer
  grayToRgba(gray, data, n);

  // Export
  const resultBuffer = await image.getBuffer("image/jpeg");
  return { processedBase64: resultBuffer.toString("base64"), quality };
}

// ═══════════════════ BACKWARD-COMPATIBLE EXPORT ═══════════════════

/**
 * API tương thích ngược — dùng bởi /api/preprocess route.
 * Trả về base64 string (không prefix).
 */
export async function preprocessImageSimple(base64Data: string): Promise<string> {
  try {
    const { processedBase64 } = await preprocessImage(base64Data);
    return processedBase64;
  } catch (error) {
    console.error("Image processing error:", error);
    return base64Data;
  }
}
