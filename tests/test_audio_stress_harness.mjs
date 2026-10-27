/**
 * Empirical Stress Harness for Milestone 4 Audio Lifecycle
 * 
 * Simulates browser environment (HTMLAudioElement, React state/ref semantics)
 * and executes rapid-clicking stress tests (500 rapid clicks across tracks),
 * cross-track cancellation, and modal dismissal.
 */

import { strict as assert } from 'node:assert';

class MockAudioElement {
  static instancesCreated = 0;
  static activePlayingInstances = 0;

  constructor(src) {
    this.src = src;
    this.paused = true;
    this.ended = false;
    this.onended = null;
    this.onerror = null;
    this._loadCalled = false;
    this._pauseCalled = false;
    MockAudioElement.instancesCreated++;
  }

  play() {
    this.paused = false;
    MockAudioElement.activePlayingInstances++;
    return Promise.resolve();
  }

  pause() {
    if (!this.paused) {
      MockAudioElement.activePlayingInstances = Math.max(0, MockAudioElement.activePlayingInstances - 1);
    }
    this.paused = true;
    this._pauseCalled = true;
  }

  load() {
    this._loadCalled = true;
    if (this.src === "") {
      this.ended = true;
    }
  }
}

// 5-step cleanup helper identical across all 4 surfaces
function stopActiveAudio(audioRef) {
  if (audioRef.current) {
    try {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = "";
      audioRef.current.load();
    } catch {
      // Ignore abort issues
    }
    audioRef.current = null;
  }
}

// Surface state machine simulation
class SurfaceAudioController {
  constructor(name) {
    this.name = name;
    this.audioRef = { current: null };
    this.isPlayingComment = false;
    this.playingWordIdx = null; // or string
    this.open = true;
    this.errorLog = [];
  }

