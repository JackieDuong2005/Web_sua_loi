# Handoff Report: Spoken Pedagogical Punctuation & Acoustic Rhythms for Piper VITS
**From**: Explorer 2 (`explorer_m1_2`)  
**To**: Orchestrator & Milestone 1 Worker  
**Date**: 2026-10-18T19:19:00Z  
**Type**: Hard (Investigation complete, actionable implementation ready)

---

## 1. Observation
1. **Source file inspection (`python_service/tts_engine.py`)**:
   - `normalize_vietnamese_text` (lines 136-196): converts dates, class names (`3A`), abbreviations (`tr.` -> `trang`), and integers (`\b\d+\b` -> `number_to_vietnamese`). Quotation marks `["“”«»]` are stripped at line 192.
   - Running `normalize_vietnamese_text('Điểm 9.5 hoặc 9,5 kg.')` produced `'Điểm chín.năm hoặc chín,năm ki lô gam.'`. Integers are converted but dots and commas inside decimals remain if not explicitly handled prior to `\b\d+\b`.
   - `synthesize_wav` (lines 344-380) currently takes `(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bytes` and calls `norm_text = normalize_vietnamese_text(text)`.
   - In `models/tts/vi_VN-vais1000-medium.onnx.json`, `phoneme_id_map` assigns ID `8` to `,` and ID `10` to `.`.
2. **Acoustic Phonemization Test (`PiperVoice.phonemize`)**:
   - Input: `"se lạnh, phẩy, bầu trời."`
   - Phonemes observed: `[['s', 'ˈ', 'ɛ', ' ', 'l', 'ˈ', 'e', '-', '6', 'ɲ', ',', ' ', 'f', 'ˈ', 'ə', 'ɪ', '4', ',', ' ', 'b', 'ˈ', 'ə', '2', 'w', ' ', 't', 'ʃ', 'ˈ', 'ə', 'ː', '2', 'j', '.']]`.
   - Notice the comma phonemes `,` inserted before and after `phẩy` (`f-ə-ɪ-4`), followed by period `.` after `bầu trời`.
3. **Synthesis Benchmark**:
   - Natural synthesis with spoken punctuation: `voice.synthesize_wav("Gió mùa thu se lạnh, phẩy, bầu trời xanh trong vắt, chấm.")` produced 138,284 bytes (duration 3.13s), compared to 96,812 bytes (duration 2.19s) without cues.
   - Tested with `warm_story` prosody preset: generated 153,132 bytes of valid WAV audio, strictly satisfying the Acceptance Criteria requirement (> 10,000 bytes).
4. **Line-break Nuance**:
   - When using `\s*` around punctuation, `\s` greedily consumes newline `\n`. Replacing `\s*` with horizontal whitespace `[ \t]*` preserves newlines across multi-line paragraphs and poems.

---

## 2. Logic Chain
1. **From Observation 1 & 2 $\to$ Necessity of Acoustic Boundary Wrappers**:
   - In Vietnamese primary school dictation, teachers pause before stating the punctuation mark, say the mark, and pause again before the next word.
   - In Piper VITS, phoneme ID `8` (`,`) and ID `10` (`.`) trigger duration pauses.
   - Therefore, mapping `,` $\to$ `, phẩy, `, `.` $\to$ `, chấm. `, `?` $\to$ `, chấm hỏi. `, `!` $\to$ `, chấm than. `, `:` $\to$ `, hai chấm, ` perfectly triggers the necessary espeak pauses around each spoken cue.
2. **From Observation 1 $\to$ Idempotence & Safe Lexer Design**:
   - Naive sequential substitution leads to catastrophic double substitution when applied twice or to text already containing cues.
   - Using a single-pass regex with token alternation `(Existing Cues) | (Decimals/Time/Ratios) | (Ellipses) | (Abbreviations) | (Bare Punctuation)` ensures that earlier protected tokens are consumed without being re-substituted.
   - Validated: 5 consecutive passes on identical text produced `all_same = True` (100% idempotent).
