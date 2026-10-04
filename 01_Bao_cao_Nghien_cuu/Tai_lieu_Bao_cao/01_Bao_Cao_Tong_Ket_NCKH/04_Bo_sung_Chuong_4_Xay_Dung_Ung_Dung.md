# 📘 NỘI DUNG BỔ SUNG & CHỈNH SỬA CHO CHƯƠNG 4
## CHƯƠNG 4 — XÂY DỰNG ỨNG DỤNG

> **Hướng dẫn sử dụng cho tác giả:**
> Mở file `Báo cáo tổng eureka - Thiết bị chấm điểm.docx`, tìm đến Chương 4 để bổ sung: Giao diện Tab Đọc chính tả Web (`/teacher/dictation`), Giao diện Chấm điểm Đa phân môn (`/teacher/grade`), Cập nhật Lược đồ Cơ sở dữ liệu Prisma/SQLite đầy đủ 6 bảng, và Danh sách API Endpoints của hệ thống.

---

### 4.1. Bổ sung Giao diện Tab Đọc Chính Tả & Chấm Điểm Đa Phân Môn (Mục 4.1)

#### 4.1.X. Giao diện Tab Đọc Chính Tả Trực Tiếp Trên Web (`/teacher/dictation`)
Trang web được thiết kế chuyên biệt để biến chiếc máy tính của giáo viên kết nối với loa trợ giảng thành một người trợ giảng ảo đọc chính tả hoàn hảo:

1. **Bộ chọn Ngữ liệu SGK Chuẩn hóa**:
   - Giáo viên chọn nhanh Khối lớp (Lớp 1 đến Lớp 5), Bộ sách giáo khoa (*Kết Nối Tri Thức*, *Cánh Diều*, *Chân Trời Sáng Tạo*) và Tuần học.
   - Hệ thống tự động nạp đoạn văn chuẩn từ bảng `TextbookPassage`. Giáo viên cũng có thể tự soạn thảo hoặc chỉnh sửa bài đọc tùy ý.
2. **Bảng Luyện viết "Từ Khó Dễ Sai"**:
   - Tự động trích xuất các từ vựng phức tạp có phụ âm đầu hoặc vần khó (VD: *khuỷu tay, ngoằn ngoèo, san sẻ...*) để giáo viên hướng dẫn học sinh luyện viết trước trên bảng con.
3. **Bộ Điều khiển Nhịp Đọc Sư Phạm (Pedagogical Dictation Controller)**:
   - *Tốc độ đọc (Speech Rate)*: Mặc định `-15%` giúp phát âm rõ ràng từng thanh điệu.
   - *Số lượt lặp lại (Repeat Count)*: Tùy chỉnh đọc lặp 2 đến 3 lượt cho từng cụm từ/câu ngắn.
   - *Đếm ngược thời gian ngắt nghỉ (Pause Countdown)*: Tự động chèn khoảng lặng **1.5 giây cho mỗi từ** (VD: câu 6 từ sẽ có khoảng dừng 9 giây) kèm đồng hồ đếm ngược trực quan để học sinh cả lớp kịp viết xong trước khi đọc câu tiếp theo.
4. **Nút bấm Luân chuyển Dữ liệu 1-Click ("Chuyển sang Chấm bài")**:
   - Khi kết thúc bài đọc, giáo viên bấm nút chuyển tiếp sang giao diện chấm bài: hệ thống tự động lưu phiên vào bảng `DictationSession` và mang theo `sessionId` cùng nội dung bài đọc chuẩn làm **Ground Truth** cho module chấm điểm mà không cần phải nhập lại.

---

#### 4.1.Y. Giao diện Tab Chấm Điểm Đa Phân Môn (`/teacher/grade`)
Giao diện chấm bài hỗ trợ tính năng **Human-in-the-loop (Con người giữ vai trò chủ đạo)**:

1. **Bộ Chuyển Đổi Chế Độ (Mode Toggle)**:
   - Nút gạt linh hoạt giữa hai phân môn: **"Chính tả SGK (Ground Truth)"** và **"Tập làm văn tự do (Two-Tier SLM)"**.
2. **Khung Tải Ảnh & Tiền Xử Lý Trực Quan**:
   - Cho phép giáo viên chụp ảnh trực tiếp bằng Camera điện thoại hoặc kéo thả ảnh chụp bài viết.
   - Hiển thị song song hai khung hình: Ảnh gốc của học sinh và Ảnh đã xử lý sạch ô ly qua bộ lọc Jimp.
