# ĐẶC TẢ KỸ THUẬT PHÂN HỆ ĐỌC CHÍNH TẢ THÔNG MINH (AI DICTATION PLATFORM)
## HỆ THỐNG VIHAND GRADE — ĐỀ TÀI NCKH SINH VIÊN ĐẠI HỌC TÔN ĐỨC THẮNG

---

- **Đề tài**: Hệ thống nhận dạng chữ viết tay và chấm điểm bài tập chính tả tiếng Việt cho học sinh tiểu học sử dụng AI (ViHand Grade)
- **Cơ quan chủ quản**: Khoa Điện – Điện Tử, Trường Đại học Tôn Đức Thắng (2025–2026)
- **Giảng viên hướng dẫn**: TS. Lê Anh Vũ
- **Nhóm sinh viên thực hiện**: Dương Thành Long · Phạm Hoài Quốc Bảo · Nguyễn Thanh Phúc
- **Module đặc tả**: Phân hệ Đọc chính tả Sư phạm (`app/teacher/dictation/page.tsx` & Backend Services)
- **Phiên bản tài liệu**: v2.5.0 (Production Architecture — Buồng Lái Lớp Học & Chế Độ Chiếu Bảng Xanh)

---

> [!IMPORTANT]
> **Xác thực kiến trúc kỹ thuật**: Hệ thống Đọc chính tả thực tế của ViHand Grade **hoàn toàn tự chủ**, được vận hành trực tiếp trên hạ tầng Web Fullstack (Next.js 16) kết hợp Python Microservice của chính dự án. Hệ thống **không sử dụng bất kỳ AI bên thứ ba nào của Xiaozhi** để phát âm hay xử lý bài đọc. Mọi quy trình từ tạo bài, phân rã sư phạm, tổng hợp âm thanh đa tầng đến lưu trữ Ground Truth đều được thực thi khép kín nội bộ.

---

## 1. TỔNG QUAN VÀ MỤC TIÊU PHÂN HỆ

Phân hệ **Đọc Chính Tả AI** trong ViHand Grade được phát triển nhằm giải quyết triệt để 3 vấn đề lớn trong dạy và học chính tả tiểu học:
1. **Giải phóng giáo viên khỏi việc đọc lặp đi lặp lại**: Đảm bảo tốc độ đọc chuẩn mực, âm sắc rõ ràng, không bị ảnh hưởng bởi mệt mỏi hay phát âm lệch chuẩn địa phương.
2. **Cung cấp nguồn ngữ liệu chuẩn hóa (Ground Truth)**: Mọi bài đọc phát ra đều được định danh và lưu trữ vào CSDL làm "văn bản chuẩn tuyệt đối" để cung cấp cho mô hình OCR (Gemini Vision) và mô hình sửa lỗi (ViT5) đối sánh khi chấm điểm tự động.
3. **Phù hợp tâm sinh lý học sinh tiểu học (Lớp 1–5)**: Trang bị thuật toán phân rã câu thành các cụm từ ngữ nghĩa vừa vặn với trí nhớ ngắn hạn, kết hợp bộ đếm nhịp tim thời gian thực thích ứng theo tốc độ viết tay của học sinh.

---

## 2. BẢNG TỔNG HỢP TECH STACK THỰC TẾ TRONG TAB ĐỌC CHÍNH TẢ

