# -*- coding: utf-8 -*-
import sys, re, os

sys.stdout.reconfigure(encoding='utf-8')

docs = [
    '01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md',
    '02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md'
]

base_dir = r'01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong'

keywords = [
    'Android', 'android_app', 'Kotlin', 'Compose', 'CameraX', 'Room DB', 
    'PhotoBoundingBoxViewer', 'HistoryScreen', 'StudentHomeScreen', 
    'GradeRecordDao', 'syncTwoWayWithServer', '23/23'
]

for fn in docs:
    p = os.path.join(base_dir, fn)
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f'=== {fn} (Total characters: {len(content):,}) ===')
    for kw in keywords:
        count = len(re.findall(re.escape(kw), content, re.IGNORECASE))
        print(f'  - {kw:25s}: {count:3d} lần')
    print()

# Kiểm tra các mục cụ thể viết về Android App
print('--- CÁC CHƯƠNG / MỤC TRỌNG TÂM VỀ ANDROID APP ---')
with open(os.path.join(base_dir, docs[0]), 'r', encoding='utf-8') as f:
    for idx, l in enumerate(f, 1):
        if any(w in l for w in ['Android', 'Di động', 'CameraX', 'Room DB']) and (l.startswith('#') or l.startswith('###')):
            print(f'[Doc 1: Line {idx:4d}] {l.strip()}')

with open(os.path.join(base_dir, docs[1]), 'r', encoding='utf-8') as f:
    for idx, l in enumerate(f, 1):
        if any(w in l for w in ['Android', 'Client Mobile', 'CameraX', 'Room DB', 'PHẦN 2']) and (l.startswith('#') or l.startswith('##')):
            print(f'[Doc 2: Line {idx:4d}] {l.strip()}')
