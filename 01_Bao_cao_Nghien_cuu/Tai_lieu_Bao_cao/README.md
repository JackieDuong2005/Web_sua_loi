# 📂 Danh Mục Tài Liệu Kỹ Thuật & Nghiên Cứu Khoa Học — ViHand Grade

Chào mừng đến với kho lưu trữ tài liệu đặc tả kỹ thuật, kiến trúc hệ thống và báo cáo kiểm toán của dự án **ViHand Grade** (Phiên bản chuẩn mực **v2.3.0 Master Release**).

---

## 🌟 Bộ Ba Tài Liệu Cốt Lõi (Core Technical Specifications)

1. 📘 [**`ViHandGrade_Combined_TechSpec_v2.3.0.md`**](./ViHandGrade_Combined_TechSpec_v2.3.0.md)  
   **Đặc Tả Kỹ Thuật Toàn Diện (v2.3.0 Master Release)**  
   *Nguồn chân lý kỹ thuật duy nhất (Single Source of Truth)* mô tả trọn vẹn toàn bộ hệ thống ViHand Grade: Tech Stack (Next.js 16, React 19, FastAPI, Prisma, SQLite WAL), Database Schema 6 bảng, Pipeline tiền xử lý ảnh Jimp, Thuật toán so khớp chuỗi SequenceMatcher không ảo giác, Kiến trúc 2 tầng (ViT5 + Qwen2.5-0.5B SLM), và Chính sách bảo vệ dữ liệu trẻ em theo Nghị định 13/2023/NĐ-CP.

2. 🎙️ [**`dictation-platform-architecture.md`**](./dictation-platform-architecture.md)  
   **Kiến Trúc Nền Tảng Đọc Chính Tả Web & Tổng Hợp Giọng Nói Edge-TTS**  
   Tài liệu thiết kế kiến trúc phân hệ Đọc chính tả Web (`/teacher/dictation`), điều khiển nhịp đọc sư phạm, tích hợp giọng đọc tự nhiên đa vùng miền Microsoft Edge-TTS, và cơ chế chuyển giao dữ liệu Ground Truth tự động sang tab Chấm điểm.

3. 🔍 [**`vihand_audit_report.md`**](./vihand_audit_report.md)  
   **Báo Cáo Kiểm Toán Kỹ Thuật Chuyên Sâu & Backlog Khắc Phục Lỗi**  
   Bảng tổng hợp chi tiết toàn bộ 47 issues kỹ thuật được đối soát trực tiếp với từng dòng mã nguồn: phân tích nguyên nhân gốc rễ, rủi ro hệ thống, và minh chứng mã nguồn thực tế cho các vấn đề đã được giải quyết triệt để.

---

## 📁 Các Thư Mục Nghiên Cứu Mở Rộng

* 📘 [`01_ViHandGrade/`](./01_ViHandGrade/): Chứa báo cáo tổng kết NCKH gốc (`8 - Báo cáo tổng kết - Thiết bị chấm điểm.docx`).
* 🤖 [`02_AI_Dictation/`](./02_AI_Dictation/): Chứa các tài liệu nghiên cứu chuyên sâu về giao thức WebSocket, MCP (Model Context Protocol), và bộ tài liệu tham khảo dịch kỹ thuật.
* 🖼️ [`diagrams/`](./diagrams/): Chứa sơ đồ kiến trúc tổng thể và lưu đồ pipeline chấm điểm phân giải cao.