| Tầng kiến trúc | Công nghệ / Thư viện | Phiên bản | Vai trò & Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | `16.2.4` | Khung ứng dụng Server-Side Rendering & Client Interactive Component |
| **Giao diện & Thành phần UI** | **React & CSS Design Tokens** | React 19, CSS Tokens | UI Cockpit sư phạm "Bảng Xanh & Giấy Kem", dark mode, responsive máy chiếu |
| **Bộ Typography Sư phạm** | **Lexend & Be Vietnam Pro** | Google Fonts | Lexend hỗ trợ đọc/chống mỏi mắt học sinh; Be Vietnam Pro hiển thị tiếng Việt chuẩn |
| **Bộ linh kiện UI nguyên tử** | **Radix UI Primitives** | Mới nhất | Tabs, Dialog Modal, Select Dropdown, Badges, Tooltips, Sliders |
| **Iconography** | **Lucide React** | `^1.16.0` | Bộ biểu tượng đồ họa đồng bộ giao diện |
| **Chế độ Chiếu Bảng Xanh** | **HTML5 Fullscreen + SVG Ring** | Native Web | Chế độ bảng lớp học cho máy chiếu TV, vòng tròn SVG đếm ngược, ẩn/hiện chữ |
| **Tổng hợp giọng nói chính (Tier 1)** | **Microsoft Edge-TTS** | `edge-tts 6.1.12` | Động cơ đọc tiếng Việt Neural truyền cảm, tự nhiên (Hoài My, Nam Minh) |
| **Dịch vụ Microservice TTS** | **FastAPI + Uvicorn** | Python 3.10+ | Endpoint `/tts` bất đồng bộ truyền audio stream MP3 chất lượng cao |
| **Tổng hợp giọng nói phụ (Tier 2)** | **Google Translate TTS** | REST API | Cơ chế Fallback trực tuyến khi microservice cục bộ bảo trì/timeout |
| **Tổng hợp giọng nói phụ (Tier 3)** | **Web Speech API** | Native Browser | Cơ chế Fallback ngoại tuyến 100% chạy bằng giọng nói cài sẵn của OS Client |
| **AI Sáng tác bài đọc (Tier 1 SLM)** | **Qwen 2.5 SLM (0.5B-Instruct)** | Port 8000 / PyTorch | Sáng tác bài đọc chuẩn GDPT 2018 & trích xuất từ khó cục bộ (Local) |
| **Ngân hàng bài mẫu (Tier 2 Fallback)** | **GDPT 2018 Curriculum Bank** | CSDL Cố định | Dự phòng sư phạm tức thì 100% khi AI bận hoặc ngắt mạng |
| **Cơ sở dữ liệu** | **SQLite (WAL mode)** | 3.x | Lưu trữ cục bộ toàn bộ kho SGK (`TextbookPassage`) và phiên đọc (`DictationSession`) |
| **Quản trị CSDL (ORM)** | **Prisma ORM** | `5.22.0` | Type-safe Database Client truy vấn nhanh dữ liệu phiên đọc & bài mẫu |
| **Bảo vệ an toàn API** | **In-memory Token Bucket Guard** | Custom TS | Kiểm soát tần suất gọi API (Rate Limiting) chống quá tải dịch vụ AI |

---

## 3. KIẾN TRÚC MÔ HÌNH HỆ THỐNG ĐỌC CHÍNH TẢ (SYSTEM BLOCK DIAGRAM)

Kiến trúc phân hệ Đọc Chính Tả được tổ chức thành 4 khối chức năng liên kết chặt chẽ:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       VIHAND GRADE — DICTATION PLATFORM                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                  │
          ┌───────────────────────────────────────┴───────────────────────────────────────┐
          ▼                                                                               ▼
