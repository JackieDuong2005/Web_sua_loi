# -*- coding: utf-8 -*-
import zipfile
import xml.etree.ElementTree as ET
import sys

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
        paragraphs.append(line)  # Keep empty lines for structure
    return paragraphs

# Extract Tom Tat
tom_tat_lines = extract_docx('8 - Báo cáo tóm tắt - Thiết bị chấm điểm.docx')
tong_ket_lines = extract_docx('8 - Báo cáo tổng kết - Thiết bị chấm điểm.docx')

with open('tom_tat_clean.txt', 'w', encoding='utf-8') as f:
    f.write('=== TOM TAT ===\n')
    for l in tom_tat_lines:
        f.write(l + '\n')
    f.write('\n=== TONG KET (cau truc) ===\n')
    for l in tong_ket_lines:
        f.write(l + '\n')

print('Done')
