# KIỂM CHỨNG LỖI & PHƯƠNG PHÁP KHẮC PHỤC THỰC TẾ — VIHAND GRADE ANDROID + WEB BFF

> **Mã tài liệu**: `VHG-REMEDY-AND-2026-04`
> **Đối chiếu với**: [03_Kiem_Toan_Thuc_Dia_Va_Do_San_Sang_Android_App.md](./03_Kiem_Toan_Thuc_Dia_Va_Do_San_Sang_Android_App.md) (`VHG-AUDIT-AND-2026-03`)
> **Ngày lập**: 11/10/2026
> **Phương pháp**: đọc và đối chiếu trực tiếp mã nguồn trong repo (`android_app/`, `app/api/`, `lib/`, `prisma/`, `Dockerfile`, `start.sh`).

> [!IMPORTANT]
> **Giới hạn của lần kiểm chứng này — đọc trước khi dùng kết quả**
> - Đây là **kiểm chứng tĩnh (đọc mã)**. Tôi **không build, không chạy app trên thiết bị/emulator, không gọi server thật** (server cục bộ `localhost:3000` không chạy lúc kiểm tra).
> - Vì vậy các con số về RAM, tỉ lệ 429, độ lag là **ước lượng**, được đánh dấu `❓`. Mục 4 có cách đo thật.
> - Các cột "% sẵn sàng" trong Phần I của báo cáo 03 là đánh giá chủ quan, **không có cách kiểm chứng bằng mã**, nên không được xếp vào bảng dưới.

**Ký hiệu**: ✅ đúng như báo cáo · ⚠️ đúng một phần / cơ chế hoặc số liệu cần chỉnh · ❓ cần test thiết bị · ❌ sai.

---

## PHẦN 1. KẾT QUẢ KIỂM CHỨNG 17 PHÁT HIỆN CỦA BÁO CÁO 03

**Kết luận nhanh**: cả 17 vấn đề đều **có thật trong mã** (không có phát hiện bịa). Nhưng **7/17 có chi tiết cơ chế hoặc số liệu không chính xác**, và 2 đoạn code mẫu trong báo cáo 03 sẽ **không chạy đúng nếu chép nguyên** (xem Phần 5).

| ID | Phát hiện | Kết quả | Bằng chứng trong mã | Điều chỉnh cần biết |
| :-- | :-- | :-: | :-- | :-- |
| **P0-01** | OOM khi quét cả lớp | ⚠️❓ | `CameraScanScreen.kt:327,335` (`mutableStateListOf<Bitmap>`), `MainViewModel.kt:430-436`, `MainActivity.kt:347-348` | Lỗi **có thật**. Nhưng ngưỡng "25–35 bài" là chưa đo: mỗi ảnh ~48 MB (12MP), manifest không có `largeHeap`, nên nhiều khả năng crash **sớm hơn nhiều** (ước lượng 5–15 ảnh). Thêm: `toBitmap()` + `createBitmap(xoay)` giữ 2 bản cùng lúc (`CameraScanScreen.kt:966-970`); thumbnail vẽ bitmap full-res (`:805-810`); ảnh từ thư viện (gallery) cũng đi qua cùng đường (`:366`). |
| **P0-02** | Rate limit 429 + nuốt lỗi → mất bài | ⚠️ | Nuốt lỗi: `MainViewModel.kt:463-465`. Giới hạn 20/phút: `mobile/grade/route.ts:349`, `lib/api-guard.ts:90-112`. Xóa danh sách sau khi gửi: `CameraScanScreen.kt:842-843` | **Nuốt lỗi và mất ảnh: đúng.** Nhưng kịch bản "bài 21 mới dính 429" **sai cơ chế**: vòng lặp chạy **tuần tự**, mỗi bài mất 4–8 giây (chính báo cáo nêu ở P2-06) ⇒ chỉ ~8–15 request/phút, **thấp hơn 20**. 429 chỉ xảy ra khi server trả < 3 s/bài, hoặc **nhiều giáo viên chung một IP** (giới hạn khóa theo IP, `api-guard.ts:30-44`, trường học thường qua một NAT). Nguyên nhân mất bài khả dĩ hơn: timeout (`callTimeout 90s`), Gemini 429/503, rớt Wi-Fi — tất cả đều bị `catch (_: Exception)` nuốt. |
| **P0-03** | Zombie grade (xóa offline rồi hồi sinh) | ✅ | `GradeRepository.kt:259-271` (catch chỉ log), `:708-731` (so khóa `tên_tiêu đề_lớp`) | Đúng. Có **thêm 2 nguyên nhân hồi sinh khác** (xem N2, N4). |
| **P1-01** | Không có hàng đợi offline | ✅ | Không có WorkManager/bảng chờ (dependency không có; grep 0 kết quả) | Chi tiết sai: `generateSimulatedAnalysis` là **mã chết** (private, không ai gọi, `GradeRepository.kt:318`); `MainViewModel.kt:280-282` chỉ đặt trạng thái lỗi. |
| **P1-02** | Gán cứng "Học sinh N" | ✅ | `MainViewModel.kt:458`; `onBatchCapture` chỉ truyền `selectedClass` (`CameraScanScreen.kt:842`) | Đúng. `studentOptions` (`:313`) chỉ phục vụ chế độ chụp đơn. |
| **P1-03** | Không có màn hình tổng kết lô | ✅ | `MainViewModel.kt:470-476` chỉ giữ kết quả cuối | Đúng. |
| **P1-04** | Nút xóa "tê liệt" + rác ảnh | ✅ | `MainActivity.kt:437`, `MainViewModel.kt:315-321` (`toLongOrNull`), `GradeRepository.kt:259-271` không xóa `photoPath` | Đúng. Nếu chỉ sửa để xóa được trên server mà không xóa bản local, bản local sẽ bị **đẩy ngược lên server** ở lần sync sau (xem N2). |
| **P1-05** | Sửa điểm nhân bản bản ghi | ✅ | `GradeRecordEntity.kt:8-9`, `GradeRepository.kt:236-257` (không truyền `id`) | Đúng và **chắc chắn xảy ra**: `gradeImage` đã lưu 1 bản (`:226-231`) rồi `saveModifiedGrade` lưu thêm bản thứ 2. Kèm lỗi liên quan: N7. |
| **P1-06** | Không có xác thực, ảnh công khai | ✅ | `auth/login/route.ts:139` (so mật khẩu thô), `:162-171` (không phát token); không route nào kiểm `Authorization`/`Bearer`/`jwt`; `NetworkClient.kt` không có interceptor; `mobile/grade/route.ts:20-27` ghi vào `public/uploads` | Đúng. **Dẫn chứng của báo cáo sai số dòng**: `login/route.ts:49-58` thực tế là `:139-171`. Điểm tốt: `public/uploads/` đã nằm trong `.gitignore`, không có file nào bị commit. Không có `middleware.ts`/`proxy.ts` ở thư mục gốc. |
| **P1-07** | Mock fallback gán bài mẫu | ⚠️ | `MainViewModel.kt:237-249`, `MainActivity.kt:577-583`, `GradeRepository.kt:443-446,486-489` | **Không tự động**: `retryOfflineSimulation` chỉ chạy khi giáo viên bấm nút **"Chấm Dự Phòng"**, và kết quả gắn `isSample = true` + nhãn "Offline Demo". Nhưng có **đường tự động nguy hiểm hơn** mà báo cáo bỏ sót: N1. |
| **P2-01** | Không phân trang lịch sử | ⚠️❓ | `GradeRecordDao.kt:11-12` (báo cáo ghi nhầm `:38`), `HistoryScreen.kt:70` | Cơ chế đúng. Con số "15–25 MB" là chưa đo. Với ≤ 500 dòng, **Paging 3 chưa cần**; sửa gốc ở P2-04. |
| **P2-02** | Quản lý lớp/học sinh chỉ đọc | ✅ | `GradeApiService.kt:35-39` | Đúng, ưu tiên thấp (xem Phần 3, Sprint 4). |
| **P2-03** | Bàn phím che nút | ⚠️❓ | `AndroidManifest.xml` không có `windowSoftInputMode`; grep `imePadding` = 0 kết quả; `GradingResultScreen.kt:1167-1204` | Thiếu `imePadding`/scroll là **đúng**. Nhưng `Dialog` của Compose chạy trong cửa sổ riêng và thường tự co theo bàn phím, hộp thoại này chỉ cao ~300dp ⇒ **chưa chắc nút bị che** (cần test máy thật). Rủi ro cao hơn nằm ở **LoginScreen/Settings** (cửa sổ chính + `enableEdgeToEdge`, `MainActivity.kt:97`). |
| **P2-04** | Parse JSON trên main thread | ⚠️ | `GradeRepository.kt:49-51` + `:382-387` (`map { toModel() }` không có `flowOn`); `:668` là parse của sổ điểm server | Đúng, đây mới là nguyên nhân gốc của "lag lịch sử". Dependency `moshi-kotlin-codegen` **đã có** (`build.gradle.kts:146`) nhưng repo vẫn dùng `KotlinJsonAdapterFactory` (reflection) cho `ErrorBox`; cần kiểm tra `ErrorBox` đã có `@JsonClass(generateAdapter = true)` chưa. |
| **P2-05** | `Level.BODY` log Base64 | ✅ | `NetworkClient.kt:18-20` | Đúng, và áp dụng cho **cả bản release** (không phân biệt buildType). Số "1.5–3 MB Base64" hơi cao: ảnh đã bị thu về 1600px/JPEG85 (`GradeRepository.kt:293-316`) nên thực tế ~0.4–0.8 MB. |
| **P2-06** | Fake progress + Guest bắt buộc online | ⚠️ | `MainViewModel.kt:259-265`, `:401-411` | Kết luận đúng. Chi tiết sai: không có vòng `for (p in 25..90 step 15)`, mà là 4 lệnh gán (25/50/75/90%) với tổng `delay` = 480 ms. |
| **P2-07** | Không kiểm tra độ nét/sáng | ✅ | grep `blur`/`Laplac` = 0 kết quả | Đúng. Ngưỡng 100 và 60 trong báo cáo chỉ là ví dụ, **phải hiệu chuẩn bằng ảnh thật**. |
| **Phần II** | "Đồng bộ hợp đồng API 100%" | ⚠️ | `GradeApiModels.kt:7-20`, `route.ts:356-369`, `:417`; `MainActivity.kt:337` | **Tên trường khớp, ngữ nghĩa thì không**: Android luôn gửi `the_loai="chinh_ta"`, `essayType="spelling"`, `hinh_thuc=3`, `noi_dung=2` ⇒ server **luôn bỏ qua thể loại do OCR nhận diện** (`route.ts:417`), và chế độ chấm giáo viên chọn trên UI bị **bỏ qua** (`onCaptureWithDetails = { bitmap, cls, std, _ -> ...}`). Chế độ "essay (4-3-2-1)" hiện không có tác dụng. |

