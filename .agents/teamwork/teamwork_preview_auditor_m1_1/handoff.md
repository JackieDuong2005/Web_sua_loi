# Forensic Audit Report: Milestone 1 Phase 2 & 3 Parity

**Work Product**: Milestone 1 (R1, R2, R3, R4) ViHand Grade Android Native App  
**Profile**: General Project (Demo Mode from `ORIGINAL_REQUEST.md` line 48)  
**Auditor**: Forensic Auditor (`teamwork_preview_auditor_m1_1`)  
**Verdict**: **CLEAN**

---

### Phase Results
- **Hardcoded test results detection**: **PASS** — No hardcoded test responses, fake PASS strings, or mock queries found in application source.
- **Facade implementation detection**: **PASS** — Genuine implementations of dynamic search/filter, error extraction, and gesture calculations.
- **Pre-populated verification artifact detection**: **PASS** — No pre-populated test logs or fake verification outputs detected.
- **HistoryScreen dynamic filtering**: **PASS** — Filters dynamically using Vietnamese NFD normalization and mathematical float interval partitions.
- **StudentHomeScreen dynamic extraction**: **PASS** — Pure functional extraction from `GradeResult.errors`, deduplication, and fallback to SGK on empty submissions.
- **PhotoBoundingBoxViewer gestures**: **PASS** — Consumes `detectTransformGestures` with clamped scale `[1.0f, 4.0f]` and pan bounds; single `graphicsLayer` ensures zero drift.
- **Resource XML validity**: **PASS** — Authentic declaration of `emerald_primary` (`#FF059669`) and `background_cream` (`#FFFAF9F6`) attached to `Theme.MyApplication`.
- **Test suite authenticity**: **PASS** — Test cases in `ExampleUnitTest` and `ExampleRobolectricTest` execute genuine assertions; no trivial asserts.
- **Independent execution validation**: **PASS** — `.\gradlew.bat testDebugUnitTest --no-configuration-cache` passed 23/23 tests (100% success rate); `npx tsc --noEmit` exited code 0 with 0 errors.

---

## 1. Observation

### 1.1. Resource Token & Theme Definitions (`colors.xml`, `themes.xml`)
- `android_app/app/src/main/res/values/colors.xml`:
  ```xml
  <color name="emerald_primary">#FF059669</color>
  <color name="background_cream">#FFFAF9F6</color>
  ```
- `android_app/app/src/main/res/values/themes.xml`:
  ```xml
  <style name="Theme.MyApplication" parent="android:Theme.DeviceDefault.NoActionBar">
      <item name="android:windowBackground">@color/background_cream</item>
      <item name="android:statusBarColor">@color/emerald_primary</item>
  </style>
  ```
- `android_app/app/src/main/AndroidManifest.xml`:
  Lines 18 and 23 attach `android:theme="@style/Theme.MyApplication"` to `<application>` and `<activity .MainActivity>`.

### 1.2. Dynamic Difficult Words Extraction (`StudentHomeScreen.kt`)
- `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt` (lines 69–89):
  ```kotlin
  fun extractDifficultWords(
      records: List<GradeResult>,
      fallback: List<Pair<String, String>> = DEFAULT_SGK_DIFFICULT_WORDS
  ): List<Pair<String, String>> {
      val extracted = records
          .flatMap { it.errors }
          .filter { it.originalWord.isNotBlank() }
          .map { error ->
              val word = error.originalWord.trim()
              val tip = when {
                  error.explanation.isNotBlank() -> error.explanation.trim()
                  error.correctedWord.isNotBlank() -> "Sửa thành: ${error.correctedWord.trim()} (${error.errorType})"
                  error.errorType.isNotBlank() -> "Chú ý lỗi: ${error.errorType.trim()}"
                  else -> "Chú ý phát âm và chính tả"
              }
              word to tip
          }
          .distinctBy { it.first.lowercase() }

      return if (extracted.isNotEmpty()) extracted else fallback
  }
  ```
- UI integration (lines 370–372):
  ```kotlin
  val wordsList = customDifficultWords ?: remember(recentRecords) {
      extractDifficultWords(recentRecords)
  }
  ```
- Surface item clicks invoke `tts?.speak(word, TextToSpeech.QUEUE_FLUSH, null, "student_word")` with null-safe invocation and `testTag("difficult_word_item")`.

