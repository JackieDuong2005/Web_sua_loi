// 02_Kich_ban_Thuc_nghiem/test_gemini_ocr.js
import { GoogleGenAI } from "@google/genai";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Đọc API keys từ .env.local
const envContent = readFileSync(join(process.cwd(), "..", ".env.local"), "utf8");
const match = envContent.match(/GEMINI_API_KEYS=(.*)/);
if (!match) {
  console.error("❌ Không tìm thấy GEMINI_API_KEYS trong .env.local");
  process.exit(1);
}

const keys = match[1].split(",").map(k => k.trim()).filter(k => k.length > 10);
console.log(`🔑 Tìm thấy ${keys.length} API keys trong .env.local`);

const GEMINI_MODEL = "gemini-3.1-flash-lite";

const OCR_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên sửa bài chính tả. Phân tích đoạn văn của học sinh được cung cấp trong ảnh, nhận diện chữ viết và sửa lại cho đúng chính tả. Trả về duy nhất định dạng JSON.

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

async function callGeminiOCRWithRotation(keysList, imageBase64) {
  console.log("\n--- BẮT ĐẦU CHẠY KIỂM THỬ XOAY VÒNG KEY ---");
  for (let i = 0; i < keysList.length; i++) {
    const key = keysList[i];
    console.log(`[Thử nghiệm #${i + 1}] Đang thử Key: ${key.substring(0, 10)}... (Độ dài: ${key.length})`);
    
    // Nếu là key giả lập lỗi (giả lập TC-OCR-02)
    if (key.startsWith("FAKE_INVALID_KEY")) {
      console.warn(`[OCR ERROR] Key #${i + 1} lỗi (giả lập 429 hoặc Key hỏng) -> Tự động xoay sang key tiếp theo.`);
      continue;
    }

    try {
      const client = new GoogleGenAI({ apiKey: key });
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          OCR_PROMPT,
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.05,
        },
      });

      const rawText = response.text ?? "";
      if (!rawText.trim()) {
        console.warn(`[OCR WARNING] Key #${i + 1} trả về rỗng → thử key tiếp`);
        continue;
      }

      // Parse JSON
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      
      const parsed = JSON.parse(cleaned);
      return {
        success: true,
        keyIndex: i + 1,
        keyUsed: key.substring(0, 10) + "...",
        original_text: parsed.original_text,
        fixed_text: parsed.fixed_text
      };
    } catch (err) {
      console.warn(`[OCR ERROR] Key #${i + 1} gặp lỗi: ${err.message || err} -> Thử key tiếp theo.`);
    }
  }
  throw new Error("Tất cả API key đều lỗi hoặc hết quota.");
}

async function run() {
  const imagePath = join(process.cwd(), "anhchuaxuly", "chuviettay1.jpg");
  if (!existsSync(imagePath)) {
    console.error(`❌ Không tìm thấy ảnh tại ${imagePath}`);
    process.exit(1);
  }
  
  const base64Image = readFileSync(imagePath).toString("base64");
  
  // 1. Kiểm thử TC-OCR-01: Nhận diện chính xác chữ viết tay tiếng Việt
  console.log("--------------------------------------------------");
  console.log("TC-OCR-01: Nhận diện chính xác chữ viết tay tiếng Việt nguyên bản");
  try {
    const result = await callGeminiOCRWithRotation(keys, base64Image);
    console.log("✅ TC-OCR-01 THÀNH CÔNG!");
    console.log(`  Key đã dùng thành công: ${result.keyUsed}`);
    console.log(`  [Chữ nguyên bản nhận diện]  : "${result.original_text}"`);
    console.log(`  [Chữ đã sửa bởi Gemini]     : "${result.fixed_text}"`);
  } catch (err) {
    console.error("❌ TC-OCR-01 THẤT BẠI:", err.message);
  }

  // 2. Kiểm thử TC-OCR-02: Cơ chế xoay vòng Key khi gặp lỗi (Rate limit 429 hoặc Key hỏng)
  console.log("--------------------------------------------------");
  console.log("TC-OCR-02: Kiểm thử cơ chế xoay vòng API Keys");
  // Thêm 2 fake keys lỗi vào đầu danh sách để giả lập lỗi
  const testKeysWithErrors = ["FAKE_INVALID_KEY_1", "FAKE_INVALID_KEY_2", ...keys];
  try {
    const result = await callGeminiOCRWithRotation(testKeysWithErrors, base64Image);
    console.log("✅ TC-OCR-02 THÀNH CÔNG!");
    console.log(`  Mặc dù 2 key đầu tiên bị lỗi, hệ thống vẫn xoay vòng thành công và sử dụng Key thứ #${result.keyIndex}`);
    console.log(`  Key đã dùng thành công: ${result.keyUsed}`);
    console.log(`  [Chữ nguyên bản nhận diện]  : "${result.original_text}"`);
  } catch (err) {
    console.error("❌ TC-OCR-02 THẤT BẠI:", err.message);
  }
}

run().catch(console.error);
