---
name: project-context-prep
description: Chuẩn bị context toàn diện về một project/codebase trước khi bắt đầu làm việc — quét cấu trúc thư mục, đọc README, manifest (package.json/pyproject.toml/go.mod/...), entry point, config, và các file lớn quan trọng, rồi tóm tắt kiến trúc, tech stack, các module chính và điểm cần lưu ý. CHỈ dùng khi người dùng yêu cầu rõ ràng — ví dụ họ nói "chuẩn bị context", "prep project này", "/prep", "đọc hiểu project trước khi làm", "cho tôi tổng quan codebase này trước", hoặc tương tự. KHÔNG tự động chạy skill này mỗi khi mở project hay mỗi khi người dùng chỉ hỏi một câu bình thường về code — chỉ khi có tín hiệu rõ ràng là họ muốn một bước "làm quen/chuẩn bị" trước khi bắt tay vào việc.
---

# Project Context Prep

Mục tiêu: trong một lượt, xây dựng một bức tranh đủ chi tiết và chính xác về
project để agent (Claude) có thể làm việc hiệu quả ngay sau đó — không phải
đọc lại từ đầu, không đoán mò cấu trúc, không bỏ sót các phần quan trọng.

Đầu ra là **một bản tóm tắt trong chat** (không tạo file), có cấu trúc rõ ràng,
đủ để người dùng lướt nhanh và xác nhận Claude đã hiểu đúng project.

## Khi nào dùng skill này

Chỉ kích hoạt khi người dùng chủ động yêu cầu một bước "chuẩn bị/làm quen"
trước khi làm việc — ví dụ: "chuẩn bị context giúp tôi", "đọc hiểu project
này trước", "/prep", "tổng quan codebase trước khi mình sửa gì đó". Nếu họ
chỉ hỏi một câu cụ thể về code ("file X ở đâu?", "hàm này làm gì?") thì trả
lời trực tiếp, không cần chạy toàn bộ quy trình này.

Nếu project chưa được upload / chưa có đường dẫn rõ ràng, hỏi người dùng
đường dẫn thư mục gốc của project (hoặc xác nhận thư mục hiện tại) trước khi
bắt đầu quét.

## Quy trình 4 bước

### Bước 1 — Quét cấu trúc (deterministic, rẻ)

Chạy script quét (nằm trong `scripts/scan_project.py` của skill này — dùng
đường dẫn thật tới file này trong môi trường hiện tại) để có bản đồ tổng
quan mà không cần đọc từng file:

```bash
python3 scripts/scan_project.py <đường_dẫn_project> --max-depth 3
```

(Thay `<đường_dẫn_project>` bằng thư mục gốc thật của project người dùng.
Nếu project rất lớn/nhiều
monorepo con, có thể chạy lại với `--max-depth 2` để đỡ rối, hoặc chạy riêng
cho từng thư mục con lớn.)

Script trả về JSON gồm:
- `readmes` — các file README tìm thấy
- `manifests_found` — file quản lý dependency (package.json, pyproject.toml, go.mod, Cargo.toml, pom.xml, ...) kèm tech stack suy ra được
- `config_files_found` — Dockerfile, CI config, .env.example, tsconfig, v.v.
- `likely_entry_points` — các file khởi chạy khả nghi (main.py, index.js, app.py, ...)
- `file_extension_counts` — phân bố ngôn ngữ/loại file
- `largest_source_files` — 25 file source lớn nhất theo số dòng (ứng viên tốt để đọc sâu — thường là core logic)
- `directory_tree_depth_limited` — cây thư mục đã lọc bớt noise (node_modules, .git, build, v.v.)

Đây là bước rẻ và nhanh — luôn chạy trước, đừng đọc file thủ công trước khi có bản đồ này.

### Bước 2 — Đọc có chọn lọc (ưu tiên theo tín hiệu)

Dựa vào output của Bước 1, đọc theo thứ tự ưu tiên sau (dùng `view`/đọc file,
không cần đọc hết toàn bộ nội dung nếu file quá dài — có thể đọc phần đầu +
mục lục/import section trước):

