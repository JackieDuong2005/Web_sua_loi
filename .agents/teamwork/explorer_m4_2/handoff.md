# Handoff Report — Explorer 2 (Milestone 4: Multi-Surface Teacher & Student UI Integration)

**Date**: 2026-10-18T21:05:00Z  
**From**: Explorer 2 (`explorer_m4_2`)  
**To**: Parent Orchestrator (`0516b259-befc-4fac-baa8-b10ce65a612b`) / Worker M4  
**Handoff Type**: Hard (Investigation complete, full implementation diffs prepared)

---

## 1. Observation

Direct code observations from local source files:

1. **`app/teacher/grade/page.tsx`**:
   - Lines 14–20: `Volume2` icon is not imported from `"lucide-react"`.
   - Lines 740–775 (`ResultPopup` component): The teacher comment section has a header containing `MessageSquare` and `3 Gợi ý mẫu` (`Sparkles`), but lacks an audio playback button for teacher feedback.
   - Lines 1076–1106 (View Mode 1 - Stacked / 2-column layout): Iterates over `corrections` displaying `c.error → c.suggestion` with no audio pronunciation trigger for the corrected word.
   - Lines 1185–1217 (View Mode 2 - Side-by-side layout): Also renders `c.error → c.suggestion` in a grid without audio pronunciation trigger.

2. **`app/student/page.tsx`**:
   - Lines 65–75: Audio player for `wordsToPractice` is implemented via:
     ```typescript
     const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
     ```
     This hardcodes legacy Microsoft Edge cloud voice `vi-VN-HoaiMyNeural`.
   - Lines 218–220: Latest pedagogical comment is rendered inside Hero Banner:
     ```tsx
     <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-1">
       &ldquo;{latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!"}&rdquo;
     </p>
     ```
     It currently lacks an audio listen button.

3. **`components/student/student-grade-detail-modal.tsx`**:
   - Lines 234–243: `playAudio` helper is implemented with:
     ```typescript
     const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
     ```
     This hardcodes `vi-VN-HoaiMyNeural`.
   - Line 329: `onPlayAudio={playAudio}` passes this function down to `<StudentBoundingBoxCanvas />`.
   - In `components/student/student-bbox-canvas.tsx` (Lines 378–380):
     ```tsx
     onClick={() => {
       onSelectError(box.index)
       if (suggWord) onPlayAudio(suggWord)
     }}
     ```
     Clicking any bounding box on the real student paper canvas triggers `onPlayAudio(suggWord)`.
   - Lines 456–468: Pedagogical comment block:
     ```tsx
     <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 shadow-2xs">
       <div className="flex items-center gap-1.5">
         <Sparkles className="w-4 h-4 text-primary" />
         <h3 className="font-bold text-xs sm:text-sm text-primary">
           Nhận xét sư phạm của Giáo viên (Thông tư 27)
         </h3>
       </div>
       <p className="text-xs sm:text-sm leading-relaxed text-foreground font-normal whitespace-pre-wrap bg-background/80 p-3 rounded-lg border">
         {grade.pedagogicalComment || grade.feedback || "Con làm bài rất tốt. Hãy tiếp tục phát huy nét chữ cẩn thận này nhé!"}
       </p>
     </div>
     ```
     Lacks an audio playback button.

4. **`app/api/dictation/tts/route.ts`**:
   - Lines 17–23: Fully supports query parameters `text`, `voice` (defaults to `vi_VN-vais1000-medium`), `rate`, `style`, `noise_scale`, `noise_w`, `read_punctuation`.
   - Lines 68–83: Proxies to `:8000/tts` and streams back `audio/wav` with status 200.

---

## 2. Logic Chain

1. **Audio Engine Parity**:
   - From Observation 4, the BFF route `/api/dictation/tts` is ready to proxy requests with `voice=vi_VN-vais1000-medium` and prosody styles (`warm_story`, `emphasis`).
   - From Observations 2 & 3, `app/student/page.tsx` (line 71) and `student-grade-detail-modal.tsx` (line 238) still use `vi-VN-HoaiMyNeural`. Replacing them with `voice=vi_VN-vais1000-medium&style=emphasis` aligns them with the offline Piper VITS ONNX architecture.

2. **BBox Interactive Canvas Audio**:
   - From Observation 3, clicking a BBox on the student paper in `student-bbox-canvas.tsx` calls `onPlayAudio(suggWord)`, which is passed directly from `playAudio` in `student-grade-detail-modal.tsx`.
   - Therefore, updating `playAudio` in `student-grade-detail-modal.tsx` to use `voice=vi_VN-vais1000-medium&style=emphasis` immediately activates clear, expressive pronunciation when students or parents tap red bounding boxes on handwritten exam sheets.

