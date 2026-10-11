import re, os, sys
sys.stdout.reconfigure(encoding='utf-8')

repo_root = r'c:\Users\Jackie Duong\Desktop\Web_sua_loi'

for doc_rel in [
    '01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md',
    '01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md'
]:
    doc_path = os.path.join(repo_root, doc_rel)
    print(f"\n=======================================================")
    print(f"AUDITING CITATIONS IN: {doc_rel}")
    print(f"=======================================================")
    with open(doc_path, encoding='utf-8') as f:
        text = f.read()

    # Find pattern like `path/to/file.ext:12-34` or `path/to/file.ext:12`
    matches = re.findall(r'`([a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]+:\d+(?:-\d+)?)`', text)
    unique_matches = sorted(list(set(matches)))
    print(f"Total citations found: {len(unique_matches)}")

    for m in unique_matches:
        parts = m.split(':')
        filepath = parts[0]
        linerange = parts[1]
        full_path = os.path.join(repo_root, filepath.replace('/', '\\'))
        if not os.path.exists(full_path):
            print(f"[FAIL: MISSING FILE] {m}")
            continue
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f_src:
            src_lines = f_src.readlines()
        if '-' in linerange:
            start, end = map(int, linerange.split('-'))
        else:
            start = end = int(linerange)
        
        if start < 1 or end > len(src_lines) or start > end:
            print(f"[FAIL: LINE BOUNDS] {m} (file has {len(src_lines)} lines)")
        else:
            first_line_sample = src_lines[start-1].strip()[:50]
            last_line_sample = src_lines[end-1].strip()[:50]
            print(f"[PASS] {m:65} | Lines {start}..{end} of {len(src_lines)} | \"{first_line_sample}\"")
