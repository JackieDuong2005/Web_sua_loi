# BÁO CÁO THANH TRA & ĐỐI SOÁT TOÀN DIỆN UI/UX & DESIGN SYSTEM
## Hệ sinh thái ViHand Grade: Android Native App (`android_app/`) vs Web App (`app/`)

---

## 1. OBSERVATION (QUAN SÁT THỰC TẾ)

Dưới đây là các dữ liệu đối soát trực tiếp trích xuất từ mã nguồn của cả hai nền tảng:

### 1.1. Bảng đối chiếu Hệ thống Design System & Tokens

#### A. So sánh Nền tảng Công nghệ & Design System
* **Web App**:
  - CSS Framework: Tailwind CSS v4 (`@import 'tailwindcss'; @import 'tw-animate-css'; @theme inline { ... }` tại `app/globals.css:1-2` và `189-234`).
  - Component Library: Radix UI Primitives bọc trong Shadcn UI (`components/ui/*`: `button.tsx`, `card.tsx`, `dialog.tsx`, `tabs.tsx`, `badge.tsx`, `sidebar.tsx`, `sonner.tsx`, `spinner.tsx`, `skeleton.tsx`).
  - Icons: Lucide React (`lucide-react`) kết hợp Google Material Symbols Rounded (`app/layout.tsx:51` và `app/globals.css:61-75`).
* **Android Native App**:
  - UI Framework: Jetpack Compose BOM 2024.09.00 (`android_app/gradle/libs.versions.toml:8`, `build.gradle.kts:65`).
  - Design Language: Material 3 (`androidx.compose.material3:*`).
  - Theme Wrapper: `MyApplicationTheme` (`android_app/app/src/main/java/com/example/ui/theme/Theme.kt:108-119`).
  - Icons: Compose Material Icons Extended (`androidx.compose.material.icons.filled.*`).
  - XML Legacy: `colors.xml` (`android_app/app/src/main/res/values/colors.xml:1-10`) và `themes.xml` (`android_app/app/src/main/res/values/themes.xml:1-5`).

#### B. Ma trận Đối soát Bảng màu (Color Palette & Theme Tokens)

| Token UI | Web Token (`app/globals.css`) | Web Giá trị (Hex quy đổi) | Android Compose Token (`Color.kt` / `Theme.kt`) | Android Giá trị Hex | Trạng thái Đồng nhất |
|---|---|---|---|---|:---:|
| **Primary (Light)** | `oklch(0.55 0.15 160)` (`globals.css:110`) | `#059669` (Emerald-600) | `EmeraldPrimary` (`Color.kt:10`) | `0xFF059669` |  **100% Khớp** |
| **Primary (Dark)** | `oklch(0.65 0.18 160)` (`globals.css:154`) | `#34D399` / `#10B981` | `EmeraldAccent` (`Color.kt:13`) | `0xFF34D399` |  **100% Khớp** |
| **Background (Light)** | `oklch(0.98 0.005 90)` (`globals.css:104`) | `#FAF9F6` (Kem ấm) | `BackgroundCream` (`Color.kt:16`) | `0xFFFAF9F6` |  **100% Khớp** |
| **Background (Dark)** | `oklch(0.14 0.02 260)` (`globals.css:148`) | `#141724` (Deep Slate) | `BackgroundDark` (`Color.kt:17`) | `0xFF141724` |  **100% Khớp** |
| **Card / Surface (Light)** | `oklch(1 0 0)` (`globals.css:106`) | `#FFFFFF` | `SurfaceLight` (`Color.kt:18`) | `0xFFFFFFFF` |  **100% Khớp** |
| **Card / Surface (Dark)** | `oklch(0.18 0.02 260)` (`globals.css:150`) | `#1E2235` | `SurfaceDark` (`Color.kt:19`) | `0xFF1E2235` |  **100% Khớp** |
| **Border (Light)** | `oklch(0.9 0.01 90)` (`globals.css:120`) | `#E2E8F0` (Slate-200) | `BorderLight` (`Color.kt:24`) | `0xFFE2E8F0` |  **100% Khớp** |
| **Border (Dark)** | `oklch(0.28 0.02 260)` (`globals.css:164`) | `#2D334A` | `BorderDark` (`Color.kt:25`) | `0xFF2D334A` |  **100% Khớp** |
| **Text Primary (Light)** | `oklch(0.25 0.02 260)` (`globals.css:105`) | `#0F172A` (Slate-900) | `TextPrimaryLight` (`Color.kt:29`) | `0xFF0F172A` |  **100% Khớp** |
| **Text Muted (Light)** | `oklch(0.5 0.02 260)` (`globals.css:115`) | `#64748B` (Slate-500) | `TextMutedLight` (`Color.kt:31`) | `0xFF64748B` |  **100% Khớp** |
| **Destructive / Error** | `oklch(0.55 0.2 25)` (`globals.css:118`) | `#DC2626` (Red-600) | `LightColorScheme.error` (`Theme.kt:103`) | `0xFFDC2626` |  **100% Khớp** |
| **Success** | `oklch(0.65 0.18 145)` (`globals.css:139`) | `#10B981` (Emerald-500) | `Color(0xFF10B981)` (hardcoded) | `0xFF10B981` | ⚠️ **Chưa gom token** |
| **Warning** | `oklch(0.75 0.15 75)` (`globals.css:141`) | `#F59E0B` (Amber-500) | `AccentAmber` (`Color.kt:80`) | `0xFFF59E0B` |  **100% Khớp** |
| **Info / Secondary** | `oklch(0.65 0.15 230)` (`globals.css:143`) | `#0284C7` (Sky-600) | `LightColorScheme.secondary` (`Theme.kt:90`) | `0xFF0284C7` |  **100% Khớp** |
| **Corner Radius** | `--radius: 0.75rem` (12px) (`globals.css:128`) | 12px | `RoundedCornerShape(12.dp / 16.dp)` | 12dp - 16dp |  **Tương đương** |
| **XML Palette** | — | — | `colors.xml:3-9` | `purple_200`, `purple_500`, `teal_200`... | ❌ **Lỗi: Giá trị mẫu cũ** |

