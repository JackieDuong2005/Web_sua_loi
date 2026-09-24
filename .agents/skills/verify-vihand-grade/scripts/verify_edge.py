#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_edge.py - Verification Harness for ViHand Grade Edge Pi & Cloudflare Tunnel
Part of the verify-vihand-grade skill (based on Lauren Tan's pstack methodology).

Drives the public and edge surface:
1. Pings https://vihandgrade.click/api/health through Cloudflare Tunnel.
2. Measures round-trip time (RTT latency ms).
3. If local network allows, tests SSH connection to Raspberry Pi (192.168.1.56)
   and verifies systemd daemon status (vihand-ai.service, vihand-web.service).
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PUBLIC_TUNNEL_URL = "https://vihandgrade.click"

def verify_edge_server(check_ssh=True):
    print(f"[Edge Verification] Đang kiểm tra Cloudflare Tunnel tại: {PUBLIC_TUNNEL_URL}/api/health", flush=True)

    evidence = {
        "public_url": PUBLIC_TUNNEL_URL,
        "tunnel_online": False,
    }

    # 1. Test Cloudflare Tunnel
    t_start = time.time()
    try:
        req = urllib.request.Request(
            f"{PUBLIC_TUNNEL_URL}/api/health",
            headers={"User-Agent": "ViHand-Edge-Verifier/1.0"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            latency_ms = int((time.time() - t_start) * 1000)
            data = json.loads(resp.read().decode("utf-8"))
            evidence["tunnel_online"] = (resp.status == 200)
            evidence["tunnel_status_code"] = resp.status
            evidence["tunnel_latency_ms"] = latency_ms
            evidence["health_response"] = data
    except Exception as e:
        evidence["tunnel_error"] = str(e)
        evidence["tunnel_online"] = False

    # 2. Test SSH to Pi if paramiko is installed and check_ssh is True
    if check_ssh:
        try:
            import paramiko
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            # Connect with short timeout
            client.connect("192.168.1.56", port=22, username="jackie", password="1", timeout=4)

            # Check systemd status
            _, o1, _ = client.exec_command("systemctl is-active vihand-ai.service")
            _, o2, _ = client.exec_command("systemctl is-active vihand-web.service")
            ai_status = o1.read().decode("utf-8").strip()
            web_status = o2.read().decode("utf-8").strip()

            evidence["ssh_connected"] = True
            evidence["vihand_ai_service"] = ai_status
            evidence["vihand_web_service"] = web_status
            client.close()
        except Exception as e:
            evidence["ssh_connected"] = False
            evidence["ssh_note"] = f"Không kết nối được SSH nội bộ (bình thường khi không ở cùng mạng Wi-Fi Pi): {str(e)[:100]}"

    is_pass = evidence.get("tunnel_online", False)
    latency = evidence.get("tunnel_latency_ms", "N/A")

    return {
        "status": "PASS" if is_pass else "FAIL",
        "message": f"Cloudflare Tunnel hoạt động tốt (RTT: {latency}ms)." if is_pass else "Không thể kết nối tới Cloudflare Tunnel https://vihandgrade.click.",
        "evidence": evidence
    }

if __name__ == "__main__":
    no_ssh = "--no-ssh" in sys.argv
    res = verify_edge_server(check_ssh=not no_ssh)
    print("\n" + json.dumps(res, indent=2, ensure_ascii=False))
    sys.exit(0 if res["status"] == "PASS" else 1)