---

## PHẦN 2. LỖI MỚI PHÁT HIỆN (BÁO CÁO 03 BỎ SÓT)

| ID | Mức | Lỗi | Bằng chứng | Hậu quả |
| :-- | :-: | :-- | :-- | :-- |
| **N1** | **P0** | **Camera lỗi/chưa sẵn sàng ⇒ app tự chấm "bài mẫu" như bài thật** của học sinh đang chọn | `CameraScanScreen.kt:977-992` (`onError`, `catch`, nhánh `else` đều gọi `getOrGenerateBitmap` rồi `dispatchCapture`) | Bấm màn trập đúng lúc camera chưa gắn xong ⇒ ảnh vở mẫu được gửi lên server và lưu dưới tên học sinh thật. Trong chế độ lô, ảnh mẫu lọt vào danh sách. Đây mới là lỗ hổng "chấm nhầm bài mẫu" thật sự của hệ thống. |
| **N2** | **P0** | **Mỗi lần đồng bộ, app đẩy lại TOÀN BỘ bản ghi local lên server** ⇒ trùng lặp dữ liệu trên server | `GradeRepository.kt:609-654` (`syncAllGradesToServer` lặp `getAllRecordsList()`, không kiểm `serverId`), được gọi ở `:714`, và tự chạy mỗi lần mở app (`MainViewModel.kt:122-125,130-132`). Server không chống trùng (`grades/route.ts:118-142`). | Mỗi lần mở app, N bài cũ lại thành N bản ghi mới trên server. Sổ điểm Web phình ra, thống kê sai. Đồng thời làm bài đã xóa trên server **hồi sinh** từ bản local. |
| **N3** | P1 | **Server trả ID giả khi lưu DB lỗi** | `mobile/grade/route.ts:459-506`: nếu `prisma.grade.create` lỗi thì vẫn trả `serverGradeId: "srv_<timestamp>"` | App lưu `serverId` không tồn tại ⇒ sau này xóa/sửa bài đó đều lỗi 500/404. |
| **N4** | P1 | **`DELETE`/`PATCH` không idempotent** | `grades/[id]/route.ts:13-22` (`delete` ném lỗi nếu bản ghi đã mất ⇒ 500), `:51` (`update` tương tự) | Khi áp dụng cơ chế tombstone, các lần xóa bù sẽ nhận 500 và **lặp mãi**. Phải sửa server trước. |
| **N5** | **P0** (với phương án khắc phục) | **`fallbackToDestructiveMigration()`** | `AppDatabase.kt:29` | Nếu nâng Room lên v5 như báo cáo 03 đề xuất mà không viết `Migration`, **toàn bộ dữ liệu local bị xóa** khi người dùng cập nhật app. |
| **N6** | P1 | **Khóa chống trùng `tên_tiêu đề_lớp` bị va chạm** | `GradeRepository.kt:721-727`; tiêu đề mặc định cố định `"Bài thi Viết tay Tiểu học"` (`:213`) | Cùng học sinh, cùng lớp, cùng tiêu đề (ví dụ nhiều bài chính tả cùng tên) ⇒ bài mới bị coi là "đã có", **không bao giờ tải về máy**. |
| **N7** | P1 | **Sửa bài từ danh sách local gửi sai ID lên server** | `GradeRepository.kt:390` (`id = id.toString()` là khóa Room), `MainViewModel.kt:495-497` (`gradeId = modified.id`) | PATCH trúng ID không tồn tại ⇒ trả lỗi, bị `catch` nuốt (`:603-606`). Giáo viên sửa điểm nhưng Web không bao giờ nhận. |
| **N8** | P1 | **Rate limit theo IP, giữ trong RAM** | `lib/api-guard.ts:13,30-44,90-92` | Cả trường dùng chung IP công cộng ⇒ dùng chung một "xô" 20 request/phút. Khởi động lại server là xóa bộ đếm. |
| **N9** | P1 | **Thumbnail lô vẽ bitmap full-res** | `CameraScanScreen.kt:798-810` | Tốn bộ nhớ GPU, giật. Máy ảnh 50MP (~200 MB/bitmap) có thể làm Compose ném lỗi "bitmap quá lớn". |
| **N10** | P2 | **Cấu hình release chưa an toàn** | `build.gradle.kts:48` (`isMinifyEnabled=false`), `:121` (`firebase.appcheck.debug` nằm trong `implementation`), `AndroidManifest.xml:10,17` (`allowBackup=true`, `usesCleartextTraffic=true`) | Bản release chứa provider debug App Check, cho phép sao lưu dữ liệu app, cho phép HTTP thuần. |
| **N11** | P1 | **Danh sách lớp/học sinh giả bị ghi vào Room** | `GradeRepository.kt:443-446,486-489` | Khi server chưa trả được, "Nguyễn Văn An"... được **lưu vĩnh viễn** vào cache, có thể bị chọn nhầm khi chấm. |
| **N12** | P2 | **`GET /api/grades` không phân trang, trả cả `imageBase64`** và app tải lại **toàn bộ** sau mỗi lần chấm | `grades/route.ts:39-57`, `MainViewModel.kt:279,468`, `GradeRepository.kt:656-700` | Càng dùng lâu càng chậm, tốn 4G. |
| **N13** | P2❓ | **File ghi vào `public/` lúc chạy có thể không được phục vụ** (Next.js chỉ phục vụ `public/` đã có lúc build); Docker không khai báo volume cho `uploads` | `Dockerfile`, `next.config.mjs` (`output: 'standalone'`) | Ảnh bài thi có thể 404 hoặc mất khi tạo lại container. **Cần kiểm trên Raspberry Pi thật.** |
| **N14** | P1 | **`start.sh` chạy `prisma db push --accept-data-loss` ở mỗi lần khởi động** | `start.sh` | Đổi schema sai có thể xóa cột/dữ liệu mà không cảnh báo. **Sao lưu `vihand.db` trước mọi thay đổi schema.** |

---

## PHẦN 3. LỘ TRÌNH KHẮC PHỤC THỰC TẾ

### 3.0. Nguyên tắc chọn cách làm

