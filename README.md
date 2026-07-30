---
title: ViHand Grade
emoji: ✏️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
short_description: AI-powered Vietnamese handwriting spelling checker & grader
---

<div align="center">

# ✏️ ViHand Grade

**Hệ thống chấm điểm chính tả tiếng Việt viết tay bằng AI — dành cho học sinh tiểu học**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

<br/>

> 📚 Đề tài Nghiên cứu Khoa học Sinh viên — Khoa Điện – Điện Tử, Đại học Tôn Đức Thắng (2025–2026)
> 👨‍🏫 GVHD: TS. Lê Anh Vũ
> 👨‍💻 Nhóm thực hiện: Dương Thành Long · Phạm Hoài Quốc Bảo · Nguyễn Thanh Phúc

</div>

---

## 📖 Giới thiệu

**ViHand Grade** là hệ thống tự động nhận dạng, sửa lỗi và chấm điểm bài chính tả viết tay tiếng Việt của học sinh tiểu học. Hệ thống được thiết kế để:

- **Giảm thời gian** chấm bài của giáo viên từ 3–5 phút/bài xuống còn dưới 30 giây.
- **Chạy được trên Raspberry Pi 4** — phần cứng nhúng chi phí thấp (~2–3 triệu đồng), phù hợp điều kiện trường học Việt Nam.
- **Truy cập từ xa** qua Cloudflare CDN với bảo mật TLS/HTTPS đầy đủ, không cần IP tĩnh.

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| 📸 **Nhận dạng ảnh (OCR)** | Upload hoặc chụp ảnh bài viết → Gemini Vision trích xuất văn bản |
| 🔧 **Tiền xử lý ảnh 9 bước** | Cân bằng trắng, khử bóng, CLAHE, nhị phân hóa… chuẩn hóa đầu vào |
| 🤖 **Sửa lỗi chính tả AI** | ViT5 (Seq2Seq tiếng Việt) làm primary; Gemini làm fallback |
| 📊 **Chấm điểm tự động** | Thang 10 điểm: Chính tả (4đ) + Hình thức (3đ) + Nội dung (2đ) + Sáng tạo (1đ) |
| 👨‍🏫 **Quản lý lớp học** | Giáo viên tạo lớp, quản lý học sinh, xem báo cáo tiến độ |
| 🎙️ **Đọc chính tả AI** | Tích hợp MCP + Xiaozhi để tạo và lưu phiên đọc chính tả tự động |
| 📱 **PWA** | Cài đặt như app native trên điện thoại, hỗ trợ camera trực tiếp |
| 🔐 **Phân quyền 3 cấp** | Admin / Giáo viên / Học sinh với dashboard riêng biệt |

---

## 🏗️ Kiến trúc hệ thống

![Kiến trúc hệ thống ViHand Grade](./01_Bao_cao_Nghien_cuu/Lưu%20đồ%20giải%20thuật/vihand_kien_truc_he_thong.png)

### Luồng xử lý bài chấm

![Hybrid AI Pipeline – Luồng xử lý bài chấm](./01_Bao_cao_Nghien_cuu/Lưu%20đồ%20giải%20thuật/Hinh31_Hybrid_AI_Pipeline_New.png)

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend + Backend** | Next.js 16 · React 19 · TypeScript 5.7 |
| **UI Components** | Radix UI · shadcn/ui · Tailwind CSS 4 · Lucide Icons |
| **Database** | SQLite · Prisma ORM 5 |
| **Image Processing** | Jimp (server-side, 9-step pipeline) |
| **AI – OCR** | Google Gemini Flash Lite (Vision) |
| **AI – Spelling** | ViT5 (`chamdentimem/ViT5_Vietnamese_Correction`) via FastAPI |
| **AI – Dictation** | MCP (Model Context Protocol) + Xiaozhi Agent |
| **Deployment** | Docker · Raspberry Pi 4 · Cloudflare Tunnel |
| **Charts** | Recharts |

---

## 📁 Cấu trúc thư mục

![Kiến trúc tổng thể hệ thống ViHand Grade](./01_Bao_cao_Nghien_cuu/Lưu%20đồ%20giải%20thuật/HinhX1_Kien_truc_He_thong.png)

---

## 🚀 Hướng dẫn cài đặt

Xem hướng dẫn cài đặt đầy đủ tại: **[📖 INSTALL.md](./03_Scripts_Trien_khai/INSTALL.md)**

Bao gồm:
- Cài đặt local (development)
- Triển khai với Docker
- Triển khai lên Raspberry Pi 4
- Cấu hình Cloudflare Tunnel

---

## 🔬 Kết quả nghiên cứu

### Mô hình OCR

| Mô hình | Độ chính xác | Ghi chú |
|---------|-------------|---------|
| **Gemini Flash Lite** | **85–95%** | ✅ Lựa chọn chính |
| Tesseract OCR | ~40–60% | Kém với nét viết tay |
| EasyOCR | ~55–70% | Không tốt với dấu thanh |

### Mô hình sửa lỗi (ViT5 Fine-tune)

| Training Loss | Epoch | Step | Validation Loss | SacreBLEU |
|:-------------:|:-----:|:----:|:---------------:|:---------:|
| **0.0500** | **1.0** | **10000** | **0.199** | **39.17%** |

---

## 🗺️ Hướng phát triển

- [ ] **Local LLM** — Thay Gemini API bằng mô hình chạy hoàn toàn cục bộ (offline)
- [ ] **Mobile App** — Ứng dụng iOS/Android thân thiện với trẻ em
- [ ] **Mở rộng dataset** — Hợp tác thu thập dữ liệu thực tế từ các trường tiểu học
- [ ] **Chấm bài trắc nghiệm** — Mở rộng sang nhận dạng bài thi trắc nghiệm và toán học
- [ ] **Chuẩn hóa sư phạm** — Tích hợp tiêu chí chấm điểm chuẩn Bộ GD&ĐT

---

## 📄 Tài liệu kỹ thuật

- 📋 [Đặc tả kỹ thuật hệ thống](./01_Bao_cao_Nghien_cuu/ViHand_Grade_Dac_Ta_Ky_Thuat.md) — Kiến trúc chi tiết, API spec, mô hình dữ liệu
- 🧪 [Kịch bản thực nghiệm & Benchmark](./02_Kich_ban_Thuc_nghiem/) — Dataset, test cases, notebook đánh giá
- 📊 [Báo cáo nghiên cứu](./01_Bao_cao_Nghien_cuu/) — Slide thuyết trình, báo cáo NCKH
- 🚀 [Scripts triển khai](./03_Scripts_Trien_khai/) — Hướng dẫn deploy Raspberry Pi


<div align="center">

**Khoa Điện – Điện Tử · Đại học Tôn Đức Thắng · TP.HCM**

Made with ❤️ for Vietnamese elementary education

</div>
