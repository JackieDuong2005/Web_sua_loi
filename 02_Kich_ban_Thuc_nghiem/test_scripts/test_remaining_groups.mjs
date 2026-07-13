/**
 * TEST REMAINING GROUPS — ViHand Grade
 * Kiểm thử tự động tích hợp cho các nhóm:
 *   - NHÓM 8: GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN BACKEND/API)
 *   - NHÓM 9: DATABASE & REST API ENDPOINTS
 *   - NHÓM 10: QUẢN LÝ RỦI RO, DỰ PHÒNG & HIỆU NĂNG (FAILOVER & PERFORMANCE)
 */

import fetch from "node-fetch";

const NEXT_API_URL = "http://localhost:3000/api";

async function runTests() {
  console.log("================================================================================");
  console.log("🚀 BẮT ĐẦU CHẠY KIỂM THỬ TÍCH HỢP: NHÓM 8, 9 & 10");
  console.log("================================================================================");

  try {
    // -------------------------------------------------------------------------
    // NHÓM 8 & 9: Đăng nhập & Lấy danh sách users
    // -------------------------------------------------------------------------
    console.log("\n[NHÓM 8] 👑 TEST CASE 1: Quản lý người dùng & Phân quyền (RBAC)");
    
    // Lấy danh sách người dùng ban đầu để tìm học sinh demo
    const usersRes = await fetch(`${NEXT_API_URL}/users`);
    if (!usersRes.ok) throw new Error("Không thể tải danh sách người dùng");
    const { users } = await usersRes.json();
    const studentUser = users.find(u => u.username === "hoc_sinh_demo");
    if (!studentUser) throw new Error("Không tìm thấy học sinh demo (hoc_sinh_demo) trong DB. Hãy seed trước.");

    console.log(`✅ Tìm thấy tài khoản Học sinh: ${studentUser.name} (ID: ${studentUser.id})`);

    // 1. Tạo giáo viên mới qua API POST /api/users
    console.log("👉 1. Tạo giáo viên mới 'giao_vien_moi'...");
    const createTeacherRes = await fetch(`${NEXT_API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Giáo viên Mới",
        username: "giao_vien_moi",
        password: "password123",
        role: "teacher"
      })
    });
    
    let newTeacherId = null;
    if (createTeacherRes.ok) {
      const { user: newTeacher } = await createTeacherRes.json();
      newTeacherId = newTeacher.id;
      console.log(`   ✅ Tạo thành công giáo viên mới: ${newTeacher.name} (ID: ${newTeacher.id})`);
    } else {
      const err = await createTeacherRes.json();
      if (err.error && err.error.includes("đã tồn tại")) {
        console.log("   ℹ️ Giáo viên 'giao_vien_moi' đã tồn tại sẵn.");
        const existingTeacher = users.find(u => u.username === "giao_vien_moi");
        newTeacherId = existingTeacher?.id;
      } else {
        throw new Error(`Tạo giáo viên thất bại: ${JSON.stringify(err)}`);
      }
    }

    // 2. Khóa tài khoản học sinh (active: false)
    console.log(`👉 2. Tiến hành khóa tài khoản học sinh '${studentUser.username}'...`);
    const lockRes = await fetch(`${NEXT_API_URL}/users/${studentUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false })
    });
    if (!lockRes.ok) throw new Error("Khóa tài khoản học sinh thất bại");
    console.log("   ✅ Đã khóa tài khoản thành công (active = false)");

    // 3. Thử đăng nhập bằng tài khoản bị khóa
    console.log("👉 3. Thử đăng nhập bằng tài khoản bị khóa...");
    const loginBlockedRes = await fetch(`${NEXT_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "hoc_sinh_demo", password: "123456" })
    });
    console.log(`   Status Code trả về: ${loginBlockedRes.status}`);
    const loginBlockedData = await loginBlockedRes.json();
    console.log(`   Kết quả trả về: ${JSON.stringify(loginBlockedData)}`);
    if (loginBlockedRes.status === 403 && loginBlockedData.error === "Tài khoản đã bị vô hiệu hóa") {
      console.log("   🎉 ĐẠT: Đăng nhập bị chặn chính xác với thông báo khóa tài khoản!");
    } else {
      throw new Error("FAIL: Đăng nhập của tài khoản bị khóa không bị chặn đúng cách.");
    }

    // 4. Mở khóa lại tài khoản học sinh để không làm hỏng dữ liệu chạy thật
    console.log(`👉 4. Khôi phục (Mở khóa) lại tài khoản '${studentUser.username}'...`);
    const unlockRes = await fetch(`${NEXT_API_URL}/users/${studentUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true })
    });
    if (!unlockRes.ok) throw new Error("Mở khóa tài khoản học sinh thất bại");
    console.log("   ✅ Đã mở khóa lại tài khoản thành công (active = true)");


    // -------------------------------------------------------------------------
    // NHÓM 9: DATABASE & REST API ENDPOINTS
    // -------------------------------------------------------------------------
    console.log("\n[NHÓM 9] 💾 TEST CASE 1: Ghi dữ liệu chấm điểm vào DB");
    
    // Gửi payload bài chấm hoàn chỉnh lên POST /api/grades
    const payload = {
      studentName: "Trần Thị B",
      assignmentTitle: "Chính tả: Quê hương",
      className: "3A1",
      originalText: "que huong la chum khe ngot",
      fixedText: "Quê hương là chùm khế ngọt",
      corrections: [
        { error: "que huong", suggestion: "Quê hương", reason: "Viết hoa đầu câu" },
        { error: "chum khe", suggestion: "chùm khế", reason: "Thiếu dấu thanh" }
      ],
      score: "10/10",
      feedback: "Bài viết hoàn hảo!",
      overallRating: "Xuất sắc",
      processingTimeMs: 1500,
      tokenCount: 450,
      imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    };

    console.log("👉 Gọi POST /api/grades lưu bài viết của Trần Thị B...");
    const postGradeRes = await fetch(`${NEXT_API_URL}/grades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log(`   Status Code: ${postGradeRes.status}`);
    const postGradeData = await postGradeRes.json();
    if (postGradeRes.status === 201 && postGradeData.grade?.id) {
      console.log(`   ✅ ĐẠT: Lưu bài chấm thành công! ID mới: ${postGradeData.grade.id}`);
    } else {
      throw new Error(`FAIL: Lưu bài chấm thất bại: ${JSON.stringify(postGradeData)}`);
    }

    console.log("\n[NHÓM 9] 💾 TEST CASE 2: Truy vấn lịch sử chấm điểm có bộ lọc");
    console.log("👉 Gọi GET /api/grades?class=3A1&search=Trần...");
    const getFilteredRes = await fetch(`${NEXT_API_URL}/grades?class=3A1&search=Trần`);
    console.log(`   Status Code: ${getFilteredRes.status}`);
    const getFilteredData = await getFilteredRes.json();
    const foundGrades = getFilteredData.grades || [];
    console.log(`   Tìm thấy ${foundGrades.length} bản ghi phù hợp.`);
    const matched = foundGrades.every(g => g.className === "3A1" && g.studentName.includes("Trần"));
    if (getFilteredRes.ok && foundGrades.length > 0 && matched) {
      console.log("   🎉 ĐẠT: Bộ lọc API hoạt động chính xác (Lọc đúng lớp 3A1 và tên chứa 'Trần')!");
    } else {
      throw new Error("FAIL: Bộ lọc API không trả về đúng dữ liệu lọc.");
    }


    // -------------------------------------------------------------------------
    // NHÓM 10: QUẢN LÝ RỦI RO, DỰ PHÒNG & HIỆU NĂNG
    // -------------------------------------------------------------------------
    console.log("\n[NHÓM 10] 🚨 TEST CASE 1: Kiểm thử tải đồng thời (Concurrency Test)");
    console.log("👉 Gửi đồng thời 5 request chấm điểm song song đến /api/grade...");
    const studentTexts = [
      "Mua he da ve roi. Chung em duoc nghi hoc.",
      "Con meo nha em co bo long trang muot.",
      "Gia dinh em co bon nguoi rat yeu thuong nhau.",
      "Truong hoc em nam ben bo song nho rat dep.",
      "Bien que em vao buoi sang som rat tho mong."
    ];

    const startCon = Date.now();
    const promises = studentTexts.map(text => 
      fetch(`${NEXT_API_URL}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentText: text })
      }).then(async res => {
        const data = await res.json();
        return { status: res.status, engine: data.engine, score: data.score };
      })
    );

    const results = await Promise.all(promises);
    const endCon = Date.now();
    console.log(`   Hoàn thành 5 requests song song trong: ${((endCon - startCon) / 1000).toFixed(2)} giây.`);
    results.forEach((r, idx) => {
      console.log(`   Request ${idx + 1}: Status=${r.status} | Engine=${r.engine} | Score=${r.score}`);
    });

    const allPassed = results.every(r => r.status === 200);
    if (allPassed) {
      console.log("   🎉 ĐẠT: Hệ thống xử lý song song thành công cả 5 requests không lỗi!");
    } else {
      throw new Error("FAIL: Có ít nhất một request song song bị lỗi.");
    }

  } catch (err) {
    console.error("\n❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH KIỂM THỬ:");
    console.error(err.message);
    process.exit(1);
  }

  console.log("\n================================================================================");
  console.log("✅ TẤT CẢ CÁC BÀI KIỂM THỬ NHÓM 8, 9 & 10 ĐÃ THÀNH CÔNG VỚI TRẠNG THÁI: PASS!");
  console.log("================================================================================");
}

runTests();