1. **Một kiến trúc sửa nhiều lỗi**: bảng `pending_grades` (hàng đợi lưu đĩa) giải quyết cùng lúc P0-01, P0-02, P1-01, P1-02, P1-03 và N1. Không vá từng lỗi riêng lẻ.
2. **Sửa server trước, client sau** cho những lỗi cần phối hợp (N3, N4, idempotency), vì app cũ đang chạy ngoài thực tế vẫn gọi server.
3. **Một lần `Migration` Room duy nhất** (4 → 5) chứa mọi thay đổi bảng, có kiểm thử, không dùng destructive.
4. **Chưa làm** những thứ tốn công mà lợi ích thấp: SSE/WebSocket cho tiến trình, Paging 3, CRUD lớp trên di động (Phần 6).

### 3.1. Thứ tự và công sức (ước lượng cho 1 lập trình viên)

| Sprint | Nội dung | Ước lượng | Chặn bởi |
| :-- | :-- | :-: | :-- |
| **S0 — Chặn chảy máu** | Sửa N1, N2, N3, N4, `Level.BODY`, sao lưu DB | **0,5–1 ngày** | — |
| **S1 — An toàn dữ liệu** | Lưu đĩa thay Bitmap, `pending_grades`, retry/backoff, tombstone, upsert, idempotency | **4–6 ngày** | S0 |
| **S2 — Nghiệp vụ lớp học** | Chọn lớp + gán học sinh, màn hình tổng kết, bỏ mock | **3–4 ngày** | S1 |
| **S3 — Bảo mật** | bcrypt + JWT, ảnh riêng tư, AuthInterceptor | **4–5 ngày** | S1 (nên làm sau khi dữ liệu ổn định) |
| **S4 — Hoàn thiện** | Chất lượng ảnh, IME, tiến trình thật, hiệu năng lịch sử | **3–4 ngày** | — |

---

### SPRINT 0 — Chặn chảy máu (làm ngay, rủi ro thấp)

#### S0.1 Sao lưu dữ liệu server (trước khi động vào schema)
```bash
# Trên Raspberry Pi / máy chủ
cp prisma/vihand.db "prisma/vihand.db.bak-$(date +%Y%m%d-%H%M)"
```

#### S0.2 Sửa N1 — Không bao giờ dùng bài mẫu thay ảnh thật (`CameraScanScreen.kt`)
Chỉ giữ nhánh bài mẫu cho bản **debug**, còn bản release thì báo lỗi và **không gửi gì**.

```kotlin
// onError và catch: thay đoạn gọi getOrGenerateBitmap(...)
override fun onError(exception: ImageCaptureException) {
    scope.launch(Dispatchers.Main) {
        switchNotification = "Chụp ảnh không thành công, vui lòng chụp lại"
    }
}

// Nhánh else (camera chưa sẵn sàng / chưa cấp quyền)
} else {
    if (BuildConfig.DEBUG) {
        dispatchCapture(getOrGenerateBitmap(selectedSampleIndex))   // demo nội bộ
    } else {
        switchNotification = "Camera chưa sẵn sàng. Vui lòng cấp quyền và thử lại"
    }
}
```
Đồng thời ẩn nút **"Chấm Dự Phòng"** (`MainActivity.kt:579-588`) trong bản release bằng `if (BuildConfig.DEBUG)`.

#### S0.3 Sửa N2 — Chỉ đẩy bản ghi **chưa có trên server** (`GradeRepository.kt`)
Thêm vào DAO:
```kotlin
@Query("SELECT * FROM grade_records WHERE serverId IS NULL")
suspend fun getUnsyncedRecords(): List<GradeRecordEntity>
```
Trong `syncAllGradesToServer`, thay `val records = dao.getAllRecordsList()` bằng:
```kotlin
val records = dao.getUnsyncedRecords()
```
Bản ghi cũ có `serverId` giả dạng `srv_...` (xem N3) được dọn bằng migration ở S1.

#### S0.4 Sửa N3 + N4 — Server (`app/api/mobile/grade/route.ts`, `app/api/grades/[id]/route.ts`)
```ts
// mobile/grade/route.ts — thay đoạn `serverGradeId: savedGradeId || \`srv_${Date.now()}\``
if (!savedGradeId) {
  return NextResponse.json(
    { status: "error", error: "Không lưu được bài chấm vào cơ sở dữ liệu, vui lòng thử lại" },
    { status: 503 }   // 503 = client coi là "có thể thử lại"
  )
}
```
```ts
// grades/[id]/route.ts — DELETE idempotent
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const existing = await prisma.grade.findUnique({ where: { id } })
    if (existing?.imagePath) {
      const diskPath = path.join(process.cwd(), "public", existing.imagePath.replace(/^\//, ""))
      await fs.unlink(diskPath).catch(() => {})
    }
    await prisma.grade.deleteMany({ where: { id } })     // không ném lỗi nếu đã mất
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```
Với `PATCH`: bắt lỗi Prisma `P2025` và trả **404** thay vì 500 để client phân biệt "bài không tồn tại" với "server lỗi".

#### S0.5 Tắt log Base64 (`NetworkClient.kt`)
```kotlin
private val loggingInterceptor = HttpLoggingInterceptor().apply {
    level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
    redactHeader("Authorization")
}
```
(`BuildConfig` của module app; `buildConfig = true` đã bật sẵn ở `build.gradle.kts:64`.)

#### S0.6 Dọn bản ghi trùng đã sinh ra trên server do N2
Chạy **trên bản sao** `vihand.db` trước, kiểm tra tên bảng thật trong `schema.prisma` (có thể có `@@map`).
```sql
-- Xem trước số nhóm bị trùng
SELECT studentName, assignmentTitle, className, score, COUNT(*) AS c
FROM Grade GROUP BY studentName, assignmentTitle, className, originalText, score HAVING c > 1;

-- Xóa bản trùng: giữ bản có ảnh, sau đó là bản cũ nhất (cần SQLite >= 3.25)
DELETE FROM Grade WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY studentName, assignmentTitle, className, originalText, score
      ORDER BY (imagePath <> '') DESC, createdAt ASC) AS rn
    FROM Grade) WHERE rn > 1);
```

---

### SPRINT 1 — An toàn dữ liệu (lõi của toàn bộ kế hoạch)

#### S1.1 Lưu ảnh xuống đĩa ngay khi chụp (sửa P0-01, N9)

**Ý tưởng**: không bao giờ giải mã ảnh full-res thành `Bitmap` trong luồng chụp. Lấy thẳng byte JPEG từ CameraX, giải mã **thu nhỏ** (`inSampleSize`) rồi ghi file. Đỉnh RAM ~20 MB thay vì 48–96 MB.

```kotlin
// ImageFiles.kt (file mới)
fun ImageProxy.saveJpegDownscaled(dest: File, maxSide: Int = 1600, quality: Int = 85): Boolean {
    val buffer = planes[0].buffer                       // ImageCapture mặc định xuất JPEG
    val bytes = ByteArray(buffer.remaining()).also { buffer.get(it) }
    val rotation = imageInfo.rotationDegrees
    close()
    return saveJpegBytesDownscaled(bytes, rotation, dest, maxSide, quality)
}

fun saveJpegBytesDownscaled(bytes: ByteArray, rotation: Int, dest: File, maxSide: Int, quality: Int): Boolean {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2

    val decoded = BitmapFactory.decodeByteArray(
        bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample }
    ) ?: return false

    var bmp = decoded
    if (rotation != 0) {
        val m = Matrix().apply { postRotate(rotation.toFloat()) }
        bmp = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, m, true)
        if (bmp !== decoded) decoded.recycle()
    }
    val longSide = maxOf(bmp.width, bmp.height)
    if (longSide > maxSide) {
        val s = maxSide.toFloat() / longSide
        val scaled = Bitmap.createScaledBitmap(bmp, (bmp.width * s).toInt(), (bmp.height * s).toInt(), true)
        if (scaled !== bmp) bmp.recycle()
        bmp = scaled
    }
    FileOutputStream(dest).use { bmp.compress(Bitmap.CompressFormat.JPEG, quality, it) }
    bmp.recycle()
    return true
}
```
Dùng trong `CameraScanScreen`:
```kotlin
val pendingDir = remember { File(context.filesDir, "pending").apply { mkdirs() } }  // KHÔNG dùng cacheDir:
                                                                                     // hệ thống có thể xóa
val batchFiles = remember { mutableStateListOf<File>() }                             // thay batchBitmaps

