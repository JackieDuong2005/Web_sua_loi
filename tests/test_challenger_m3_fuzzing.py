"""
Milestone 3 Empirical Challenger Verification & Validation Fuzzing Suite
Focus: Adversarial Inputs, Boundary Conditions, Fuzzing Edge Cases on Next.js BFF Routes
- GET  /api/dictation/tts
- POST /api/dictation/play-local
- GET  /api/dictation/qwen-director
- POST /api/dictation/qwen-director

Compliant with: PStack / Lauren Tan Rigorous Verification & GEMINI.md Core Rules
"""

import sys
import os
import time
import json
import socket
import subprocess
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any, Optional, Tuple

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


class ChallengerLogger:
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
        print("EMPIRICAL CHALLENGER M3 FUZZING & STRESS VERIFICATION SUMMARY")
        print("=" * 80)
        print(f"Total Probes Executed : {self.total}")
        print(f"Passed Probes         : {self.passed}")
        print(f"Failed Probes         : {self.failed}")
        if self.failures:
            print("\nFailures Detail:")
            for name, err in self.failures:
                print(f"  - {name}: {err}")
        print("=" * 80)
        return self.failed == 0


fuzzer = ChallengerLogger()


def is_port_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.8)
        return s.connect_ex((host, port)) == 0


def raw_http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    raw_data: Optional[bytes] = None,
    timeout: float = 15.0,
) -> Tuple[int, bytes, Dict[str, str]]:
    req_headers = headers.copy() if headers else {}
    req = urllib.request.Request(url, data=raw_data, headers=req_headers, method=method)
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


def send_json(
    url: str,
    data: Any,
    method: str = "POST",
    headers: Optional[Dict[str, str]] = None,
    client_ip: str = "10.0.0.1",
    timeout: float = 15.0,
) -> Tuple[int, bytes, Dict[str, str]]:
    req_headers = headers.copy() if headers else {}
    req_headers["Content-Type"] = "application/json"
    req_headers["X-Forwarded-For"] = client_ip
    raw = json.dumps(data).encode("utf-8") if data is not None else None
    return raw_http_request(url, method=method, headers=req_headers, raw_data=raw, timeout=timeout)


