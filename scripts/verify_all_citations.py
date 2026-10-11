import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

checks = [
    {
        "file": "lib/prisma.ts",
        "lines": (7, 22),
        "desc": "lib/prisma.ts:7-22 PrismaClient initialization with adapter"
    },
    {
        "file": "lib/prisma.ts",
        "lines": (24, 36),
        "desc": "lib/prisma.ts:24-36 globalForPrisma singleton"
    },
    {
        "file": "lib/api-guard.ts",
        "total_lines": 109,
        "line_check": (13, "Map<string, { timestamps: number[] }>"),
        "desc": "lib/api-guard.ts total lines = 109, line 13 Map structure"
    },
    {
        "file": "app/admin/layout.tsx",
        "lines": (16, 28),
        "keyword": "admin",
        "desc": "app/admin/layout.tsx:16-28 check role admin"
    },
    {
        "file": "app/teacher/layout.tsx",
        "lines": (16, 28),
        "keyword": "teacher",
        "desc": "app/teacher/layout.tsx:16-28 check role teacher"
    },
    {
        "file": "app/student/layout.tsx",
        "lines": (16, 28),
        "keyword": "student",
        "desc": "app/student/layout.tsx:16-28 check role student"
    },
    {
        "file": "app/api/grades/route.ts",
        "lines": (10, 29),
        "keyword": "saveImageToDisk",
        "desc": "app/api/grades/route.ts:10-29 saveImageToDisk"
    },
    {
        "file": "app/api/mobile/grade/route.ts",
        "lines": (10, 35),
        "keyword": "saveImageToDisk",
        "desc": "app/api/mobile/grade/route.ts:10-35 saveImageToDisk"
    },
    {
        "file": "app/api/mobile/grade/route.ts",
        "lines": (347, 524),
        "desc": "app/api/mobile/grade/route.ts:347-524 POST handler"
    },
    {
        "file": "app/api/grade/route.ts",
        "lines": (1063, 1224),
        "desc": "app/api/grade/route.ts:1063-1224 POST handler"
    },
    {
        "file": "python_service/main.py",
        "lines": (55, 56),
        "keyword": "torch.set_num_threads",
        "desc": "python_service/main.py:55-56 _VIT5_WORKERS and torch.set_num_threads"
    },
    {
        "file": "python_service/main.py",
        "lines": (29, 41),
        "keyword": "ENABLE_QUICK_EDIT_MODE",
        "desc": "python_service/main.py:29-41 disable ENABLE_QUICK_EDIT_MODE"
    },
    {
        "file": "python_service/main.py",
        "lines": (1642, 1666),
        "keyword": "startup",
        "desc": "python_service/main.py:1642-1666 @app.on_event startup"
    },
    {
        "file": "python_service/yolo_detector.py",
        "total_lines": 267,
        "lines": (30, 42),
        "desc": "python_service/yolo_detector.py:30-42 weights best.pt, total lines 267"
    },
    {
        "file": "python_service/yolo_detector.py",
        "lines": (115, 143),
        "keyword": "overlap",
        "desc": "python_service/yolo_detector.py:115-143 Vertical overlap line clustering"
    },
    {
        "file": "python_service/main.py",
        "lines": (406, 438),
        "keyword": "_split_prose_to_chunks",
        "desc": "python_service/main.py:406-438 _split_prose_to_chunks"
    },
    {
        "file": "python_service/main.py",
        "lines": (537, 670),
        "keyword": "parse_vietnamese_syllable",
        "desc": "python_service/main.py:537-670 parse_vietnamese_syllable & classify_error_type"
    },
    {
        "file": "python_service/main.py",
        "lines": (976, 980),
        "keyword": "bfloat16",
        "desc": "python_service/main.py:976-980 Qwen torch_dtype bfloat16"
    },
    {
        "file": "python_service/main.py",
        "lines": (1713, 1757),
        "keyword": "edge-tts",
        "desc": "python_service/main.py:1713-1757 edge-tts endpoint /tts"
    },
    {
        "file": "prisma/schema.prisma",
        "lines": (10, 101),
        "desc": "prisma/schema.prisma:10-101 6 database models"
    }
]

print("=== EMPIRICAL CITATION VERIFICATION HARNESS ===")
passed = 0
failed = 0

for item in checks:
    fpath = item["file"]
    desc = item["desc"]
    if not os.path.exists(fpath):
        print(f"[FAIL - FILE MISSING] {desc} -> File not found: {fpath}")
        failed += 1
        continue
    
    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
        content_lines = f.readlines()
    
    actual_len = len(content_lines)
    
    # check total lines if specified
    if "total_lines" in item:
        expected_len = item["total_lines"]
        if actual_len != expected_len:
            print(f"[FAIL - LINE COUNT MISMATCH] {desc} -> Expected {expected_len} lines, got {actual_len} lines!")
            failed += 1
            continue
    
    # check line range
    if "lines" in item:
        start, end = item["lines"]
        if start < 1 or end > actual_len:
            print(f"[FAIL - OUT OF RANGE] {desc} -> File has {actual_len} lines, requested {start}-{end}")
            failed += 1
            continue
        
        chunk = "".join(content_lines[start-1:end])
        if "keyword" in item:
            kw = item["keyword"]
            if kw.lower() not in chunk.lower():
                print(f"[FAIL - KEYWORD MISMATCH] {desc} -> Keyword '{kw}' NOT found in lines {start}-{end}!")
                print(f"   Actual snippet:\n{chunk[:200]}...")
                failed += 1
                continue
    
    if "line_check" in item:
        lno, expected_text = item["line_check"]
        actual_line = content_lines[lno-1].strip()
        if expected_text.lower() not in actual_line.lower():
            print(f"[FAIL - LINE CONTENT MISMATCH] {desc} -> Line {lno} was '{actual_line}', expected '{expected_text}'")
            failed += 1
            continue

    print(f"[PASS] {desc}")
    passed += 1

print(f"\nSummary: {passed} passed, {failed} failed out of {len(checks)} citation checks.")
