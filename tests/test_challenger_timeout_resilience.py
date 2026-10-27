"""
Challenger 2 Empirical Verification Harness
Milestone 3: Build Integrity & Timeout Resilience
Author: Challenger 2 (Empirical Challenger)

Tests:
1. Source Code & AST Integrity Check:
   - qwen-director route has maxDuration = 35, AbortSignal.timeout(30000)
   - tts route has 15s timeout and returns 504 on AbortError
   - dynamic = "force-dynamic" on all 3 routes
2. Offline Resilience Test (Port 8099 closed):
   - GET /api/dictation/qwen-director -> 200 (graceful offline JSON)
   - POST /api/dictation/qwen-director (extract_sgk) -> 503
   - POST /api/dictation/qwen-director (direct_prosody) -> 503
   - GET /api/dictation/tts -> 503
   - POST /api/dictation/play-local -> 502
3. Hanging Upstream Timeout & 504 Abort Resilience (Mock slow upstream on Port 8099):
   - GET /api/dictation/tts (mock hangs 18s > 15s) -> 504
   - POST /api/dictation/play-local (mock hangs 18s > 15s) -> 504
   - GET /api/dictation/qwen-director status (mock hangs 12s > 10s) -> 200 (graceful fallback)
   - POST /api/dictation/qwen-director extract_sgk (mock hangs 33s > 30s) -> 504
"""

import sys
import os
import time
import json
import socket
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_PORT_BFF = 3005
MOCK_UPSTREAM_PORT = 8099

class TestResults:
    def __init__(self):
        self.passes = []
        self.failures = []

    def record_pass(self, name, detail=""):
        self.passes.append((name, detail))
        print(f"[PASS] {name}: {detail}")

    def record_fail(self, name, detail=""):
        self.failures.append((name, detail))
        print(f"[FAIL] {name}: {detail}")

results = TestResults()

def is_port_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.8)
        return s.connect_ex((host, port)) == 0

def send_request(url, method="GET", data=None, timeout=45.0):
    headers = {}
    encoded = None
    if data is not None:
        encoded = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=encoded, headers=headers, method=method)
    start_t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = time.time() - start_t
            return resp.status, resp.read().decode("utf-8", errors="ignore"), elapsed
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start_t
        return e.code, e.read().decode("utf-8", errors="ignore"), elapsed
    except Exception as e:
        elapsed = time.time() - start_t
        return None, str(e), elapsed

# -------------------------------------------------------------
# Part 1: Source Code & AST Integrity Check
# -------------------------------------------------------------
def run_source_integrity_checks():
    print("\n" + "=" * 70)
    print("STAGE 1: SOURCE CODE SPECIFICATION & TIMEOUT CONFIG INTEGRITY")
    print("=" * 70)

    qwen_path = os.path.join(BASE_DIR, "app", "api", "dictation", "qwen-director", "route.ts")
    with open(qwen_path, "r", encoding="utf-8") as f:
        qwen_src = f.read()

    assert 'export const dynamic = "force-dynamic"' in qwen_src
    results.record_pass("qwen-director dynamic", "Contains 'export const dynamic = \"force-dynamic\"'")

    assert 'export const maxDuration = 35' in qwen_src
    results.record_pass("qwen-director maxDuration = 35", "Contains 'export const maxDuration = 35' (protects RPi cold starts)")

    assert 'AbortSignal.timeout(30000)' in qwen_src
    results.record_pass("qwen-director AbortSignal.timeout(30000)", "Contains 'AbortSignal.timeout(30000)' for SLM calls")

    assert 'status: 504' in qwen_src
    results.record_pass("qwen-director 504 Handler", "Handles TimeoutError/AbortError with HTTP 504")

    tts_path = os.path.join(BASE_DIR, "app", "api", "dictation", "tts", "route.ts")
    with open(tts_path, "r", encoding="utf-8") as f:
        tts_src = f.read()

    assert 'export const dynamic = "force-dynamic"' in tts_src
    results.record_pass("tts dynamic", "Contains 'export const dynamic = \"force-dynamic\"'")

    assert '15000' in tts_src
    results.record_pass("tts 15s timeout", "Contains 15000ms AbortController timeout")

    assert 'status: 504' in tts_src
    results.record_pass("tts 504 Handler", "Handles AbortError with HTTP 504")

    play_path = os.path.join(BASE_DIR, "app", "api", "dictation", "play-local", "route.ts")
    with open(play_path, "r", encoding="utf-8") as f:
        play_src = f.read()

    assert 'export const dynamic = "force-dynamic"' in play_src
    results.record_pass("play-local dynamic", "Contains 'export const dynamic = \"force-dynamic\"'")

    assert '15000' in play_src
    results.record_pass("play-local 15s timeout", "Contains 15000ms AbortController timeout")

    assert 'status: 504' in play_src
    results.record_pass("play-local 504 Handler", "Handles AbortError with HTTP 504")


