# Báo Cáo Khảo Sát & Phương Án Kỹ Thuật: Động Hóa Sổ Tay Từ Khó Học Sinh (R2)

## 1. Observation (Quan sát thực tế)

### 1.1. Hiện trạng màn hình `StudentHomeScreen.kt` và danh sách từ tĩnh
- **Đường dẫn tệp**: `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt`
- **Chữ ký hàm Composable** (dòng 66-72):
  ```kotlin
  @Composable
  fun StudentHomeScreen(
      currentUser: UserData?,
      recentRecords: List<GradeResult>,
      onOpenHistory: () -> Unit,
      onSelectRecord: (GradeResult) -> Unit,
      modifier: Modifier = Modifier
  )
  ```
- **Danh sách 5 từ mẫu cố định (Hardcoded)** tại dòng 338-344:
  ```kotlin
  val wordsList = listOf(
      Pair("ru bé ngủ say", "Chú ý r/d và dấu thanh"),
      Pair("thay cho gió trời", "Chú ý âm đầu gi/d"),
      Pair("ngọt ngào", "Chú ý vần o-a-t"),
      Pair("chăm chỉ", "Chú ý âm ch/tr"),
      Pair("xinh xắn", "Chú ý âm s/x")
  )
  ```
- **Giao diện hiển thị** (dòng 306-397):
  - Nằm trong `Card` thứ 2: Tiêu đề `"Sổ tay từ khó con cần luyện thêm"`, phụ đề `"Bấm vào từng từ để nghe cô đọc mẫu và luyện viết lại vào vở ô ly con nhé:"`.
  - Duyệt vòng lặp `wordsList.forEach { (word, tip) -> ... }`.
  - Mỗi mục hiển thị chữ viết theo font tiểu học (`FontFamilyTieuHoc`, cỡ 17sp), kèm dòng giải thích mẹo chính tả (`tip`), và nút loa phát âm tích hợp Android Text-To-Speech (`tts.speak(...)`).
  - **Vấn đề**: `wordsList` hiện tại hoàn toàn phớt lờ tham số `recentRecords: List<GradeResult>`, dẫn đến việc học sinh dù làm bài có lỗi chính tả gì thì màn hình vẫn luôn hiển thị 5 từ mẫu cố định này.

### 1.2. Cơ chế lưu trữ bài chấm và kết quả sửa lỗi cục bộ
- **Room Database**:
  - Tệp cơ sở dữ liệu: `android_app/app/src/main/java/com/example/data/local/AppDatabase.kt` (tên SQLite database là `"vihand_grade.db"`).
  - Bảng thực thể: `grade_records` trong `android_app/app/src/main/java/com/example/data/local/GradeRecordEntity.kt`.
  - Các lỗi chính tả được serialize thành JSON dạng chuỗi `errorsJson: String` thông qua Moshi adapter (`errorsAdapter.toJson(result.errors)`).
  - DAO: `android_app/app/src/main/java/com/example/data/local/GradeRecordDao.kt` cung cấp hàm truy vấn reactive:
    `@Query("SELECT * FROM grade_records ORDER BY timestamp DESC") fun getAllRecords(): Flow<List<GradeRecordEntity>>`.
- **Repository Layer**:
  - `android_app/app/src/main/java/com/example/data/repository/GradeRepository.kt` (dòng 47-49):
    `val allGradedRecords: Flow<List<GradeResult>> = dao.getAllRecords().map { entities -> entities.map { it.toModel() } }`.
    Hàm `toModel()` (dòng 380-409) tự động parse `errorsJson` trở lại thành `List<ErrorBox>`.
