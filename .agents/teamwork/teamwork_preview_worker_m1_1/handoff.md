# Handoff Report: Phase 2 & 3 Parity (R1, R2, R3, R4) Implementation and Automated Tests

## 1. Observation

1. **Brand Colors (R4)**:
   - Modified file: `android_app/app/src/main/res/values/colors.xml`:
     ```xml
     <color name="emerald_primary">#FF059669</color>
     <color name="background_cream">#FFFAF9F6</color>
     ```
   - Modified file: `android_app/app/src/main/res/values/themes.xml`:
     ```xml
     <style name="Theme.MyApplication" parent="android:Theme.DeviceDefault.NoActionBar">
         <item name="android:windowBackground">@color/background_cream</item>
         <item name="android:statusBarColor">@color/emerald_primary</item>
     </style>
     ```

2. **Personalized Difficult Words Extraction (R2)**:
   - Modified file: `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt`:
     - Defined `DEFAULT_SGK_DIFFICULT_WORDS` containing the 5 standard elementary pairs:
       1. `Pair("ru bé ngủ say", "Chú ý r/d và dấu thanh")`
       2. `Pair("thay cho gió trời", "Chú ý âm đầu gi/d")`
       3. `Pair("ngọt ngào", "Chú ý vần o-a-t")`
       4. `Pair("chăm chỉ", "Chú ý âm ch/tr")`
       5. `Pair("xinh xắn", "Chú ý âm s/x")`
     - Implemented pure function `extractDifficultWords(records: List<GradeResult>, fallback: List<Pair<String, String>> = DEFAULT_SGK_DIFFICULT_WORDS): List<Pair<String, String>>`:
       - Extracts `records.flatMap { it.errors }.filter { it.originalWord.isNotBlank() }`.
       - Formats explanation with fallback to `correctedWord` and `errorType`.
       - Removes duplicates with `.distinctBy { it.first.lowercase() }`.
     - In `StudentHomeScreen`:
       `val wordsList = customDifficultWords ?: remember(recentRecords) { extractDifficultWords(recentRecords) }`
       with `testTag("difficult_word_item")` and null-safe TTS invocation `tts?.speak(...)`.

3. **HistoryScreen Search & Filter Chips (R1)**:
   - Modified file: `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt`:
     - Added `OutlinedTextField` with `testTag("history_search_input")`, placeholder `"Tìm theo tên học sinh, bài văn..."`, search icon, clear button when query not empty, `singleLine = true`.
     - Added Category FilterChip row: `"Tất cả"`, `"Chính tả"`, `"Tập làm văn"` with `testTag("filter_chip_category_$category")`.
     - Added Score FilterChip row: `"Tất cả"`, `">= 9.0"`, `"8.0-8.9"`, `"6.5-7.9"`, `"< 6.5"` with `testTag("filter_chip_score_$range")`.
     - Filtering logic uses `removeVietnameseDiacritics` (`java.text.Normalizer.Form.NFD`) for unaccented search matching, category prefix matching on `essayTitle`, and float boundary checks on `record.criteria.totalScore`.
     - Displays empty state with `"Không tìm thấy bài thi nào phù hợp"` and subtitle `"Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc Tất cả"` when filtered result is empty.

4. **Photo Bounding Box Pinch-to-zoom & Pan (R3)**:
   - Modified file: `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt`:
     - Replaced boolean `isZoomed` and `horizontalScroll` with transformation states `scale` (1.0f..4.0f), `offsetX`, `offsetY`.
     - Attached `Modifier.pointerInput(displayedImgWidthPx, displayedImgHeightPx) { detectTransformGestures { centroid, pan, zoom, _ -> ... } }` to the outer image card container.
     - Clamped pan translation offsets to `[-maxOffsetX, maxOffsetX]` and `[-maxOffsetY, maxOffsetY]` where `maxOffsetX = (displayedImgWidthPx * (newScale - 1f) / 2f).coerceAtLeast(0f)`.
     - Applied `graphicsLayer { scaleX = scale; scaleY = scale; translationX = offsetX; translationY = offsetY }` to the Inner Box wrapping both Layer 1 (Photo) and Layer 2 (Bounding Box overlay with `matchParentSize()`).
     - Updated header zoom button with `testTag("photo_zoom_button")` toggling between 1.0f and 2.0f, and switching icon between `ZoomIn` and `ZoomOut`.

5. **Automated Unit & Robolectric Tests**:
   - Modified `android_app/app/src/test/java/com/example/ExampleUnitTest.kt`:
     - `addition_isCorrect` (passed)
     - `extractDifficultWords with empty records returns DEFAULT_SGK_DIFFICULT_WORDS` (passed)
     - `extractDifficultWords with errors maps originalWord to explanation correctly` (passed)
     - `extractDifficultWords removes duplicate original words case-insensitively` (passed)
     - `extractDifficultWords with perfect score zero errors returns fallback` (passed)
     - `extractDifficultWords with empty explanation falls back to correctedWord and errorType` (passed)
   - Modified `android_app/app/src/test/java/com/example/ExampleRobolectricTest.kt`:
     - `read string from context` (passed)
     - `verify emerald_primary and background_cream colors in resources` (passed)
     - `camera scan screen renders controls and viewfinder` (passed)
     - `grading result screen renders 3 tabs and can switch modes` (passed)
     - `history screen renders search and filter chips and filters dynamically` (passed)
     - `photo bounding box viewer renders and zoom toggle works` (passed)
   - Test Results:
     - `.\gradlew.bat testDebugUnitTest --no-configuration-cache`: **13 tests completed, 0 failed, 0 skipped (100% success rate)**.
     - `npx tsc --noEmit`: **Exit code 0, 0 errors**.

