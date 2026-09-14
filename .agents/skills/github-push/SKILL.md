---
name: github-push
description: >
  Đẩy toàn bộ thay đổi của dự án ViHand Grade lên GitHub (origin) và tùy chọn HuggingFace Spaces (hf)
  một cách an toàn — tự động quét lộ secret/token, kiểm tra file nhị phân lớn (>10MB), bảo vệ database
  SQLite vihand.db, hỗ trợ tiếng Việt UTF-8 trên Windows, tạo conventional commit message thông minh,
  và xử lý push an toàn. Kích hoạt khi người dùng nói: "push lên github", "đẩy code lên", "commit và push",
  "git push", "upload lên github", hoặc tương tự.
---

# GitHub Push Skill (ViHand Grade)

Mục tiêu: Đẩy toàn bộ thay đổi của project lên GitHub (`origin`) và tùy chọn Hugging Face Spaces (`hf`) một cách an toàn tuyệt đối:
- **Không lộ API Key / Access Token** (Gemini, HuggingFace, OpenAI).
- **Không bao giờ push database SQLite chứa dữ liệu học sinh** (`prisma/*.db*`).
- **Không commit file nhị phân quá nặng** (>10MB, >50MB) làm phình repo vĩnh viễn.
- **Hiển thị tiếng Việt UTF-8 chuẩn xác trên Windows PowerShell** (không bị mã hóa `\306\260...`).
- **Tự động nhận diện branch hiện tại** và tạo commit message chuẩn Conventional Commits.

---

## Bước 0 — Chuẩn hóa hiển thị tiếng Việt trên Windows Git

Chạy lệnh sau 1 lần để tên file tiếng Việt có dấu hiển thị rõ ràng, dễ đọc:

```powershell
git config core.quotepath false
```

---

## Bước 1 — Kiểm tra an toàn tự động (BẮT BUỘC — Không bỏ qua)

Chạy script kiểm tra an toàn chuyên dụng tích hợp sẵn trong skill:

```powershell
python .agents/skills/github-push/scripts/pre_push_check.py
```

Script sẽ tự động thực hiện trong 1 giây:
1. Quét các pattern API Key (`sk-`, `AIza`, `hf_`, private keys) trong cả git diff và untracked files.
2. Kiểm tra an toàn database: Đảm bảo không có file `prisma/*.db` hay `vihand.db` nào bị stage.
3. Kiểm tra kích thước file: Cảnh báo file >10MB, chặn file >50MB / >100MB (tránh bị GitHub reject).
4. Che giấu credentials (mask token HuggingFace nếu có).

### Xử lý kết quả kiểm tra:
- **Nếu trạng thái `BLOCKED` hoặc có `CRITICAL ALERT`:**
  - DỪNG NGAY. Báo cho người dùng chi tiết file/vấn đề.
  - Tuyệt đối KHÔNG chạy `git add -A` hay `git commit`.
- **Nếu có cảnh báo `LARGE FILES DETECTED (>10 MB)`:**
  - Hỏi người dùng xem có muốn commit file nặng đó không, hoặc gợi ý thêm vào `.gitignore` (ví dụ: `Poster nckh/`, file `.docx` báo cáo lớn, `temp_slides.pdf`).

---

## Bước 2 — Xem tóm tắt thay đổi

```powershell
# 2a. Xác định branch hiện tại
$branch = (git branch --show-current).Trim()
Write-Host "Branch hiện tại: $branch"

# 2b. Xem tóm tắt diff của các file đã track
git diff --stat HEAD

# 2c. Xem danh sách các file mới chưa track (đã lọc các file rác lớn)
git status --short
```

Tóm tắt nhanh cho người dùng:
- Bao nhiêu file đã sửa (modified), bao nhiêu file mới (untracked).
- Nhắc nhở nếu có file dữ liệu/tài liệu nặng chuẩn bị được thêm.

---

## Bước 3 — Stage files

