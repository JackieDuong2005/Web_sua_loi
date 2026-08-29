---
name: github-push
description: >
  Đẩy project hiện tại lên GitHub (và tùy chọn HuggingFace Spaces) một cách
  an toàn — kiểm tra file nhạy cảm, tạo commit message thông minh từ diff,
  xử lý untracked files, và push lên remote.
  Kích hoạt khi người dùng nói "push lên github", "đẩy code lên", "commit và
  push", "git push", "upload lên github", hoặc tương tự.
---

# GitHub Push Skill

Mục tiêu: đẩy toàn bộ thay đổi của project lên GitHub (origin) một cách
an toàn — không lộ credential, không commit file DB/build thừa, có commit
message rõ ràng và có thể push song song lên HuggingFace Spaces nếu có remote `hf`.

---

## Bước 0 — Xác định working directory

Dùng thư mục project đang làm việc. Nếu chưa rõ, hỏi người dùng đường dẫn
gốc của project trước khi chạy bất kỳ lệnh git nào.

---

## Bước 1 — Kiểm tra an toàn (QUAN TRỌNG — không bỏ qua)

Chạy các lệnh sau để đảm bảo không vô tình commit thông tin nhạy cảm:

```powershell
# 1a. Xem danh sách file sẽ được commit (staged + untracked)
git status --short

# 1b. Tìm các pattern nguy hiểm trong diff sắp commit
git diff HEAD --unified=0 | Select-String -Pattern "sk-|AIza|hf_|OPENAI|SECRET|PASSWORD|TOKEN|API_KEY|private_key" -CaseSensitive
```

**Nếu phát hiện thông tin nhạy cảm:**
- DỪNG NGAY, báo cho người dùng cụ thể dòng/file nào có vấn đề.
- Không được tiếp tục push cho đến khi người dùng xử lý.
- Gợi ý thêm file vào `.gitignore` hoặc dùng `git rm --cached <file>`.

**Các file/thư mục luôn phải có trong `.gitignore` của project này:**
```
.env
.env.local
.env*.local
prisma/*.db
prisma/*.db-shm
prisma/*.db-wal
node_modules/
.next/
python_service/__pycache__/
python_service/*.pyc
python_service/venv/
xiaozhi-esp32-server-main/
*.log
```

Nếu `.gitignore` thiếu bất kỳ mục nào ở trên, hỏi người dùng có muốn thêm không trước khi push.

---

## Bước 2 — Xem nhanh những gì sẽ thay đổi

```powershell
# Tóm tắt diff: file nào thay đổi, thêm, xóa
git diff --stat HEAD

# Xem danh sách untracked files quan trọng (loại trừ thư mục build)
git ls-files --others --exclude-standard | Where-Object { $_ -notmatch "node_modules|\.next|__pycache__|venv" }
```

Đọc output và tóm tắt ngắn cho người dùng biết:
- Bao nhiêu file đã modified / bao nhiêu file mới chưa track.
- Có file nào đáng chú ý không (ví dụ: file DB, file .env).

---

## Bước 3 — Stage files

```powershell
# Stage tất cả thay đổi (modified + new files, tuân theo .gitignore)
git add -A

# Xác nhận lại những gì sẽ commit
git status --short
```

Nếu người dùng chỉ muốn push MỘT SỐ file cụ thể, hỏi rõ trước khi `git add -A`.

---

## Bước 4 — Tạo commit message thông minh

Đọc `git diff --cached --stat` để biết danh sách file thay đổi, sau đó tạo
commit message theo quy ước **Conventional Commits** tiếng Anh ngắn gọn:

```
<type>(<scope>): <mô tả ngắn>

[optional body: bullet points giải thích chi tiết nếu thay đổi lớn]
```

**Quy tắc chọn `<type>`:**
| Thay đổi | Type |
|:---|:---|
| Sửa lỗi bug / fix issue audit | `fix` |
| Tính năng mới | `feat` |
| Cập nhật tài liệu / spec / report | `docs` |
| Refactor code không thay đổi chức năng | `refactor` |
| Cập nhật schema / migration DB | `chore(prisma)` |
| Cấu hình, gitignore, env | `chore` |
| Style/UI | `style` |