3. **Popup Kết Quả Chi Tiết & Thẻ Lỗi Trực Quan**:
   - Đoạn văn của học sinh được hiển thị với các từ viết sai được **tô viền đỏ nổi bật**.
   - Bấm vào từng từ sai sẽ hiện thẻ giải thích chi tiết: *Từ học sinh viết*, *Từ đúng gợi ý*, *Phân loại nhóm lỗi* và *Lời nhắc nhở thân thiện* (VD: *"Con viết 'dòng xông' nhưng đúng phải là 'dòng sông' nhé. Chú ý phân biệt âm s và x"*).
4. **Thanh Trượt Tinh Chỉnh Điểm (Slider Score Adjuster)**:
   - AI đưa ra điểm số gợi ý ban đầu. Giáo viên có toàn quyền dùng thanh trượt kéo điều chỉnh điểm thành phần (Hình thức, Nội dung, Sáng tạo) theo cảm nhận sư phạm thực tế trước khi bấm nút **"Xác nhận & Lưu vào Sổ điểm"**.

---

### 4.2. Cập nhật Lược Đồ Cơ Sở Dữ Liệu Toàn Diện (Mục 4.2.1)

Thay thế phần mô tả Database cũ bằng lược đồ CSDL **Prisma ORM 5 / SQLite** gồm 6 bảng dữ liệu cốt lõi:

```prisma
// 1. Quản lý Tài khoản & Phân quyền 3 cấp (Admin / Teacher / Student)
model User {
  id        String   @id @default(cuid())
  name      String
  username  String   @unique
  password  String   @default("123456")
  role      String   @default("student") // "admin" | "teacher" | "student"
  className String   @default("")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  classes   Class[]  @relation("TeacherClasses")
}

// 2. Quản lý Lớp học & Phân công Giáo viên chủ nhiệm
model Class {
  id        String   @id @default(cuid())
  name      String   @unique             // Tên lớp: "3A", "4B"
  grade     Int      @default(3)         // Khối lớp: 1, 2, 3, 4, 5
  teacherId String?
  teacher   User?    @relation("TeacherClasses", fields: [teacherId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
}

// 3. Quản lý Kết quả Chấm bài & Vòng đời Dữ liệu Học sinh
model Grade {
  id                 String    @id @default(cuid())
  gradingMode        String    @default("dictation") // "dictation" | "essay"
  studentName        String
  assignmentTitle    String
  className          String    @default("")
  originalText       String    // Văn bản thô OCR nhận diện từ ảnh
  fixedText          String    // Văn bản đã sửa lỗi hoàn chỉnh
  corrections        String    // JSON danh sách các lỗi sai bóc tách
  score              String    // Điểm số hiển thị (VD: "8.5/10")
  scoreNum           Float     // Điểm số định lượng phục vụ vẽ biểu đồ (8.5)
  scoreBreakdown     String    // JSON chi tiết điểm từng tiêu chí
  feedback           String    // Lời nhận xét ngắn
  pedagogicalComment String    @default("") // Lời phê sư phạm toàn diện từ Qwen SLM
  overallRating      String    // Xếp loại: "Xuất sắc" | "Tốt" | "Khá" | "Trung bình" | "Cần cố gắng"
  processingTimeMs   Int       @default(0)  // Thời gian xử lý toàn trình (ms)
  tokenCount         Int       @default(0)
  imagePath          String    @default("") // Đường dẫn tệp ảnh đĩa (VD: /uploads/grades/xyz.jpg)
  dictationSessionId String    @default("") // Khóa ngoại liên kết với phiên đọc chính tả mẫu
  expiresAt          DateTime? // Ngày hết hạn lưu trữ (mặc định createdAt + 365 ngày)
  isAnonymized       Boolean   @default(false) // Đã ẩn danh hóa theo Nghị định 13 hay chưa
  anonymizedAt       DateTime? // Thời điểm ẩn danh hóa
  createdAt          DateTime  @default(now())
}

// 4. Kho Ngữ liệu Bài đọc Sách Giáo Khoa Tiếng Việt Tiểu học
model TextbookPassage {
  id             String   @id @default(cuid())
  gradeLevel     Int      @default(3)          // Khối lớp: 1 | 2 | 3 | 4 | 5
  bookSet        String   @default("KetNoi")   // "KetNoi" | "CanhDieu" | "ChanTroi"
  unit           String   @default("Tuần 1")   // Tuần/Bài học
  title          String                         // Tên bài đọc (VD: "Ai có lỗi")
  content        String                         // Văn bản bài đọc chuẩn (Ground Truth)
  difficultWords String   @default("")          // Danh sách từ khó luyện viết trước
  createdAt      DateTime @default(now())
}

// 5. Quản lý Phiên Đọc Chính Tả Của Giáo Viên (Single Source of Truth)
model DictationSession {
  id          String         @id @default(cuid())
  title       String                        // Tiêu đề bài đọc
  passage     String                        // Văn bản đọc chuẩn làm Ground Truth đối soát
  className   String         @default("")
  teacherName String         @default("")
  status      String         @default("completed") // "completed" | "in_progress"
  createdAt   DateTime       @default(now())
  logs        DictationLog[]
}

// 6. Nhật ký Hội thoại & Lệnh Điều Khiển Trong Phiên Đọc
model DictationLog {
  id        String           @id @default(cuid())
  sessionId String
  session   DictationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  speaker   String           // "teacher" | "assistant"
  content   String           // Nội dung câu đọc hoặc lệnh điều khiển nhịp
  createdAt DateTime         @default(now())
}
```