┌───────────────────────────────────┐                                   ┌───────────────────────────────────┐
│       1. NGUỒN NGỮ LIỆU ĐẦU VÀO   │                                   │    2. BỘ ĐIỀU PHỐI SƯ PHẠM WEB    │
├───────────────────────────────────┤                                   ├───────────────────────────────────┤
│ • Kho SGK Lớp 1–5 (Prisma SQLite) │                                   │ • Thuật toán tách cụm từ sư phạm  │
│   (Kết Nối, Cánh Diều, Chân Trời) │                                   │   (splitIntoPedagogicalClauses)   │
│ • SLM Local (Qwen 2.5-0.5B)       │ ──── Nạp văn bản & Từ khó ─────▶  │ • Điều phối nhịp đọc thời gian thực│
│ • Ngân hàng GDPT 2018 dự phòng    │                                   │ • Bộ đếm thời gian thích ứng      │
│ • Giáo viên soạn thảo tự do       │                                   │   (~1.6s/từ theo lứa tuổi)        │
│ • Tải lên tệp văn bản thô (.txt)  │                                   │                                   │
└───────────────────────────────────┘                                   └───────────────────────────────────┘
                                                                                          │
                                                                   Yêu cầu âm thanh       ▼
                                                                ┌───────────────────────────────────┐
                                                                │  3. ĐỘNG CƠ TỔNG HỢP GIỌNG NÓI    │
                                                                │        (MULTI-TIER TTS)           │
                                                                ├───────────────────────────────────┤
                                                                │ [Tier 1] Edge-TTS Neural Voice    │
                                                                │   • vi-VN-HoaiMyNeural (Nữ Bắc)   │
                                                                │   • vi-VN-NamMinhNeural (Nam Bắc) │
                                                                │   • Tốc độ: -35% đến +10%         │
                                                                │          ↕ (Fallback tự động)     │
                                                                │ [Tier 2] Google Translate TTS     │
                                                                │          ↕ (Fallback ngoại tuyến) │
                                                                │ [Tier 3] Web Speech API (Client)  │
                                                                └───────────────────────────────────┘
                                                                                  │
                                                            Lưu phiên làm việc    ▼
                                                                ┌───────────────────────────────────┐
                                                                │  4. KHO LƯU TRỮ GROUND TRUTH      │
                                                                ├───────────────────────────────────┤
                                                                │ • SQLite (prisma/vihand.db)       │
                                                                │ • Bảng DictationSession           │
                                                                │ • Liên kết trực tiếp sang         │
                                                                │   Hệ thống chấm điểm ViT5/Gemini  │
                                                                │   (app/teacher/grade/page.tsx)    │
                                                                └───────────────────────────────────┘