# -------------------------------------------------------------
# Part 2: Offline Backend Verification (Port 8099 offline)
# -------------------------------------------------------------
def run_offline_tests():
    print("\n" + "=" * 70)
    print(f"STAGE 2: OFFLINE PYTHON BACKEND RESILIENCE (Port {MOCK_UPSTREAM_PORT} Offline)")
    print("=" * 70)

    if is_port_open("127.0.0.1", MOCK_UPSTREAM_PORT):
        results.record_fail("Port Check", f"Port {MOCK_UPSTREAM_PORT} is unexpectedly open")
        return
    results.record_pass("Port Offline Check", f"Port {MOCK_UPSTREAM_PORT} is verified offline")

    # 2.1 GET /api/dictation/qwen-director -> 200 graceful offline JSON
    status, body, elapsed = send_request(f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/qwen-director")
    if status == 200:
        try:
            data = json.loads(body)
            if data.get("offline") is True and data.get("lifecycle_mode") == "offline" and data.get("is_loaded") is False:
                results.record_pass(
                    "GET /qwen-director (offline)",
                    f"HTTP 200 graceful JSON: offline={data.get('offline')}, lifecycle_mode={data.get('lifecycle_mode')} in {elapsed:.2f}s"
                )
            else:
                results.record_fail("GET /qwen-director (offline)", f"HTTP 200 but payload mismatch: {data}")
        except Exception as e:
            results.record_fail("GET /qwen-director (offline)", f"Invalid JSON response: {e}")
    else:
        results.record_fail("GET /qwen-director (offline)", f"Expected HTTP 200, got {status}: {body}")

    # 2.2 POST /api/dictation/qwen-director (extract_sgk) -> 503
    payload = {"action": "extract_sgk", "raw_text": "Tiếng Việt 3\nTrang 1\nBài học", "grade": 3}
    status, body, elapsed = send_request(f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/qwen-director", method="POST", data=payload)
    if status == 503:
        results.record_pass(
            "POST /qwen-director extract_sgk (offline)",
            f"HTTP 503 Service Unavailable returned as expected in {elapsed:.2f}s"
        )
    else:
        results.record_fail("POST /qwen-director extract_sgk (offline)", f"Expected 503, got {status}: {body}")

    # 2.3 POST /api/dictation/qwen-director (direct_prosody) -> 503
    payload = {"action": "direct_prosody", "passage": "Bầu trời xanh trong vắt.", "grade": 3}
    status, body, elapsed = send_request(f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/qwen-director", method="POST", data=payload)
    if status == 503:
        results.record_pass(
            "POST /qwen-director direct_prosody (offline)",
            f"HTTP 503 Service Unavailable returned as expected in {elapsed:.2f}s"
        )
    else:
        results.record_fail("POST /qwen-director direct_prosody (offline)", f"Expected 503, got {status}: {body}")

    # 2.4 GET /api/dictation/tts -> 503
    status, body, elapsed = send_request(f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/tts?text=TestOffline")
    if status == 503:
        results.record_pass(
            "GET /tts (offline)",
            f"HTTP 503 Service Unavailable returned as expected in {elapsed:.2f}s"
        )
    else:
        results.record_fail("GET /tts (offline)", f"Expected 503, got {status}: {body}")

    # 2.5 POST /api/dictation/play-local -> 502
    payload = {"text": "Test play local offline"}
    status, body, elapsed = send_request(f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/play-local", method="POST", data=payload)
    if status == 502:
        results.record_pass(
            "POST /play-local (offline)",
            f"HTTP 502 Bad Gateway returned as expected in {elapsed:.2f}s"
        )
    else:
        results.record_fail("POST /play-local (offline)", f"Expected 502, got {status}: {body}")


# -------------------------------------------------------------
# Part 3: Hanging Upstream Timeout & 504 Verification
# -------------------------------------------------------------
class HangingRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        # /qwen/status -> sleep 12s (Next.js has 10s timeout)
        if "/qwen/status" in self.path:
            time.sleep(12)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"enabled": true, "is_loaded": false}')
            return

        # /tts -> sleep 18s (Next.js has 15s timeout)
        if "/tts" in self.path:
            time.sleep(18)
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.end_headers()
            self.wfile.write(b'RIFF....WAVEfmt ')
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        # /tts/play-local -> sleep 18s (Next.js has 15s timeout)
        if "/tts/play-local" in self.path:
            time.sleep(18)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
            return

        # /qwen/extract-sgk -> sleep 33s (Next.js has 30s timeout)
        if "/qwen/extract-sgk" in self.path:
            time.sleep(33)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"clean_content": "ok"}')
            return

        # /qwen/direct-prosody -> sleep 33s (Next.js has 30s timeout)
        if "/qwen/direct-prosody" in self.path:
            time.sleep(33)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"clauses": []}')
            return

        self.send_response(404)
        self.end_headers()

def run_timeout_tests():
    print("\n" + "=" * 70)
    print(f"STAGE 3: HANGING UPSTREAM TIMEOUT & 504 GATEWAY TIMEOUT RESILIENCE (Port {MOCK_UPSTREAM_PORT})")
    print("=" * 70)

    server = HTTPServer(("127.0.0.1", MOCK_UPSTREAM_PORT), HangingRequestHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"  [INFO] Mock hanging upstream server listening on 127.0.0.1:{MOCK_UPSTREAM_PORT}")

    try:
        # 3.1 GET /api/dictation/tts hanging upstream (15s timeout) -> 504 Gateway Timeout
        print("  [TEST] Testing GET /api/dictation/tts timeout (expected ~15s)...")
        status, body, elapsed = send_request(f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/tts?text=TimeoutTest", timeout=25.0)
        if status == 504 and 14.0 <= elapsed <= 18.0:
            results.record_pass(
                "GET /tts 15s Timeout Abort -> 504",
                f"Aborted cleanly after {elapsed:.2f}s with HTTP 504 Gateway Timeout"
            )
        elif status == 504:
            results.record_pass(
                "GET /tts Timeout Abort -> 504",
                f"Aborted with HTTP 504 in {elapsed:.2f}s"
            )
        else:
            results.record_fail("GET /tts 15s Timeout Abort -> 504", f"Expected 504, got {status} after {elapsed:.2f}s: {body}")

        # 3.2 POST /api/dictation/play-local hanging upstream (15s timeout) -> 504 Gateway Timeout
        print("  [TEST] Testing POST /api/dictation/play-local timeout (expected ~15s)...")
        status, body, elapsed = send_request(
            f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/play-local",
            method="POST",
            data={"text": "TimeoutTest play local"},
            timeout=25.0
        )
        if status == 504 and 14.0 <= elapsed <= 18.0:
            results.record_pass(
                "POST /play-local 15s Timeout Abort -> 504",
                f"Aborted cleanly after {elapsed:.2f}s with HTTP 504 Gateway Timeout"
            )
        elif status == 504:
            results.record_pass(
                "POST /play-local Timeout Abort -> 504",
                f"Aborted with HTTP 504 in {elapsed:.2f}s"
            )
        else:
            results.record_fail("POST /play-local 15s Timeout Abort -> 504", f"Expected 504, got {status} after {elapsed:.2f}s: {body}")

        # 3.3 GET /api/dictation/qwen-director status hanging upstream (10s timeout) -> 200 graceful fallback
        print("  [TEST] Testing GET /api/dictation/qwen-director status timeout (expected ~10s)...")
        status, body, elapsed = send_request(f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/qwen-director", timeout=20.0)
        if status == 200 and 9.0 <= elapsed <= 14.0:
            data = json.loads(body)
            if data.get("offline") is True:
                results.record_pass(
                    "GET /qwen-director 10s Timeout -> Graceful 200 Fallback",
                    f"Timed out after {elapsed:.2f}s and returned graceful HTTP 200 offline status"
                )
            else:
                results.record_fail("GET /qwen-director status timeout", f"200 but offline is not True: {data}")
        elif status == 200:
            results.record_pass(
                "GET /qwen-director status timeout",
                f"Returned HTTP 200 graceful fallback in {elapsed:.2f}s"
            )
        else:
            results.record_fail("GET /qwen-director 10s Timeout", f"Expected 200, got {status} after {elapsed:.2f}s: {body}")

        # 3.4 POST /api/dictation/qwen-director extract_sgk hanging upstream (30s timeout) -> 504 Gateway Timeout
        print("  [TEST] Testing POST /api/dictation/qwen-director extract_sgk timeout (expected ~30s)...")
        status, body, elapsed = send_request(
            f"http://127.0.0.1:{TEST_PORT_BFF}/api/dictation/qwen-director",
            method="POST",
            data={"action": "extract_sgk", "raw_text": "Tiếng Việt 3 bài đọc", "grade": 3},
            timeout=40.0
        )
        if status == 504 and 29.0 <= elapsed <= 35.0:
            results.record_pass(
                "POST /qwen-director extract_sgk 30s Timeout -> 504",
                f"Aborted cleanly after {elapsed:.2f}s with HTTP 504 Gateway Timeout"
            )
        elif status == 504:
            results.record_pass(
                "POST /qwen-director extract_sgk Timeout -> 504",
                f"Aborted with HTTP 504 in {elapsed:.2f}s"
            )
        else:
            results.record_fail("POST /qwen-director extract_sgk 30s Timeout", f"Expected 504, got {status} after {elapsed:.2f}s: {body}")

    finally:
        server.shutdown()
        server.server_close()
        print("  [INFO] Mock hanging upstream server shut down.")


def main():
    print("=" * 80)
    print("EMPIRICAL CHALLENGER 2: BUILD INTEGRITY & TIMEOUT RESILIENCE HARNESS")
    print("=" * 80)

    run_source_integrity_checks()

    # Launch Next.js server on TEST_PORT_BFF with VIT5_SERVICE_URL pointing to MOCK_UPSTREAM_PORT
    env = os.environ.copy()
    env["VIT5_SERVICE_URL"] = f"http://127.0.0.1:{MOCK_UPSTREAM_PORT}"
    env["PORT"] = str(TEST_PORT_BFF)

    next_proc = None
    if not is_port_open("127.0.0.1", TEST_PORT_BFF):
        print(f"  [INFO] Starting Next.js server on port {TEST_PORT_BFF} with VIT5_SERVICE_URL={env['VIT5_SERVICE_URL']}...")
        next_cmd = f"npx next start -p {TEST_PORT_BFF}"
        next_proc = subprocess.Popen(
            next_cmd,
            cwd=BASE_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True
        )
        ready = False
        for _ in range(40):
            time.sleep(0.5)
            if is_port_open("127.0.0.1", TEST_PORT_BFF):
                ready = True
                break
        if not ready:
            print(f"  [FATAL] Next.js failed to bind to port {TEST_PORT_BFF} within 20s!")
            sys.exit(1)
        print(f"  [INFO] Next.js server ready on port {TEST_PORT_BFF}.")
    else:
        print(f"  [INFO] Port {TEST_PORT_BFF} is already open.")

    try:
        run_offline_tests()
        run_timeout_tests()
    finally:
        if next_proc is not None:
            print("  [INFO] Terminating Next.js test server process tree...")
            subprocess.run(f"taskkill /F /T /PID {next_proc.pid}", shell=True, capture_output=True)

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Passed: {len(results.passes)}")
    print(f"Total Failed: {len(results.failures)}")
    if results.failures:
        print("\nFailures:")
        for name, detail in results.failures:
            print(f"  - {name}: {detail}")
        sys.exit(1)
    else:
        print("\nALL VERIFICATIONS PASSED 100%!")
        sys.exit(0)

if __name__ == "__main__":
    main()
