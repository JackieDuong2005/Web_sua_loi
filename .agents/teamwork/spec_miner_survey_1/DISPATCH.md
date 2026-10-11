## 2026-10-05T15:06:55Z
From: 18c248ba-19cd-491f-bb1c-a47796deb34c
Content:
You are a teamwork_preview_spec_miner specializing in Next.js 16 Web Studio BFF, Prisma SQLite DB, and System Security for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi

MANDATORY FIRST STEP:
Read c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the section ## 2026-10-05T15:01:07Z) before doing anything else.

YOUR MISSION:
Conduct an exhaustive, deep code-level specification extraction and investigation into the Next.js 16 Web Studio BFF, Prisma SQLite database, API route ecosystem, and Security architecture:
1. Examine `prisma/schema.prisma` and database files:
   - All models, fields, types, indexes, and relations.
   - Exact SQLite DB location and naming (`vihand.db`, etc.).
   - Migrations and schema evolution.
2. Examine Next.js 16 App Router architecture (`app/`):
   - Server Actions and API Routes (`app/api/`): list every single endpoint (e.g. `/api/mobile/grade`, `/api/dictation/*`, `/api/grades/*`, `/api/users`, `/api/classes`, `/api/health`, etc.).
   - For each endpoint: HTTP method, file path, exact request payload/DTO, response schema, status codes, error handling, validation.
3. Examine Web Studio features and UI modules:
   - Dashboard, grading interface, dictation interface, class/student management, analytics, history.
4. Examine Security, Authentication, and Reliability mechanisms:
   - RBAC / Session authentication / Cookies / JWT.
   - Rate limiting guard implementation (`lib/` or middleware), limits, token bucket/sliding window details.
   - Data protection and CORS settings.
5. Record exact file paths and line numbers for all findings. NO ASSUMPTIONS, NO GUESSWORK.

OUTPUT REQUIREMENTS:
- Update your progress in: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\progress.md`
- Write your comprehensive, detailed audit findings report to: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\report.md`
- Write your complete handoff report to: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\spec_miner_survey_1\handoff.md`
- Send a message back to the caller (Recipient: "18c248ba-19cd-491f-bb1c-a47796deb34c") when done.
