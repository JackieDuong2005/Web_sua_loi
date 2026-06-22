# Chương 4: Xây dựng ứng dụng

Chương này mô tả chi tiết quá trình hiện thực hóa hệ thống ViHand Grade từ bản thiết kế kiến trúc (Chương 3) thành một ứng dụng web đầy đủ chức năng có thể vận hành thực tế tại lớp học, bao gồm công nghệ được sử dụng, quy trình phát triển và các bước triển khai.

---

## 4.1. Mô tả hệ thống

### 4.1.1. Mục tiêu hệ thống

Hệ thống ViHand Grade được xây dựng nhằm giải quyết bài toán cụ thể: giảm thiểu thời gian và công sức của giáo viên tiểu học trong việc chấm bài chính tả viết tay hằng ngày, đồng thời cung cấp phản hồi chi tiết và có tính sư phạm cho học sinh. Các chỉ số mục tiêu được xác định rõ ràng ngay từ đầu dự án:

| Mục tiêu | Chỉ số đo lường |
|---|---|
| Tốc độ chấm điểm | Dưới 30 giây/bài |
| Độ chính xác nhận dạng ký tự | ≥ 90% ký tự tiếng Việt có dấu |
| Định dạng ảnh hỗ trợ | JPG, PNG, WebP — tối đa 10MB |
| Khả năng xử lý ảnh thực tế | Giấy ô ly, bút chì nhạt, ánh sáng lệch, ảnh chụp nghiêng |
| Môi trường phần cứng | Raspberry Pi 4 (4GB RAM, CPU ARM Cortex-A72) |

### 4.1.2. Quy trình phát triển hệ thống

Hệ thống được phát triển theo mô hình lặp và tăng dần (Iterative & Incremental), ưu tiên kiểm tra thực tế ở từng giai đoạn trước khi tích hợp:

1. **Giai đoạn 1 — Nghiên cứu và lập kế hoạch:** Xác định bài toán chấm điểm chính tả tiểu học, đánh giá các mô hình AI tiếng Việt có sẵn, lựa chọn kiến trúc Hybrid AI.
2. **Giai đoạn 2 — Xây dựng module xử lý ảnh:** Lập trình và kiểm thử độc lập 9 bước pipeline tiền xử lý ảnh bằng Jimp, đảm bảo đầu ra chuẩn trước khi ghép vào luồng OCR.
3. **Giai đoạn 3 — Tích hợp OCR:** Kết nối với Gemini API, thiết kế kỹ thuật Prompt chỉ trích xuất nguyên văn, không tự ý sửa lỗi của học sinh.
4. **Giai đoạn 4 — Xây dựng module chấm điểm AI cục bộ:** Cài đặt và tối ưu hóa mô hình ViT5 bằng Dynamic INT8 Quantization, xây dựng FastAPI service, tích hợp giải thuật Levenshtein để phân loại lỗi và tính điểm.
5. **Giai đoạn 5 — Phát triển giao diện người dùng:** Xây dựng hệ thống giao diện đầy đủ cho ba nhóm người dùng (Admin, Giáo viên, Học sinh) bằng Next.js + shadcn/ui.
6. **Giai đoạn 6 — Triển khai và kiểm thử thực tế:** Cài đặt hệ thống lên Raspberry Pi 4, cấu hình Cloudflare Tunnel, kiểm thử với bài chính tả thực tế của học sinh.

### 4.1.3. Cách hoạt động của hệ thống

Người dùng truy cập vào hệ thống qua giao diện Web. Phía giáo viên, luồng chính gồm 5 bước:

**Bước 1 — Tải ảnh:** Giáo viên dùng điện thoại chụp ảnh bài viết tay và tải lên qua giao diện. Hệ thống hỗ trợ cả hai chế độ: chụp ảnh trực tiếp từ camera hoặc upload file từ bộ nhớ.

**Bước 2 — Tiền xử lý tự động:** Hệ thống ngay lập tức kích hoạt pipeline xử lý ảnh 9 bước chạy trên máy chủ cục bộ (Raspberry Pi 4) để chuẩn hóa ảnh về định dạng tối ưu. Toàn bộ quy trình này là hoàn toàn tự động, không cần thao tác thủ công.

