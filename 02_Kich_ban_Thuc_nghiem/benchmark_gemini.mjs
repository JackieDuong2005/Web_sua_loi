// benchmark_gemini.mjs
// Test thực tế Gemini API với nhiều mẫu văn bản chính tả tiểu học
// Chạy: node benchmark_gemini.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ── Load API key từ .env.local ──────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(join(__dir, ".env.local"), "utf-8");
const GEMINI_API_KEY = envRaw.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
if (!GEMINI_API_KEY) {
  console.error("❌ Không tìm thấy GEMINI_API_KEY trong .env.local");
  process.exit(1);
}

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── System prompt (copy từ app/api/grade/route.ts) ──────────────────────────
const GRADING_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên chấm bài chính tả. Phân tích đoạn văn của học sinh được cung cấp, sửa lỗi chính tả và chấm điểm theo barem chuẩn. Trả về duy nhất định dạng JSON.

=== BAREM CHẤM ĐIỂM (thang 10) ===
[A] CHÍNH TẢ & NGỮ PHÁP — Tối đa 4.0đ. Điểm khởi đầu 4.0đ. Lớp 1–3: trừ 0.5đ/lỗi. Lỗi lặp chỉ trừ 1 lần.
[B] HÌNH THỨC — Tối đa 3.0đ (chữ đẹp/rõ)
[C] NỘI DUNG & Ý TƯỞNG — Tối đa 2.0đ
[D] SÁNG TẠO — Tối đa 1.0đ (từ láy, so sánh, nhân hóa)
Xếp loại: ≥9.0 Xuất sắc | ≥7.0 Tốt | ≥5.0 Khá | ≥3.0 Trung bình | <3.0 Cần cố gắng

