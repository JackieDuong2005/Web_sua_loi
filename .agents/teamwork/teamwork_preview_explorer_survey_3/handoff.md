# Báo Cáo Khảo Sát & Đánh Giá Kỹ Thuật (Explorer 3 Handoff Report)
**Nhiệm vụ**: Điều tra R3 (Cử chỉ Pinch-to-zoom 2 ngón & Pan trên PhotoBoundingBoxViewer.kt) và Thiết lập Baseline Build/Test Android & Web.  
**Ngày thực hiện**: 2026-10-03  
**Tác giả**: Explorer 3  

---

## 1. Observation (Quan Sát Trực Tiếp)

### 1.1. Hiện trạng tệp `PhotoBoundingBoxViewer.kt`
Tệp nguồn: `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt` (726 dòng).

1. **Cấu trúc phân lớp hiển thị (Layout Tree)**:
   - **Card bọc ngoài** (`lines 293-304`):
     ```kotlin
     Card(
         modifier = Modifier
             .fillMaxWidth()
             .testTag("photo_bounding_box_viewer"),
         shape = RoundedCornerShape(18.dp),
         colors = CardDefaults.cardColors(
             containerColor = if (isDarkTheme) Color(0xFF0F172A) else Color(0xFFF8FAFC)
         ),
         border = BorderStroke(1.5.dp, if (isDarkTheme) Color(0xFF334155) else Color(0xFFE2E8F0)),
         elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
     )
     ```
   - **Header Bar** (`lines 306-398`): Chứa badge thống kê số lỗi ("Đã phát hiện X lỗi"), badge "Ảnh thực tế", nút bật/tắt hiển thị Bounding Box (`showBoundingBoxes`) và nút thu/phóng (`isZoomed`).
   - **Nút Zoom hiện tại** (`lines 386-397`):
     ```kotlin
     IconButton(
         onClick = { isZoomed = !isZoomed },
         modifier = Modifier.size(28.dp)
     ) {
         Icon(
             imageVector = if (isZoomed) Icons.Default.ZoomOut else Icons.Default.ZoomIn,
             contentDescription = if (isZoomed) "Thu nhỏ" else "Phóng to",
             tint = emeraldText,
             modifier = Modifier.size(18.dp)
         )
     }
     ```
   - **Container khung ảnh** (`lines 405-417`):
     ```kotlin
     val zoomModifier = if (isZoomed) {
         Modifier
             .fillMaxWidth()
             .horizontalScroll(rememberScrollState())
     } else {
         Modifier.fillMaxWidth()
     }

     Box(
         modifier = zoomModifier
             .clip(RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp))
             .background(if (isDarkTheme) Color(0xFF090D16) else Color(0xFFF1F5F9))
     )
     ```
   - **Inner Box (Chứa Layer 1 & Layer 2)** (`lines 418-435`):
     ```kotlin
     val innerImageModifier = if (isZoomed) {
         Modifier
             .width(540.dp)
             .wrapContentHeight()
     } else {
         Modifier
             .fillMaxWidth()
             .wrapContentHeight()
     }

     Box(
         modifier = innerImageModifier
             .onGloballyPositioned { coords ->
                 displayedImgWidthPx = coords.size.width.toFloat()
                 displayedImgHeightPx = coords.size.height.toFloat()
             }
     ) {
         // LAYER 1: Background Real Handwriting Photo
         ...
         // LAYER 2: Interactive Bounding Boxes Overlay anchored 1:1 on actual image surface
         if (showBoundingBoxes && displayedImgWidthPx > 0f && displayedImgHeightPx > 0f) {
             Box(modifier = Modifier.matchParentSize()) { ... }
         }
     }
     ```
   - **LAYER 1: Ảnh bài thi thực tế** (`lines 436-474`):
     - Dùng `Image(bitmap = resolvedBitmap.asImageBitmap(), modifier = Modifier.fillMaxWidth().wrapContentHeight(), contentScale = ContentScale.FillWidth)`.
     - Hoặc `AsyncImage(model = effectiveImageUrl, contentScale = ContentScale.FillWidth)`.
     - Hoặc `AuthenticNotebookPaperView(extractedText = result.extractedText, modifier = Modifier.fillMaxWidth().height(260.dp))` khi không có ảnh vật lý.
   - **LAYER 2: Lớp phủ Bounding Box** (`lines 476-587`):
     - Nằm trong `Box(modifier = Modifier.matchParentSize())`.
     - Mỗi box tính toán vị trí theo tỷ lệ:
       ```kotlin
       val leftDp = displayedWidthDp * safeRelX
       val topDp = displayedHeightDp * safeRelY
       val widthDp = (displayedWidthDp * safeRelW).coerceAtLeast(44.dp)
       val heightDp = (displayedHeightDp * safeRelH).coerceAtLeast(32.dp)
       ```
     - Box Modifier: `.offset(x = leftDp, y = topDp).size(width = widthDp, height = heightDp).scale(animScale).zIndex(...).border(...).background(...).clickable { onSelectError(err) }`.
     - Floating badge pill hiển thị số thứ tự và từ sửa: `#${index + 1} ✓ ${err.correctedWord}`.

