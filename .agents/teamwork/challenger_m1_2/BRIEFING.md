# BRIEFING — 2026-10-18T19:36:00Z

## Mission
Adversarial stress-testing and empirical fuzzing of pedagogical punctuation injection (`inject_pedagogical_punctuation`) and Piper synthesis in `python_service/tts_engine.py`.

## 🔒 My Identity
- Archetype: empirical-challenger
- Roles: critic, specialist
- Working directory: c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\challenger_m1_2
- Original parent: 0516b259-befc-4fac-baa8-b10ce65a612b
- Milestone: milestone_1
- Instance: 2 of 2

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Empirical verification mandatory — must run tests and oracles, never rely on claims
- TUYỆT ĐỐI KHÔNG DÙNG SƠ ĐỒ MERMAID (tuân thủ GEMINI.md)
- Work within allocated directory for agent metadata; adversarial test code in test suite

## Current Parent
- Conversation ID: 0516b259-befc-4fac-baa8-b10ce65a612b
- Updated: not yet

## Review Scope
- **Files to review**: `python_service/tts_engine.py`, `python_service/tests/test_tts_engine.py`
- **Interface contracts**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_4\PROJECT.md`
- **Review criteria**: Pedagogical punctuation injection robustness, adversarial inputs, edge cases, crash resistance with Piper synthesis.

## Attack Surface
- **Hypotheses tested**: 
  - Hypothesis 1 (Repeated/nested punctuation): CONFIRMED VULNERABILITY. `?!?!`, `: : :`, `, . ? ! :`, `.,?!:`, `,,,,....` violate idempotency $f(f(x)) \neq f(x)$ and explode into stuttering cues (e.g. `, phẩy,, phẩy, chấm, chấm.`).
  - Hypothesis 2 (Punctuation-only strings): CONFIRMED CRASH. Piper synthesizes 0 frames on purely punctuation strings (`...`, `....` or any punctuation when `read_punctuation=False`), causing `wave.Error: # channels not specified` unhandled crash.
  - Hypothesis 3 (Mixed punctuation and diacritics): PASSED. Sentences with words and punctuation preserve Vietnamese diacritics without phonemizer desync.
  - Hypothesis 4 (Vietnamese words containing punctuation names): PASSED. Phrases like `chấm bài`, `phẩy đuôi`, `chấm thi`, `dấu chấm`, `dấu hai chấm` are not incorrectly converted to punctuation marks.
  - Hypothesis 5 (Extreme inputs): CONFIRMED VULNERABILITIES. Whitespace before ellipsis (`Hôm nay ... trời đẹp`) causes `_PUNCTUATION` to steal the first dot, producing `Hôm nay, chấm. .. trời đẹp`. Whitespace before existing cue (`Chào em , phẩy, hôm nay`) causes cue multiplication (`Chào em, phẩy, phẩy, phẩy, hôm nay`).
- **Vulnerabilities found**:
  1. Idempotency failure and cue mutation explosion in multi-pass execution (10 test failures).
  2. Regex precedence / whitespace stealing in `_PUNCTUATION` vs `_ELLIPSIS` and `_CUE_PATTERN` (3 test failures).
  3. Uncaught `wave.Error: # channels not specified` crash during zero-phoneme audio synthesis (11 test failures).
- **Untested angles**: All planned angles tested across 72 test cases.

## Loaded Skills
- None explicitly assigned.

## Key Decisions Made
- Render verdict: REJECT. Milestone 1 implementation in `python_service/tts_engine.py` cannot be approved until idempotence and zero-frame WAV synthesis crash are resolved.
- Authored test harness `tests/test_adversarial_punctuation.py` executing 72 adversarial test cases (48 passed, 24 failed).

## Artifact Index
- DISPATCH.md — Original dispatch message
- progress.md — Liveness & progress tracking
- tests/test_adversarial_punctuation.py — Empirical adversarial fuzzing test suite
- handoff.md — Final challenge report