```

---

## 4. CHI TIẾT 3 PHÂN HỆ CHỨC NĂNG TRONG TAB ĐỌC CHÍNH TẢ

Giao diện quản trị của giáo viên tại [`app/teacher/dictation/page.tsx`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/teacher/dictation/page.tsx) được cấu trúc thành 3 Tab chức năng độc lập:

### 4.1. Tab 1: Trình Phát Đọc AI (Smart Dictation Player)
Bao gồm bố cục 2 cột đồng bộ (12-column grid layout):

#### Cột trái (6 cột) — Khu vực Soạn thảo & Quản lý bài đọc
- **Nhập liệu linh hoạt**: Cho phép nhập tiêu đề, đoạn văn bản bài đọc và danh sách các từ khó phát âm/dễ viết sai.
- **Thống kê thời gian thực**: Tự động đếm số từ (`wordCount`), hiển thị số câu và danh sách cụm từ sau khi phân rã sư phạm.
- **Công cụ trợ giúp**:
  - Nút **"Tạo bài đọc bằng AI"**: Kích hoạt Modal Sáng tác Generative Dictation vận hành bởi mô hình Qwen 2.5 SLM cục bộ kết hợp Ngân hàng ngữ liệu GDPT 2018.
  - Nút **"Chọn từ Kho SGK"**: Chuyển nhanh sang kho bài đọc chuẩn.
  - Nút **"Tải tệp .txt"**: Nhập nhanh bài đọc từ máy tính giáo viên.

#### Cột phải (6 cột) — Trung tâm Cấu hình Sư phạm & Điều khiển giọng đọc
- **Cấu hình Động cơ Giọng đọc (`voiceEngine`)**:
  - `vi-VN-HoaiMyNeural`: Giọng cô giáo miền Bắc truyền cảm, rõ nét (Khuyên dùng cho bài đọc chính tả).
  - `vi-VN-NamMinhNeural`: Giọng thầy giáo miền Bắc chuẩn mực, trang trọng.
  - `google_tts`: Giọng đọc Google trực tuyến.
  - `browser_voice`: Giọng đọc tích hợp của hệ điều hành trên máy tính client.
- **Cấu hình Tốc độ đọc (`speedRate`)**:
  - Cực chậm (-35%) — Lớp 1 (Rèn luyện đặt nét bút).
  - Rất chậm (-25%) — Lớp 1–2.
  - Chậm (-20%) — Rèn chữ đẹp.
  - **Chuẩn (-15%) — Khuyên dùng theo khuyến nghị sư phạm Bộ GD&ĐT**.
  - Vừa phải (-10%) — Lớp 3.
  - Hơi chậm (-5%) — Lớp 4–5.
  - Bình thường (0%) & Nhanh (+10%).
  - Tùy chỉnh phần trăm chính xác (`customSpeedPercent`).
- **Cấu hình Số lần lặp lại (`repeatCount`)**: 1 lần, 2 lần (Chuẩn sư phạm), 3 lần, 4 lần, 5 lần, hoặc số lần nhập tay.
- **Cấu hình Thời gian nghỉ (`pauseSetting`)**:
  - Cố định từ `1 giây` đến `10 giây`.
  - **Tự động (`auto`)**: Tính toán động $T_{pause} = \max(5\text{s}, \text{round}(N_{words} \times 1.6\text{s}))$.
- **Cấu hình Chế độ ngắt cụm sư phạm (`chunkMode`)**:
  - `short`: Cụm ngắn (3–5 từ) — Lớp 1–2.
  - `standard`: Cụm chuẩn (5–8 từ) — Lớp 3.
  - `sentence`: Cả câu dài — Lớp 4–5.
- **Thanh điều khiển trạng thái**:
  - Nút **Bắt đầu đọc**: Khởi chạy phiên đọc mới.
  - Nút **Tạm dừng / Tiếp tục**: Dừng tạm thời audio và đóng băng bộ đếm ngược.
  - Nút **Dừng hẳn**: Hủy phiên làm việc.
  - Nút **Đọc lại câu này**: Phát lại ngay lập tức câu hiện tại mà không làm hỏng tiến trình chung.
  - Nút **Nghe thử**: Kiểm tra trước phát âm của một cụm từ bất kỳ.

---

### 4.2. Tab 2: Kho Ngữ Liệu SGK (Textbook Corpus Management)
- **Cơ sở dữ liệu số hóa**: Lưu trữ hàng trăm bài văn/thơ chính tả trích từ các bộ sách giáo khoa hiện hành:
  - Bộ sách: **Kết Nối Tri Thức Với Cuộc Sống**, **Cánh Diều**, **Chân Trời Sáng Tạo**.
  - Khối lớp: Lớp 1, Lớp 2, Lớp 3, Lớp 4, Lớp 5.
- **Bộ lọc & Tra cứu đa tiêu chí**:
  - Lọc nhanh theo Khối lớp (`gradeLevel`).
  - Lọc theo Bộ sách (`bookSet`).
  - Thanh tìm kiếm tức thời theo Tên bài đọc hoặc Nội dung văn bản.
- **Thao tác quản trị nội dung**:
  - Thêm bài đọc mới vào kho.
  - Chỉnh sửa nội dung, tuần học và danh sách từ khó.
  - Xóa bài đọc khỏi kho.
  - Nút **"Chọn đọc bài này"**: Đưa toàn bộ nội dung bài vào Tab Trình Phát chỉ với 1 cú click.

---

### 4.3. Tab 3: Lịch Sử Phiên Đọc & Cầu Nối Ground Truth (History & Grading Bridge)
- **Quản lý lịch sử phiên đọc (`DictationSession`)**:
  - Hiển thị theo từng lớp học (`className`), thời gian tạo, tên giáo viên và trạng thái.
  - Xem chi tiết toàn văn bài đã đọc và danh sách từ khó đã luyện tập.
- **Cầu nối Chấm điểm tự động (Ground Truth Integration)**:
  - Mỗi phiên đọc sau khi hoàn tất sẽ có nút hành động: **"Chấm bài theo phiên này"**.
  - Hệ thống tự động chuyển hướng sang trang Chấm bài: `/teacher/grade?dictationSessionId={sessionId}`.
  - Văn bản của phiên đọc này sẽ được khóa làm **Ground Truth duy nhất** để đối chiếu với ảnh chụp bài viết tay của học sinh, giúp thuật toán Levenshtein và ViT5 phát hiện chính xác từng lỗi thiếu từ, thừa từ, sai dấu thanh hoặc sai phụ âm đầu.

---

## 5. THUẬT TOÁN CỐT LÕI ĐƯỢC HIỆN THỰC

### 5.1. Thuật toán phân rã cụm từ sư phạm (`splitIntoPedagogicalClauses`)
*Vị trí file:* [`app/teacher/dictation/page.tsx`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/teacher/dictation/page.tsx#L170-L225)

#### Mục tiêu sư phạm:
Học sinh tiểu học (đặc biệt Lớp 1–3) chưa thể ghi nhớ toàn bộ một câu phức dài 15–20 từ trong một lần nghe. Thuật toán phân rã câu thành các cụm từ hoàn chỉnh về mặt ngữ nghĩa, bám theo các mốc ngắt tự nhiên của ngữ pháp tiếng Việt:

```typescript
function splitIntoPedagogicalClauses(
  text: string,
  chunkMode: "short" | "standard" | "sentence" = "standard"
): string[] {
  if (!text || !text.trim()) return []

  // 1. Chuẩn hóa xuống dòng và tách các câu theo dấu ngắt câu
  const rawSentences = text
    .replace(/\r\n/g, "\n")
    .split(/([.\n?!;]+)/)
    .filter(Boolean)

  const sentences: string[] = []
  for (let i = 0; i < rawSentences.length; i += 2) {
    const content = rawSentences[i]?.trim()
    const punctuation = rawSentences[i + 1]?.trim() || ""
    if (content) {
      sentences.push(content + (punctuation && punctuation !== "\n" ? punctuation : ""))
    }
  }

  // Chế độ dành cho Lớp 4-5: Đọc nguyên cả câu dài
  if (chunkMode === "sentence") {
    return sentences.filter(c => c.trim().length > 0)
  }

  // Giới hạn số từ tối đa theo từng khối lớp
  const maxWords = chunkMode === "short" ? 5 : 7
  const clauses: string[] = []

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) {
      clauses.push(sentence)
    } else {
      // Tách tiếp theo dấu phẩy và dấu hai chấm
      const subClauses = sentence.split(/([,:]+)/)
      for (let j = 0; j < subClauses.length; j += 2) {
        const sub = subClauses[j]?.trim()
        const comma = subClauses[j + 1]?.trim() || ""
        if (sub) {
          if (chunkMode === "short") {
            const subWords = sub.split(/\s+/).filter(Boolean)
            if (subWords.length > 5) {
              // Chia đôi cụm từ nếu vẫn dài hơn 5 từ
              const half = Math.ceil(subWords.length / 2)
              clauses.push(subWords.slice(0, half).join(" "))
              clauses.push(subWords.slice(half).join(" ") + comma)
            } else {
              clauses.push(sub + comma)
            }
          } else {
            clauses.push(sub + comma)
          }
        }
      }
    }
  }

  return clauses.filter(c => c.trim().length > 0)
}
```

---

### 5.2. Thuật toán Vòng đời Trình phát thông minh & Fallback Đa tầng
*Vị trí file:* [`app/teacher/dictation/page.tsx`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/teacher/dictation/page.tsx#L449-L665)

```
[Bắt đầu đọc phiên mới: Sinh sessionToken]
                  │
                  ▼
         [Vòng lặp từng cụm từ i = 0 ... N-1]
                  │
                  ▼
         [Vòng lặp lần đọc lặp lại r = 1 ... maxRepeat]
                  │
                  ▼
         [Thực thi hàm speakClause(clause, sessionToken)]
                  │
                  ├── [Thử Tier 1: Next.js API /api/dictation/tts -> Python Edge-TTS]
                  │        │
                  │        ├─ Thành công? ──▶ [Phát Audio HTML5 Element]
                  │        │
                  │        └─ Thất bại / Timeout 10s?
                  │                 │
                  │                 ▼
                  ├── [Thử Tier 2: Google Translate TTS Online Fallback]
                  │        │
                  │        ├─ Thành công? ──▶ [Phát Audio HTML5 Element]
                  │        │
                  │        └─ Thất bại?
                  │                 │
                  │                 ▼
                  └── [Thử Tier 3: Browser Web Speech API Offline (SpeechSynthesis)]
                           │
                           ▼
                  [Chờ âm thanh phát xong (audio.onended)]
                           │
                           ▼
         [Tính toán thời gian nghỉ: T_pause = max(5s, round(Số từ * 1.6s))]
                           │
                           ▼
         [Vòng lặp đếm lùi nhịp tim sleepWithCountdown()]
                  │ (Cập nhật UI mỗi giây; Cho phép Tạm dừng / Tiếp tục / Đọc lại)
                  ▼
         [Tăng r = r + 1; nếu hết r thì chuyển sang cụm từ tiếp theo i = i + 1]
                  │
                  ▼