#### C. Đối soát Phân loại Mã Màu Lỗi Chính Tả (`ERROR_THEMES`)

Web App định nghĩa 9 loại mã màu sư phạm tại `app/teacher/grade/page.tsx:125-234` và `components/student/student-grade-detail-modal.tsx:95-125`. Trong khi đó, Android `Color.kt:37-61` và `PhotoBoundingBoxViewer.kt:97-153` chỉ định nghĩa 6 loại:

| Loại Lỗi | Web Hex & Badge Style (`app/teacher/grade/page.tsx`) | Android Hex Token (`Color.kt`) | Android Mapper (`PhotoBoundingBoxViewer.kt`) | Trạng thái Đối soát |
|---|---|---|---|:---:|
| **Phụ âm đầu** (`phu_am_dau`) | `#e11d48` (`bg-rose-100 text-rose-700 border-rose-200`) (dòng 127) | `0xFFF43F5E` (`ErrorPhuAmDau:38`) | `ErrorPhuAmDau` (dòng 102) |  **Đồng bộ** (Rose) |
| **Dấu thanh** (`dau_thanh`) | `#9333ea` (`bg-purple-100 text-purple-700 border-purple-200`) (dòng 139) | `0xFFA855F7` (`ErrorDauThanh:42`) | `ErrorDauThanh` (dòng 106) |  **Đồng bộ** (Purple) |
| **Vần** (`van`) | `#ea580c` (`bg-orange-100 text-orange-700 border-orange-200`) (dòng 151) | `0xFFF97316` (`ErrorVan:46`) | `ErrorVan` (dòng 110) |  **Đồng bộ** (Orange) |
| **Nguyên âm** (`am_chinh`) | `#059669` (`bg-emerald-100 text-emerald-700 border-emerald-200`) (dòng 163) | `0xFF10B981` (`ErrorAmChinh:50`) | `ErrorAmChinh` (dòng 113) |  **Đồng bộ** (Emerald) |
| **Âm cuối** (`phu_am_cuoi`) | `#0284c7` (`bg-sky-100 text-sky-700 border-sky-200`) (dòng 175) | `0xFF0EA5E9` (`ErrorPhuAmCuoi:54`) | `ErrorPhuAmCuoi` (dòng 116) |  **Đồng bộ** (Sky) |
| **Viết hoa** (`viet_hoa`) | `#2563eb` (`bg-blue-100 text-blue-700 border-blue-200`) (dòng 187) | `0xFFF59E0B` (`ErrorVietHoa:58`) | `ErrorVietHoa` (dòng 120) | ❌ **LỆCH MÀU: Web Blue vs Android Amber** |
| **Bỏ sót / Thêm** (`bo_sot_them`) | `#db2777` (`bg-pink-100 text-pink-700 border-pink-200`) (dòng 199) | *Chưa có token riêng* | Rơi vào `else -> Color(0xFF64748B)` (dòng 122) | ❌ **ANDROID THIẾU TOKEN** |
| **Sai khác từ** (`thay_the_tu`) | `#4f46e5` (`bg-indigo-100 text-indigo-700 border-indigo-200`) (dòng 211) | `AccentIndigo = Color(0xFF6366F1)` (`Color.kt:83`) | Rơi vào `else -> Color(0xFF64748B)` (dòng 122) | ❌ **ANDROID CHƯA MAP LOẠI NÀY** |
| **Dấu câu** (`dau_cau`) | `#0d9488` (`bg-teal-100 text-teal-700 border-teal-200`) (dòng 223) | *Chưa có token riêng* | Rơi vào `else -> Color(0xFF64748B)` (dòng 122) | ❌ **ANDROID THIẾU TOKEN** |

