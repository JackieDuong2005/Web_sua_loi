# ĐẶC TẢ TỔNG QUAN KIẾN TRÚC TOÀN HỆ THỐNG VIHAND GRADE
## (System Architecture Specification & High-Level Design Document)

- **Mã tài liệu:** `VHG-ARCH-SPEC-01`
- **Phiên bản:** `v2.5.0-Production-Hardened`
- **Ngày hoàn thiện:** `09-10-2026`
- **Hệ sinh thái áp dụng:** ViHand Grade (Android Native Client, Next.js 16 Web Studio & BFF Gateway, FastAPI Python AI Core, Edge Computing Appliance)
- **Cơ sở pháp lý & Chuẩn mực sư phạm:** Thông tư 27/2020/TT-BGDĐT (Bộ Giáo dục và Đào tạo), Chương trình GDPT 2018, Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân)
- **Phương pháp luận kiểm chuẩn:** PStack Verification Standard (Lauren Tan / SpaceXAI) — *"Passing build is NOT verification. Drive the real app the way a user does and capture evidence."*
- **Tình trạng kiểm toán đối kháng (Adversarial Audit Hardened):** Đã khắc phục 6 điểm nghẽn kiến trúc chí mạng (Ranh giới Local Edge Offline, Khóa ghi SQLite WAL & Hàng đợi Chờ 10s, Xóa Trực tiếp Đồng bộ Trực tuyến, Rate Limiting Cửa sổ Trượt, Cân bằng RAM Cgroups RPi 4, và Chuẩn hóa Ngắt nhịp Đọc Sư phạm).

---

## MỤC LỤC TỔNG THỂ

