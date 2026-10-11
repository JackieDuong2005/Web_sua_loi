import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

docs = [
    r'01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md',
    r'01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md'
]

code_pattern = re.compile(r'`([^`\n]+)`')

file_extensions = (
    '.kt', '.ts', '.tsx', '.py', '.sh', '.json', '.prisma', 
    '.db', '.apk', '.html', '.md', '.png', '.jpg', '.xml', 
    '.ttf', '.template', '.pt', '.toml'
)

extracted_files = set()
for doc in docs:
    with open(doc, 'r', encoding='utf-8') as f:
        text = f.read()
    for m in code_pattern.findall(text):
        m_clean = m.strip()
        for ext in file_extensions:
            if ext in m_clean:
                parts = m_clean.split()
                for p in parts:
                    if ext in p:
                        clean_p = p.strip("(),;\"'`")
                        clean_p = clean_p.split(':')[0]
                        if not clean_p.startswith(('http://', 'https://')):
                            extracted_files.add(clean_p)

print(f"Total identified file-like references: {len(extracted_files)}")
missing = []
found_list = []

for item in sorted(extracted_files):
    check_paths = [
        item,
        item.lstrip('/'),
        os.path.join('android_app', item),
        os.path.join('app', item),
        os.path.join('android_app', 'app', item),
        os.path.join('android_app', 'app', 'src', 'main', item)
    ]
    found = False
    matched_path = None
    for p in check_paths:
        if os.path.exists(p):
            found = True
            matched_path = p
            break
    if found:
        found_list.append((item, matched_path))
    else:
        missing.append(item)

print(f"\n--- FOUND ({len(found_list)}) ---")
for item, p in found_list:
    print(f"OK: {item} -> {p}")

print(f"\n--- MISSING ({len(missing)}) ---")
for item in missing:
    print(f"MISSING: {item}")
