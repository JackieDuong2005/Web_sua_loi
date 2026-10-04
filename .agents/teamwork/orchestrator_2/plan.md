# Plan: Hoàn thiện Phase 2 & 3 Android Native App (ViHand Grade)

## 1. Overview & Mục tiêu
Thực hiện trọn vẹn 4 yêu cầu tính năng / giao diện (R1 - R4) và đảm bảo 100% kiểm thử tự động Android unit tests + TypeScript type check:
- **R1**: Thanh tìm kiếm & bộ lọc thể loại/điểm số trên `HistoryScreen.kt` (OutlinedTextField tìm kiếm nhanh theo tên học sinh/bài văn; 2 hàng Filter Chips: Thể loại [Tất cả, Chính tả, Tập làm văn] và Khoảng điểm [Tất cả, >= 9.0, 8.0-8.9, 6.5-7.9, < 6.5]).
- **R2**: Động hóa Sổ tay từ khó cá nhân hóa trên `StudentHomeScreen.kt` (Trích xuất động các từ bị lỗi chính tả `errors.map { it.originalWord to it.explanation }` từ các bài chấm gần nhất của học sinh được lưu trong máy, có fallback về từ khó chuẩn SGK khi chưa có bài thi nào).
- **R3**: Cử chỉ Pinch-to-zoom 2 ngón tay và Kéo ảnh (Pan) trên `PhotoBoundingBoxViewer.kt` (`Modifier.pointerInput` kết hợp `detectTransformGestures` và `graphicsLayer` hỗ trợ zoom 1x - 4x và di chuyển mượt mà trên ảnh bài thi và các bounding boxes).
- **R4**: Token màu thương hiệu Splash Window trong `res/values/colors.xml` (`emerald_primary` `#FF059669` và `background_cream` `#FFFAF9F6`).
- **Verifications**: Chạy `.\gradlew.bat testDebugUnitTest` pass 100% không lỗi, và `npx tsc --noEmit` đạt 0 lỗi.

## 2. Iteration & Team Structure
- **Phase 1: Survey & Exploration**: Spawn Explorers để khảo sát mã nguồn hiện tại của `HistoryScreen.kt`, `StudentHomeScreen.kt`, `PhotoBoundingBoxViewer.kt`, `colors.xml`, cấu trúc dữ liệu lỗi/bài thi (`ExamSubmission`, `CorrectionResult`, `SpellError`, etc.), và hiện trạng các bài test `.\gradlew.bat testDebugUnitTest`.
- **Phase 2: Implementation**: Spawn Worker triển khai chuẩn xác R1, R2, R3, R4 theo đúng interface contracts và MVVM / Jetpack Compose conventions. Viết unit tests kiểm thử logic lọc của HistoryScreen và logic trích xuất từ khó của StudentHomeScreen nếu cần.
- **Phase 3: Verification & Challenging**: Spawn Reviewers & Challengers để kiểm tra tính năng, edge cases, responsiveness, và chạy build/tests thực tế.
- **Phase 4: Forensic Audit**: Spawn Auditor để rà soát tính trung thực, không hardcode, không dummy facade.
- **Phase 5: Gate & Handoff**: Xác nhận mọi tiêu chí nghiệm thu đạt chuẩn.
