## 2026-10-03T19:01:42Z
You are the Project Orchestrator for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_2
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi
The authoritative user request is recorded in: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (under section ## 2026-10-03T19:00:25Z).

Your mission is to implement and verify the remaining items for Phase 2 and Phase 3 of the Android Native App (`android_app/`) in the ViHand Grade ecosystem:
1. R1: Thanh tìm kiếm & bộ lọc thể loại/điểm số trên `HistoryScreen.kt` (OutlinedTextField tìm kiếm nhanh theo tên học sinh/bài văn; hai hàng Filter Chips: Thể loại [Tất cả, Chính tả, Tập làm văn] và Khoảng điểm [Tất cả, >= 9.0, 8.0-8.9, 6.5-7.9, < 6.5]).
2. R2: Động hóa Sổ tay từ khó cá nhân hóa trên `StudentHomeScreen.kt` (Trích xuất động các từ bị lỗi chính tả `errors.map { it.originalWord to it.explanation }` từ các bài chấm gần nhất của học sinh được lưu trong máy, có fallback về từ khó chuẩn SGK khi chưa có bài thi nào).
3. R3: Tích hợp cử chỉ Pinch-to-zoom 2 ngón tay và Kéo ảnh (Pan) trên `PhotoBoundingBoxViewer.kt` (Sử dụng `Modifier.pointerInput` kết hợp `detectTransformGestures` và `graphicsLayer` để hỗ trợ zoom 1x - 4x và di chuyển mượt mà trên ảnh bài thi thật cùng toàn bộ các hộp Bounding Box).
4. R4: Cập nhật Token màu thương hiệu Splash Window trong `res/values/colors.xml` (`emerald_primary` `#FF059669` và `background_cream` `#FFFAF9F6`).
5. Kiểm thử tự động: Chạy `.\gradlew.bat testDebugUnitTest` vượt qua 100% không có lỗi, và chạy `npx tsc --noEmit` đạt 0 lỗi biên dịch.

Please maintain plan.md, progress.md, and BRIEFING.md in your working directory.
Orchestrate your team to inspect, implement, and verify these features.
When all acceptance criteria are met, submit your handoff and victory claim.
