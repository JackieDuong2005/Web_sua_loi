#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
pre_push_check.py — Automated pre-push safety auditor for ViHand Grade.

Performs:
  1. Secret leak scanning (API keys, HuggingFace tokens, private keys) in diff and untracked files.
  2. Large file size checks (>10MB warning, >50MB critical, >100MB GitHub limit).
  3. Database protection check (ensures SQLite vihand.db is never committed).
  4. Remote URL sanitization (masks credentials in 'hf' and other remotes).
  5. Vietnamese UTF-8 filename quotepath validation.
"""

import os
import re
import subprocess
import sys

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SECRET_PATTERNS = [
    (r"sk-[a-zA-Z0-9_\-]{20,}", "OpenAI / Claude API Key"),
    (r"AIza[0-9A-Za-z_\-]{35}", "Google Gemini API Key"),
    (r"hf_[a-zA-Z0-9]{25,}", "Hugging Face Access Token"),
    (r"ghp_[a-zA-Z0-9]{30,}", "GitHub Personal Access Token"),
    (r"-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----", "Private Cryptographic Key"),
    (r'(?i)(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["\'][a-zA-Z0-9_\-]{16,}["\']', "Generic Hardcoded Secret"),
]

SUSPICIOUS_FILENAMES = [
    r"^\.env(?:\.local|\.production|\.development)?$",
    r".*\.key$",
    r".*\.pem$",
    r".*\.pfx$",
    r".*credential.*",
    r".*secret.*",
]

CRITICAL_PROJECT_FILES = [
    r"^prisma/.*\.db$",
    r"^prisma/.*\.db-shm$",
    r"^prisma/.*\.db-wal$",
    r"^.*vihand\.db.*",
]

LARGE_WARN_MB = 10.0
LARGE_CRITICAL_MB = 50.0
LARGE_LIMIT_MB = 100.0


def run_cmd(cmd, cwd="."):
    try:
        res = subprocess.run(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=True,
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return 1, "", str(e)


def mask_url_credentials(url):
    """Replaces username:token@host with username:***@host."""
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", url)


def check_git_status():
    _, stdout, _ = run_cmd("git -c core.quotepath=false status --porcelain -uall")
    if not stdout:
        return []
    items = []
    for line in stdout.splitlines():
        if len(line) >= 4:
            status = line[:2].strip()
            filepath = line[3:].strip()
            if filepath.startswith('"') and filepath.endswith('"'):
                filepath = filepath[1:-1]
            items.append((status, filepath))
    return items


def check_secrets_in_diff():
    issues = []
    # Check staged diff first, then unstaged diff
    diff_targets = ["--cached", "HEAD"]
    for target in diff_targets:
        code, stdout, _ = run_cmd(f"git diff {target} --unified=0")
        if code == 0 and stdout:
            for line in stdout.splitlines():
                if line.startswith("+") and not line.startswith("+++"):
                    added_text = line[1:]
                    for pat, desc in SECRET_PATTERNS:
                        if re.search(pat, added_text):
                            issues.append(f"Found {desc} in diff ({target})")
                            break
    return list(set(issues))


def check_untracked_files(status_items):
    issues = []
    large_files = []
    db_leaks = []

    for status, rel_path in status_items:
        clean_path = rel_path.replace("\\", "/")

        # 1. Check DB files
        for db_pat in CRITICAL_PROJECT_FILES:
            if re.search(db_pat, clean_path, re.IGNORECASE):
                db_leaks.append(f"SQLite DB detected in git changes: {clean_path} (Status: {status})")

        # 2. Check sensitive filenames
        basename = os.path.basename(clean_path)
        for sus_pat in SUSPICIOUS_FILENAMES:
            if re.match(sus_pat, basename, re.IGNORECASE):
                issues.append(f"Sensitive file tracked/untracked: {clean_path}")

        # 3. Check file size
        if os.path.isfile(rel_path):
            try:
                size_mb = os.path.getsize(rel_path) / (1024 * 1024)
                if size_mb >= LARGE_WARN_MB:
                    large_files.append((clean_path, size_mb))
            except Exception:
                pass

        # 4. If untracked text file, scan first 100KB for secrets
        if status == "??" and os.path.isfile(rel_path):
            ext = os.path.splitext(rel_path)[1].lower()
            if ext in {".txt", ".json", ".js", ".ts", ".py", ".env", ".cfg", ".ini", ".yaml", ".yml", ".md"}:
                try:
                    with open(rel_path, "r", encoding="utf-8", errors="ignore") as fp:
                        content = fp.read(100000)
                        for pat, desc in SECRET_PATTERNS:
                            if re.search(pat, content):
                                issues.append(f"Potential {desc} in untracked file: {clean_path}")
                                break
                except Exception:
                    pass

    return issues, large_files, db_leaks


def check_remotes():
    _, stdout, _ = run_cmd("git remote -v")
    remotes = {}
    for line in stdout.splitlines():
        parts = line.split()
        if len(parts) >= 2:
            name, url = parts[0], parts[1]
            safe_url = mask_url_credentials(url)
            remotes[name] = safe_url
    return remotes


def main():
    print("=" * 60)
    print("🔍 VIHAND GRADE — PRE-PUSH SAFETY AUDIT")
    print("=" * 60)

    # 1. Current Branch
    _, branch, _ = run_cmd("git branch --show-current")
    print(f"📌 Current Git Branch : {branch if branch else '(detached HEAD)'}")

    # 2. Quotepath configuration
    _, qp, _ = run_cmd("git config core.quotepath")
    if qp.strip().lower() != "false":
        print("💡 Config tip         : core.quotepath is not false (Vietnamese file names may appear escaped).")
        print("                        Run: git config core.quotepath false")
    else:
        print("✅ Git Quotepath      : Clean UTF-8 display enabled.")

    # 3. Remotes (Masked)
    remotes = check_remotes()
    print("🌐 Registered Remotes :")
    for name, url in remotes.items():
        print(f"   - {name:8s} -> {url}")

    # 4. Status Check
    status_items = check_git_status()
    modified = [p for s, p in status_items if s != "??"]
    untracked = [p for s, p in status_items if s == "??"]
    print(f"📊 Pending Changes    : {len(modified)} modified/staged, {len(untracked)} untracked files.")

    # 5. Security & Large File Audit
    secret_diff_issues = check_secrets_in_diff()
    untracked_issues, large_files, db_leaks = check_untracked_files(status_items)

    all_security_issues = secret_diff_issues + untracked_issues + db_leaks

    print("\n" + "-" * 60)
    print("📋 AUDIT RESULTS:")
    print("-" * 60)

    # A. Database Protection
    if db_leaks:
        print("🚨 CRITICAL ALERT - DATABASE LEAK RISK:")
        for leak in db_leaks:
            print(f"   ❌ {leak}")
        print("   -> DO NOT COMMIT. Ensure prisma/*.db is in .gitignore and run: git rm --cached <file>")
    else:
        print("✅ Database Safety    : No SQLite DB files staged or tracked.")

    # B. Secrets & Tokens
    if all_security_issues:
        print("\n⚠️  SECURITY WARNINGS (Possible API Keys / Tokens):")
        for iss in all_security_issues:
            print(f"   ⚠️  {iss}")
    else:
        print("✅ Secret Scanning    : No sensitive keys or credentials detected.")

    # C. File Sizes
    if large_files:
        print("\n📦 LARGE FILES DETECTED (>10 MB):")
        for fpath, size_mb in sorted(large_files, key=lambda x: x[1], reverse=True):
            if size_mb >= LARGE_LIMIT_MB:
                print(f"   🛑 BLOCKED (>100MB) : {size_mb:6.1f} MB | {fpath} (GitHub will REJECT this)")
            elif size_mb >= LARGE_CRITICAL_MB:
                print(f"   ⚠️  CRITICAL (>50MB) : {size_mb:6.1f} MB | {fpath} (Exceeds recommended limit)")
            else:
                print(f"   ℹ️  WARNING  (>10MB) : {size_mb:6.1f} MB | {fpath}")
        print("   -> Gợi ý: Thêm file nặng vào .gitignore hoặc dùng Git LFS trước khi push.")
    else:
        print("✅ File Size Check    : All files are within normal limits (<10 MB).")

    print("=" * 60)

    # Summary Verdict
    if db_leaks or any(sz >= LARGE_LIMIT_MB for _, sz in large_files):
        print("❌ STATUS: BLOCKED — Vui lòng xử lý các cảnh báo đỏ ở trên trước khi commit/push.")
        sys.exit(1)
    elif all_security_issues or large_files:
        print("⚠️  STATUS: WARNINGS DETECTED — Hãy xem xét cẩn thận các file cảnh báo trước khi push.")
        sys.exit(0)
    else:
        print("✅ STATUS: READY TO PUSH — Repository sạch và an toàn!")
        sys.exit(0)


if __name__ == "__main__":
    main()
