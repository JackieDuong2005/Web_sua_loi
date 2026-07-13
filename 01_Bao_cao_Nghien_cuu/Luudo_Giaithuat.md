# Lưu đồ và Giải thuật hệ thống ViHand Grade

Tài liệu này tổng hợp các lưu đồ (flowchart) và giải thuật của hệ thống, tương ứng với nội dung lý thuyết ở Chương 2 và Chương 3. Các sơ đồ được viết bằng cú pháp Mermaid, có thể render trực tiếp trên GitHub, VS Code (với extension Mermaid) hoặc trang web mermaid.live.

---

## Hình 3.1 – Lưu đồ luồng hoạt động tổng thể (Hybrid AI Pipeline)

Mô tả toàn bộ quá trình từ khi giáo viên chụp ảnh đến khi lưu kết quả chấm điểm.

```mermaid
flowchart TD
    A([👨‍🏫 Giáo viên chụp ảnh bài chính tả]) --> B[Tải ảnh lên giao diện Web\nNext.js Frontend]
    B --> C[Gọi API: /api/preprocess\nThư viện Jimp - Node.js]

    subgraph img_pipeline ["⚙️ Bước 1: Tiền xử lý ảnh số (9 bước)"]
        C --> P0[Bước 0: EXIF Auto-rotate]
        P0 --> P05[Bước 0.5: Deskew - Căn góc nghiêng]
        P05 --> P1[Bước 1: Resize - Chuẩn hóa kích thước]
        P1 --> P2[Bước 2: White Balance - Cân bằng trắng]
        P2 --> P3[Bước 3: Grayscale - Chuyển ảnh xám]
        P3 --> P4[Bước 4: Shadow Removal - Khử bóng đổ]
        P4 --> P5[Bước 5: CLAHE - Tăng tương phản]
        P5 --> P6[Bước 6: Unsharp Mask - Làm nét chữ]
        P6 --> P7{Bước 7: Quality Assessment\nĐánh giá chất lượng ảnh}
        P7 -- Chất lượng kém --> WARN[⚠️ Cảnh báo:\nĐề nghị chụp lại]
        P7 -- Chất lượng tốt --> P8[Bước 8: Adaptive Threshold\nNhị phân hóa thích nghi]
    end

    P8 --> D[Ảnh PNG đã tối ưu\n+ Mã hóa Base64]
    D --> E[Gọi API: /api/ocr\nGoogle Gemini API]

    subgraph ocr_step ["☁️ Bước 2: Trích xuất văn bản (OCR)"]
        E --> F["Gửi ảnh + Prompt:\n'Chỉ trích xuất nguyên văn,\nkhông sửa lỗi'"]
        F --> G[Văn bản thô - OCR Output\nbao gồm cả lỗi chính tả của học sinh]
    end

    G --> H{Gọi API: /api/grade\nViT5 Service - port 8000}

    subgraph grade_step ["🤖 Bước 3: Chấm điểm cục bộ (Edge AI)"]
        H -- ViT5 hoạt động --> I[Tiền xử lý: Lọc Teencode\n+ Chunking văn bản]
        I --> J[ViT5 Model INT8\nSửa lỗi chính tả → văn bản chuẩn]
        J --> K[SequenceMatcher / Levenshtein\nSo khớp word-level]
        K --> L[Phân loại lỗi:\nphu_am_dau / dau_thanh / van / viet_hoa]
        L --> M[Tính điểm:\nChính tả - Hình thức - Nội dung - Sáng tạo]
        M --> N[Sinh Feedback tự động\nRule-based theo số lỗi]
        H -- ViT5 lỗi --> FB[Fallback:\nGemini text-only chấm điểm]
        FB --> N
    end

    N --> O[Hiển thị kết quả bản nháp\ncho Giáo viên duyệt]
    O --> P{Giáo viên\nxác nhận?}
    P -- Chỉnh sửa --> O
    P -- Xác nhận --> Q[(Lưu vào SQLite\nqua Prisma ORM)]
    Q --> R[📊 Hiển thị báo cáo\ntiến bộ học sinh]
```

---

## Hình 3.2 – Lưu đồ chi tiết thuật toán tiền xử lý ảnh (Image Processing Pipeline)

