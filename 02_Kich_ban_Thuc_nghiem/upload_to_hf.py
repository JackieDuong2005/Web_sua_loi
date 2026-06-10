"""
Upload source code to Hugging Face Space: JackieDuong/NCKh
Usage: python upload_to_hf.py YOUR_HF_TOKEN
"""

import sys
import os
from pathlib import Path
from huggingface_hub import HfApi, login

# =====================================================
# CONFIG
# =====================================================
if len(sys.argv) < 2:
    print("Usage: python upload_to_hf.py YOUR_HF_WRITE_TOKEN")
    print("Get token at: https://huggingface.co/settings/tokens")
    sys.exit(1)

HF_TOKEN = sys.argv[1].strip()
SPACE_ID = "JackieDuong/NCKh"
LOCAL_DIR = Path(r"C:\Users\Jackie Duong\Desktop\Web_sua_loi")

# Files/folders to SKIP
IGNORE_NAMES = {
    "node_modules", ".next", "__pycache__", ".git",
    ".env", ".env.local", ".env.production.local", ".env.development.local",
    "vihand.db", "vihand.db-shm", "vihand.db-wal",
    "pnpm-lock.yaml", "gemini_ocr.ipynb", "package-lock.json",
    "upload_to_hf.py",
}
IGNORE_EXTENSIONS = {".db", ".db-shm", ".db-wal", ".rar", ".zip"}

# =====================================================
# COLLECT FILES
# =====================================================
def should_ignore(rel_path: Path) -> bool:
    for part in rel_path.parts:
        if part in IGNORE_NAMES:
            return True
    if rel_path.name in IGNORE_NAMES:
        return True
    if rel_path.suffix in IGNORE_EXTENSIONS:
        return True
    return False

def collect_files(base_dir: Path):
    files = []
    for f in base_dir.rglob("*"):
        if f.is_file():
            rel = f.relative_to(base_dir)
            if not should_ignore(rel):
                files.append((f, str(rel).replace("\\", "/")))
    return files

# =====================================================
# MAIN
# =====================================================
print("Logging in to HuggingFace...")
login(token=HF_TOKEN, add_to_git_credential=False)

api = HfApi()
print("Login OK!")
print(f"Scanning: {LOCAL_DIR}")

files = collect_files(LOCAL_DIR)
total_size = sum(f.stat().st_size for f, _ in files)
print(f"Found {len(files)} files ({total_size/1024/1024:.1f} MB total)\n")

for i, (local, remote) in enumerate(files[:30]):
    size_kb = local.stat().st_size / 1024
    print(f"  {remote} ({size_kb:.1f} KB)")
if len(files) > 30:
    print(f"  ... and {len(files)-30} more files")

print(f"\nUploading to: {SPACE_ID}")
print("=" * 60)

success = 0
failed = []

for i, (local_path, remote_path) in enumerate(files):
    try:
        size_kb = local_path.stat().st_size / 1024
        print(f"[{i+1}/{len(files)}] {remote_path} ({size_kb:.1f} KB) ... ", end="", flush=True)
        api.upload_file(
            path_or_fileobj=str(local_path),
            path_in_repo=remote_path,
            repo_id=SPACE_ID,
            repo_type="space",
            token=HF_TOKEN,
        )
        print("OK")
        success += 1
    except Exception as e:
        print(f"FAILED: {e}")
        failed.append((remote_path, str(e)))

print("\n" + "=" * 60)
print(f"SUCCESS: {success}/{len(files)} files uploaded")
if failed:
    print(f"FAILED ({len(failed)}):")
    for path, err in failed:
        print(f"  - {path}: {err}")

print(f"\nDone! Visit: https://huggingface.co/spaces/{SPACE_ID}")