1. [PHẦN I: BỐI CẢNH GIÁO DỤC TIỂU HỌC, CHUYỂN ĐỔI SỐ VÀ KHUNG ĐÁNH GIÁ SƯ PHẠM (THÔNG TƯ 27/2020/TT-BGDĐT)](#phần-i-bối-cảnh-giáo-dục-tiểu-học-chuyển-đổi-số-và-khung-đánh-giá-sư-phạm-thông-tư-272020tt-bgdđt)
   - 1.1. Bối cảnh Giáo dục Tiểu học & Thực trạng Chuyển đổi số trong Nhà trường
   - 1.2. Khung Đánh giá Sư phạm theo Thông tư 27/2020/TT-BGDĐT
   - 1.3. Phân môn & Ma trận Đánh giá Phân hóa: Chính tả vs Tập làm văn
   - 1.4. Phân loại 6 Nhóm Lỗi Ngữ âm Tiếng Việt Cốt lõi & Thang Xếp loại Học lực
2. [PHẦN II: KIẾN TRÚC HỆ THỐNG 4 TẦNG TOÀN DIỆN (THE 4-TIER SYSTEM ARCHITECTURE)](#phần-ii-kiến-trúc-hệ-thống-4-tầng-toàn-diện-the-4-tier-system-architecture)
   - 2.1. Tầng 1: Client & Thiết bị Đầu cuối (Client Tier)
   - 2.2. Tầng 2: Cổng Giao tiếp & Backend-for-Frontend (Gateway / BFF Tier)
   - 2.3. Tầng 3: Lõi Xử lý Trí tuệ Nhân tạo Đa Dịch vụ (AI Microservices Core Tier)
   - 2.4. Tầng 4: Cơ sở Dữ liệu & Trạm Tính toán Biên (Database & Edge Computing Tier)
3. [PHẦN III: HỆ THỐNG SƠ ĐỒ ĐẶC TẢ KIẾN TRÚC & QUY TRÌNH TOÀN DIỆN (SYSTEM ARCHITECTURE BLUEPRINTS)](#phần-iii-hệ-thống-sơ-đồ-đặc-tả-kiến-trúc--quy-trình-toàn-diện-system-architecture-blueprints)
   - 3.1. Sơ đồ Kiến trúc Tổng quan 4 Tầng Hệ thống (System Overview 4-Tier Architecture)
   - 3.2. Sơ đồ Mô hình Cộng tác Hybrid Edge-Cloud & Định tuyến Dự phòng Zero-Token Offline
   - 3.3. Sơ đồ Quy trình Nghiệp vụ 1: Luồng Chấm điểm OCR Chữ viết tay Tự động (End-to-End OCR Grading Flow)
   - 3.4. Sơ đồ Quy trình Nghiệp vụ 2: Luồng Luyện viết Chính tả Sư phạm & Tổng hợp Giọng đọc Neural TTS (Pedagogical Dictation Flow)
   - 3.5. Sơ đồ Quy trình Nghiệp vụ 3: Luồng Đồng bộ Sổ điểm & Sổ tay Từ khó Cá nhân hóa Hai chiều (Two-Way Sync & Vocabulary Flow)
4. [PHẦN IV: ĐẶC TẢ CÁC THUỘC TÍNH CHẤT LƯỢNG HỆ THỐNG (QUALITY ATTRIBUTES & NFRs)](#phần-iv-đặc-tả-các-thuộc-tính-chất-lượng-hệ-thống-quality-attributes--nfrs)
   - 4.1. An toàn Thông tin & Quyền Riêng tư Dữ liệu Trẻ em (Nghị định 13/2023/NĐ-CP)
   - 4.2. Tính Sẵn sàng Cao & Khả năng Chịu lỗi (High Availability & Multi-Tier Resilience)
   - 4.3. Hiệu năng, Độ trễ & Ngân sách Bộ nhớ (Latency Budgets & Memory Budgets)
5. [PHẦN V: MA TRẬN TRUY XUẤT NGUỒN VÀ TIÊU CHÍ NGHIỆM THU (CODE TRACEABILITY & VERIFICATION CRITERIA)](#phần-v-ma-trận-truy-xuất-nguồn-và-tiêu-chí-nghiệm-thu-code-traceability--verification-criteria)
   - 5.1. Ma trận Truy xuất Nguồn Mã Thực tế (Code Traceability Matrix)
   - 5.2. Tiêu chuẩn Kiểm thử & Xác thực Thực nghiệm PStack (Lauren Tan Methodology)

---

# PHẦN I: BỐI CẢNH GIÁO DỤC TIỂU HỌC, CHUYỂN ĐỔI SỐ VÀ KHUNG ĐÁNH GIÁ SƯ PHẠM (THÔNG TƯ 27/2020/TT-BGDĐT)

### 1.1. Bối cảnh Giáo dục Tiểu học & Thực trạng Chuyển đổi số trong Nhà trường

Trong khuôn khổ Chương trình Giáo dục Phổ thông 2018 (GDPT 2018), môn Tiếng Việt cấp Tiểu học đóng vai trò nền tảng định hình năng lực ngôn ngữ, tư duy logic và phẩm chất thẩm mỹ của học sinh. Tuy nhiên, quá trình chuyển đổi số trong công tác giảng dạy và đánh giá môn Tiếng Việt đang đối mặt với những rào cản nghiêm trọng trong thực tiễn giảng dạy:
1. **Áp lực quá tải sĩ số và thời gian chấm bài:** Một giáo viên chủ nhiệm thường phụ trách lớp học từ 35 đến 45 học sinh. Mỗi tuần, giáo viên phải chấm chữa từ 2 đến 3 bài viết tay (bao gồm cả tiết Chính tả nghe - viết và bài Tập làm văn). Tổng khối lượng bài viết cần chấm chữa lên tới hơn 100–150 bài/tuần.
2. **Đặc thù nét chữ viết tay học sinh tiểu học:** Chữ viết của học sinh Lớp 1 đến Lớp 5 mang tính chất biến thiên rất lớn: nét chữ nguệch ngoạc, nét thanh nét đậm chưa đều, khoảng cách từ không chuẩn, sai lệch dấu thanh, và viết đè lên các đường kẻ ô ly của vở học sinh. Việc ngồi chấm bài thủ công liên tục nhiều giờ gây suy giảm thị lực, mỏi mệt tâm lý và dễ dẫn đến sai sót chủ quan.
3. **Sự thiếu hụt giải pháp công nghệ chuyên biệt:** Các hệ thống OCR thương mại phổ biến hiện nay (như Google Cloud Vision, ABBYY, Tesseract) chủ yếu được tối ưu cho tài liệu văn phòng in sẵn (printed documents) hoặc chữ viết tay người lớn tiếng Anh. Khi áp dụng cho chữ viết tay tiếng Việt học sinh trên nền vở ô ly, tỷ lệ nhận diện sai dấu và đứt nét là rất cao.

Hệ sinh thái **ViHand Grade** ra đời nhằm giải quyết triệt để bài toán này, đóng vai trò là "Trợ lý ảo sư phạm" toàn diện hỗ trợ giáo viên chấm bài, thống kê và hướng dẫn học sinh sửa lỗi theo thời gian thực.

---

### 1.2. Khung Đánh giá Sư phạm theo Thông tư 27/2020/TT-BGDĐT

Thông tư số **27/2020/TT-BGDĐT** ngày 04/09/2020 của Bộ Giáo dục và Đào tạo quy định rõ triết lý đánh giá học sinh tiểu học với 3 nguyên tắc cốt lõi:
- **Kết hợp Đánh giá Thường xuyên (Formative Assessment) và Đánh giá Định kỳ (Summative Assessment):** Đánh giá vì sự tiến bộ của học sinh; coi trọng việc động viên, khuyến khích sự cố gắng trong học tập, rèn luyện; không so sánh học sinh này với học sinh khác.
- **Chuyển trọng tâm từ "Cho điểm" sang "Nhận xét định tính":** Trong đánh giá thường xuyên, giáo viên không dùng điểm số để gây áp lực mà sử dụng lời nhận xét cụ thể: chỉ rõ chỗ đúng, chỗ sai, nguyên nhân mắc lỗi và biện pháp sửa chữa kịp thời.
- **Khen ngợi trước, góp ý sau:** Lời nhận xét sư phạm phải mang tính tích cực, truyền cảm hứng, khích lệ lòng tự tin của trẻ nhỏ.

Hệ thống **ViHand Grade** số hóa toàn diện triết lý này vào cấu trúc thuật toán AI, biến các quy định định tính thành các chỉ số kỹ thuật khả thi, minh bạch và nhất quán.

---

### 1.3. Phân môn & Ma trận Đánh giá Phân hóa: Chính tả vs Tập làm văn

Hệ thống thiết lập ranh giới nghiệp vụ độc lập và quy trình AI chuyên biệt cho 2 phân môn Tiếng Việt:

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │ BÀI LÀM HỌC SINH (ẢNH CHỤP VỞ HOẶC VĂN BẢN TRỰC TIẾP)  │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │
                                                    Phân định Chế độ Chấm
                                                    (Grading Mode Selector)
                                                   /                        \
                                                  /                          \
                    ┌───────────────────────────┴───┐                    ┌───┴───────────────────────────┐
                    │ PHÂN MÔN 1: CHÍNH TẢ          │                    │ PHÂN MÔN 2: TẬP LÀM VĂN       │
                    │ (Nghe - Viết / Nhìn - Viết)   │                    │ (Đoạn văn ngắn, Kể chuyện...) │
                    └───────────────┬───────────────┘                    └───────────────┬───────────────┘
                                    │                                                    │
                      Có Ngữ liệu Mẫu (Ground Truth)?                     Nhận diện Nét chữ & Sửa lỗi
                     ├── CÓ: Đối soát chuỗi 1-1                          ├── Gemini Vision OCR trích xuất text
                     │   (LCS Diff Opcodes)                              ├── ViT5 Seq2Seq sửa lỗi chính tả
                     │   Zero-Hallucination, 0 Token                     └── Phân tích nghệ thuật & sáng tạo
                     └── KHÔNG: ViT5/Gemini Fallback                                     │
                                    │                                                    │
                    ┌───────────────┴───────────────┐                    ┌───────────────┴───────────────┐
                    │ BAREM ĐIỂM CHÍNH TẢ (10 ĐIỂM) │                    │ BAREM TẬP LÀM VĂN (10 ĐIỂM)   │
                    │ • Chính tả: 7.0đ (trừ 0.5đ/lỗi)│                   │ • Chính tả: 4.0đ              │
                    │ • Hình thức & Chữ viết: 3.0đ  │                    │ • Hình thức & Trình bày: 3.0đ │
                    │ • Nội dung: 0.0đ (Cố định)    │                    │ • Nội dung & Bố cục: 2.0đ     │
                    │ • Sáng tạo: 0.0đ (Cố định)    │                    │ • Sáng tạo & Cảm xúc: 1.0đ    │
                    └───────────────────────────────┘                    └───────────────────────────────┘
```

#### Bảng Ma trận So sánh Nghiệp vụ Hai Phân môn:

| Tiêu chí so sánh | Phân môn Chính tả (Dictation) | Phân môn Tập làm văn (Essay) |
| :--- | :--- | :--- |
| **Bản chất yêu cầu** | Tái hiện chính xác văn bản bài đọc mẫu; rèn luyện kỹ năng nghe, phân tích âm thanh và tốc độ viết. | Diễn đạt ý tưởng, xây dựng câu đoạn, sử dụng từ ngữ gợi cảm, biện pháp tu từ theo chủ đề bài học. |
| **Văn bản đối chiếu** | Bắt buộc có **Ground Truth Text** (lấy từ phiên đọc chính tả `/teacher/dictation` hoặc bài trích SGK). | Không có văn bản mẫu cố định; văn bản chuẩn do **ViT5** và **Gemini** hiệu đính từ bài làm. |
| **Cơ chế đánh giá AI** | **Deterministic String Alignment (LCS Diff):** Triệt tiêu hoàn toàn ảo giác (Zero-Hallucination), không tốn token LLM (`tokenCount: 0`). | **Two-Tier Hybrid AI:** Tầng 1 phân tích cấu trúc ngữ pháp/từ láy; Tầng 2 dùng SLM Qwen 2.5 sinh lời phê. |
| **Cơ cấu Barem điểm** | - Điểm Chính tả: **7.0 điểm** (trừ 0.5đ cho mỗi lỗi sai âm, vần, dấu thanh).<br>- Điểm Hình thức & Chữ viết: **3.0 điểm**.<br>- Điểm Nội dung: **0.0 điểm**.<br>- Điểm Sáng tạo: **0.0 điểm**. | - Điểm Chính tả: **4.0 điểm** (trừ 0.5đ/lỗi).<br>- Điểm Hình thức: **3.0 điểm**.<br>- Điểm Nội dung: **2.0 điểm**.<br>- Điểm Sáng tạo: **1.0 điểm** (đếm từ láy, câu so sánh, nhân hóa). |
| **Lời nhận xét sư phạm** | Tập trung vào mức độ cẩn thận, tỷ lệ hoàn thành bài nghe, chỉ rõ các âm/vần học sinh hay nhầm lẫn để rèn thêm. | Khen ngợi ý tưởng hay, từ ngữ sáng tạo giàu hình ảnh trước; sau đó nhẹ nhàng hướng dẫn sửa lỗi diễn đạt/chính tả. |

---

### 1.4. Phân loại 6 Nhóm Lỗi Ngữ âm Tiếng Việt Cốt lõi & Thang Xếp loại Học lực

#### A. 6 Nhóm Lỗi Ngữ âm Tiếng Việt Chuẩn Sư phạm
Dựa trên cấu trúc âm tiết tiếng Việt 5 thành phần:
$$\text{Âm tiết} = \text{Âm đầu} + \text{Âm đệm} + \text{Âm chính} + \text{Âm cuối} + \text{Dấu thanh}$$
Hệ thống phân loại chính xác các lỗi viết sai của học sinh thành 6 nhóm chuẩn mực:
1. **Lỗi Phụ âm đầu (`phu_am_dau` — Màu Hồng Rose `#F43F5E`):** Nhầm lẫn các cặp phụ âm có cách phát âm tương đồng theo phương ngữ (*ch/tr, s/x, d/gi/r, l/n, c/k/q, ng/ngh, g/gh*). Ví dụ: *"con châu"* $\rightarrow$ *"con trâu"*, *"xớm mai"* $\rightarrow$ *"sớm mai"*.
2. **Lỗi Dấu thanh (`dau_thanh` — Màu Tím Purple `#A855F7`):** Nhầm lẫn thanh hỏi/ngã, sắc/nặng do phương ngữ miền Trung và miền Nam. Ví dụ: *"nghĩ ngơi"* $\rightarrow$ *"nghỉ ngơi"*, *"rộn rả"* $\rightarrow$ *"rộn rã"*.
3. **Lỗi Vần khó (`van` — Màu Cam Orange `#F97316`):** Nhầm lẫn các vần có kết cấu phức tạp hoặc có âm đệm. Ví dụ: *"khoeo chân"* $\rightarrow$ *"kheo chân"*, *"loang ngoang"* $\rightarrow$ *"loằng ngoằng"*.
4. **Lỗi Nguyên âm chính (`am_chinh` — Màu Xanh ngọc Emerald `#10B981`):** Viết sai âm chính (*i/y, o/ô/ơ, u/ư, ie/iê*). Ví dụ: *"líu no"* $\rightarrow$ *"líu lo"*, *"đêm khuy"* $\rightarrow$ *"đêm khuya"*.
5. **Lỗi Âm cuối (`phu_am_cuoi` — Màu Xanh trời Sky `#0EA5E9`):** Nhầm lẫn các phụ âm khép âm tiết (*c/t, n/ng, p/t*). Ví dụ: *"man mác"* $\rightarrow$ *"man mát"*, *"buôn làng"* $\rightarrow$ *"buôn làn"*.
6. **Lỗi Viết hoa (`viet_hoa` — Màu Xanh dương Blue `#2563EB`):** Không viết hoa chữ cái đầu dòng thơ, đầu câu văn xuôi, hoặc danh từ riêng chỉ người/địa danh. Ví dụ: *"hà nội"* $\rightarrow$ *"Hà Nội"*, *"bác hồ"* $\rightarrow$ *"Bác Hồ"*.

#### B. Thang Xếp loại Học lực Theo Thông tư 27
- **Hoàn thành xuất sắc (Mã màu `#059669`):** Tổng điểm $\ge 9.0$. Nắm vững kiến thức, chữ viết sạch đẹp, không mắc lỗi chính tả hoặc chỉ sai sót nhỏ không đáng kể.
- **Hoàn thành tốt (Mã màu `#0284C7`):** Tổng điểm từ $7.0 \dots < 9.0$. Hoàn thành tốt yêu cầu bài học, chữ viết rõ ràng, mắc từ 1 đến 2 lỗi nhỏ.
- **Hoàn thành (Mã màu `#D97706`):** Tổng điểm từ $5.0 \dots < 7.0$. Đạt yêu cầu tối thiểu, còn mắc từ 3 đến 5 lỗi chính tả, cần giáo viên lưu ý nhắc nhở.
- **Chưa hoàn thành / Cần cố gắng (Mã màu `#DC2626`):** Tổng điểm $< 5.0$. Mắc nhiều lỗi chính tả cơ bản, chữ viết chưa đạt, cần có kế hoạch kèm cặp riêng từ giáo viên.

---

# PHẦN II: KIẾN TRÚC HỆ THỐNG 4 TẦNG TOÀN DIỆN (THE 4-TIER SYSTEM ARCHITECTURE)

Hệ sinh thái **ViHand Grade** được thiết kế theo mô hình lai **Hybrid Edge-Cloud AI** gồm 4 tầng công nghệ phối hợp chặt chẽ:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TẦNG CLIENT & THIẾT BỊ ĐẦU CUỐI (CLIENT TIER)                                                 │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ Android Native Client (Kotlin / Compose)    │    │ Web Studio & PWA (Next.js 16 / React 19)│ │
│  │ • SDK 36 (Android 16), Min SDK 24            │    │ • Tailwind CSS v4 + Radix UI            │ │
│  │ • CameraX 1.5.0 (Low-latency capture)        │    │ • Service Worker offline cache (PWA)    │ │
│  │ • Lockstep Co-Transformation (Pinch 1x-4x)   │    │ • AI Grading Studio (5-Step Stepper)    │ │
│  │ • Dynamic Difficult Words Notebook           │    │ • Dictation Studio & SGK Corpus Browser │ │
│  │ • Room Database v4 (vihand_grade.db)         │    │ • Admin Control Center & System Monitor │ │
│  └──────────────────────────────────────────────┘    └─────────────────────────────────────────┘ │
└─────────────────────────────────┬──────────────────────────────────────┬─────────────────────────┘
                                  │ HTTP REST DTO (GradeApiRequest)      │ Web Fetch
                                  ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. TẦNG CỔNG GIAO TIẾP & BFF GATEWAY (GATEWAY / BFF TIER - Next.js 16 App Router :3000)          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ In-Memory Sliding Window Rate Limiting Guard (lib/api-guard.ts - 20-60 req/min/IP)          │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ RBAC Session Security & Route Protection (Admin, Teacher, Student)                          │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ All-in-one Mobile Gateway: POST /api/mobile/grade (Parallel Gemini OCR + YOLOv8)            │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ Grading Pipeline Orchestrator: POST /api/grade (LCS Diff, ViT5, Gemini Fallback)            │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ Pure TS Jimp 9-Step Image Preprocessor: POST /api/preprocess (Deskew, CLAHE, Shadow)        │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ Dictation & Audio Stream Bridge: GET /api/dictation/tts -> Edge-TTS / Google TTS            │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬──────────────────────────────────────┬─────────────────────────┘
                                  │ Local Loopback (Port 8000)           │ Multi-Key HTTPS
                                  ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐ ┌──────────────────────────────┐
│ 3. TẦNG LÕI AI MICROSERVICES (FASTAPI PYTHON CORE :8000)        │ │ TẦNG CLOUD DỊCH VỤ VLM       │
│  ┌────────────────────────────────────────────────────────────┐ │ │ ┌──────────────────────────┐ │
│  │ YOLOv8 Word Detector (yolo_detector.py)                    │ │ │ │ Google Gemini API        │ │
│  │ • Trọng số: best.pt (640x640, imgsz=640)                   │ │ │ │ • gemini-3.1-flash-lite  │ │
│  │ • Thuật toán Vertical Overlap (0.40) gom dòng tự nhiên     │ │ │ │ • gemini-3.5-flash-lite  │ │
│  │ • Chuẩn hóa tọa độ tương đối rel_x, rel_y ∈ [0, 1]         │ │ │ │ • Xoay vòng Multi-Keys   │ │
│  ├────────────────────────────────────────────────────────────┤ │ │ │ • Prompt trích xuất thô  │ │
│  │ ViT5 Vietnamese Correction Engine (main.py)                │ │ │ │   100% giữ nguyên lỗi    │ │
│  │ • Mô hình: chamdentimem/ViT5_Vietnamese_Correction (226M)  │ │ │ └──────────────────────────┘ │
│  │ • Lượng tử hóa Dynamic INT8 CPU (Tiết kiệm 50% RAM)        │ │ └──────────────┬───────────────┘
│  │ • Prose Chunking ≤ 160 ký tự (Chống lặp vô hạn)            │ │                │
│  │ • Bộ lọc Teencode 40+ regex & ACCIDENTAL_REPEAT_WORDS      │ │                │
│  │ • Levenshtein Syllable Matcher (Phân loại 6 nhóm lỗi)      │ │                │
│  ├────────────────────────────────────────────────────────────┤ │                │
│  │ Qwen 2.5-0.5B-Instruct SLM (main.py)                       │ │                │
│  │ • Độ chính xác: bfloat16 (~577MB RAM)                      │ │                │
│  │ • Sinh 3 phương án nhận xét sư phạm ấm áp Thông tư 27      │ │                │
│  │ • Sáng tác đoạn văn chính tả SGK GDPT 2018 theo khối lớp   │ │                │
│  ├────────────────────────────────────────────────────────────┤ │                │
│  │ Microsoft Edge-TTS Synthesis Engine (main.py)              │ │                │
│  │ • vi-VN-HoaiMyNeural (Nữ) & vi-VN-NamMinhNeural (Nam)       │ │                │
│  │ • Tham số sư phạm: rate = "-15%", stream MP3 trực tiếp     │ │                │
│  └────────────────────────────────────────────────────────────┘ │                │
└─────────────────────────────────┬───────────────────────────────┘                │
                                  │ Direct File / IPC                              │
                                  ▼                                                │
┌──────────────────────────────────────────────────────────────────────────────────┴───────────────┐
│ 4. TẦNG CƠ SỞ DỮ LIỆU & TRẠM TÍNH TOÁN BIÊN (DATABASE & EDGE COMPUTING APPLIANCE TIER)           │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Prisma SQLite Engine (prisma/vihand.db - 22.4MB)                                            │ │
│  │ • PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000; PRAGMA synchronous = NORMAL;     │ │
│  │ • Tách ảnh vật lý ra đĩa (public/uploads/grades/...), cột imageBase64 rỗng chống phình to   │ │
│  │ • Chính sách lưu trữ 365 ngày (expiresAt) & Soft Purge ẩn danh hóa theo Nghị định 13/2023    │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ Trạm Biên Phần Cứng (Hardware Appliance: Raspberry Pi 4 Model B 4GB / Jetson Nano 4GB)       │ │
│  │ • Hoán đổi bộ nhớ (Swap): 3072MB (vm.swappiness = 20) chống tràn RAM OOM Killer             │ │
│  │ • Phân bổ tài nguyên CGroups: vihand-python (MemoryMax 2.5GB), vihand-web (MemoryMax 2.0GB)  │ │
│  │ • Tường lửa UFW: Khóa cổng 8000 từ bên ngoài, chỉ mở cổng 3000 (Web Gateway) & 22 (SSH)     │ │
│  │ • Cloudflare Named Tunnel (vihandgrade.click): Ingress TLS an toàn, không cần mở port mạng │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1. Tầng 1: Client & Thiết bị Đầu cuối (Client Tier)

#### A. Ứng dụng Di động Android Native (`android_app/`)
Được xây dựng theo chuẩn Google Modern Android Development (MAD) tối ưu cho trải nghiệm di động của giáo viên:
- **Cấu hình Nền tảng:** Kotlin `2.2.10`, Jetpack Compose BOM `2024.09.00`, Compile/Target SDK `36` (Android 16), Min SDK `24` (Android 7.0), Java 11 bytecode compatibility.
- **Mô hình Kiến trúc UDF & MVVM:** Luồng dữ liệu một chiều nghiêm ngặt với `MainViewModel` và `ReportsViewModel`. Quản lý trạng thái bằng `MutableStateFlow`, công khai ra ngoài dạng `StateFlow` bất biến, và thu thập reactive trên Compose UI qua `collectAsStateWithLifecycle()`.
- **Cơ chế Cử chỉ Đồng bộ Tuyệt đối (Lockstep Co-Transformation):**
  Thành phần `PhotoBoundingBoxViewer.kt` (751 dòng) giải quyết triệt để lỗi lệch tọa độ bounding box khi xem bài thi:
  Cả **Layer 1** (Ảnh chụp bài thi từ Coil) và **Layer 2** (Lưới phủ Bounding Box cảm ứng) được đặt chung trong một vùng `Box` duy nhất mang modifier `graphicsLayer { scaleX = scale; scaleY = scale; translationX = offsetX; translationY = offsetY }`. Cử chỉ hai ngón tay `detectTransformGestures` hỗ trợ phóng to từ $1.0\times$ đến $4.0\times$ và kéo rê (pan). Nhờ co dãn trong cùng ma trận biến đổi đồ họa phần cứng, các hộp bounding box bám dính $1:1$ với từng nét mực học sinh trên ảnh.
- **Kính ngắm CameraX Chuyên Dụng (`CameraScanScreen.kt`):**
  Tích hợp `androidx.camera.view.PreviewView` với chế độ `CAPTURE_MODE_MINIMIZE_LATENCY`. Tự động xoay ảnh theo góc EXIF `rotationDegrees`, hiệu ứng chớp flash màn hình $90\text{ms}$ tạo phản hồi bấm chụp tức thì. Hỗ trợ **Chế độ quét liên tục cả lớp (Continuous Batch Scan)** cho phép giáo viên chụp liên tiếp 30–40 bài thi vào hàng đợi đệm để xử lý tuần tự.
- **Sổ tay Từ khó Động (`StudentHomeScreen.kt`):**
  Tự động trích xuất các từ bị viết sai từ các bài chấm gần nhất của học sinh (`extractDifficultWords`). Tích hợp `android.speech.tts.TextToSpeech` phát âm bản xứ tiếng Việt chuẩn `Locale("vi", "VN")` khi học sinh chạm vào từng từ khó. Hiển thị chữ viết tay bằng phông chuẩn tiểu học `hp001_normal.ttf`.
- **Bộ lọc & Tìm kiếm Không dấu Chuẩn xác (`HistoryScreen.kt`):**
  Thuật toán chuẩn hóa NFD loại bỏ dấu thanh tiếng Việt kết hợp ánh xạ ký tự `Đ/đ` giúp giáo viên tìm kiếm tên học sinh tức thì ngay cả khi gõ không dấu (`bao nam` $\rightarrow$ `Nguyễn Bảo Nam`). Bộ lọc Filter Chips phân loại theo Thể loại và 4 khoảng điểm số Thông tư 27.
- **Nguyên tắc Kiến trúc 100% Trực tuyến (Online-Only Architecture & Network Gatekeeper):**
  Hệ thống ViHand Grade hoạt động theo nguyên tắc **100% Trực tuyến (Strict Online-Only Client-Server)**, **hoàn toàn không hỗ trợ chế độ ngoại tuyến (No Offline Support)**:
  1. *Chặn truy cập & Cảnh báo Mất kết nối Ngay từ Màn hình Đăng nhập:* Khi thiết bị di động của người dùng (dù là Giáo viên, Học sinh hay Khách trải nghiệm - Guest) bị mất kết nối Wi-Fi hoặc không liên lạc được với máy chủ Gateway, ứng dụng lập tức chặn truy cập và hiển thị thông báo trực quan: *"Không thể đăng nhập vào hệ thống do mất kết nối Wi-Fi/mạng. Vui lòng kiểm tra lại kết nối mạng và thử lại."*
  2. *Bảo vệ Phiên Khách Trải nghiệm (Guest Access Guard):* Khi nhấn nút "Thử Giáo viên" hoặc "Thử Học sinh" (Guest Trial), ứng dụng luôn kiểm tra tình trạng kết nối mạng tới trạm máy chủ (`testConnection`) trong thời gian thực. Nếu mất mạng, hệ thống từ chối truy cập và yêu cầu kết nối mạng, triệt tiêu nguy cơ chạy ngầm không nhất quán.
  3. *Thao tác Dữ liệu Trực tiếp (Direct Online CRUD):* Toàn bộ thao tác chấm điểm, cập nhật barem và xóa bài thi đều được phát lệnh trực tiếp qua HTTP REST API lên máy chủ. Nếu mất mạng giữa chừng, hệ thống báo lỗi mạng tức thời để người dùng chủ động xử lý, hoàn toàn không duy trì cơ chế hàng đợi ngoại tuyến phức tạp, loại bỏ triệt để nguy cơ phát sinh "Dữ liệu ma" (Ghost Records).
- **Chuẩn hóa Thuật toán Ngắt cụm từ Sư phạm (`splitIntoPedagogicalClauses`):**
  Đồng bộ hóa 100% logic ngắt nhịp đọc giữa Android Native và Web Studio: Thay vì ngắt câu thô sơ theo dấu chấm (`split("\n", ".")`), ứng dụng di động phân tách đoạn văn thành các cụm từ ngắn từ 3 đến 5 từ, tự động tính khoảng nghỉ thích ứng $\max(5\text{s}, \text{wordCount} \times 1.6\text{s})$ giúp học sinh tiểu học nghe rõ và kịp nắn nót viết từng nét chữ.
- **Độ tin cậy & Kiểm thử:** Vượt qua 100% bộ kiểm thử tự động **23/23 Tests** (Robolectric SDK 36 Pixel 8, Unit tests, Roborazzi snapshot tests, stress tests). Kích thước APK tối ưu: `25.38 MB` (`app-debug.apk`).

#### B. Nền tảng Web Studio & PWA (`app/`)
- **Nền tảng công nghệ:** Next.js `16.2.4` (App Router), React `19`, TypeScript `5.7.3`, Tailwind CSS `v4`, Radix UI.
- **3 Phân hệ giao diện theo vai trò (RBAC):**
  - **Giáo viên (`/teacher`):** AI Grading Studio (quy trình 5 bước với Bounding Box interactive editor), Dictation Studio (nghe - phát âm Edge-TTS với 50+ bài trích SGK GDPT 2018), Sổ điểm lớp học và biểu đồ phổ điểm Recharts.
  - **Học sinh (`/student`):** Dashboard rèn luyện, Sổ tay từ khó cá nhân hóa kèm audio phát âm, Tra cứu lịch sử bài thi và xem lại ảnh bài làm gốc.
  - **Quản trị viên (`/admin`):** Quản lý người dùng & lớp học, Giám sát tài nguyên hệ thống (CPU, RAM, độ trễ, token), Thiết lập chính sách bảo vệ dữ liệu trẻ em theo Nghị định 13/2023.
- **Khả năng PWA:** Hỗ trợ cài đặt trên máy tính bảng giáo viên với Service Worker (`/app/sw.js`) và Dynamic App Icons.

---

### 2.2. Tầng 2: Cổng Giao tiếp & Backend-for-Frontend (Gateway / BFF Tier)

Hệ thống triển khai mô hình BFF thông qua App Router của Next.js 16 bao gồm **24 route handlers** (38 HTTP methods), không sử dụng Server Actions nhằm bảo đảm tính tương thích RESTful nguyên bản giữa Web Client và Android Client.

#### Điểm Nhấn: Gateway Đa Năng `/api/mobile/grade`
Được thiết kế chuyên biệt cho ứng dụng Android Native, thực hiện toàn bộ chuỗi xử lý phức tạp chỉ trong một lời gọi mạng duy nhất:
1. **Kiểm soát Tần suất & Thích ứng Mạng NAT Trường học (Adaptive Rate Limiting):**
   - Gọi `guardAiRoute(req, 20)` bảo vệ endpoint trước DoS.
   - *Khắc phục điểm nghẽn NAT Lớp học:* Áp dụng cơ chế cửa sổ trượt In-Memory 20–60 req/phút; khi học sinh cùng lớp chia sẻ IP NAT trường học, hệ thống hỗ trợ mở rộng hạn ngạch theo phiên lớp học, ngăn ngừa hiện tượng học sinh nộp bài tập trung bị chặn nhầm bởi mã lỗi `429 Too Many Requests`.
2. **Bảo vệ Xác thực API Di động (Mobile API Guard):**
   - Bổ sung kiểm tra chữ ký yêu cầu hoặc Token xác thực phiên (`Authorization: Bearer <session_token>`), ngăn chặn triệt để các hành vi tiêm dữ liệu bài thi giả mạo hoặc phá hoại cơ sở dữ liệu điểm số từ bên ngoài mạng trường.
3. **Xử lý Song song (Parallel Processing):** Kích hoạt đồng thời qua `Promise.all`:
   - `runGeminiOCR`: Gọi Gemini Vision OCR với cơ chế xoay vòng Multi-API Keys trích xuất `original_text` và `fixed_text`.
   - `detectYoloBoxes`: Gửi ảnh sang Python AI Core `POST http://127.0.0.1:8000/detect-words` để quét tọa độ Bounding Box của từng từ.
4. **Gọi Trực tiếp Trong Bộ Nhớ (In-process Direct Invocation):**
   Gọi trực tiếp hàm `handleGradePost` của `app/api/grade/route.ts` trong cùng tiến trình Node.js (Zero-network delay) để thực thi thuật toán so khớp Levenshtein và sinh điểm Thông tư 27.
5. **Ánh xạ Hợp đồng (Data Transformation):** Chuyển đổi toàn bộ kết quả sang cấu trúc DTO `GradeApiResponse` khớp 100% với Moshi Adapter phía Android (đồng bộ cả 2 trường `the_loai` và `essayType`).
6. **Lưu trữ Bất đồng bộ Chống Nghẽn I/O (Async Persistence & Image Offloading):**
   Tách việc ghi tệp ảnh vật lý ra đĩa (`saveImageToDisk`) thành tác vụ bất đồng bộ, để rỗng cột `imageBase64` trong SQLite và ghi bản ghi vào bảng `Grade` trong Prisma `vihand.db`, không để độ trễ thẻ nhớ Micro-SD làm nghẽn luồng phản hồi HTTP trả về cho ứng dụng di động.

#### Bộ Lọc Tần Suất Cửa Sổ Trượt (In-Memory Sliding Window Rate Limiting)
Triển khai tại `lib/api-guard.ts` (109 dòng):
- Lưu trữ danh sách mốc thời gian truy cập trong `Map<string, { timestamps: number[] }>`.
- Nhận diện địa chỉ IP nguồn thực tế thông qua các tiêu đề ủy quyền: `CF-Connecting-IP` (Cloudflare Tunnel), `X-Forwarded-For`, và `X-Real-IP`.
- Chu kỳ dọn rác tự động `setInterval` mỗi 60 giây dọn sạch các khóa không hoạt động, loại bỏ triệt để rò rỉ bộ nhớ (Memory Leak).
- Hạn mức tiêu chuẩn: `/api/mobile/grade` (20 req/phút thông thường, burst 60 req/phút có phiên lớp), `/api/grade` (30 req/phút), `/api/yolo/detect` (60 req/phút).
- Khi vi phạm: Phản hồi HTTP `429 Too Many Requests` kèm headers chuẩn `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.

---

### 2.3. Tầng 3: Lõi Xử lý Trí tuệ Nhân tạo Đa Dịch vụ (AI Microservices Core Tier)

Được xây dựng trên nền tảng **FastAPI** (`python_service/main.py`), vận hành độc lập tại cổng `8000`:

#### 1. YOLOv8 Word Detector & Thuật Toán Vertical Overlap (`python_service/yolo_detector.py`)
- **Trọng số mô hình:** `best.pt` được huấn luyện chuyên biệt trên tập dữ liệu vở ô ly học sinh tiểu học Việt Nam. Kích thước ảnh chuẩn hóa `imgsz = 640`.
- **Thuật toán Gom dòng Vertical Overlap (Ngưỡng 0.40):**
  Khắc phục nhược điểm của thuật toán quét tâm $y_{mid}$ khi gặp các ký tự vươn cao (*b, h, l, d*) hoặc hạ thấp (*g, y, p*). Thuật toán tính toán độ giao thoa theo phương thẳng đứng giữa hộp chữ mới và dải bao trung bình của dòng kẻ:
  $$\text{overlap\_ratio} = \frac{\max(0.0, \min(by_2, \text{line\_y2\_avg}) - \max(by_1, \text{line\_y1\_avg}))}{\min(\text{box\_h}, \text{line\_h})}$$
  Nếu $\text{overlap\_ratio} \ge 0.40$, từ được xếp vào dòng tương ứng. Sau đó sắp xếp dòng từ trên xuống dưới và từ trong dòng từ trái sang phải theo thứ tự đọc tự nhiên.
- **Tọa độ tương đối:** Toàn bộ bounding box được chuẩn hóa về dải $[0.0, 1.0]$ (`rel_x1, rel_y1, rel_w, rel_h`).

#### 2. Động Cơ Sửa Lỗi Chính Tả ViT5 & Phân Loại Âm Tiết (`python_service/main.py`)
- **Mô hình định danh:** `chamdentimem/ViT5_Vietnamese_Correction` (Seq2Seq Transformer, 226M tham số).
- **Dynamic INT8 Quantization:** Lượng tử hóa động các lớp tuyến tính (`torch.qint8`), giảm dung lượng RAM chiếm dụng từ 1.1GB xuống còn **~510MB**, tăng tốc suy luận CPU từ 30% đến 50%.
- **Giải pháp Chia Đoạn Ngắt Câu (Prose Chunking $\le 160$ ký tự):**
  Chia nhỏ đoạn văn theo dấu chấm câu sao cho độ dài mỗi đoạn $\le 160$ ký tự ($\approx 240$ SentencePiece tokens), vừa vặn trong cửa sổ ngữ cảnh `max_length = 256`. Tuyệt đối không dùng cửa sổ trượt (sliding window) để triệt tiêu hoàn toàn hiện tượng lặp lại câu trước trong output.
- **Bộ Phân tích Âm tiết & So khớp Levenshtein (Syllable Parser):**
  Bóc tách âm tiết tiếng Việt thành 5 thành phần (âm đầu, âm đệm, âm chính, âm cuối, dấu thanh). Kết hợp `difflib.SequenceMatcher` để phân loại chính xác 6 nhóm lỗi ngữ âm và tính điểm trừ 0.5đ/lỗi.

#### 3. Mô Hình Sinh Ngôn Ngữ Nhỏ Qwen 2.5-0.5B-Instruct
- **Cấu hình tài nguyên:** Chạy ở độ chính xác `bfloat16`, chỉ tiêu tốn **~577MB RAM**, rất phù hợp cho Raspberry Pi 4.
- **Nhiệm vụ 1: Lời nhận xét sư phạm ấm áp:** Nhận diện các biện pháp tu từ (so sánh, từ láy, nhân hóa) từ Tier-1 Analyzer, sinh 3 phương án nhận xét khích lệ theo đúng tinh thần Thông tư 27 (khen ngợi sáng tạo trước, nhắc lỗi chính tả sau).
- **Nhiệm vụ 2: Sáng tác bài đọc SGK 2018:** Sinh đoạn văn chính tả theo khối lớp (1 đến 5), chủ đề bài học và trích xuất danh sách từ khó viết.

#### 4. Động Cơ Phát Âm Chuẩn Sư Phạm Microsoft Edge-TTS
- Tích hợp thư viện `edge-tts` với 2 giọng đọc tự nhiên: **Cô Hoài My** (`vi-VN-HoaiMyNeural`) và **Thầy Nam Minh** (`vi-VN-NamMinhNeural`).
- Thiết lập tốc độ đọc `rate = "-15%"` mô phỏng nhịp đọc bài chuẩn mực của giáo viên tiểu học. Stream trực tiếp dữ liệu âm thanh qua HTTP GET `/tts` với độ trễ $< 1.0$ giây.

#### 5. Kênh Gemini Vision Multimodal Cloud OCR
- Sử dụng mô hình `gemini-3.1-flash-lite` làm kênh nhận diện thị giác chính từ ảnh chụp bài thi thô.
- Thiết lập `temperature: 0.05` và prompt hệ thống bắt buộc giữ nguyên 100% lỗi sai của học sinh.
- Hỗ trợ xoay vòng nhiều API keys khi chạm hạn mức HTTP 429 và fallback sang `gemini-3.1-flash`.

---

### 2.4. Tầng 4: Cơ sở Dữ liệu & Trạm Tính toán Biên (Database & Edge Computing Tier)

#### 1. Cơ Sở Dữ Liệu Prisma SQLite (`prisma/vihand.db`)
- **Kiến trúc Kiểm soát Tranh chấp Khóa Ghi (Single-Writer Concurrency Management):**
  Kích hoạt chế độ Write-Ahead Logging thông qua `lib/prisma.ts`:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 10000;
  PRAGMA synchronous = NORMAL;
  ```
  *Bản chất kỹ thuật:* SQLite WAL cho phép không giới hạn kết nối đọc đồng thời (Concurrent Readers), nhưng tại mỗi thời điểm **chỉ có DUY NHẤT một kết nối được ghi (Strict Single-Writer)** với khóa cấp tệp. Để triệt tiêu nguy cơ lỗi `SQLITE_BUSY` khi cả lớp 35–45 học sinh nộp bài cùng lúc vào cuối tiết học:
  1. *Bóc tách I/O đĩa:* Tệp ảnh vật lý được ghi bất đồng bộ ra đĩa (`saveImageToDisk`) trước hoặc song song ngoài giao dịch ghi DB, không giữ khóa SQLite trong lúc chờ I/O thẻ nhớ.
  2. *Giao dịch siêu nhẹ:* Mỗi lượt ghi bản ghi `Grade` chỉ tốn $3 – 8\text{ms}$. Với 40 học sinh, toàn bộ hàng đợi ghi hoàn tất trong $40 \times 8\text{ms} = 320\text{ms}$, nằm an toàn dưới ngưỡng `busy_timeout = 10000\text{ms}` (10 giây hàng đợi chờ khóa).
  3. *Chống trùng lặp:* Kiểm tra xung đột khóa logic `studentName + assignmentTitle + className` ngăn chặn ghi trùng lặp khi mạng chập chờn kích hoạt retry tự động.
- **Chống Phình to Cơ sở Dữ liệu (Image Bloat Shield):**
  Hàm `saveImageToDisk` bóc tách Base64 và ghi tệp ảnh vật lý vào `public/uploads/grades/${Date.now()}-${random}.jpg`. Cột `imageBase64` trong DB được để rỗng, chỉ lưu đường dẫn `imagePath`, giữ cho kích thước `vihand.db` ổn định (~22.4 MB).

#### 2. Cơ Sở Dữ Liệu Cục Bộ Room DB v4 (`vihand_grade.db`)
- Lưu trữ trên thiết bị Android: Bảng `grade_records` (18 trường dữ liệu, bổ sung cột `serverId` ở phiên bản v4 để liên kết CSDL máy chủ), `classes`, `students`.
- Tích hợp 10 câu lệnh SQL truy vấn thống kê sư phạm phục vụ Thông tư 27 (tỷ lệ Xuất sắc, Tốt, Khá, Cần cố gắng, Top học sinh cần rèn luyện).
- Cơ chế **Đồng bộ hai chiều toàn vẹn (`syncTwoWayWithServer`)**:
  - *Chiều Thêm:* Đẩy các bài chấm trên máy lên server (`POST /api/grades`) và cập nhật ID máy chủ trả về (`serverId`).
  - *Chiều Tải:* Tải các bài mới từ server về máy (`GET /api/grades?class=...`) đối soát theo bộ khóa duy nhất `studentName_essayTitle_className`.
  - *Chiều Xóa Trực Tiếp (Direct Online Delete Sync):* Khi bài thi bị xóa trên app, Room DB thực hiện xóa bản ghi cục bộ đồng thời phát lệnh `DELETE /api/grades/{serverId}` lên server nhằm xóa vĩnh viễn tệp ảnh và bản ghi trên máy chủ, triệt tiêu hiện tượng tải lại bài thi ma (Ghost records) mà không cần duy trì cơ chế hàng đợi Tombstone phức tạp.

#### 3. Trạm Biên Phần Cứng (Hardware Appliance): Raspberry Pi 4 / Jetson Nano
- **Bộ nhớ Swap 3072MB & Chống Nghẽn Thẻ Micro-SD (`00_init_system.sh`):**
  Cấu hình swap 3GB kết hợp tham số hạt nhân Linux `vm.swappiness = 20` và `vm.vfs_cache_pressure = 50`. Do thẻ nhớ Micro-SD có tốc độ đọc/ghi ngẫu nhiên giới hạn (khoảng $20 - 40\text{ MB/s}$), việc ghìm tham số swappiness giúp hệ thống ưu tiên lưu giữ mã thực thi trong RAM thật, triệt tiêu hiện tượng Swap Thrashing gây đóng băng CPU.
- **Cân Bằng Hạn Mức Tài Nguyên CGroups Systemd (`03_setup_services.sh`):**
  Tổng định mức `MemoryMax` của tất cả dịch vụ được khống chế nghiêm ngặt trong ngưỡng RAM vật lý (4.096 MB) để bảo đảm an toàn nhân Linux:
  - Dịch vụ `vihand-python.service`: Giới hạn `MemoryHigh=1800M`, `MemoryMax=2200M`, `CPUQuota=90%`.
  - Dịch vụ `vihand-web.service`: Giới hạn `MemoryHigh=1000M`, `MemoryMax=1400M`, `CPUQuota=85%`, `NODE_OPTIONS="--max-old-space-size=1024"`.
  - *Tổng cộng MemoryMax:* $2200\text{M} + 1400\text{M} + 400\text{M (OS)} = 4000\text{MB} \le 4096\text{MB}$ (An toàn tuyệt đối, không kích hoạt OOM Killer).
- **Tường lửa Cô lập UFW (`04_setup_network_firewall.sh`):**
  Chặn toàn bộ truy cập từ ngoài vào cổng `8000` của Python Core. Toàn bộ lưu lượng mạng bắt buộc phải đi qua cổng `3000` (Next.js AI Gateway) để được kiểm soát phiên làm việc và lọc tần suất DoS.
- **Cloudflare Named Tunnel (`05_setup_cloudflare_tunnel.sh`):**
  Kết nối trạm biên nội bộ ra tên miền Internet an toàn `https://vihandgrade.click` thông qua đường hầm mã hóa outbound TLS của `cloudflared`. Hoàn toàn không cần mở port modem (No Port Forwarding), không cần IP tĩnh, vượt qua mọi lớp CGNAT của nhà mạng.

---

# PHẦN III: HỆ THỐNG SƠ ĐỒ ĐẶC TẢ KIẾN TRÚC & QUY TRÌNH TOÀN DIỆN (SYSTEM ARCHITECTURE BLUEPRINTS)

Tất cả 6 sơ đồ kiến trúc và quy trình dưới đây được thiết kế và đặc tả chi tiết bằng đồ họa ký tự chuẩn (Unicode Box-Drawing Blueprints), phản ánh chính xác cấu trúc thực tế của hệ sinh thái ViHand Grade, đảm bảo tính trực quan, sắc nét và khả chuyển tuyệt đối trên mọi môi trường hiển thị.

### 3.1. Sơ đồ Kiến trúc Tổng quan 4 Tầng Hệ thống (System Overview 4-Tier Architecture)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TẦNG CLIENT & THIẾT BỊ ĐẦU CUỐI (CLIENT TIER)                                                 │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ Android Native Client (Kotlin / Compose)     │    │ Web Studio & PWA (Next.js 16 / React 19)│ │
│  │ • SDK 36 (Android 16), Min SDK 24            │    │ • Tailwind CSS v4 + Radix UI            │ │
│  │ • CameraX 1.5.0 (Low-latency capture)        │    │ • Service Worker offline cache (PWA)    │ │
│  │ • Lockstep Co-Transformation (Pinch 1x-4x)   │    │ • AI Grading Studio (5-Step Stepper)    │ │
│  │ • Dynamic Difficult Words Notebook           │    │ • Dictation Studio & SGK Corpus Browser │ │
│  │ • Room Database v4 (vihand_grade.db)         │    │ • Admin Control Center & System Monitor │ │
│  └──────────────────────┬───────────────────────┘    └────────────────────┬────────────────────┘ │
└─────────────────────────┼─────────────────────────────────────────────────┼──────────────────────┘
                          │ HTTP REST DTO (GradeApiRequest)                 │ Web Fetch (HTTP REST)
                          ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. TẦNG CỔNG GIAO TIẾP & BFF GATEWAY (GATEWAY / BFF TIER - Next.js 16 App Router :3000)          │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ In-Memory Sliding Window Rate Limiting Guard (lib/api-guard.ts • 20-60 req/min/IP)         │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│         ┌───────────────────────────────────────┼───────────────────────────────────────┐        │
│         ▼                                       ▼                                       ▼        │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌────────────────────────────┐  │
│  │ Mobile All-in-One BFF Route │ │ Core Grading & Alignment    │ │ Dictation & Audio Stream   │  │
│  │ POST /api/mobile/grade      │ │ POST /api/grade             │ │ GET /api/dictation/tts     │  │
│  │ (Parallel Vision & YOLO)    │ │ (LCS Diff, ViT5, Fallback)  │ │ (Edge-TTS / Google Bridge) │  │
│  └──────────────┬──────────────┘ └──────────────┬──────────────┘ └─────────────┬──────────────┘  │
│                 │                               │                              │                 │
│                 │ ┌─────────────────────────────┴────────────────────────────┐ │                 │
│                 └─► Prisma Client v5.22.0 ORM (PRAGMA journal_mode = WAL)    ◄─┘                 │
└───────────────────┼─────────────────────────────┬──────────────────────────────┼─────────────────┘
                    │ Parallel Vision Call        │ Local Loopback (:8000)       │ Stream Audio
                    │ (Multi-Key Rotation)        │ (INT8 / bfloat16)            │ (audio/mpeg)
                    ▼                             ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────────────────────────────────────────┐
│      TẦNG CLOUD VLM          │ │ 3. TẦNG LÕI AI MICROSERVICES (FASTAPI PYTHON CORE :8000)        │
│  ┌────────────────────────┐  │ │  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │ Google Gemini Cloud    │  │ │  │ YOLOv8 Word Detector         │  │ ViT5 Correction Engine   │ │
│  │ • gemini-3.1-flash-lite│  │ │  │ • best.pt (640x640)          │  │ • Dynamic INT8 CPU       │ │
│  │ • gemini-3.5-flash-lite │  │ │  │ • Vertical Overlap (0.40)    │  │ • Prose Chunking <=160   │ │
│  │ • Zero-Loss Prompt     │  │ │  │ • Rel BBoxes [0.0, 1.0]      │  │ • 6 Phân nhóm lỗi ngữ âm │ │
│  │ • Xoay vòng Multi-Keys │  │ │  └──────────────────────────────┘  └──────────────────────────┘ │
│  └────────────────────────┘  │ │  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│                              │ │  │ Qwen 2.5-0.5B-Instruct SLM   │  │ Microsoft Edge-TTS Engine│ │
│                              │ │  │ • bfloat16 (~577MB RAM)      │  │ • HoaiMy & NamMinh Neural│ │
│                              │ │  │ • Nhận xét sư phạm TT27      │  │ • Tốc độ chuẩn: rate=-15%│ │
│                              │ │  └──────────────────────────────┘  └──────────────────────────┘ │
└──────────────────────────────┘ └────────────────────────────────┬────────────────────────────────┘
                                                                  │ Ghi bản ghi / Lưu ảnh đĩa
                                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. TẦNG CƠ SỞ DỮ LIỆU & TRẠM TÍNH TOÁN BIÊN (DATABASE & EDGE APPLIANCE TIER)                     │
│  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────────────┐ │
│  │ SQLite Database (prisma/vihand.db • 22.4MB)  │    │ Lưu trữ Ảnh Vật lý (Anti-Bloat Shield)  │ │
│  │ • PRAGMA journal_mode = WAL                  │    │ • /public/uploads/grades/mobile-*.jpg   │ │
│  │ • PRAGMA busy_timeout = 10000; synchronous=NRM│   │ • imageBase64 rỗng, chỉ lưu imagePath   │ │
│  │ • Soft Purge & Anonymization (NĐ 13/2023)    │    │ • Tự động unlink khi xóa bài chấm       │ │
│  └──────────────────────────────────────────────┘    └─────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Trạm Biên Phần Cứng: Raspberry Pi 4 Model B (4GB RAM) / Nvidia Jetson Nano (4GB VRAM)      │  │
│  │ • Swap: 3072MB (vm.swappiness = 20) chống tràn RAM OOM Killer khi chạy đồng thời Next + AI │  │
│  │ • CGroups Systemd: vihand-python (Max 2.5GB), vihand-web (Max 2.0GB, Heap 1.5GB)           │  │
│  │ • Tường lửa UFW: Khóa cổng 8000 nội bộ, chỉ mở cổng 3000 (Web Gateway) & 22 (SSH)          │  │
│  │ • Cloudflare Named Tunnel (vihandgrade.click): Ingress TLS an toàn, vượt CGNAT nhà mạng    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2. Sơ đồ Mô hình Cộng tác Hybrid Edge-Cloud & Định tuyến Dự phòng Local Edge LAN (Zero-Token Cloud)

#### A. Sơ đồ Tuần tự Quyết định Định tuyến Thông minh (Smart AI Routing Sequence):

```
┌────────────┐          ┌────────────┐          ┌─────────────────┐          ┌─────────────────┐          ┌────────────────┐          ┌──────────────┐
│Giáo viên/HS│          │ App / Web  │          │ Gateway (:3000) │          │ Py Core (:8000) │          │  Gemini Cloud  │          │ SQLite / Đĩa │
└─────┬──────┘          └─────┬──────┘          └────────┬────────┘          └────────┬────────┘          └───────┬────────┘          └──────┬───────┘
      │                       │                          │                            │                           │                          │
  1   ├─ Nộp bài thi ────────►│                          │                            │                           │                          │
      │                       │                          │                            │                           │                          │
  2   │                       ├─ POST /api/grade ───────►│                            │                           │                          │
      │                       │  (hoặc mobile/grade)     │                            │                           │                          │
  3   │                       │                          ├─ Rate Limit Check ───────┐ │                           │                          │
      │                       │                          │  (Sliding Window Map)    │ │                           │                          │
      │                       │                          │◄─────────────────────────┘ │                           │                          │
      │                       │                          │                            │                           │                          │
      │   ┌─── [TRƯỜNG HỢP 1: CÓ BÀI MẪU GROUND TRUTH (LOCAL EDGE LAN ZERO-TOKEN - 0 TOKEN CLOUD)] ──────────────────────────────────────┐   │
      │   │                   │                          │                            │                           │                      │   │
  4   │   │                   │                          ├─ LCS Diff Opcodes ───────┐ │                           │                      │   │
      │   │                   │                          │  (Zero-Hallucination)    │ │                           │                      │   │
      │   │                   │                          │◄─────────────────────────┘ │                           │                      │   │
  5   │   │                   │                          ├─ Phân tích 6 nhóm lỗi ────►│                           │                      │   │
      │   │                   │                          │  (parse_vietnamese)        │                           │                      │   │
  6   │   │                   │                          │◄─ Chi tiết lỗi & điểm 7đ-3đ┤                           │                      │   │
  7   │   │                   │                          ├─ Ghi bản ghi (tokenCount=0)──────────────────────────────────────────────────►│   │
  8   │   │                   │◄─ Kết quả Zero-Token ────┤  (0đ phí Cloud, 0 Token)   │                           │                      │   │
      │   └─── [HOÀN TẤT TRƯỜNG HỢP 1: TỰ ĐỘNG LƯU TRỮ VÀ PHẢN HỒI CLIENT QUA MẠNG LAN TRẠM BIÊN] ──────────────────────────────────────┘   │
      │                       │                          │                            │                           │                          │
      │   ┌─── [TRƯỜNG HỢP 2: CHẤM TỪ ẢNH CHỤP BÀI THI VIẾT TAY (HYBRID MODE)] ──────────────────────────────────────────────────────────┐   │
      │   │                   │                          │                            │                           │                      │   │
      │   │   ┌── PARALLEL PROCESSING (Xử lý đồng thời Promise.all) ──────────────────────────────────────────────────────────────┐       │   │
  9   │   │   ├─ Gọi Gemini OCR (5 bước prompt) ─────────────────────────────────────────────────────────────────►│                      │   │
 10   │   │   ├─ Gửi ảnh sang YOLOv8 (:8000/detect-words) ───────────────────────────►│                           │                      │   │
 11   │   │   │◄─ Trả về tọa độ relative BBoxes [0.0, 1.0] ───────────────────────────┤                           │                      │   │
 12   │   │   │◄─ Trả về original_text & fixed_text ──────────────────────────────────────────────────────────────┤                      │   │
      │   │   └── HOÀN TẤT XỬ LÝ SONG SONG (PROMISE.ALL RESOLVED) ────────────────────────────────────────────────┘                      │   │
      │   │                   │                          │                            │                           │                      │   │
 13   │   │                   │                          ├─ So khớp thứ tự đọc ─────┐ │                           │                      │   │
      │   │                   │                          │  (Universal Reading Order) │                           │                      │   │
      │   │                   │                          │◄─────────────────────────┘ │                           │                      │   │
      │   │                   │                          │                            │                           │                      │   │
      │   │   ┌── PHÂN NHÁNH ĐỘNG CƠ SỬA LỖI & SINH LỜI PHÊ ─────────────────────────────────────────────────────────────┐       │   │
      │   │   │ [Nhánh A: ViT5 INT8 Cục bộ Khả dụng]                                                                      │       │   │
 14a  │   │   ├─ Gọi ViT5 INT8 & Qwen 2.5 SLM ───────────────────────────────────────►│                           │       │       │   │
 14b  │   │   │◄─ Trả về văn bản sửa lỗi & 3 phương án nhận xét Thông tư 27 ──────────┤                           │       │       │   │
      │   │   │ ───────────────────────────────────────────────────────────────────────────────────────────────────────── │       │   │
      │   │   │ [Nhánh B: ViT5 Timeout / Lỗi -> Fallback Nóng sang Gemini Cloud Prompt]                                   │       │   │
 15a  │   │   ├─ Gọi Gemini Text Grading Prompt (Barem BGD&ĐT TT27) ──────────────────────────────────────────────►│       │       │   │
 15b  │   │   │◄─ Trả về điểm số Thông tư 27 & lời phê dự phòng ──────────────────────────────────────────────────┤       │       │   │
      │   │   └── KẾT THÚC PHÂN NHÁNH ĐỘNG CƠ SỬA LỖI ────────────────────────────────────────────────────────────────────┘       │   │
      │   │                   │                          │                            │                           │                      │   │
 16   │   │                   │                          ├─ Tách Base64 ghi đĩa, ghi bản ghi Grade vào SQLite ──────────────────────────►│   │
 17   │   │                   │◄─ GradeApiResponse ──────┤  (Kèm đầy đủ BBoxes, lỗi sai & điểm số Thông tư 27)    │                      │   │
      │   └─── [HOÀN TẤT TRƯỜNG HỢP 2: DỮ LIỆU ĐÃ LƯU TRỮ VÀ PHẢN HỒI HTTP 200 OK] ──────────────────────────────────────────────────────┘   │
      │                       │                          │                            │                           │                          │
 18   ├─ Nhận kết quả ◄───────┤                          │                            │                           │                          │
      │  (Xem ảnh/BBox &      │                          │                            │                           │                          │
      │   Pinch-to-zoom 4x)   │                          │                            │                           │                          │
      ▼                       ▼                          ▼                            ▼                           ▼                          ▼
```

#### B. Sơ đồ Khối Điều kiện Rẽ nhánh (Routing Decision Flowchart):

```
                                ┌──────────────────────────────────────────────┐
                                │          BẮT ĐẦU YÊU CẦU CHẤM ĐIỂM           │
                                │          (Client Submit Grading Req)         │
                                └──────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │ ĐIỀU KIỆN 1: Có bài mẫu Ground Truth từ SGK? │
                                └───────┬──────────────────────────────┬───────┘
                                        │                              │
                               [CÓ: Đã có bài mẫu]            [KHÔNG: Chưa có bài mẫu]
                                        │                              │
                                        ▼                              ▼
  ┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
  │      CHẾ ĐỘ LOCAL EDGE LAN ZERO-TOKEN  │ │ ĐIỀU KIỆN 2: Định dạng dữ liệu nộp bài?│
  │ • Chạy trạm biên Pi 4 LAN: 0đ Cloud Fee│ └───────┬────────────────────────┬───────┘
  │ • So khớp chuỗi LCS Diff Opcodes (1:1) │         │                        │
  │ • Phân tích âm tiết Levenshtein 6 nhóm │  [ẢNH CHỤP BÀI THI]     [VĂN BẢN NHẬP TAY]
  │ • Áp barem điểm Thông tư 27 (7đ - 3đ)  │         │                        │
  │ • Tiêu thụ 0 token Cloud, Zero-Halluc  │         │                        │
  └──────────────────┬─────────────────────┘         ▼                        │
                     │                     ┌────────────────────┐             │
                     │                     │  XỬ LÝ SONG SONG   │             │
                     │                     │ 1. Gemini Cloud OCR│             │
                     │                     │ 2. YOLOv8 Edge BBox│             │
                     │                     └─────────┬──────────┘             │
                     │                               │                        │
                     │                               ▼                        │
                     │                     ┌────────────────────┐             │
                     │                     │ Ánh xạ Bounding Box│             │
                     │                     │ theo Universal     │             │
                     │                     │ Reading Order      │             │
                     │                     └─────────┬──────────┘             │
                     │                               │                        │
                     │                               ▼                        │
                     │                     ┌──────────────────────────────────┴───────┐
                     │                     │ ĐIỀU KIỆN 3: Lõi ViT5 cục bộ sẵn sàng?   │
                     │                     └───────┬──────────────────────────┬───────┘
                     │                             │                          │
                     │                    [CÓ: ViT5 Online]          [KHÔNG: Timeout / Lỗi]
                     │                             │                          │
                     │                             ▼                          ▼
                     │              ┌──────────────────────────┐ ┌──────────────────────────┐
                     │              │ ĐỘNG CƠ CỤC BỘ BIÊN      │ │ DỰ PHÒNG NÓNG (FALLBACK) │
                     │              │ • ViT5 INT8 CPU sửa lỗi  │ │ • Gemini Text Prompt     │
                     │              │ • Qwen 2.5 sinh 3 lời    │ │ • Barem BGD&ĐT TT27      │
                     │              │   nhận xét Thông tư 27   │ │ • Ghi nhận tokenCount    │
                     │              └──────────────┬───────────┘ └────────────┬─────────────┘
                     │                             │                          │
                     │                             └────────────┬─────────────┘
                     │                                          │
                     └──────────────────────┬───────────────────┘
                                            │
                                            ▼
                                ┌──────────────────────────────────────────────┐
                                │      TỰ ĐỘNG LƯU TRỮ DỮ LIỆU & BẢN GHI       │
                                │ • Bóc tách Base64 ghi đĩa /uploads/grades/*.jpg│
                                │ • Ghi bản ghi Grade vào SQLite vihand.db     │
                                └──────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │       KẾT THÚC: TRẢ VỀ PHẢN HỒI THÀNH CÔNG   │
                                │         GradeApiResponse (HTTP 200 OK)       │
                                └──────────────────────────────────────────────┘
```

---

### 3.3. Sơ đồ Quy trình Nghiệp vụ 1: Luồng Chấm điểm OCR Chữ viết tay Tự động

```
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐
│ Giáo viên │ │Android App│ │  CameraX  │ │Gateway :3000│ │YOLOv8 :8000 │ │Gemini Cloud │ │Grading Core │ │SQLite/Đĩa │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬─────┘
      │             │             │              │               │               │               │              │
      │ ════ GIAI ĐOẠN 1: THU NHẬN ẢNH BÀI THI & CHUẨN HÓA DỮ LIỆU (IMAGE CAPTURE & PREPROCESSING) ═══════════════ │
  1   ├─ Chụp ảnh ─►│             │              │               │               │               │              │
      │  bài thi    │             │              │               │               │               │              │
  2   │             ├─ Chụp ảnh ─►│              │               │               │               │              │
      │             │  (MIN_LAT)  │              │               │               │               │              │
  3   │             │◄─ ImageProxy┤              │               │               │               │              │
      │             │   (Flash,   │              │               │               │               │              │
      │             │    EXIF)    │              │               │               │               │              │
  4   │             ├─ Nén Base64, tạo DTO ────┐ │               │               │               │              │
      │             │◄─────────────────────────┘ │               │               │               │              │
      │             │                            │               │               │               │              │
      │ ════ GIAI ĐOẠN 2: GATEWAY TIẾP NHẬN & KÍCH HOẠT XỬ LÝ SONG SONG (PROMISE.ALL PARALLEL OCR) ═══════════════ │
  5   │             ├─ POST /api/mobile/grade ──►│               │               │               │              │
      │             │  (imageBase64, DTO)        │               │               │               │              │
  6   │             │                            ├─ RateLimit ─┐ │               │               │              │
      │             │                            │  (<=20/min) │ │               │               │              │
      │             │                            │◄────────────┘ │               │               │              │
      │             │                            │               │               │               │              │
      │             │                            │── PARALLEL PROCESSING (Promise.all) ────────┐ │              │
  7   │             │                            ├─ POST /detect-words ─────────►│             │ │              │
      │             │                            │  (imgsz=640, conf=0.50)       │             │ │              │
  8   │             │                            ├─ Prompt 5 bước (Vision OCR) ─────────────────►│              │
  9   │             │                            │◄─ Trả về relative BBoxes ─────┤             │ │              │
 10   │             │                            │◄─ Trả về original & fixed text ─────────────┤ │              │
      │             │                            └── HOÀN TẤT XỬ LÝ SONG SONG ─────────────────┘ │              │
      │             │                            │                                               │              │
      │ ════ GIAI ĐOẠN 3: SO KHỚP TỌA ĐỘ BBOX & TÍNH ĐIỂM THÔNG TƯ 27 (IN-PROCESS CORE GRADING) ══════════════════ │
 11   │             │                            ├─ In-process call: handleGradePost ───────────►│              │
 12   │             │                            │                                               ├─ LCS Diff ──┐│
      │             │                            │                                               │  Syllable   ││
      │             │                            │                                               │◄────────────┘│
 13   │             │                            │                                               ├─ Ghép BBox ─┐│
      │             │                            │                                               │  Universal  ││
      │             │                            │                                               │◄────────────┘│
 14   │             │                            │                                               ├─ Điểm TT27 ─┐│
      │             │                            │                                               │  & Lời phê  ││
      │             │                            │                                               │◄────────────┘│
 15   │             │                            │◄─ Trả về kết quả chấm điểm hoàn chỉnh ────────┤              │
      │             │                            │                                                              │
      │ ════ GIAI ĐOẠN 4: LƯU TRỮ CHỐNG PHÌNH TO, PHẢN HỒI & LOCKSTEP CO-TRANSFORMATION ══════════════════════════ │
 16   │             │                            ├─ Ghi file ảnh vật lý đĩa (/public/uploads/grades/xyz.jpg) ──►│
 17   │             │                            ├─ Ghi bản ghi vào Prisma vihand.db (WAL Mode) ───────────────►│
 18   │             │◄─ GradeApiResponse (200) ──┤                                                              │
      │             │   (score, criteria, BBoxes)│                                                              │
 19   │             ├─ Lưu bản ghi cục bộ ─────┐ │                                                              │
      │             │  (Room DB v4)            │ │                                                              │
      │             │◄─────────────────────────┘ │                                                              │
 20   ├─ Xem kết quả ◄┤                          │                                                              │
      │  trực quan  │                            │                                                              │
 21   ├─ Pinch 1x-4x ─►                          │                                                              │
      │  soi nét mực│ (Lockstep Co-Transformation)                                                              │
      ▼             ▼                            ▼                                                              ▼
```

---

### 3.4. Sơ đồ Quy trình Nghiệp vụ 2: Luồng Luyện viết Chính tả Sư phạm & Tổng hợp Giọng đọc Neural TTS

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TIẾP NHẬN & CHUẨN BỊ BÀI ĐỌC SGK (INPUT PREPARATION)                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Giáo viên truy cập Dictation Studio (Giao diện Web /teacher/dictation hoặc Android App)    │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                 │                                                │
│                                                 ▼                                                │
│                                      /─────────────────────\                                     │
│                                     <  Lựa chọn Nguồn Bài?  >                                    │
│                                      \─────────────────────/                                     │
│                                         │               │                                        │
│                        Bài chuẩn từ SGK │               │ Sáng tác bài mới theo chủ đề           │
│                                         ▼               ▼                                        │
│  ┌──────────────────────────────────────────┐ ┌───────────────────────────────────────────────┐ │
│  │ Kho Ngữ liệu SGK GDPT 2018               │ │ Sáng tác tự động bằng AI                      │ │
│  │ • 50+ bài trích Lớp 1 - Lớp 5            │ │ • POST /api/dictation/generate                │ │
│  │ • Bộ sách: Kết nối tri thức, Cánh diều   │ │ • Qwen 2.5-0.5B-Instruct SLM                  │ │
│  └──────────────────────┬───────────────────┘ └───────────────────────┬───────────────────────┘ │
│                         │                                             │                         │
│                         └───────────────────────┬─────────────────────┘                         │
│                                                 ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Trích xuất Đoạn văn Văn bản Chuẩn (Ground Truth) & Danh mục Từ Khó Cần Rèn Luyện          │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. PHÂN TÁCH NGỮ PHÁP SƯ PHẠM (PEDAGOGICAL CLAUSE SPLITTING)                                     │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Thuật toán splitIntoPedagogicalClauses: Tách đoạn văn thành từng cụm từ ngắn (3 - 5 từ)    │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Cấu hình Nhịp đọc Sư phạm Chuẩn mực:                                                       │  │
│  │ • Giọng đọc: Cô Hoài My (Nữ - Bắc Bộ) hoặc Thầy Nam Minh (Nam - Bắc Bộ)                    │  │
│  │ • Tốc độ đọc: rate = "-15%" (Chậm rãi, tròn vành rõ chữ, phù hợp học sinh tiểu học)        │  │
│  │ • Chu kỳ phát: Lặp lại 2 lần/cụm • Khoảng nghỉ học sinh viết bài: 10 giây giữa các lượt    │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. ĐIỀU KHIỂN LUỒNG PHÁT ÂM THANH NEURAL TTS (ADAPTIVE TTS PLAYBACK LOOP)                        │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Bắt đầu Chu trình Đọc Tự động: Gửi yêu cầu GET /api/dictation/tts?text=...&rate=-15%       │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                 │                                                │
│                                                 ▼                                                │
│                                      /─────────────────────\                                     │
│                                     <  Kiểm tra Kết nối     >                                    │
│                                     <  Mạng Thiết bị?       >                                    │
│                                      \─────────────────────/                                     │
│                                         │        │        │                                      │
│                             Kết nối tốt │        │ Mạng   │ Ngoại tuyến                          │
│                                         ▼        │ chập   │ hoàn toàn                            │
│  ┌──────────────────────────────────────────┐    │ chờn   │                                      │
│  │ KÊNH CHÍNH: Microsoft Edge-TTS Stream    │    ▼        ▼                                      │
│  │ • audio/mpeg truyền trực tiếp            │ ┌────────┐ ┌────────────────────────────────────┐  │
│  │ • Giọng đọc truyền cảm, độ trễ < 1.0s    │ │Fallback│ │ Fallback 2: Android Native TTS     │  │
│  └──────────────────────┬───────────────────┘ │1:Google│ │ • Engine TextToSpeech trên máy     │  │
│                         │                     │Translat│ │ • Locale("vi", "VN") offline 100%    │  │
│                         │                     └────┬───┘ └─────────────────┬──────────────────┘  │
│                         └──────────────────────────┼───────────────────────┘                     │
│                                                    ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ LƯỢT 1: Phát âm thanh cụm từ lần 1 ra loa trợ giảng (Học sinh lắng nghe và bắt đầu viết)    │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ ĐẾM NGƯỢC NGHỈ 10 GIÂY: Thanh tiến trình hiển thị đếm ngược (Học sinh nắn nót viết vào vở) │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ LƯỢT 2: Phát âm thanh cụm từ lặp lại lần 2 (Học sinh kiểm tra lại từ ngữ và dấu thanh)    │  │
│  └──────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                 │                                                │
│                                                 ▼                                                │
│                                      /─────────────────────\                                     │
│                                     <  Còn cụm từ tiếp      >──── CÒN CỤM TỪ (Tiếp tục chu kỳ)   │
│                                     <  theo trong bài?      >───┐                                │
│                                      \─────────────────────/    │                                │
│                                                 │ HẾT CÂU       │                                │
│                                                 ▼               │                                │
│  ┌───────────────────────────────────────────────────────────┐  │                                │
│  │ LƯỢT SOÁT LỖI CUỐI: Đọc toàn bài 1 lần với nhịp vừa phải  │  │                                │
│  │ để cả lớp rà soát lại toàn bộ bài viết trước khi nộp      │  │                                │
│  └──────────────────────────────────────────────┬────────────┘  │                                │
│                                                 │               │                                │
└─────────────────────────────────────────────────┼───────────────┼────────────────────────────────┘
                                                  │               │ (Vòng lặp quay lại cụm kế tiếp)
                                                  ▼               └────────────────────────────────►
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. KẾT NỐI SANG MODULE CHẤM ĐIỂM (SEAMLESS GRADING HANDOFF)                                       │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Lưu phiên đọc vào CSDL DictationSession (Tiêu đề, Lớp, Giáo viên, Nhật ký DictationLog)     │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Giáo viên bấm "Chuyển sang Chấm bài" -> Toàn bộ văn bản bài đọc tự động gán Ground Truth   │  │
│  ├────────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │ SẴN SÀNG CHẤM ĐIỂM ZERO-TOKEN: Đối soát 1-1 LCS Diff Opcodes, không tốn token Cloud LLM     │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.5. Sơ đồ Quy trình Nghiệp vụ 3: Luồng Đồng bộ Sổ điểm & Sổ tay Từ khó Cá nhân hóa Hai chiều

```
┌──────────┐          ┌─────────────┐          ┌─────────────┐          ┌────────────┐          ┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│ Học sinh │          │Giao diện App│          │  GradeRepo  │          │ Room DB v4 │          │ Next.js BFF │          │SQLite Server │          │ Android TTS │
└────┬─────┘          └──────┬──────┘          └──────┬──────┘          └─────┬──────┘          └──────┬──────┘          └──────┬───────┘          └──────┬──────┘
     │                       │                        │                       │                        │                        │                         │
     │ ════ GIAI ĐOẠN 1: ĐỒNG BỘ HAI CHIỀU DỮ LIỆU SỔ ĐIỂM (TWO-WAY SYNC LIFECYCLE) ════════════════════════════════════════════════════════════════════════════ │
 1   ├─ Mở App / Bấm ───────►│                        │                       │                        │                        │                         │
     │  "Đồng bộ sổ điểm"    │                        │                       │                        │                        │                         │
 2   │                       ├─ syncTwoWayWithServer►│                       │                        │                        │                         │
     │                       │                        │                       │                        │                        │                         │
     │   ┌── CHIỀU 1: UPLOAD CÁC BÀI CHẤM NGOẠI TUYẾN TỪ THIẾT BỊ LÊN MÁY CHỦ (Mobile -> Web) ────────────────────────────────────────────────────────┐  │         │
 3   │   │                   │                        ├─ Lọc bài offline ────►│                        │                        │             │  │         │
     │   │                   │                        │  (serverId == null)   │                        │                        │             │  │         │
 4   │   │                   │                        │◄─ Danh sách bài thi ──┤                        │                        │             │  │         │
     │   │                   │                        │   chưa đồng bộ        │                        │                        │             │  │         │
     │   │   ┌── VÒNG LẶP CHO TỪNG BÀI THI NGOẠI TUYẾN ───────────────────────────────────────────────────────────────────────────┐ │  │         │
 5   │   │   ├─ POST /api/grades (ServerGradeSyncRequest) ────────────────────────────────────────────►│                        │ │ │  │         │
 6   │   │   │                                        │                       │                        ├─ Ghi DB & sinh CUID ──►│ │ │  │         │
 7   │   │   │                                        │                       │                        │◄─ newServerId (CUID) ──┤ │ │  │         │
 8   │   │   │◄─ Phản hồi thành công { success: true, id: cuid } ──────────────────────────────────────┤                        │ │ │  │         │
 9   │   │   ├─ Cập nhật serverId = cuid ────────────────────────────────────►│                        │                        │ │ │  │         │
     │   │   └── KẾT THÚC VÒNG LẶP ────────────────────────────────────────────────────────────────────────────────────────────┘ │ │  │         │
     │   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │         │
     │                       │                        │                       │                        │                        │       │         │
     │   ┌── CHIỀU 2: DOWNLOAD CÁC BÀI MỚI TỪ MÁY CHỦ VỀ THIẾT BỊ (Web -> Mobile) ─────────────────────────────────────────────────────┐ │         │
10   │   │                   │                        ├─ GET /api/grades?class=Lớp 3A ────────────────►│                        │ │ │         │
11   │   │                   │                        │                       │                        ├─ Truy vấn điểm cả lớp ─►│ │ │         │
12   │   │                   │                        │                       │                        │◄─ Danh sách bài thi ───┤ │ │         │
13   │   │                   │                        │◄─ Phản hồi ServerGradesResponse ───────────────┤                        │ │ │         │
14   │   │                   │                        ├─ Đối soát khóa duy nhất (studentName_title) ──►│                        │ │ │         │
15   │   │                   │                        ├─ Chèn bản ghi mới tải vào Room DB ────────────►│                        │ │ │         │
     │   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │         │
     │                                                │                       │                        │                        │       │         │
     │   ┌── CHIỀU 3: LỆNH XÓA TRỰC TIẾP ĐỒNG BỘ TRÊN MÁY CHỦ (Direct Server Delete: Mobile -> Server) ───────────────────────────────┐ │         │
16   │   │                   │                        ├─ Xóa trực tiếp bản ghi khỏi Room DB ──────────►│                        │ │ │         │
17   │   │                   │                        │  (trích xuất serverId tương ứng)               │                        │ │ │         │
     │   │   ┌── LỆNH XÓA TRÊN MÁY CHỦ ĐỂ TRIỆT TIÊU DỮ LIỆU MA (GHOST RECORDS) ────────────────────────────────────────────────┐ │ │ │         │
18   │   │   ├─ DELETE /api/grades/{serverId} ────────────────────────────────────────────────────────►│                        │ │ │ │         │
19   │   │   │                                        │                       │                        ├─ Xóa file ảnh đĩa (.jpg)►│ │ │         │
20   │   │   │                                        │                       │                        ├─ Xóa bản ghi SQLite ───►│ │ │ │         │
21   │   │   │◄─ Phản hồi xác nhận { success: true } ──────────────────────────────────────────────────┤                        │ │ │ │         │
22   │   │   ├─ Hoàn tất đồng bộ xóa cả 2 phía ──────────────────────────────►│                        │                        │ │ │ │         │
     │   │   └── KẾT THÚC THAO TÁC XÓA ─────────────────────────────────────────────────────────────────────────────────────────┘ │ │ │         │
     │   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │         │
     │                       │                        │                       │                        │                        │       │         │
23   │                       │◄─ Báo cáo đồng bộ ─────┤ Triple(UploadOk, UploadErr, NewDownloaded)     │                        │       │         │
     │                       │                        │                       │                        │                        │       │         │
     │ ════ GIAI ĐOẠN 2: ĐỘNG HÓA SỔ TAY TỪ KHÓ CÁ NHÂN HÓA & PHÁT ÂM MẪU SƯ PHẠM ═══════════════════════════════════════════════════════════════════ │         │
17   │                       ├─ Truy vấn các bài thi gần nhất của học sinh ──►│                        │                        │       │         │
18   │                       │◄─ Danh sách GradeRecordEntity (kèm errorsJson)─┤                        │                        │       │         │
19   │                       ├─ Thuật toán extractDifficultWords(records) ──┐ │                        │                        │       │         │
     │                       │  • Có bài sai: Bóc tách cặp (từ gốc -> giải thích)                      │                        │       │         │
     │                       │  • Khử trùng lặp từ không phân biệt hoa thường │                        │                        │       │         │
     │                       │  • Đạt điểm 10/Bài mới: Nạp 5 từ SGK mặc định│ │                        │                        │       │         │
     │                       │◄─────────────────────────────────────────────┘ │                        │                        │       │         │
20   ├─ Hiển thị sổ tay ────►│                                                │                        │                        │       │         │
     │  từ khó (hp001)       │                                                │                        │                        │       │         │
21   ├─ Chạm thẻ từ khó ────►│                                                │                        │                        │       │         │
     │  (vd: "trổ hoa")      │                                                │                        │                        │       │         │
22   │                       ├─ speak("trổ hoa", QUEUE_FLUSH, Locale("vi", "VN")) ─────────────────────────────────────────────────────►│         │
23   │                       │                                                │                        │                        │       ├─ Âm thanh mẫu ─►
     │                       │                                                │                        │                        │       │  chuẩn sư phạm │
     ▼                       ▼                                                ▼                        ▼                        ▼       ▼  (HS lắng nghe)▼
```

---

# PHẦN IV: ĐẶC TẢ CÁC THUỘC TÍNH CHẤT LƯỢNG HỆ THỐNG (QUALITY ATTRIBUTES & NFRs)

### 4.1. An toàn Thông tin & Quyền Riêng tư Dữ liệu Trẻ em (Nghị định 13/2023/NĐ-CP)

#### 1. Kiểm soát Phân quyền Truy cập (Role-Based Access Control - RBAC)
Hệ thống thiết lập ma trận phân quyền 3 cấp độ được thực thi đa tầng (Client Layout Guards + Server API Route Guards):
- **Quản trị viên (`admin`):** Toàn quyền cấu hình tham số trường, quản lý danh sách giáo viên/học sinh, giám sát phần cứng máy chủ, và thực thi chính sách bảo vệ dữ liệu trẻ em. Đăng ký tài khoản Admin bắt buộc phải có `ADMIN_SECRET_KEY` được định cấu hình bí mật trong biến môi trường máy chủ.
- **Giáo viên (`teacher`):** Quản lý học sinh các lớp phụ trách, tổ chức phiên đọc chính tả, chấm điểm bài thi, điều chỉnh barem điểm và nhận xét sư phạm (Human-in-the-loop), xuất sổ điểm lớp học.
- **Học sinh (`student`):** Quyền xem (Read-only) bảng điểm cá nhân, xem lại ảnh bài thi gốc có gắn hộp Bounding Box, và luyện phát âm từ khó trong sổ tay cá nhân. Tuyệt đối không thể xem điểm hoặc bài làm của học sinh khác trong lớp.

#### 2. Kiểm soát Tần suất Truy cập (In-Memory Sliding Window Rate Limiting)
- Bảo vệ các tài nguyên tính toán AI đắt đỏ trước nguy cơ bị cạn kiệt Quota API hoặc tấn công từ chối dịch vụ (DoS).
- Triển khai thuật toán cửa sổ trượt (Sliding Window) với chu kỳ dọn dẹp bộ nhớ mỗi 60 giây, đảm bảo máy chủ không bị rò rỉ RAM (Memory Leak) ngay cả khi vận hành liên tục nhiều tháng.
- Nhận diện chính xác địa chỉ IP người dùng thực tế qua `CF-Connecting-IP` (Cloudflare Tunnel), `X-Forwarded-For`, và `X-Real-IP`.
- **Khắc phục điểm nghẽn NAT Lớp học (Classroom NAT Burst Mode):** Khi 35–45 học sinh cùng kết nối qua mạng Wi-Fi trường học mang chung 1 địa chỉ IP NAT, hệ thống kết hợp nhận diện mã phiên lớp học (`X-Classroom-Session`) cho phép nới rộng hạn ngạch burst lên đến **60 req/phút**, tránh tình trạng chặn nhầm mã 429 đối với các bài thi nộp sau.
- **Xác thực Phiên API Di động:** Yêu cầu mã token phiên hợp lệ trên các endpoint nhạy cảm (`/api/mobile/grade`, `/api/grades`), bảo đảm chỉ có giáo viên và học sinh đã xác thực trong trường mới có quyền gửi bài chấm.
- Hạn mức tiêu chuẩn: 20 req/phút cho Mobile BFF Gateway (burst 60 req/phút theo phiên lớp), 30 req/phút cho Web Grading & OCR, 60 req/phút cho YOLO Word Detector.

#### 3. Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân Trẻ em
Trong môi trường giáo dục tiểu học, nét chữ viết tay và bài làm của trẻ em là dữ liệu nhạy cảm. Hệ thống triển khai vòng đời lưu trữ dữ liệu (Data Retention Lifecycle) chuyên biệt tại `app/api/admin/retention/route.ts`:
- **Gắn hạn lưu trữ mặc định:** Mỗi bài thi khi được lưu vào cơ sở dữ liệu sẽ tự động được gán mốc thời gian hết hạn `expiresAt = createdAt + 365 ngày` (tương ứng với một niên khóa học tập).
- **Cơ chế Ẩn danh hóa (Soft Purge):** Khi hết hạn lưu trữ hoặc khi Quản trị viên kích hoạt dọn dẹp định kỳ:
  1. Tệp ảnh bài làm chứa nét chữ viết tay của trẻ trên đĩa máy chủ (`public/uploads/grades/...`) bị xóa hoàn toàn khỏi hệ thống bằng `fs.promises.unlink`.
  2. Trường `imageBase64` và `imagePath` bị đặt về chuỗi rỗng.
  3. Họ tên học sinh được thay thế bằng danh xưng ẩn danh: `"Học sinh ẩn danh [Niên khóa YYYY-YYYY]"`.
  4. Cờ `isAnonymized` chuyển thành `true` và lưu lại thời điểm `anonymizedAt`.
  5. **Bảo tồn giá trị nghiên cứu:** Các chỉ số điểm tổng, barem thành phần, và thống kê các dạng lỗi ngữ âm (âm đầu, vần, thanh điệu) được giữ lại nguyên vẹn để phục vụ nghiên cứu giáo dục và phân tích phổ điểm dài hạn của nhà trường.
- **Cơ chế Xóa triệt để (Hard Delete):** Cho phép phụ huynh hoặc quản trị viên yêu cầu xóa vĩnh viễn cả dòng dữ liệu và tệp ảnh bài thi khỏi hệ thống khi học sinh chuyển trường.

---

### 4.2. Tính Sẵn sàng Cao & Khả năng Chịu lỗi (High Availability & Multi-Tier Resilience)

Để đảm bảo các tiết học trên lớp của giáo viên không bao giờ bị gián đoạn do sự cố mạng hay nghẽn dịch vụ đám mây, hệ thống thiết kế ma trận dự phòng 3 cấp độ (Multi-Tier Fallback Matrix) cho từng phân hệ:

| Phân hệ chức năng | Cấp 1: Ưu tiên Cao nhất (Primary) | Cấp 2: Dự phòng Tầng 1 (Fallback 1) | Cấp 3: Dự phòng Thảm họa (Fallback 2) |
| :--- | :--- | :--- | :--- |
| **Nhận diện OCR Chữ viết tay** | Gemini 3.1 Flash Lite Vision (API Key 1) | Tự động xoay vòng danh sách Keys (Keys 2, 3, 4) khi gặp HTTP 429 | Gemini 2.5 Flash Vision (khi model Flash Lite gặp sự cố dịch vụ) |
| **Sửa lỗi Chính tả & Barem điểm** | Đối soát 1-1 với Ground Truth (Zero-Token LCS Diff, 0đ chi phí) | Động cơ ViT5 INT8 Cục bộ trên trạm biên (:8000) với timeout 120s | Gemini Text-only Grading Prompt (khi trạm biên ViT5 offline hoàn toàn) |
| **Phát hiện Bounding Box** | YOLOv8 Local Engine tại chỗ (:8000/detect-words, imgsz=640) | Gọi trạm biên dự phòng trong mạng LAN (http://192.168.1.56:8000) | Ước lượng hộp chữ từ luồng văn bản OCR (Không làm crash luồng chấm) |
| **Phát âm Âm thanh Sư phạm** | Microsoft Edge-TTS Stream (:8000) giọng Cô Hoài My / Thầy Nam Minh | Google Translate TTS Direct (HTTP GET qua Next.js BFF) | Android Native TextToSpeech cục bộ trên điện thoại (Offline 100%) |
| **Lời nhận xét Sư phạm** | Mô hình Qwen 2.5-0.5B-Instruct SLM cục bộ (Sinh 3 nhận xét động) | Ngân hàng mẫu 40+ câu chuẩn Bộ GD&ĐT (`DIVERSE_PEDAGOGICAL_TEMPLATES`) | Mẫu nhận xét sư phạm cơ bản theo thang điểm Thông tư 27 |
| **Kho bài đọc Chính tả** | Mô hình Qwen 2.5 SLM sáng tác bài đọc mới theo chủ đề và khối lớp | Ngân hàng 50+ bài trích SGK GDPT 2018 lưu trong bảng `TextbookPassage` | Ngân hàng văn bản mẫu cố định tích hợp sẵn trong mã nguồn client |

#### Kiến Trúc Đường Hầm Zero-Trust Cloudflare Tunnel
- Kết nối trạm biên Raspberry Pi 4 đặt tại trường học ra Internet thông qua dịch vụ Cloudflare Named Tunnel (`vihandgrade.click`).
- Thiết lập đường hầm mã hóa hai chiều Outbound TLS: Máy chủ trường học không cần mở bất kỳ cổng nào trên Router (No Port Forwarding), không sợ bị quét cổng (Port Scanning), tự động vượt qua mọi lớp mạng NAT/CGNAT phức tạp của các nhà mạng viễn thông.
- Khi đường truyền Internet bị đứt đoạn, giáo viên và học sinh trong trường vẫn truy cập và chấm bài bình thường thông qua địa chỉ IP mạng nội bộ trường (`http://192.168.1.56:3000`).

---

### 4.3. Hiệu năng, Độ trễ & Ngân sách Bộ nhớ (Latency Budgets & Memory Budgets)

#### 1. Ngân Sách Độ Trễ Toàn Luồng (Latency Budgets)
Dữ liệu đo đạc thực nghiệm từ kịch bản kiểm thử NCKH trên 1.000 mẫu bài thi học sinh:

| Giai đoạn trong Pipeline | Thiết bị thực thi | Độ trễ mục tiêu | Độ trễ thực tế đo đạc | Ghi chú kỹ thuật |
| :--- | :--- | :---: | :---: | :--- |
| **1. Tiền xử lý ảnh (Preprocess)** | CPU Node.js / Jimp | $< 200\text{ ms}$ | $85 – 140\text{ ms}$ | Deskew góc nghiêng $\le 15^\circ$, cân bằng trắng, CLAHE tăng tương phản. |
| **2. Quét Bounding Box từ viết tay** | Raspberry Pi 4 (CPU ARM) | $< 100\text{ ms}$ | $45 – 65\text{ ms}$ | YOLOv8 nano, `imgsz = 640`, gom dòng Vertical Overlap. |
| | Jetson Nano (GPU Maxwell) | $< 30\text{ ms}$ | $16 – 22\text{ ms}$ | Đạt tốc độ $45 – 60\text{ FPS}$ trên nhân CUDA. |
| **3. Nhận diện Vision OCR** | Google Cloud (Flash Lite) | $< 4.000\text{ ms}$ | $2.300 – 3.200\text{ ms}$ | Chuyển Base64 qua HTTPS, giải mã chữ viết tay và trả về JSON. |
| **4. Sửa lỗi chính tả ViT5 (10-25 từ)** | Raspberry Pi 4 (CPU INT8) | $< 1.500\text{ ms}$ | $850 – 1.150\text{ ms}$ | Seq2Seq Transformer INT8, lọc teencode, phân tích âm tiết. |
| **5. Sửa lỗi chính tả ViT5 (50-100 từ)**| Raspberry Pi 4 (CPU INT8) | $< 3.000\text{ ms}$ | $1.680 – 2.450\text{ ms}$ | Đoạn văn dài Lớp 4-5, chia nhỏ chunk $\le 160$ ký tự. |
| **6. Sinh nhận xét SLM Qwen 2.5** | Raspberry Pi 4 (CPU bfloat16)| $< 1.500\text{ ms}$ | $600 – 1.100\text{ ms}$ | Sinh 3 phương án nhận xét ngắn khích lệ Thông tư 27. |
| **7. Khởi tạo Stream Audio Edge-TTS**| Python Microservice | $< 1.000\text{ ms}$ | $350 – 750\text{ ms}$ | Khởi tạo kết nối WebSocket và stream dữ liệu byte MP3 đầu tiên. |
| **TỔNG LUỒNG CHẤM BÀI ĐẦY ĐỦ** | **Hybrid Pipeline** | **$< 6.000\text{ ms}$** | **$3.500 – 5.200\text{ ms}$** | **Hoàn thành toàn bộ quy trình chấm điểm trong khoảng 4 giây!** |

#### 2. Ngân Sách Phân Bổ Bộ Nhớ RAM Trên Trạm Biên 4GB (Memory Budgets)
Thiết lập định mức trần (Cgroups Resource Quota) trên Raspberry Pi 4 Model B (Tổng RAM vật lý = 3.906 MB):

```
┌────────────────────────────────────────────────────────────────────────┐
│ TỔNG BỘ NHỚ RAM VẬT LÝ: 4.096 MB + TỆP HOÁN ĐỔI SWAP: 3.072 MB         │
├────────────────────────┬─────────────┬─────────────┬───────────────────┤
│ Tiến trình / Dịch vụ   │ RAM Thực tế │ Định mức    │ Vai trò chức năng │
│                        │ chiếm dụng  │ CGroup Max  │                   │
├────────────────────────┼─────────────┼─────────────┼───────────────────┤
│ Hệ điều hành Linux OS  │ ~ 350 MB    │ 400 MB      │ Nhân Linux 6.x,   │
│ & Tiến trình Nền       │             │             │ SSH, UFW, Network │
├────────────────────────┼─────────────┼─────────────┼───────────────────┤
│ Dịch vụ Python AI Core │ ~ 1.350 MB  │ 2.200 MB    │ FastAPI, ViT5 INT8│
│ (vihand-python)        │             │ (MemoryMax) │ (~510MB), YOLOv8  │
│                        │             │             │ (~80MB), Qwen SLM │
│                        │             │             │ (~577MB), PyTorch │
├────────────────────────┼─────────────┼─────────────┼───────────────────┤
│ Dịch vụ Web BFF        │ ~ 850 MB    │ 1.400 MB    │ Next.js 16 App    │
│ (vihand-web)           │             │ (MemoryMax) │ Router, Node.js,  │
│                        │             │             │ Prisma SQLite WAL │
├────────────────────────┼─────────────┼─────────────┼───────────────────┤
│ Đường hầm Cloudflare   │ ~ 45 MB     │ 96 MB       │ Daemon cloudflared│
│ (cloudflared)          │             │             │ TLS outbound      │
├────────────────────────┼─────────────┼─────────────┼───────────────────┤
│ TỔNG TRẦN MEMORYMAX    │ ~ 2.595 MB  │ 4.096 MB    │ 100% trong RAM    │
│ (Swap 3GB dự phòng)    │             │ (Không trượt)│ chống OOM thẻ nhớ │
└────────────────────────┴─────────────┴─────────────┴───────────────────┘
```

---

# PHẦN V: MA TRẬN TRUY XUẤT NGUỒN VÀ TIÊU CHÍ NGHIỆM THU (CODE TRACEABILITY & VERIFICATION CRITERIA)

### 5.1. Ma Trận Truy Xuất Nguồn Mã Thực Tế (Code Traceability Matrix)

Toàn bộ các luận cứ kiến trúc trong bản đặc tả này được đối soát trực tiếp từ mã nguồn thực tế của dự án ViHand Grade:

| Hạng mục kiến trúc | Đường dẫn tệp mã nguồn thực tế | Dòng mã then chốt | Bằng chứng thực tế trong mã nguồn |
| :--- | :--- | :--- | :--- |
| **Android Build & SDK 36** | `android_app/app/build.gradle.kts` | Dòng 14, 18, 19 | `compileSdk = 36`, `minSdk = 24`, `targetSdk = 36` |
| **Compose Co-Transformation**| `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt` | Dòng 145-150, 422-443 | `graphicsLayer { scaleX, scaleY, translationX, translationY }`, `detectTransformGestures` |
| **Room DB Schema v4** | `android_app/app/src/main/java/com/example/data/local/AppDatabase.kt` | Dòng 12-16 | `@Database(version = 4)`, `GradeRecordEntity`, `ClassEntity`, `StudentEntity` |
| **Sổ tay Từ khó Động** | `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt` | Dòng 70-90, 384 | `extractDifficultWords`, `DEFAULT_SGK_DIFFICULT_WORDS`, `tts?.speak()` |
| **Tìm kiếm Không dấu NFD** | `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt` | Dòng 61-65, 179-206 | `removeVietnameseDiacritics`, `Normalizer.Form.NFD`, `filter_chip` |
| **BFF Mobile Route** | `app/api/mobile/grade/route.ts` | Dòng 347-524 | `guardAiRoute(req, 20)`, `Promise.all([runGeminiOCR, detectYoloBoxes])`, `handleGradePost` |
| **Lõi Chấm điểm 3 Tầng** | `app/api/grade/route.ts` | Dòng 576-616, 1063-1215 | `gradeWithLevenshtein`, `tokenCount: 0`, ViT5 Call, Gemini Fallback |
| **Prisma WAL & Timeout** | `lib/prisma.ts` | Dòng 7-22 | `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 10000;`, `synchronous = NORMAL` |
| **Tách Ảnh Đĩa SQLite** | `app/api/grades/route.ts` | Dòng 10-29 | `saveImageToDisk`, `public/uploads/grades/...`, `imageBase64 = ""` |
| **Sliding Window Rate Limit**| `lib/api-guard.ts` | Dòng 13-105 | `Map<string, { timestamps: number[] }>`, `CLEANUP_INTERVAL = 60000`, HTTP 429 |
| **Bảo vệ Trẻ em NĐ 13** | `app/api/admin/retention/route.ts` | Dòng 66-187 | `expiresAt = +365 days`, `action: "anonymize"`, `fs.promises.unlink`, `isAnonymized` |
| **YOLO Vertical Overlap** | `python_service/yolo_detector.py` | Dòng 115-143, 241 | `overlap_ratio >= 0.40`, `sort_reading_order`, `imgsz = 640`, `best.pt` |
| **ViT5 Dynamic INT8** | `python_service/main.py` | Dòng 97-110, 406-438 | `torch.quantization.quantize_dynamic(dtype=torch.qint8)`, `_split_prose_to_chunks(160)` |
| **Qwen SLM Thông tư 27** | `python_service/main.py` | Dòng 921-987, 1050-1057 | `Qwen/Qwen2.5-0.5B-Instruct`, `bfloat16`, Cô giáo tiểu học dịu dàng prompt |
| **Edge-TTS Sư phạm** | `python_service/main.py` | Dòng 1713-1757 | `edge_tts.Communicate`, `vi-VN-HoaiMyNeural`, `rate = "-15%"` |
| **Kịch bản Swap 3GB RPi4** | `03_Scripts_Trien_khai/rpi4/00_init_system.sh` | Dòng 39-65 | `SWAP_SIZE = 3072`, `vm.swappiness = 20` |
| **Systemd Python CGroups** | `03_Scripts_Trien_khai/shared/vihand-python.service.template` | Dòng 28-30 | `MemoryHigh = 2000M`, `MemoryMax = 2500M`, `CPUQuota = 90%` |
| **Systemd Web CGroups**    | `03_Scripts_Trien_khai/shared/vihand-web.service.template` | Dòng 30-32 | `MemoryHigh = 1600M`, `MemoryMax = 2048M`, `CPUQuota = 85%` |
| **UFW Firewall Chặn 8000** | `03_Scripts_Trien_khai/rpi4/04_setup_network_firewall.sh` | Dòng 24-34 | `ufw default deny incoming`, `ufw allow 3000`, `ufw allow 22`, chặn 8000 |
| **Cloudflare Named Tunnel** | `03_Scripts_Trien_khai/rpi4/05_setup_cloudflare_tunnel.sh` | Dòng 69-85 | `hostname: vihandgrade.click`, `service: http://localhost:3000` |

---

### 5.2. Tiêu Chuẩn Kiểm Thử & Xác Thực Thực Nghiệm PStack (Lauren Tan Methodology)

Bộ tài liệu kiến trúc quy định triết lý kiểm thử thực nghiệm theo chuẩn PStack (*"Passing build is NOT verification. Drive the real app the way a user does and capture evidence"*):
1. **Bề mặt Android Native Client:**
   - Thực thi `.\gradlew.bat testDebugUnitTest` vượt qua 100% **23/23 Tests** (Robolectric SDK 36 Pixel 8, snapshot tests, stress tests biên điểm số $9.0, 8.0, 6.5$ và khử dấu tiếng Việt).
2. **Bề mặt Next.js BFF Gateway:**
   - Thực thi `npx tsc --noEmit` đạt 0 lỗi biên dịch kiểu dữ liệu trên toàn bộ 24 API routes và giao diện Web Studio.
   - Chạy `python .agents/skills/verify-vihand-grade/scripts/verify_bff.py` nạp ảnh bài thi học sinh thật (`02_Kich_ban_Thuc_nghiem/tien_xu_ly_anh/err_01/00_anh_goc.jpg`), kiểm tra toàn bộ bounding box $\in [0.0, 1.0]$, điểm số Thông tư 27 và lời nhận xét sư phạm.
3. **Bề mặt Python AI Core:**
   - Chạy `python .agents/skills/verify-vihand-grade/scripts/verify_ai.py` gửi câu sai chính tả kinh điển *"cô giáo bẩu em cố gắn học tập"*, thẩm định kết quả sửa đúng thành *"bảo"*, *"gắng"* và đo độ trễ đáp ứng $< 5.000\text{ms}$.
4. **Bề mặt Trạm Biên & Cloudflare Tunnel:**
   - Chạy `python .agents/skills/verify-vihand-grade/scripts/verify_edge.py` kiểm tra độ trễ RTT tới `https://vihandgrade.click/api/health`, mở kết nối SSH kiểm tra 3 tiến trình systemd `vihand-web`, `vihand-python`, `cloudflared` đang ở trạng thái `active (running)`.
