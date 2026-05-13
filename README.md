---
title: ViHand Grade
emoji: ✏️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
short_description: AI-powered Vietnamese handwriting spelling checker & grader
---

# ✏️ ViHand Grade

**Hệ thống chấm điểm chính tả tiếng Việt bằng AI** dành cho học sinh tiểu học.

## Tính năng

- 📸 **Upload ảnh bài viết** của học sinh → AI nhận dạng và chấm điểm
- 🤖 **Gemini AI** phân tích lỗi chính tả tiếng Việt
- 👨‍🏫 **Quản lý lớp học** – giáo viên tạo lớp, thêm học sinh
- 📊 **Lịch sử chấm điểm** – xem lại toàn bộ kết quả
- 🔐 **Phân quyền** – Admin / Giáo viên / Học sinh

## Tài khoản mặc định

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `123456` |
| Teacher | `giaovien` | `123456` |
| Student | `hocsinh` | `123456` |

## Tech Stack

- **Frontend/Backend**: Next.js 16 + TypeScript
- **Database**: SQLite + Prisma ORM
- **AI**: Google Gemini API
- **UI**: Tailwind CSS + Radix UI