3. **From Observation 1 $\to$ Pipeline Ordering Decision**:
   - If `inject_pedagogical_punctuation` runs before `normalize_vietnamese_text`, SGK abbreviations like `tr. 45` become `tr, chấm. 45`, which breaks the regex `\btr\.` in normalizer.
   - If `normalize_vietnamese_text` runs first, `tr. 45` becomes `trang bốn mươi lăm`, which allows `inject_pedagogical_punctuation` to safely convert genuine syntactic punctuation marks.
4. **From Observation 4 $\to$ Horizontal Whitespace Discipline**:
   - Preserving newlines `\n` is critical for dictation poetry. Using `[ \t]*` ensures intra-line spacing is normalized while paragraph breaks remain intact.

---

## 3. Caveats
1. **Semi-colon (`;`)**:
   - Not included in the 5 core pedagogical spoken cues requested in `ORIGINAL_REQUEST § R1`. In Vietnamese primary dictation, semicolons are rarely used in grades 1-3. Left to native Piper pause phoneme without spoken substitution.
2. **Hyphens (`-`, `—`)**:
   - Dialog dashes and compound word hyphens are preserved as punctuation marks rather than spoken words, avoiding unwanted audio clutter during dictation dialogues.
3. **Foreign Decimal Notation**:
   - Both Vietnamese standard (`8,5`) and English/Tech standard (`9.5`) are protected. If text contains complex mathematical formulas, SLM text extraction should sanitize them prior to TTS.

---

## 4. Conclusion
1. Implement `inject_pedagogical_punctuation(text: str, enabled: bool = False) -> str` in `python_service/tts_engine.py` using the single-pass regex lexer specification detailed in `analysis.md`.
2. Integrate `inject_pedagogical_punctuation` inside `synthesize_wav` and `play_on_local_speaker` immediately **after** `normalize_vietnamese_text` when `read_punctuation=True`.
3. Enhance `normalize_vietnamese_text` with decimal normalization (`(\d+)([.,])(\d+)` $\to$ `{int} phẩy {dec}`) as an extra layer of defense.
4. Update `synthesize_wav` signature to:
   ```python
   def synthesize_wav(
       self,
       text: str,
       voice_id: str = "vi_VN-vais1000-medium",
       rate: str = "-15%",
       style: str = "standard",
       noise_scale: Optional[float] = None,
       noise_w: Optional[float] = None,
       read_punctuation: bool = False,
   ) -> bytes:
   ```

---

## 5. Verification Method
Worker and Reviewers can independently verify this implementation using the following commands:

1. **Unit Test for Punctuation Injection & Idempotence**:
   ```bash
   python -X utf8 -c "
   from python_service.tts_engine import inject_pedagogical_punctuation
   text = 'Gió mùa thu se lạnh, bầu trời xanh trong vắt. Bé được 9.5 điểm... Bạn có thích không? Thật tuyệt! Mẹ dặn: Chăm học.'
   out1 = inject_pedagogical_punctuation(text, enabled=True)
   out2 = inject_pedagogical_punctuation(out1, enabled=True)
   assert out1 == out2, 'Idempotence failure!'
   assert '9.5' in out1, 'Decimal broken!'
   assert '...' in out1, 'Ellipsis broken!'
   assert ', phẩy,' in out1 and ', chấm.' in out1 and ', chấm hỏi.' in out1
   print('✅ Punctuation injection verified!')
   "
   ```

2. **Acoustic WAV Verification (Milestone 1 Acceptance Criteria)**:
   ```bash
   python -X utf8 -c "
   from python_service.tts_engine import tts_engine
   wav_bytes = tts_engine.synthesize_wav(
       'Gió mùa thu se lạnh, bầu trời xanh trong vắt.',
       voice_id='vi_VN-vais1000-medium',
       style='warm_story',
       read_punctuation=True
   )
   assert len(wav_bytes) > 10000, f'WAV too small: {len(wav_bytes)} bytes'
   print(f'✅ Audio synthesized successfully: {len(wav_bytes)} bytes')
   "
   ```
