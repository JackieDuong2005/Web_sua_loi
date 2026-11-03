# -*- coding: utf-8 -*-
"""
Script chuyển đổi tài liệu phân tích hệ thống đọc chính tả sang DOCX và PDF chuẩn báo cáo học thuật TDTU.
Sử dụng python-docx để tạo tài liệu định dạng chuyên nghiệp, sau đó dùng MS Word COM để xuất PDF sắc nét.
"""

import os
import re
import sys

# Đảm bảo console Windows hỗ trợ UTF-8
if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr:
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

# Màu sắc chuẩn nhận diện TDTU
COLOR_PRIMARY = RGBColor(0, 74, 173)     # TDTU Blue #004AAD
COLOR_SECONDARY = RGBColor(230, 25, 46)  # TDTU Red #E6192E
COLOR_DARK = RGBColor(30, 41, 59)        # Slate 800 #1E293B
COLOR_MUTED = RGBColor(100, 116, 139)    # Slate 500 #64748B
COLOR_HIGHLIGHT = RGBColor(16, 185, 129) # Emerald #10B981

def set_cell_background(cell, hex_color):
    """Đặt màu nền cho ô trong bảng"""
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Đặt lề trong cho ô (đơn vị dxa: 20 dxa = 1 pt)"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_border(cell, **kwargs):
    """
    Đặt đường viền cho ô. kwargs: top, bottom, left, right
    Giá trị ví dụ: {"sz": 12, "val": "single", "color": "004AAD", "space": "0"}
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), str(edge_data.get('space', 0)))
            element.set(qn('w:color'), edge_data.get('color', 'auto'))
            tcBorders.append(element)
    tcPr.append(tcBorders)

def add_callout_box(doc, title, text, bg_color="F0FDF4", border_color="10B981"):
    """Tạo hộp ghi chú / câu hỏi phản biện nổi bật"""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    set_cell_border(cell, 
                    left={"sz": 24, "val": "single", "color": border_color},
                    top={"val": "nil"}, right={"val": "nil"}, bottom={"val": "nil"})
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(title)
    run_title.font.name = 'Segoe UI'
    run_title.font.size = Pt(11)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)
    
    p2 = cell.add_paragraph()
    p2.paragraph_format.space_before = Pt(2)
    p2.paragraph_format.space_after = Pt(0)
    p2.paragraph_format.line_spacing = 1.2
    run_text = p2.add_run(text)
    run_text.font.name = 'Segoe UI'
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = COLOR_DARK
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def parse_inline_formatting(paragraph, text, default_font='Segoe UI', default_size=10.5, default_color=COLOR_DARK):
    """Xử lý định dạng in đậm, in nghiêng, code trong chuỗi text"""
    # Tách theo token: **bold**, *italic*, `code`
    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)', text)
    for token in tokens:
        if not token:
            continue
        run = paragraph.add_run()
        run.font.name = default_font
        run.font.size = Pt(default_size)
        run.font.color.rgb = default_color
        
        if token.startswith('**') and token.endswith('**'):
            run.text = token[2:-2]
            run.font.bold = True
        elif token.startswith('*') and token.endswith('*'):
            run.text = token[1:-1]
            run.font.italic = True
        elif token.startswith('`') and token.endswith('`'):
            run.text = token[1:-1]
            run.font.name = 'Consolas'
            run.font.size = Pt(default_size * 0.95)
            run.font.color.rgb = RGBColor(194, 24, 91)
        else:
            run.text = token

def build_dictation_document(md_path, docx_path):
    print(f"[INFO] Bắt đầu tạo tài liệu DOCX từ: {md_path}")
    doc = Document()
    
    # 1. Cấu hình lề trang chuẩn A4
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.8)
        section.page_width = Inches(8.27)  # A4
        section.page_height = Inches(11.69)
        
        # Header & Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("ĐỒ ÁN CHUYÊN NGÀNH — HỆ THỐNG TRỢ LÝ ĐỌC VÀ CHẤM CHÍNH TẢ VIHAND GRADE")
        hrun.font.name = 'Segoe UI'
        hrun.font.size = Pt(8)
        hrun.font.italic = True
        hrun.font.color.rgb = COLOR_MUTED
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Đại học Tôn Đức Thắng — Khoa Điện - Điện Tử | Trang nội bộ")
        frun.font.name = 'Segoe UI'
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = COLOR_MUTED

    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    lines = md_content.split('\n')
    
    in_table = False
    table_rows = []
    in_code_block = False
    code_lines = []
    in_faq_answer = False
    faq_title = ""
    faq_body = ""
    
    i = 0
    total_lines = len(lines)
    while i < total_lines:
        line = lines[i].rstrip()
        
        # Xử lý code block
        if line.startswith('```'):
            if not in_code_block:
                in_code_block = True
                code_lines = []
            else:
                in_code_block = False
                # Thêm bảng code block vào tài liệu
                tbl = doc.add_table(rows=1, cols=1)
                tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                cell = tbl.cell(0, 0)
                cell.width = Inches(6.5)
                set_cell_background(cell, "F8FAFC")
                set_cell_margins(cell, top=120, bottom=120, left=160, right=160)
                set_cell_border(cell, left={"sz": 18, "val": "single", "color": "004AAD"},
                                top={"sz": 4, "val": "single", "color": "E2E8F0"},
                                right={"sz": 4, "val": "single", "color": "E2E8F0"},
                                bottom={"sz": 4, "val": "single", "color": "E2E8F0"})
                
                cp = cell.paragraphs[0]
                cp.paragraph_format.space_before = Pt(0)
                cp.paragraph_format.space_after = Pt(0)
                cp.paragraph_format.line_spacing = 1.15
                c_run = cp.add_run('\n'.join(code_lines))
                c_run.font.name = 'Consolas'
                c_run.font.size = Pt(8.5)
                c_run.font.color.rgb = COLOR_DARK
                
                doc.add_paragraph().paragraph_format.space_after = Pt(2)
            i += 1
            continue
            
        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Xử lý bảng Markdown
        if '|' in line and not line.startswith('###'):
            # Kiểm tra xem có phải dòng bảng không
            parts = [c.strip() for c in line.split('|')]
            if len(parts) >= 3:
                # Nếu là dòng phân cách |---|---| thì bỏ qua
                if all(re.match(r'^:?-+:?$', p) for p in parts[1:-1] if p):
                    i += 1
                    continue
                if not in_table:
                    in_table = True
                    table_rows = []
                table_rows.append([p for p in parts[1:-1]])
                i += 1
                continue
        else:
            if in_table:
                # Kết thúc bảng, render bảng vào Word
                in_table = False
                if table_rows:
                    num_rows = len(table_rows)
                    num_cols = len(table_rows[0])
                    table = doc.add_table(rows=num_rows, cols=num_cols)
                    table.alignment = WD_TABLE_ALIGNMENT.CENTER
                    table.autofit = False
                    
                    for r_idx, row_data in enumerate(table_rows):
                        row = table.rows[r_idx]
                        is_header = (r_idx == 0)
                        for c_idx in range(min(num_cols, len(row_data))):
                            cell = row.cells[c_idx]
                            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                            cell_text = row_data[c_idx]
                            
                            p = cell.paragraphs[0]
                            p.paragraph_format.space_before = Pt(3)
                            p.paragraph_format.space_after = Pt(3)
                            p.paragraph_format.line_spacing = 1.15
                            
                            if is_header:
                                set_cell_background(cell, "004AAD")
                                set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
                                parse_inline_formatting(p, cell_text, default_font='Segoe UI', default_size=9.5, default_color=RGBColor(255,255,255))
                                for r in p.runs:
                                    r.font.bold = True
                            else:
                                bg = "F8FAFC" if (r_idx % 2 == 1) else "FFFFFF"
                                set_cell_background(cell, bg)
                                set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                                parse_inline_formatting(p, cell_text, default_font='Segoe UI', default_size=9.0, default_color=COLOR_DARK)
                                
                            set_cell_border(cell,
                                            top={"sz": 4, "val": "single", "color": "CBD5E1"},
                                            bottom={"sz": 4, "val": "single", "color": "CBD5E1"},
                                            left={"sz": 4, "val": "single", "color": "CBD5E1"},
                                            right={"sz": 4, "val": "single", "color": "CBD5E1"})
                    
                    doc.add_paragraph().paragraph_format.space_after = Pt(4)
                table_rows = []

        # Xử lý FAQ: Câu hỏi dạng "### ❓ Câu hỏi X: ..."
        if line.startswith('### ❓') or line.startswith('### ?'):
            faq_title = line.replace('###', '').strip()
            # Đọc tiếp các dòng trả lời
            i += 1
            faq_lines = []
            while i < total_lines and not lines[i].startswith('---') and not lines[i].startswith('### ❓') and not lines[i].startswith('## '):
                l_ans = lines[i].strip()
                if l_ans.startswith('>'):
                    l_ans = l_ans.lstrip('>').strip()
                if l_ans:
                    faq_lines.append(l_ans)
                i += 1
            
            faq_body = '\n'.join(faq_lines).replace('*', '')
            add_callout_box(doc, faq_title, faq_body, bg_color="EFF6FF", border_color="004AAD")
            continue

        # Tiêu đề tài liệu lớn
        if line.startswith('# '):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run(line.replace('#', '').strip())
            run.font.name = 'Segoe UI'
            run.font.size = Pt(20)
            run.font.bold = True
            run.font.color.rgb = COLOR_PRIMARY
            i += 1
            continue
            
        if line.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line.replace('##', '').strip())
            run.font.name = 'Segoe UI'
            run.font.size = Pt(14)
            run.font.bold = True
            run.font.color.rgb = COLOR_PRIMARY
            i += 1
            continue

        if line.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line.replace('###', '').strip())
            run.font.name = 'Segoe UI'
            run.font.size = Pt(12)
            run.font.bold = True
            run.font.color.rgb = COLOR_SECONDARY
            i += 1
            continue

        if line.startswith('#### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(line.replace('####', '').strip())
            run.font.name = 'Segoe UI'
            run.font.size = Pt(11)
            run.font.bold = True
            run.font.color.rgb = COLOR_PRIMARY
            i += 1
            continue

        # Blockquote (Dòng bắt đầu bằng >)
        if line.startswith('>'):
            content = line.lstrip('>').strip()
            tbl = doc.add_table(rows=1, cols=1)
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = tbl.cell(0, 0)
            cell.width = Inches(6.5)
            set_cell_background(cell, "F1F5F9")
            set_cell_margins(cell, top=80, bottom=80, left=140, right=140)
            set_cell_border(cell, left={"sz": 16, "val": "single", "color": "004AAD"},
                            top={"val": "nil"}, right={"val": "nil"}, bottom={"val": "nil"})
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            parse_inline_formatting(p, content, default_font='Segoe UI', default_size=9.5, default_color=COLOR_DARK)
            for r in p.runs:
                r.font.italic = True
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
            i += 1
            continue

        # Danh sách không thứ tự (bullet)
        if line.strip().startswith(('* ', '- ', '• ')):
            bullet_text = line.strip()[2:].strip()
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.2
            parse_inline_formatting(p, bullet_text, default_font='Segoe UI', default_size=10.5, default_color=COLOR_DARK)
            i += 1
            continue

        # Đường kẻ ngang
        if line.strip().startswith(('---', '***')):
            i += 1
            continue

        # Chèn ảnh sơ đồ nếu có tham chiếu
        if "Sơ đồ luồng dữ liệu toàn cảnh" in line or "Architecture Flowchart" in line:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(line)
            run.font.name = 'Segoe UI'
            run.font.bold = True
            
            # Chèn ảnh luong_doc_chinh_ta.png nếu file tồn tại
            img_path = r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\public\images\luong_doc_chinh_ta.png"
            if os.path.exists(img_path):
                img_p = doc.add_paragraph()
                img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                img_p.paragraph_format.space_before = Pt(4)
                img_p.paragraph_format.space_after = Pt(2)
                img_p.add_run().add_picture(img_path, width=Inches(6.2))
                
                cap = doc.add_paragraph()
                cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                cap.paragraph_format.space_before = Pt(0)
                cap.paragraph_format.space_after = Pt(8)
                cap_run = cap.add_run("Hình 1: Sơ đồ kiến trúc toàn cảnh Hệ thống Đọc chính tả ViHand Grade")
                cap_run.font.name = 'Segoe UI'
                cap_run.font.size = Pt(9.5)
                cap_run.font.italic = True
                cap_run.font.color.rgb = COLOR_MUTED
            i += 1
            continue

        # Đoạn văn thông thường
        if line.strip():
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = 1.25
            parse_inline_formatting(p, line, default_font='Segoe UI', default_size=10.5, default_color=COLOR_DARK)
        
        i += 1

    # Lưu file DOCX
    os.makedirs(os.path.dirname(docx_path), exist_ok=True)
    doc.save(docx_path)
    print(f"[SUCCESS] Đã xuất file Word: {docx_path}")

def convert_docx_to_pdf(docx_path, pdf_path):
    """Sử dụng Microsoft Word COM để chuyển đổi sang PDF chất lượng cao"""
    import win32com.client
    print(f"[INFO] Bắt đầu chuyển đổi DOCX sang PDF bằng MS Word COM: {docx_path}")
    
    # Chuẩn hóa đường dẫn tuyệt đối cho COM
    abs_docx = os.path.abspath(docx_path)
    abs_pdf = os.path.abspath(pdf_path)
    
    word = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        
        doc = word.Documents.Open(abs_docx)
        # 17 là wdExportFormatPDF
        doc.ExportAsFixedFormat(abs_pdf, 17, Item=7, CreateBookmarks=1)
        doc.Close(False)
        print(f"[SUCCESS] Đã xuất file PDF thành công: {abs_pdf}")
        return True
    except Exception as e:
        print(f"[ERROR] Lỗi khi xuất PDF bằng Word COM: {e}")
        return False
    finally:
        if word:
            try:
                word.Quit()
            except Exception:
                pass

if __name__ == '__main__':
    md_file = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\01_Bao_Cao_Tong_Ket_NCKH\Tai_Lieu_Phan_Tich_Toan_Dien_He_Thong_Doc_Chinh_Ta.md"
    docx_file = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\01_Bao_Cao_Tong_Ket_NCKH\Tai_Lieu_Phan_Tich_Toan_Dien_He_Thong_Doc_Chinh_Ta.docx"
    pdf_file = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\01_Bao_Cao_Tong_Ket_NCKH\Tai_Lieu_Phan_Tich_Toan_Dien_He_Thong_Doc_Chinh_Ta.pdf"
    
    build_dictation_document(md_file, docx_file)
    convert_docx_to_pdf(docx_file, pdf_file)
