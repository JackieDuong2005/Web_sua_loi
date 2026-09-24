---
name: verify-vihand-grade
description: >
  Kỹ năng xác thực toàn diện (Verification Skill) cho hệ sinh thái ViHand Grade theo triết lý pstack của Lauren Tan
  (SpaceXAI/Cursor) — "Passing build is NOT verification. Drive the real app the way a user does and capture evidence".
  Tự động "lái" cả 4 bề mặt: Android Native App, Next.js AI BFF Gateway (với ảnh bài thi học sinh thật), Python AI Core
  (ViT5 + YOLOv8) và Trạm Biên Raspberry Pi qua Cloudflare Tunnel. Kích hoạt khi người dùng yêu cầu: "kiểm thử dự án",
  "verify hệ thống", "/verify", "chạy verification", "test toàn bộ", "chạy test bff", "kiểm tra app mobile".
---

# 🛡️ Verification Skill — ViHand Grade (Lauren Tan / PStack Standard)

> **Triết lý cốt lõi:** *"Build thành công KHÔNG PHẢI là đã kiểm thử. Mọi dự án nghiêm túc đều phải có cơ chế tự động để AI tự 'lái' ứng dụng thật như một người dùng và bắt bằng chứng thực nghiệm."* — **Lauren Tan (@poteto)**

Skill này trang bị cho AI một bộ khung kiểm thử độc lập (Independent Verifier Harness), chia nhỏ thành các vai trò chuyên biệt để chứng minh hệ thống hoạt động 100% ngoài đời thực.

---

## 🎭 1. Phân Vai Multi-Agent (Mô hình Bếp Trưởng & Phụ Bếp)

1. **Head Chef (Agent Điều Phối):** Nhận lệnh từ người dùng, đọc báo cáo kiểm thử từ Verifier. Nếu có lỗi, yêu cầu Builder sửa; nếu Pass 100%, xuất báo cáo nghiệm thu.
2. **The Builder (Thợ Xây Mã):** Viết code, tái cấu trúc logic, chạy `compileDebugKotlin` hoặc `npm run build`.
3. **The Operator (Người Lái Thao Tác):** Đọc ảnh bài thi học sinh thật từ `02_Kich_ban_Thuc_nghiem/`, gửi payload Base64 vào endpoint như một chiếc điện thoại thật đang chấm bài.
4. **The Verifier (Giám Khảo Khách Quan):** Đọc response JSON, kiểm tra tọa độ Bounding Box có hợp lệ $\in [0.0, 1.0]$, kiểm tra điểm số 4 tiêu chí theo Thông tư 27 Bộ GD&ĐT, kiểm tra độ trễ (latency ms).

---

## 🚀 2. Cách Kích Hoạt & Lệnh Thực Thi

AI (hoặc người dùng) kích hoạt kiểm thử qua các lệnh Python chuẩn hóa:

### 2.1. Kiểm thử toàn diện 4 bề mặt (Khuyên dùng trước khi bàn giao):
```powershell
python .agents/skills/verify-vihand-grade/scripts/verify_all.py
```

### 2.2. Kiểm thử riêng lẻ từng bề mặt (Tiết kiệm thời gian khi vừa sửa 1 module):
```powershell
# Bề mặt 1: Chỉ kiểm tra Android Native App (Biên dịch Kotlin, Room DB, APK)
python .agents/skills/verify-vihand-grade/scripts/verify_all.py --surface mobile

# Bề mặt 2: Chỉ kiểm tra BFF Gateway với ảnh bài thi thật (Bounding Box & Barem điểm)
python .agents/skills/verify-vihand-grade/scripts/verify_all.py --surface bff

# Bề mặt 3: Chỉ kiểm tra Python AI Service (ViT5 sửa chính tả & YOLOv8)
python .agents/skills/verify-vihand-grade/scripts/verify_all.py --surface ai

# Bề mặt 4: Chỉ kiểm tra Trạm Biên Raspberry Pi & Cloudflare Tunnel
python .agents/skills/verify-vihand-grade/scripts/verify_all.py --surface edge
```

---

## 🔍 3. Ma Trận Bằng Chứng Cần Thu Thập (Evidence Rubric)

Khi chạy xong, AI Verifier phải đối chiếu kết quả theo bảng tiêu chuẩn:

| Bề mặt (Surface) | Cơ chế AI "Lái" (Drive) | Bằng chứng thu thập (Capture Evidence) | Tiêu chí Pass |
|---|---|---|---|
| **1. Mobile App** | Chạy Gradle compile: `.\gradlew.bat compileDebugKotlin` + kiểm tra Room DB schema. | Log compilation, kích thước APK (~26MB), schema `GradeRecordEntity`. | Zero error, exit code 0. |
| **2. BFF AI Gateway** | Nạp ảnh bài thi thật `err_01/00_anh_goc.jpg` $\to$ gửi `POST /api/mobile/grade`. | Status HTTP 200, Bounding Box $\in [0.0, 1.0]$, 4 tiêu chí điểm, lời nhận xét sư phạm, `serverGradeId`. | HTTP 200, BBoxes hợp lệ, điểm thang 10, có lưu DB. |
| **3. Python AI Core** | Gửi mẫu câu sai `"su bé ngủ xay, thay cho só xời"` vào `/predict`. | Tốc độ suy luận ms, text sửa thành `"ru bé ngủ say, thay cho gió trời"`. | Latency $< 2000\text{ms}$, sửa đúng $\ge 2$ từ sai. |
| **4. Trạm Biên Pi** | Ping `GET https://vihandgrade.click/api/health` + SSH check service. | RTT latency ms, tunnel status, trạng thái `active` của `vihand-ai.service`. | Tunnel online, RTT $< 300\text{ms}$. |

---

## 🔄 4. Vòng Lặp Tự Sửa Lỗi (Self-Healing Loop)

Nếu kết quả chạy trả về ❌ **FAIL** ở bất kỳ bề mặt nào:
1. **Không dừng lại để hỏi người dùng:** Verifier trích xuất chính xác mã lỗi, stack trace hoặc trường dữ liệu bị thiếu.
2. **Kích hoạt Builder:** Sửa trực tiếp file code gây lỗi (ví dụ: thiếu trường `photoPath`, sai cấu trúc JSON Bounding Box).
3. **Chạy lại Verification:** Thực thi lại `verify_all.py --surface <tên_bề_mặt>` cho đến khi nhận được trạng thái ✅ **PASS**.
4. **Báo cáo kết quả:** Khi tất cả đã xanh, xuất Bảng Bằng Chứng hoàn tất cho người dùng.
