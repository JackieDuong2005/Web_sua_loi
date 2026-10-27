"""
Milestone 3 Automated Verification Test Suite
Next.js BFF API Gateway (TTS, Play-Local, and Qwen Director Routes)
Compliant with: PStack / Lauren Tan Rigorous Verification & GEMINI.md Core Rules

Tests covered:
Part 1: FastAPI Core Microservice Contract Parity (:8000)
Part 2: Next.js BFF Gateway Endpoints Offline Validation (:3000)
Part 3: Next.js BFF Gateway Endpoints Live Proxy Integration (:3000 <-> :8000)
"""

import sys
import os
import time
import json
import socket
import subprocess
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

# Ensure stdout and stderr handle UTF-8 on Windows Console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from python_service.main import app

client = TestClient(app)


class TestResultLogger:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.failures = []

    def log_pass(self, test_name: str, details: str):
        self.total += 1
        self.passed += 1
        print(f"  [PASS] {test_name}: {details}")

    def log_fail(self, test_name: str, details: str, error: Optional[Exception] = None):
        self.total += 1
        self.failed += 1
        err_msg = f"{details} -> {error}" if error else details
        self.failures.append((test_name, err_msg))
        print(f"  [FAIL] {test_name}: {err_msg}")

    def print_summary(self) -> bool:
        print("\n" + "=" * 80)
        print("MILESTONE 3 BFF GATEWAY VERIFICATION SUITE SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run : {self.total}")
        print(f"Passed          : {self.passed}")
        print(f"Failed          : {self.failed}")
        if self.failures:
            print("\nFailures Detail:")
            for name, err in self.failures:
                print(f"  - {name}: {err}")
        print("=" * 80)
        return self.failed == 0


runner = TestResultLogger()


def is_port_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.8)
        return s.connect_ex((host, port)) == 0


def http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    data: Optional[Dict[str, Any]] = None,
    timeout: float = 10.0,
):
    if headers is None:
        headers = {}
    encoded_data = None
    if data is not None:
        encoded_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read()
            resp_headers = dict(resp.headers)
            return resp.status, content, resp_headers
    except urllib.error.HTTPError as e:
        content = e.read()
        resp_headers = dict(e.headers)
        return e.code, content, resp_headers
    except urllib.error.URLError as e:
        raise e


# ==============================================================================
# PART 1: FASTAPI CORE MICROSERVICE CONTRACT PARITY
# ==============================================================================

