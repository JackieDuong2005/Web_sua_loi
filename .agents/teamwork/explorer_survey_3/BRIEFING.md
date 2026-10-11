# BRIEFING — 2026-10-05T15:30:00Z

## Mission
Conduct an exhaustive, deep code-level investigation into ViHand Grade's Python AI Core Services, Edge Computing station (Raspberry Pi), Hybrid Edge-Cloud architecture, and Machine Learning pipelines (YOLOv8, VietOCR, ViT5, Qwen 2.5 SLM, Gemini fallback).

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: AI Core & Edge Computing Specialist
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3
- Original parent: 18c248ba-19cd-491f-bb1c-a47796deb34c
- Milestone: Milestone 1 - Comprehensive Codebase Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Strictly record exact file paths, configuration files, parameters, and line numbers. NO ASSUMPTIONS.
- Files for content delivery (`report.md`, `handoff.md`, `progress.md`), Messages for coordination.

## Current Parent
- Conversation ID: 18c248ba-19cd-491f-bb1c-a47796deb34c
- Updated: 2026-10-05T15:30:00Z

## Investigation State
- **Explored paths**:
  - `python_service/main.py`, `yolo_detector.py`, `convert_to_onnx.py`, `requirements.txt`, `start_service.ps1`
  - `03_Scripts_Trien_khai/rpi4/` (00-06 scripts, install_all.sh, update_rpi.sh)
  - `03_Scripts_Trien_khai/jetson_nano/` (00-06 scripts, benchmarks, docker)
  - `03_Scripts_Trien_khai/shared/` (systemd templates, .env.example)
  - `app/api/ocr/route.ts`, `app/api/grade/route.ts`, `app/api/mobile/grade/route.ts`, `app/api/yolo/detect/route.ts`
  - `lib/image-processor.ts`, `lib/api-guard.ts`
  - `02_Kich_ban_Thuc_nghiem/` (benchmark results, sample datasets, testcases, execution logs)
  - `.agents/skills/verify-vihand-grade/scripts/` (verify_ai.py, verify_bff.py, verify_edge.py, verify_mobile.py)
- **Key findings**:
  - Python AI Core FastAPI runs on port 8000 with 10 endpoints, ThreadPoolExecutor (max_workers=1 on CPU to avoid CPU thrashing), and Dynamic INT8 Quantization for ViT5.
  - YOLOv8 Word Detector uses Vertical Overlap (0.40 threshold) line grouping and normalizes bounding boxes [0..1] at imgsz=640.
  - Sửa lỗi tiếng Việt bóc tách âm tiết 5 thành phần (base, tone, initial, nucleus, final) và phân loại 6 nhóm lỗi chuẩn tiểu học.
  - Qwen 2.5-0.5B-Instruct SLM chạy ở chế độ bfloat16 (~577MB RAM) hoặc Dynamic INT8, sinh 3 định hướng nhận xét sư phạm theo Thông tư 27.
  - Edge Raspberry Pi 4 có bảo vệ Swap 3072MB, vm.swappiness=20, MemoryMax CGroups (2500M cho Python, 2048M cho Web).
  - Tường lửa UFW đóng cổng 8000 với mạng ngoài; Cloudflare Named Tunnel chuyển tiếp an toàn tới cổng 3000 tại `vihandgrade.click`.
  - Chế độ "Zero-Token Offline Mode" vận hành 100% tại biên với `tokenCount = 0` khi có bài mẫu Ground Truth.
  - Kho bài thi thật gồm 104 ảnh (chữ viết tay 100+) và 49 ảnh (Ảnh viết tay 76) cùng đầy đủ artifacts 9 bước tiền xử lý ảnh.
- **Unexplored areas**: None. All core components and files in scope have been thoroughly audited.

## Key Decisions Made
- Hoàn tất báo cáo chi tiết tại `report.md` và báo cáo bàn giao tại `handoff.md`.
- Gửi thông điệp bàn giao đầy đủ cho Orchestrator Parent Agent.

## Artifact Index
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3\DISPATCH.md` — Inbound message log
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3\BRIEFING.md` — Situational awareness and state
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3\progress.md` — Heartbeat and step log
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3\report.md` — Comprehensive findings report
- `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3\handoff.md` — 5-component handoff report
