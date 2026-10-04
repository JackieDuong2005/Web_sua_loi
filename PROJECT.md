# Project: ViHand Grade Android Native App — Phase 2 & Phase 3 Parity

## Architecture
- **Tech Stack**: Android Native (Jetpack Compose, Kotlin, Material 3, Room SQLite, Robolectric, JUnit 4), Next.js Web BFF (TypeScript, Tailwind CSS).
- **Core Modules**:
  - `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt`: Quản lý hiển thị lịch sử bài chấm, hỗ trợ tìm kiếm và lọc đa tiêu chí.
  - `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt`: Màn hình trang chủ học sinh, sổ tay từ khó cá nhân hóa.
  - `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt`: Bộ hiển thị ảnh bài thi viết tay thực tế và lớp phủ bounding box chấm điểm với cử chỉ đa điểm thu phóng (Pinch-to-zoom) và kéo (Pan).
  - `android_app/app/src/main/res/values/colors.xml` & `themes.xml`: Token màu thương hiệu và theme khởi động Splash Window.
  - `android_app/app/src/test/java/com/example/`: Bộ kiểm thử tự động Android Unit Tests (Robolectric SDK 36 + JUnit 4).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: History Search & Filter | Thanh tìm kiếm OutlinedTextField theo tên học sinh/bài văn; 2 hàng Filter Chips (Thể loại: Tất cả, Chính tả, Tập làm văn; Khoảng điểm: Tất cả, >= 9.0, 8.0-8.9, 6.5-7.9, < 6.5). | M1 | ORIGINAL_REQUEST § R1 |
| 2 | R2: Dynamic Difficult Words | Sổ tay từ khó cá nhân hóa trích xuất từ các bài chấm gần nhất (`errors.map { it.originalWord to it.explanation }`), fallback từ khó chuẩn SGK. | M1 | ORIGINAL_REQUEST § R2 |
| 3 | R3: Pinch-to-zoom & Pan | Cử chỉ Pinch-to-zoom 2 ngón (1x - 4x) và Kéo ảnh (Pan) trên PhotoBoundingBoxViewer dùng `Modifier.pointerInput`, `detectTransformGestures`, `graphicsLayer`. | M1 | ORIGINAL_REQUEST § R3 |
| 4 | R4: Brand Color Tokens | Thêm `emerald_primary` (#FF059669) và `background_cream` (#FFFAF9F6) vào `colors.xml` & cập nhật `themes.xml`. | M1 | ORIGINAL_REQUEST § R4 |
| 5 | R5: Unit & Type Testing | Chạy `.\gradlew.bat testDebugUnitTest` đạt 100% (23/23 tests) và `npx tsc --noEmit` đạt 0 lỗi biên dịch. | M1 | ORIGINAL_REQUEST § Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Android Native Parity Completion | Triển khai R1, R2, R3, R4 và kiểm thử toàn diện | Survey completed | DONE |

## Code Layout
- `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt` (R1)
- `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt` (R2)
- `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt` (R3)
- `android_app/app/src/main/res/values/colors.xml` (R4)
- `android_app/app/src/main/res/values/themes.xml` (R4)
- `android_app/app/src/test/java/com/example/ExampleRobolectricTest.kt` (Unit tests cho R1, R2, R3, R4)
- `android_app/app/src/test/java/com/example/ExampleUnitTest.kt` (Unit tests cho logic trích xuất từ khó)
- `android_app/app/src/test/java/com/example/Milestone1StressTest.kt` (Adversarial stress tests cho R1 & R2)
