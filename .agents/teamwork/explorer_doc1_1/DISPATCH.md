## 2026-10-05T15:31:41Z
You are a teamwork_preview_explorer specializing in System Architecture Design & Mermaid Blueprints for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc1_1
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi

MANDATORY FIRST STEPS:
1. Read c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section ## 2026-10-05T15:01:07Z).
2. Read the 3 exhaustive survey reports prepared by our survey team:
   - c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\report.md
   - c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_2\report.md
   - c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_survey_3\report.md

YOUR MISSION:
Synthesize and produce a complete, flawless architectural blueprint and structural draft for Document 1:
`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md`.

Your output blueprint MUST detail:
1. Primary education context, digital transformation, and Circular 27/2020/TT-BGDĐT pedagogical evaluation framework (Spelling vs Essay, formative vs summative assessment, qualitative feedback).
2. The complete 4-tier system architecture:
   - Client Tier: Android Native App (Kotlin/Jetpack Compose) & Web Studio (Next.js 16 SPA/PWA)
   - Gateway/BFF Tier: Next.js 16 App Router BFF Gateway (`/api/mobile/grade`, API guard rate limiting, RBAC, session auth)
   - AI Microservices Core Tier: FastAPI Python service (YOLOv8 word detection, ViT5 INT8 correction, Qwen 2.5 SLM, Edge-TTS, Gemini vision fallback)
   - Database & Edge Computing Tier: SQLite Prisma (`vihand.db`, WAL mode) + Room DB v4, Raspberry Pi 4 / Jetson Nano Edge Appliance (Cgroups, swap 3072MB, UFW, Cloudflare Tunnel)
3. Fully functional, valid Mermaid diagrams:
   - System Overview 4-Tier Diagram (`graph TD` or `block-beta`)
   - Hybrid Edge-Cloud & Zero-Token offline fallback routing flow (`sequenceDiagram` / `flowchart TD`)
   - 3 Business workflows: (a) Automated OCR grading flow, (b) Pedagogical Dictation Neural TTS flow, (c) Gradebook & Personalized Difficult Words Notebook sync flow.
4. Quality Attributes:
   - Security: RBAC Layout protection, In-memory Sliding Window Rate Limiting, Decree 13/2023/ND-CP Child Privacy Protection (Soft purge & 365-day retention).
   - High Availability: Multi-tier fallback (Zero-Token -> ViT5 -> Gemini Text -> Gemini Vision), Cloudflare Zero-Trust Tunnel.
   - Performance: Latency budgets (ViT5 ~1047ms, YOLO ~150-250ms, Edge-TTS streaming), memory budgets (Pi 4 4GB with cgroup memory max limits, swap 3072MB).

OUTPUT:
- Write your comprehensive blueprint to: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc1_1\blueprint.md`
- Write your handoff report to: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc1_1\handoff.md`
- Send message back to caller (Recipient: "18c248ba-19cd-491f-bb1c-a47796deb34c") when done.