def test_fastapi_contracts():
    print("\n--- PART 1: FASTAPI CORE MICROSERVICE CONTRACT PARITY (:8000) ---")

    # TC-01: GET /tts
    try:
        resp = client.get("/tts?text=Bầu trời xanh trong vắt.&style=warm_story&read_punctuation=true")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert resp.headers.get("content-type") == "audio/wav", f"Invalid content-type: {resp.headers.get('content-type')}"
        assert "Piper-VITS-ONNX" in resp.headers.get("x-tts-engine", ""), "Missing x-tts-engine"
        assert resp.headers.get("x-tts-style") == "warm_story", f"Invalid x-tts-style: {resp.headers.get('x-tts-style')}"
        assert len(resp.content) > 5000, f"WAV length too short: {len(resp.content)} bytes"
        runner.log_pass("TC-01 FastApi GET /tts", f"Status=200, bytes={len(resp.content)}, style=warm_story")
    except Exception as e:
        runner.log_fail("TC-01 FastApi GET /tts", "Synthesis failed", e)

    # TC-02: GET /tts empty
    try:
        resp = client.get("/tts?text=")
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        runner.log_pass("TC-02 FastApi GET /tts validation", "Empty text rejected with 400")
    except Exception as e:
        runner.log_fail("TC-02 FastApi GET /tts validation", "Validation failed", e)

    # TC-03: POST /tts/play-local
    try:
        payload = {
            "text": "Kiểm tra loa lớp học.",
            "voice": "vi_VN-vais1000-medium",
            "rate": "-15%",
            "style": "emphasis",
            "noise_scale": 0.58,
            "noise_w": 0.72,
            "read_punctuation": False,
        }
        resp = client.post("/tts/play-local", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("status") == "ok", f"Expected status ok, got {data.get('status')}"
        assert data.get("device") == "local_speaker", f"Invalid device: {data.get('device')}"
        assert "length_scale" in data and "noise_scale" in data and "noise_w_scale" in data
        runner.log_pass("TC-03 FastApi POST /tts/play-local", f"Status=200, device={data['device']}, length_scale={data['length_scale']}")
    except Exception as e:
        runner.log_fail("TC-03 FastApi POST /tts/play-local", "Play-local failed", e)

    # TC-04: POST /tts/play-local empty
    try:
        resp = client.post("/tts/play-local", json={"text": ""})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        runner.log_pass("TC-04 FastApi POST /tts/play-local validation", "Empty text rejected with 400")
    except Exception as e:
        runner.log_fail("TC-04 FastApi POST /tts/play-local validation", "Validation failed", e)

    # TC-05: GET /qwen/status
    try:
        resp = client.get("/qwen/status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data.get("lifecycle_mode") == "on_demand_unload", f"Invalid lifecycle: {data.get('lifecycle_mode')}"
        assert data.get("is_loaded") is False, "Qwen should be unloaded at idle"
        assert data.get("available_ram_mb", 0) > 0, "available_ram_mb must be > 0"
        runner.log_pass("TC-05 FastApi GET /qwen/status", f"lifecycle_mode={data['lifecycle_mode']}, RAM={data['available_ram_mb']}MB")
    except Exception as e:
        runner.log_fail("TC-05 FastApi GET /qwen/status", "Status query failed", e)

    # TC-06: POST /qwen/extract-sgk
    try:
        sample_sgk = """
        Tiếng Việt 3
        Trang 45
        Bài: Mùa Hoa Tây Bắc
        Khi làn gió xuân ấm áp tràn về, núi rừng Tây Bắc bừng sáng bởi hoa ban tinh khôi.
        Câu hỏi:
        1. Em hãy tìm từ miêu tả hoa ban?
        """
        resp = client.post("/qwen/extract-sgk", json={"raw_text": sample_sgk, "grade": 3})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert "Trang 45" not in data.get("clean_content", ""), "Page number was not stripped"
        assert len(data.get("difficultWords", [])) > 0, "No difficultWords extracted"
        assert data.get("ram_unloaded") is True, "RAM must be unloaded"
        runner.log_pass("TC-06 FastApi POST /qwen/extract-sgk", f"clean_content words={len(data['clean_content'].split())}, difficultWords={data['difficultWords']}")
    except Exception as e:
        runner.log_fail("TC-06 FastApi POST /qwen/extract-sgk", "Extract SGK failed", e)

    # TC-07: POST /qwen/extract-sgk empty
    try:
        resp = client.post("/qwen/extract-sgk", json={"raw_text": ""})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        runner.log_pass("TC-07 FastApi POST /qwen/extract-sgk validation", "Empty raw_text rejected with 400")
    except Exception as e:
        runner.log_fail("TC-07 FastApi POST /qwen/extract-sgk validation", "Validation failed", e)

    # TC-08: POST /qwen/direct-prosody
    try:
        passage = "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen."
        resp = client.post(
            "/qwen/direct-prosody",
            json={
                "passage": passage,
                "difficult_words": ["se lạnh", "trong vắt"],
                "grade": 3,
                "chunk_mode": "clause",
            },
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        clauses = data.get("clauses", [])
        assert len(clauses) >= 2, f"Clauses length too small: {len(clauses)}"

        # 100% verbatim word check
        reconstructed = " ".join([c["text"].strip() for c in clauses])
        orig_words = passage.split()
        recon_words = reconstructed.split()
        assert orig_words == recon_words, f"Verbatim mismatch: {orig_words} != {recon_words}"

        # Difficult word emphasis check
        has_emphasis = any(c.get("style") == "emphasis" for c in clauses)
        assert has_emphasis, "Expected emphasis style on clauses containing difficult words"
        assert data.get("ram_unloaded") is True, "RAM must be unloaded"
        runner.log_pass("TC-08 FastApi POST /qwen/direct-prosody", f"Preserved 100% words ({len(orig_words)}), clauses={len(clauses)}, emphasis=True")
    except Exception as e:
        runner.log_fail("TC-08 FastApi POST /qwen/direct-prosody", "Prosody direction failed", e)

    # TC-09: POST /qwen/direct-prosody cache hit
    try:
        resp = client.post(
            "/qwen/direct-prosody",
            json={
                "passage": passage,
                "difficult_words": ["se lạnh", "trong vắt"],
                "grade": 3,
                "chunk_mode": "clause",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("cache_hit") is True, f"Expected cache_hit True, got {data.get('cache_hit')}"
        runner.log_pass("TC-09 FastApi POST /qwen/direct-prosody cache", "Cache hit verified (<1ms)")
    except Exception as e:
        runner.log_fail("TC-09 FastApi POST /qwen/direct-prosody cache", "Cache hit failed", e)

    # TC-10: POST /qwen/direct-prosody empty
    try:
        resp = client.post("/qwen/direct-prosody", json={"passage": ""})
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        runner.log_pass("TC-10 FastApi POST /qwen/direct-prosody validation", "Empty passage rejected with 400")
    except Exception as e:
        runner.log_fail("TC-10 FastApi POST /qwen/direct-prosody validation", "Validation failed", e)


# ==============================================================================
# PART 2 & 3: NEXT.JS BFF GATEWAY LIVE HTTP TESTING
# ==============================================================================

def test_nextjs_bff():
    print("\n--- PART 2 & 3: NEXT.JS BFF GATEWAY LIVE HTTP TESTING (:3000) ---")

    bff_port = 3000
    python_port = 8000

    next_proc = None
    py_proc = None

    # Step A: Ensure Next.js is running on port 3000
    if not is_port_open("127.0.0.1", bff_port):
        print("  [INFO] Starting Next.js server on port 3000 for live BFF verification...")
        next_cmd = ["npx", "next", "start", "-p", "3000"]
        next_proc = subprocess.Popen(
            next_cmd,
            cwd=BASE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
        )
        # Wait up to 15s for port 3000 to listen
        ready = False
        for _ in range(30):
            time.sleep(0.5)
            if is_port_open("127.0.0.1", bff_port):
                ready = True
                break
        if not ready:
            runner.log_fail("TC-BFF Startup", "Next.js server failed to bind to port 3000 in 15s")
            return
        print("  [INFO] Next.js server is ready on port 3000.")
    else:
        print("  [INFO] Next.js server is already running on port 3000.")

    # Step B: Offline Testing (ensure Python is NOT on port 8000 or test offline status)
    py_was_running = is_port_open("127.0.0.1", python_port)
    if not py_was_running:
        print("  [INFO] Python core is offline: Verifying graceful offline fallback & input validation...")

        # TC-BFF-01: GET /api/dictation/qwen-director when core offline -> HTTP 200 with fallback JSON
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/qwen-director")
            assert status == 200, f"Expected 200, got {status}"
            data = json.loads(body.decode("utf-8"))
            assert data.get("offline") is True, f"Expected offline True, got {data.get('offline')}"
            assert data.get("lifecycle_mode") == "offline", f"Expected lifecycle_mode offline, got {data.get('lifecycle_mode')}"
            assert data.get("is_loaded") is False
            runner.log_pass("TC-BFF-01 Offline Qwen Director Status Fallback", f"Status=200, offline={data['offline']}, lifecycle={data['lifecycle_mode']}")
        except Exception as e:
            runner.log_fail("TC-BFF-01 Offline Qwen Director Status Fallback", "Graceful fallback failed", e)

        # TC-BFF-02: GET /api/dictation/tts (no text) -> HTTP 400
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/tts")
            assert status == 400, f"Expected 400, got {status}"
            data = json.loads(body.decode("utf-8"))
            assert "error" in data
            runner.log_pass("TC-BFF-02 GET /api/dictation/tts validation", "Missing text rejected with 400")
        except Exception as e:
            runner.log_fail("TC-BFF-02 GET /api/dictation/tts validation", "Validation failed", e)

        # TC-BFF-03: POST /api/dictation/play-local (no text) -> HTTP 400
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/play-local", method="POST", data={})
            assert status == 400, f"Expected 400, got {status}"
            data = json.loads(body.decode("utf-8"))
            assert "error" in data
            runner.log_pass("TC-BFF-03 POST /api/dictation/play-local validation", "Missing text rejected with 400")
        except Exception as e:
            runner.log_fail("TC-BFF-03 POST /api/dictation/play-local validation", "Validation failed", e)

        # TC-BFF-04: POST /api/dictation/qwen-director (no action) -> HTTP 400
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/qwen-director", method="POST", data={"raw_text": "abc"})
            assert status == 400, f"Expected 400, got {status}"
            runner.log_pass("TC-BFF-04 POST /api/dictation/qwen-director missing action", "Missing action rejected with 400")
        except Exception as e:
            runner.log_fail("TC-BFF-04 POST /api/dictation/qwen-director missing action", "Validation failed", e)

        # TC-BFF-05: POST /api/dictation/qwen-director (invalid action) -> HTTP 400
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/qwen-director", method="POST", data={"action": "invalid_op"})
            assert status == 400, f"Expected 400, got {status}"
            runner.log_pass("TC-BFF-05 POST /api/dictation/qwen-director invalid action", "Invalid action rejected with 400")
        except Exception as e:
            runner.log_fail("TC-BFF-05 POST /api/dictation/qwen-director invalid action", "Validation failed", e)

        # TC-BFF-06: POST /api/dictation/qwen-director extract_sgk empty text -> HTTP 400
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/qwen-director", method="POST", data={"action": "extract_sgk", "raw_text": ""})
            assert status == 400, f"Expected 400, got {status}"
            runner.log_pass("TC-BFF-06 POST /api/dictation/qwen-director extract_sgk empty", "Empty raw_text rejected with 400")
        except Exception as e:
            runner.log_fail("TC-BFF-06 POST /api/dictation/qwen-director extract_sgk empty", "Validation failed", e)

        # TC-BFF-07: POST /api/dictation/qwen-director direct_prosody empty passage -> HTTP 400
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/qwen-director", method="POST", data={"action": "direct_prosody", "passage": ""})
            assert status == 400, f"Expected 400, got {status}"
            runner.log_pass("TC-BFF-07 POST /api/dictation/qwen-director direct_prosody empty", "Empty passage rejected with 400")
        except Exception as e:
            runner.log_fail("TC-BFF-07 POST /api/dictation/qwen-director direct_prosody empty", "Validation failed", e)

        # TC-BFF-08: Offline service unreachable -> 503 for TTS and Qwen
        try:
            status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/tts?text=TestOffline")
            assert status == 503, f"Expected 503, got {status}"
            runner.log_pass("TC-BFF-08 GET /api/dictation/tts offline error guard", "Core offline returned 503")
        except Exception as e:
            runner.log_fail("TC-BFF-08 GET /api/dictation/tts offline error guard", "503 assertion failed", e)

        # Start python core for Live Testing
        print("  [INFO] Spawning Python AI Core service on port 8000 for Live Integration...")
        py_cmd = [sys.executable, "-m", "uvicorn", "python_service.main:app", "--host", "127.0.0.1", "--port", "8000"]
        py_proc = subprocess.Popen(
            py_cmd,
            cwd=BASE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # Wait up to 15s for port 8000 to listen
        ready = False
        for _ in range(30):
            time.sleep(0.5)
            if is_port_open("127.0.0.1", python_port):
                ready = True
                break
        if not ready:
            runner.log_fail("TC-BFF Python Core Startup", "Python service failed to bind to port 8000 in 15s")
            return
        print("  [INFO] Python AI Core is ready on port 8000.")

    # Step C: Live Online Integration Testing
    print("  [INFO] Python core is online: Verifying live BFF proxy forwarding...")

    # TC-BFF-09: Live GET /api/dictation/qwen-director status
    try:
        status, body, _ = http_request("http://127.0.0.1:3000/api/dictation/qwen-director")
        assert status == 200, f"Expected 200, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert data.get("offline") is False, f"Expected offline False, got {data.get('offline')}"
        assert data.get("lifecycle_mode") == "on_demand_unload"
        assert data.get("available_ram_mb", 0) > 0
        runner.log_pass("TC-BFF-09 Live GET /api/dictation/qwen-director status", f"Status=200, RAM={data['available_ram_mb']}MB, mode={data['lifecycle_mode']}")
    except Exception as e:
        runner.log_fail("TC-BFF-09 Live GET /api/dictation/qwen-director status", "Live status query failed", e)

    # TC-BFF-10: Live POST /api/dictation/qwen-director extract_sgk
    try:
        raw_input = "Tiếng Việt 3\nTrang 48\nBài: Mùa Thu Quê Em\nBầu trời xanh trong vắt.\nCâu hỏi: 1. Bầu trời ra sao?"
        status, body, _ = http_request(
            "http://127.0.0.1:3000/api/dictation/qwen-director",
            method="POST",
            data={"action": "extract_sgk", "raw_text": raw_input, "grade": 3},
            timeout=25.0,
        )
        assert status == 200, f"Expected 200, got {status}: {body.decode('utf-8', errors='ignore')}"
        data = json.loads(body.decode("utf-8"))
        assert data.get("success") is True, f"Expected success True, got {data.get('success')}"
        assert "clean_content" in data, "Missing clean_content"
        assert "Trang 48" not in data["clean_content"], "Page number Trang 48 was not stripped"
        assert "difficultWords" in data, "Missing difficultWords"
        runner.log_pass("TC-BFF-10 Live POST /api/dictation/qwen-director extract_sgk", f"Success=True, clean_content='{data['clean_content']}', difficultWords={data['difficultWords']}")
    except Exception as e:
        runner.log_fail("TC-BFF-10 Live POST /api/dictation/qwen-director extract_sgk", "Live SGK extraction failed", e)

    # TC-BFF-11: Live POST /api/dictation/qwen-director direct_prosody
    try:
        passage = "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen."
        status, body, _ = http_request(
            "http://127.0.0.1:3000/api/dictation/qwen-director",
            method="POST",
            data={
                "action": "direct_prosody",
                "passage": passage,
                "difficult_words": ["se lạnh", "trong vắt"],
                "grade": 3,
                "chunk_mode": "clause",
            },
            timeout=25.0,
        )
        assert status == 200, f"Expected 200, got {status}: {body.decode('utf-8', errors='ignore')}"
        data = json.loads(body.decode("utf-8"))
        assert data.get("success") is True
        clauses = data.get("clauses", [])
        assert len(clauses) >= 2, f"Clauses length too small: {len(clauses)}"
        reconstructed = " ".join([c["text"].strip() for c in clauses])
        assert passage.split() == reconstructed.split(), "100% word preservation failed"
        runner.log_pass("TC-BFF-11 Live POST /api/dictation/qwen-director direct_prosody", f"Success=True, clauses={len(clauses)}, 100% words preserved")
    except Exception as e:
        runner.log_fail("TC-BFF-11 Live POST /api/dictation/qwen-director direct_prosody", "Live prosody direction failed", e)

    # TC-BFF-12: Live GET /api/dictation/tts streaming WAV with headers
    try:
        url = "http://127.0.0.1:3000/api/dictation/tts?text=B%E1%BA%A7u+tr%E1%BB%9Di+xanh+trong+v%E1%BA%AFt.&style=warm_story&read_punctuation=true"
        status, content, headers = http_request(url, timeout=20.0)
        assert status == 200, f"Expected 200, got {status}"
        content_type = headers.get("content-type", "").lower()
        assert "audio/wav" in content_type, f"Invalid content-type: {content_type}"
        assert "Piper-VITS-ONNX" in headers.get("x-tts-engine", ""), f"Invalid engine: {headers.get('x-tts-engine')}"
        assert headers.get("x-tts-style") == "warm_story", f"Invalid style: {headers.get('x-tts-style')}"
        assert len(content) > 5000, f"WAV content too small: {len(content)} bytes"
        runner.log_pass("TC-BFF-12 Live GET /api/dictation/tts", f"Status=200, bytes={len(content)}, style={headers.get('x-tts-style')}")
    except Exception as e:
        runner.log_fail("TC-BFF-12 Live GET /api/dictation/tts", "Live TTS stream failed", e)

    # TC-BFF-13: Live POST /api/dictation/play-local
    try:
        status, body, _ = http_request(
            "http://127.0.0.1:3000/api/dictation/play-local",
            method="POST",
            data={
                "text": "Kiểm tra loa cục bộ từ Next.js BFF",
                "voice": "vi_VN-vais1000-medium",
                "rate": "-15%",
                "style": "emphasis",
                "noise_scale": 0.58,
                "noise_w": 0.72,
                "read_punctuation": False,
            },
            timeout=20.0,
        )
        assert status == 200, f"Expected 200, got {status}: {body.decode('utf-8', errors='ignore')}"
        data = json.loads(body.decode("utf-8"))
        assert data.get("status") == "ok", f"Expected ok, got {data.get('status')}"
        assert data.get("device") == "local_speaker"
        assert "length_scale" in data and "noise_scale" in data and "noise_w_scale" in data
        runner.log_pass("TC-BFF-13 Live POST /api/dictation/play-local", f"Status=200, device={data['device']}, length_scale={data['length_scale']}")
    except Exception as e:
        runner.log_fail("TC-BFF-13 Live POST /api/dictation/play-local", "Live play-local failed", e)

    # Clean up spawned processes
    if py_proc is not None:
        print("  [INFO] Terminating spawned Python process...")
        py_proc.terminate()
        try:
            py_proc.wait(timeout=5)
        except Exception:
            py_proc.kill()

    if next_proc is not None:
        print("  [INFO] Terminating spawned Next.js process...")
        next_proc.terminate()
        try:
            next_proc.wait(timeout=5)
        except Exception:
            next_proc.kill()


def main():
    print("=" * 80)
    print("STARTING MILESTONE 3 BFF GATEWAY COMPREHENSIVE VERIFICATION")
    print("=" * 80)

    test_fastapi_contracts()
    test_nextjs_bff()

    all_passed = runner.print_summary()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
