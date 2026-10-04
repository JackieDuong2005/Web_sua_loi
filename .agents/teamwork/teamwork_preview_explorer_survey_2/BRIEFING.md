# BRIEFING — 2026-10-03T19:10:00Z

## Mission
Survey and analyze R2 (StudentHomeScreen dynamic difficult words notebook): locate StudentHomeScreen.kt, current hardcoded words, local data storage/repositories, spelling error data structures, fallback SGK words, state wiring, and tests.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, investigation, synthesis
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\teamwork_preview_explorer_survey_2
- Original parent: faba07b7-74e8-4526-986e-66c5d58b0d81
- Milestone: Phase 2/3 Android Enhancement - R2 Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Produce detailed evidence with file paths and line numbers
- Output findings to handoff.md following 5-component protocol
- Send message to parent agent when completed

## Current Parent
- Conversation ID: faba07b7-74e8-4526-986e-66c5d58b0d81
- Updated: 2026-10-03T19:10:00Z

## Investigation State
- **Explored paths**:
  - `android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt` (lines 1-430)
  - `android_app/app/src/main/java/com/example/MainActivity.kt` (lines 84, 145, 415-425)
  - `android_app/app/src/main/java/com/example/ui/viewmodel/MainViewModel.kt` (lines 69-82, 103-105, 362-386)
  - `android_app/app/src/main/java/com/example/data/model/GradeModels.kt` (ErrorBox, GradeResult, GradeCriteria)
  - `android_app/app/src/main/java/com/example/data/local/GradeRecordDao.kt` & `GradeRecordEntity.kt`
  - `android_app/app/src/main/java/com/example/data/repository/GradeRepository.kt` & `SampleEssays.kt`
  - `android_app/app/src/test/java/com/example/*` (ExampleUnitTest, ExampleRobolectricTest, GreetingScreenshotTest)
- **Key findings**:
  - Hardcoded words list found at `StudentHomeScreen.kt:338-344` (5 static pairs).
  - Storage is Room DB (`grade_records` table) via `GradeRecordDao` + `GradeRepository.allGradedRecords`.
  - `MainViewModel.historyRecords` filters records for current student when `currentUser.role == "student"`.
  - `GradeResult.errors` contains `ErrorBox` objects with `originalWord` and `explanation`.
  - Seamless integration possible via pure function `extractDifficultWords(records, fallback)` in `StudentHomeScreen.kt`.
- **Unexplored areas**: None for R2.

## Key Decisions Made
- Confirmed fallback should be the standard 5 SGK words defined as a top-level constant `DEFAULT_SGK_DIFFICULT_WORDS`.
- Confirmed `StudentHomeScreen` is state-hoisted and already takes `recentRecords: List<GradeResult>`, making dynamic extraction purely internal to the screen without breaking callers or previews.
- Recommended adding unit tests specifically for `extractDifficultWords` and `StudentHomeScreen`.

## Artifact Index
- DISPATCH.md — incoming dispatch instructions
- BRIEFING.md — persistent situational awareness
- progress.md — liveness heartbeat
- handoff.md — final survey report