[Kết thúc bài đọc: Lời nhắc "Đã hoàn thành bài đọc chính tả. Các em hãy soát lại bài."]
```

---

## 6. ĐỘNG CƠ SÁNG TÁC BÀI ĐỌC BẰNG AI (QWEN 2.5 SLM & NGÂN HÀNG GDPT 2018)

*Vị trí file:* [`app/api/dictation/generate/route.ts`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/api/dictation/generate/route.ts) & [`python_service/main.py`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/python_service/main.py#L1188-L1315)

### 6.1. Nguyên lý kiến trúc 2 tầng (Two-Tier Generation Architecture)
Nhằm đảm bảo **tính tự chủ công nghệ**, **tốc độ phản hồi tức thời (<1.5s)** và **bảo toàn tài nguyên API Google Gemini cho khâu OCR nhận diện chữ viết tay**, phân hệ sáng tác bài đọc chính tả sử dụng mô hình ngôn ngữ nhỏ chạy cục bộ (Small Language Model - SLM):

- **Tầng 1 (AI SLM Local)**: Gọi microservice Python tại `POST http://localhost:8000/qwen/generate-passage` vận hành mô hình **Qwen2.5-0.5B-Instruct**. Mô hình được nạp Lazy Load với khóa an toàn luồng (`_qwen_lock`), tối ưu hóa trên CPU/GPU cho độ trễ cực thấp.
- **Tầng 2 (Curriculum Bank Deterministic Fallback)**: Nếu Python service chưa bật hoặc quá hạn thời gian chờ (Timeout 8.000ms), hệ thống tự động fallback tức thì sang **Ngân hàng ngữ liệu sư phạm chuẩn GDPT 2018** được biên soạn sẵn theo từng khối lớp (Lớp 1 đến Lớp 5), cam kết tỷ lệ thành công 100% không bao giờ làm gián đoạn bài giảng của giáo viên.