Nếu người dùng đồng ý đẩy tất cả (đã qua kiểm tra ở Bước 1):
```powershell
git add -A
```

*Lưu ý:* Nếu người dùng chỉ muốn commit một số file hoặc muốn loại trừ file lớn:
```powershell
# Stage có chọn lọc:
git add app/ components/ lib/ python_service/
# Hoặc bỏ file lớn ra khỏi index:
git reset "01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/01_ViHandGrade/Báo cáo tổng eureka - Thiết bị chấm điểm.docx"
```

Xác nhận lại trước khi commit:
```powershell
git status --short
```

---

## Bước 4 — Tạo Conventional Commit Message

Đọc `git diff --cached --stat` và tạo commit message theo chuẩn:

```
<type>(<scope>): <mô tả ngắn bằng tiếng Anh hoặc tiếng Việt rõ ràng>

[optional body: chi tiết các điểm thay đổi chính]
```

### Bảng Scope chuẩn của ViHand Grade:
| Scope | Mô tả thành phần |
|:---|:---|
| `grade` / `api` | Logic chấm điểm, pipeline Jimp -> Gemini -> ViT5 trong `app/api/grade/` |
| `ocr` | Endpoint nhận dạng ký tự quang học `app/api/ocr/` |
| `spelling` | FastAPI server ViT5 trong `python_service/` |
| `dictation` | Tính năng đọc chính tả AI, TTS trong `app/teacher/dictation/` & `mcp_service/` |
| `image` | Tiền xử lý ảnh 9 bước trong `lib/image-processor.ts` |
| `prisma` / `db` | Schema SQLite, quan hệ bảng, migration trong `prisma/` |
| `ui` | Giao diện giáo viên, học sinh, admin trong `app/` và `components/` |
| `docs` | Tài liệu NCKH, slide thuyết trình, TechSpec trong `01_Bao_cao_Nghien_cuu/` |
| `deploy` | Dockerfile, shell scripts trong `03_Scripts_Trien_khai/`, Cloudflare tunnel |

### Ví dụ commit message tốt:
```
fix(grade): synchronize image resize clamp to 1600px between client and server

- Update Jimp preprocessor max dimension to 1600px
- Adjust fallback threshold in ViT5 spell check handler
```

> ⚠️ **Quy tắc quan trọng:** Luôn hiển thị commit message cho người dùng xem và xác nhận trước khi thực hiện `git commit`.

---

## Bước 5 — Commit

```powershell
git commit -m "<commit message đã được người dùng xác nhận>"
```

---

## Bước 6 — Push lên Remote

### 6a. Push lên GitHub (Bắt buộc)

```powershell
$branch = (git branch --show-current).Trim()
git push origin $branch
```

**Nếu bị lỗi `rejected (fetch first)`:**
```powershell
git pull --rebase origin $branch
git push origin $branch
```
*Lưu ý:* Nếu có conflict rebase, báo ngay cho người dùng. Tuyệt đối KHÔNG tự ý dùng `--force`.

### 6b. Push lên Hugging Face Spaces (Tùy chọn)

Kiểm tra an toàn xem có remote `hf` hay không:
```powershell
git remote | Select-String "^hf$"
```
> 🔒 **CẢNH BÁO BẢO MẬT:** Tuyệt đối **KHÔNG** dùng lệnh `git remote -v` hiển thị ra chat vì URL remote `hf` thường nhúng thẳng token Hugging Face.

Nếu có remote `hf` **VÀ** người dùng yêu cầu đồng bộ lên Hugging Face:
```powershell
$branch = (git branch --show-current).Trim()
git push hf $branch
```

---

## Bước 7 — Báo cáo kết quả

```powershell
git log -1 --oneline
```

Báo cáo cho người dùng:
- ✅ Commit hash và message vừa tạo.
- ✅ Tên branch đã push.
- ✅ Remote đã cập nhật (`origin` GitHub, và `hf` HuggingFace nếu có).
