// 02_Kich_ban_Thuc_nghiem/test_grading_logic.js
import assert from "assert";

const API_URL = "http://localhost:8000/grade";

async function postGrade(payload) {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    throw new Error(`HTTP Error ${resp.status}: ${await resp.text()}`);
  }
  return await resp.json();
}

async function run() {
  console.log("==================================================");
  console.log("BẮT ĐẦU CHẠY KIỂM THỬ NHÓM 5: NGHIỆP VỤ CHẤM ĐIỂM & FEEDBACK");
  console.log("==================================================");

  // ----------------------------------------------------------------
  // TC-GRADE-01: Tính điểm chính tả theo barem (Thang 4.0 điểm)
  // ----------------------------------------------------------------
  console.log("\n--- Chạy TC-GRADE-01: Tính điểm chính tả theo barem ---");
  
  // Case A: 3 lỗi chính tả (trừ 3 * 0.5 = 1.5đ -> điểm chính tả còn 2.5đ)
  // Bài viết gốc có 3 từ sai: "hoc", "thây", "rât" -> "học", "thấy", "rất"
  const payload3Errors = {
    text: "Em hoc sinh Buổi sáng em thây bông hoa rât đẹp.",
    penalty_per_error: 0.5,
    hinh_thuc: 3.0,
    noi_dung: 2.0
  };
  const res3Errors = await postGrade(payload3Errors);
  console.log(`[Bài 3 lỗi] Số lỗi thực tế: ${res3Errors.score_breakdown.chinh_ta.error_count}`);
  console.log(`[Bài 3 lỗi] Điểm chính tả: ${res3Errors.score_breakdown.chinh_ta.raw}/${res3Errors.score_breakdown.chinh_ta.max}`);
  console.log(`[Bài 3 lỗi] Tổng điểm: ${res3Errors.score}`);
  assert.strictEqual(res3Errors.score_breakdown.chinh_ta.error_count, 3);
  assert.strictEqual(res3Errors.score_breakdown.chinh_ta.raw, 2.5);
  console.log("✅ Case A (3 lỗi): Đạt");

  // Case B: 10 lỗi chính tả (trừ 10 * 0.5 = 5.0đ -> khống chế điểm sàn = 0.0)
  // Gửi một văn bản có nhiều từ sai chính tả nghiêm trọng
  const payload10Errors = {
    text: "em hoc sinh di hoc trg rât nhiu cô giao cua em rât thg em yêu mên thầy cô nhìu nhìu lăm lăm",
    penalty_per_error: 0.5,
    hinh_thuc: 0.0,
    noi_dung: 0.0
  };
  const res10Errors = await postGrade(payload10Errors);
  const errCount10 = res10Errors.score_breakdown.chinh_ta.error_count;
  console.log(`[Bài nhiều lỗi] Số lỗi thực tế: ${errCount10}`);
  console.log(`[Bài nhiều lỗi] Điểm chính tả: ${res10Errors.score_breakdown.chinh_ta.raw}/${res10Errors.score_breakdown.chinh_ta.max}`);
  console.log(`[Bài nhiều lỗi] Tổng điểm: ${res10Errors.score}`);
  assert.ok(errCount10 >= 8, `Số lỗi nhận diện được là ${errCount10}, nhỏ hơn mong đợi`);
  assert.strictEqual(res10Errors.score_breakdown.chinh_ta.raw, 0.0);
  console.log("✅ Case B (Khống chế sàn 0.0đ): Đạt");


  // ----------------------------------------------------------------
  // TC-GRADE-02: Tự động chấm điểm sáng tạo (Thang 1.0 điểm)
  // ----------------------------------------------------------------
  console.log("\n--- Chạy TC-GRADE-02: Tự động chấm điểm sáng tạo ---");

  // Case A: Ngắn, viết đơn giản -> Điểm sáng tạo = 0.0
  const resCreativity0 = await postGrade({
    text: "Con mèo lười nằm sưởi nắng.",
    hinh_thuc: 2.0,
    noi_dung: 1.0
  });
  console.log(`[Bài ngắn] Điểm sáng tạo: ${resCreativity0.score_breakdown.sang_tao.raw} | Ghi chú: ${resCreativity0.score_breakdown.sang_tao.note}`);
  assert.strictEqual(resCreativity0.score_breakdown.sang_tao.raw, 0.0);
  console.log("✅ Case A (Sáng tạo 0.0đ): Đạt");

  // Case B: Đủ dài (> 40 từ), diễn đạt trôi chảy -> Điểm sáng tạo = 0.5
  const resCreativity05 = await postGrade({
    text: "Bố dẫn tôi tới một hiệu sách cũ để mua vài quyển vở chuẩn bị học kì mới. Nơi đây có rất nhiều tập truyện tranh màu sắc sặc sỡ đặt ngay ngắn bên kệ gỗ lớn nằm sát tường phía sau bàn bán vé.",
    hinh_thuc: 2.0,
    noi_dung: 1.0
  });
  console.log(`[Bài dài] Điểm sáng tạo: ${resCreativity05.score_breakdown.sang_tao.raw} | Ghi chú: ${resCreativity05.score_breakdown.sang_tao.note}`);
  assert.strictEqual(resCreativity05.score_breakdown.sang_tao.raw, 0.5);
  console.log("✅ Case B (Sáng tạo 0.5đ): Đạt");

  // Case C: Có điệp từ (lặp >= 3 lần) và từ nghệ thuật ("lấp lánh", "như là") -> Điểm sáng tạo = 1.0
  const resCreativity1 = await postGrade({
    text: "Những ngôi sao lấp lánh như là những ngọn nến lung linh trên trời cao. Những ngôi sao soi sáng con đường em đi học, những ngôi sao soi sáng giấc mơ của em mỗi tối.",
    hinh_thuc: 2.0,
    noi_dung: 1.0
  });
  console.log(`[Bài nghệ thuật] Điểm sáng tạo: ${resCreativity1.score_breakdown.sang_tao.raw} | Ghi chú: ${resCreativity1.score_breakdown.sang_tao.note}`);
  assert.strictEqual(resCreativity1.score_breakdown.sang_tao.raw, 1.0);
  console.log("✅ Case C (Sáng tạo 1.0đ): Đạt");


  // ----------------------------------------------------------------
  // TC-GRADE-03: Tổng hợp điểm số và xếp loại học lực (Thang 10)
  // ----------------------------------------------------------------
  console.log("\n--- Chạy TC-GRADE-03: Tổng hợp điểm số và xếp loại học lực ---");

  const ratingTests = [
    { scoreTarget: "9.0/10", expectedRating: "Xuất sắc", payload: { text: "Con mèo lười nằm sưởi nắng ấm áp.", hinh_thuc: 3.0, noi_dung: 2.0 } }, // 4.0 + 3.0 + 2.0 + 0.0 = 9.0
    { scoreTarget: "7.0/10", expectedRating: "Tốt", payload: { text: "Con mèo lười nằm sưởi nắng.", hinh_thuc: 2.0, noi_dung: 1.0 } }, // 4.0 + 2.0 + 1.0 + 0.0 = 7.0
    { scoreTarget: "5.0/10", expectedRating: "Khá", payload: { text: "Con mèo lười nằm sưởi nắng.", hinh_thuc: 1.0, noi_dung: 0.0 } } // 4.0 + 1.0 + 0.0 + 0.0 = 5.0
  ];

  for (const t of ratingTests) {
    const res = await postGrade(t.payload);
    console.log(`[Xếp loại] Tổng điểm: ${res.score} | Xếp loại thực tế: ${res.overall_rating} | Kì vọng: ${t.expectedRating}`);
    assert.strictEqual(res.score, t.scoreTarget);
    assert.strictEqual(res.overall_rating, t.expectedRating);
  }
  console.log("✅ TC-GRADE-03 (Tổng hợp & Xếp loại): Đạt");


  // ----------------------------------------------------------------
  // TC-GRADE-04: Tạo nhận xét sư phạm động (Feedback Generation)
  // ----------------------------------------------------------------
  console.log("\n--- Chạy TC-GRADE-04: Tạo nhận xét sư phạm động ---");

  // Case A: 0 lỗi
  const resFeedback0 = await postGrade({
    text: "Con mèo lười nằm sưởi nắng ấm.",
    hinh_thuc: 3.0,
    noi_dung: 2.0
  });
  console.log(`[0 lỗi] Feedback: "${resFeedback0.feedback}"`);
  assert.strictEqual(resFeedback0.feedback, "Bài viết xuất sắc! Con không mắc lỗi chính tả nào. Tiếp tục phát huy nhé!");

  // Case B: 2 lỗi
  const resFeedback2 = await postGrade({
    text: "Bé vẽ con meo nhỏ ở sân nha.", // meo -> mèo, nha -> nhà
    hinh_thuc: 3.0,
    noi_dung: 2.0
  });
  console.log(`[2 lỗi] Corrections:`, JSON.stringify(resFeedback2.corrections));
  console.log(`[2 lỗi] Feedback: "${resFeedback2.feedback}"`);
  assert.strictEqual(resFeedback2.feedback, "Bài viết tốt! Con chỉ mắc 2 lỗi nhỏ. Chú ý sửa những từ đã được đánh dấu để bài viết hoàn thiện hơn nhé.");

  // Case C: 5 lỗi
  const resFeedback5 = await postGrade({
    text: "Con bươm bướm\nBuổi sang, em ra vươn cùng bà. Em thây một con bướm đang đâu trên bong hoa hong. Con bướm có đôi canh rât đep.",
    hinh_thuc: 3.0,
    noi_dung: 2.0
  });
  console.log(`[5 lỗi] Corrections:`, JSON.stringify(resFeedback5.corrections));
  console.log(`[5 lỗi] Feedback: "${resFeedback5.feedback}"`);
  assert.strictEqual(resFeedback5.feedback, "Con còn mắc 5 lỗi chính tả trong bài. Con hãy xem lại từng lỗi được chỉ ra và luyện tập thêm nhé! Cố gắng lên!");

  console.log("✅ TC-GRADE-04 (Feedback Generation): Đạt");

  console.log("\n==================================================");
  console.log("🎉 TẤT CẢ CÁC TESTCASE NHÓM 5 ĐÃ ĐẠT (PASS) THÀNH CÔNG!");
  console.log("==================================================");
}

run().catch(err => {
  console.error("❌ TEST THẤT BẠI:", err.message);
  process.exit(1);
});
