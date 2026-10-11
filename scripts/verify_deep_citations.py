import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

DOC1 = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md"
DOC2 = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md"

results = []

for doc_path, name in [(DOC1, "Doc 1"), (DOC2, "Doc 2")]:
    with open(doc_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    print(f"=== Scanning citations in {name} ===")
    citations = []

    # Regex 1: `path/to/file:123` or `path/to/file:123-456`
    for m in re.finditer(r"`([a-zA-Z0-9_\-/\\]+\.[a-zA-Z0-9]+):(\d+)(?:-(\d+))?`", content):
        citations.append((m.group(1), int(m.group(2)), int(m.group(3)) if m.group(3) else int(m.group(2)), m.group(0)))

    # Regex 2: Table markdown `path/file` | Dòng 12-34
    for m in re.finditer(r"`([a-zA-Z0-9_\-/\\]+\.[a-zA-Z0-9]+)`\s*\|\s*Dòng\s*(\d+)(?:-(\d+))?", content):
        citations.append((m.group(1), int(m.group(2)), int(m.group(3)) if m.group(3) else int(m.group(2)), f"`{m.group(1)}` | Dòng {m.group(2)}"))

    # Regex 3: text like `path/to/file` (dòng 12-34)
    for m in re.finditer(r"`([a-zA-Z0-9_\-/\\]+\.[a-zA-Z0-9]+)`[^\n\(\)]*\(dòng\s*(\d+)(?:-(\d+))?\)", content):
        citations.append((m.group(1), int(m.group(2)), int(m.group(3)) if m.group(3) else int(m.group(2)), m.group(0)))

    unique = sorted(list(set(citations)))
    print(f"Found {len(unique)} citations in {name}.")
    
    for fp, sl, el, raw in unique:
        norm_fp = os.path.normpath(fp.replace('/', os.sep))
        exists = os.path.exists(norm_fp)
        if not exists:
            # Maybe path is relative to android_app or something
            print(f"[{name}] [MISSING FILE] {fp} (lines {sl}-{el}) Raw: {raw}")
            results.append({"doc": name, "file": fp, "lines": f"{sl}-{el}", "status": "FILE_NOT_FOUND", "raw": raw})
            continue
        
        with open(norm_fp, "r", encoding="utf-8", errors="ignore") as f_in:
            lines = f_in.readlines()
        total = len(lines)
        if sl > total or el > total:
            print(f"[{name}] [LINE OVERFLOW] {fp} total_lines={total}, cited={sl}-{el} Raw: {raw}")
            results.append({"doc": name, "file": fp, "lines": f"{sl}-{el}", "status": "LINE_OVERFLOW", "raw": raw})
        else:
            snippet = "".join(lines[sl-1:min(el, sl+2)]).strip().replace("\n", " ")[:60]
            print(f"[{name}] [VALID] {fp}:{sl}-{el} (of {total}) -> {snippet}")
            results.append({"doc": name, "file": fp, "lines": f"{sl}-{el}", "status": "VALID", "raw": raw, "snippet": snippet})

print(f"\nTotal citations verified: {len(results)}")
print(f"Valid: {sum(1 for r in results if r['status'] == 'VALID')}")
print(f"Issues: {sum(1 for r in results if r['status'] != 'VALID')}")