#### D. Typography & Vietnamese Diacritics Rendering
* **Web**:
  - Tải 7 biến thể font HP001 tiểu học trong `@layer base` (`app/globals.css:5-48`): `HP001_4_hang_normal`, `HP001_4_hang_bold`, `HP001_5_hang_normal`, `HP001_5_hang_bold`, `HP001_4_hang_1_o_ly`, `HP001_4_hang_2_o_ly`, `HP001_5_hang_1_o_ly`.
  - Class `.font-tieu-hoc`: `font-family: 'HP001', 'HP001-5hang', sans-serif !important; font-weight: 700 !important; font-size: 1.15rem !important; color: #111111 !important; -webkit-font-smoothing: antialiased;` (`app/globals.css:51-58`).
  - Google Fonts phụ trợ: `Roboto`, `Be Vietnam Pro`, `Lexend`, `Material Symbols Rounded` (`app/layout.tsx:48-57`).
* **Android**:
  - `FontFamilyTieuHoc` (`android_app/app/src/main/java/com/example/ui/theme/Type.kt:12-15`): Chỉ khai báo 2 file TTF trong `res/font/` (`hp001_normal.ttf`, `hp001_bold.ttf`). Thiếu hoàn toàn font 5 hàng (chuẩn lớp 1) và font có sẵn dòng kẻ ô ly.
  - Vị trí sử dụng: `GradingResultScreen.kt:1438, 1514` (Diff viewer), `StudentHomeScreen.kt:368` (Từ khó luyện tập), `ProfileSettingsScreen.kt:254` (Preview font).
  - Độ an toàn dấu Tiếng Việt (Diacritics): Compose Typography (`Type.kt:17-102`) đặt `lineHeight` tỷ lệ 1.4x-1.5x font size (ví dụ: `bodyLarge` 15sp / 22sp = 1.46x, `bodyMedium` 14sp / 20sp = 1.43x). Không bị lỗi cắt ngọn dấu hỏi/ngã/mũ trên các thiết bị Android tiêu chuẩn.

---

### 1.2. Interactive States & User Feedback

#### A. Trạng thái Tải (Loading Indicators)
* **Web**:
  - Không dùng Skeleton Screen trên các trang chính mặc dù file `components/ui/skeleton.tsx` có tồn tại trong repo.
  - Sử dụng thành phần `Spinner` (`components/ui/spinner.tsx`) hoặc Lucide `Loader2` có hoạt ảnh quay tròn (`app/page.tsx:128`, `app/teacher/page.tsx:148`, `app/teacher/grade/page.tsx:709, 2414, 2542, 2778`, `app/teacher/reports/page.tsx:412`).
  - Trang Chấm bài (`app/teacher/grade/page.tsx:31`) có chuỗi Stepper Icons động hiển thị từng giai đoạn bóc tách AI (`IconGoogleCamera`, `IconGoogleEnhance`, `IconGoogleScanOcr`, `IconGoogleProofread`, `IconGoogleScore`).
* **Android**:
  - Không có Shimmer Effect (thư viện Accompanist Placeholder / Shimmer không được khai báo).
  - Sử dụng Universal Processing Dialog toàn cục (`MainActivity.kt:476-522`): Gồm `CircularProgressIndicator` (size 44dp, màu `EmeraldPrimary`) kết hợp `LinearProgressIndicator` (tiến độ thực tế `state.progress` [0f..1f]) và dòng chữ `state.stepDescription`.
  - Màn hình Đăng nhập: `CircularProgressIndicator` (20dp) bên trong nút Đăng Nhập (`LoginScreen.kt:262-266`).

#### B. Xử lý Lỗi & Thông báo (Notifications & Alerts)
* **Web**:
  - Không dùng thư viện thông báo Toast nổi (thư viện `sonner` có trong `package.json` nhưng `<Toaster />` không được render trong `app/layout.tsx`).
  - Lỗi được hiển thị qua Inline Alert Banner (`components/ui/alert.tsx`) hoặc thông báo văn bản trực tiếp màu đỏ (`text-destructive`).
  - Hộp thoại cảnh báo xác nhận dùng Radix Dialog (`components/ui/dialog.tsx`).
* **Android**:
  - Dùng `SnackbarHostState` và `SnackbarHost` (`GradingResultScreen.kt:134, 295`) để thông báo khi lưu kết quả bài chấm, hoàn điểm, sao chép tin nhắn Zalo (`lines 245, 661, 1078, 1277`).
  - Dùng `android.widget.Toast` truyền thống khi xuất báo cáo CSV thành công (`ReportsAnalyticsScreen.kt:122`).
  - Dùng Compose `AlertDialog` khi rớt mạng hoặc lỗi kết nối máy chủ (`MainActivity.kt:525-608`). Tuy nhiên, hộp thoại này còn nút "Chấm Offline 🧪" (dòng 587) không ăn khớp với tôn chỉ sản phẩm trên Web.

---

### 1.3. Feature Parity Matrix across 6 Main Screen Groups

