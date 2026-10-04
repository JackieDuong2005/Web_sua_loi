# Handoff Report: Survey R1 (HistoryScreen Search & Filter) & R4 (Brand Colors)

## 1. Observation

### 1.1 HistoryScreen.kt and State Architecture
- **File location**: `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt` (lines 51–57)
  ```kotlin
  @OptIn(ExperimentalMaterial3Api::class)
  @Composable
  fun HistoryScreen(
      records: List<GradeResult>,
      onSelectRecord: (GradeResult) -> Unit,
      onDeleteRecord: (String) -> Unit,
      onBack: () -> Unit,
      modifier: Modifier = Modifier
  )
  ```
- **State Holder / Caller**: In `android_app/app/src/main/java/com/example/MainActivity.kt` (lines 436–447):
  ```kotlin
  "history" -> {
      val displayRecords = if (serverGrades.isNotEmpty()) serverGrades else historyList
      HistoryScreen(
          records = displayRecords,
          onSelectRecord = { record ->
              viewModel.loadSample(record)
              activeTab = "grade"
          },
          onDeleteRecord = { id -> viewModel.deleteHistoryItem(id) },
          onBack = { activeTab = "home" }
      )
  }
  ```
  Where `historyList` is collected from `viewModel.historyRecords` (`MainViewModel.kt` lines 69–82), combining Room repository records and `currentUser` role filtering.

- **Data Model Fields**: `com.example.data.model.GradeResult` in `android_app/app/src/main/java/com/example/data/model/GradeModels.kt` (lines 45–65):
  * Student Name: `studentName: String = "Học sinh Tiểu học"` (line 48)
  * Class Name: `className: String = "Lớp 3A"` (line 49)
  * Title / Essay Name: `essayTitle: String` (line 50)
  * Criteria & Scores: `criteria: GradeCriteria` (line 51)
    - `totalScore: Float` (line 26)
    - `spellingScore: Float` (line 22)
    - `formatScore: Float` (line 23)
    - `contentScore: Float` (line 24)
    - `creativityScore: Float` (line 25)
    - `ratingLevel: String` (lines 28–34)
    - `gradeBadge: String` (lines 36–42)
  * Timestamp: `timestamp: Long` (line 47)
  * Category / Subject: There is no separate `category` field in `GradeResult`. The subject category is indicated in `essayTitle` (e.g. `"Chính tả (Nghe - Viết): Tiếng Chim Buổi Sáng"`, `"Tập làm văn: Mái Trường Em Yêu"` in `SampleEssays.kt` lines 14 & 79).

- **Current UI Layout**: `HistoryScreen.kt` lines 80–140:
  * Currently contains a `Scaffold` with `TopAppBar`.
  * If `records.isEmpty()`, displays a full-screen empty state `Box` with "Chưa có bài thi nào được lưu" (lines 81–107).
  * If `records.isNotEmpty()`, directly renders `LazyColumn` with a static total counter item (`"Tổng số ${records.size} bài thi đã lưu trong Bộ nhớ thiết bị"`, line 119) and `items(records)`.
  * No search text field and no filter chips currently exist in `HistoryScreen.kt`.

### 1.2 Brand Color Tokens & Themes
- **Current `colors.xml`**: `android_app/app/src/main/res/values/colors.xml` (lines 1–10):
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
  Neither `emerald_primary` nor `background_cream` is defined in XML resources.
- **Compose Design System**: `android_app/app/src/main/java/com/example/ui/theme/Color.kt`:
  * `val EmeraldPrimary = Color(0xFF059669)` (line 10)
  * `val BackgroundCream = Color(0xFFFAF9F6)` (line 16)
