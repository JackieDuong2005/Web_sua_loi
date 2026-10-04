## 2026-09-30T14:19:58Z
You are an Explorer subagent (API & Data Schema Specialist) for ViHand Grade.
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_1
Project root: c:\Users\Jackie Duong\Desktop\Web_sua_loi
The authoritative user request is in: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md

YOU MUST READ `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md` FIRST BEFORE STARTING WORK.

Your mission:
Perform an exhaustive technical inspection and audit of all API contracts, networking layers, endpoints, data schemas, headers, authentication, status codes, and synchronization mechanisms between Android Native App (`android_app/`) and Web App (`app/` / `app/api/*`).

Specific Requirements to cover in depth:
1. Examine all networking code in `android_app/` (search for Retrofit, Ktor, OkHttp, ApiClient, repository classes, DTOs, data models, endpoints).
2. Examine all API route handlers in `app/api/` (e.g. `grade/route.ts`, `ocr/route.ts`, `dictation/*`, `classes/*`, `students/*`, etc.) and `prisma/schema.prisma`, `lib/types.ts`.
3. Construct the comprehensive API Parity Matrix (Acceptance Criteria 1):
   - Table containing: HTTP Method, Endpoint URL Path, Request Body / Params, Response Schema, Status.
   - Status MUST be classified into one of 4 categories:
     a) "Đồng nhất hoàn toàn" (Fully synchronized)
     b) "Lệch Payload" (Payload mismatch - detail every missing field, type difference, or naming divergence)
     c) "Android chưa tích hợp" (Web endpoint exists but Android has not implemented client call)
     d) "Endpoint mồ côi" (Android calls an endpoint that does not exist or has broken routing in Web BFF)
   - Every single endpoint row MUST cite the EXACT file path and line numbers on BOTH sides (e.g., `android_app/...:lines` and `app/api/...:lines`).
4. Detail authentication & authorization headers, token management, error handling schemas (HTTP 400, 401, 404, 500), and offline fallback/caching policies.
5. Provide actionable recommendations for API unification.

Update your `progress.md` in your working directory.
When finished, write your comprehensive report to `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_1\handoff.md` and send a message back to parent orchestrator.
