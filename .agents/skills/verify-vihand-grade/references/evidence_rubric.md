# 📋 BAREM TIÊU CHUẨN XÁC THỰC HỆ THỐNG VIHAND GRADE (EVIDENCE RUBRIC)

> Tài liệu tham chiếu chuẩn cho Agent Verifier nghiệm thu hệ thống ViHand Grade theo triết lý `pstack` của Lauren Tan.

---

## 1. TIÊU CHUẨN NGHIỆM THU 4 BỀ MẶT (ACCEPTANCE CRITERIA)

### Bề mặt 1: Android Native App (`android_app`)
- **Biên dịch:** Lệnh `.\gradlew.bat compileDebugKotlin` hoặc `assembleDebug` phải trả về exit code `0`.
- **Không lỗi Lint/Layout:** Không có lỗi chưa giải quyết trong Compose layout hoặc import.
- **Room Database:** Thực thể `GradeRecordEntity` và `AppDatabase` phải đồng bộ trường `photoPath` và `schoolName`.
- **Kích thước file APK:** `app-debug.apk` trong khoảng $24\text{MB} - 32\text{MB}$.

### Bề mặt 2: AI BFF Gateway (`/api/mobile/grade`)
- **HTTP Status:** Luôn trả về `200 OK` khi gửi payload ảnh base64 bài thi học sinh thật.
- **Barem 4 Tiêu chí (Thông tư 27/2020/TT-BGDĐT):**
  - Chính tả (`spellingScore`): $0.0 \le \text{score} \le 4.0$ (hoặc 7.0 tùy cấu hình).
  - Hình thức (`formatScore`): $0.0 \le \text{score} \le 3.0$.
  - Nội dung (`contentScore`): $0.0 \le \text{score} \le 2.0$.
  - Sáng tạo (`creativityScore`): $0.0 \le \text{score} \le 1.0$.
  - Tổng điểm (`totalScore`): $0.0 \le \text{score} \le 10.0$.
- **Bounding Box YOLOv8:**
  - Tọa độ tương đối: $0.0 \le rel\_x1 \le 1.0$, $0.0 \le rel\_y1 \le 1.0$, $0.0 \le rel\_w \le 1.0$, $0.0 \le rel\_h \le 1.0$.
  - Phân loại lỗi chính tả thuộc 1 trong 6 nhóm: `viet_hoa`, `phu_am_dau`, `van`, `dau_thanh`, `bo_sot_them`, `dau_cau`.
- **Lời nhận xét sư phạm:** Không rỗng, độ dài $\ge 20$ ký tự, mang tính khích lệ học sinh tiểu học.
- **Lưu trữ CSDL:** Bản ghi mới được tạo trong `prisma/vihand.db` với `serverGradeId` hợp lệ.

### Bề mặt 3: Python AI Microservice (`FastAPI :8000`)
- **Trạng thái:** Endpoint `/health` trả về `status: "healthy"` hoặc `status: "ok"`.
- **Mô hình ViT5:** Endpoint `/predict` sửa đúng các từ sai tiếng Việt cơ bản trong thời gian $\le 1.5\text{s}$ trên CPU.
- **Mô hình YOLOv8:** Endpoint `/detect_boxes` trả về danh sách bounding box từ ảnh trong $\le 2.0\text{s}$.

### Bề mặt 4: Trạm Biên Raspberry Pi & Cloudflare Tunnel
- **Độ sẵn sàng:** Domain `https://vihandgrade.click/api/health` phản hồi `HTTP 200`.
- **Độ trễ Round-trip (RTT):** $\le 300\text{ms}$ qua mạng 5G/Internet.
- **Dịch vụ chạy ngầm:** `systemctl is-active vihand-ai` và `vihand-web` trả về `active`.