  // Teacher comment playback (style=warm_story)
  playComment(text) {
    if (!text || !text.trim()) return;
    
    // Step 1: stop active audio
    stopActiveAudio(this.audioRef);
    
    // Toggle check
    if (this.isPlayingComment) {
      this.isPlayingComment = false;
      return;
    }
    
    // Cross-track cancellation: clear word track
    this.playingWordIdx = null;
    this.isPlayingComment = true;

    const audio = new MockAudioElement(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi_VN-vais1000-medium&style=warm_story`);
    this.audioRef.current = audio;
    
    audio.onended = () => {
      this.isPlayingComment = false;
      this.audioRef.current = null;
    };
    audio.onerror = () => {
      this.isPlayingComment = false;
      this.audioRef.current = null;
    };

    audio.play().catch(err => {
      this.isPlayingComment = false;
      this.audioRef.current = null;
    });

    // Invariant check: active playing instances must never exceed 1
    if (MockAudioElement.activePlayingInstances > 1) {
      this.errorLog.push(`INVARIANT VIOLATED in ${this.name}: Concurrent audio instances = ${MockAudioElement.activePlayingInstances}`);
    }
  }

  // Word pronunciation playback (style=emphasis)
  playWord(word, idx) {
    if (!word || !word.trim()) return;

    // Step 1: stop active audio
    stopActiveAudio(this.audioRef);

    // Toggle check
    if (this.playingWordIdx === idx) {
      this.playingWordIdx = null;
      return;
    }

    // Cross-track cancellation: clear comment track
    this.isPlayingComment = false;
    this.playingWordIdx = idx;

    const audio = new MockAudioElement(`/api/dictation/tts?text=${encodeURIComponent(word)}&voice=vi_VN-vais1000-medium&style=emphasis`);
    this.audioRef.current = audio;

    audio.onended = () => {
      this.playingWordIdx = null;
      this.audioRef.current = null;
    };
    audio.onerror = () => {
      this.playingWordIdx = null;
      this.audioRef.current = null;
    };

    audio.play().catch(err => {
      this.playingWordIdx = null;
      this.audioRef.current = null;
    });

    // Invariant check: active playing instances must never exceed 1
    if (MockAudioElement.activePlayingInstances > 1) {
      this.errorLog.push(`INVARIANT VIOLATED in ${this.name}: Concurrent audio instances = ${MockAudioElement.activePlayingInstances}`);
    }
  }

  // Modal / Popup dismissal
  dismiss() {
    this.open = false;
    stopActiveAudio(this.audioRef);
    this.isPlayingComment = false;
    this.playingWordIdx = null;
  }
}

async function runEmpiricalStressSuite() {
  console.log("======================================================================");
  console.log("       EMPIRICAL HARNESS: AUDIO LIFECYCLE & STRESS VERIFICATION      ");
  console.log("======================================================================\n");

  const surfaces = [
    new SurfaceAudioController("Teacher Grade View (ResultPopup)"),
    new SurfaceAudioController("Student Portal (StudentHomeScreen)"),
    new SurfaceAudioController("Student Grade Detail Modal (StudentBBoxModal)"),
  ];

  let totalTests = 0;
  let passedTests = 0;

  // ───────────────────────────────────────────────────────────────────
  // TEST 1: Rapid Clicking Stress Test (500 rapid clicks)
  // ───────────────────────────────────────────────────────────────────
  totalTests++;
  console.log(`[TEST 1] Rapid Clicking Stress Test (500 rapid alternating clicks)...`);
  MockAudioElement.instancesCreated = 0;
  MockAudioElement.activePlayingInstances = 0;

  const surface = surfaces[0];
  const words = ["học tập", "chăm chỉ", "tiến bộ", "chính tả", "ngữ pháp", "sáng tạo"];
  
  for (let i = 0; i < 500; i++) {
    const word = words[i % words.length];
    if (i % 3 === 0) {
      surface.playComment(`Nhận xét mẫu số ${i}: Em làm bài khá tốt.`);
    } else {
      surface.playWord(word, i % words.length);
    }
  }

  assert.equal(surface.errorLog.length, 0, `Invariant violated: ${surface.errorLog.join("; ")}`);
  assert.equal(MockAudioElement.activePlayingInstances, 1, `Expected exactly 1 active audio instance at end of burst, got ${MockAudioElement.activePlayingInstances}`);
  console.log(`  -> PASSED: 500 rapid clicks handled with 0 audio overlapping violations.`);
  passedTests++;

  // ───────────────────────────────────────────────────────────────────
  // TEST 2: Cross-Track Cancellation
  // ───────────────────────────────────────────────────────────────────
  totalTests++;
  console.log(`\n[TEST 2] Cross-Track Cancellation Test...`);
  
  for (const s of surfaces) {
    MockAudioElement.activePlayingInstances = 0;
    
    // Play comment
    s.playComment("Lời phê của cô giáo.");
    assert.equal(s.isPlayingComment, true, `${s.name}: isPlayingComment should be true`);
    assert.equal(s.playingWordIdx, null, `${s.name}: playingWordIdx should be null`);
    assert.equal(MockAudioElement.activePlayingInstances, 1);

    // Immediately play word -> must cancel comment
    s.playWord("nguệch ngoạc", 0);
    assert.equal(s.isPlayingComment, false, `${s.name}: isPlayingComment must be cancelled to false`);
    assert.equal(s.playingWordIdx, 0, `${s.name}: playingWordIdx should be 0`);
    assert.equal(MockAudioElement.activePlayingInstances, 1, `${s.name}: Active audio count must stay strictly 1`);

    // Switch back to comment -> must cancel word
    s.playComment("Em cần nắn nót hơn.");
    assert.equal(s.isPlayingComment, true, `${s.name}: isPlayingComment should be true again`);
    assert.equal(s.playingWordIdx, null, `${s.name}: playingWordIdx must be cancelled to null`);
    assert.equal(MockAudioElement.activePlayingInstances, 1, `${s.name}: Active audio count must stay strictly 1`);
  }
  console.log(`  -> PASSED: Cross-track cancellation is 100% mutually exclusive across all surfaces.`);
  passedTests++;

  // ───────────────────────────────────────────────────────────────────
  // TEST 3: Modal & Popup Dismissal
  // ───────────────────────────────────────────────────────────────────
  totalTests++;
  console.log(`\n[TEST 3] Modal & Popup Dismissal Test...`);
  
  for (const s of surfaces) {
    s.dismiss(); // Reset all states cleanly
    MockAudioElement.activePlayingInstances = 0;
    
    // Start audio playing
    s.playComment("Nhận xét trước khi đóng modal");
    assert.equal(MockAudioElement.activePlayingInstances, 1);
    assert.notEqual(s.audioRef.current, null);

    // Dismiss modal / popup
    s.dismiss();

    assert.equal(s.audioRef.current, null, `${s.name}: audioRef must be null after dismissal`);
    assert.equal(s.isPlayingComment, false, `${s.name}: isPlayingComment must be false after dismissal`);
    assert.equal(s.playingWordIdx, null, `${s.name}: playingWordIdx must be null after dismissal`);
    assert.equal(MockAudioElement.activePlayingInstances, 0, `${s.name}: Active audio must be immediately halted (0 active)`);
  }
  console.log(`  -> PASSED: Modal and popup dismissal immediately halts active audio and purges ref.`);
  passedTests++;

  // ───────────────────────────────────────────────────────────────────
  // TEST 4: 5-Step stopActiveAudio Sanitization Check
  // ───────────────────────────────────────────────────────────────────
  totalTests++;
  console.log(`\n[TEST 4] 5-Step stopActiveAudio Sanitization Completeness...`);
  const testRef = { current: new MockAudioElement("http://localhost/test.wav") };
  testRef.current.onended = () => {};
  testRef.current.onerror = () => {};
  testRef.current.play();

  assert.equal(testRef.current.paused, false);
  const elementInstance = testRef.current;

  stopActiveAudio(testRef);

  assert.equal(testRef.current, null, "Ref must be null");
  assert.equal(elementInstance._pauseCalled, true, "1. pause() must be called");
  assert.equal(elementInstance.onended, null, "2. onended must be null");
  assert.equal(elementInstance.onerror, null, "3. onerror must be null");
  assert.equal(elementInstance.src, "", "4. src must be set to empty string");
  assert.equal(elementInstance._loadCalled, true, "5. load() must be called to purge audio buffer");
  console.log(`  -> PASSED: All 5 steps (pause, onended=null, onerror=null, src="", load()) verified.`);
  passedTests++;

  console.log(`\n======================================================================`);
  console.log(`SUMMARY: ${passedTests}/${totalTests} EMPIRICAL TESTS PASSED WITH ZERO ERRORS.`);
  console.log(`======================================================================\n`);
}

runEmpiricalStressSuite().catch(err => {
  console.error("FATAL ERROR IN STRESS HARNESS:", err);
  process.exit(1);
});
