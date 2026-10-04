# Task: Survey R1 (HistoryScreen search & filter) & R4 (Brand colors)

## Assigned Agent
- Type: teamwork_preview_explorer
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\teamwork_preview_explorer_survey_1
- Target: Investigate HistoryScreen.kt, ViewModels, colors.xml, and test targets.

## 2026-10-03T19:02:57Z
You are Explorer 1 investigating R1 (HistoryScreen search & filter) and R4 (Brand colors).
Your working directory is: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\teamwork_preview_explorer_survey_1
Original user request path: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md (read section ## 2026-10-03T19:00:25Z).

OBJECTIVES:
1. Locate and inspect HistoryScreen.kt and its ViewModel/state holder in android_app/.
   - How are submissions/history list represented? What fields do they have (student name, title/essay name, category/subject, score)?
   - How is the UI currently structured? Where should the OutlinedTextField search bar be added?
   - How should the two FilterChip rows be structured?
     * Category: [Tất cả, Chính tả, Tập làm văn]
     * Score range: [Tất cả, >= 9.0, 8.0-8.9, 6.5-7.9, < 6.5]
   - What is the exact filtering logic needed, how does it handle case-insensitivity, diacritics/unaccented Vietnamese search (if applicable), and multiple active filters?
2. Inspect res/values/colors.xml in android_app/:
   - Check existing color tokens.
   - Specify exact changes to add emerald_primary (#FF059669) and background_cream (#FFFAF9F6).
   - Check if themes.xml / splash screen uses or should reference these colors.
3. Check existing tests related to HistoryScreen or ViewModel.