**Bước 3 — Nhận dạng chữ (OCR):** Ảnh sau xử lý được mã hóa Base64 và gửi lên Google Gemini API để trích xuất văn bản nguyên bản. Hệ thống sử dụng kỹ thuật Prompt engineering để đảm bảo AI chỉ "đọc chữ" mà không tự sửa lỗi.

**Bước 4 — Chấm điểm thông minh (Edge AI):** Văn bản thô từ OCR được gửi sang dịch vụ ViT5 chạy cục bộ. Mô hình ViT5 sẽ tạo ra phiên bản văn bản đúng, sau đó giải thuật Levenshtein so khớp để xác định từng lỗi cụ thể, phân loại nguyên nhân và tự động trừ điểm. Kết quả trả về bao gồm điểm 4 tiêu chí, danh sách lỗi chi tiết và lời nhận xét tự động.

**Bước 5 — Duyệt và lưu kết quả (Human-in-the-Loop):** Kết quả chấm được hiển thị dưới dạng bản nháp để giáo viên kiểm duyệt. Giáo viên có thể chỉnh sửa điểm thành phần hoặc bổ sung nhận xét cá nhân trước khi nhấn "Xác nhận lưu". Chỉ sau bước này, dữ liệu mới được ghi vào cơ sở dữ liệu.

### 4.1.4. Những lợi ích của hệ thống

- **Tiết kiệm thời gian đáng kể:** Thời gian chấm một bài chính tả giảm từ khoảng 3-5 phút (chấm tay) xuống còn dưới 30 giây. Với một lớp 35 học sinh, giáo viên tiết kiệm được hơn 2 tiếng đồng hồ mỗi buổi chấm bài.
- **Phản hồi chi tiết và nhất quán:** Hệ thống chỉ ra từng từ viết sai, giải thích nguyên nhân và gợi ý từ đúng, thay vì chỉ khoanh tròn và ghi điểm. Tiêu chí chấm nhất quán, không bị ảnh hưởng bởi cảm xúc chủ quan của người chấm.
- **Triển khai không phụ thuộc Internet:** Nhờ mô hình ViT5 chạy cục bộ trên Raspberry Pi, hệ thống có thể chấm điểm hoàn toàn ngoại tuyến. Internet chỉ cần thiết ở bước OCR (Gemini API).
- **Chi phí vận hành thấp:** Phần cứng chỉ cần một Raspberry Pi 4 (~1.5 triệu VNĐ). Hệ thống sử dụng SQLite nên không có chi phí thuê máy chủ cơ sở dữ liệu.
- **Tiếp cận học sinh dễ dàng:** Học sinh và phụ huynh có thể truy cập xem điểm số và nhận xét từ xa thông qua Internet, mà không cần cài thêm bất kỳ ứng dụng nào (vì là Web App).
- **Tính minh bạch sư phạm (Human-in-the-Loop):** Giáo viên luôn là người ra quyết định cuối cùng. AI chỉ đóng vai trò "trợ giảng", giúp tiết kiệm công sức nhưng không thay thế hoàn toàn phán đoán chuyên môn của người thầy.

### 4.1.5. Mặt hạn chế của hệ thống

- **Phụ thuộc chất lượng ảnh đầu vào:** Dù có pipeline tiền xử lý mạnh mẽ, ảnh chụp quá tối, quá mờ hoặc góc nghiêng lớn hơn 15° vẫn có thể ảnh hưởng đến độ chính xác OCR.
- **Thời gian khởi động mô hình:** Lần đầu khởi chạy, mô hình ViT5 mất khoảng 15-30 giây để nạp vào RAM của Raspberry Pi 4 (do ổ đĩa SD card chậm hơn ổ SSD).
- **Hiệu năng phần cứng giới hạn:** CPU ARM của Raspberry Pi 4 không có GPU chuyên dụng. Thời gian xử lý một bài của ViT5 dao động từ 3-8 giây, phụ thuộc vào độ dài văn bản.
- **Phạm vi ngôn ngữ:** Hiện tại hệ thống chỉ hỗ trợ tiếng Việt. Không hỗ trợ các ngôn ngữ khác hoặc nội dung Toán, Khoa học.
- **Xác thực bảo mật cơ bản:** Phiên bản hiện tại sử dụng xác thực đơn giản với mật khẩu lưu dạng text. Cần nâng cấp lên JWT hoặc Session Cookie nếu triển khai môi trường có yêu cầu bảo mật cao.