override fun onCaptureSuccess(image: ImageProxy) {
    val dest = File(pendingDir, "scan_${System.currentTimeMillis()}.jpg")
    val ok = try { image.saveJpegDownscaled(dest) } catch (_: Exception) { false }
    scope.launch(Dispatchers.Main) {
        if (ok) dispatchCaptureFile(dest) else switchNotification = "Chụp lỗi, vui lòng thử lại"
    }
}

fun dispatchCaptureFile(file: File) {
    if (isBatchMode) {
        batchFiles.add(file)
        switchNotification = "Đã lưu bài #${batchFiles.size} (an toàn trên đĩa)"
    } else {
        val bmp = BitmapFactory.decodeFile(file.absolutePath)   // ≤ 1600px ≈ 8 MB, an toàn cho chế độ đơn
        // ... gọi onCaptureWithDetails / onCapture như cũ
    }
}
```
Thumbnail: giải mã nhỏ (`inSampleSize = 8`) trong `produceState` trên `Dispatchers.IO`, **không** dùng `asImageBitmap()` của ảnh gốc. Ảnh từ thư viện (`galleryLauncher`, `:358-371`) cũng đi qua `saveJpegBytesDownscaled` (đọc byte từ `contentResolver`).

Có thể giảm độ phân giải chụp ngay từ đầu (nhanh hơn, ít pin hơn):
```kotlin
val selector = ResolutionSelector.Builder()
    .setResolutionStrategy(ResolutionStrategy(Size(2560, 1920),
        ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER))
    .build()
ImageCapture.Builder()
    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
    .setResolutionSelector(selector)
    .build()
```
(Nên kiểm tra chữ viết tay vẫn đọc tốt ở 2560×1920 với ảnh thật trước khi chốt.)

#### S1.2 Migration Room v4 → v5 (làm **một lần**, chứa mọi thay đổi bảng)

```kotlin
// AppDatabase.kt
@Database(
    entities = [GradeRecordEntity::class, ClassEntity::class, StudentEntity::class,
                PendingGradeEntity::class, PendingDeletionEntity::class],
    version = 5,
    exportSchema = true          // bật để có file schema phục vụ MigrationTestHelper
)

