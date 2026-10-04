# Task: Survey R2 (StudentHomeScreen dynamic difficult words)

## Assigned Agent
- Type: teamwork_preview_explorer
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\teamwork_preview_explorer_survey_2
- Target: Investigate StudentHomeScreen.kt, difficult words list, local submission storage, and fallback SGK logic.

## 2026-10-03T19:02:57Z
You are Explorer 2 investigating R2 (StudentHomeScreen dynamic difficult words notebook).
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\teamwork_preview_explorer_survey_2
Original user request path: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (read section ## 2026-10-03T19:00:25Z).

OBJECTIVES:
1. Locate and inspect StudentHomeScreen.kt and its ViewModel/data flow in android_app/.
   - How is the difficult words notebook currently displayed? Identify the current hardcoded/static list of 5 words.
   - How are exam submissions or student correction results stored locally (Room DB, SharedPreferences, in-memory, local JSON files, Repository)?
   - Where are the spelling errors stored? Look at data classes (e.g., CorrectionResult, SpellError, Submission, etc.). Check the mapping: `errors.map { it.originalWord to it.explanation }`.
   - What should the fallback list of standard SGK difficult words be when the student has no graded exams or no errors yet?
2. Check how StudentHomeScreen gets data (StateFlow, ViewModel, Repository) and how to wire the dynamic extraction seamlessly without breaking existing screens or previews.
3. Check existing tests related to StudentHomeScreen or student data flow.

DO NOT write source code. Inspect files, produce detailed evidence with file paths and line numbers, and write your report to handoff.md in your working directory. Send a message to parent when done.