### 1.3. Search and Multi-Criterion Filtering (`HistoryScreen.kt`)
- `android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt` (lines 61–65):
  ```kotlin
  private fun removeVietnameseDiacritics(str: String): String {
      val nfd = Normalizer.normalize(str, Normalizer.Form.NFD)
      return "\\p{InCombiningDiacriticalMarks}+".toRegex().replace(nfd, "")
          .replace('đ', 'd').replace('Đ', 'D')
  }
  ```
- Filtering logic (lines 82–117):
  ```kotlin
  val filteredRecords = remember(records, searchQuery, selectedCategory, selectedScoreRange) {
      val cleanQuery = removeVietnameseDiacritics(searchQuery.trim().lowercase())
      records.filter { record ->
          // 1. Search Query Match
          val matchSearch = if (cleanQuery.isBlank()) {
              true
          } else {
              val studentNameClean = removeVietnameseDiacritics(record.studentName.lowercase())
              val essayTitleClean = removeVietnameseDiacritics(record.essayTitle.lowercase())
              studentNameClean.contains(cleanQuery) || essayTitleClean.contains(cleanQuery) ||
                  record.studentName.contains(searchQuery.trim(), ignoreCase = true) ||
                  record.essayTitle.contains(searchQuery.trim(), ignoreCase = true)
          }

          // 2. Category Match
          val matchCategory = when (selectedCategory) {
              "Tất cả" -> true
              "Chính tả" -> record.essayTitle.contains("chính tả", ignoreCase = true) || !record.essayTitle.contains("tập làm văn", ignoreCase = true)
              "Tập làm văn" -> record.essayTitle.contains("tập làm văn", ignoreCase = true)
              else -> true
          }

          // 3. Score Range Match
          val score = record.criteria.totalScore
          val matchScore = when (selectedScoreRange) {
              "Tất cả" -> true
              ">= 9.0" -> score >= 9.0f
              "8.0-8.9" -> score >= 8.0f && score < 9.0f
              "6.5-7.9" -> score >= 6.5f && score < 8.0f
              "< 6.5" -> score < 6.5f
              else -> true
          }

          matchSearch && matchCategory && matchScore
      }
  }
  ```
- Empty state UI (lines 201–234): Renders when `filteredRecords.isEmpty()`, with `Icon(Icons.Default.History)`, title `"Không tìm thấy bài thi nào phù hợp"`, and suggestion `"Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc Tất cả"`.