2. **Cách Bounding Box ánh xạ tọa độ vào ảnh**:
   - Tọa độ tương đối được chuẩn hóa từ model `ErrorBox`:
     - `safeRelX = rawRelX.coerceIn(0f, 0.95f)`: Hỗ trợ cả tọa độ chuẩn hóa `rel_x1` [0..1] lẫn pixel `x1 / detectedWidth`.
     - `safeRelY = rawRelY.coerceIn(0f, 0.95f)`: Hỗ trợ `rel_y1` [0..1] hoặc pixel `y1 / detectedHeight`.
     - `safeRelW = rawRelW.coerceIn(0.035f, 0.35f)`.
     - `safeRelH = rawRelH.coerceIn(0.035f, 0.16f)`.
   - Chuyển đổi sang DP dựa trên kích thước layout thực tế `displayedImgWidthPx` & `displayedImgHeightPx` đo được từ `onGloballyPositioned`.
   - Vì Layer 2 dùng `Modifier.matchParentSize()` bên trong cùng một Box với Layer 1 (Ảnh), tọa độ Bounding Box khớp chính xác 1:1 với kích thước hiển thị của ảnh trên màn hình.

3. **Hạn chế kỹ thuật hiện tại của chức năng Zoom**:
   - Hiện tại zoom chỉ là biến boolean `isZoomed`: khi `true`, nó ép chiều rộng tĩnh `540.dp` và chỉ cho phép cuộn ngang một chiều bằng `Modifier.horizontalScroll(rememberScrollState())`.
   - Hoàn toàn KHÔNG có cử chỉ thu phóng 2 ngón (Pinch-to-zoom).
   - KHÔNG có cử chỉ kéo di chuyển đa hướng (2D Pan).
   - KHÔNG hỗ trợ dải tỷ lệ zoom liên tục (từ 1.0x đến 4.0x).
   - Khi cuộn ngang, nội dung kéo có thể gây giật và không đồng bộ với gesture tự nhiên của giáo viên.

---

### 1.2. Kiểm tra Baseline Build & Kiểm thử Tự động

1. **TypeScript Baseline Web (`npx tsc --noEmit`)**:
   - Lệnh: `npx tsc --noEmit` tại thư mục gốc `c:\Users\Jackie Duong\Desktop\Web_sua_loi`.
   - Kết quả: **Exit code 0**, không có bất kỳ lỗi biên dịch nào.

2. **Android Unit Test Baseline (`.\gradlew.bat testDebugUnitTest`)**:
   - Lệnh: `.\gradlew.bat testDebugUnitTest` tại thư mục `c:\Users\Jackie Duong\Desktop\Web_sua_loi\android_app`.
   - Kết quả: **BUILD SUCCESSFUL in 10s** (Exit code 0).
   - Báo cáo HTML tại: `android_app/app/build/reports/tests/testDebugUnitTest/index.html`:
     - **Tổng số test**: 5 tests.
     - **Thất bại**: 0.
     - **Bị bỏ qua**: 0.
     - **Tỷ lệ thành công**: **100%**.
     - Danh sách Test Classes:
       1. `com.example.ExampleRobolectricTest` (3 tests, 37.414s):
          - `grading result screen renders 3 tabs and can switch modes` (passed)
          - `read string from context` (passed)
          - `camera scan screen renders controls and viewfinder` (passed)
       2. `com.example.ExampleUnitTest` (1 test, 0.002s):
          - `addition_isCorrect` (passed)
       3. `com.example.GreetingScreenshotTest` (1 test, 26.032s):
          - `greeting_screenshot` (passed)

