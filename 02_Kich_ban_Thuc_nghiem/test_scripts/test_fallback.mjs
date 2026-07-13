import fetch from "node-fetch";

const NEXT_API_URL = "http://localhost:3000/api/grade";

async function testFallback() {
  console.log("================================================================================");
  console.log("🔄 BẮT ĐẦU KIỂM THỬ: TC-RISK-01 (Cơ chế dự phòng sang Gemini)");
  console.log("================================================================================");
  console.log("👉 Đang gửi yêu cầu chấm điểm khi dịch vụ ViT5 đang đóng...");

  try {
    const start = Date.now();
    const res = await fetch(NEXT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentText: "que huong la chum khe ngot cho con treo hai moi ngay"
      })
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`   Thời gian phản hồi: ${elapsed} giây.`);
    console.log(`   Status Code: ${res.status}`);

    const data = await res.json();
    console.log(`   Engine trả về: ${data.engine}`);
    console.log(`   Điểm số: ${data.score}`);
    console.log(`   Nhận xét: ${data.feedback}`);

    if (res.status === 200 && data.engine === "gemini-fallback") {
      console.log("\n🎉 ĐẠT: Cơ chế dự phòng sang Gemini (gemini-fallback) hoạt động 100% chính xác!");
    } else {
      throw new Error(`FAIL: Kết quả engine không phải là gemini-fallback (Kết quả: ${data.engine})`);
    }

  } catch (err) {
    console.error("\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:");
    console.error(err.message);
    process.exit(1);
  }
}

testFallback();