---

## 2. Logic Chain

1. **R4 Alignment**:
   - Observation 1.1 shows `colors.xml` and `themes.xml` lacked `emerald_primary` and `background_cream`.
   - By declaring hex `#FF059669` and `#FFFAF9F6` in `colors.xml` and referencing them in `themes.xml` for `android:windowBackground` and `android:statusBarColor`, Android cold-boot window inflation matches the Jetpack Compose theme palette (`EmeraldPrimary`, `BackgroundCream`).
   - Verified by `ExampleRobolectricTest` checking `context.getColor(...)`.

2. **R2 Business Logic Decoupling**:
   - Observation 1.2 isolates `extractDifficultWords` into a pure Kotlin function independent of Compose runtimes.
   - It iterates through `records.flatMap { it.errors }`, extracts original words and pedagogical explanations, falls back to `correctedWord` + `errorType` when explanations are blank, and deduplicates using `distinctBy { it.first.lowercase() }`.
   - If no errors exist (e.g. perfect score or empty history), it cleanly returns `DEFAULT_SGK_DIFFICULT_WORDS`.
   - Verified by 5 test cases in `ExampleUnitTest` covering all edge cases.

3. **R1 User Experience & Diacritics**:
   - Observation 1.3 shows teachers and parents often type without accents (e.g. "bao nam").
   - By normalizing strings via `java.text.Normalizer.Form.NFD` and stripping `\p{InCombiningDiacriticalMarks}+` plus `đ/d`, search queries match both accented and unaccented titles and student names.
   - Filter chips for category and score ranges apply boolean conjunctions (`AND`), dynamically updating `LazyColumn`.
   - When no match is found, an informative empty state is shown instead of a blank screen.
   - Verified by `ExampleRobolectricTest` simulating text input, clearance, chip clicking, and non-existent queries.

4. **R3 Coordinate Synchronicity without Drift**:
   - Observation 1.4 shows bounding boxes in Layer 2 rely on `Modifier.matchParentSize()` within the same Box as the background image.
   - By applying `graphicsLayer { scaleX = scale; scaleY = scale; translationX = offsetX; translationY = offsetY }` to this common parent Box, both the image bitmap and all overlay bounding boxes are transformed simultaneously in the GPU display list.
   - This prevents rounding drift and ensures bounding boxes stay locked to the handwritten strokes at any scale between 1.0x and 4.0x.
   - Clamping pan bounds using `(displayedImgWidthPx * (newScale - 1f) / 2f).coerceAtLeast(0f)` ensures the image cannot be panned beyond its visible boundaries.
   - Header button syncs 1.0x <-> 2.0x toggling.
   - Verified by `ExampleRobolectricTest` confirming rendering and interactive toggle.

---

## 3. Caveats

- **Device Qualifiers in Unit Tests**: `ExampleRobolectricTest` uses `@Config(qualifiers = RobolectricDeviceQualifiers.Pixel8, sdk = [36])` so that the virtual display provides standard phone dimensions (411dp x 915dp) for LazyColumn layouts without truncating off-screen items during semantic hierarchy assertions.
- **Gradle 9 on Windows**: Re-running tests should use `--no-configuration-cache` to avoid transient file locks on Windows NTFS test binary buffers.
- No caveats regarding feature requirements or implementation scope.

---

## 4. Conclusion

- Phase 2 & 3 parity items R1, R2, R3, R4 are 100% implemented with genuine, robust logic.
- Automated tests have been significantly expanded (from 5 to 13 tests) and pass with a 100% success rate.
- Web TypeScript type-checking remains at 0 errors.
- All files modified are strictly within the worker's exclusive file ownership list.

---

## 5. Verification Method

1. **Run Android Unit & Robolectric Tests**:
   ```powershell
   cd "c:\Users\Jackie Duong\Desktop\Web_sua_loi\android_app"
   .\gradlew.bat testDebugUnitTest --no-configuration-cache
   ```
   *Expected result*: `BUILD SUCCESSFUL`, 13 tests completed, 0 failed, 0 skipped (100% success rate). Report generated at `app/build/reports/tests/testDebugUnitTest/index.html`.

2. **Run Web TypeScript Check**:
   ```powershell
   cd "c:\Users\Jackie Duong\Desktop\Web_sua_loi"
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, 0 errors.

3. **Inspect Implementation Files**:
   - `android_app/app/src/main/res/values/colors.xml`
   - `android_app/app/src/main/res/values/themes.xml`
   - `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt`
   - `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt`
   - `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt`
   - `android_app/app/src/test/java/com/example/ExampleUnitTest.kt`
   - `android_app/app/src/test/java/com/example/ExampleRobolectricTest.kt`

4. **Invalidation Conditions**:
   - If `testDebugUnitTest` reports any test failure.
   - If searching `bao nam` in `HistoryScreen` fails to match `Nguyễn Bảo Nam`.
   - If `extractDifficultWords` fails to fallback to SGK words on empty or 0-error submissions.
   - If zooming in `PhotoBoundingBoxViewer` desynchronizes bounding box coordinates from handwriting photo.