1. **README** (nếu có) — mục đích project, cách chạy, kiến trúc cấp cao nếu tác giả đã mô tả
2. **Manifest chính** (package.json / pyproject.toml / go.mod / Cargo.toml / pom.xml...) — tên dependency cho biết framework, DB, service ngoài đang dùng
3. **Entry point(s)** — cách app khởi động, wiring giữa các module
4. **Config/CI files** liên quan (Dockerfile, docker-compose, .env.example, CI pipeline) — cho biết cách deploy, biến môi trường cần thiết, service phụ thuộc (DB, queue, cache...)
5. **3-6 file source lớn nhất** trong `largest_source_files` — thường là nơi chứa business logic cốt lõi, đáng đọc kỹ hơn để hiểu domain
6. Nếu có nhiều package/service con (monorepo), lặp lại nhanh Bước 1-2 cho từng service con quan trọng thay vì đọc dàn trải.

Không cần đọc mọi file — mục tiêu là đủ để mô tả chính xác kiến trúc và luồng
dữ liệu chính, không phải thuộc lòng toàn bộ codebase.

### Bước 3 — Ghi nhận điểm mơ hồ / thiếu

Trong lúc đọc, chủ động note lại:
- Chỗ nào code có vẻ mâu thuẫn với README hoặc không rõ ràng
- Có thiếu README/docs cho phần quan trọng nào không
- Có file `.env.example` nhưng thiếu biến nào đó được reference trong code không
- Có TODO/FIXME/deprecated đáng chú ý nào không (có thể grep nhanh nếu cần: `grep -rn "TODO\|FIXME" <path> --include="*.ext"`)

Đây không phải bước bắt buộc phải grep sâu — chỉ ghi lại những gì thấy được
tự nhiên trong lúc đọc Bước 2.

### Bước 4 — Tóm tắt trong chat

Trình bày tóm tắt theo cấu trúc dưới đây (bỏ qua mục nào không áp dụng, không
thêm phần "disclaimer" thừa):

```
## Tổng quan project

**Loại project / tech stack:** [ngôn ngữ, framework chính, DB/service phụ thuộc]

**Cấu trúc thư mục chính:**
[liệt kê ngắn gọn các thư mục cấp cao và vai trò của chúng — không paste
nguyên cây thư mục thô, diễn giải bằng lời]

**Cách chạy / entry point:**
[app khởi động từ đâu, lệnh chạy nếu README có nêu]

**Các module/thành phần chính:**
[2-6 gạch đầu dòng — mỗi module làm gì, nằm ở đâu]

**Luồng dữ liệu / kiến trúc tổng quát:**
[1 đoạn ngắn mô tả cách các phần ghép với nhau, nếu suy ra được]

**Điểm cần lưu ý / chưa rõ:**
[nếu có — thiếu doc, config thiếu, code có vẻ outdated, v.v. Nếu không có gì đáng chú ý thì bỏ qua mục này]
```

Kết thúc bằng một câu hỏi ngắn (không bắt buộc, chỉ khi thực sự cần) kiểu:
"Mình đã nắm được tổng quan — bạn muốn bắt đầu với phần nào?"

## Lưu ý quan trọng

- **Không tạo file output** trừ khi người dùng yêu cầu — mặc định chỉ tóm tắt trong chat (người dùng đã chọn vậy).
- **Không đọc toàn bộ node_modules/vendor/build artifacts** — script quét đã lọc sẵn, đừng cố đọc lại các thư mục đó thủ công.
- **Ưu tiên độ chính xác hơn độ đầy đủ** — nếu không chắc một phần code làm gì, nói rõ "chưa rõ, cần đọc thêm X" thay vì đoán.
- **Với monorepo/nhiều loại project khác nhau trong cùng repo** (ví dụ frontend + backend + mobile), tóm tắt riêng từng phần thay vì gộp chung một khối mơ hồ.
- Nếu project quá lớn để đọc hết trong một lượt hợp lý, ưu tiên phần người dùng có khả năng sẽ làm việc tiếp theo (hỏi họ nếu không rõ), và nói rõ trong tóm tắt là đây là bản quét ưu tiên, chưa bao phủ 100% repo.