3. **Cấu hình Kiểm thử Android**:
   - Framework: JUnit 4.13.2, Robolectric 4.16.1 (`@Config(sdk = [36])`), Compose Test JUnit4 (`createComposeRule()`), Roborazzi 1.59.0.
   - Thư mục chứa test: `android_app/app/src/test/java/com/example/`.
   - Robolectric cho phép chạy Compose Test Rule trực tiếp trên máy chủ / host JVM mà không cần kết nối máy thật hay Android Emulator.

---

### 1.3. Quan sát các tệp liên quan đến R1, R2, R4

- **R4 - `android_app/app/src/main/res/values/colors.xml`**:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <resources>
      <color name="purple_200">#FFBB86FC</color>
      <color name="purple_500">#FF6200EE</color>
      <color name="purple_700">#FF3700B3</color>
      <color name="teal_200">#FF03DAC5</color>
      <color name="teal_700">#FF018786</color>
      <color name="black">#FF000000</color>
      <color name="white">#FFFFFFFF</color>
  </resources>
  ```
  -> **Thiếu**: `emerald_primary` (`#FF059669`) và `background_cream` (`#FFFAF9F6`).
- **R1 - `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt`**:
  - Thiếu thanh tìm kiếm `OutlinedTextField` và 2 hàng Filter Chips (Thể loại & Khoảng điểm).
- **R2 - `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt`**:
  - Dòng 338-344 đang gán cứng 5 từ khó:
    ```kotlin
    val wordsList = listOf(
        Pair("ru bé ngủ say", "Chú ý r/d và dấu thanh"),
        Pair("thay cho gió trời", "Chú ý âm đầu gi/d"),
        Pair("ngọt ngào", "Chú ý vần o-a-t"),
        Pair("chăm chỉ", "Chú ý âm ch/tr"),
        Pair("xinh xắn", "Chú ý âm s/x")
    )
    ```
  - Cần chuyển thành trích xuất động từ `errors` của các bài chấm đã lưu (`errors.map { it.originalWord to it.explanation }`).

---

## 2. Logic Chain (Chuỗi Lập Luận Kỹ Thuật)

### 2.1. Giải pháp Tích hợp Pinch-to-zoom & Pan trên `PhotoBoundingBoxViewer.kt` (R3)

#### Bước 1: Quản lý trạng thái Biến đổi (Transformation State)
Thay thế biến nhị phân `isZoomed: Boolean` bằng 3 giá trị trạng thái liên tục:
```kotlin
var scale by remember { mutableFloatStateOf(1.0f) }
var offsetX by remember { mutableFloatStateOf(0f) }
var offsetY by remember { mutableFloatStateOf(0f) }
```

#### Bước 2: Bắt cử chỉ 2 ngón tay bằng `Modifier.pointerInput` & `detectTransformGestures`
Gắn cử chỉ vào Container Box ngoài của vùng hiển thị ảnh:
```kotlin
Modifier.pointerInput(displayedImgWidthPx, displayedImgHeightPx) {
    detectTransformGestures { centroid, pan, zoom, _ ->
        val newScale = (scale * zoom).coerceIn(1.0f, 4.0f)
        
        // Giới hạn khoảng dịch chuyển (Pan boundary limits) theo kích thước ảnh hiện tại
        val maxOffsetX = (displayedImgWidthPx * (newScale - 1f) / 2f).coerceAtLeast(0f)
        val maxOffsetY = (displayedImgHeightPx * (newScale - 1f) / 2f).coerceAtLeast(0f)

        if (newScale <= 1.0f) {
            scale = 1.0f
            offsetX = 0f
            offsetY = 0f
        } else {
            scale = newScale
            offsetX = (offsetX + pan.x).coerceIn(-maxOffsetX, maxOffsetX)
            offsetY = (offsetY + pan.y).coerceIn(-maxOffsetY, maxOffsetY)
        }
    }
}
```

