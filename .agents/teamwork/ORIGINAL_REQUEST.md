# Original User Request

## 2026-09-30T14:17:37Z

Thanh tra, đối soát và đánh giá mức độ đồng nhất toàn diện về kiến trúc, luồng nghiệp vụ (chấm điểm AI, OCR, quản lý học sinh/lớp học), giao diện UI/UX và hợp đồng API giữa Android Native App (`android_app/`) và Web App (`app/`) của hệ sinh thái ViHand Grade; đồng thời lập báo cáo phân tích khoảng cách (gap analysis) chi tiết và lộ trình phát triển (development roadmap) cho Android app.

Working directory: c:/Users/Jackie Duong/Desktop/Web_sua_loi
Integrity mode: demo

## Requirements

### R1. Đối soát Hợp đồng API & Cấu trúc Dữ liệu (API Contracts & Schema Parity)
So sánh chi tiết các endpoint mạng giữa Android Native App (`android_app/`) và Next.js Web BFF (`app/api/*`). Xác định các API payload bị lệch, thiếu trường dữ liệu, xử lý headers/authentication, lệch status codes và cơ chế fallback ngoại tuyến/online.

### R2. Đánh giá Tính năng & Luồng Nghiệp vụ (Feature & Business Logic Parity)
Đối chiếu chi tiết 3 luồng tính năng cốt lõi giữa hai nền tảng:
1. Luồng Chấm điểm bài thi tự động (YOLOv8 Bounding Box + Gemini/ViT5 OCR, lưu trữ kết quả và ảnh).
2. Luồng Quản lý học sinh, lớp học, thống kê phổ điểm và lịch sử bài thi.
3. Luồng Luyện viết chính tả (Dictation) và đồng bộ dữ liệu.

### R3. Đánh giá Tính Đồng nhất Giao diện & Trải nghiệm Người dùng (UI/UX Parity)
Đánh giá ngôn ngữ thiết kế, bảng màu, typography, trạng thái tải (skeleton/progress indicator), xử lý thông báo lỗi (empty state, toast, error dialogs) giữa giao diện Android (Jetpack Compose / XML) và Web App (Tailwind CSS v4 + Radix UI).

### R4. Lập Báo cáo Khoảng cách (Gap Analysis) & Lộ trình Phát triển (Roadmap)
Tổng hợp ma trận tính năng (Feature Parity Matrix) chi tiết, xếp hạng các tính năng Android còn thiếu hoặc cần tái cấu trúc theo mức độ ưu tiên (P0, P1, P2), đề xuất kiến trúc/thư viện chuẩn cho Android và xây dựng kế hoạch phát triển theo từng giai đoạn (Milestones/Sprints).

## Acceptance Criteria

### Ma trận Đối soát API & Dữ liệu
- [ ] Lập bảng đối chiếu chi tiết từng endpoint: Phương thức HTTP, URL path, Request Body, Response Schema giữa Android và Web BFF.
- [ ] Ghi rõ trạng thái cho từng endpoint: Đồng nhất hoàn toàn / Lệch Payload / Android chưa tích hợp / Endpoint mồ côi.
- [ ] Dẫn chứng đường dẫn file và số dòng code cụ thể ở cả hai phía (ví dụ: `android_app/...` và `app/api/...`).

### Ma trận Tính năng & UI/UX
- [ ] Bảng Feature Parity Matrix bao quát toàn bộ các màn hình chính (Dashboard, Chấm bài, Lịch sử, Học sinh, Cài đặt).
- [ ] Đánh giá cụ thể điểm tương đồng và khác biệt về trải nghiệm người dùng (UX flows).

### Lộ trình Phát triển Khả thi (Actionable Roadmap)
- [ ] Đề xuất lộ trình nâng cấp Android App thành 3 giai đoạn (Phase 1: Ổn định Core AI & API Sync, Phase 2: Hoàn thiện tính năng & Quản lý, Phase 3: Đồng bộ UX & Tối ưu).
- [ ] Mỗi hạng mục có tiêu chí nghiệm thu rõ ràng, độc lập và khả thi trong triển khai.