```mermaid
flowchart LR
    IN([🖼️ Ảnh gốc từ camera\nđiện thoại]) --> S0

    subgraph step0 ["Bước 0"]
        S0["EXIF Auto-rotate\nĐọc tag Orientation 0x0112\n→ Xoay 90°/180°/270°"]
    end

    subgraph step05 ["Bước 0.5"]
        S05["Deskew\n1. Thu nhỏ ảnh tạm thời\n2. Otsu threshold\n3. Xóa đường kẻ ô ly\n4. Projection Variance [-15°, +15°]\n5. Xoay ảnh về góc chuẩn"]
    end

    subgraph step1 ["Bước 1"]
        S1["Resize\nGiới hạn chiều rộng ≤ 1600px\nGiữ nguyên tỷ lệ khung hình"]
    end

    subgraph step2 ["Bước 2"]
        S2["White Balance\nGray World Assumption\nR' = R × (avg_gray / avg_R)\nG' = G × (avg_gray / avg_G)\nB' = B × (avg_gray / avg_B)"]
    end

    subgraph step3 ["Bước 3"]
        S3["Grayscale\nI = 0.299R + 0.587G + 0.114B\n→ 1-channel, 256 sắc độ"]
    end

    subgraph step4 ["Bước 4"]
        S4["Shadow Removal\n1. Box Blur kernel lớn → ảnh nền\n2. pixel' = (pixel / background) × 255"]
    end

    subgraph step5 ["Bước 5"]
        S5["CLAHE\nLưới 8×8 ô vuông\nHistogram Equalization / ô\nClip Limit = 2.0"]
    end

    subgraph step6 ["Bước 6"]
        S6["Unsharp Mask\nblurred = Gaussian Blur(ảnh)\nmask = ảnh - blurred\nresult = ảnh + α × mask"]
    end

    subgraph step7 ["Bước 7"]
        S7{"Quality Assessment\nLaplacian Variance\nBrightness Check\nBlack Pixel Ratio"}
        S7 -- Kém --> WARN([⚠️ Trả về qualityReport\nYêu cầu chụp lại])
    end

    subgraph step8 ["Bước 8"]
        S8["Adaptive Threshold\nSử dụng Integral Image\nNgưỡng riêng mỗi Block\n→ Ảnh đen/trắng tuyệt đối"]
    end

    S0 --> S05 --> S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7
    S7 -- Tốt --> S8
    S8 --> OUT([✅ Ảnh PNG tối ưu\nSẵn sàng cho OCR])
```

---

## Hình 3.3 – Lưu đồ giải thuật chấm điểm và phân loại lỗi (Grading & Error Classification)

```mermaid
flowchart TD
    START([📝 Văn bản thô từ Gemini OCR]) --> PRE

    subgraph preprocess ["Tiền xử lý văn bản"]
        PRE[Lọc Teencode\nRegex chuẩn hóa từ lóng\nko→không, dc→được...]
        PRE --> CHUNK[Chunking\nCắt theo dấu câu\nMax ~100 ký tự/chunk]
    end

    CHUNK --> VIT5

    subgraph vit5_block ["Mô hình ViT5 - Edge AI"]
        VIT5[Truyền từng chunk\nvào ViT5 Seq2Seq\nModel INT8 Quantized]
        VIT5 --> SUPP[Suppression\nKiểm tra repetition loop\nrepetition_penalty=2.5]
        SUPP --> JOIN[Ghép chunks lại\n→ Văn bản đã sửa chuẩn]
    end

    JOIN --> ALIGN

    subgraph levenshtein_block ["Giải thuật so khớp Levenshtein"]
        ALIGN["SequenceMatcher\nSo khớp word-level\n(student_words ↔ ai_words)"]
        ALIGN --> OPCODES[Lấy get_opcodes:\nreplace / delete / insert]

        OPCODES --> R{Tag = replace?}
        R -- Có --> CE[classify_error_type\nwrong_word ↔ correct_word]
        CE --> EC{Phân loại lỗi}
        EC --> E1[phu_am_dau\nVD: s→x, tr→ch]
        EC --> E2[dau_thanh\nVD: hỏi→ngã]
        EC --> E3[van\nVD: an→ang]
        EC --> E4[viet_hoa\nVD: Hà→hà]
        EC --> E5[bo_sot_them\nThừa/thiếu từ]

        OPCODES --> D{Tag = delete?}
        D -- Có --> ERR_DEL["Lỗi: Thiếu từ\nerror='Trống'\nsuggestion=missing_word"]

        OPCODES --> I{Tag = insert?}
        I -- Có --> ERR_INS["Lỗi: Thừa từ\nsuggestion='Không có'"]
    end

    E1 & E2 & E3 & E4 & E5 & ERR_DEL & ERR_INS --> SCORE

    subgraph scoring ["Tính điểm"]
        SCORE["Điểm Chính tả\n= max(0, 4.0 - error_count × 0.5)"]
        SCORE --> HINHTHU[Điểm Hình thức\nĐánh giá viết hoa, câu đầy đủ]
        HINHTHU --> NOIDU[Điểm Nội dung\nSo sánh độ phủ chủ đề]
        NOIDU --> SANGTAO[Điểm Sáng tạo\nHeuristic: từ láy, so sánh, điệp ngữ]
    end

    SANGTAO --> FB[Sinh Feedback\nRule-based theo error_count]
    FB --> OUT([📤 JSON kết quả:\nscore, errors, feedback])
```