### 6.2. Cấu hình Prompt Sư phạm cho Qwen 2.5 SLM
Tại `python_service/main.py`, Prompt được chuẩn hóa nghiêm ngặt bám sát chuẩn kiến thức kỹ năng của Bộ GD&ĐT:

```python
system_prompt = (
    "Bạn là chuyên gia sư phạm tiểu học Việt Nam biên soạn sách giáo khoa Tiếng Việt (GDPT 2018).\n"
    "Nhiệm vụ: Sáng tác một đoạn văn bài đọc chính tả (nghe - viết) ngắn gọn, trong sáng, giàu tính giáo dục và chuẩn ngữ pháp cho học sinh tiểu học.\n"
    "Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ không có markdown codeblock, theo định dạng mẫu:\n"
    "{\n"
    '  "title": "Tiêu đề ngắn gọn",\n'
    '  "content": "Nội dung toàn bộ đoạn văn chính tả",\n'
    '  "difficultWords": "từ khó 1, từ khó 2, từ khó 3, từ khó 4",\n'
    '  "summary": "Tóm tắt ngắn gọn thông điệp bài đọc"\n'
    "}"
)
```

**Tiêu chuẩn phân loại theo từng Khối Lớp:**
- **Lớp 1**: Câu ngắn gọn (20–35 từ), từ ngữ đơn giản, gần gũi với đời sống học sinh.
- **Lớp 2**: Đoạn văn 30–45 từ, câu từ mạch lạc, hình ảnh trong sáng, tự nhiên.
- **Lớp 3**: Đoạn văn 40–60 từ, miêu tả sinh động, sử dụng từ láy và hình ảnh so sánh nhẹ nhàng.
- **Lớp 4**: Đoạn văn 60–80 từ, câu văn gợi cảm, có chiều sâu cảm xúc và thông điệp ý nghĩa.
- **Lớp 5**: Đoạn văn 75–95 từ, hành văn trau chuốt, giàu hình ảnh và chiều sâu tư tưởng.