- **ViewModel & StateFlow**:
  - `android_app/app/src/main/java/com/example/ui/viewmodel/MainViewModel.kt` (dòng 69-82):
    ```kotlin
    val historyRecords: StateFlow<List<GradeResult>> = combine(
        repository.allGradedRecords,
        _currentUser
    ) { records, user ->
        if (user != null && user.role == "student") {
            records.filter { it.studentName.trim().equals(user.name.trim(), ignoreCase = true) }
        } else {
            records
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )
    ```
  - Khi người dùng đăng nhập là học sinh (`user.role == "student"`), `historyRecords` đã được tự động lọc theo đúng tên của học sinh (`it.studentName.trim().equals(user.name.trim(), ignoreCase = true)`).
- **Luồng cấp phát dữ liệu vào màn hình** (`MainActivity.kt` dòng 145 và 415-425):
  ```kotlin
  val historyList by viewModel.historyRecords.collectAsStateWithLifecycle()
  ...
  "student_home" -> {
      StudentHomeScreen(
          currentUser = currentUser,
          recentRecords = historyList,
          onOpenHistory = { activeTab = "history" },
          onSelectRecord = { record ->
              viewModel.loadSample(record)
              activeTab = "grade"
          }
      )
  }
  ```
  `recentRecords` truyền vào `StudentHomeScreen` đã chính là danh sách bài chấm của học sinh hiện tại, được cập nhật phản ứng hai chiều (Room DB + Server Sync).

### 1.3. Cấu trúc dữ liệu lỗi chính tả và quy tắc trích xuất
- **Data Model**: `android_app/app/src/main/java/com/example/data/model/GradeModels.kt`:
  - `GradeResult` chứa `errors: List<ErrorBox>`.
  - `ErrorBox` định nghĩa:
    ```kotlin
    data class ErrorBox(
        val id: String,
        val originalWord: String,
        val correctedWord: String,
        val errorType: String,
        val explanation: String,
        val penalty: Float,
        val x1: Float,
        val y1: Float,
        val x2: Float,
        val y2: Float,
        val lineNumber: Int = 1,
        ...
    )
    ```
  - Trong đó:
    - `originalWord`: Từ/cụm từ học sinh viết sai (ví dụ: `"chổ hoa"`, `"xớm mai"`, `"su bé ngủ xay"`).
    - `explanation`: Lời giải thích quy tắc sư phạm hoặc hướng dẫn sửa (ví dụ: `"Quy tắc chính tả: 'Trổ hoa' / 'trổ tài' viết bằng âm đầu 'tr', không viết bằng 'ch'."`).
    - `correctedWord`: Từ đúng sau sửa lỗi (ví dụ: `"trổ hoa"`, `"sớm mai"`, `"Ru bà ngủ say"`).
    - `errorType`: Phân loại lỗi (ví dụ: `"Phụ âm đầu (ch/tr)"`, `"Thanh điệu (Hỏi / Ngã)"`).
  - Ánh xạ trích xuất: `errors.map { it.originalWord to it.explanation }` cho ra danh sách `List<Pair<String, String>>`, hoàn toàn tương thích 1:1 với cấu trúc `wordsList` hiện tại trên giao diện.

### 1.4. Danh sách từ khó chuẩn SGK dự phòng (Fallback)
- 5 từ mẫu hiện tại:
  1. `Pair("ru bé ngủ say", "Chú ý r/d và dấu thanh")`
  2. `Pair("thay cho gió trời", "Chú ý âm đầu gi/d")`
  3. `Pair("ngọt ngào", "Chú ý vần o-a-t")`
  4. `Pair("chăm chỉ", "Chú ý âm ch/tr")`
  5. `Pair("xinh xắn", "Chú ý âm s/x")`
- Các từ này đại diện chuẩn xác cho các cặp phụ âm/vần/dấu thanh dễ nhầm lẫn nhất trong chương trình Tiếng Việt Tiểu học (SGK Lớp 1-3) và đã có sẵn mẹo phát âm ngắn gọn. Đây chính là tập từ chuẩn SGK lý tưởng làm fallback khi học sinh chưa có bài thi nào hoặc bài thi đạt điểm tối đa (0 lỗi).

