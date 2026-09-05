# Dictation Practice Platform — Technical & UI/UX Architecture Proposal

## Table of Contents

1. [Recommended Tech Stack & Architecture](#1-recommended-tech-stack--architecture)
   - 1.1 [Frontend Layer](#11-frontend-layer)
   - 1.2 [Backend & Infrastructure](#12-backend--infrastructure)
   - 1.3 [Speech Synthesis (TTS)](#13-speech-synthesis-tts--critical-path)
   - 1.4 [Speech Recognition / Handwriting Verification](#14-speech-recognition--handwriting-verification-future-phase)
2. [Key Functional Modules](#2-key-functional-modules)
   - 2.1 [Teacher / Parent Portal](#21-teacher--parent-portal)
   - 2.2 [Student Dictation Player](#22-student-dictation-player)
3. [Minimalist UI/UX Design Specification](#3-minimalist-uiux-design-specification)
   - 3.1 [Design Philosophy: "Calm Confidence"](#31-design-philosophy-calm-confidence)
   - 3.2 [Layout Wireframe Breakdown](#32-layout-wireframe-breakdown)
   - 3.3 [Color Palette](#33-color-palette)
   - 3.4 [Typography](#34-typography)
   - 3.5 [Micro-Interactions & Gamification](#35-micro-interactions--gamification)
4. [Practical Implementation Roadmap](#4-practical-implementation-roadmap)
5. [Vietnamese-Specific Considerations](#5-vietnamese-specific-considerations)
6. [Summary Table](#6-summary-table)

---

## 1. Recommended Tech Stack & Architecture

### 1.1 Frontend Layer

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **Framework** | **Next.js 14+ (App Router)** | SSR/SSG for fast initial loads, excellent SEO for teacher discovery, built-in API routes for lightweight backend operations, and strong TypeScript support. |
| **State Management** | **Zustand + React Query (TanStack Query)** | Zustand for minimal global UI state; React Query for server-state caching, optimistic updates, and background refetching. |
| **Styling** | **Tailwind CSS + shadcn/ui** | Rapid prototyping, consistent design tokens, and accessibility-first primitives. |
| **Animation** | **Framer Motion** | Smooth, physics-based transitions for gamified feedback (celebrations, button presses) without jarring movement. |
| **Audio Engine** | **Howler.js** wrapper around Web Audio API | Robust audio scheduling, cross-browser compatibility, and precise playback control for sentence segmentation. |

**Architecture Pattern:**  
Use a **Component-Driven Architecture** with strict separation:
- `/app/student/` — Distraction-free dictation player (fullscreen-capable, minimal chrome)
- `/app/teacher/` — Content management dashboard
- `/app/api/` — Next.js API routes for lightweight operations; heavy logic delegated to backend service

---

### 1.2 Backend & Infrastructure

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Server** | **Node.js + Fastify** (or **Bun + Elysia** for cutting-edge performance) | Low-latency request handling, WebSocket support for real-time progress sync. |
| **Database** | **PostgreSQL** (primary) + **Redis** (caching/sessions) | Relational data for users, passages, submissions, grades. Redis for session tokens, TTS audio caching, and rate limiting. |
| **Object Storage** | **AWS S3 / Cloudflare R2** | Pre-generated TTS audio files (MP3/OGG), teacher-uploaded reference images. |
| **CDN** | **Cloudflare** | Global audio asset delivery with edge caching to minimize latency. |
| **Queue System** | **BullMQ (Redis-based)** | Async TTS generation jobs, batch processing of OCR submissions. |
| **Authentication** | **NextAuth.js v5** (Auth.js) with OAuth 2.0 + Magic Links | Parent/teacher accounts; student accounts can be **passwordless** (classroom PINs or QR-code login) to eliminate password fatigue for grades 1–3. |

**Database Schema Highlights:**

```sql
-- Core tables
users (id, role, email, name, created_at)
classrooms (id, teacher_id, name, grade_level, invite_code)
passages (id, title, content, language, difficulty, created_by)
dictation_sessions (id, passage_id, speed_wpm, pause_ms, 
                    max_replays, created_by, scheduled_at)
submissions (id, session_id, student_id, handwritten_text, 
             ocr_text, accuracy_score, submitted_at)
```

---

### 1.3 Speech Synthesis (TTS) — Critical Path

For elementary dictation, **TTS quality is the product**. You need natural prosody, clear articulation, and precise pause control.

#### Tier 1: Web Speech API (Baseline / Free)

```javascript
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = 0.7;      // 70% speed for grade 1-2
utterance.pitch = 1.1;     // Slightly higher pitch = more engaging for children
utterance.lang = 'vi-VN';  // Vietnamese
window.speechSynthesis.speak(utterance);
```

- **Pros:** Zero cost, instant, works offline
- **Cons:** Voice quality varies wildly by OS/browser; limited pause/sentence-break control; inconsistent across devices

#### Tier 2: Cloud TTS (Production Recommendation)

| Provider | Vietnamese Support | Pros | Cons |
|----------|-----------------|------|------|
| **Google Cloud TTS** | Excellent (`vi-VN`) | Neural voices (WaveNet), SSML support for precise pauses, speed, and emphasis | Pay-per-character, requires internet |
| **Azure Speech Services** | Excellent (`vi-VN`) | Highly natural neural voices, fine-grained prosody control via SSML, batch synthesis | Slightly higher cost at scale |
| **Amazon Polly** | Good (`vi-VN`) | Cost-effective, standard + neural voices | Vietnamese neural voice quality slightly behind Google/Azure |
| **FPT.AI Text-to-Speech** | Native, best-in-class for Vietnamese | Specifically tuned for Vietnamese prosody and diacritics; very natural | Vietnam-focused, less international support |
| **Zalo AI TTS** | Native Vietnamese | Free tier generous, natural sounding | API stability concerns, less enterprise support |

**Recommended Hybrid Strategy:**
1. **Pre-generate** all dictation audio server-side using **Google Cloud TTS** or **FPT.AI** (for Vietnamese) with SSML markup
2. **Store** generated MP3s in S3/R2 with aggressive caching
3. **Fallback** to Web Speech API if cloud audio fails or for ad-hoc teacher previews

**SSML Example for Dictation-Optimized Audio:**

```xml
<speak>
  <prosody rate="slow" pitch="+1st">
    <break time="500ms"/>
    Câu một.
    <break time="800ms"/>
    Bà ngoại đang nấu cơm trong bếp.
    <break time="2000ms"/>
    Câu hai.
    <break time="800ms"/>
    Em bé thích ăn trái cây tươi.
    <break time="3000ms"/>
  </prosody>
</speak>
```

---

### 1.4 Speech Recognition / Handwriting Verification (Future Phase)

| Approach | Tool | Use Case |
|----------|------|----------|
| **Client-side OCR** | **Tesseract.js** (WASM) | Lightweight text extraction from uploaded handwriting photos. Runs entirely in browser — no server cost, privacy-preserving. |
| **Cloud OCR** | **Google Vision API** | Higher accuracy for messy/cursive child handwriting; handles image rotation and poor lighting. |
| **STT for Spoken Answers** | **Whisper API** (OpenAI) or **Azure Speech-to-Text** | Future "speak your answer" mode for oral dictation practice. |
| **Diff Engine** | **diff-match-patch** (Google) + **Levenshtein distance** | Compare OCR output against original text; calculate accuracy percentage, highlight errors with color-coding. |

**Grading Algorithm Concept:**

```javascript
function gradeSubmission(original, submitted) {
  const normalizedOriginal = normalizeVietnamese(original); // handle diacritics
  const normalizedSubmitted = normalizeVietnamese(submitted);

  const { score, errors } = levenshteinDetailed(
    normalizedOriginal, 
    normalizedSubmitted
  );

  // Elementary-friendly: don't penalize spacing errors heavily
  const weightedScore = Math.max(0, score - (errors.spacing * 0.1));

  return {
    percentage: Math.round(weightedScore * 100),
    errorWords: errors.misspelled, // highlight in red
    missingWords: errors.missing,  // highlight in orange
    extraWords: errors.extra       // highlight in blue
  };
}
```

---

## 2. Key Functional Modules

### 2.1 Teacher / Parent Portal

**Module: Passage Composer**
- **Rich Text Input** with character counter (target: 50–150 words per session for grades 1–3; 150–300 for grades 4–5)
- **Auto-segmentation:** Split text into sentences automatically; teacher can adjust break points
- **Audio Preview:** One-click preview of generated TTS with current settings
- **Parameter Presets:**

| Grade | Speed (WPM) | Pause Between Sentences | Max Replays | Font Size Reference |
|-------|-------------|------------------------|-------------|---------------------|
| 1 | 60–80 | 3s | Unlimited | 24px |
| 2 | 80–100 | 2.5s | 5x | 22px |
| 3 | 100–120 | 2s | 3x | 20px |
| 4–5 | 120–140 | 1.5s | 2x | 18px |

**Module: Session Scheduler**
- Assign to individual students or entire classroom
- Set due dates, time limits, and "practice mode" vs. "test mode"
- View completion dashboard with per-student accuracy trends

**Module: Grading Review**
- Side-by-side view: Original text | Student submission | OCR confidence overlay
- One-click "accept alternate spelling" for common child errors
- Bulk export to PDF/Excel for parent-teacher conferences

---

### 2.2 Student Dictation Player

**Core Interaction Flow:**

```
[Start Screen] → [Countdown 3-2-1] → [Audio Plays Sentence 1] 
→ [Student Writes] → [Auto-pause / Student clicks "Next"] 
→ [Audio Plays Sentence 2] → ... → [Review Screen] → [Submit]
```

**Player Components:**

| Component | Behavior |
|-----------|----------|
| **Visual Countdown** | Large, fullscreen 3-2-1 with playful animation (bouncing numbers) before audio begins |
| **Progress Tracker** | Horizontal "train track" or "path" showing sentence position; completed segments turn green |
| **Audio Controls** | Giant circular **Play** button (min 80×80px), **Replay** (max 3–5 presses), **Pause**, **Skip** (only in practice mode) |
| **Writing Area** | Full-width textarea with **ruled lines** (like notebook paper); auto-expands; supports Vietnamese Telex/VNI input |
| **Sentence Indicator** | "Câu 2 / 5" in large, friendly font; current sentence highlighted in a "speech bubble" |
| **Help Button** | "Tôi không nghe rõ" — replays current sentence without penalty (limited uses) |

**Accessibility Features:**
- **Keyboard-only mode:** Space = play/pause, R = replay, Tab = next sentence
- **High contrast toggle:** Black/yellow or blue/white for vision-impaired students
- **Dyslexia-friendly font option:** OpenDyslexic as alternative typeface

---

## 3. Minimalist UI/UX Design Specification

### 3.1 Design Philosophy: "Calm Confidence"

Elementary students are easily overwhelmed. The interface must feel **safe, predictable, and encouraging**.

**Core Principles:**
1. **One Action Per Screen** — Never show multiple competing CTAs
2. **Giant Touch Targets** — Minimum 64×64px for all interactive elements (Apple HIG + child motor skills)
3. **Instant Feedback** — Every button press provides immediate visual/audio confirmation
4. **Zero Dead Ends** — If a student is stuck, a friendly "Help" character appears after 10 seconds of inactivity
5. **No Clutter** — Remove navigation bars, footers, and ads from the student player. Full immersion.

---

### 3.2 Layout Wireframe Breakdown

#### Student Dictation Player (Primary Screen)

```
┌─────────────────────────────────────────┐
│  [← Back]    🌟 Level 3    [Settings ⚙] │  ← Header (40px, minimal)
├─────────────────────────────────────────┤
│                                         │
│    ┌─────────────────────────┐         │
│    │   "Câu 2 trên tổng 5"   │         │  ← Sentence Counter
│    │      (Speech Bubble)    │         │
│    └─────────────────────────┘         │
│                                         │
│         ┌─────────┐                    │
│         │   ▶️    │  ← Giant Play      │  ← Control Board
│         │  PLAY   │    (120×120px)     │
│         └─────────┘                    │
│    [↺ Replay]  [⏸ Pause]  [⏭ Skip]    │
│                                         │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  _____________________________  │   │
│  │  _____________________________  │   │  ← Writing Area
│  │  _____________________________  │   │     (Notebook-style
│  │  _____________________________  │   │      ruled lines)
│  │  _____________________________  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [✅ Tôi đã viết xong!]  ← Primary CTA │
│                                         │
└─────────────────────────────────────────┘
```

#### Teacher Portal — Passage Setup

```
┌─────────────────────────────────────────┐
│  [Logo]  Dashboard  Passages  Students   │
├─────────────────────────────────────────┤
│  ✏️ Tạo bài tập chính tả mới           │
├─────────────────────────────────────────┤
│  Tiêu đề: [____________________]        │
│                                         │
│  Nội dung:                              │
│  ┌─────────────────────────────────┐   │
│  │ Bà ngoại đang nấu cơm...      │   │
│  │ Em bé thích ăn trái cây...    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Tự động chia câu]  [Xem trước âm thanh]
│                                         │
│  ⚙️ Thiết lập:                         │
│  Tốc độ: [●━━━━] 80 từ/phút           │
│  Tạm dừng giữa câu: [●━━━] 2.5 giây   │
│  Số lần phát lại: [3 ▼]               │
│                                         │
│  [💾 Lưu bài tập]                      │
└─────────────────────────────────────────┘
```

---

### 3.3 Color Palette

**Primary Palette (Calm & Focused):**

| Token | Hex | Usage |
|-------|-----|-------|
| `--ocean` | `#2563EB` | Primary actions, Play button, progress |
| `--mint` | `#10B981` | Success, correct answers, completion |
| `--sun` | `#F59E0B` | Warnings, replay button, highlights |
| `--coral` | `#EF4444` | Errors, incorrect words, stop actions |
| `--cloud` | `#F8FAFC` | Background (never pure white — reduces eye strain) |
| `--ink` | `#1E293B` | Primary text (high contrast, not pure black) |
| `--pencil` | `#94A3B8` | Secondary text, disabled states |

**Dark Mode (Optional):**
- Background: `#0F172A`
- Surface: `#1E293B`
- Text: `#F1F5F9`

**Gamification Accents:**
- **Streak Fire:** `#F97316` (orange gradient)
- **Star Earned:** `#EAB308` (gold with subtle CSS shimmer animation)
- **Mascot Color:** `#8B5CF6` (purple — friendly, gender-neutral)

---

### 3.4 Typography

| Purpose | Font | Size | Weight |
|---------|------|------|--------|
| **Body / Writing Area** | **Inter** or **Nunito** | 20–24px | 400 |
| **Headings** | **Nunito** | 32–40px | 700 (rounded, friendly) |
| **Sentence Display** | **Nunito** | 28px | 600 |
| **UI Labels** | **Inter** | 16px | 500 |
| **Dyslexia Alternative** | **OpenDyslexic** | 22px | 400 |

**Why Nunito?**  
Rounded terminals, excellent readability at large sizes, feels "friendly" without being infantile. Supports Vietnamese full Unicode (including all diacritics: ắ, ệ, ờ, etc.).

**Line Height:** 1.6 for writing area (mimics school notebook spacing)  
**Letter Spacing:** +0.5px for body text (reduces crowding for early readers)

---

### 3.5 Micro-Interactions & Gamification

| Interaction | Implementation |
|-------------|---------------|
| **Button Press** | Scale down to 0.95 + haptic vibration (if mobile) |
| **Correct Submission** | Confetti burst (canvas-confetti) + mascot celebration + "You earned 3 stars!" |
| **Incorrect Word** | Gentle shake animation (Framer Motion `x: [-5, 5, -5, 5, 0]`) + soft "try again" sound |
| **Progress Completion** | Train/car mascot moves along track; segment fills with mint green |
| **Idle Timeout** | Mascot peeks from corner: "Bạn cần giúp đỡ không?" (Do you need help?) |

---

## 4. Practical Implementation Roadmap

### Phase 1: MVP (Weeks 1–4)
- Next.js + Tailwind scaffold
- Web Speech API TTS (client-side only)
- Basic student player with play/pause/replay
- Simple textarea submission
- Teacher text upload via markdown/plaintext

### Phase 2: Polish (Weeks 5–8)
- Integrate Google Cloud TTS with SSML generation
- S3 audio caching
- Student authentication (PIN-based)
- Basic diff-based grading (no OCR yet)
- Responsive tablet optimization (primary device for grades 1–3)

### Phase 3: Scale (Weeks 9–12)
- Classroom management + analytics dashboard
- Tesseract.js client-side OCR for handwriting
- Gamification layer (streaks, badges, mascot)
- Parent progress emails
- Offline PWA support (service worker caching audio for homework without WiFi)

### Phase 4: Intelligence (Months 4–6)
- Whisper STT for oral dictation mode
- AI-generated passage suggestions (GPT-4 tuned for grade-appropriate vocabulary)
- Adaptive difficulty (auto-adjust speed based on historical accuracy)

---

## 5. Vietnamese-Specific Considerations

1. **Telex/VNI Input:** Ensure the writing area respects Vietnamese input methods. Test extensively on iOS (built-in Telex) and Android (Laban Key, UniKey).
2. **Diacritic Sensitivity:** In grading, distinguish between "missing diacritic" (minor error, -0.5) and "wrong word" (major error, -1). Example: "ma" vs. "má" vs. "mà" are different words.
3. **TTS Prosody:** Vietnamese is tonal. Cloud TTS must preserve tone contours at slow speeds. FPT.AI handles this better than generic engines.
4. **Cultural Mascot:** Consider a friendly **con hổ (tiger)** or **con rồng (dragon)** mascot — culturally resonant, gender-neutral, and engaging for Vietnamese children.

---

## 6. Summary Table

| Concern | Recommendation |
|---------|---------------|
| **Frontend** | Next.js 14 + Tailwind + Framer Motion |
| **Backend** | Node.js/Fastify + PostgreSQL + Redis |
| **TTS (Vietnamese)** | FPT.AI or Google Cloud TTS with SSML |
| **Storage** | Cloudflare R2 (cost-effective S3 alternative) |
| **Auth** | Auth.js with PIN-based student login |
| **OCR (Future)** | Tesseract.js → Google Vision API |
| **Design System** | Nunito font, ocean/mint/coral palette, 64px touch targets |
| **Key UX Principle** | One action per screen, instant feedback, zero clutter |

---

> **Architect's Note:** This architecture balances **pedagogical rigor** with **technical pragmatism**. The TTS layer is your highest-leverage investment — prioritize natural-sounding Vietnamese voices, and everything else builds from that foundation.

*Document compiled by Senior EdTech Full-Stack Architect & UI/UX Designer.*