---

## 4.2. Công nghệ sử dụng

### 4.2.1. Database của hệ thống

Hệ thống sử dụng **SQLite** làm hệ quản trị cơ sở dữ liệu, được lựa chọn vì khả năng chạy nhúng (embedded) trực tiếp trên Raspberry Pi 4 mà không cần cài đặt một máy chủ cơ sở dữ liệu riêng biệt.

**Giao tiếp qua Prisma ORM (v5.22.0):**
Prisma đóng vai trò làm lớp trừu tượng giữa code TypeScript và cơ sở dữ liệu, mang lại:
- **Type-safe queries:** Mọi truy vấn đều được kiểm tra kiểu dữ liệu ngay lúc biên dịch, tránh lỗi runtime.
- **Schema migration:** Quản lý phiên bản cấu trúc database bằng file `prisma/schema.prisma`.
- **Cấu hình kết nối:** `DATABASE_URL="file:./prisma/vihand.db"` — toàn bộ dữ liệu nằm gọn trong một file `vihand.db` dễ sao lưu.

**Cấu trúc bảng dữ liệu chính (`Grade`):**

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | String (CUID) | Mã bài chấm duy nhất |
| `studentName` | String | Tên học sinh |
| `assignmentTitle` | String | Tên bài viết |
| `className` | String | Tên lớp |
| `originalText` | String | Văn bản gốc từ OCR (gồm cả lỗi) |
| `fixedText` | String | Văn bản chuẩn sau khi ViT5 sửa |
| `corrections` | String (JSON) | Danh sách lỗi chi tiết với vị trí, gợi ý, nguyên nhân |
| `score` | String | Điểm dạng `"8.5/10"` |
| `scoreNum` | Float | Điểm số (dùng để sắp xếp, lọc) |
| `scoreBreakdown` | String (JSON) | Điểm chi tiết 4 tiêu chí |
| `feedback` | String | Lời nhận xét sư phạm |
| `overallRating` | String | Xếp loại: Xuất sắc / Tốt / Khá / TB / Cần cố gắng |
| `imageBase64` | String | Ảnh gốc bài viết lưu kèm (Base64) |
| `createdAt` | DateTime | Thời điểm chấm |

### 4.2.2. Front-end của hệ thống

**Framework chính:**
- **Next.js 16.2.4 (App Router):** Cung cấp kiến trúc file-based routing, cho phép tổ chức giao diện theo 3 nhánh phân quyền (`/teacher`, `/student`, `/admin`) một cách rõ ràng. Hỗ trợ Server Components để tải dữ liệu nhanh và Client Components cho các tính năng tương tác.
- **React 19:** Nền tảng xây dựng giao diện component-based.
- **TypeScript 5.7.3:** Đảm bảo an toàn kiểu dữ liệu xuyên suốt toàn bộ codebase.

**Thư viện giao diện và trải nghiệm người dùng:**
- **Tailwind CSS v4:** Framework CSS utility-first, cho phép xây dựng giao diện responsive nhanh chóng.
- **shadcn/ui:** Bộ component UI hiện đại dựa trên Radix UI, cung cấp các thành phần như Dialog, Table, Tabs, Toast, Dropdown Menu... với khả năng tùy biến cao.
- **Lucide React:** Bộ icon SVG nhất quán được sử dụng xuyên suốt giao diện.
- **Recharts 2.15.0:** Thư viện vẽ biểu đồ, được dùng để hiển thị phân phối điểm số và biểu đồ tiến bộ học sinh.
- **React Hook Form + Zod:** Quản lý và kiểm tra dữ liệu form (đăng nhập, thêm học sinh, cấu hình bài kiểm tra).