### 1.5. Hiện trạng kiểm thử
- Thư mục `android_app/app/src/test/java/com/example/` có 3 file test:
  1. `ExampleUnitTest.kt`: Chỉ có test mẫu `addition_isCorrect()`.
  2. `ExampleRobolectricTest.kt`: Test `CameraScanScreen` và `GradingResultScreen`.
  3. `GreetingScreenshotTest.kt`: Test chụp ảnh màn hình Roborazzi.
- **Chưa có bất kỳ test nào** kiểm thử `StudentHomeScreen` hoặc logic trích xuất từ khó.

---

## 2. Logic Chain (Chuỗi suy luận & Phân tích giải pháp)

1. **Phân tích yêu cầu R2**:
   - Yêu cầu đặt ra: Động hóa sổ tay từ khó bằng cách trích xuất các từ bị lỗi chính tả (`errors.map { it.originalWord to it.explanation }`) từ các bài chấm gần nhất của học sinh được lưu trong máy, đồng thời giữ fallback về từ khó chuẩn SGK khi chưa có bài thi nào.
   - Dữ liệu đầu vào: `recentRecords` đã được `MainActivity` truyền vào `StudentHomeScreen` thông qua Flow lọc tự động theo học sinh từ Room DB.
   - Do đó, **không cần sửa `MainActivity` hay `MainViewModel`**, kiến trúc hiện tại đã hoàn hảo và sạch sẽ. Điểm can thiệp duy nhất là logic bên trong `StudentHomeScreen.kt`.