| Nhóm Màn Hình | Tính năng | Web App (`app/...`) | Android Native App (`android_app/...`) | Mức độ Đồng nhất | File & Dòng Code Đối Soát |
|---|---|---|---|:---:|---|
| **1. Đăng nhập / Xác thực** | Giao diện đăng nhập mật khẩu |  Có |  Có | 100% | Web: `app/page.tsx:1-170`<br>Android: `LoginScreen.kt:1-367` |
| | Đăng nhập trải nghiệm nhanh (Guest) | ❌ Không có (nhập thẳng) |  Có (GV / HS) | Android vượt trội | Android: `LoginScreen.kt:281-308` |
| | Cấu hình Base URL trực tiếp | ❌ Cố định qua env |  Có (Expander Text) | Android vượt trội | Android: `LoginScreen.kt:313-364` |
| **2. Dashboard (Tổng quan)** | 4 Thẻ chỉ số KPI (Bài, HS, Điểm TB, Đề) |  Có |  Có | 100% | Web: `app/teacher/page.tsx:156-171`<br>Android: `HomeScreen.kt:225-418` |
| | Nút Hero Action "Chấm bài mới" |  Có |  Có | 100% | Web: `app/teacher/page.tsx:182-193`<br>Android: `HomeScreen.kt:480-564` |
| | Danh sách 5 bài chấm gần nhất |  Có (tải API `/api/grades`) |  Có (Room DB `historyList`) | 90% (Android thiếu phân trang) | Web: `app/teacher/page.tsx:210-246`<br>Android: `HomeScreen.kt:567-630` |
| | Góc học tập dành cho Bé & Phụ huynh |  Có (`/student`) |  Có (`StudentHomeScreen.kt`) | 80% (Android mock từ khó) | Web: `app/student/page.tsx:1-516`<br>Android: `StudentHomeScreen.kt:1-430` |
| **3. Chấm bài (Grading Studio)** | Live Camera Viewfinder phần cứng | ❌ Web chỉ dùng WebRTC/File |  CameraX 1.5.0 Auto-focus | Android vượt trội | Web: `app/teacher/grade/page.tsx:31`<br>Android: `CameraScanScreen.kt:100-280` |
| | Bật/tắt đèn Flash, đổi tỉ lệ 4:3 / 9:16 | ❌ Không có |  Có (CameraControl torch) | Android vượt trội | Android: `CameraScanScreen.kt:293-304` |
| | Quét liên tục cả lớp (Batch Mode) | ❌ Chỉ chọn nhiều file |  Có (Batch Bitmaps list) | Android vượt trội | Android: `CameraScanScreen.kt:326-346` |
| | Chọn Lớp & Học sinh trước khi chụp |  Có |  Có | 100% | Web: `app/teacher/grade/page.tsx:68`<br>Android: `CameraScanScreen.kt:307-324` |
| | Hiển thị Bounding Box trên ảnh thật |  Có (Percentage CSS) |  Có (Compose Canvas matchParent) | 90% | Web: `app/teacher/grade/page.tsx:887-950`<br>Android: `PhotoBoundingBoxViewer.kt:457-570` |
| | Chế độ Vở Ô Ly Kỹ Thuật Số |  Có |  Có (`NotebookBackground.kt`) | 100% | Web: `app/teacher/grade/page.tsx:886`<br>Android: `PhotoBoundingBoxViewer.kt:448-455` |
| | So sánh văn bản sửa lỗi (Diff Viewer) |  Có (HP001) |  Có (`FontFamilyTieuHoc`) | 100% | Web: `app/teacher/grade/page.tsx:1140`<br>Android: `GradingResultScreen.kt:1438-1520` |
| | Bảng điểm 4 tiêu chí Thông tư 27 |  Có (Chính tả, Hình thức, ND, ST) |  Có (CriteriaScoreCard) | 100% | Web: `app/teacher/grade/page.tsx:575-645`<br>Android: `CriteriaScoreCard.kt:1-229` |
| | Giáo viên can thiệp sửa điểm (Slider) |  Có |  Có (Dialog Slider) | 100% | Web: `app/teacher/grade/page.tsx:602, 614`<br>Android: `GradingResultScreen.kt:2151-2162` |
| | Gợi ý nhận xét sư phạm AI (Qwen SLM) |  Có (3 gợi ý + nút tái tạo) |  Có (3 gợi ý tĩnh/API) | 85% (Android thiếu nút tái tạo) | Web: `app/teacher/grade/page.tsx:501-534`<br>Android: `GradingResultScreen.kt:1026-1064` |
| | Thêm / Xóa lỗi chính tả thủ công |  Có |  Có (Giáo viên có quyền) | 100% | Web: `app/teacher/grade/page.tsx:1170`<br>Android: `GradingResultScreen.kt:444-460, 660` |
| **4. Lịch sử bài chấm** | Danh sách bài chấm đã lưu |  Có (Table & Card) |  Có (`LazyColumn`) | 80% | Web: `app/student/history/page.tsx:140`<br>Android: `HistoryScreen.kt:109-138` |
| | Thanh tìm kiếm bài tập / học sinh |  Có (`searchQuery`) | ❌ **CHƯA CÓ** | 0% (Thiếu nghiêm trọng) | Web: `app/student/history/page.tsx:59, 105`<br>Android: `HistoryScreen.kt:50-80` |
| | Bộ lọc Thể loại (Chính tả / Tập làm văn) |  Có (`modeFilter`) | ❌ **CHƯA CÓ** | 0% (Thiếu) | Web: `app/student/history/page.tsx:60, 111`<br>Android: `HistoryScreen.kt:50-80` |
| | Bộ lọc Mức điểm (Xuất sắc, Tốt, Cần rèn) |  Có (`scoreFilter`) | ❌ **CHƯA CÓ** | 0% (Thiếu) | Web: `app/student/history/page.tsx:61, 116`<br>Android: `HistoryScreen.kt:50-80` |
| | Xuất dữ liệu / Chia sẻ Zalo |  Có |  Có nút sao chép Zalo | 90% | Web: `app/teacher/reports/page.tsx:199`<br>Android: `GradingResultScreen.kt:1277` |
| **5. Báo cáo & Lớp học** | Biểu đồ phân bổ phổ điểm |  Có (Recharts BarChart) |  Có (Segmented Progress Bar) | 85% | Web: `app/teacher/reports/page.tsx:13, 350`<br>Android: `ReportsAnalyticsScreen.kt:352-376` |
| | Phân tích nhóm lỗi hay sai nhất |  Có |  Có (Horizontal Error Bars) | 100% | Web: `app/teacher/reports/page.tsx:46-56`<br>Android: `ReportsAnalyticsScreen.kt:380-432` |
| | Danh sách học sinh cần kèm cặp | ❌ Chỉ có bảng tổng |  Có (`StudentFocusItem`) | Android vượt trội | Android: `ReportsAnalyticsScreen.kt:434-500` |
| | Lọc theo Khối lớp & Thời gian |  Có |  Có (Class & Timeframe Chips)| 100% | Web: `app/teacher/reports/page.tsx:98`<br>Android: `ReportsAnalyticsScreen.kt:218-276` |
| | Xuất file báo cáo CSV/Excel |  Có (`/api/grades`) |  Có (`viewModel.exportCsv()`) | 100% | Web: `app/teacher/reports/page.tsx:199`<br>Android: `ReportsAnalyticsScreen.kt:199-214` |
| | Quản lý danh sách lớp & học sinh (CRUD) |  Có (`/admin/classes`, `/admin/users`) | ❌ Không có màn CRUD riêng | 30% (Chỉ đọc qua API) | Web: `app/admin/classes/page.tsx`, `users/page.tsx`<br>Android: `MainViewModel.kt:120` |
| **6. Luyện viết chính tả** | Kho bài đọc SGK Lớp 1 - 5 |  Có (`/api/dictation/passages`) |  Có (API + Fallback `LocalDictationPassages`)| 100% | Web: `app/teacher/dictation/page.tsx:114`<br>Android: `DictationScreen.kt:119-157` |
| | Lọc theo Bộ sách (Cánh Diều, Kết Nối, Chân Trời)|  Có |  Có (Chip chọn bộ sách) | 100% | Web: `app/teacher/dictation/page.tsx:132`<br>Android: `DictationScreen.kt:120-136` |
| | Giọng đọc AI Edge-TTS Neural |  Có (Hoài My, Nam Minh, Trúc Ly)|  Có (Edge-TTS + Android TTS dự phòng) | 100% | Web: `app/teacher/dictation/page.tsx:76-110`<br>Android: `DictationScreen.kt:168-281` |
| | Nhịp đọc sư phạm (Lặp lại, đếm ngược nghỉ viết)|  Có |  Có (Đọc 2 lần + đếm ngược 10s) | 100% | Web: `app/teacher/dictation/page.tsx:23`<br>Android: `DictationScreen.kt:172, 283-290` |
| | Hoạt ảnh sóng âm thanh (Waveform) |  Có (`.dict-wave-bar`) |  Có (Compose Pulse animation) | 100% | Web: `app/globals.css:368-377`<br>Android: `DictationScreen.kt:400-430` |
| | Sinh đề bài chính tả tự động bằng AI |  Có (`/api/dictation/generate`) | ❌ **CHƯA CÓ** | 0% (Thiếu) | Web: `app/teacher/dictation/page.tsx:28` |
| | Ghi nhật ký & lưu phiên luyện viết |  Có (`/api/dictation/sessions`)| ❌ **CHƯA CÓ** | 0% (Thiếu) | Web: `app/teacher/dictation/page.tsx:50-62` |
| **7. Cài đặt & Tài khoản** | Xem thông tin tài khoản & vai trò |  Có (Header) |  Có (`ProfileSettingsScreen.kt`) | 100% | Web: `app/teacher/page.tsx:138`<br>Android: `ProfileSettingsScreen.kt:120-175` |
| | Chuyển đổi Dark / Light Theme |  Có (Next-themes) |  Có (Switch Material 3) | 100% | Web: `components/theme-provider.tsx`<br>Android: `ProfileSettingsScreen.kt:177-235` |
| | Preview Font chữ Tiểu học HP001 | ❌ Không có |  Có | Android vượt trội | Android: `ProfileSettingsScreen.kt:238-261` |
| | Kiểm tra trạng thái máy chủ & Đăng xuất |  Có |  Có | 100% | Web: `components/app-sidebar.tsx`<br>Android: `ProfileSettingsScreen.kt:264-345` |