#### Bước 3: Đảm bảo Ảnh và Toàn bộ Bounding Box đồng biến hình 100% không lệch tọa độ (Co-transformation without drift)
- **Vấn đề tiềm ẩn**: Nếu áp dụng transform riêng rẽ cho ảnh và cho từng bounding box, độ trễ frame hoặc sai số làm tròn số thực sẽ làm hộp lỗi bị trôi lệch khỏi nét mực của ảnh khi người dùng zoom lớn (đặc biệt ở mức 4x).
- **Giải pháp triệt để**:
  - Đặt `graphicsLayer` lên chính **Inner Box** — nơi bao bọc CẢ Layer 1 (Ảnh) VÀ Layer 2 (Lớp phủ Bounding Boxes):
  ```kotlin
  Box(
      modifier = Modifier
          .fillMaxWidth()
          .wrapContentHeight()
          .graphicsLayer {
              scaleX = scale
              scaleY = scale
              translationX = offsetX
              translationY = offsetY
          }
          .onGloballyPositioned { coords ->
              displayedImgWidthPx = coords.size.width.toFloat()
              displayedImgHeightPx = coords.size.height.toFloat()
          }
  ) {
      // LAYER 1: Background Real Handwriting Photo
      ...
      // LAYER 2: Overlay Bounding Boxes (Modifier.matchParentSize())
      ...
  }
  ```
  - **Cơ chế**: Compose RenderNode / GPU DisplayList sẽ thực hiện ma trận biến đổi affine duy nhất trên RenderNode cha. Cả ảnh và tất cả các box con sẽ cùng co giãn và dịch chuyển theo đúng tọa độ pixel của card cha mà không cần tính toán lại bất kỳ tọa độ con nào. Tỷ lệ tương quan giữa hộp lỗi và nét chữ là tuyệt đối 1:1, không bao giờ xảy ra hiện tượng drift!

#### Bước 4: Chống tràn giao diện (Clipping)
- Card và Container Box giữ nguyên modifier `.clip(RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp))`.
- Khi ảnh phóng to 4x và di chuyển, Compose `clip` cắt bỏ mọi pixel vượt ra ngoài khung card, đảm bảo không che lấp thanh Header ở trên và các chip thể loại ở dưới.

#### Bước 5: Nâng cấp Nút Zoom trên Header
- Nút `IconButton` trên Header bar đồng bộ với trạng thái `scale`:
  ```kotlin
  IconButton(
      onClick = {
          if (scale > 1.0f) {
              scale = 1.0f
              offsetX = 0f
              offsetY = 0f
          } else {
              scale = 2.0f
              offsetX = 0f
              offsetY = 0f
          }
      },
      modifier = Modifier.size(28.dp).testTag("photo_zoom_button")
  ) {
      Icon(
          imageVector = if (scale > 1.05f) Icons.Default.ZoomOut else Icons.Default.ZoomIn,
          contentDescription = if (scale > 1.05f) "Thu nhỏ" else "Phóng to",
          tint = emeraldText,
          modifier = Modifier.size(18.dp)
      )
  }
  ```

---

### 2.2. Chiến lược Kiểm thử Tự động cho R1, R2, R3, R4

Dựa trên cấu trúc Robolectric đang hoạt động ổn định ở SDK 36, các test case tự động cần bổ sung bao gồm:

1. **Kiểm thử R4 (`colors.xml`)**:
   - Đọc trực tiếp resource từ Android context trong Robolectric:
   ```kotlin
   @Test
   fun `verify emerald_primary and background_cream colors in resources`() {
       val context = ApplicationProvider.getApplicationContext<Context>()
       val emerald = context.getColor(R.color.emerald_primary)
       val cream = context.getColor(R.color.background_cream)
       assertEquals(0xFF059669.toInt(), emerald)
       assertEquals(0xFFFAF9F6.toInt(), cream)
   }
   ```

2. **Kiểm thử R3 (`PhotoBoundingBoxViewer.kt`)**:
   - Test toán học thuần túy: clamp scale trong khoảng [1.0f, 4.0f].
   - Test toán học thuần túy: clamp pan offset giới hạn không cho kéo ra ngoài viền ảnh.
   - Test reset offset về (0, 0) khi scale <= 1.0f.
   - Test Robolectric UI: Render `PhotoBoundingBoxViewer`, kiểm tra hiển thị `photo_bounding_box_viewer`, bấm nút `photo_zoom_button` chuyển đổi trạng thái mượt mà.

3. **Kiểm thử R1 (`HistoryScreen.kt`)**:
   - Test tìm kiếm theo tên học sinh ("Nguyễn Văn A") lọc đúng bài thi tương ứng.
   - Test chọn filter chip thể loại ("Chính tả", "Tập làm văn") lọc đúng danh sách bài thi.
   - Test chọn filter chip khoảng điểm (">= 9.0", "8.0-8.9", "6.5-7.9", "< 6.5").
   - Test trường hợp không có kết quả phù hợp hiển thị thông báo rỗng.