**Các tính năng giao diện nổi bật:**
- Giao diện Responsive, tương thích đầy đủ với điện thoại di động (phục vụ việc chụp ảnh trực tiếp).
- Chế độ tối/sáng (Dark/Light mode) với `next-themes`.
- Thông báo thời gian thực (Toast notification) với `sonner`.
- Kết quả chấm điểm hiển thị song song: Bài viết gốc với các từ sai được highlight màu đỏ, đặt cạnh văn bản chuẩn đã sửa màu xanh.

### 4.2.3. Back-end của hệ thống

Back-end của ViHand Grade bao gồm hai thành phần chạy song song:

**Thành phần 1 — Next.js API Routes (TypeScript/Node.js):**
Đây là phần backend chính, được tích hợp trực tiếp trong dự án Next.js. Mỗi API là một file route handler độc lập:

| API Endpoint | Chức năng |
|---|---|
| `POST /api/ocr` | Nhận ảnh Base64, gọi Gemini API (`gemini-3.1-flash-lite`) để trích xuất chữ nguyên bản |
| `POST /api/preprocess` | Chạy pipeline xử lý ảnh 9 bước bằng thư viện Jimp |
| `POST /api/grade` | Gửi văn bản sang ViT5 Service (port 8000) để chấm điểm; tự động fallback sang Gemini nếu ViT5 không phản hồi trong 30 giây |
| `GET/POST /api/grades` | CRUD điểm số (lưu, truy vấn lịch sử điểm) qua Prisma ORM |
| `POST /api/auth/login` | Xác thực tài khoản và trả về thông tin role người dùng |
| `GET/POST /api/users` | Quản lý tài khoản (Admin) |
| `GET/POST /api/classes` | Quản lý danh sách lớp học (Admin) |

**Xử lý ảnh cục bộ (`lib/image-processor.ts`):** Module Jimp được viết thuần TypeScript, chạy hoàn toàn trên server mà không cần Python hay thư viện native, đảm bảo tương thích với môi trường ARM của Raspberry Pi.

**Thành phần 2 — ViT5 Python Microservice (FastAPI):**
Dịch vụ Python chạy độc lập ở port 8000, chứa toàn bộ logic AI:
- **FastAPI:** Framework REST API hiệu năng cao cho Python, tự động tạo documentation tại `/docs`.
- **Hugging Face Transformers:** Tải và vận hành mô hình ViT5.
- **PyTorch + Dynamic INT8 Quantization:** Tối ưu hóa mô hình để chạy ổn định trên CPU ARM.
- **difflib (SequenceMatcher):** Giải thuật so khớp chuỗi Levenshtein để đối chiếu văn bản và phân loại lỗi.

**Cơ chế xoay vòng API Key (Key Rotation):**
Hệ thống hỗ trợ cấu hình nhiều Gemini API Key trong biến `GEMINI_API_KEYS` (phân cách bằng dấu phẩy). Khi một key bị hết quota (lỗi 429), backend tự động chuyển sang key tiếp theo trong danh sách mà không làm gián đoạn luồng xử lý.

---

## 4.3. Triển khai hệ thống

### 4.3.1. Cấu hình và cài đặt trên thiết bị phần cứng

Toàn bộ hệ thống back-end được triển khai trên **Raspberry Pi 4 Model B (4GB RAM)** với hệ điều hành **Raspberry Pi OS 64-bit (Debian Bookworm)**. Các bước cài đặt chính:

**Bước 1 — Chuẩn bị môi trường Node.js:**
```bash
# Cài đặt Node.js 20 LTS (ARM64)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

**Bước 2 — Cài đặt môi trường Python và ViT5 Service:**
```bash
# Tạo môi trường ảo Python
python3 -m venv venv
source venv/bin/activate