### 6.3. Cấu trúc dữ liệu JSON trả về
```json
{
  "title": "Mùa Lúa Chín Quê Em",
  "content": "Cánh đồng lúa quê em vào mùa thu hoạch trải rộng như một tấm thảm lúa vàng óng ả. Từng cơn gió nhẹ lướt qua mang theo hương thơm ngòn ngọt, mộc mạc của bông lúa non. Các bác nông dân rộn rã gặt lúa với nụ cười rạng rỡ trên môi.",
  "difficultWords": "thu hoạch, vàng óng ả, ngòn ngọt, rộn rã, rạng rỡ",
  "summary": "Đoạn văn gợi tả vẻ đẹp trù phú của đồng lúa chín và niềm vui lao động của người nông dân.",
  "gradeLevel": 3,
  "topic": "Quê hương và lao động",
  "source": "qwen2.5_0.5b"
}
```

---

## 7. ĐẶC TẢ CHI TIẾT CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

*Vị trí file:* [`prisma/schema.prisma`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/prisma/schema.prisma)

### 7.1. Bảng `TextbookPassage` (Kho ngữ liệu SGK)
Lưu trữ các bài đọc chuẩn trích từ 3 bộ SGK Tiếng Việt hiện hành (Kết Nối Tri Thức, Cánh Diều, Chân Trời Sáng Tạo):
```prisma
model TextbookPassage {
  id             String   @id @default(cuid())
  gradeLevel     Int      @default(3)           // Khối lớp: 1 | 2 | 3 | 4 | 5
  bookSet        String   @default("KetNoi")    // Bộ sách: "KetNoi" | "CanhDieu" | "ChanTroi"
  unit           String   @default("Tuần 1")    // Tuần/Bài học (VD: "Tuần 3", "Bài 12")
  title          String                          // Tiêu đề bài đọc (VD: "Ai có lỗi")
  content        String                          // Đoạn văn chính tả đầy đủ
  difficultWords String   @default("")           // Danh sách từ khó dễ viết sai (phân cách bằng dấu phẩy)
  createdAt      DateTime @default(now())
}
```

### 7.2. Bảng `DictationSession` và `DictationLog` (Ground Truth & Nhật ký)
Nguồn chân lý duy nhất (Single Source of Truth) làm văn bản mẫu Ground Truth phục vụ đối sánh chấm điểm tự động:
```prisma
// Phiên đọc chính tả: nguồn chân lý duy nhất (Single Source of Truth)
model DictationSession {
  id            String         @id @default(cuid())
  title         String                                // Tiêu đề bài đọc (VD: "Nghe viết: Ai có lỗi")
  passage       String                                // Văn bản bài đọc chuẩn (Ground Truth để đối chiếu chấm bài)
  className     String         @default("")           // Lớp học (VD: "3A", "4B")
  teacherName   String         @default("")           // Tên giáo viên phụ trách
  source        String         @default("web")        // Nguồn tạo phiên: "web" | "manual"
  deviceId      String         @default("")           // Định danh thiết bị phát âm (nếu có)
  status        String         @default("completed")  // "completed" | "in_progress" | "cancelled"
  summary       String         @default("")           // Tóm tắt phiên
  createdAt     DateTime       @default(now())
  logs          DictationLog[]
}

// Nhật ký chi tiết từng lượt trong phiên
model DictationLog {
  id           String           @id @default(cuid())
  sessionId    String                                 // Liên kết DictationSession
  session      DictationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  speaker      String                                 // "teacher" | "student" | "ai"
  content      String                                 // Nội dung văn bản / lệnh điều khiển
  createdAt    DateTime         @default(now())
}
```