---

### 1.4. UX Flow Evaluation: Mobile Touch UX vs Desktop Web UX

#### A. Trải nghiệm Tương tác Chạm (Mobile Touch UX) trên Android:
1. **Thao tác Thu phóng Bounding Box**:
   - Mặc dù đặc tả kỹ thuật `TECHSTACK_AND_UI_SPECIFICATION.md:120` ghi nhận: *"Hỗ trợ chụm 2 ngón tay thu phóng (`detectTransformGestures`) để giáo viên soi rõ từng nét mực"*, việc kiểm tra thực tế mã nguồn tại `PhotoBoundingBoxViewer.kt:368-408` cho thấy **chưa hề có gesture pinch-to-zoom**.
   - Ứng dụng hiện tại chỉ có một nút bấm Toggle IconButton `isZoomed` (`lines 369-378`), khi bấm vào sẽ mở rộng ảnh thành `540.dp` và cho phép cuộn ngang (`horizontalScroll`). Trải nghiệm này kém trực quan trên màn hình cảm ứng di động.
2. **Kích thước Điểm chạm (Touch Target Size Violation)**:
   - Các hộp khoanh lỗi từ ngắn (1-2 ký tự, ví dụ chữ "ru", "su", "gó") có kích thước bề ngang co lại chỉ khoảng 16dp - 24dp (`PhotoBoundingBoxViewer.kt:510`: `widthDp = (displayedWidthDp * safeRelW).coerceAtLeast(16.dp)`).
   - Kích thước này vi phạm khuyến nghị tiếp cận Android Accessibility Guidelines (tối thiểu `48x48dp`), dẫn đến hiện tượng bấm trượt khi giáo viên muốn chọn lỗi trên điện thoại màn hình nhỏ (5.5" - 6.1").