**Ví dụ commit message tốt:**
```
fix(image): unify client/server compress threshold to 1600px

- compressImageForAPI: maxDim 1280→1600, quality 0.75→0.85
- Matches image-processor.ts server-side config (Issue #6)
```

```
chore(prisma): add Class-User relation with onDelete:SetNull

- teacherId String → String? (nullable)
- Add @relation TeacherClasses to prevent orphan records
- Update /api/classes to use include instead of N+1 queries
```

Sau khi tạo xong message, **hiển thị cho người dùng xem và xác nhận** trước khi
chạy `git commit`. Người dùng có thể chỉnh sửa nếu muốn.

---

## Bước 5 — Commit

```powershell
git commit -m "<commit message đã được người dùng xác nhận>"
```

---

## Bước 6 — Push lên remote

### Push lên GitHub (bắt buộc)

```powershell
git push origin main
```

Nếu bị lỗi `rejected` (do remote có commit mới hơn):
```powershell
# Pull rebase để giữ lịch sử gọn
git pull --rebase origin main
# Sau đó push lại
git push origin main
```

**Nếu vẫn lỗi conflict sau rebase:**
- Báo ngay cho người dùng cụ thể file nào conflict.
- KHÔNG tự ý `--force` push trừ khi người dùng ra lệnh rõ ràng.

### Push lên HuggingFace Spaces (tùy chọn)

Kiểm tra xem project có remote `hf` không:
```powershell
git remote -v | Select-String "hf"
```

Nếu có remote `hf` **VÀ** người dùng muốn push:
```powershell
git push hf main
```

> ⚠️ **Lưu ý bảo mật:** Remote `hf` thường chứa token HuggingFace trong URL.
> Không hiển thị URL remote ra chat khi có token nhúng trực tiếp.

---

## Bước 7 — Xác nhận kết quả

```powershell
# Kiểm tra log commit mới nhất
git log --oneline -5

# Kiểm tra trạng thái remote
git status
```

Thông báo cho người dùng:
- ✅ Commit hash vừa tạo.
- ✅ URL GitHub repository (lấy từ `git remote get-url origin`, bỏ credential nếu có).
- ✅ Nếu có push HuggingFace — link Space (nếu biết).

---

## Xử lý các tình huống đặc biệt

### Trường hợp 1: Repository chưa có trên GitHub

```powershell
# Người dùng cần tạo repo trống trên GitHub trước, sau đó:
git remote add origin https://github.com/<username>/<repo>.git
git branch -M main
git push -u origin main
```

Hỏi người dùng username GitHub và tên repo trước khi thực hiện.

### Trường hợp 2: File DB bị track nhầm

```powershell
# Xóa khỏi git index nhưng giữ file local
git rm --cached prisma/vihand.db
git rm --cached prisma/vihand.db-shm
git rm --cached prisma/vihand.db-wal

# Thêm vào .gitignore
Add-Content .gitignore "`nprisma/*.db`nprisma/*.db-shm`nprisma/*.db-wal"
```

### Trường hợp 3: Người dùng muốn push KHÔNG bao gồm một số file

```powershell
# Chỉ stage file cụ thể thay vì git add -A
git add <file1> <file2> ...
```

### Trường hợp 4: Push lần đầu (chưa có upstream)

```powershell
git push --set-upstream origin main
```

---

## Lưu ý quan trọng

- **KHÔNG BAO GIỜ** tự ý `git push --force` mà không có lệnh rõ ràng từ người dùng.
- **KHÔNG** hiển thị token/password/API key ra chat dù chúng nằm trong URL remote.
- Luôn cho người dùng xem và xác nhận commit message trước khi `git commit`.
- Nếu `git push` thành công nhưng có warning, đọc kỹ và báo cáo cho người dùng.
- Với project này (ViHand Grade), file `prisma/vihand.db` chứa dữ liệu học sinh thực — KHÔNG được push lên public repository.