# Cài đặt các thư viện AI
pip install fastapi uvicorn transformers torch --index-url https://download.pytorch.org/whl/cpu
pip install -r python_service/requirements.txt
```

**Bước 3 — Cài đặt dự án Web:**
```bash
# Trong thư mục dự án
npm install
npx prisma generate
npx prisma db push
```

**Bước 4 — Khởi chạy hệ thống:**
Trên Windows (máy tính phát triển), hệ thống cung cấp file `start_all.bat` để khởi động đồng thời cả hai service:
```bat
.\start_all.bat
```
File này sẽ tự động mở hai cửa sổ terminal riêng: một cho Next.js Web Server (port 3000) và một cho ViT5 AI Service (port 8000). Cần chờ khoảng 15-30 giây để mô hình ViT5 nạp xong vào RAM.

Trên Raspberry Pi, hệ thống được cấu hình như một `systemd service` để tự động khởi động cùng thiết bị mỗi khi bật nguồn.

### 4.3.2. Mô hình kết nối và truy cập mạng

Hệ thống sử dụng mô hình kết nối **Cloudflare Tunnel** để giải quyết bài toán truy cập từ xa mà không yêu cầu địa chỉ IP tĩnh hoặc can thiệp cấu hình router của trường học.

**Kiến trúc mạng:**
```
[Điện thoại/Máy tính của Giáo viên]
        │ HTTPS (Internet)
        ▼
[Cloudflare Network - CDN toàn cầu]
        │ Tunnel (TLS mã hóa)
        ▼
[Raspberry Pi 4 - Đặt tại lớp học]
  ├── Port 3000: Next.js Web Server
  └── Port 8000: ViT5 Python Service (chỉ nội bộ)
```

**Cách hoạt động:**
1. `cloudflared` (daemon Cloudflare) chạy nền trên Raspberry Pi, tạo đường hầm mã hóa TLS đến Cloudflare.
2. Cloudflare cấp phát một tên miền bảo mật cố định (VD: `vihand-grade.example.com`) trỏ vào đường hầm này.
3. Giáo viên truy cập địa chỉ này từ bất kỳ đâu mà không cần kết nối cùng mạng WiFi với Raspberry Pi.
4. Toàn bộ lưu lượng dữ liệu được mã hóa end-to-end, đảm bảo an toàn thông tin học sinh.

**Lợi thế so với các giải pháp khác:**
- Không cần mở port trên router (tránh rủi ro bảo mật).
- Không cần IP tĩnh (tiết kiệm chi phí).
- Tự động quản lý chứng chỉ SSL/HTTPS.

### 4.3.3. Quản lý lưu trữ dữ liệu và liên kết khóa Trí tuệ Nhân tạo

**Quản lý cơ sở dữ liệu:**
Toàn bộ dữ liệu (tài khoản, điểm số, lịch sử chấm bài, ảnh bài viết) được lưu trong một file duy nhất `prisma/vihand.db` trên thẻ nhớ của Raspberry Pi. Để đảm bảo an toàn dữ liệu, nhóm khuyến nghị:
- Sao lưu định kỳ file `vihand.db` vào USB hoặc Google Drive.
- Sử dụng thẻ nhớ chất lượng cao (Class 10 / UHS-I) để tránh hư hỏng dữ liệu do ghi nhiều lần.

**Quản lý và xoay vòng API Key Gemini:**
Cấu hình được lưu trong file `.env.local` với biến môi trường `GEMINI_API_KEYS`:
```bash
# Hỗ trợ nhiều key, phân cách bằng dấu phẩy
GEMINI_API_KEYS="key_1,key_2,key_3"

# Địa chỉ ViT5 Service cục bộ
VIT5_SERVICE_URL="http://localhost:8000"

# Đường dẫn cơ sở dữ liệu
DATABASE_URL="file:./prisma/vihand.db"
```

Backend tự động phân tích danh sách key, theo dõi key nào đang hoạt động và xoay vòng (rotate) sang key tiếp theo khi phát hiện lỗi hết quota (HTTP 429). Cơ chế này đảm bảo hệ thống có thể phục vụ liên tục trong các buổi học có nhiều lượt chấm điểm cùng lúc mà không bị gián đoạn.

**Biến môi trường cho ViT5 Service:**

Kết nối giữa Next.js và ViT5 Python Service thông qua REST API nội bộ. Cấu hình địa chỉ qua biến `VIT5_SERVICE_URL`. Khi cần chuyển ViT5 sang một máy chủ mạnh hơn (VD: máy tính giáo viên thay cho Raspberry Pi), chỉ cần cập nhật biến này mà không cần sửa code.