## 2026-10-03T19:00:25Z

Triển khai hoàn thiện các hạng mục còn lại của Phase 2 và Phase 3 cho ứng dụng Android Native (`android_app/`) thuộc hệ sinh thái ViHand Grade bao gồm: Thanh tìm kiếm & bộ lọc thể loại/điểm số trên `HistoryScreen.kt`, động hóa kho từ khó từ bài chấm thực tế trên `StudentHomeScreen.kt`, tích hợp cử chỉ Pinch-to-zoom 2 ngón tay và kéo ảnh trên `PhotoBoundingBoxViewer.kt`, đồng bộ mã màu Splash Window trong `colors.xml`, sau đó chạy toàn bộ kiểm thử tự động Android Unit Tests để xác nhận đạt chuẩn 100%.

Working directory: c:/Users/Jackie Duong/Desktop/Web_sua_loi
Integrity mode: demo

## Requirements

### R1. Thanh tìm kiếm và Bộ lọc nâng cao cho `HistoryScreen.kt`
Bổ sung `OutlinedTextField` tìm kiếm nhanh theo tên học sinh/bài văn và hai hàng Filter Chips (Thể loại: Tất cả, Chính tả, Tập làm văn; Khoảng điểm: Tất cả, >= 9.0, 8.0-8.9, 6.5-7.9, < 6.5) với trạng thái lọc động mượt mà.

### R2. Động hóa Sổ tay từ khó cá nhân hóa trên `StudentHomeScreen.kt`
Thay thế danh sách 5 từ mẫu tĩnh bằng logic trích xuất động các từ bị lỗi chính tả (`errors.map { it.originalWord to it.explanation }`) từ các bài chấm gần nhất của học sinh được lưu trong máy, có fallback về từ khó chuẩn SGK khi chưa có bài thi nào.

### R3. Tích hợp cử chỉ Pinch-to-zoom 2 ngón & Kéo ảnh (Pan) trên `PhotoBoundingBoxViewer.kt`
Sử dụng `Modifier.pointerInput` kết hợp `detectTransformGestures` và `graphicsLayer` để hỗ trợ giáo viên dùng 2 ngón tay thu phóng tự do (tỷ lệ 1x - 4x) và di chuyển mượt mà trên ảnh bài thi thật cùng toàn bộ các hộp Bounding Box.

### R4. Cập nhật Token màu thương hiệu Splash Window trong `colors.xml`
Bổ sung các mã màu `emerald_primary` (`#FF059669`) và `background_cream` (`#FFFAF9F6`) vào `res/values/colors.xml` để đồng bộ nhận diện thương hiệu ngay từ màn hình khởi động app.

## Acceptance Criteria

### Tính năng Giao diện & Nghiệp vụ
- [ ] Màn hình `HistoryScreen.kt` lọc tức thì danh sách bài thi khi người dùng gõ tên học sinh hoặc bấm chọn các chip thể loại/khoảng điểm.
- [ ] Màn hình `StudentHomeScreen.kt` hiển thị đúng các từ mà học sinh đã viết sai trong bài thi gần nhất để luyện đọc và viết lại.
- [ ] Màn hình `PhotoBoundingBoxViewer.kt` hỗ trợ cử chỉ chụm 2 ngón tay phóng to/thu nhỏ và kéo xem từng nét mực viết tay.
- [ ] Tệp `colors.xml` chứa đầy đủ mã màu thương hiệu Emerald và Cream.

### Kiểm thử Tự động
- [ ] Chạy kiểm thử `.\gradlew.bat testDebugUnitTest` vượt qua 100% không có lỗi.
- [ ] Chạy `npx tsc --noEmit` đạt 0 lỗi biên dịch.