3. **Cơ chế Điều hướng bằng Thẻ chuyển tab (Segmented Tabs vs Multi-column)**:
   - Trên Web Desktop (`app/teacher/grade/page.tsx`), giáo viên có thể quan sát song song ảnh bài thi bên trái và danh sách lỗi, bảng điểm, lời nhận xét bên phải cùng lúc trên màn hình lớn.
   - Trên Android di động (`GradingResultScreen.kt:351-394`), giao diện bị phân mảnh thành 3 tab riêng biệt: `"Ảnh Thật & BBox"`, `"So Sánh Sửa"`, `"4 Năng Lực"`. Giáo viên phải liên tục chuyển qua lại giữa các tab để vừa nhìn ảnh vừa sửa điểm tiêu chí.

#### B. Điểm nghẽn Trải nghiệm & Tàn dư Kỹ thuật trên Android:
1. **Thuật ngữ Kỹ thuật lộ ra ngoài giao diện người dùng**:
   - `HomeScreen.kt:144`: Hiện dòng chữ *"vihandgrade.click • Trạm Pi 4 Online"* — từ ngữ "Trạm Pi 4" là thuật ngữ phần cứng nội bộ, không thân thiện với giáo viên mầm non/tiểu học.
   - `PhotoBoundingBoxViewer.kt:312`: Hiện badge *"YOLOv8 DETECTED • 6 LỖI"* — hiển thị trực tiếp tên mô hình AI "YOLOv8".
   - `HistoryScreen.kt:119`: Hiện dòng chữ *"Tổng số X bài thi đã lưu trong CSDL Room"* — từ "CSDL Room" là chi tiết kỹ thuật lập trình Android.
   - `MainActivity.kt:587`: Nút *"Chấm Offline 🧪"* trong Error Dialog gây cảm giác phần mềm chưa hoàn thiện, là tàn dư mock dữ liệu đã có kế hoạch loại bỏ.
2. **Dữ liệu giả định trong Màn hình Học sinh (`StudentHomeScreen.kt`)**:
   - `StudentHomeScreen.kt:338-344`: Danh sách 5 từ khó luyện viết (`"ru bé ngủ say"`, `"thay cho gió trời"`, `"ngọt ngào"`, `"chăm chỉ"`, `"xinh xắn"`) bị **hardcode tĩnh**. Trong khi trên Web (`app/student/page.tsx:119-145`), kho từ khó được bóc tách tự động từ chính các bài làm thực tế của học sinh trong lịch sử chấm điểm.
3. **Màn hình Lịch sử Chấm bài (`HistoryScreen.kt`) quá đơn điệu**:
   - Không có ô tìm kiếm (`search bar`), không có chip lọc theo thể loại hay khoảng điểm, khiến giáo viên gặp khó khăn khi tìm lại bài thi của học sinh sau khi đã chấm hàng chục bài.

---