2. **Thiết kế hàm trích xuất tách biệt (Pure Function)**:
   - Xây dựng một hàm thuần túy `extractDifficultWords`:
     ```kotlin
     val DEFAULT_SGK_DIFFICULT_WORDS = listOf(
         Pair("ru bé ngủ say", "Chú ý r/d và dấu thanh"),
         Pair("thay cho gió trời", "Chú ý âm đầu gi/d"),
         Pair("ngọt ngào", "Chú ý vần o-a-t"),
         Pair("chăm chỉ", "Chú ý âm ch/tr"),
         Pair("xinh xắn", "Chú ý âm s/x")
     )

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
   - **Lợi ích kiến trúc**:
     - Hoàn toàn độc lập với Android UI/Compose Framework, cho phép viết Unit Test tiêu chuẩn (Local JVM Unit Test) chạy trong mili-giây mà không cần Robolectric hay thiết bị thật.
     - Khử trùng lặp (`distinctBy`) để tránh việc một từ sai nhiều lần trong các bài thi bị lặp lại nhiều dòng trên giao diện.
     - Fallback thông minh: nếu `explanation` bị trống, tận dụng `correctedWord` và `errorType` để tạo tip hữu ích cho học sinh.

3. **Tích hợp vào `StudentHomeScreen.kt`**:
   - Thay thế dòng 338-344 trong `StudentHomeScreen.kt`:
     ```kotlin
     val wordsList = remember(recentRecords) {
         extractDifficultWords(recentRecords)
     }
     ```
   - Hỗ trợ thêm tham số tùy chọn (optional parameter) vào `StudentHomeScreen`:
     ```kotlin
     @Composable
     fun StudentHomeScreen(
         currentUser: UserData?,
         recentRecords: List<GradeResult>,
         onOpenHistory: () -> Unit,
         onSelectRecord: (GradeResult) -> Unit,
         modifier: Modifier = Modifier,
         customDifficultWords: List<Pair<String, String>>? = null
     )
     ```
     Điều này giữ nguyên 100% tương thích ngược với các caller hiện tại, đồng thời cho phép Preview hoặc Test can thiệp danh sách từ trực tiếp khi cần.
   - Thêm `testTag("difficult_word_item")` và null-safety cho `tts?.speak(...)` để bảo đảm độ tin cậy khi chạy Robolectric Compose test.

---

## 3. Caveats (Điểm lưu ý & Giả định)

1. **Số lượng từ hiển thị**:
   - Nếu học sinh làm nhiều bài thi và tích lũy số lượng từ lỗi lớn (ví dụ > 20 từ), màn hình `StudentHomeScreen` có thể bị dài. Tuy nhiên, toàn bộ nội dung đã nằm trong `verticalScroll(scrollState)`. Để tối ưu trải nghiệm đọc cho học sinh tiểu học, có thể cân nhắc giới hạn `take(10)` hoặc hiển thị toàn bộ theo thứ tự bài mới nhất trước.
2. **Quyền riêng tư dữ liệu**:
   - `historyRecords` trong `MainViewModel` đã lọc theo `user.name` đối với học sinh (`user.role == "student"`). Khi đăng nhập là giáo viên, `StudentHomeScreen` không được sử dụng (giáo viên dùng `HomeScreen`), do đó không có nguy cơ lẫn lộn từ khó giữa các học sinh khác nhau.
3. **Android TTS trong môi trường máy ảo / Robolectric**:
   - `TextToSpeech` trong môi trường unit test headless (như Robolectric) có thể trả về callback trễ hoặc không khả dụng. Cần bảo đảm gọi an toàn `tts?.speak(...)` và `tts?.shutdown()`.

---

## 4. Conclusion (Kết luận đánh giá)

1. **Tính khả thi**: Yêu cầu R2 hoàn toàn khả thi 100% với mức độ rủi ro bằng 0.
2. **Kiến trúc giải pháp**:
   - Toàn bộ cơ sở hạ tầng dữ liệu (Room Database -> DAO -> GradeRepository Flow -> MainViewModel StateFlow -> MainActivity collectAsState) **đã sẵn sàng và kết nối chuẩn xác**.
   - Chỉ cần thực hiện thay đổi tại 1 tệp duy nhất: `StudentHomeScreen.kt`.
   - Bổ sung hàm tiện ích `extractDifficultWords(records, fallback)` và hằng số `DEFAULT_SGK_DIFFICULT_WORDS`.
   - Kết nối `val wordsList = remember(recentRecords) { extractDifficultWords(recentRecords) }`.
3. **Kế hoạch kiểm thử bổ sung**:
   - Bổ sung test case trong `ExampleUnitTest.kt` để kiểm tra logic `extractDifficultWords` với 3 kịch bản:
     1. Danh sách bài rỗng -> Trả về 5 từ chuẩn SGK.
     2. Bài thi có lỗi chính tả -> Trả về danh sách trích xuất `originalWord to explanation`.
     3. Bài thi đạt điểm 10 (không có lỗi) -> Trả về fallback chuẩn SGK.
     4. Bài thi có từ trùng lặp -> Tự động loại bỏ trùng lặp.

---

## 5. Verification Method (Phương pháp xác thực độc lập)

1. **Kiểm tra cú pháp và logic trích xuất bằng Unit Test**:
   - Chạy lệnh Gradle Debug Unit Test:
     ```powershell
     cd "c:\Users\Jackie Duong\Desktop\Web_sua_loi\android_app"
     .\gradlew.bat testDebugUnitTest
     ```
   - Điều kiện đạt: 100% test cases trong `ExampleUnitTest` và `ExampleRobolectricTest` chạy thành công (PASSED).

2. **Kiểm tra biên dịch và kiểu dữ liệu**:
   - Đảm bảo lệnh `.\gradlew.bat compileDebugSources` hoàn thành không có warning/error về type mismatch hoặc Compose state recomposition.

3. **Kiểm tra trực quan bằng Code Inspection**:
   - Mở `StudentHomeScreen.kt`, xác nhận `val wordsList` đã được chuyển sang `remember(recentRecords) { extractDifficultWords(recentRecords) }`.
   - Xác nhận hằng số `DEFAULT_SGK_DIFFICULT_WORDS` chứa đủ 5 cặp từ SGK ban đầu.