def main():
    print("=" * 80)
    print("STARTING ADVERSARIAL VALIDATION FUZZING ON NEXT.JS BFF GATEWAY")
    print("=" * 80)

    bff_port = 3000
    python_port = 8000

    next_proc = None
    py_proc = None

    # Step 1: Ensure Next.js is running
    if not is_port_open("127.0.0.1", bff_port):
        print("  [INFO] Starting Next.js server on port 3000...")
        next_cmd = ["npx", "next", "start", "-p", "3000"]
        next_proc = subprocess.Popen(
            next_cmd,
            cwd=BASE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
        )
        ready = False
        for _ in range(30):
            time.sleep(0.5)
            if is_port_open("127.0.0.1", bff_port):
                ready = True
                break
        if not ready:
            fuzzer.log_fail("Server Bootstrap", "Next.js server failed to bind port 3000")
            sys.exit(1)
        print("  [INFO] Next.js is ready.")
    else:
        print("  [INFO] Next.js server is already active on port 3000.")

    # Step 2: Ensure Python service is running so we can test end-to-end resilience
    if not is_port_open("127.0.0.1", python_port):
        print("  [INFO] Starting Python AI Core service on port 8000...")
        py_cmd = [sys.executable, "-m", "uvicorn", "python_service.main:app", "--host", "127.0.0.1", "--port", "8000"]
        py_proc = subprocess.Popen(
            py_cmd,
            cwd=BASE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        ready = False
        for _ in range(30):
            time.sleep(0.5)
            if is_port_open("127.0.0.1", python_port):
                ready = True
                break
        if not ready:
            fuzzer.log_fail("Server Bootstrap", "Python service failed to bind port 8000")
            sys.exit(1)
        print("  [INFO] Python AI Core is ready.")
    else:
        print("  [INFO] Python AI Core is already active on port 8000.")

    base_url = "http://127.0.0.1:3000"

    # ==========================================================================
    # FUZZ SECTION 1: GET /api/dictation/tts
    # ==========================================================================
    print("\n--- FUZZ SECTION 1: GET /api/dictation/tts ---")

    # Probe 1.1: Missing text parameter entirely
    try:
        status, body, _ = raw_http_request(f"{base_url}/api/dictation/tts")
        assert status == 400, f"Expected 400, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-1.1 Missing text parameter", f"Returned HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-1.1 Missing text parameter", "Failed assertion", e)

    # Probe 1.2: Empty text text=""
    try:
        status, body, _ = raw_http_request(f"{base_url}/api/dictation/tts?text=")
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-1.2 Empty text text=''", f"Returned HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-1.2 Empty text text=''", "Failed assertion", e)

    # Probe 1.3: Whitespace only text="   "
    try:
        status, body, _ = raw_http_request(f"{base_url}/api/dictation/tts?text=%20%20%20%20")
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-1.3 Whitespace text='   '", f"Returned HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-1.3 Whitespace text='   '", "Failed assertion", e)

    # Probe 1.4: Newlines and tabs only text="\t\n\r"
    try:
        status, body, _ = raw_http_request(f"{base_url}/api/dictation/tts?text=%09%0A%0D%20")
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-1.4 Tabs/Newlines text='\\t\\n'", f"Returned HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-1.4 Tabs/Newlines text='\\t\\n'", "Failed assertion", e)

    # Probe 1.5: Malformed noise_scale="not_a_number"
    try:
        url = f"{base_url}/api/dictation/tts?text=Em+h%E1%BB%8Dc+b%C3%A0i&noise_scale=not_a_number"
        status, body, headers = raw_http_request(url)
        assert status == 200, f"Expected 200 (ignored invalid float), got {status}"
        assert "audio/wav" in headers.get("content-type", "").lower()
        fuzzer.log_pass("FZ-1.5 noise_scale='not_a_number'", f"Server survived with HTTP 200, audio bytes={len(body)}")
    except Exception as e:
        fuzzer.log_fail("FZ-1.5 noise_scale='not_a_number'", "Failed assertion", e)

    # Probe 1.6: Malformed noise_w="abc"
    try:
        url = f"{base_url}/api/dictation/tts?text=Em+h%E1%BB%8Dc+b%C3%A0i&noise_w=abc"
        status, body, headers = raw_http_request(url)
        assert status == 200, f"Expected 200 (ignored invalid float), got {status}"
        assert "audio/wav" in headers.get("content-type", "").lower()
        fuzzer.log_pass("FZ-1.6 noise_w='abc'", f"Server survived with HTTP 200, audio bytes={len(body)}")
    except Exception as e:
        fuzzer.log_fail("FZ-1.6 noise_w='abc'", "Failed assertion", e)

    # Probe 1.7: Extreme styles: style="custom_style"
    try:
        url = f"{base_url}/api/dictation/tts?text=H%C3%B4m+nay+tr%E1%BB%9Di+n%E1%BA%AFng&style=custom_style"
        status, body, headers = raw_http_request(url)
        assert status == 200, f"Expected 200, got {status}"
        assert "audio/wav" in headers.get("content-type", "").lower()
        fuzzer.log_pass("FZ-1.7 style='custom_style'", f"Handled gracefully with HTTP 200, bytes={len(body)}")
    except Exception as e:
        fuzzer.log_fail("FZ-1.7 style='custom_style'", "Failed assertion", e)

    # Probe 1.8: Malformed boolean: read_punctuation="invalid_bool"
    try:
        url = f"{base_url}/api/dictation/tts?text=B%E1%BA%A7u+tr%E1%BB%9Di+xanh%2C+c%C3%B4ng+vi%C3%AAn+r%E1%BB%99ng.&read_punctuation=invalid_bool"
        status, body, headers = raw_http_request(url)
        assert status == 200, f"Expected 200, got {status}"
        fuzzer.log_pass("FZ-1.8 read_punctuation='invalid_bool'", f"Treated as false, HTTP 200, bytes={len(body)}")
    except Exception as e:
        fuzzer.log_fail("FZ-1.8 read_punctuation='invalid_bool'", "Failed assertion", e)

    # Probe 1.9: Truthy boolean variants: read_punctuation="1", "yes", "true"
    try:
        for val in ["1", "yes", "true", "TRUE"]:
            url = f"{base_url}/api/dictation/tts?text=Ch%E1%BA%A5m%2C+ph%E1%BA%A9y.&read_punctuation={val}"
            status, body, headers = raw_http_request(url)
            assert status == 200, f"Expected 200 for val={val}, got {status}"
        fuzzer.log_pass("FZ-1.9 read_punctuation truthy variants", "All variants accepted with HTTP 200")
    except Exception as e:
        fuzzer.log_fail("FZ-1.9 read_punctuation truthy variants", "Failed assertion", e)

    # ==========================================================================
    # FUZZ SECTION 2: POST /api/dictation/play-local
    # ==========================================================================
    print("\n--- FUZZ SECTION 2: POST /api/dictation/play-local ---")

    # Probe 2.1: Non-JSON body (raw string)
    try:
        status, body, _ = raw_http_request(
            f"{base_url}/api/dictation/play-local",
            method="POST",
            headers={"Content-Type": "application/json", "X-Forwarded-For": "10.0.1.1"},
            raw_data=b"THIS IS NOT A VALID JSON BODY {{{",
        )
        assert status == 400, f"Expected 400 for malformed JSON, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-2.1 Non-JSON raw string body", f"Rejected with HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-2.1 Non-JSON raw string body", "Failed assertion", e)

    # Probe 2.2: Empty JSON object {}
    try:
        status, body, _ = send_json(f"{base_url}/api/dictation/play-local", {}, client_ip="10.0.1.2")
        assert status == 400, f"Expected 400 for empty object, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-2.2 Empty JSON object {}", f"Rejected with HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-2.2 Empty JSON object {}", "Failed assertion", e)

    # Probe 2.3: Missing text field
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/play-local",
            {"voice": "vi_VN-vais1000-medium", "style": "standard"},
            client_ip="10.0.1.3",
        )
        assert status == 400, f"Expected 400 for missing text, got {status}"
        fuzzer.log_pass("FZ-2.3 Missing text field", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-2.3 Missing text field", "Failed assertion", e)

    # Probe 2.4: Empty text field {"text": ""}
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/play-local",
            {"text": ""},
            client_ip="10.0.1.4",
        )
        assert status == 400, f"Expected 400 for empty text string, got {status}"
        fuzzer.log_pass("FZ-2.4 Empty text field", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-2.4 Empty text field", "Failed assertion", e)

    # Probe 2.5: Whitespace-only text {"text": "    \t\n"}
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/play-local",
            {"text": "   \t\n   "},
            client_ip="10.0.1.5",
        )
        assert status == 400, f"Expected 400 for whitespace text, got {status}"
        fuzzer.log_pass("FZ-2.5 Whitespace text field", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-2.5 Whitespace text field", "Failed assertion", e)

    # Probe 2.6: Non-string text field {"text": 12345}
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/play-local",
            {"text": 12345},
            client_ip="10.0.1.6",
        )
        assert status == 400, f"Expected 400 for non-string text, got {status}"
        fuzzer.log_pass("FZ-2.6 Non-string text field (number)", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-2.6 Non-string text field (number)", "Failed assertion", e)

    # Probe 2.7: Non-object JSON payload ([1, 2, 3] or "hello")
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/play-local",
            [1, 2, 3],
            client_ip="10.0.1.7",
        )
        assert status == 400, f"Expected 400 for array payload, got {status}"
        fuzzer.log_pass("FZ-2.7 Array JSON payload [1,2,3]", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-2.7 Array JSON payload [1,2,3]", "Failed assertion", e)

    # Probe 2.8: Valid text with adversarial noise_scale & noise_w strings
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/play-local",
            {
                "text": "Kiểm tra âm thanh",
                "noise_scale": "not_a_number",
                "noise_w": "invalid_val",
                "style": "custom_style",
            },
            client_ip="10.0.1.8",
        )
        assert status == 200, f"Expected 200, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert data.get("status") == "ok"
        fuzzer.log_pass("FZ-2.8 Malformed acoustic floats", f"Server survived with HTTP 200: {data}")
    except Exception as e:
        fuzzer.log_fail("FZ-2.8 Malformed acoustic floats", "Failed assertion", e)

    # ==========================================================================
    # FUZZ SECTION 3: GET & POST /api/dictation/qwen-director
    # ==========================================================================
    print("\n--- FUZZ SECTION 3: GET & POST /api/dictation/qwen-director ---")

    # Probe 3.1: GET /api/dictation/qwen-director health status
    try:
        status, body, _ = raw_http_request(f"{base_url}/api/dictation/qwen-director")
        assert status == 200, f"Expected 200, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "lifecycle_mode" in data
        assert "available_ram_mb" in data
        fuzzer.log_pass("FZ-3.1 GET qwen-director status", f"Status=200, RAM={data['available_ram_mb']}MB, mode={data['lifecycle_mode']}")
    except Exception as e:
        fuzzer.log_fail("FZ-3.1 GET qwen-director status", "Failed assertion", e)

    # Probe 3.2: Non-JSON body
    try:
        status, body, _ = raw_http_request(
            f"{base_url}/api/dictation/qwen-director",
            method="POST",
            headers={"Content-Type": "application/json", "X-Forwarded-For": "10.0.2.1"},
            raw_data=b"INVALID_NON_JSON_STREAM<!DOCTYPE html>",
        )
        assert status == 400, f"Expected 400, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-3.2 POST Non-JSON body", f"Rejected with HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-3.2 POST Non-JSON body", "Failed assertion", e)

    # Probe 3.3: Empty body {} (Missing action)
    try:
        status, body, _ = send_json(f"{base_url}/api/dictation/qwen-director", {}, client_ip="10.0.2.2")
        assert status == 400, f"Expected 400, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-3.3 POST Empty body {}", f"Rejected with HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-3.3 POST Empty body {}", "Failed assertion", e)

    # Probe 3.4: Unknown action
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "unknown_action_xyz", "text": "foo"},
            client_ip="10.0.2.3",
        )
        assert status == 400, f"Expected 400, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-3.4 Unknown action", f"Rejected with HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-3.4 Unknown action", "Failed assertion", e)

    # Probe 3.5: action="extract_sgk" with missing raw_text
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "extract_sgk"},
            client_ip="10.0.2.4",
        )
        assert status == 400, f"Expected 400, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-3.5 extract_sgk missing raw_text", f"Rejected with HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-3.5 extract_sgk missing raw_text", "Failed assertion", e)

    # Probe 3.6: action="extract_sgk" with empty string raw_text: ""
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "extract_sgk", "raw_text": ""},
            client_ip="10.0.2.5",
        )
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-3.6 extract_sgk empty string raw_text", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-3.6 extract_sgk empty string raw_text", "Failed assertion", e)

    # Probe 3.7: action="extract_sgk" with whitespace-only raw_text: "   \n\t  "
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "extract_sgk", "raw_text": "   \n\t   "},
            client_ip="10.0.2.6",
        )
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-3.7 extract_sgk whitespace raw_text", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-3.7 extract_sgk whitespace raw_text", "Failed assertion", e)

    # Probe 3.8: action="extract_sgk" with non-string raw_text: 99999
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "extract_sgk", "raw_text": 99999},
            client_ip="10.0.2.7",
        )
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-3.8 extract_sgk non-string raw_text", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-3.8 extract_sgk non-string raw_text", "Failed assertion", e)

    # Probe 3.9: action="direct_prosody" with missing passage
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "direct_prosody"},
            client_ip="10.0.2.8",
        )
        assert status == 400, f"Expected 400, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "error" in data
        fuzzer.log_pass("FZ-3.9 direct_prosody missing passage", f"Rejected with HTTP 400: {data['error']}")
    except Exception as e:
        fuzzer.log_fail("FZ-3.9 direct_prosody missing passage", "Failed assertion", e)

    # Probe 3.10: action="direct_prosody" with empty passage: ""
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "direct_prosody", "passage": ""},
            client_ip="10.0.2.9",
        )
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-3.10 direct_prosody empty passage", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-3.10 direct_prosody empty passage", "Failed assertion", e)

    # Probe 3.11: action="direct_prosody" with whitespace passage: " \t\n "
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "direct_prosody", "passage": "  \t\n  "},
            client_ip="10.0.2.10",
        )
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-3.11 direct_prosody whitespace passage", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-3.11 direct_prosody whitespace passage", "Failed assertion", e)

    # Probe 3.12: action="direct_prosody" with non-string passage: ["text"]
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "direct_prosody", "passage": ["text"]},
            client_ip="10.0.2.11",
        )
        assert status == 400, f"Expected 400, got {status}"
        fuzzer.log_pass("FZ-3.12 direct_prosody non-string passage", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-3.12 direct_prosody non-string passage", "Failed assertion", e)

    # Probe 3.13: Non-object JSON payload ([1, 2, 3] or "hello")
    try:
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            [1, 2, 3],
            client_ip="10.0.2.12",
        )
        assert status == 400, f"Expected 400 for array payload, got {status}"
        fuzzer.log_pass("FZ-3.13 Array JSON payload [1,2,3]", "Rejected with HTTP 400")
    except Exception as e:
        fuzzer.log_fail("FZ-3.13 Array JSON payload [1,2,3]", "Failed assertion", e)

    # ==========================================================================
    # FUZZ SECTION 4: DEEP VALIDATION & ADVERSARIAL STRESS
    # ==========================================================================
    print("\n--- FUZZ SECTION 4: DEEP VALIDATION & ADVERSARIAL STRESS ---")

    # Probe 4.1: Unicode stress with emojis and Vietnamese tone marks on extract_sgk
    try:
        unicode_raw = "Tiếng Việt 3 🌺\nTrang 99 📖\nBài: Quê Hương 🇻🇳\nĐất nước gấm hoa, biển bạc rừng vàng ✨\nCâu hỏi: 1. Nêu vẻ đẹp?"
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {"action": "extract_sgk", "raw_text": unicode_raw, "grade": 3},
            client_ip="10.0.3.1",
            timeout=25.0,
        )
        assert status == 200, f"Expected 200, got {status}"
        data = json.loads(body.decode("utf-8"))
        assert "Trang 99" not in data.get("clean_content", "")
        fuzzer.log_pass("FZ-4.1 Unicode/Emoji SGK Cleaner", f"Success=200, clean_content='{data.get('clean_content')}'")
    except Exception as e:
        fuzzer.log_fail("FZ-4.1 Unicode/Emoji SGK Cleaner", "Failed assertion", e)

    # Probe 4.2: Complex punctuation and multiple clauses on direct_prosody
    try:
        passage_complex = "Trời thu trong xanh, gió nhè nhẹ thổi; hoa cúc vàng rực rỡ, chim hót líu lo! Em có yêu mùa thu không?"
        status, body, _ = send_json(
            f"{base_url}/api/dictation/qwen-director",
            {
                "action": "direct_prosody",
                "passage": passage_complex,
                "difficult_words": ["vàng rực rỡ", "líu lo"],
                "grade": 3,
            },
            client_ip="10.0.3.2",
            timeout=25.0,
        )
        assert status == 200, f"Expected 200, got {status}"
        data = json.loads(body.decode("utf-8"))
        clauses = data.get("clauses", [])
        assert len(clauses) >= 3, f"Expected >= 3 clauses, got {len(clauses)}"
        reconstructed = " ".join([c["text"].strip() for c in clauses])
        assert passage_complex.split() == reconstructed.split(), "Word preservation failed on complex punctuation"
        fuzzer.log_pass("FZ-4.2 Complex Punctuation Prosody", f"Success=200, clauses={len(clauses)}, 100% words preserved")
    except Exception as e:
        fuzzer.log_fail("FZ-4.2 Complex Punctuation Prosody", "Failed assertion", e)

    # Cleanup spawned processes if any
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

    all_passed = fuzzer.print_summary()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