val MIGRATION_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""CREATE TABLE IF NOT EXISTS pending_deletions (
            serverId TEXT NOT NULL PRIMARY KEY, deletedAt INTEGER NOT NULL)""")

        db.execSQL("""CREATE TABLE IF NOT EXISTS pending_grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            batchId TEXT NOT NULL, clientRequestId TEXT NOT NULL, filePath TEXT NOT NULL,
            studentName TEXT NOT NULL, className TEXT NOT NULL,
            studentGrade INTEGER NOT NULL, gradingMode TEXT NOT NULL,
            status TEXT NOT NULL, attempts INTEGER NOT NULL, lastError TEXT,
            nextRetryAt INTEGER NOT NULL, resultServerId TEXT, createdAt INTEGER NOT NULL)""")
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_pending_grades_clientRequestId ON pending_grades(clientRequestId)")

        db.execSQL("ALTER TABLE grade_records ADD COLUMN isDirty INTEGER NOT NULL DEFAULT 0")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_grade_records_serverId ON grade_records(serverId)")

        // Dọn serverId giả (N3) để các bản ghi này được coi là "chưa đồng bộ"
        db.execSQL("UPDATE grade_records SET serverId = NULL WHERE serverId LIKE 'srv\\_%' ESCAPE '\\'")
    }
}

// getDatabase(): thay fallbackToDestructiveMigration() bằng
.addMigrations(MIGRATION_4_5)
.fallbackToDestructiveMigrationOnDowngrade()   // chỉ khi hạ phiên bản
```
Entity phải khớp từng cột/chỉ mục với SQL ở trên, nếu không Room báo lỗi schema khi khởi động:
```kotlin
@Entity(tableName = "pending_deletions")
data class PendingDeletionEntity(@PrimaryKey val serverId: String, val deletedAt: Long = System.currentTimeMillis())

@Entity(tableName = "pending_grades", indices = [Index(value = ["clientRequestId"], unique = true)])
data class PendingGradeEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val batchId: String,
    val clientRequestId: String = UUID.randomUUID().toString(),
    val filePath: String,
    val studentName: String,
    val className: String,
    val studentGrade: Int = 3,
    val gradingMode: String = "dictation",
    val status: String = "QUEUED",        // QUEUED | DONE | FAILED_PERMANENT
    val attempts: Int = 0,
    val lastError: String? = null,
    val nextRetryAt: Long = 0,
    val resultServerId: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
// GradeRecordEntity: thêm  @ColumnInfo(defaultValue = "0") val isDirty: Boolean = false
//                    và     @Entity(indices = [Index("serverId")])
```
> [!WARNING]
> Chạy `MigrationTestHelper` (hoặc thử thủ công: cài bản cũ → nhập vài bài → cài đè bản mới) **trước khi phát hành**. Một lần migration sai ở đây xóa sổ điểm trên máy giáo viên.

#### S1.3 Hàng đợi chấm bài có retry đúng cách (sửa P0-02, P1-01)

**Phân loại lỗi** (điểm mấu chốt báo cáo 03 làm sai): `gradeImage` **không ném `HttpException`**, nó ném `ServerGradeException` (`GradeRepository.kt:137-141`), nên phải dựa vào `httpCode`.

```kotlin
// ServerGradeException: thêm trường
class ServerGradeException(
    override val message: String,
    val httpCode: Int? = null,
    val retryAfterSec: Long? = null,
    cause: Throwable? = null
) : Exception(message, cause)

// gradeImage, khối lỗi HTTP (:137-141):
val retryAfter = response.headers()["Retry-After"]?.toLongOrNull()
throw ServerGradeException(errMsg, httpCode = response.code(), retryAfterSec = retryAfter)
```
```kotlin
private fun ServerGradeException.isRetryable() =
    httpCode == null || httpCode == 408 || httpCode == 429 || httpCode in 500..599

private fun ServerGradeException.isOffline() =
    cause is java.net.UnknownHostException || cause is java.net.ConnectException
```
**Bộ xử lý hàng đợi** (chạy trong ViewModel khi người dùng đang xem, và trong Worker khi nền):
```kotlin
suspend fun processPending(serverUrl: String, onTick: () -> Unit = {}): Int {   // trả số bài còn lại
    while (true) {
        val job = pendingDao.nextDue(System.currentTimeMillis()) ?: break
        val bmp = BitmapFactory.decodeFile(job.filePath)
        if (bmp == null) {   // file hỏng/mất
            pendingDao.update(job.id, "FAILED_PERMANENT", job.attempts, "File ảnh không đọc được", 0, null); continue
        }
        try {
            val res = gradeImage(
                bitmap = bmp, serverUrl = serverUrl, studentGrade = job.studentGrade,
                gradingMode = job.gradingMode, studentName = job.studentName, className = job.className,
                clientRequestId = job.clientRequestId          // xem S1.6 (idempotency)
            )
            pendingDao.update(job.id, "DONE", job.attempts + 1, null, 0, res.id)
            File(job.filePath).delete()                        // chỉ xóa sau khi đã có kết quả
        } catch (e: ServerGradeException) {
            when {
                e.isOffline() -> {                              // mất mạng: dừng, KHÔNG tăng attempts
                    pendingDao.update(job.id, "QUEUED", job.attempts, "Mất kết nối", 0, null); break
                }
                e.isRetryable() && job.attempts < 5 -> {
                    val backoff = e.retryAfterSec ?: minOf(300L, 3L shl job.attempts)
                    val jitter = (0..1000).random()
                    pendingDao.update(job.id, "QUEUED", job.attempts + 1, e.message,
                        System.currentTimeMillis() + backoff * 1000 + jitter, null)
                }
                else -> pendingDao.update(job.id, "FAILED_PERMANENT", job.attempts + 1, e.message, 0, null)
            }
        } finally { bmp.recycle() }
        onTick()
    }
    return pendingDao.countPending()
}
```
Lưu ý thiết kế:
- **Không chèn `delay(1500)` cố định** như báo cáo 03: mỗi bài đã mất 4–8 s; chỉ cần tôn trọng `Retry-After`. Delay cố định chỉ làm lô 35 bài chậm thêm ~50 s.
- **Không `bmp.recycle()` trước khi dùng xong kết quả**: `gradeImage` gán `photoBitmap = bitmap` vào `GradeResult` (`GradeRepository.kt:223`). Ở đây ta recycle sau khi kết quả đã lưu và UI đọc ảnh từ `photoPath`, nên phải đảm bảo UI không giữ `photoBitmap` của lô.
- `CancellationException` phải được ném lại (không bắt chung `Exception`), để hủy coroutine hoạt động đúng.

**Giao diện**: nút "Bắt đầu chấm cả lớp" chỉ việc `insert` N dòng `pending_grades` (cùng `batchId`) rồi gọi `processPending`. Màn hình hiển thị `X/N xong · Y chờ thử lại · Z lỗi`, nút **"Thử lại các bài lỗi"** gọi `requeueFailed()`. Nếu app bị tắt giữa chừng, lần mở sau gọi lại `processPending` để chạy tiếp, **không mất bài nào**.

**Chạy nền khi có mạng** (sửa P1-01) — bọc cùng hàm trong WorkManager:
```kotlin
// build.gradle.kts: implementation("androidx.work:work-runtime-ktx:<phiên bản ổn định mới nhất>")
class GradeSyncWorker(ctx: Context, p: WorkerParameters) : CoroutineWorker(ctx, p) {
    override suspend fun doWork(): Result {
        val repo = GradeRepository(applicationContext)
        val remaining = withTimeoutOrNull(8 * 60_000L) {          // 1 lần chạy < 10 phút
            repo.processPending(serverUrlFromPrefs(applicationContext))
        } ?: return Result.retry()
        return if (remaining == 0) Result.success() else Result.retry()
    }
}

fun enqueueGradeSync(ctx: Context) {
    val req = OneTimeWorkRequestBuilder<GradeSyncWorker>()
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
        .build()
    WorkManager.getInstance(ctx).enqueueUniqueWork("grade_sync", ExistingWorkPolicy.KEEP, req)
}
```
> [!NOTE]
> `_serverUrl` hiện chỉ là `MutableStateFlow` trong ViewModel (`MainViewModel.kt:60`), nên Worker cần địa chỉ server được **lưu vào SharedPreferences**. Hãy kiểm tra `LoginScreen`/`updateServerUrl` đã lưu chưa; nếu chưa thì bổ sung.

#### S1.4 Xóa đồng bộ không hồi sinh (sửa P0-03, P1-04)

```kotlin
// GradeRecordDao
@Query("SELECT * FROM grade_records WHERE serverId = :sid LIMIT 1") suspend fun getByServerId(sid: String): GradeRecordEntity?
@Query("SELECT serverId FROM grade_records WHERE serverId IS NOT NULL") suspend fun getAllServerIds(): List<String>
@Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun markPendingDeletion(d: PendingDeletionEntity)
@Query("SELECT serverId FROM pending_deletions") suspend fun getAllPendingDeletions(): List<String>
@Query("DELETE FROM pending_deletions WHERE serverId = :sid") suspend fun removePendingDeletion(sid: String)
```
```kotlin
// GradeRepository — nhận cả ID Room (số) lẫn ID server (chuỗi)
suspend fun deleteByAnyId(idOrServerId: String, serverUrl: String?) = withContext(Dispatchers.IO) {
    val rec = dao.getByServerId(idOrServerId)
        ?: idOrServerId.toLongOrNull()?.let { dao.getRecordByIdDirect(it) }
    val sId = rec?.serverId ?: idOrServerId.takeIf { rec == null && it.toLongOrNull() == null }

    rec?.let {
        dao.deleteRecordById(it.id)
        it.photoPath?.let { p -> File(p).delete() }           // dọn ảnh rác (P1-04)
    }
    if (!sId.isNullOrBlank()) {
        dao.markPendingDeletion(PendingDeletionEntity(sId))   // ghi tombstone TRƯỚC khi gọi mạng
        flushDeletion(sId, serverUrl)
    }
}

private suspend fun flushDeletion(sId: String, serverUrl: String?) {
    if (serverUrl.isNullOrBlank()) return
    try {
        val res = NetworkClient.createService(serverUrl).deleteGrade(sId)
        if (res.isSuccessful || res.code() == 404) dao.removePendingDeletion(sId)
    } catch (_: java.io.IOException) { /* còn tombstone, sẽ xóa bù lần sau */ }
}

suspend fun flushPendingDeletions(serverUrl: String) =
    dao.getAllPendingDeletions().forEach { flushDeletion(it, serverUrl) }
```
`fetchGradesFromServer` phải **lọc tombstone** để danh sách hiển thị không nhấp nháy lại:
```kotlin
val tomb = dao.getAllPendingDeletions().toSet()
serverList.filter { it.id !in tomb }.map { ... }
```
`MainViewModel.deleteHistoryItem(idString)` gọi `repository.deleteByAnyId(...)`, rồi xóa ngay phần tử khỏi `_serverGradesList` (cập nhật lạc quan) để giáo viên thấy tác dụng tức thì.

**Viết lại `syncTwoWayWithServer`** (sửa luôn N2, N6):
```kotlin
suspend fun syncTwoWayWithServer(serverUrl: String, studentName: String? = null, className: String? = null)
: Triple<Int, Int, Int> = withContext(Dispatchers.IO) {
    flushPendingDeletions(serverUrl)                              // 1. xóa bù trước
    val (up, failed) = pushUnsynced(serverUrl)                    // 2. chỉ đẩy bài chưa có serverId / đã sửa (isDirty)

    val tomb = dao.getAllPendingDeletions().toSet()               // 3. kéo về, so bằng serverId (không phải tên+tiêu đề)
    val local = dao.getAllServerIds().toSet()
    val serverGrades = fetchGradesFromServer(serverUrl, className, studentName)
        .filter { it.id !in tomb && it.id !in local }
    serverGrades.forEach { saveRecord(it) }
    Triple(up, failed, serverGrades.size)
}
```
`pushUnsynced` lấy `getUnsyncedRecords()`; với mỗi bản ghi POST xong thì đọc `grade.id` trong phản hồi (`Map<String, Any>`) rồi `UPDATE grade_records SET serverId = :id`; với bản `isDirty = 1` thì gọi `updateGradeOnServer`, thành công mới đặt `isDirty = 0`.

#### S1.5 Sửa điểm không nhân bản bản ghi (sửa P1-05, N7)

Thống nhất **một định danh**: `GradeResult.id` luôn là `serverId` nếu có.
```kotlin
// toModel(): thay  id = id.toString()  bằng
id = serverId ?: id.toString()
```
```kotlin
suspend fun saveRecord(result: GradeResult, markDirty: Boolean = false): Long = withContext(Dispatchers.IO) {
    val sid = result.id.takeIf { it.isNotBlank() && it.toLongOrNull() == null }   // ID dạng cuid/uuid
    val existing = sid?.let { dao.getByServerId(it) }
        ?: result.id.toLongOrNull()?.let { dao.getRecordByIdDirect(it) }

    val entity = GradeRecordEntity(
        id = existing?.id ?: 0,                       // có sẵn ⇒ REPLACE ghi đè đúng dòng
        /* ... các trường còn lại như hiện tại ... */
        serverId = existing?.serverId ?: sid,
        isDirty = markDirty || (existing?.isDirty ?: false)
    )
    dao.insertRecord(entity)
}
```
Trong `saveModifiedGrade`:
```kotlin
repository.saveRecord(modified, markDirty = true)
val ok = repository.updateGradeOnServer(...)         // dùng ID server
if (ok) repository.markClean(modified.id)
```
Nếu PATCH hỏng, cờ `isDirty` giữ lại và lần đồng bộ kế tiếp sẽ đẩy lại, **chỉnh sửa của giáo viên không bị mất**.

#### S1.6 Server chống xử lý trùng (idempotency) — bắt buộc nếu có retry

Retry sau timeout có thể khiến server đã chấm xong mà client không nhận được phản hồi ⇒ chấm lần 2, tốn quota Gemini và sinh bản ghi trùng.

`prisma/schema.prisma`, model `Grade`:
```prisma
clientRequestId  String?  @unique   // UUID do app sinh cho mỗi bài trong hàng đợi
```
`mobile/grade/route.ts`, ngay sau khi đọc `body`:
```ts
const clientRequestId =
  typeof body.clientRequestId === "string" ? body.clientRequestId.slice(0, 64) : null

if (clientRequestId) {
  const existing = await prisma.grade.findUnique({ where: { clientRequestId } })
  if (existing) return NextResponse.json(gradeRowToAndroidResponse(existing))   // trả lại kết quả cũ
}
// ... khi prisma.grade.create: thêm  clientRequestId,
```
`gradeRowToAndroidResponse` dựng lại JSON từ bản ghi (`scoreBreakdown`, `corrections`, `pedagogicalComment`...) theo đúng định dạng `transformForAndroid` đang trả. Android thêm `@Json(name = "clientRequestId") val clientRequestId: String? = null` vào `GradeApiRequest`.
> [!CAUTION]
> `start.sh` chạy `prisma db push --accept-data-loss`. Cột mới có thể `NULL` và `@unique` cho phép nhiều `NULL` trong SQLite nên an toàn, nhưng **vẫn phải sao lưu DB (S0.1) trước khi triển khai**.

#### S1.7 Điều chỉnh rate limit phía server (sửa N8)

```ts
// lib/api-guard.ts
export function guardAiRoute(req: NextRequest, max = 30, extraKey = ""): NextResponse | null {
  const ip = getClientIp(req)
  const rate = checkRateLimit(`ai:${ip}:${extraKey}`, max)
  // ... giữ nguyên phần còn lại
}

// mobile/grade/route.ts
const device = req.headers.get("x-device-id")?.slice(0, 64) ?? ""
const blocked = guardAiRoute(req, Number(process.env.MOBILE_GRADE_RPM ?? 40), device)
```
App sinh `X-Device-Id` (UUID lưu một lần trong SharedPreferences) và gửi trong mọi request. Đây **chỉ là cách chia xô công bằng cho nhiều giáo viên chung IP**, không phải biện pháp bảo mật (header giả mạo được). Biến môi trường `MOBILE_GRADE_RPM` cho phép hạ xuống 3–5 khi kiểm thử retry 429.

---

### SPRINT 2 — Nghiệp vụ lớp học

#### S2.1 Gán học sinh thật cho từng bài trong lô (sửa P1-02)

Mô hình: trước khi chụp, giáo viên chọn lớp. Mỗi ảnh vào lô tự nhận **học sinh kế tiếp chưa có bài**, kèm nút đổi tên / "bỏ qua học sinh vắng".

```kotlin
data class BatchItem(val file: File, val studentName: String)

private val viCollator = Collator.getInstance(Locale("vi", "VN"))
// Danh sách lớp ở Việt Nam sắp theo TÊN (từ cuối), không theo họ
fun sortRoster(names: List<String>) = names.sortedWith(
    compareBy<String>(viCollator) { it.trim().substringAfterLast(' ') }.thenBy(viCollator) { it }
)

fun nextUnassigned(roster: List<String>, items: List<BatchItem>, skipped: Set<String>): String {
    val used = items.map { it.studentName }.toSet()
    return roster.firstOrNull { it !in used && it !in skipped } ?: "Học sinh ${items.size + 1}"
}
```
`onBatchCapture` đổi chữ ký thành `(List<BatchItem>, className: String)`; `pending_grades.studentName` lấy từ `BatchItem`.
> Cơ sở dữ liệu hiện **không có số thứ tự học sinh** (`StudentEntity`: id/name/username/className), nên sắp theo tên là phương án thực tế nhất; chỉ thêm cột số thứ tự nếu giáo viên yêu cầu.

#### S2.2 Màn hình tổng kết lô (sửa P1-03)

Không cần truy vấn mới phức tạp: lấy các dòng `pending_grades` của `batchId` và `grade_records` theo `resultServerId`.
```kotlin
data class BatchSummary(
    val total: Int, val ok: Int, val failed: Int,
    val excellent: Int, val good: Int, val fair: Int, val needsWork: Int,
    val topErrors: List<Pair<String, Int>>
)

fun buildSummary(jobs: List<PendingGradeEntity>, results: List<GradeResult>): BatchSummary {
    val s = results.map { it.criteria.totalScore }
    val topErrors = results.flatMap { it.errors }
        .groupingBy { "${it.originalWord} → ${it.correctedWord}" }.eachCount()
        .entries.sortedByDescending { it.value }.take(3).map { it.key to it.value }
    return BatchSummary(
        total = jobs.size, ok = jobs.count { it.status == "DONE" },
        failed = jobs.count { it.status == "FAILED_PERMANENT" },
        excellent = s.count { it >= 9f }, good = s.count { it >= 8f && it < 9f },   // cùng ngưỡng với GradeRecordDao
        fair = s.count { it >= 6.5f && it < 8f }, needsWork = s.count { it < 6.5f },
        topErrors = topErrors
    )
}
```
UI: thẻ tiến độ, thanh phổ điểm, 3 lỗi sai phổ biến, danh sách bài (bấm để mở chi tiết), nút **"Thử lại các bài lỗi"**.

#### S2.3 Bỏ dữ liệu giả khỏi bản release (sửa P1-07, N11)

- `getClassesList`/`getStudentsList` (`GradeRepository.kt:443-446,486-489`): **không** `insertClasses(defaultClasses)` vào Room nữa. Trả danh sách rỗng và để UI hiển thị *"Chưa tải được danh sách lớp. Kiểm tra mạng hoặc nhấn Thử lại"*. Giữ `defaultClasses`/`defaultStudents` chỉ khi `BuildConfig.DEBUG`.
- Xóa các dòng giả đã lỡ lưu: một lần dọn trong migration hoặc nút "Làm mới danh sách" gọi `classDao.deleteAll()` rồi tải lại.
- Khi mất mạng lúc chấm: bài tự rơi vào `pending_grades` kèm thông báo *"Đã lưu, sẽ tự chấm khi có mạng"* (đã giải quyết bởi S1.3), nên không còn lý do dùng bài mẫu.

#### S2.4 Truyền đúng chế độ chấm (sửa lỗi hợp đồng Phần II)

- `MainActivity.kt:337`: thay `_` bằng `mode` và truyền `gradingMode = mode` xuống `gradeBitmap` → `gradeImage`.
- `GradeApiRequest.theLoai` đổi thành `String? = null` (và `hinhThuc`/`noiDung` thành nullable) để server dùng thể loại do OCR nhận diện khi app không chủ ý chỉ định.
- Cần **quyết định sản phẩm** trước: chế độ "essay (4-3-2-1)" có thật sự muốn hỗ trợ trên di động không? Nếu không, ẩn lựa chọn đó khỏi UI thay vì để nó "có mà không chạy".

---

### SPRINT 3 — Bảo mật & quyền riêng tư

> [!IMPORTANT]
> **Triển khai theo 2 pha để không làm hỏng Web hiện tại.** Giao diện Web (`app/…`) và các app cũ đang gọi các endpoint này không kèm token. Nếu bật bắt buộc ngay, mọi thứ sẽ 401.
> **Pha A**: server nhận token nếu có, **chỉ ghi log** khi thiếu. **Pha B**: sau khi app mới và Web đã gửi token, đặt `ENFORCE_AUTH=true`.

#### S3.1 Server — băm mật khẩu và phát JWT

Dùng `bcryptjs` (JavaScript thuần, **không cần biên dịch native** trên Raspberry Pi/ARM) và `jose` (nhẹ, chuẩn):
```ts
// lib/auth.ts
import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { NextRequest, NextResponse } from "next/server"

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)   // >= 32 ký tự ngẫu nhiên, đặt trong .env

export const hashPassword = (p: string) => bcrypt.hash(p, 10)

export async function signToken(user: { id: string; role: string }) {
  return new SignJWT({ role: user.role }).setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id).setIssuedAt().setExpirationTime("14d").sign(secret)
}

export async function requireAuth(req: NextRequest, roles?: string[]) {
  const h = req.headers.get("authorization") ?? ""
  const token = h.startsWith("Bearer ") ? h.slice(7) : ""
  try {
    const { payload } = await jwtVerify(token, secret)
    const user = { id: String(payload.sub), role: String(payload.role) }
    if (roles && !roles.includes(user.role)) {
      return NextResponse.json({ error: "Không đủ quyền" }, { status: 403 })
    }
    return user
  } catch {
    if (process.env.ENFORCE_AUTH !== "true") return { id: "", role: "legacy" }   // Pha A: cho qua + log
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })
  }
}
```
**Di chuyển mật khẩu dần (không bắt ai đổi mật khẩu)** — `auth/login/route.ts`:
```ts
const hashed = user.password.startsWith("$2")
const ok = hashed ? await bcrypt.compare(password, user.password) : user.password === password
if (!ok) return NextResponse.json({ error: "Mật khẩu không đúng" }, { status: 401 })
if (!hashed) await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(password) } })
// ... rồi trả thêm  token: await signToken(user)
```
Cũng phải băm mật khẩu ở các nơi **tạo/đổi** mật khẩu: `auth/register`, `auth/admin-register`, `users`, `users/[id]` (kiểm tra bằng `grep -rn "password" app/api`), và script seed (`prisma/seed-admin.js`, `seed-test-users.js`).

Áp dụng `requireAuth` cho `mobile/grade`, `grades`, `grades/[id]`, `users`, `classes`. **Phân quyền theo dữ liệu**, không chỉ "đã đăng nhập": học sinh chỉ đọc bài của chính mình; giáo viên chỉ đọc lớp mình quản lý (`user.classes`); hiện `GET /api/grades` trả mọi bài theo `search`/`class` do client tự gửi.

#### S3.2 Ảnh bài thi riêng tư

1. Đổi thư mục lưu: `UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads")`, **ngoài `public/`**. Với Docker, đặt `UPLOAD_DIR=/data/uploads` (cùng volume `/data` mà `start.sh` đã tạo cho DB) để ảnh không mất khi tạo lại container (đồng thời xử lý N13).
2. Endpoint phục vụ ảnh có kiểm quyền:
```ts
// app/api/grades/photo/[filename]/route.ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { filename } = await params
  if (!/^[\w.-]+\.jpg$/.test(filename)) return NextResponse.json({ error: "Tên file không hợp lệ" }, { status: 400 })
  // Học sinh: kiểm bài thuộc về mình (tra Grade theo imagePath) — giáo viên/admin: cho qua
  const buf = await fs.readFile(path.join(UPLOAD_DIR, "grades", filename)).catch(() => null)
  if (!buf) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 })
  return new NextResponse(buf, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" } })
}
```
3. Chuyển ảnh cũ: script một lần di chuyển `public/uploads/grades/*` sang `UPLOAD_DIR/grades` và cập nhật `imagePath` trong DB sang `/api/grades/photo/<tên file>`.
4. **Chính sách lưu trữ**: schema đã có `expiresAt`/`isAnonymized` (`schema.prisma`), nhưng cần xác nhận có job dọn ảnh hết hạn thực sự chạy (`app/api/admin/retention/route.ts` có vẻ là điểm vào; **chưa kiểm tra**).

#### S3.3 Android — gửi token và lưu an toàn

`NetworkClient` hiện là `object` không có `Context`, và manifest **chưa khai báo lớp `Application`**, nên cần tạo `ViHandApp : Application` và đăng ký `android:name=".ViHandApp"`:
```kotlin
class AuthInterceptor(
    private val token: () -> String?, private val deviceId: () -> String, private val onUnauthorized: () -> Unit
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val req = chain.request().newBuilder().header("X-Device-Id", deviceId())
        token()?.takeIf { it.isNotBlank() }?.let { req.header("Authorization", "Bearer $it") }
        val res = chain.proceed(req.build())
        if (res.code == 401) onUnauthorized()          // phiên hết hạn ⇒ về màn hình đăng nhập
        return res
    }
}
```
- Thêm `.addInterceptor(AuthInterceptor(...))` vào `OkHttpClient`.
- **Coil** (tải ảnh bài thi, `PhotoBoundingBoxViewer.kt:477`) dùng `ImageLoader` riêng, nên phải tạo `ImageLoader.Builder(ctx).okHttpClient { NetworkClient.okHttpClient }.build()` để ảnh từ endpoint có quyền vẫn tải được.
- Lưu token: SharedPreferences riêng tư là mức tối thiểu chấp nhận được **nếu** đặt `allowBackup=false` và token có hạn. `EncryptedSharedPreferences` (`security-crypto`) đã bị Google đánh dấu **deprecated** ở các bản mới; hãy kiểm tra tình trạng hiện tại trước khi chọn, hoặc dùng Android Keystore (AES-GCM) bọc token.
- `AndroidManifest.xml`: `allowBackup="false"`; bỏ `usesCleartextTraffic="true"` và chỉ cho phép HTTP ở bản debug qua `networkSecurityConfig` (URL mặc định đã là `https://`, `NetworkClient.kt:12`).
- `build.gradle.kts`: đổi `implementation(libs.firebase.appcheck.debug)` thành `debugImplementation`; bật `isMinifyEnabled = true` **sau khi** thêm quy tắc giữ lớp Moshi/Retrofit và kiểm thử đầy đủ bản release.

---

### SPRINT 4 — Hoàn thiện trải nghiệm & hiệu năng

#### S4.1 Kiểm tra chất lượng ảnh ngay sau khi chụp (sửa P2-07)

Làm **sau khi chụp** (một lần, trên ảnh đã thu nhỏ) thay vì phân tích từng khung hình: đơn giản, ít tốn pin, ít sai hơn.
```kotlin
fun laplacianVariance(src: Bitmap, target: Int = 480): Double {
    val s = target.toFloat() / maxOf(src.width, src.height)
    val b = if (s < 1f) Bitmap.createScaledBitmap(src, (src.width * s).toInt(), (src.height * s).toInt(), true) else src
    val w = b.width; val h = b.height
    val px = IntArray(w * h).also { b.getPixels(it, 0, w, 0, 0, w, h) }
    val g = FloatArray(w * h) { i -> 0.299f * ((px[i] shr 16) and 255) + 0.587f * ((px[i] shr 8) and 255) + 0.114f * (px[i] and 255) }
    var sum = 0.0; var sumSq = 0.0; var n = 0
    for (y in 1 until h - 1) for (x in 1 until w - 1) {
        val i = y * w + x
        val l = -4 * g[i] + g[i - 1] + g[i + 1] + g[i - w] + g[i + w]
        sum += l; sumSq += l * l; n++
    }
    val mean = sum / n
    return sumSq / n - mean * mean
}
```
`meanLuma` tính tương tự từ mảng `g`. Nếu dưới ngưỡng thì hiện *"Ảnh có vẻ mờ/tối — Chụp lại / Vẫn dùng"*, **không chặn cứng** (giáo viên có thể cố ý chụp trang ít chữ).
> Hai ngưỡng (độ nét, độ sáng) trong báo cáo 03 (100 và 60) **không áp dụng trực tiếp**: phương sai Laplace phụ thuộc kích thước ảnh. Chụp khoảng 20 ảnh bài thật (rõ và mờ, đủ sáng và tối), in giá trị ra log, chọn ngưỡng nằm giữa hai nhóm.

#### S4.2 Tiến trình thật thay vì thanh giả (sửa P2-06)

Server không phát tiến trình theo bước (không có SSE) nên **đừng bịa phần trăm**. Hiển thị trạng thái không xác định cùng đồng hồ đếm giây, và nút Hủy:
```kotlin
val ticker = launch {
    var s = 0
    while (isActive) {
        _gradingState.value = GradingUiState.Processing("Đang chấm bài… ${s}s (thường 5–15 giây)", -1f)
        delay(1000); s++
    }
}
try { /* gọi repository.gradeImage(...) */ } finally { ticker.cancel() }
```
UI: nếu `progress < 0f` dùng `LinearProgressIndicator()` không tham số, ngược lại dùng bản có giá trị. Bỏ bốn lệnh `delay` giả ở `MainViewModel.kt:259-265`.

**Đăng nhập Khách khi offline** (`MainViewModel.kt:401-419`): bỏ bước `testConnection` bắt buộc; cho vào ngay, tải danh sách lớp/bài ở nền. Đăng nhập tài khoản thật vẫn cần mạng (hợp lý), nhưng phiên đã lưu (`UserSessionManager`) tiếp tục dùng được offline.

#### S4.3 Lịch sử mượt, không cần Paging 3 (sửa P2-01, P2-04)

Đây là chỗ báo cáo 03 đề xuất nặng hơn mức cần thiết. Với ≤ 500 bài, hai thay đổi rẻ này là đủ:
```kotlin
// 1) Parse JSON ngoài main thread
val allGradedRecords = dao.getAllRecords()
    .map { list -> list.map { it.toModel() } }
    .flowOn(Dispatchers.Default)

// 2) (tùy chọn) truy vấn "nhẹ" cho danh sách: không nạp extractedText / correctedFullText / errorsJson,
//    chỉ nạp chi tiết theo id khi mở bài
@Query("SELECT id, timestamp, studentName, className, essayTitle, totalScore, serverId, photoPath FROM grade_records ORDER BY timestamp DESC")
fun getHistoryItems(): Flow<List<HistoryRow>>
```
Chỉ cân nhắc Paging 3 nếu **đo được** lag sau khi áp dụng hai bước trên. Nếu muốn dùng Moshi codegen thay reflection, thêm `@JsonClass(generateAdapter = true)` cho `ErrorBox` (dependency `ksp(libs.moshi.kotlin.codegen)` đã có).

Phía server (N12): thêm phân trang và bỏ trường nặng cho `GET /api/grades`:
```ts
const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
const cursor = searchParams.get("cursor")
const grades = await prisma.grade.findMany({
  where: { /* như cũ */ },
  orderBy: { createdAt: "desc" }, take: limit + 1,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  omit: { imageBase64: true }          // Prisma 5.22 hỗ trợ `omit` (preview) — nếu chưa bật, dùng `select`
})
```
App chỉ tải trang đầu và các trang mới sau khi chấm, thay vì tải lại toàn bộ sổ điểm sau mỗi bài (`MainViewModel.kt:279`).

#### S4.4 Bàn phím (sửa P2-03)

Test trên máy thật trước; nhưng các thay đổi sau luôn an toàn:
```kotlin
// LoginScreen, ProfileSettingsScreen, hộp thoại nhập liệu
Column(modifier = Modifier.imePadding().verticalScroll(rememberScrollState()) /* ... */)
```
và thêm `android:windowSoftInputMode="adjustResize"` cho `MainActivity` trong manifest. Với `Dialog`, thêm `DialogProperties(decorFitsSystemWindows = false)` chỉ khi test thấy bị che.

---

## PHẦN 4. KIỂM THỬ CHẤP NHẬN (để chứng minh đã sửa, không chỉ "build qua")

| # | Kịch bản | Cách làm | Đạt khi |
| :-: | :-- | :-- | :-- |
| 1 | **Bộ nhớ lô 40 ảnh** | Chụp liên tiếp 40 ảnh (hoặc nạp 40 ảnh từ thư viện); chạy `adb shell dumpsys meminfo <package>` trước/giữa/sau | "Java Heap" + "Native Heap" không tăng tuyến tính theo số ảnh; không crash |
| 2 | **Tắt app giữa lô** | Chụp 10 ảnh → bấm chấm → vuốt tắt app sau bài thứ 3 → mở lại | Còn đủ 7 bài trong hàng đợi, tự chạy tiếp, không mất ảnh |
| 3 | **Mất mạng giữa lô** | Bật chế độ máy bay khi đang chấm bài thứ 5, sau 2 phút tắt đi | Các bài còn lại ở trạng thái "chờ", tự chấm khi có mạng (WorkManager), không bài nào hiện "lỗi" |
| 4 | **429 thật** | Đặt `MOBILE_GRADE_RPM=3` trên server thử nghiệm, chấm lô 10 bài | Bài bị 429 được thử lại theo `Retry-After`, cuối cùng 10/10 thành công |
| 5 | **Timeout không sinh trùng** | Giả lập server chậm hơn `callTimeout`, rồi cho phản hồi | Server chỉ có **1** bản ghi cho mỗi `clientRequestId` |
| 6 | **Xóa offline** | Offline → xóa bài đã đồng bộ → bật mạng → mở app | Bài không hồi sinh; server không còn bản ghi; tombstone được dọn |
| 7 | **Xóa từ danh sách server** | Online, bấm xóa một bài trong màn Lịch sử | Bài biến mất ngay; file ảnh local bị xóa |
| 8 | **Sửa điểm** | Chấm 1 bài → sửa điểm → xem Lịch sử và Web | Chỉ **1** bản ghi, Web nhận điểm đã sửa |
| 9 | **Không đẩy lại dữ liệu** | Mở app 3 lần liên tiếp | Số bản ghi trên server không tăng |
| 10 | **Nâng cấp từ bản cũ** | Cài bản v4, nhập 5 bài, cài đè bản mới | 5 bài còn nguyên (kiểm thử migration) |
| 11 | **Camera lỗi** | Thu hồi quyền camera / bấm màn trập khi vừa mở màn hình (bản release) | Báo lỗi, **không** có bài mẫu nào được gửi |
| 12 | **Bảo mật** (sau Pha B) | `curl` gọi `/api/grades` và `/api/grades/photo/x.jpg` không token | 401 cả hai; học sinh A không đọc được bài học sinh B |

---

## PHẦN 5. CẢNH BÁO VỀ CODE MẪU TRONG BÁO CÁO 03 (đừng chép nguyên)

| Đoạn trong báo cáo 03 | Vấn đề |
| :-- | :-- |
| P0-02 blueprint: `catch (e: retrofit2.HttpException)` với `e.code() == 429` | **Nhánh này không bao giờ chạy.** `gradeImage` dùng `Response<T>` và ném `ServerGradeException` (`GradeRepository.kt:137-141`), không ném `HttpException`. Mọi 429 sẽ rơi xuống `catch (e: Exception) { break }` ⇒ **vẫn mất bài**. Dùng `httpCode` như ở S1.3. |
| P0-02 blueprint: `bmp.recycle()` ngay sau `repository.gradeImage(...)` | `gradeImage` đặt `photoBitmap = bitmap` vào `GradeResult` (`GradeRepository.kt:223`); kết quả cuối được UI hiển thị ⇒ **crash "trying to use a recycled bitmap"**. |
| P0-01 blueprint: `bitmap.recycle()` trong `dispatchCapture` | Nhánh fallback của camera truyền bitmap **được cache** (`cachedBitmaps`, `CameraScanScreen.kt:349-355`); recycle xong, lần chụp sau dùng lại sẽ crash. (Với phương án S1.1 vấn đề này biến mất vì không còn giữ Bitmap.) |
| P0-03 blueprint: nâng Room v5 + bảng `pending_deletions` | Không có `Migration`, trong khi `fallbackToDestructiveMigration()` đang bật ⇒ **xóa sạch sổ điểm local** khi cập nhật (N5). |
| P0-03 blueprint: `res.isSuccessful` làm điều kiện xóa tombstone | Server hiện trả 500 khi bài đã mất (N4); phải sửa server (S0.4) và coi `404` là thành công. |
| P0-02: `delay(1500)` sau mỗi bài | Không cần thiết (xem S1.3); chỉ làm lô chậm thêm. |
| P2-06: "thông điệp trạng thái thực tế từ Server SSE/WebSocket" | Không có hạ tầng này; công sức lớn, lợi ích nhỏ. Dùng bộ đếm giây (S4.2). |

---

## PHẦN 6. NHỮNG VIỆC CỐ Ý CHƯA LÀM (và lý do)

| Hạng mục | Quyết định | Lý do |
| :-- | :-- | :-- |
| **CRUD lớp/học sinh trên di động** (P2-02) | Hoãn | Giáo viên đã có Web Studio; chỉ làm khi có yêu cầu thực tế. Việc cần làm trước là bỏ dữ liệu giả (S2.3). |
| **Paging 3** (P2-01) | Hoãn | `flowOn(Default)` + truy vấn nhẹ đủ cho vài trăm bài. Đo trước khi thêm thư viện. |
| **SSE/WebSocket cho tiến trình** | Không làm | Bộ đếm giây trung thực đã đủ. |
| **Foreground Service chạy lô dài** | Chưa | Cần thông báo thường trực + quyền; WorkManager chia nhỏ 8 phút/lần đã đủ cho ~35 bài. Xem xét lại nếu lô lớn hơn. |
| **Nhận diện biên giấy / cắt nghiêng tự động** | Ngoài phạm vi | Không thuộc các lỗi đã kiểm toán. |

---

## KẾT LUẬN

1. **Báo cáo 03 đáng tin về hướng**: cả 17 phát hiện đều có thật. Điều chỉnh lớn nhất là P0-02 (cơ chế 429), P1-07 (không tự động) và P2-03 (chưa chắc che nút).
2. **Hai lỗi nặng nhất báo cáo bỏ sót**: **N1** (camera lỗi ⇒ chấm bài mẫu như bài thật) và **N2** (mỗi lần mở app đẩy trùng toàn bộ sổ điểm lên server). Cả hai nên sửa **trong ngày** (Sprint 0, ~1 ngày công), vì mỗi lần giáo viên dùng app, dữ liệu sai lại tích lũy thêm.
3. **Đừng sửa từng lỗi riêng lẻ**. Bảng `pending_grades` + một `Migration` + `clientRequestId` ở server giải quyết đồng thời mất bài, văng app, offline, chọn học sinh và tổng kết lô.
4. **Rủi ro khi triển khai lớn nhất** không nằm ở Android mà ở **nâng cấp dữ liệu**: Room phải có `Migration`, server phải sao lưu `vihand.db` trước khi `db push`, và bảo mật phải bật theo hai pha để Web không bị 401.
5. **Việc cần làm tiếp theo (cần bạn quyết định)**: (a) chế độ chấm "essay 4-3-2-1" có hỗ trợ trên di động không; (b) có triển khai ảnh riêng tư cùng đợt với JWT hay tách riêng; (c) cho phép tôi triển khai Sprint 0 ngay không, vì phần lớn là sửa nhỏ, rủi ro thấp.