### 7.3. Bảng `Grade` (Liên kết Ground Truth)
Mỗi bản ghi chấm điểm lưu trường `dictationSessionId` để liên kết:
```prisma
model Grade {
  id                 String    @id @default(cuid())
  gradingMode        String    @default("dictation") // "dictation" | "essay"
  studentName        String
  assignmentTitle    String
  originalText       String    // Văn bản OCR bóc từ bài viết tay
  fixedText          String    // Văn bản sau khi sửa lỗi chính tả (ViT5)
  dictationSessionId String    @default("") // Khóa ngoại logic trỏ tới DictationSession
  // ... các trường chấm điểm và bảo mật khác
}
```

---

## 8. DANH MỤC API ENDPOINTS VÀ GIAO THỨC TRUYỀN THÔNG

### 8.1. Các Endpoints nội bộ trong ứng dụng Next.js

| Method | Endpoint URL | Mục đích | Tham số chính |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dictation/passages` | Lấy danh sách bài đọc SGK | `gradeLevel`, `bookSet`, `q` (từ khóa) |
| `POST` | `/api/dictation/passages` | Thêm bài đọc mới vào kho SGK | `title`, `content`, `gradeLevel`, `bookSet`, `difficultWords` |
| `PATCH` | `/api/dictation/passages` | Cập nhật bài đọc đã có | `id`, `title`, `content`, `gradeLevel`, `bookSet` |
| `DELETE` | `/api/dictation/passages` | Xóa bài đọc khỏi kho | Query param `?id={id}` |
| `GET` | `/api/dictation/sessions` | Lấy lịch sử các phiên đọc | `className`, `limit` |
| `POST` | `/api/dictation/sessions` | Lưu phiên đọc mới làm Ground Truth | `title`, `passage`, `className`, `teacherName`, `source` |
| `GET` | `/api/dictation/tts` | Bộ điều phối phát âm đa tầng | `text`, `voice`, `rate`, `lang` |
| `POST` | `/api/dictation/generate` | Điều phối sáng tác bài đọc (Qwen 2.5 SLM + Fallback) | `gradeLevel`, `topic`, `sentenceCount`, `bookSet` |

### 8.2. Các Endpoints Microservice Python (`python_service/main.py`)

| Method | Endpoint URL | Vai trò chức năng | Đặc tả kỹ thuật |
| :--- | :--- | :--- | :--- |
| `GET` | `http://localhost:8000/tts` | Tổng hợp âm thanh Neural Edge-TTS | Nhận `text`, `voice`, `rate`. Stream `audio/mpeg` trực tiếp với cache header. |
| `POST` | `http://localhost:8000/qwen/generate-passage` | Sáng tác bài đọc chính tả bằng SLM | Nhận `grade`, `topic`, `sentence_count`, `book_set`. Sinh văn bản + bóc tách từ khó. |
| `GET` | `http://localhost:8000/qwen/status` | Kiểm tra trạng thái mô hình SLM | Trả về `enabled`, `model_id`, `is_loaded`, `device` (cuda/cpu). |

---

## 9. KẾT LUẬN & ĐÁNH GIÁ SỰ PHÙ HỢP VỚI ĐỀ TÀI NCKH

1. **Tính tự chủ công nghệ cao**: Hệ thống không phụ thuộc vào bất kỳ nền tảng AI thương mại bên ngoài nào cho tính năng đọc chính tả, giúp ứng dụng hoạt động ổn định, bảo mật và tiết kiệm chi phí triển khai.
2. **Chuẩn mực sư phạm**: Từ việc phân rã câu, tính thời gian nghỉ thích ứng đến tốc độ đọc $-15\%$ đều được nghiên cứu và tinh chỉnh phù hợp với đặc thù tiếp nhận của học sinh tiểu học Việt Nam.
3. **Mối liên kết khép kín với hệ thống Chấm Điểm**: Việc biến mỗi phiên đọc chính tả thành một **Ground Truth tham chiếu** giải quyết được bài toán khó nhất của việc chấm chữ viết tay: *nhận dạng được cả các từ học sinh bỏ sót hoàn toàn hoặc viết sai lệch quá xa so với văn bản gốc*.
