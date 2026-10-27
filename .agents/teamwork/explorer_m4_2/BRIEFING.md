# BRIEFING — 2026-10-18T21:05:00Z

## Mission
Analyze Teacher & Student UI frontend files to design full audio integration (TTS comments & word pronunciation with piper-tts vi_VN-vais1000-medium voice) and produce implementation diffs for Worker M4.

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend investigator, UI/UX audio architect, synthesizer
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m4_2
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: Milestone 4: Multi-Surface Teacher & Student UI Integration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source files directly
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md). Use ASCII or tables.
- Audio endpoint: `/api/dictation/tts?text=...&voice=vi_VN-vais1000-medium&style=warm_story` or `style=emphasis`
- All findings must be backed by exact file paths and line numbers.

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: 2026-10-18T21:05:00Z

## Investigation State
- **Explored paths**:
  - `app/teacher/grade/page.tsx`: Lines 14-20 (imports), 389-450 (ResultPopup state), 740-775 (teacher comment block), 1076-1106 (View Mode 1 corrections), 1185-1217 (View Mode 2 corrections).
  - `app/student/page.tsx`: Lines 63-76 (wordsToPractice audio & legacy HoaiMyNeural voice), 214-225 (Hero Banner pedagogical comment quote), 405-445 (practice cards).
  - `components/student/student-grade-detail-modal.tsx`: Lines 233-243 (playAudio & legacy HoaiMyNeural), 320-340 (StudentBoundingBoxCanvas onPlayAudio prop), 456-468 (TT27 comment section), 513-560 (corrections list play buttons).
  - `components/student/student-bbox-canvas.tsx`: Lines 370-395 (BBox click handler triggering onPlayAudio).
  - `app/api/dictation/tts/route.ts`: Lines 1-110 (BFF route query parameter forwarding).
- **Key findings**:
  - `app/teacher/grade/page.tsx` lacks `Volume2` import and audio buttons for teacher comment & corrected words. Both View Mode 1 and View Mode 2 need `c.suggestion` audio triggers.
  - `app/student/page.tsx` hardcodes `vi-VN-HoaiMyNeural` at line 71; needs upgrade to `vi_VN-vais1000-medium&style=emphasis` and audio button on the hero pedagogical comment quote.
  - `components/student/student-grade-detail-modal.tsx` hardcodes `vi-VN-HoaiMyNeural` at line 238; upgrading `playAudio` directly upgrades both the modal error list and real student paper BBox clicks. Needs "Nghe cô nhận xét" button in TT27 comment section.
- **Unexplored areas**: None within Explorer 2 scope. All 3 files and supporting components fully analyzed.

## Key Decisions Made
- Fully designed mutual exclusion between playing comment audio and playing word pronunciation.
- Added toggle behavior (click playing item pauses it) and unmount cleanup to avoid orphan audio elements.
- Produced complete, drop-in diffs in `analysis.md` and summary in `handoff.md`.

## Artifact Index
- DISPATCH.md — Parent instructions
- progress.md — Liveness heartbeat (Status: Completed)
- BRIEFING.md — Persistent context & memory
- analysis.md — Detailed frontend analysis, architectural diagram, and exact code diffs
- handoff.md — 5-component hard handoff report for Worker M4
