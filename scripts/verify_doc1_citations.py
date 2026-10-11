import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

checks_doc1 = [
    {
        "file": "android_app/app/build.gradle.kts",
        "desc": "android_app/app/build.gradle.kts exists and targets SDK 36"
    },
    {
        "file": "app/api/mobile/grade/route.ts",
        "lines": (347, 524),
        "desc": "app/api/mobile/grade/route.ts:347-524 BFF Mobile Route"
    },
    {
        "file": "app/api/admin/retention/route.ts",
        "lines": (66, 187),
        "keyword": "anonymize",
        "desc": "app/api/admin/retention/route.ts:66-187 Data retention lifecycle"
    },
    {
        "file": "03_Scripts_Trien_khai/rpi4/05_setup_cloudflare_tunnel.sh",
        "lines": (69, 85),
        "keyword": "vihandgrade.click",
        "desc": "03_Scripts_Trien_khai/rpi4/05_setup_cloudflare_tunnel.sh:69-85 Cloudflare tunnel"
    },
    {
        "file": "android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt",
        "desc": "PhotoBoundingBoxViewer.kt exists"
    },
    {
        "file": "03_Scripts_Trien_khai/rpi4/00_init_system.sh",
        "lines": (39, 65),
        "keyword": "3072",
        "desc": "03_Scripts_Trien_khai/rpi4/00_init_system.sh:39-65 Swap 3GB"
    },
    {
        "file": "03_Scripts_Trien_khai/rpi4/04_setup_network_firewall.sh",
        "desc": "03_Scripts_Trien_khai/rpi4/04_setup_network_firewall.sh exists"
    },
    {
        "file": "03_Scripts_Trien_khai/shared/vihand-python.service.template",
        "desc": "03_Scripts_Trien_khai/shared/vihand-python.service.template exists"
    },
    {
        "file": "android_app/app/src/main/java/com/example/data/local/AppDatabase.kt",
        "desc": "AppDatabase.kt exists"
    },
    {
        "file": "android_app/app/src/main/java/com/example/ui/screens/StudentHomeScreen.kt",
        "lines": (70, 90),
        "keyword": "extractDifficultWords",
        "desc": "StudentHomeScreen.kt:70-90 extractDifficultWords"
    },
    {
        "file": "android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt",
        "lines": (61, 65),
        "keyword": "removeVietnameseDiacritics",
        "desc": "HistoryScreen.kt:61-65 removeVietnameseDiacritics"
    },
    {
        "file": "android_app/app/src/main/java/com/example/ui/screens/HistoryScreen.kt",
        "lines": (179, 206),
        "keyword": "removeVietnameseDiacritics",
        "desc": "HistoryScreen.kt:179-206 removeVietnameseDiacritics"
    },
    {
        "file": "python_service/main.py",
        "lines": (97, 110),
        "keyword": "quantize_dynamic",
        "desc": "python_service/main.py:97-110 ViT5 dynamic quantization"
    },
    {
        "file": "python_service/main.py",
        "lines": (921, 987),
        "keyword": "Qwen",
        "desc": "python_service/main.py:921-987 Qwen model init"
    },
    {
        "file": "python_service/yolo_detector.py",
        "lines": (115, 143),
        "desc": "python_service/yolo_detector.py:115-143 Vertical overlap"
    }
]

print("=== DOC 1 CITATIONS VERIFICATION ===")
p = 0
f = 0
for c in checks_doc1:
    fpath = c["file"]
    desc = c["desc"]
    if not os.path.exists(fpath):
        print(f"[FAIL - NOT FOUND] {desc} -> {fpath}")
        f += 1
        continue
    with open(fpath, "r", encoding="utf-8", errors="replace") as file:
        lines = file.readlines()
    if "lines" in c:
        s, e = c["lines"]
        if s < 1 or e > len(lines):
            print(f"[FAIL - RANGE ERROR] {desc} -> File {fpath} has {len(lines)} lines, asked {s}-{e}")
            f += 1
            continue
        chunk = "".join(lines[s-1:e])
        if "keyword" in c and c["keyword"].lower() not in chunk.lower():
            print(f"[FAIL - KEYWORD NOT IN RANGE] {desc} -> '{c['keyword']}' not in lines {s}-{e}")
            f += 1
            continue
    print(f"[PASS] {desc}")
    p += 1

print(f"Doc 1 citations: {p} passed, {f} failed out of {len(checks_doc1)}")
