# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET
import sys
import os

sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

def extract_docx(filepath):
    with zipfile.ZipFile(filepath, 'r') as z:
        with z.open('word/document.xml') as f:
            xml = f.read()
    root = ET.fromstring(xml)
    paragraphs = []
    for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        texts = []
        for run in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
            if run.text:
                texts.append(run.text)
        line = ''.join(texts).strip()
        if line:
            paragraphs.append(line)
    return paragraphs

# Extract Tom Tat
tom_tat_file = '8 - Báo cáo tóm tắt - Thiết bị chấm điểm.docx'
print('=== BAO CAO TOM TAT ===')
lines = extract_docx(tom_tat_file)
for l in lines:
    print(l)

print('\n\n=== BAO CAO TONG KET (first 300 lines) ===')
tong_ket_file = '8 - Báo cáo tổng kết - Thiết bị chấm điểm.docx'
lines2 = extract_docx(tong_ket_file)
for l in lines2[:300]:
    print(l)