- **Current `themes.xml`**: `android_app/app/src/main/res/values/themes.xml` (lines 1–5):
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <resources>
      <style name="Theme.MyApplication" parent="android:Theme.DeviceDefault.NoActionBar" />
  </resources>
  ```
  Referenced by `android:theme="@style/Theme.MyApplication"` in `AndroidManifest.xml` (lines 18, 23). Does not specify splash window background or status bar colors.

### 1.3 Existing Tests
- `android_app/app/src/test/java/com/example/ExampleRobolectricTest.kt` (lines 1–80):
  * Tests `read string from context`
  * Tests `camera scan screen renders controls and viewfinder`
  * Tests `grading result screen renders 3 tabs and can switch modes`
- `android_app/app/src/test/java/com/example/ExampleUnitTest.kt` (lines 11–16): basic math test.
- `android_app/app/src/test/java/com/example/GreetingScreenshotTest.kt`: roborazzi screenshot test.
- **Observation**: Zero existing tests for `HistoryScreen` or its filtering logic.
- **Baseline Test Execution**:
  * `npx tsc --noEmit` exited with code 0 (0 errors).
  * `.\gradlew.bat testDebugUnitTest --no-configuration-cache` passed in 46s: 5 tests, 0 failures, 0 skipped.

---

## 2. Logic Chain

### 2.1 UI Placement and Component Structure for R1
1. **Search Bar (`OutlinedTextField`) Placement**:
   - Pinned at the top of the content area (between `TopAppBar` and the list).
   - Placing it inside a parent `Column` above the `LazyColumn` guarantees it remains accessible when scrolling through lengthy submissions and stays visible even when filters produce 0 results.
   - Text input should feature:
     * `placeholder = { Text("Tìm theo tên học sinh, bài văn...") }`
     * `leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Tìm kiếm") }`
     * `trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Clear, contentDescription = "Xóa") } }`
     * `singleLine = true`, `modifier = Modifier.fillMaxWidth().testTag("history_search_input")`
     * Styled with `RoundedCornerShape(12.dp)` and `EmeraldPrimary` focus border.

2. **Filter Chip Rows Structure**:
   - Material 3 `FilterChip` (`androidx.compose.material3.FilterChip`) is used across the project (e.g., `DictationScreen.kt:481`, `ReportsAnalyticsScreen.kt:47`).
   - Row 1 (Category / Thể loại):
     * Label: `"Thể loại:"`
     * Chips: `listOf("Tất cả", "Chính tả", "Tập làm văn")`
     * Test tag: `"filter_chip_category_$category"`
   - Row 2 (Score Range / Khoảng điểm):
     * Label: `"Điểm số:"`
     * Chips: `listOf("Tất cả", ">= 9.0", "8.0-8.9", "6.5-7.9", "< 6.5")`
     * Test tag: `"filter_chip_score_$range"`
   - Both rows wrapped in `Row(modifier = Modifier.horizontalScroll(rememberScrollState()))` with `spacedBy(8.dp)` to prevent overflow on smaller screens.

3. **Filtering Engine Logic**:
   - State variables inside `HistoryScreen`:
     ```kotlin
     var searchQuery by rememberSaveable { mutableStateOf("") }
     var selectedCategory by rememberSaveable { mutableStateOf("Tất cả") }
     var selectedScoreRange by rememberSaveable { mutableStateOf("Tất cả") }
     ```
   - Multi-predicate filtering (`AND` composition):
     * **Search Matching**:
       - Case-insensitive string search on `record.studentName` and `record.essayTitle`.
       - Vietnamese Diacritics/Accents Stripping (Unaccented Search):
         Teachers or parents often search without accents (e.g., "bao nam" for "Nguyễn Bảo Nam", "tieng chim" for "Tiếng Chim Buổi Sáng").
         Using canonical Java `Normalizer`:
         ```kotlin
         private fun String.removeVietnameseDiacritics(): String {
             val nfd = java.text.Normalizer.normalize(this, java.text.Normalizer.Form.NFD)
             return "\\p{InCombiningDiacriticalMarks}+".toRegex().replace(nfd, "")
                 .replace('đ', 'd').replace('Đ', 'D')
         }
         ```
         Matches if normalized name or title contains normalized search query, OR standard `.contains(query, ignoreCase = true)`.
     * **Category Matching**:
       - `"Tất cả"` -> `true`
       - `"Chính tả"` -> `record.essayTitle.contains("chính tả", ignoreCase = true) || !record.essayTitle.contains("tập làm văn", ignoreCase = true)`
       - `"Tập làm văn"` -> `record.essayTitle.contains("tập làm văn", ignoreCase = true)`
     * **Score Range Matching**:
       - `"Tất cả"` -> `true`
       - `">= 9.0"` -> `record.criteria.totalScore >= 9.0f`
       - `"8.0-8.9"` -> `record.criteria.totalScore >= 8.0f && record.criteria.totalScore < 9.0f`
       - `"6.5-7.9"` -> `record.criteria.totalScore >= 6.5f && record.criteria.totalScore < 8.0f`
       - `"< 6.5"` -> `record.criteria.totalScore < 6.5f`
   - **Empty Filter Result Feedback**:
     * If `records.isNotEmpty()` but `filteredRecords.isEmpty()`, display a clean "Không tìm thấy bài thi nào phù hợp" banner with subtitle "Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc Tất cả".