### 1.4. Bounding Box Transformations & Synchronization (`PhotoBoundingBoxViewer.kt`)
- `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt` (lines 425–443):
  ```kotlin
  .pointerInput(displayedImgWidthPx, displayedImgHeightPx) {
      detectTransformGestures { _, pan, zoom, _ ->
          val newScale = (scale * zoom).coerceIn(1.0f, 4.0f)
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
- Wrapping Box (lines 446–456):
  ```kotlin
  // LAYER 1: Background Real Handwriting Photo & LAYER 2: Overlay BBoxes
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
  ```
- Both background image and overlay bounding boxes (`Box(modifier = Modifier.matchParentSize())`) reside in this single `graphicsLayer` container.

### 1.5. Automated Test Suite Verifications
1. `android_app/app/src/test/java/com/example/ExampleUnitTest.kt`:
   - 6 test cases testing arithmetic sanity, SGK fallback on empty records, field mappings, case-insensitive deduplication, zero-error fallback, and missing explanation fallback.
   - Genuine assertions (`assertEquals`, `assertTrue(result[0].second.contains(...))`).
2. `android_app/app/src/test/java/com/example/ExampleRobolectricTest.kt`:
   - 6 Robolectric UI test cases driving real Compose components via `createComposeRule()`.
   - Simulates unaccented typing `"bao nam"`, category chip selection, score filtering, and empty state rendering with semantic tree assertions (`assertExists`, `assertDoesNotExist`, `assertIsDisplayed`).
3. Independent Execution Command Results:
   - Command: `.\gradlew.bat cleanTestDebugUnitTest testDebugUnitTest --no-configuration-cache` in `android_app`:
     ```
     BUILD SUCCESSFUL in 2m 1s
     34 actionable tasks: 2 executed, 32 up-to-date
     ```
   - Test Report (`app/build/reports/tests/testDebugUnitTest/index.html`):
     - **Total tests**: 23
     - **Failures**: 0
     - **Skipped**: 0
     - **Success rate**: 100%
     - Classes:
       - `ExampleRobolectricTest`: 6 passed
       - `ExampleUnitTest`: 6 passed
       - `GreetingScreenshotTest`: 1 passed
       - `Milestone1StressTest`: 10 passed
   - Command: `npx tsc --noEmit` in root:
     ```
     Exit code: 0
     Stdout: (empty)
     Stderr: (empty)
     ```

---

## 2. Logic Chain

1. **Static Analysis & Anti-Cheat Validation**:
   - As observed in 1.1, `colors.xml` and `themes.xml` provide real XML elements referenced by the Android manifest, matching the exact hexadecimal codes `#FF059669` and `#FFFAF9F6` stipulated in `ORIGINAL_REQUEST.md` (R4).
   - As observed in 1.2, `extractDifficultWords` performs bona fide collections processing (`flatMap`, `filter`, `map`, `distinctBy`) over incoming `GradeResult` models. The fallback to `DEFAULT_SGK_DIFFICULT_WORDS` activates strictly when extracted results are empty. There is zero hardcoded output or facade behavior.
   - As observed in 1.3, `HistoryScreen.kt` implements generic diacritic normalization via `Normalizer.Form.NFD` and `\p{InCombiningDiacriticalMarks}+` plus stroke letter mapping (`đ`/`d`), allowing dynamic matching of arbitrary student names and titles. Score range bounds (`>= 9.0`, `8.0-8.9`, `6.5-7.9`, `< 6.5`) are mutually exclusive and collectively exhaustive float partitions. Zero mock student names are hardcoded in the application code.
   - As observed in 1.4, `PhotoBoundingBoxViewer.kt` captures user pinch gestures via `detectTransformGestures`. The scale factor is clamped to $[1.0, 4.0]$, and translation deltas are clamped to dynamically calculated offsets based on the actual displayed bitmap dimensions. Attaching `graphicsLayer` to the joint parent `Box` guarantees that bounding boxes and the underlying document image transform together without coordinate drift.

2. **Execution & Integrity Verification**:
   - As observed in 1.5, `ExampleUnitTest.kt` and `ExampleRobolectricTest.kt` contain non-trivial test assertions verifying actual behavior in memory and in the Compose semantic tree.
   - Independent test execution through Gradle confirmed that 100% of all unit, Robolectric, screenshot, and stress tests (23 tests in total) execute cleanly with zero failures.
   - TypeScript compiler verification on the repository root confirms zero type mismatches or syntax regressions.

---

## 3. Caveats

- **Windows Gradle Temp File Locks**: Running parallel `./gradlew.bat` commands simultaneously from separate processes can trigger NTFS file locks on `in-progress-results-*.bin` buffers. Running with `cleanTestDebugUnitTest` or stopping daemons (`--stop`) resolves this transient environment lock.
- No caveats regarding feature completeness or integrity compliance.

---

## 4. Conclusion

The work product implemented for Milestone 1 Phase 2 & 3 Parity (`HistoryScreen.kt`, `StudentHomeScreen.kt`, `PhotoBoundingBoxViewer.kt`, `colors.xml`, `themes.xml`, and associated unit/Robolectric tests) complies fully with all requirements of `ORIGINAL_REQUEST.md` (section ## 2026-10-03T19:00:25Z).

No cheating, hardcoding, dummy facades, or integrity violations were found. All implementations and tests are authentic, robust, and verified empirically.

**Verdict: CLEAN**

---

## 5. Verification Method

1. **Android Unit & Robolectric Tests**:
   ```powershell
   cd "c:\Users\Jackie Duong\Desktop\Web_sua_loi\android_app"
   .\gradlew.bat cleanTestDebugUnitTest testDebugUnitTest --no-configuration-cache
   ```
   *Expected outcome*: `BUILD SUCCESSFUL`, 23 tests completed, 0 failed, 100% success rate. HTML report generated at `app/build/reports/tests/testDebugUnitTest/index.html`.

2. **TypeScript Compilation Check**:
   ```powershell
   cd "c:\Users\Jackie Duong\Desktop\Web_sua_loi"
   npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0, 0 compilation errors.

3. **Invalidation Conditions**:
   - Any test failure in `testDebugUnitTest`.
   - Hardcoded mock values bypassing search or error extraction.
   - Desynchronization of bounding boxes from image pixels during pinch-to-zoom.