## 2. LOGIC CHAIN (CHUỖI SUY LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Từ việc đối chiếu Hệ màu Compose và CSS Variables**:
   - Quan sát thấy `EmeraldPrimary` (`#059669`), `BackgroundCream` (`#FAF9F6`), `SurfaceLight` (`#FFFFFF`), `BorderLight` (`#E2E8F0`) trên Android khớp 100% với các biến `oklch` trong `app/globals.css`.
   - Tuy nhiên, quan sát tại `android_app/app/src/main/res/values/colors.xml` cho thấy các mã màu XML vẫn là màu tím và xanh cổ điển của template ban đầu (`purple_500`, `teal_200`), chưa được đồng bộ sang hệ màu ViHand Grade.
   - *Suy luận:* Khi ứng dụng khởi động (Cold Start) hoặc trong các thành phần dùng Style XML truyền thống, giao diện có nguy cơ hiển thị sai màu nhận diện thương hiệu.

2. **Từ việc đối chiếu 9 Mã màu Lỗi (`ERROR_THEMES`)**:
   - Quan sát thấy Web có 9 loại lỗi (`app/teacher/grade/page.tsx:125-234`), trong khi Android chỉ xử lý 6 loại (`PhotoBoundingBoxViewer.kt:97-153`).
   - Riêng loại lỗi `viet_hoa`, Web dùng màu Xanh dương (`#2563eb`), nhưng Android lại dùng màu Vàng Hổ Phách (`#F59E0B`). Các loại lỗi `bo_sot_them`, `thay_the_tu`, `dau_cau` trên Android bị rơi vào nhánh fallback màu xám Slate `#64748B`.
   - *Suy luận:* Khi backend AI trả về kết quả phân tích các dạng lỗi mới từ YOLOv8 / ViT5, Android app sẽ hiển thị sai màu viền bounding box và badge, làm mất tính đồng bộ thị giác giữa hai bề mặt.

3. **Từ việc kiểm tra Tương tác Chạm & Bounding Box**:
   - Quan sát thấy `PhotoBoundingBoxViewer.kt` sử dụng `horizontalScroll` kết hợp `width(540.dp)` khi `isZoomed = true`, hoàn toàn không có `Modifier.pointerInput` với `detectTransformGestures`.
   - Quan sát thấy `widthDp` tối thiểu của hộp lỗi được đặt là `16.dp` (`PhotoBoundingBoxViewer.kt:510`).
   - *Suy luận:* Giáo viên sử dụng điện thoại thật không thể dùng cử chỉ 2 ngón tay tự nhiên để phóng to chữ học sinh viết tay và rất dễ bấm trượt vào các từ ngắn, gây ức chế trong thao tác chấm bài hàng loạt.

4. **Từ việc kiểm tra Tính năng Màn hình Lịch sử và Học sinh**:
   - Quan sát thấy `HistoryScreen.kt` (266 dòng) hoàn toàn thiếu `searchQuery`, `modeFilter`, `scoreFilter` so với `app/student/history/page.tsx` (358 dòng).
   - Quan sát thấy `StudentHomeScreen.kt:338-344` chứa mảng cố định 5 cặp từ khó thay vì phân tích từ `recentRecords`.
   - *Suy luận:* Phân hệ theo dõi lịch sử và góc học tập cho học sinh trên Android hiện mới chỉ ở mức MVP/Demo, chưa đồng bộ trọn vẹn nghiệp vụ sư phạm cá nhân hóa như trên Web.

---

## 3. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH)

1. **Môi trường Thực thi**: Cuộc kiểm tra này được thực hiện dưới hình thức tĩnh (Static Source Code Inspection) trên toàn bộ codebase mà không gắn thiết bị Android thật để đo lường độ trễ GPU render khi vẽ hàng chục Bounding Box cùng lúc.
2. **Quyền truy cập Admin**: Web App sở hữu phân hệ Quản trị viên chi tiết (`app/admin/*`: quản lý trường, lớp, tài khoản, cấu hình hệ thống). Báo cáo này ngầm định phân hệ Admin chỉ dành riêng cho Desktop Web, Android Native App tập trung phục vụ 2 nhóm người dùng cuối: **Giáo viên** và **Học sinh/Phụ huynh**.
3. **Phiên bản Jetpack Compose**: Android sử dụng Jetpack Compose BOM 2024.09.00; các API như `ModalBottomSheet` và `Canvas` hoạt động ổn định trên Android 8.0 (API 26) trở lên.

---

## 4. CONCLUSION (KẾT LUẬN & KIẾN NGHỊ HÀNH ĐỘNG)

### Đánh giá Tổng thể:
Android Native App (`android_app/`) đã hoàn thành **khoảng 85% lộ trình đồng bộ visual và nghiệp vụ cốt lõi** so với Web App (`app/`). Nền tảng Android sở hữu nhiều điểm vượt trội về phần cứng (CameraX Auto-focus, Flash trợ sáng, chụp liên tục cả lớp Batch Mode, phát âm giọng đọc dự phòng ngoại tuyến Android TTS).