### 2.2 Brand Colors in XML & Splash Window for R4
1. Add the two required brand color hex codes to `android_app/app/src/main/res/values/colors.xml`:
   ```xml
   <color name="emerald_primary">#FF059669</color>
   <color name="background_cream">#FFFAF9F6</color>
   ```
2. Reference these tokens in `android_app/app/src/main/res/values/themes.xml`:
   ```xml
   <style name="Theme.MyApplication" parent="android:Theme.DeviceDefault.NoActionBar">
       <item name="android:windowBackground">@color/background_cream</item>
       <item name="android:statusBarColor">@color/emerald_primary</item>
   </style>
   ```
   This ensures that Android OS renders the brand-matching cream canvas and emerald status bar immediately on cold boot before Jetpack Compose completes inflation.

---

## 3. Caveats
1. **Category Field Absence**: `GradeResult` does not have a separate `val category: String` property. All existing mock samples and backend payloads store category prefixes inside `essayTitle` (e.g., `"Chính tả..."`, `"Tập làm văn..."`). The filtering logic must safely fall back to "Chính tả" for dictations or poem titles not containing "Tập làm văn".
2. **Configuration Cache on Windows**: When running Gradle test commands with Gradle 9 on Windows, reusing the configuration cache can cause `NoSuchFileException` on temporary binary test result files. Using `--no-configuration-cache` completely circumvents this issue.

---

## 4. Conclusion
1. **R1 (HistoryScreen search & filter)**:
   - Target file: `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt`
   - Needs:
     * Local state (`searchQuery`, `selectedCategory`, `selectedScoreRange`).
     * `OutlinedTextField` with testTag `"history_search_input"`.
     * Two `Row`s with Material 3 `FilterChip`: Category (`Tất cả`, `Chính tả`, `Tập làm văn`) and Score (`Tất cả`, `>= 9.0`, `8.0-8.9`, `6.5-7.9`, `< 6.5`).
     * Real-time multi-filter predicate handling case-insensitivity and Vietnamese diacritics removal via `java.text.Normalizer`.
     * Clean empty state when search produces 0 results.
2. **R4 (Brand colors)**:
   - Target files: `android_app/app/src/main/res/values/colors.xml` and `android_app/app/src/main/res/values/themes.xml`.
   - Add `<color name="emerald_primary">#FF059669</color>` and `<color name="background_cream">#FFFAF9F6</color>`.
   - Reference `@color/background_cream` and `@color/emerald_primary` in `Theme.MyApplication`.
3. **Tests**:
   - Add new Robolectric test cases in `android_app/app/src/test/java/com/example/ExampleRobolectricTest.kt` covering search by name, filter chip selection, and combined filtering.

---

## 5. Verification Method
1. **Inspect Code Files**:
   - `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt`
   - `android_app/app/src/main/res/values/colors.xml`
   - `android_app/app/src/main/res/values/themes.xml`
2. **Unit Test Execution**:
   - Run: `cd android_app && .\gradlew.bat testDebugUnitTest --no-configuration-cache`
   - Expected: 100% pass (0 failures).
3. **TypeScript Parity**:
   - Run: `npx tsc --noEmit`
   - Expected: 0 errors.
4. **Invalidation Conditions**:
   - If typing a student name does not dynamically narrow the list.
   - If clicking a FilterChip does not update the selected state or list contents.
   - If `colors.xml` is missing either `emerald_primary` or `background_cream`.