4. **Kiểm thử R2 (`StudentHomeScreen.kt`)**:
   - Test khi danh sách `recentRecords` có lỗi chính tả: trích xuất đúng các cặp `(originalWord, explanation)` từ các `errors`.
   - Test khi danh sách `recentRecords` rỗng: hiển thị fallback danh sách từ khó chuẩn SGK.

---

## 3. Caveats (Lưu Ý & Điểm Cần Chú Ý)

1. **Touch Slop & Click Handling**:
   - Trong Compose, `detectTransformGestures` chỉ tiêu thụ cử chỉ khi khoảng cách di chuyển vượt qua ngưỡng `touchSlop`.
   - Các Bounding Box con có `.clickable { onSelectError(err) }` sẽ tiếp tục nhận được sự kiện nhấp (tap) độc lập của giáo viên nếu giáo viên chỉ bấm chọn lỗi mà không kéo di chuyển ảnh.
2. **Kích thước layout khi ảnh chưa tải xong**:
   - Khi ảnh đang tải, `displayedImgWidthPx` và `displayedImgHeightPx` có thể ban đầu bằng 0f.
   - Trong biểu thức tính toán `maxOffsetX`, cần dùng `coerceAtLeast(0f)` để tránh giá trị âm khi tính toán biên kéo.
3. **Môi trường Windows File Locking**:
   - Khi chạy `.\gradlew.bat testDebugUnitTest` bình thường (incremental), lệnh chạy cực nhanh trong 10 giây và thành công 100%.
   - Tránh dùng cờ `--rerun-tasks` nếu có IDE hoặc background watcher đang đọc thư mục `build/test-results/` vì Windows NTFS có thể gây lỗi `NoSuchFileException` trên tệp nhị phân tạm thời `in-progress-results-*.bin`. Chạy build tiêu chuẩn không có cờ này là ổn định nhất.

---

## 4. Conclusion (Kết Luận Đề Xuất)

1. **R3 Khả thi 100%**:
   - Loại bỏ hoàn toàn giải pháp cũ (chiều rộng cố định 540dp + `horizontalScroll`).
   - Tích hợp mô hình `graphicsLayer` trên Inner Box kết hợp `detectTransformGestures` trên Outer Container.
   - Đảm bảo độ chính xác tọa độ 100% giữa ảnh bài thi và các hộp Bounding Box, tỷ lệ thu phóng mượt mà từ 1.0x đến 4.0x, giới hạn biên kéo chuẩn xác và tự động reset khi về 1.0x.
2. **Baseline đã sẵn sàng**:
   - `npx tsc --noEmit` đạt 0 lỗi (Exit 0).
   - `gradlew.bat testDebugUnitTest` đạt 5/5 tests (100% Success).
   - Các test mới cho R1, R2, R3, R4 có thể tích hợp trực tiếp vào `ExampleRobolectricTest.kt` hoặc tạo tệp test chuyên biệt `FeatureParityPhase2Test.kt` sử dụng Robolectric SDK 36.

---

## 5. Verification Method (Phương Pháp Xác Minh Độc Lập)

1. **Chạy kiểm tra Web Type Safety**:
   ```bash
   npx tsc --noEmit
   ```
   *Kỳ vọng*: Thoát mã 0, 0 lỗi TypeScript.

2. **Chạy toàn bộ kiểm thử Unit Test Android**:
   ```bash
   cd android_app
   .\gradlew.bat testDebugUnitTest
   ```
   *Kỳ vọng*: Toàn bộ các test (cũ và mới) vượt qua 100%, tạo báo cáo thành công tại `android_app/app/build/reports/tests/testDebugUnitTest/index.html`.

3. **Kiểm tra trực quan code của `PhotoBoundingBoxViewer.kt`**:
   - Kiểm tra `graphicsLayer { scaleX = scale; scaleY = scale; translationX = offsetX; translationY = offsetY }` bọc cả ảnh và overlay box.
   - Kiểm tra không còn `horizontalScroll` hay `width(540.dp)`.
   - Kiểm tra cử chỉ `detectTransformGestures` có clamp zoom trong `[1.0f, 4.0f]`.