Tuy nhiên, vẫn còn **3 nhóm khoảng cách (Gaps) lớn cần khắc phục**:
1. **Thiếu sót Token Màu & XML**: Lệch màu `viet_hoa` (Blue vs Amber), thiếu 3 loại lỗi (`bo_sot_them`, `thay_the_tu`, `dau_cau`), và file `colors.xml` chưa được cập nhật.
2. **Trải nghiệm Chạm Mobile (Touch UX)**: Thiếu cử chỉ chụm 2 ngón tay thu phóng (`detectTransformGestures`), vùng bấm lỗi nhỏ (<48dp) khó thao tác.
3. **Khoảng cách Nghiệp vụ**: `HistoryScreen` thiếu bộ lọc và tìm kiếm; `StudentHomeScreen` dùng từ khó tĩnh thay vì trích xuất từ lịch sử bài chấm; tồn tại các chuỗi văn bản debug ("Trạm Pi 4", "CSDL Room", "YOLOv8 DETECTED", "Chấm Offline 🧪").

### Danh mục Đề xuất Thay đổi Cụ thể (Actionable Changes):

#### Ưu tiên Cao (P0 - Visual & Token Parity):
1. **Đồng bộ 9 Mã màu Lỗi trong `Color.kt`**:
   - Thêm `ErrorBoSotThem = Color(0xFFEC4899)` (Pink-500)
   - Đổi `ErrorVietHoa = Color(0xFF2563EB)` (Blue-600, thay vì Amber)
   - Thêm `ErrorThayTheTu = Color(0xFF4F46E5)` (Indigo-600)
   - Thêm `ErrorDauCau = Color(0xFF0D9488)` (Teal-600)
2. **Cập nhật ánh xạ trong `PhotoBoundingBoxViewer.kt` (lines 97-153)**: Map đủ 9 loại lỗi tương ứng.
3. **Làm sạch `colors.xml` và `themes.xml`**: Thêm mã màu `emerald_primary` (`#059669`) và `background_cream` (`#FAF9F6`) cho Splash Window.

#### Ưu tiên Trung bình (P1 - Touch UX & Interaction):
1. **Tích hợp cử chỉ Pinch-to-zoom & Pan thật (`detectTransformGestures`)** trong `PhotoBoundingBoxViewer.kt`.
2. **Tăng vùng nhận diện cảm ứng (Touch Target Expansion)**: Bọc mỗi Bounding Box một vùng đệm vô hình tối thiểu 44dp x 44dp để giáo viên dễ chạm.
3. **Thanh lọc chuỗi kỹ thuật**:
   - Đổi `"vihandgrade.click • Trạm Pi 4 Online"` $\to$ `"Máy chủ ViHand Grade • Trực tuyến"`
   - Đổi `"YOLOv8 DETECTED • X LỖI"` $\to$ `"Đã phát hiện X lỗi chính tả"`
   - Đổi `"CSDL Room"` $\to$ `"Bộ nhớ máy"`
   - Xóa nút `"Chấm Offline 🧪"` trong `MainActivity.kt:587`.

#### Ưu tiên Thấp (P2 - Feature Parity Enrichment):
1. **Bổ sung Search & Filter Bar vào `HistoryScreen.kt`**: Tìm kiếm theo tên học sinh, lọc bài Chính tả / Tập làm văn.
2. **Động hóa Kho từ khó trong `StudentHomeScreen.kt`**: Trích xuất các từ sai từ `recentRecords.flatMap { it.errors }`.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC THỰC ĐỘC LẬP)

Để kiểm chứng độc lập báo cáo này, kiểm thử viên có thể thực hiện theo các bước:

1. **Xác thực Biên dịch Android**:
   ```powershell
   cd "c:\Users\Jackie Duong\Desktop\Web_sua_loi\android_app"
   .\gradlew.bat compileDebugKotlin
   ```
2. **Kiểm tra Unit Test UI & Theme**:
   ```powershell
   .\gradlew.bat testDebugUnitTest
   ```
3. **Kiểm tra Đối chiếu Token Màu**:
   - Mở file `app/globals.css` tại dòng 110, 127-234.
   - Mở file `android_app/app/src/main/java/com/example/ui/theme/Color.kt` tại dòng 10, 38-60.
   - So sánh trực tiếp giá trị HEX và tên định danh.
4. **Kiểm tra Giao diện Thực tế trên Android Emulator/Device**:
   - Chạy lệnh `assembleDebug` và cài đặt file APK lên thiết bị Android.
   - Đăng nhập bằng tài khoản Giáo viên (`teacher1` / `123456`) và Học sinh (`an.nv` / `123456`).
   - Mở màn hình Chấm bài và thử chạm vào các hộp khoanh lỗi để kiểm chứng kích thước điểm chạm và thao tác thu phóng.

---
*Báo cáo được lập bởi: Explorer 3 — Chuyên viên UI/UX & Design System Parity Audit*  
*Thời gian hoàn tất: 30/09/2026*