3. **Pedagogical Audio Across Teacher & Student Views**:
   - From Observations 1, 2, and 3, teachers and students need to hear teacher comments. Applying `voice=vi_VN-vais1000-medium&style=warm_story` provides an encouraging, natural tone compliant with Circular 27 (Thông tư 27).
   - Adding toggle buttons with `Volume2` icons, playing/pulsing indicators, and mutual exclusion (stopping previous audio when a new one starts) ensures an intuitive, non-clashing user experience.

4. **Resource Management & Stability**:
   - Storing the active audio in `audioRef.current` and adding an unmount cleanup `useEffect` prevents orphan background playback and memory leaks in Single Page Application navigation.

---

## 3. Caveats

1. **Audio Codec Compatibility**:
   - Piper VITS produces standard 16-bit PCM WAV (`audio/wav`) at 22050Hz, natively supported by all modern desktop and mobile browsers (Chrome, Edge, Safari, Firefox). No transcoding is required.
2. **Local Speaker vs Browser Audio**:
   - Teacher Dictation Cockpit (`app/teacher/dictation/page.tsx`) supports both `/api/dictation/play-local` (RPi 3.5mm AUX jack) and browser audio. For Teacher Grading Studio and Student Portal, playback is strictly browser-based via `new Audio(/api/dictation/tts?...)` because grading and student review occur on client devices (laptops, tablets, smartphones).
3. **Network Latency & Offline Execution**:
   - When Python Core service (`:8000`) is offline, the BFF route `/api/dictation/tts` returns an error response. The frontend `Audio.onerror` and `.catch()` hooks cleanly reset UI playing states to prevent UI lockups.

---

## 4. Conclusion

All 3 frontend files (`app/teacher/grade/page.tsx`, `app/student/page.tsx`, `components/student/student-grade-detail-modal.tsx`) have been thoroughly inspected. Complete concrete diffs have been designed and documented in `analysis.md`:
- **`app/teacher/grade/page.tsx`**: Add `Volume2` import, add `playCommentAudio` (`warm_story`) button in the teacher comment block, and add `playWordPronunciation` (`emphasis`) buttons next to `c.suggestion` in both stacked and side-by-side view modes.
- **`app/student/page.tsx`**: Add `playCommentAudio` (`warm_story`) button in the Hero Banner comment quote, update `playAudio` for `wordsToPractice` to use `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%`, and add unmount cleanup.
- **`components/student/student-grade-detail-modal.tsx`**: Add `playCommentAudio` (`warm_story`) button in the TT27 comment block, update `playAudio` to `voice=vi_VN-vais1000-medium&style=emphasis&rate=-10%` for word correction list and BBox paper canvas clicks, and add unmount cleanup.

---

## 5. Verification Method

To independently verify after Worker M4 applies the proposed diffs:

1. **Static Analysis & TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0 (no missing imports, no type mismatch on Audio handlers or props).

2. **Next.js Route Build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Build succeeds for `/teacher/grade`, `/student`, and shared modal components.

3. **Behavioral Code Inspection**:
   - Check `app/teacher/grade/page.tsx` around lines 740–775 for the presence of "Nghe cô giáo đọc" button with `warm_story` endpoint.
   - Check `app/teacher/grade/page.tsx` around lines 1097–1106 and 1206–1215 for the presence of the `Volume2` button next to `c.suggestion`.
   - Check `app/student/page.tsx` around line 71 to verify that `vi-VN-HoaiMyNeural` is gone and replaced by `voice=vi_VN-vais1000-medium&style=emphasis`.
   - Check `components/student/student-grade-detail-modal.tsx` around line 238 to verify that `vi-VN-HoaiMyNeural` is gone and replaced by `voice=vi_VN-vais1000-medium&style=emphasis`.
   - Check `components/student/student-grade-detail-modal.tsx` around line 460 for the presence of "Nghe cô nhận xét" button with `warm_story` endpoint.

4. **Invalidation Conditions**:
   - If `npx tsc --noEmit` fails due to `Volume2` import or handler typing, the change is invalid.
   - If any reference to `vi-VN-HoaiMyNeural` remains in `app/student/page.tsx` or `components/student/student-grade-detail-modal.tsx`, the change is invalid.