---

### 4.3. Bổ sung Danh Sách API Endpoints của Hệ Thống (Mục 4.2.3)

Bổ sung bảng kê chi tiết toàn bộ các cổng giao tiếp API của hệ thống:

| Nhóm API | Endpoint | Phương thức | Chức năng kỹ thuật |
|---|---|:---:|---|
| **Tiền xử lý ảnh** | `/api/preprocess` | `POST` | Nhận ảnh Base64, thực thi 9 bước Jimp và trả về ảnh sạch ô ly kèm báo cáo chất lượng ảnh (`QualityReport`). |
| **Nhận diện chữ** | `/api/ocr` | `POST` | Gửi ảnh sang Gemini 3.1 Flash Lite VLM để trích xuất văn bản thô `original_text` còn nguyên lỗi sai. |
| **Chấm bài đa năng** | `/api/grade` | `POST` | Điều phối chấm điểm: So khớp Ground Truth (Chính tả) hoặc phân tích 2 tầng ViT5 + Qwen2.5 (Tập làm văn). |
| **Quản lý điểm số** | `/api/grades` | `GET`, `POST` | Lấy danh sách điểm số có lọc theo lớp/bài tập; lưu bài làm và lưu tệp ảnh vật lý ra đĩa cứng `/uploads/grades/`. |
| **Đọc chính tả Web** | `/api/dictation/passages` | `GET`, `POST` | Truy xuất kho bài đọc SGK Lớp 1–5 theo bộ sách và tuần học. |
| **Phiên đọc chính tả** | `/api/dictation/sessions` | `GET`, `POST` | Tạo mới, cập nhật và lưu vết phiên đọc chính tả của giáo viên làm Ground Truth. |
| **Phát âm thanh TTS** | `/api/dictation/tts` | `GET` | Proxy gọi sang Python service để stream âm thanh bài đọc MP3 chất lượng cao bằng Edge-TTS. |
| **Quản trị lưu trữ** | `/api/admin/retention` | `GET`, `POST` | Báo cáo dung lượng ảnh đĩa; kích hoạt quy trình Soft Purge ẩn danh hóa bài thi quá 365 ngày (Nghị định 13). |
| **Python Microservice** | `:8000/tts` | `GET` | Streaming giọng đọc tiếng Việt Hoài My / Nam Minh qua thư viện `edge_tts`. |
| **Python Microservice** | `:8000/grade` | `POST` | Chạy mô hình ViT5 INT8 sửa lỗi chính tả và SequenceMatcher tính điểm cục bộ. |
| **Python Microservice** | `:8000/qwen/generate`| `POST` | Kích hoạt mô hình SLM Qwen2.5-0.5B-Instruct sinh nhận xét sư phạm Tầng 2. |

---

### 4.4. Bổ sung Quy Trình Vận Hành Khởi Chạy 1-Chạm (Mục 4.3.1)

Bổ sung tài liệu mô tả tệp khởi động hệ thống `start_all.bat`:
> Nhằm giúp giáo viên và các chuyên viên công nghệ thông tin tại các trường tiểu học có thể khởi động toàn bộ hệ thống một cách dễ dàng mà không cần phải gõ các câu lệnh terminal phức tạp, hệ thống cung cấp tệp thực thi khởi động tự động **`start_all.bat`**:
> 1. Tự động kiểm tra môi trường Node.js 18+ và Python 3.10+.
> 2. Kiểm tra sự tồn tại của khóa cấu hình `GEMINI_API_KEY`.
> 3. Khởi động song song hai cửa sổ dịch vụ:
>    - **Cửa sổ 1**: Chạy máy chủ Web Frontend & REST API Next.js trên cổng **3000** (`npm run dev`).
>    - **Cửa sổ 2**: Thiết lập biến môi trường `set ENABLE_QWEN_SLM=1` và khởi động Python AI Microservice trên cổng **8000** (`python main.py`).
> 4. Toàn bộ hệ thống sẵn sàng phục vụ chỉ sau khoảng 10–15 giây khởi động một chạm.