---

## Hình 3.4 – Lưu đồ phân quyền người dùng (RBAC)

```mermaid
flowchart TD
    LOGIN([🔐 Người dùng đăng nhập]) --> AUTH{Xác thực\ntài khoản}
    AUTH -- Sai mật khẩu --> ERR([❌ Từ chối truy cập])
    AUTH -- Đúng --> ROLE{Kiểm tra\nrole trong DB}

    ROLE -- role = admin --> ADMIN_PAGE
    ROLE -- role = teacher --> TEACHER_PAGE
    ROLE -- role = student --> STUDENT_PAGE

    subgraph ADMIN_PAGE ["👑 Admin"]
        A1[Quản lý tài khoản\nGiáo viên & Học sinh]
        A2[Quản lý Lớp học]
        A3[Cấu hình hệ thống\nĐiểm trừ mỗi lỗi]
    end

    subgraph TEACHER_PAGE ["👨‍🏫 Giáo viên"]
        T1[Chụp ảnh & Kích hoạt\nchấm điểm AI]
        T2["Human-in-the-Loop\nDuyệt & chỉnh sửa kết quả"]
        T3[Xem báo cáo lớp\nBiểu đồ phổ điểm]
        T4[Quản lý bài tập\nđã giao]
    end

    subgraph STUDENT_PAGE ["👦 Học sinh"]
        S1[Xem lịch sử điểm cá nhân\nRead-only]
        S2[So sánh bài viết gốc\nvs văn bản chuẩn AI]
        S3[Xem phân tích\nlỗi hay mắc phải]
    end

    T2 --> DB[(SQLite Database\nPrisma ORM)]
    A1 --> DB
    A2 --> DB
    S1 --> DB
    S3 --> DB
```

---

## Hình 3.5 – Lưu đồ giải thuật Levenshtein Distance (Công thức quy hoạch động)

```mermaid
flowchart TD
    IN1([Chuỗi s1: Văn bản gốc học sinh]) --> INIT
    IN2([Chuỗi s2: Văn bản chuẩn ViT5]) --> INIT

    INIT["Khởi tạo bảng D có kích thước\nm+1 × n+1\nm = độ dài s1, n = độ dài s2"] --> FILL_BASE

    FILL_BASE["Điền giá trị biên:\nD[i][0] = i  với mọi i\nD[0][j] = j  với mọi j"] --> LOOP

    LOOP{"Duyệt i từ 1→m\nDuyệt j từ 1→n"} --> CMP

    CMP{"s1[i] == s2[j]?"}
    CMP -- Bằng nhau --> KEEP["cost = 0\nGiữ nguyên, không đổi"]
    CMP -- Khác nhau --> REPLACE["cost = 1\nThay thế ký tự"]

    KEEP & REPLACE --> MIN["D[i][j] = min(\n  D[i-1][j] + 1,       -- Xóa\n  D[i][j-1] + 1,       -- Chèn\n  D[i-1][j-1] + cost   -- Thay thế/Giữ\n)"]

    MIN --> CHECK{Còn ô\ntiếp theo?}
    CHECK -- Có --> LOOP
    CHECK -- Không --> RESULT

    RESULT["Khoảng cách Levenshtein\n= D[m][n]"] --> SIM

    SIM["Độ tương đồng:\nSimilarity = 1 - D[m,n] / max(m, n)"] --> BACK

    BACK["Backtrace qua bảng D\n→ Xác định từng phép biến đổi\nreplace / insert / delete"] --> OUT

    OUT([📌 Danh sách lỗi chi tiết\nvà vị trí trong văn bản])
```

---

## Hình 3.6 – Lưu đồ cơ chế Fallback (Dự phòng đám mây)

```mermaid
flowchart TD
    REQ([📩 Yêu cầu chấm điểm\nvăn bản thô từ OCR]) --> TRY

    TRY[Gọi ViT5 Service\nhttp://localhost:8000/grade] --> CHECK{Phản hồi\ntrong 30 giây?}

    CHECK -- ✅ Thành công --> VRESULT[Nhận kết quả chấm\ntừ ViT5 + Levenshtein]

    CHECK -- ❌ Timeout / Lỗi --> LOG[Ghi log lỗi\nViT5 unavailable]
    LOG --> FALLBACK[🔄 Kích hoạt Fallback\nGọi Gemini text-only API]
    FALLBACK --> GPROMPT["Gửi văn bản + Prompt\nBarem điểm chi tiết\nyêu cầu trả JSON"]
    GPROMPT --> GRESULT[Nhận kết quả JSON\ntừ Gemini]

    VRESULT & GRESULT --> MERGE[Chuẩn hóa định dạng\n→ Cấu trúc JSON thống nhất]
    MERGE --> UI([📲 Hiển thị kết quả\ncho giáo viên duyệt])
```