=== OUTPUT FORMAT (JSON only, no markdown) ===
{"original_text":"...","fixed_text":"...","corrections":[{"error":"...","suggestion":"...","error_type":"phu_am_dau|van|dau_thanh|viet_hoa|bo_sot_them|dau_cau","reason":"..."}],"score_breakdown":{"chinh_ta":{"raw":0.0,"max":4.0,"error_count":0,"deduction":0.0},"hinh_thuc":{"raw":0.0,"max":3.0,"note":""},"noi_dung":{"raw":0.0,"max":2.0,"note":""},"sang_tao":{"raw":0.0,"max":1.0,"note":""}},"score":"X.X/10","overall_rating":"...","feedback":"..."}`;

// ── 15 mẫu văn bản chính tả tiểu học đa dạng ────────────────────────────────
const TEST_SAMPLES = [
  {
    id: 1, label: "Lớp 1 – Sai nhiều (tr/ch, thiếu dấu)",
    text: `con chim hot trên cây. trời sang va dep. me di cho mua rau.`,
  },
  {
    id: 2, label: "Lớp 2 – Sai vừa (s/x, d/gi)",
    text: `Buổi sáng, em đi học cùng bạn. Trên đường có nhiều xe đạp. Giáo viên day chúng em rất tốt. Em xẽ cố gắng học giỏi.`,
  },
  {
    id: 3, label: "Lớp 3 – Gần đúng (nhầm vần ươi/ơi)",
    text: `Cây bàng tỏa bóng mát rợi cả một góc sân chường. Các bạn học sinh vui chơi dưới gốc cây. Em rất thích ngôi trường của em.`,
  },
  {
    id: 4, label: "Lớp 3 – Chính xác cao (mẫu so sánh)",
    text: `Mặt trời như một quả cầu lửa khổng lồ. Ánh nắng chiếu xuống làm cho cánh đồng lúa lấp lánh. Bác nông dân cần mẫn làm việc từ sáng sớm.`,
  },
  {
    id: 5, label: "Lớp 2 – Lỗi dấu thanh nhiều",
    text: `em di hoc ban sang. trên đường co nhieu xe. me nau com ngon lam. nha em co vuon rau xanh.`,
  },
  {
    id: 6, label: "Lớp 3 – Nhầm n/l phương ngữ",
    text: `Lá cây no xanh mướt sau cơn mưa. Chú chim náo xao xuyến trên cành. Bầu trời nong lộng một màu xanh biếc.`,
  },
  {
    id: 7, label: "Lớp 4 – Bài dài, ít lỗi",
    text: `Mùa xuân đến, khắp nơi trăm hoa đua nở. Những cánh hoa đào hồng thắm như đôi má ửng hồng của em bé. Tiếng chim ríu rít gọi nhau trên những tán cây xanh mướt. Em rất yêu mùa xuân vì đó là mùa của sự khởi đầu mới mẻ và hy vọng.`,
  },
  {
    id: 8, label: "Lớp 1 – Rất ngắn, nhiều lỗi cơ bản",
    text: `me oi, em di hoc. em hoc gioi. be ngu roi.`,
  },
  {
    id: 9, label: "Lớp 3 – Nhầm ch/tr, c/k",
    text: `Chiều chiều, em thường trông tre đàn chim bay về tổ. Cả bầu trời đỏ cờ. Khong khi mát mẻ và trong lành làm em cảm thấy dễ chịu.`,
  },
  {
    id: 10, label: "Lớp 2 – Sai viết hoa tên riêng",
    text: `Trường em tên là tiểu học lê văn tám. Thầy giáo tên là nguyễn văn hùng. Lớp em có 35 bạn học sinh ngoan ngoãn và chăm chỉ.`,
  },
  {
    id: 11, label: "Lớp 3 – Bài văn tả cảnh đẹp",
    text: `Buổi sáng trên cánh đồng thật yên tĩnh. Sương mù còn bảng lảng trên ngọn cỏ. Từng đàn cò trắng bay lượn vòng vòng trước khi hạ xuống mặt đồng kiếm ăn. Cảnh vật thật nên thơ và thanh bình.`,
  },
  {
    id: 12, label: "Lớp 2 – Thiếu chữ, bỏ sót từ",
    text: `Em rất thích học môn tiếng. Môn này giúp em đọc và tốt hơn. Giáo viên em rất hiền và dạy hay. Em sẽ cố học thật tốt để bố mẹ vui.`,
  },
  {
    id: 13, label: "Lớp 4 – Văn xuôi sáng tạo",
    text: `Mỗi sáng thức dậy, em nghe tiếng chim hót lảnh lót như bản nhạc chào ngày mới. Nắng vàng óng ả trải đều khắp sân nhà. Hàng cây bạch đàn đứng thẳng tắp như đội quân canh gác. Em cảm thấy yêu cuộc sống này lắm lắm.`,
  },
  {
    id: 14, label: "Lớp 1 – Sai dấu thanh hỏi/ngã",
    text: `Ba me em rat thuong em. Em ngoan va hoc gioi. Em se co gang moi ngay de ba me vui long.`,
  },
  {
    id: 15, label: "Lớp 3 – Nhầm gi/d/r",
    text: `Gia đình em có ba người. Ba em làm ruộng, mẹ em bán hàng. Anh em rat thương nhau. Chúng em giúp đỡ nhau trong công việc hàng ngày.`,
  },
];

// ── Hàm gọi Gemini API ───────────────────────────────────────────────────────
async function callGemini(text) {
  const parts = [
    { text: GRADING_PROMPT },
    { text: `\n\nVăn bản của học sinh:\n${text}` },
  ];

  const startTime = Date.now();
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    }),
  });
  const latencyMs = Date.now() - startTime;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokenCount = data.usageMetadata?.totalTokenCount || 0;

  // Parse JSON
  let parsed = null;
  let jsonOk = false;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
    jsonOk = true;
  } catch (_) {
    jsonOk = false;
  }

  return { latencyMs, tokenCount, jsonOk, parsed, rawText };
}

// ── Delay để tránh rate limit ────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main benchmark ───────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  VIHAND GRADE — BENCHMARK GEMINI API (TEXT MODE)");
  console.log(`  Model: ${GEMINI_MODEL}`);
  console.log(`  Mẫu test: ${TEST_SAMPLES.length} | Thời gian: ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const results = [];

  for (const sample of TEST_SAMPLES) {
    process.stdout.write(`[${String(sample.id).padStart(2, "0")}/${TEST_SAMPLES.length}] ${sample.label.padEnd(45)} → `);

    try {
      const { latencyMs, tokenCount, jsonOk, parsed } = await callGemini(sample.text);
      const score = parsed?.score || "N/A";
      const rating = parsed?.overall_rating || "N/A";
      const errorCount = parsed?.corrections?.length ?? "?";

      console.log(
        `✅ ${(latencyMs / 1000).toFixed(2)}s | ${String(tokenCount).padStart(5)} tok | JSON:${jsonOk ? "✓" : "✗"} | Điểm:${score} ${rating} | Lỗi:${errorCount}`
      );

      results.push({ ...sample, latencyMs, tokenCount, jsonOk, score, rating, errorCount, success: true });
    } catch (err) {
      console.log(`❌ LỖI: ${err.message.slice(0, 80)}`);
      results.push({ ...sample, latencyMs: null, tokenCount: 0, jsonOk: false, score: "N/A", success: false });
    }

    // Chờ 2.5 giây giữa các request để tránh rate limit
    if (sample.id < TEST_SAMPLES.length) await sleep(2500);
  }

  // ── Tổng hợp thống kê ──────────────────────────────────────────────────────
  const successful = results.filter((r) => r.success && r.latencyMs !== null);
  const failed = results.filter((r) => !r.success);
  const jsonFailed = results.filter((r) => r.success && !r.jsonOk);

  const latencies = successful.map((r) => r.latencyMs);
  const tokens = successful.map((r) => r.tokenCount);

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = (arr) => Math.min(...arr);
  const max = (arr) => Math.max(...arr);
  const median = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const p90 = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.9)];
  };
  const stddev = (arr) => {
    const m = avg(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  };

  const under10s = latencies.filter((l) => l < 10000).length;
  const under20s = latencies.filter((l) => l < 20000).length;
  const under30s = latencies.filter((l) => l < 30000).length;
  const over30s = latencies.filter((l) => l >= 30000).length;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  KẾT QUẢ BENCHMARK");
  console.log("═══════════════════════════════════════════════════════════");

  console.log(`\n📊 TỶ LỆ THÀNH CÔNG:`);
  console.log(`   Tổng mẫu test       : ${results.length}`);
  console.log(`   Thành công (API OK) : ${successful.length}/${results.length} (${((successful.length/results.length)*100).toFixed(1)}%)`);
  console.log(`   Lỗi API             : ${failed.length}`);
  console.log(`   JSON parse lỗi      : ${jsonFailed.length}`);

  if (latencies.length > 0) {
    console.log(`\n⏱️  THỜI GIAN PHẢN HỒI (giây):`);
    console.log(`   Min      : ${(min(latencies)/1000).toFixed(2)}s`);
    console.log(`   Max      : ${(max(latencies)/1000).toFixed(2)}s`);
    console.log(`   Trung bình (Mean)  : ${(avg(latencies)/1000).toFixed(2)}s`);
    console.log(`   Trung vị (Median)  : ${(median(latencies)/1000).toFixed(2)}s`);
    console.log(`   P90 (90th pct)     : ${(p90(latencies)/1000).toFixed(2)}s`);
    console.log(`   Độ lệch chuẩn (SD) : ${(stddev(latencies)/1000).toFixed(2)}s`);

    console.log(`\n📈 PHÂN PHỐI LATENCY:`);
    console.log(`   < 10s   : ${under10s}/${successful.length} (${((under10s/successful.length)*100).toFixed(1)}%)`);
    console.log(`   10–20s  : ${under20s - under10s}/${successful.length} (${(((under20s-under10s)/successful.length)*100).toFixed(1)}%)`);
    console.log(`   20–30s  : ${under30s - under20s}/${successful.length} (${(((under30s-under20s)/successful.length)*100).toFixed(1)}%)`);
    console.log(`   > 30s   : ${over30s}/${successful.length} (${((over30s/successful.length)*100).toFixed(1)}%)`);

    console.log(`\n🔢 TOKEN USAGE:`);
    console.log(`   TB/request : ${avg(tokens).toFixed(0)} tokens`);
    console.log(`   Min        : ${min(tokens)} tokens`);
    console.log(`   Max        : ${max(tokens)} tokens`);
    console.log(`   Tổng       : ${tokens.reduce((a,b)=>a+b,0)} tokens`);
  }

  // ── ASCII bar chart latency ────────────────────────────────────────────────
  console.log(`\n📉 LATENCY TỪNG MẪU (bar chart):`);
  const maxBar = 40;
  const maxLat = max(latencies);
  for (const r of results) {
    if (!r.success) {
      console.log(`   [${String(r.id).padStart(2,"0")}] ${"✗".padEnd(maxBar+1)} ERROR`);
      continue;
    }
    const barLen = Math.round((r.latencyMs / maxLat) * maxBar);
    const bar = "█".repeat(barLen);
    const threshold30 = Math.round((30000 / maxLat) * maxBar);
    const marker = r.latencyMs >= 30000 ? " ⚠️ >30s" : "";
    console.log(`   [${String(r.id).padStart(2,"0")}] ${bar.padEnd(maxBar)} ${(r.latencyMs/1000).toFixed(2)}s${marker}`);
  }

  // ── Kết luận ──────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  KẾT LUẬN CHO BÁO CÁO");
  console.log("═══════════════════════════════════════════════════════════");
  if (latencies.length > 0) {
    console.log(`  ✔ Thời gian chấm trung bình: ${(avg(latencies)/1000).toFixed(1)} giây/bài`);
    console.log(`  ✔ Thời gian nhanh nhất    : ${(min(latencies)/1000).toFixed(1)} giây/bài`);
    console.log(`  ✔ Thời gian chậm nhất     : ${(max(latencies)/1000).toFixed(1)} giây/bài`);
    console.log(`  ✔ Tỷ lệ hoàn thành <30s   : ${((under30s/successful.length)*100).toFixed(1)}%`);
    console.log(`  ✔ Tỷ lệ >30s (chậm)       : ${((over30s/successful.length)*100).toFixed(1)}%`);
    console.log(`  ✔ Tỷ lệ JSON hợp lệ       : ${(((successful.length-jsonFailed.length)/successful.length)*100).toFixed(1)}%`);
  }
  console.log("\n  → Sao chép các số liệu trên vào báo cáo tổng kết.");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
