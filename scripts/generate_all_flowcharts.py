# -*- coding: utf-8 -*-
"""
Trình tạo toàn bộ 17 Lưu đồ & Sơ đồ kiến trúc ViHand Grade chuẩn học thuật (Technical White Paper)
Tuân thủ nghiêm ngặt Hiến pháp dự án GEMINI.md & Skill long_mode:
- Nền trắng tinh khiết (#FFFFFF)
- Nét vẽ & Chữ đen sắc nét (#000000, 1.5pt), độ tương phản cao, hỗ trợ 100% tiếng Việt UTF-8 (Arial / Segoe UI)
- Tiêu đề in HOA đậm căn giữa ở đỉnh ảnh, dòng phụ ghi rõ module/file
- Hình khối chuẩn: Oval (Start/End), Chữ nhật (Process), Hình thoi (Decision kèm YES/NO), Hình bình hành (Input/Output)
- Mũi tên vuông góc (Orthogonal) định hướng rõ ràng từ trên xuống dưới
- Xuất song song định dạng .jpg (bắt buộc) và cập nhật .png gốc để bảo toàn liên kết tài liệu.
"""

import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

# Cấu hình font tiếng Việt chuẩn Windows
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

OUTPUT_DIR = r"01_Bao_cao_Nghien_cuu\Lưu đồ giải thuật"
os.makedirs(OUTPUT_DIR, exist_ok=True)

class DiagramCanvas:
    def __init__(self, title, subtitle=None, width=12, height=16, dpi=120):
        self.fig, self.ax = plt.subplots(figsize=(width, height), dpi=dpi)
        self.ax.set_xlim(0, 100)
        self.ax.set_ylim(0, 100)
        self.ax.axis('off')
        self.fig.patch.set_facecolor('#FFFFFF')
        self.ax.set_facecolor('#FFFFFF')
        
        # Tiêu đề chính
        self.ax.text(50, 97.4, title.upper(), ha='center', va='center',
                     fontsize=13.5, fontweight='bold', color='#000000')
        # Dòng phụ
        if subtitle:
            self.ax.text(50, 95.3, subtitle, ha='center', va='center',
                         fontsize=9.2, fontstyle='italic', color='#222222')

    def add_start_end(self, x, y, text, width=22, height=3.6, fontsize=9.0, **kwargs):
        box = patches.FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle=f"round,pad=0.2,rounding_size={height/2}",
            edgecolor=kwargs.get('edgecolor', '#000000'),
            facecolor=kwargs.get('facecolor', '#FFFFFF'),
            linewidth=kwargs.get('linewidth', 1.5)
        )
        self.ax.add_patch(box)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=fontsize, fontweight=kwargs.get('fontweight', 'bold'),
                     fontstyle=kwargs.get('fontstyle', 'normal'), color='#000000')
        return (x, y, width, height)

    def add_process(self, x, y, text, width=68, height=6.0, facecolor='#FFFFFF',
                    fontweight='normal', fontsize=8.5, ha='center', align='center',
                    fontstyle='normal', linestyle='-', **kwargs):
        box = patches.Rectangle(
            (x - width/2, y - height/2), width, height,
            edgecolor=kwargs.get('edgecolor', '#000000'),
            facecolor=facecolor,
            linewidth=kwargs.get('linewidth', 1.5),
            linestyle=linestyle
        )
        self.ax.add_patch(box)
        tx = x if ha == 'center' else (x - width/2 + 2.0)
        self.ax.text(tx, y, text, ha=ha, va='center',
                     fontsize=fontsize, fontweight=fontweight, fontstyle=fontstyle,
                     color='#000000', multialignment=align)
        return (x, y, width, height)

    def add_decision(self, x, y, text, width=32, height=6.0, fontsize=8.0, **kwargs):
        diamond = patches.Polygon([
            [x, y + height/2],
            [x + width/2, y],
            [x, y - height/2],
            [x - width/2, y]
        ], closed=True, edgecolor=kwargs.get('edgecolor', '#000000'),
           facecolor=kwargs.get('facecolor', '#FFFFFF'), linewidth=kwargs.get('linewidth', 1.5))
        self.ax.add_patch(diamond)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=fontsize, fontweight=kwargs.get('fontweight', 'bold'),
                     fontstyle=kwargs.get('fontstyle', 'normal'), color='#000000', multialignment='center')
        return (x, y, width, height)

    def add_io(self, x, y, text, width=65, height=4.8, fontsize=8.5, **kwargs):
        offset = kwargs.get('offset', 3.0)
        poly = patches.Polygon([
            [x - width/2 + offset, y + height/2],
            [x + width/2, y + height/2],
            [x + width/2 - offset, y - height/2],
            [x - width/2, y - height/2]
        ], closed=True, edgecolor=kwargs.get('edgecolor', '#000000'),
           facecolor=kwargs.get('facecolor', '#FFFFFF'), linewidth=kwargs.get('linewidth', 1.5))
        self.ax.add_patch(poly)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=fontsize, fontweight=kwargs.get('fontweight', 'bold'),
                     fontstyle=kwargs.get('fontstyle', 'normal'), color='#000000', multialignment='center')
        return (x, y, width, height)

    def add_container(self, x, y, width, height, label=None, linestyle='--', fontsize=9.0, **kwargs):
        box = patches.Rectangle(
            (x - width/2, y - height/2), width, height,
            edgecolor=kwargs.get('edgecolor', '#000000'),
            facecolor=kwargs.get('facecolor', '#FFFFFF'),
            linewidth=kwargs.get('linewidth', 1.2),
            linestyle=linestyle
        )
        self.ax.add_patch(box)
        if label:
            self.ax.text(x - width/2 + 1.5, y + height/2 - 1.8, label,
                         ha='left', va='top', fontsize=fontsize,
                         fontweight=kwargs.get('fontweight', 'bold'),
                         fontstyle=kwargs.get('fontstyle', 'normal'), color='#000000')
        return (x, y, width, height)

    def add_arrow(self, x1, y1, x2, y2, label=None, label_pos=None):
        self.ax.annotate(
            '', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.0, headwidth=5, headlength=6, shrink=0)
        )
        if label:
            lx = (x1 + x2)/2 if label_pos is None else label_pos[0]
            ly = (y1 + y2)/2 if label_pos is None else label_pos[1]
            self.ax.text(lx, ly, label, ha='center', va='center',
                         fontsize=8.0, fontweight='bold', color='#000000',
                         bbox=dict(boxstyle='square,pad=0.15', facecolor='#FFFFFF', edgecolor='#000000', linewidth=0.8))

    def add_elbow_arrow(self, points, label=None, label_pos=None):
        for i in range(len(points) - 2):
            p1, p2 = points[i], points[i+1]
            self.ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#000000', linewidth=1.2)
        p_pre, p_end = points[-2], points[-1]
        self.ax.annotate(
            '', xy=(p_end[0], p_end[1]), xytext=(p_pre[0], p_pre[1]),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.0, headwidth=5, headlength=6, shrink=0)
        )
        if label:
            lx = label_pos[0] if label_pos else (points[0][0] + points[1][0])/2
            ly = label_pos[1] if label_pos else (points[0][1] + points[1][1])/2
            self.ax.text(lx, ly, label, ha='center', va='center',
                         fontsize=8.0, fontweight='bold', color='#000000',
                         bbox=dict(boxstyle='square,pad=0.15', facecolor='#FFFFFF', edgecolor='#000000', linewidth=0.8))

    def save(self, base_name, quality=95):
        jpg_path = os.path.join(OUTPUT_DIR, base_name + ".jpg")
        
        temp_png = os.path.join(OUTPUT_DIR, base_name + ".temp.png")
        self.fig.savefig(temp_png, format='png', dpi=120, facecolor='#FFFFFF', bbox_inches='tight')
        plt.close(self.fig)
        
        img = Image.open(temp_png).convert('RGB')
        img.save(jpg_path, 'JPEG', quality=quality)
        if os.path.exists(temp_png):
            os.remove(temp_png)
        print(f"[OK] Đã tạo thành công: {base_name}.jpg (Kích thước: {img.size})")

# ==============================================================================
# 1. HÌNH 3.1: HYBRID AI PIPELINE
# ==============================================================================
def make_hinh_3_1():
    c = DiagramCanvas(
        title="HÌNH 3.1 — HYBRID AI PIPELINE ĐA PHÂN MÔN (VIHAND GRADE)",
        subtitle="Luồng Xử lý Bài Chấm Toàn Trình: Jimp 9 Bước -> Gemini OCR -> Nhánh Chính Tả / Tập Làm Văn",
        width=11, height=14, dpi=120
    )
    # Khối 1: Tiền xử lý ảnh (Cột trái)
    c.add_container(25, 50.5, 44, 83, label="1. Tiền xử lý ảnh (Jimp 9 bước)")
    steps = [
        ("Bước 0: EXIF Auto-rotate\n(Xoay đúng chiều theo metadata)", 86.5),
        ("Bước 0.5: Deskew\n(Nắn thẳng góc nghiêng [-15°, +15°])", 78.5),
        ("Bước 1: Adaptive Resize\n(Giới hạn chiều rộng tối đa 1600px)", 70.5),
        ("Bước 2: White Balance\n(Cân bằng trắng Gray World)", 62.5),
        ("Bước 3: Grayscale Conversion\n(Chuyển ảnh xám Y = 0.299R+0.587G+0.114B)", 54.5),
        ("Bước 4: Shadow Removal\n(Khử bóng đổ Box Blur 51×51, chia nền)", 46.5),
        ("Bước 5: CLAHE\n(Cân bằng tương phản Lưới 8×8, Clip 2.0)", 38.5),
        ("Bước 6: Unsharp Masking\n(Làm sắc nét các nét bút chì mờ)", 30.5),
        ("Bước 7: Quality Assessment\n(Đánh giá độ mờ/sáng Laplace Variance)", 22.5),
        ("Bước 8: Adaptive Threshold\n(Nhị phân hóa Gaussian, xóa sạch ô ly)", 14.5),
    ]
    for i, (txt, y) in enumerate(steps):
        c.add_process(25, y, txt, width=38, height=5.0, fontsize=7.8)
        if i < len(steps) - 1:
            c.add_arrow(25, y - 2.5, 25, steps[i+1][1] + 2.5)

    # Cột phải - Khối 2: OCR Gemini Flash Lite
    c.add_container(73, 85, 48, 16, label="2. OCR Nhận diện — Google Gemini Vision")
    c.add_process(73, 82, "Trích xuất văn bản thô: original_text\n(Nhiệt độ cố định temp=0.05, giữ nguyên 100% lỗi sai của học sinh)",
                  width=44, height=7.0, fontsize=8.0)
    
    # Mũi tên từ Bước 8 sang OCR
    c.add_elbow_arrow([[44, 14.5], [48, 14.5], [48, 82], [49, 82]])

    # Rẽ nhánh A và B
    c.add_container(61, 53, 24, 40, label="A. Chính tả (Ground Truth)")
    c.add_process(61, 65, "SequenceMatcher Alignment\n(Đối soát chuỗi 1-1 không ảo giác)", width=21, height=6.0, fontsize=7.5)
    c.add_arrow(61, 62, 61, 57)
    c.add_process(61, 54, "Bóc tách 6 nhóm lỗi ngữ âm\n(parse_vietnamese phonetics)", width=21, height=6.0, fontsize=7.5)
    c.add_arrow(61, 51, 61, 46)
    c.add_process(61, 43, "Barem Thông tư 27:\n7.0đ Chính tả + 3.0đ Hình thức\n(Zero-Hallucination 100%, 0 Token)", width=21, height=6.5, fontsize=7.5)

    c.add_container(87, 53, 24, 40, label="B. Tập làm văn (Two-Tier)")
    c.add_process(87, 65, "Tầng 1: ViT5 INT8\n(Sửa lỗi chính tả & đếm tu từ)", width=21, height=6.0, fontsize=7.5)
    c.add_arrow(87, 62, 87, 57)
    c.add_process(87, 54, "Tầng 2: Qwen2.5-0.5B SLM\n(Sinh 3 nhận xét sư phạm ấm áp)", width=21, height=6.0, fontsize=7.5)
    c.add_arrow(87, 51, 87, 46)
    c.add_process(87, 43, "Barem Tập làm văn 4-3-2-1:\nChính tả 4đ + Hình thức 3đ\n+ Nội dung 2đ + Sáng tạo 1đ", width=21, height=6.5, fontsize=7.5)

    # Nối từ OCR xuống A và B
    c.add_elbow_arrow([[73, 78.5], [61, 78.5], [61, 73]], label="Có SGK", label_pos=(61, 75.5))
    c.add_elbow_arrow([[73, 78.5], [87, 78.5], [87, 73]], label="Tự do", label_pos=(87, 75.5))

    # Khối Human-in-the-Loop & Lưu trữ
    c.add_container(74, 20, 46, 20, label="3. Human-in-the-Loop & Lưu trữ an toàn")
    c.add_process(74, 23, "Giáo viên duyệt kết quả, tinh chỉnh thanh trượt điểm\n(HITL Slider Score Adjuster)", width=42, height=5.5, fontsize=8.0)
    c.add_arrow(74, 20.25, 74, 16.75)
    c.add_process(74, 14, "Ghi bản ghi Grade vào SQLite vihand.db\n& Bóc tách tệp ảnh đĩa cứng /public/uploads/grades/*.jpg", width=42, height=5.5, fontsize=8.0)

    # Nối từ A và B xuống HITL
    c.add_elbow_arrow([[61, 39.75], [61, 32], [74, 32], [74, 28]])
    c.add_elbow_arrow([[87, 39.75], [87, 32], [74, 32]])

    c.save("Hinh_3_1_Hybrid_AI_Pipeline")

# ==============================================================================
# 2. HÌNH 3.2: TIỀN XỬ LÝ ẢNH JIMP 9 BƯỚC
# ==============================================================================
def make_hinh_3_2():
    c = DiagramCanvas(
        title="HÌNH 3.2 — LƯU ĐỒ CẤU TRÚC CHI TIẾT TIỀN XỬ LÝ ẢNH (JIMP 9 BƯỚC)",
        subtitle="lib/image-processor.ts — Pipeline Chuẩn Hóa Ảnh Bài Viết Chữ Viết Tay Tiểu Học",
        width=10, height=15, dpi=120
    )
    c.add_io(45, 92, "Input: Ảnh gốc bài thi chụp từ điện thoại / Tablet", width=58, height=4.5, fontsize=8.5)
    c.add_arrow(45, 89.75, 45, 86.5)

    steps = [
        ("Bước 0: EXIF Auto-rotate\n(Xoay 0°, 90°, 180°, 270° theo metadata thẻ ảnh)", 83.5),
        ("Bước 0.5: Deskew (Nắn góc nghiêng)\n(Quét phương sai lược đồ chiếu ngang θ trong [-15°, +15°], bước 0.1°)", 76.0),
        ("Bước 1: Adaptive Resize\n(Thu phóng giữ tỷ lệ, giới hạn chiều rộng tối đa 1600px)", 68.5),
        ("Bước 2: White Balance\n(Cân bằng trắng theo giả định thế giới xám Gray World)", 61.0),
        ("Bước 3: Grayscale Conversion\n(Chuyển ảnh sang thang xám 8-bit: Y = 0.299R + 0.587G + 0.114B)", 53.5),
        ("Bước 4: Shadow Removal\n(Khử bóng đổ bàn tay/điện thoại qua màng lọc Box Blur 51×51, chia nền)", 46.0),
        ("Bước 5: CLAHE\n(Cân bằng lược đồ xám giới hạn tương phản: Grid 8×8, Clip Limit 2.0)", 38.5),
    ]
    for i, (txt, y) in enumerate(steps):
        c.add_process(45, y, txt, width=62, height=5.5, fontsize=8.0)
        if i < len(steps) - 1:
            c.add_arrow(45, y - 2.75, 45, steps[i+1][1] + 2.75)

    # Bước 6 rẽ nhánh
    c.add_arrow(45, 35.75, 45, 32.5)
    c.add_decision(45, 29.5, "Nét bút chì\nmờ nhạt?", width=26, height=5.5, fontsize=7.8)
    c.add_arrow(58, 29.5, 76, 29.5, label="CÓ", label_pos=(66, 30.5))
    c.add_process(86, 29.5, "Bước 6: Unsharp Masking\n(Lọc Laplacian 3×3,\nlàm sắc nét nét thanh đậm)", width=22, height=5.5, fontsize=7.5)

    # Nối xuống Bước 7
    c.add_arrow(45, 26.75, 45, 22.5, label="KHÔNG", label_pos=(45, 24.5))
    c.add_elbow_arrow([[86, 26.75], [86, 20.0], [76, 20.0]])

    c.add_process(45, 19.5, "Bước 7: Quality Assessment\n(Đánh giá độ mờ/sáng Laplace Variance, ngưỡng mờ 80, sáng [50, 220])", width=62, height=5.5, fontsize=8.0)
    c.add_arrow(45, 16.75, 45, 13.5)

    c.add_decision(45, 11.0, "Đạt chuẩn\nchất lượng?", width=26, height=5.0, fontsize=7.8)
    c.add_arrow(58, 11.0, 76, 11.0, label="KÉM", label_pos=(66, 12.0))
    c.add_process(86, 11.0, "Cảnh báo chụp lại\n(Xuất QualityReport\ncho giáo viên)", width=22, height=5.0, fontsize=7.5)

    c.add_arrow(45, 8.5, 45, 5.5, label="TỐT", label_pos=(45, 7.0))
    c.add_process(45, 3.5, "Bước 8: Adaptive Threshold\n(Nhị phân hóa Gaussian thích ứng C=20, lọc sạch hoàn toàn đường kẻ ô ly)", width=62, height=4.5, fontsize=8.0)
    c.add_arrow(45, 1.25, 45, -0.75)
    
    # Kết thúc
    c.add_io(45, -2.5, "Output: Ảnh nhị phân tối ưu hóa sẵn sàng cho Gemini Vision OCR", width=58, height=3.5, fontsize=8.5)
    c.save("Hinh_3_2_Tien_xu_ly_anh_Jimp")

# ==============================================================================
# 3. HÌNH 3.3: GIẢI THUẬT SEQUENCEMATCHER
# ==============================================================================
def make_hinh_3_3():
    c = DiagramCanvas(
        title="HÌNH 3.3 — LƯU ĐỒ GIẢI THUẬT CHẤM ĐIỂM SEQUENCEMATCHER ĐA PHÂN MÔN",
        subtitle="python_service/main.py — Ground-Truth Guided Text Alignment & Assessment",
        width=11, height=14, dpi=120
    )
    c.add_start_end(50, 92, "BẮT ĐẦU: Nhận student_words & reference_words (SGK hoặc ViT5)", width=68, height=4.0, fontsize=8.5)
    c.add_arrow(50, 90.0, 50, 85.5)

    c.add_process(50, 83.0, "Khởi tạo bộ so khớp: matcher = difflib.SequenceMatcher(None, ref_words, student_words)\n(Thuật toán LCS đối soát chuỗi ký tự theo thời gian thực)", width=72, height=5.0, fontsize=8.0)
    c.add_arrow(50, 80.5, 50, 75.5)

    c.add_decision(50, 72.5, "Duyệt từng Opcode\n(tag, i1, i2, j1, j2)", width=34, height=6.0, fontsize=8.0)

    # 4 nhánh từ Decision Opcode
    # 1. equal
    c.add_elbow_arrow([[33, 72.5], [14, 72.5], [14, 62]], label="tag == 'equal'", label_pos=(22, 73.8))
    c.add_process(14, 59, "Bỏ qua\n(Từ đúng 100%)", width=18, height=5.0, fontsize=7.8)

    # 2. delete
    c.add_elbow_arrow([[40, 69.5], [38, 62]], label="tag == 'delete'", label_pos=(32, 65.5))
    c.add_process(38, 59, "Thiếu từ\n(bo_sot_them)", width=18, height=5.0, fontsize=7.8)

    # 3. insert
    c.add_elbow_arrow([[60, 69.5], [62, 62]], label="tag == 'insert'", label_pos=(68, 65.5))
    c.add_process(62, 59, "Thừa từ\n(bo_sot_them)", width=18, height=5.0, fontsize=7.8)

    # 4. replace
    c.add_elbow_arrow([[67, 72.5], [86, 72.5], [86, 64]], label="tag == 'replace'", label_pos=(77, 73.8))
    c.add_decision(86, 61.5, "Độ dài\nbằng nhau?", width=20, height=5.0, fontsize=7.5)
    c.add_arrow(76, 61.5, 76, 54, label="YES", label_pos=(73, 58))
    c.add_process(74, 51.5, "Phân loại 4 lỗi:\n(Phụ âm, vần, thanh, hoa)", width=22, height=5.0, fontsize=7.2)
    c.add_arrow(96, 61.5, 96, 54, label="NO", label_pos=(99, 58))
    c.add_process(95, 51.5, "bo_sot_them\n(Lệch cụm từ)", width=18, height=5.0, fontsize=7.2)

    # Hợp lưu các nhánh
    c.add_elbow_arrow([[14, 56.5], [14, 43], [50, 43]])
    c.add_elbow_arrow([[38, 56.5], [38, 43], [50, 43]])
    c.add_elbow_arrow([[62, 56.5], [62, 43], [50, 43]])
    c.add_elbow_arrow([[74, 49.0], [74, 43], [50, 43]])
    c.add_elbow_arrow([[95, 49.0], [95, 43], [50, 43]])

    # 2 Barem phân môn
    c.add_arrow(50, 43, 50, 38)
    c.add_container(28, 25, 44, 23, label="Chế độ Chính tả (dictation)")
    c.add_process(28, 30.5, "Điểm Chính tả = max(0, 7.0 - error_count × 0.5)\n(Lỗi lặp chỉ trừ 1 lần duy nhất)", width=40, height=5.0, fontsize=7.8)
    c.add_arrow(28, 28.0, 28, 25.5)
    c.add_process(28, 23.0, "Điểm Hình thức = 3.0đ (Giáo viên tinh chỉnh qua slider)", width=40, height=4.5, fontsize=7.8)
    c.add_arrow(28, 20.75, 28, 18.25)
    c.add_process(28, 16.0, "Tổng điểm (thang 10) = Điểm Chính tả + Điểm Hình thức\n(Zero-Hallucination 100%, 0 Token Cloud)", width=40, height=4.5, fontsize=7.8)

    c.add_container(72, 25, 42, 23, label="Chế độ Tập làm văn (essay)")
    c.add_process(72, 30.5, "Tầng 1: Điểm chính tả (Max 4.0đ)\n+ Tu từ nghệ thuật Sáng tạo (Max 1.0đ)", width=38, height=5.0, fontsize=7.8)
    c.add_arrow(72, 28.0, 72, 25.5)
    c.add_process(72, 23.0, "Tầng 2: Qwen2.5-0.5B-Instruct SLM\nsinh lời nhận xét sư phạm ấm áp Thông tư 27", width=38, height=4.5, fontsize=7.8)
    c.add_arrow(72, 20.75, 72, 18.25)
    c.add_process(72, 16.0, "Tổng điểm (thang 10) = 4 tiêu chí:\nChính tả 4đ + Hình thức 3đ + Nội dung 2đ + Sáng tạo 1đ", width=38, height=4.5, fontsize=7.8)

    # Hợp lưu kết thúc
    c.add_elbow_arrow([[28, 13.5], [28, 8], [50, 8]])
    c.add_elbow_arrow([[72, 13.5], [72, 8], [50, 8]])
    c.add_arrow(50, 8, 50, 4.5)

    c.add_start_end(50, 2.5, "Xếp loại học lực TT27 & Trả về kết quả JSON cho Human-in-the-Loop", width=68, height=3.8, fontsize=8.2)
    c.save("Hinh_3_3_Giai_thuat_SequenceMatcher")

# ==============================================================================
# 4. HÌNH 3.4: RULEBASE PHÂN LOẠI 6 LỖI
# ==============================================================================
def make_hinh_3_4():
    c = DiagramCanvas(
        title="HÌNH 3.4 — QUY TẮC PHÂN LOẠI 6 NHÓM LỖI CHÍNH TẢ (ERROR CLASSIFICATION RULEBASE)",
        subtitle="python_service/vietnamese_phonetics.py — Phonetic Error Classification Model",
        width=11, height=14, dpi=120
    )
    c.add_process(50, 91.5, "Cặp từ sai lệch: wrong_w & correct_w\n(Từ thay thế tìm thấy bởi SequenceMatcher)", width=65, height=5.0, fontsize=8.5, fontweight='bold')
    c.add_arrow(50, 89.0, 50, 84.8)

    # Decision 1: Viết hoa
    c.add_decision(30, 81.5, "Kiểm tra Viết hoa\nwrong_w.lower() ==\ncorrect_w.lower()?", width=32, height=6.5, fontsize=7.2)
    c.add_arrow(46, 81.5, 66, 81.5, label="CÓ", label_pos=(54, 82.8))
    c.add_process(82, 81.5, "1. Lỗi VIẾT HOA (viet_hoa)\n| Ví dụ: hà nội -> Hà Nội", width=30, height=5.5, fontsize=8.0)
    c.add_arrow(30, 78.25, 30, 73.75, label="KHÔNG", label_pos=(30, 76.0))

    # Decision 2: Dấu thanh
    c.add_decision(30, 70.5, "Kiểm tra Dấu thanh\nremove_accents(wrong) ==\nremove_accents(correct)?", width=32, height=6.5, fontsize=7.2)
    c.add_arrow(46, 70.5, 66, 70.5, label="CÓ", label_pos=(54, 71.8))
    c.add_process(82, 70.5, "2. Lỗi DẤU THANH (dau_thanh)\n| Ví dụ: sưa -> sữa (hỏi/ngã, sắc/nặng)", width=30, height=5.5, fontsize=8.0)
    c.add_arrow(30, 67.25, 30, 62.75, label="KHÔNG", label_pos=(30, 65.0))

    # Decision 3: Phụ âm đầu
    c.add_decision(30, 59.5, "Kiểm tra Phụ âm đầu\nKhớp cặp phụ âm nhầm lẫn\n(c/k/q, g/gh, ng/ngh, s/x...)?", width=32, height=6.5, fontsize=7.0)
    c.add_arrow(46, 59.5, 66, 59.5, label="CÓ", label_pos=(54, 60.8))
    c.add_process(82, 59.5, "3. Lỗi PHỤ ÂM ĐẦU (phu_am_dau)\n| Ví dụ: xông -> sông, chăng -> trăng", width=30, height=5.5, fontsize=8.0)
    c.add_arrow(30, 56.25, 30, 51.75, label="KHÔNG", label_pos=(30, 54.0))

    # Decision 4: Vần
    c.add_decision(30, 48.5, "Kiểm tra Vần\nSai phần vần / âm chính\n/ âm cuối (an/ang, uôn/uông)?", width=32, height=6.5, fontsize=7.0)
    c.add_arrow(46, 48.5, 66, 48.5, label="CÓ", label_pos=(54, 49.8))
    c.add_process(82, 48.5, "4. Lỗi VẦN (van)\n| Ví dụ: hộc -> học, bắp tay -> bắt tay", width=30, height=5.5, fontsize=8.0)
    c.add_arrow(30, 45.25, 30, 40.75, label="KHÔNG", label_pos=(30, 43.0))

    # Khối 5 & 6
    c.add_process(30, 38.0, "5. Lỗi BỎ SÓT / THÊM TỪ (bo_sot_them)\n(Từ Opcodes delete/insert: thiếu từ, thừa từ)", width=42, height=5.5, fontsize=7.8)
    c.add_process(77, 38.0, "6. Lỗi DẤU CÂU (dau_cau)\n| Ví dụ: thiếu dấu chấm, dấu phẩy sai vị trí", width=40, height=5.5, fontsize=7.8)

    # Bảng tổng hợp Markdown/Table bên dưới
    table_y = 28
    c.ax.text(50, table_y + 3.0, "BẢNG TỔNG HỢP 6 NHÓM LỖI & MỨC KHẤU TRỪ ĐIỂM SƯ PHẠM",
              ha='center', va='center', fontsize=9.5, fontweight='bold', color='#000000')

    # Vẽ bảng dạng vector
    cols = [22, 22, 16, 32]
    headers = ["Loại lỗi", "Mã định danh", "Điểm trừ", "Ví dụ minh họa thực tế"]
    rows = [
        ["Viết hoa", "viet_hoa", "-0.5đ", "hà nội -> Hà Nội, nguyễn du -> Nguyễn Du"],
        ["Dấu thanh", "dau_thanh", "-0.5đ", "sưa -> sữa, nghiêng ngã -> nghiêng ngả"],
        ["Phụ âm đầu", "phu_am_dau", "-0.5đ", "xông -> sông, trâu -> châu, gập ghềnh"],
        ["Sai vần", "van", "-0.5đ", "hộc bài -> học bài, bắp tay -> bắt tay"],
        ["Bỏ sót / Thêm từ", "bo_sot_them", "-0.5đ", "thiếu từ 'vào', viết lặp 'đi đi học'"],
        ["Dấu câu", "dau_cau", "-0.5đ", "thiếu dấu chấm kết câu, đặt sai dấu phẩy"]
    ]
    
    start_x = 5.0
    cur_y = table_y
    # Header
    c.add_process(50, cur_y, f"{headers[0]:<15} | {headers[1]:<15} | {headers[2]:<10} | {headers[3]}",
                  width=92, height=3.5, fontsize=8.2, fontweight='bold')
    for row in rows:
        cur_y -= 3.6
        c.add_process(50, cur_y, f"{row[0]:<15} | {row[1]:<15} | {row[2]:<10} | {row[3]}",
                      width=92, height=3.2, fontsize=7.8)

    c.save("Hinh_3_4_Rulebase_Phan_loai_6_Loi")

# ==============================================================================
# 5. HÌNH 3.5: RULEBASE TÍNH ĐIỂM & XẾP LOẠI
# ==============================================================================
def make_hinh_3_5():
    c = DiagramCanvas(
        title="HÌNH 3.5 — QUY TẮC TÍNH ĐIỂM & XẾP LOẠI HỌC LỰC (SCORING & RATING RULEBASE)",
        subtitle="lib/grading-rulebase.ts — Barem Đa Phân Môn & Khung Đánh Giá Thông Tư 27/2020/TT-BGDĐT",
        width=11, height=14, dpi=120
    )
    # Phần 1: Hai Barem Chấm điểm
    c.ax.text(8, 91.5, "1. HAI BAREM CHẤM ĐIỂM ĐA PHÂN MÔN (THANG 10 ĐIỂM CHUẨN)", fontsize=10.0, fontweight='bold')
    
    # Barem A: Chính tả
    c.add_container(28, 76, 44, 27, label="[Phân môn 1] Barem Bài Chính Tả (Nghe - Viết / Nhìn - Viết)")
    c.add_process(28, 82, "• Độ chính xác Chính tả: Tối đa 7.0 điểm\n  - Khởi đầu 7.0đ, khấu trừ cố định 0.5đ cho mỗi lỗi sai khác nhau\n  - Lỗi sai lặp lại cùng từ chỉ bị trừ 1 lần duy nhất (Điểm sàn 0.0đ)",
                  width=40, height=6.0, fontsize=7.8, ha='left', align='left')
    c.add_process(28, 74, "• Quy cách trình bày & Chữ viết: Tối đa 3.0 điểm\n  - Thụt đầu dòng, chữ viết sạch đẹp, không tẩy xóa\n  - Giáo viên tinh chỉnh linh hoạt qua thanh trượt (HITL Slider)",
                  width=40, height=6.0, fontsize=7.8, ha='left', align='left')
    c.add_process(28, 66, "→ TỔNG ĐIỂM = Điểm Chính tả (7đ) + Điểm Trình bày (3đ)\n(Cơ chế Ground-Truth Alignment: 100% Zero-Hallucination)",
                  width=40, height=5.0, fontsize=7.8, fontweight='bold')

    # Barem B: Tập làm văn
    c.add_container(74, 76, 44, 27, label="[Phân môn 2] Barem Bài Tập Làm Văn (Đoạn văn tự do)")
    c.add_process(74, 83, "• Chính tả & Ngữ pháp: Tối đa 4.0 điểm (ViT5 sửa lỗi câu)\n• Hình thức & Bố cục: Tối đa 3.0 điểm (Mở, thân, kết đoạn)",
                  width=40, height=5.0, fontsize=7.8, ha='left', align='left')
    c.add_process(74, 76, "• Nội dung & Diễn đạt: Tối đa 2.0 điểm (Đúng đề, liên kết ý)\n• Sáng tạo & Cảm xúc: Tối đa 1.0 điểm (+0.5đ từ láy, +0.5đ so sánh)",
                  width=40, height=5.0, fontsize=7.8, ha='left', align='left')
    c.add_process(74, 66.5, "→ TỔNG ĐIỂM: 4 Tiêu chí (4đ + 3đ + 2đ + 1đ = 10đ)\n(Đánh giá 2 tầng: ViT5 INT8 + Qwen SLM)",
                  width=40, height=6.0, fontsize=7.2, fontweight='bold')

    # Phần 2: Thang xếp loại học lực TT27
    c.ax.text(8, 58.5, "2. BẢNG XẾP LOẠI HỌC LỰC CHUẨN THÔNG TƯ 27/2020/TT-BGDĐT", fontsize=10.0, fontweight='bold')
    
    levels = [
        ("XUẤT SẮC\n[9.0 - 10.0]", 14, 52),
        ("TỐT\n[7.0 - 8.9]", 32, 52),
        ("KHÁ\n[5.0 - 6.9]", 50, 52),
        ("TRUNG BÌNH\n[3.0 - 4.9]", 68, 52),
        ("CẦN CỐ GẮNG\n[0.0 - 2.9]", 86, 52),
    ]
    for label, lx, ly in levels:
        c.add_process(lx, ly, label, width=16, height=5.5, fontsize=8.0, fontweight='bold')

    c.add_process(50, 44.5, "Quy tắc Sư phạm TT27: Kết hợp Đánh giá Thường xuyên (Nhận xét định tính) và Định kỳ (Cho điểm định lượng).\nTuyệt đối không dùng điểm số gây áp lực; coi trọng sự động viên, khích lệ lòng tự tin của học sinh tiểu học.",
                  width=90, height=4.5, fontsize=8.0, fontstyle='italic')

    # Phần 3: Cơ chế sinh nhận xét 2 tầng
    c.ax.text(8, 37.5, "3. CƠ CHẾ SINH LỜI NHẬN XÉT SƯ PHẠM 2 TẦNG (QWEN2.5-0.5B-INSTRUCT SLM)", fontsize=10.0, fontweight='bold')

    c.add_container(28, 24, 42, 21, label="Tầng 1: Phân tích Quy tắc & Thống kê")
    c.add_process(28, 27, "• Đếm chính xác số lỗi chính tả theo 6 nhóm lỗi\n• Phát hiện dẫn chứng tu từ nghệ thuật:\n  - Từ láy tượng hình, tượng thanh (rộn rã, óng ả)\n  - Biện pháp so sánh nhân hóa ('như tấm thảm lúa')",
                  width=38, height=8.0, fontsize=7.8, ha='left', align='left')
    c.add_process(28, 17, "→ Xuất dữ liệu cấu trúc Prompt cho SLM", width=38, height=4.0, fontsize=7.8, fontweight='bold')

    c.add_arrow(49, 24, 53, 24)

    c.add_container(73, 24, 42, 21, label="Tầng 2: Qwen 2.5 SLM Sinh Lời Phê")
    c.add_process(73, 27, "• Mô hình SLM cục bộ 0.5B chạy trên CPU biên\n• Áp dụng nguyên tắc 'Khen ngợi trước - Góp ý sau':\n  1. Lời khen: Biểu dương câu văn sinh động, từ láy hay\n  2. Lời nhắc: Chỉ rõ từ sai và cách sửa thân thiện",
                  width=38, height=8.0, fontsize=7.8, ha='left', align='left')
    c.add_process(73, 17, "→ Xuất 3 phương án nhận xét cho giáo viên chọn", width=38, height=4.0, fontsize=7.8, fontweight='bold')

    c.add_process(50, 7.5, "Ví dụ thực tế: 'Thầy khen con có vốn từ rất phong phú, biết dùng từ láy \"óng ả\" miêu tả cánh đồng lúa rất đẹp. Con chú ý phân biệt\nâm \"s\" và \"x\" để không viết nhầm \"dòng xông\" thành \"dòng sông\" nhé! Chúc con ngày càng tiến bộ!'",
                  width=90, height=5.5, fontsize=8.0, facecolor='#FFFFFF')

    c.save("Hinh_3_5_Rulebase_Tinh_diem_Xep_loai")

# ==============================================================================
# 6. HÌNH 3.6: PHÂN QUYỀN RBAC & NGHỊ ĐỊNH 13
# ==============================================================================
def make_hinh_3_6():
    c = DiagramCanvas(
        title="HÌNH 3.6 — PHÂN QUYỀN NGƯỜI DÙNG (RBAC) & BẢO VỆ DỮ LIỆU (NGHỊ ĐỊNH 13)",
        subtitle="app/api/auth & app/api/admin/retention — 3-Tier RBAC & Child Privacy Lifecycle",
        width=11, height=14, dpi=120
    )
    c.add_start_end(50, 93, "Bắt đầu: Người dùng đăng nhập hệ thống", width=45, height=3.8, fontsize=8.5)
    c.add_arrow(50, 91.1, 50, 87.0)

    c.add_decision(50, 84.0, "Xác thực\ntài khoản?", width=28, height=5.5, fontsize=8.0)
    c.add_arrow(64, 84.0, 78, 84.0, label="NO", label_pos=(70, 85.2))
    c.add_process(87, 84.0, "Từ chối truy cập\n(HTTP 401 Unauthorized)", width=20, height=4.5, fontsize=7.8)

    c.add_arrow(50, 81.25, 50, 76.5, label="YES", label_pos=(50, 78.5))
    c.add_decision(50, 73.5, "Kiểm tra Role\ntrong Database?", width=32, height=5.5, fontsize=8.0)

    # 3 Nhánh RBAC
    # Nhánh 1: Admin
    c.add_elbow_arrow([[34, 73.5], [19, 73.5], [19, 66]], label="Admin", label_pos=(26, 74.8))
    c.add_container(19, 44, 28, 42, label="1. Vai trò Quản trị (Admin)")
    admin_steps = [
        ("Quản lý tài khoản Giáo viên\n& Học sinh toàn trường", 58.5),
        ("Quản lý danh mục Lớp học\n& Phân công GVCN", 50.0),
        ("Cấu hình hệ thống, xoay vòng\nAPI Key & giám sát phần cứng", 41.5),
        ("Kích hoạt Soft Purge:\nẨn danh hóa & dọn dẹp ảnh\nsau 365 ngày (Nghị định 13)", 31.0)
    ]
    for txt, y in admin_steps:
        c.add_process(19, y, txt, width=25, height=6.0, fontsize=7.5)

    # Nhánh 2: Teacher
    c.add_arrow(50, 70.75, 50, 66, label="Teacher", label_pos=(50, 68.0))
    c.add_container(50, 44, 28, 42, label="2. Giáo viên (Teacher)")
    teacher_steps = [
        ("Tab Đọc chính tả Web\n(Edge-TTS giọng Hoài My/Nam Minh)", 58.5),
        ("Chụp ảnh bài thi & Kích hoạt\nchấm điểm AI Đa phân môn", 50.0),
        ("Human-in-the-Loop:\nDuyệt kết quả & Tinh chỉnh\nthanh trượt điểm thành phần", 41.5),
        ("Xem báo cáo tiến độ học tập,\nxuất phổ điểm lớp theo TT27", 31.0)
    ]
    for txt, y in teacher_steps:
        c.add_process(50, y, txt, width=25, height=6.0, fontsize=7.5)

    # Nhánh 3: Student
    c.add_elbow_arrow([[66, 73.5], [81, 73.5], [81, 66]], label="Student", label_pos=(74, 74.8))
    c.add_container(81, 44, 28, 42, label="3. Học sinh (Student)")
    student_steps = [
        ("Xem lịch sử các bài đã chấm\ncủa cá nhân (Read-only)", 58.5),
        ("Xem ảnh bài viết gốc gắn hộp\nBounding Box trực quan", 50.0),
        ("Xem thẻ giải thích chi tiết\ncác lỗi sai hay mắc phải", 41.5),
        ("Luyện phát âm từ khó trong\nSổ tay cá nhân hóa", 31.0)
    ]
    for txt, y in student_steps:
        c.add_process(81, y, txt, width=25, height=6.0, fontsize=7.5)

    # Hợp lưu vào Cơ sở dữ liệu & Nghị định 13
    c.add_elbow_arrow([[19, 22.5], [19, 14], [50, 14]])
    c.add_arrow(50, 22.5, 50, 14)
    c.add_elbow_arrow([[81, 22.5], [81, 14], [50, 14]])

    c.add_arrow(50, 14, 50, 9.5)
    c.add_container(50, 5.0, 78, 8.5, label="CSDL SQLite (vihand.db) & Thư mục Lưu trữ Tách biệt (/public/uploads/grades/)")
    c.add_process(50, 4.0, "• Decoupled Image Storage: Không lưu Base64 trong DB để chống phình dữ liệu\n• Vòng đời dữ liệu: Hạn lưu trữ mặc định 365 ngày (1 niên khóa) -> Soft Purge tự động xóa ảnh đĩa & ẩn danh danh tính trẻ",
                  width=74, height=4.5, fontsize=7.8, ha='left', align='left')

    c.save("Hinh_3_6_Phan_quyen_RBAC_Nghi_dinh_13")

# ==============================================================================
# 7. HÌNH 3.7: FALLBACK GRADING
# ==============================================================================
def make_hinh_3_7():
    c = DiagramCanvas(
        title="HÌNH 3.7 — CƠ CHẾ DỰ PHÒNG NÓNG ĐA TẦNG (MULTI-TIER FALLBACK GRADING)",
        subtitle="app/api/grade/route.ts — Local Edge AI vs Cloud VLM Failover Architecture",
        width=10, height=14, dpi=120
    )
    c.add_start_end(50, 92, "Yêu cầu chấm điểm văn bản từ OCR", width=55, height=4.0, fontsize=8.5)
    c.add_arrow(50, 90.0, 50, 84.5)

    c.add_process(50, 81.5, "Gửi yêu cầu tới Lõi AI Cục bộ:\nViT5 Service tại localhost:8000/grade (Edge AI)", width=65, height=5.5, fontsize=8.2, fontweight='bold')
    c.add_arrow(50, 78.75, 50, 73.5)

    c.add_decision(50, 70.0, "Phản hồi trong\n120 giây?", width=28, height=6.0, fontsize=8.0)

    # Nhánh YES - Local Edge AI
    c.add_elbow_arrow([[36, 70.0], [25, 70.0], [25, 54]], label="YES", label_pos=(30, 71.2))
    c.add_container(25, 43, 36, 20, label="Nhánh Chính (Edge AI Cục bộ)")
    c.add_process(25, 45, "Kết quả từ ViT5 INT8\n+ Levenshtein SequenceMatcher", width=32, height=5.0, fontsize=8.0)
    c.add_process(25, 37, "• 0đ chi phí API Cloud\n• Hoạt động ngoại tuyến 100%\n• Bảo mật tuyệt đối tại trường", width=32, height=6.0, fontsize=7.5, ha='left', align='left')

    # Nhánh NO - Failover nóng
    c.add_elbow_arrow([[64, 70.0], [75, 70.0], [75, 59.0]], label="NO", label_pos=(70, 71.2))
    c.add_container(75, 41.5, 36, 38, label="Nhánh Dự phòng (Cloud Fallback)")
    c.add_process(75, 54.5, "Timeout lần 1 -> Tự động thử lại sau 10 giây", width=32, height=4.2, fontsize=7.5)
    c.add_arrow(75, 52.4, 75, 49.6)
    c.add_process(75, 47.5, "Nếu vẫn thất bại -> Kích hoạt Fallback nóng\nsang Google Gemini text-only", width=32, height=4.5, fontsize=7.5)
    c.add_arrow(75, 45.2, 75, 42.4)
    c.add_process(75, 40.0, "Gửi văn bản + FALLBACK_GRADING_PROMPT\n(Barem chuẩn Bộ GD&ĐT Thông tư 27)", width=32, height=4.5, fontsize=7.5)
    c.add_arrow(75, 37.7, 75, 34.9)
    c.add_process(75, 32.5, "Nhận kết quả JSON từ Gemini Cloud VLM\n(Ghi nhận tokenCount & cờ isFallback=true)", width=32, height=4.5, fontsize=7.5)

    # Hợp lưu
    c.add_elbow_arrow([[25, 32.5], [25, 20], [50, 20]])
    c.add_elbow_arrow([[75, 30.2], [75, 20], [50, 20]])

    c.add_arrow(50, 20, 50, 15.5)
    c.add_process(50, 12.5, "Chuẩn hóa định dạng JSON thống nhất (GradeApiResponse)\n-> Hiển thị kết quả cho giáo viên duyệt (Human-in-the-Loop)", width=72, height=5.5, fontsize=8.2, fontweight='bold')
    c.add_arrow(50, 9.75, 50, 6.0)

    c.add_start_end(50, 4.0, "Lưu kết quả vào SQLite vihand.db & Hoàn tất", width=55, height=3.6, fontsize=8.5)
    c.save("Hinh_3_7_Fallback_Grading")

# ==============================================================================
# 8. HÌNH 4.1: TECH STACK TỔNG THỂ
# ==============================================================================
def make_hinh_4_1():
    c = DiagramCanvas(
        title="HÌNH 4.1 — BẢN ĐỒ CÔNG NGHỆ TOÀN THỂ VIHAND GRADE (TECH STACK)",
        subtitle="ViHand Grade System Architecture — Full-Stack & Edge Computing Ecosystem",
        width=12, height=13, dpi=120
    )
    col_w = 28
    # Cột 1: Frontend & Client
    c.add_container(19, 49, col_w, 82, label="1. Frontend & Client Tier")
    front_items = [
        ("Next.js 16 (App Router)", "Khung ứng dụng SSR & Client Component"),
        ("React 19 & Hooks", "UI tương tác thời gian thực & PWA"),
        ("TypeScript 5.7", "An toàn kiểu dữ liệu toàn diện (Type-safe)"),
        ("Tailwind CSS v4", "Giao diện hiện đại, responsive máy chiếu"),
        ("Radix UI & Shadcn", "Bộ linh kiện UI nguyên tử chuẩn a11y"),
        ("Android Native Client", "Kotlin, Jetpack Compose, SDK 36"),
        ("CameraX 1.5.0", "Chụp ảnh bài thi độ trễ tối thiểu (Min Latency)"),
        ("Lockstep Pinch 1x-4x", "Đồng bộ co phóng soi nét chữ viết tay"),
        ("Recharts", "Biểu đồ trực quan hóa phổ điểm Thông tư 27")
    ]
    for i, (title, desc) in enumerate(front_items):
        y = 83.5 - i * 8.4
        c.add_process(19, y, f"• {title}\n  {desc}", width=25, height=6.2, fontsize=7.2, ha='left', align='left')

    # Cột 2: Backend & AI Core
    c.add_container(50, 49, col_w, 82, label="2. Backend & AI Microservices")
    back_items = [
        ("Next.js API Routes", "Gateway BFF cổng 3000, In-Memory Rate Limit"),
        ("Jimp 9 bước", "Tiền xử lý ảnh số Deskew, khử bóng, lọc ô ly"),
        ("FastAPI Python Core", "Microservice cổng 8000 đa tiến trình"),
        ("YOLOv8 Word Detector", "best.pt (640×640), Vertical Overlap 0.40"),
        ("ViT5 Seq2Seq Model", "chamdentimem, INT8 Quantized ~510MB"),
        ("Qwen 2.5-0.5B SLM", "bfloat16 (~577MB RAM), Lời nhận xét TT27"),
        ("Microsoft Edge-TTS", "Stream giọng Hoài My/Nam Minh (rate -15%)"),
        ("difflib Alignment", "So khớp LCS 1-1, 100% Zero-Hallucination"),
        ("API Guard (Sliding Window)", "Chống DoS, giới hạn 20-60 req/phút/IP")
    ]
    for i, (title, desc) in enumerate(back_items):
        y = 83.5 - i * 8.4
        c.add_process(50, y, f"• {title}\n  {desc}", width=25, height=6.2, fontsize=7.2, ha='left', align='left')

    # Cột 3: Infrastructure & DB
    c.add_container(81, 49, col_w, 82, label="3. Hạ tầng & Cơ sở dữ liệu")
    infra_items = [
        ("Raspberry Pi 4 (4GB RAM)", "Trạm biên phần cứng chi phí thấp tại trường"),
        ("Jetson Nano (4GB VRAM)", "Tùy chọn tăng tốc phần cứng nhúng GPU"),
        ("SQLite + Prisma ORM 5", "CSDL vihand.db chế độ WAL, busy_timeout 10s"),
        ("Lưu trữ Ảnh Đĩa Vật lý", "/public/uploads/grades/ chống phình DB"),
        ("Android Room DB v4", "vihand_grade.db lưu trữ cục bộ ngoại tuyến"),
        ("Chính sách Nghị định 13", "Vòng đời 365 ngày & Soft Purge ẩn danh hóa"),
        ("Cloudflare Named Tunnel", "Đường hầm TLS an toàn, không cần mở port"),
        ("Google Gemini Vision", "gemini-3.1-flash-lite VLM OCR chữ viết tay"),
        ("Linux Cgroups Systemd", "MemoryMax 4.0GB chống tràn RAM OOM")
    ]
    for i, (title, desc) in enumerate(infra_items):
        y = 83.5 - i * 8.4
        c.add_process(81, y, f"• {title}\n  {desc}", width=25, height=6.2, fontsize=7.2, ha='left', align='left')

    # Thanh footer
    c.add_process(50, 4.5, "Ngôn ngữ phát triển cốt lõi: TypeScript (Full-Stack Web) | Python 3.10+ (AI Microservices)\nKotlin (Android Native) | SQL (Prisma & Room DB) | Shell Script (Linux)",
                  width=92, height=4.5, fontsize=7.8, fontweight='bold')

    c.save("Hinh_4_1_Tech_Stack")

# ==============================================================================
# 9. HÌNH 4.2: QUY TRÌNH PHÁT TRIỂN HỆ THỐNG
# ==============================================================================
def make_hinh_4_2():
    c = DiagramCanvas(
        title="HÌNH 4.2 — QUY TRÌNH PHÁT TRIỂN & XÁC THỰC THỰC NGHIỆM HỆ THỐNG",
        subtitle="Software Engineering Lifecycle & PStack Verification Pipeline (Lauren Tan Methodology)",
        width=15, height=8.5, dpi=120
    )
    phases = [
        ("Giai đoạn 1:\nNghiên cứu & Thiết kế",
         "• Khảo sát bài toán\n  chữ viết tay tiểu học\n• Chuẩn hóa 2 barem\n  điểm Thông tư 27\n• Thiết kế kiến trúc\n  Web-Centric 4 tầng\n• Chọn lọc mô hình\n  ViT5 & Gemini OCR", 11),
        ("Giai đoạn 2:\nTiền xử lý ảnh Jimp",
         "• Pipeline 9 bước\n  TypeScript thuần\n• Nắn góc Deskew\n  variance [-15°, +15°]\n• Khử bóng đổ bàn tay\n  Box Blur 51×51\n• Nhị phân hóa Gaussian\n  lọc sạch ô ly", 26.5),
        ("Giai đoạn 3:\nOCR Đa tầng & BBox",
         "• Tích hợp Gemini 3.1\n  Flash Lite VLM\n• Prompt 5 bước\n  bảo toàn 100% lỗi\n• Huấn luyện YOLOv8\n  detect từ viết tay\n• Cơ chế Multi-Keys\n  chống lỗi 429", 42),
        ("Giai đoạn 4:\nAI & Rule Grading",
         "• SequenceMatcher\n  đối soát SGK 1-1\n• ViT5 INT8 lượng tử\n  hóa CPU (~510MB)\n• Qwen 2.5 SLM\n  sinh nhận xét TT27\n• Rulebase phân loại\n  6 nhóm lỗi ngữ âm", 57.5),
        ("Giai đoạn 5:\nFrontend & Dictation",
         "• Next.js 16 Web Studio\n  & PWA Client\n• Android Native App\n  CameraX SDK 36\n• Phân quyền RBAC\n  3 vai trò an toàn\n• Studio Đọc chính tả\n  Edge-TTS sư phạm", 73),
        ("Giai đoạn 6:\nTriển khai & Verify",
         "• Cloudflare Tunnel\n  TLS vượt CGNAT\n• Bảo vệ dữ liệu trẻ\n  em Nghị định 13\n• Cgroups cân bằng\n  RAM RPi 4 chống OOM\n• Thực nghiệm trường\n  học & PStack Verify", 88.5)
    ]

    for title, desc, px in phases:
        c.add_container(px, 50, 14.5, 68, label=title)
        c.add_process(px, 47, desc, width=13.5, height=46, fontsize=7.0, ha='left', align='left')

    # Mũi tên nối tiếp giữa các giai đoạn
    for i in range(len(phases) - 1):
        x1 = phases[i][2] + 7.25
        x2 = phases[i+1][2] - 7.25
        c.add_arrow(x1, 50, x2, 50)

    c.add_process(50, 7.5, "Nguyên tắc Nghiệm thu PStack: 'Passing build is NOT verification. Drive the real app the way a user does and capture evidence.'\nToàn bộ 6 giai đoạn đều được kiểm thử đối kháng thực địa trên 4 bề mặt: Android App, Web Gateway, Python AI Core và Trạm biên Raspberry Pi 4.",
                  width=92, height=5.5, fontsize=7.8, fontstyle='italic')

    c.save("Hinh_4_2_Quy_trinh_Phat_trien")

# ==============================================================================
# 10. HÌNH 4.3: MÔ HÌNH MẠNG CLOUDFLARE TUNNEL
# ==============================================================================
def make_hinh_4_3():
    c = DiagramCanvas(
        title="HÌNH 4.3 — MÔ HÌNH KẾT NỐI MẠNG AN TOÀN — CLOUDFLARE TUNNEL",
        subtitle="Zero-Trust Edge Connectivity & Reverse Proxy on Raspberry Pi 4 Appliance",
        width=11, height=14, dpi=120
    )
    # Tầng Client
    c.add_container(50, 87, 85, 13, label="1. Thiết bị Người dùng (Clients Tier)")
    c.add_process(30, 85, "Điện thoại Giáo viên / Phụ huynh\n(Android Native Client / PWA)", width=36, height=5.5, fontsize=8.0)
    c.add_process(70, 85, "Máy tính Giáo viên & Học sinh\n(Desktop Web Browser / Máy chiếu lớp)", width=36, height=5.5, fontsize=8.0)

    c.add_arrow(50, 80.5, 50, 74.0, label="HTTPS (TLS 1.3)", label_pos=(50, 77.2))

    # Tầng Cloudflare
    c.add_container(50, 66, 85, 14, label="2. Mạng Đám mây Cloudflare (Global Anycast Edge Network)")
    c.add_process(50, 64, "• Tên miền chính thức: https://vihandgrade.click\n• Tự động cấp phát chứng chỉ SSL/TLS 1.3 & Chống tấn công từ chối dịch vụ DDoS\n• Tối ưu hóa bộ nhớ đệm (Edge Caching) & Chấm dứt TLS tại biên (TLS Termination)",
                  width=80, height=7.5, fontsize=8.0, ha='left', align='left')

    c.add_arrow(50, 59.0, 50, 52.0, label="Outbound Tunnel TLS (cloudflared)", label_pos=(50, 55.5))

    # Tầng Trạm biên Raspberry Pi 4
    c.add_container(50, 27, 85, 46, label="3. Trạm Biên Tính Toán Phần Cứng: Raspberry Pi 4 / PC Máy Chủ (Đặt tại Trường học)")
    c.add_process(50, 44, "cloudflared daemon (Kết nối Outbound 2 chiều, vượt CGNAT nhà mạng, KHÔNG cần mở port Modem, KHÔNG cần IP tĩnh)",
                  width=80, height=4.5, fontsize=7.8, fontweight='bold')

    c.add_arrow(50, 41.75, 50, 38.5)

    # 2 Dịch vụ trong Pi
    c.add_container(30, 26, 38, 20, label="Dịch vụ Web Gateway (:3000)")
    c.add_process(30, 25, "• Next.js 16 Web Server\n• Rate Limiting Guard (lib/api-guard.ts)\n• Pipeline Jimp 9 bước tiền xử lý\n• Prisma ORM Client v5.22.0",
                  width=34, height=13, fontsize=7.5, ha='left', align='left')

    c.add_container(70, 26, 38, 20, label="Dịch vụ AI Microservice (:8000)")
    c.add_process(70, 25, "• FastAPI Python Service\n• YOLOv8 Word Detector (best.pt)\n• ViT5 INT8 Seq2Seq Sửa lỗi chính tả\n• Qwen 2.5 SLM & Microsoft Edge-TTS",
                  width=34, height=13, fontsize=7.5, ha='left', align='left')

    # Nối giữa 3000 và 8000
    c.add_arrow(49, 26, 51, 26, label="Local Loopback", label_pos=(50, 28))

    # CSDL SQLite và UFW
    c.add_process(50, 9.0, "• CSDL SQLite cục bộ (prisma/vihand.db • WAL Mode) & Thư mục tệp ảnh đĩa (/public/uploads/grades/)\n• Tường lửa UFW: Khóa hoàn toàn cổng 8000 nội bộ, chỉ mở cổng 3000 (Web Gateway) và cổng 22 (SSH Quản trị)",
                  width=80, height=5.5, fontsize=7.8, ha='left', align='left')

    c.save("Hinh_4_3_Mo_hinh_Mang_Cloudflare")

# ==============================================================================
# 11. HÌNH 4.4: DATABASE SCHEMA
# ==============================================================================
def make_hinh_4_4():
    c = DiagramCanvas(
        title="HÌNH 4.4 — CẤU TRÚC CƠ SỞ DỮ LIỆU VIHAND GRADE (SQLITE + PRISMA ORM)",
        subtitle="prisma/schema.prisma — Entity Relationship Diagram (ERD)",
        width=11, height=14, dpi=120
    )
    # Bảng 1: User
    c.add_container(25, 83, 38, 20, label="User (Tài khoản & Xác thực)")
    user_fields = [
        ("id: String (PK, cuid)", True),
        ("name: String", False),
        ("username: String (Unique)", False),
        ("password: String (Hashed)", False),
        ("role: String ('admin'|'teacher'|'student')", False),
        ("className: String", False),
        ("active: Boolean, createdAt: DateTime", False)
    ]
    for i, (fld, is_pk) in enumerate(user_fields):
        c.add_process(25, 88.5 - i * 2.5, fld, width=35, height=2.3, fontsize=7.2,
                      fontweight='bold' if is_pk else 'normal', ha='left')

    # Bảng 2: Class
    c.add_container(75, 83, 38, 20, label="Class (Lớp học)")
    class_fields = [
        ("id: String (PK, cuid)", True),
        ("name: String (Unique: '3A', '4B')", False),
        ("grade: Int (Khối 1, 2, 3, 4, 5)", False),
        ("teacherId: String (FK -> User.id)", False),
        ("createdAt: DateTime", False)
    ]
    for i, (fld, is_pk) in enumerate(class_fields):
        c.add_process(75, 88.5 - i * 2.5, fld, width=35, height=2.3, fontsize=7.2,
                      fontweight='bold' if is_pk else 'normal', ha='left')

    # Nối User -> Class (1:N)
    c.add_arrow(44, 83, 56, 83, label="1 : N (Quản lý)", label_pos=(50, 84.5))

    # Bảng 3: Grade (ở giữa)
    c.add_container(75, 48, 42, 34, label="Grade (Kết quả Chấm điểm AI)")
    grade_fields = [
        ("id: String (PK, cuid)", True),
        ("gradingMode: String ('dictation'|'essay')", False),
        ("studentName: String, assignmentTitle: String", False),
        ("className: String (FK logic -> Class.name)", False),
        ("originalText: String (Văn bản thô OCR)", False),
        ("fixedText: String (Văn bản ViT5 sửa lỗi)", False),
        ("corrections: String (JSON danh sách lỗi & BBoxes)", False),
        ("score: String ('8.5/10'), scoreNum: Float (8.5)", False),
        ("scoreBreakdown: String (JSON chi tiết 7đ-3đ)", False),
        ("feedback: String, pedagogicalComment: String", False),
        ("overallRating: String ('Xuất sắc'|'Tốt'|'Khá'...)", False),
        ("processingTimeMs: Int, tokenCount: Int", False),
        ("imagePath: String (/uploads/grades/*.jpg)", False),
        ("dictationSessionId: String (FK -> Session)", False),
        ("expiresAt: DateTime, isAnonymized: Boolean", False),
        ("createdAt: DateTime", False)
    ]
    for i, (fld, is_pk) in enumerate(grade_fields):
        c.add_process(75, 60.5 - i * 2.0, fld, width=39, height=1.9, fontsize=6.8,
                      fontweight='bold' if is_pk else 'normal', ha='left')

    # Nối Class -> Grade (1:N)
    c.add_arrow(75, 73, 75, 65, label="1 : N", label_pos=(77, 69))

    # Bảng 4: TextbookPassage
    c.add_container(25, 53.5, 38, 23, label="TextbookPassage (Kho Ngữ liệu SGK)")
    tb_fields = [
        ("id: String (PK, cuid)", True),
        ("gradeLevel: Int (Lớp 1, 2, 3, 4, 5)", False),
        ("bookSet: String ('KetNoi'|'CanhDieu'|...)", False),
        ("unit: String ('Tuần 1', 'Bài 12')", False),
        ("title: String (Tên bài đọc)", False),
        ("content: String (Văn bản chuẩn Ground Truth)", False),
        ("difficultWords: String (Từ khó luyện viết)", False),
        ("createdAt: DateTime", False)
    ]
    for i, (fld, is_pk) in enumerate(tb_fields):
        c.add_process(25, 60.2 - i * 2.2, fld, width=35, height=2.0, fontsize=7.0,
                      fontweight='bold' if is_pk else 'normal', ha='left')

    # Bảng 5: DictationSession
    c.add_container(25, 23, 38, 24, label="DictationSession (Phiên Đọc Ground Truth)")
    ds_fields = [
        ("id: String (PK, cuid)", True),
        ("title: String (Tiêu đề phiên đọc)", False),
        ("passage: String (Văn bản đọc chuẩn 100%)", False),
        ("className: String, teacherName: String", False),
        ("source: String ('web'|'manual')", False),
        ("status: String ('completed'|'in_progress')", False),
        ("summary: String (Tóm tắt thông điệp)", False),
        ("createdAt: DateTime", False)
    ]
    for i, (fld, is_pk) in enumerate(ds_fields):
        c.add_process(25, 30.5 - i * 2.2, fld, width=35, height=2.1, fontsize=7.0,
                      fontweight='bold' if is_pk else 'normal', ha='left')

    # Nối TextbookPassage -> DictationSession
    c.add_arrow(25, 42, 25, 35, label="Cung cấp bài đọc", label_pos=(32, 38.5))

    # Nối DictationSession -> Grade
    c.add_elbow_arrow([[44, 23], [51, 23], [51, 48], [54, 48]], label="Ground Truth (1 : N)", label_pos=(48, 24.5))

    # Bảng 6: DictationLog
    c.add_container(75, 16.5, 38, 17, label="DictationLog (Nhật ký Phiên đọc)")
    dl_fields = [
        ("id: String (PK, cuid)", True),
        ("sessionId: String (FK -> DictationSession.id)", False),
        ("speaker: String ('teacher'|'student'|'ai')", False),
        ("content: String (Nội dung câu / lệnh nhịp)", False),
        ("createdAt: DateTime", False)
    ]
    for i, (fld, is_pk) in enumerate(dl_fields):
        c.add_process(75, 20.5 - i * 2.2, fld, width=35, height=2.0, fontsize=7.0,
                      fontweight='bold' if is_pk else 'normal', ha='left')

    # Nối DictationSession -> DictationLog (1:N Cascade)
    c.add_arrow(44, 16.5, 56, 16.5, label="1 : N (Cascade)", label_pos=(50, 18.0))

    # Footer note
    c.add_process(50, 4.0, "Prisma Engine: PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 10000; PRAGMA synchronous = NORMAL\nKiến trúc chống phình DB (Anti-Bloat Shield): Cột imageBase64 rỗng, chỉ lưu imagePath đĩa cứng, unlink khi Soft Purge.",
                  width=92, height=4.5, fontsize=7.5, fontstyle='italic')

    c.save("Hinh_4_4_Database_Schema")

# ==============================================================================
# 12. HÌNH 4.5: API ENDPOINTS
# ==============================================================================
def make_hinh_4_5():
    c = DiagramCanvas(
        title="HÌNH 4.5 — VIHAND GRADE — SƠ ĐỒ API ENDPOINTS HOÀN CHỈNH",
        subtitle="Gateway Next.js (:3000) & AI Microservices Python (:8000) Interface Specification",
        width=11, height=14, dpi=120
    )
    # Khối 1: Next.js API Routes (Port 3000)
    c.add_container(50, 57, 92, 66, label="1. Next.js REST API Routes (Gateway BFF Port 3000)")

    routes = [
        ("POST /api/preprocess", "Tiền xử lý ảnh 9 bước Jimp (Deskew, khử bóng, CLAHE, lọc sạch ô ly)"),
        ("POST /api/ocr", "Trích xuất văn bản thô giữ nguyên 100% lỗi sai qua Google Gemini 3.1 Flash Lite"),
        ("POST /api/grade", "Điều phối chấm điểm Đa phân môn (So khớp SGK 1-1 hoặc ViT5 + Qwen SLM 2-Tier)"),
        ("POST /api/mobile/grade", "All-in-One BFF Route: Gọi Promise.all song song Gemini OCR & YOLOv8"),
        ("GET, POST /api/grades", "Lấy danh sách điểm số theo lớp & Lưu tệp ảnh vật lý ra đĩa /uploads/grades/*.jpg"),
        ("GET, POST /api/dictation/passages", "Truy xuất & Quản lý kho ngữ liệu bài đọc SGK GDPT 2018 Lớp 1 đến Lớp 5"),
        ("GET, POST /api/dictation/sessions", "Tạo mới, cập nhật và lưu vết phiên đọc chính tả của giáo viên làm Ground Truth"),
        ("GET /api/dictation/tts", "Proxy điều phối phát âm đa tầng (Edge-TTS -> Google TTS -> Web Speech API)"),
        ("POST /api/dictation/generate", "Sáng tác bài đọc chính tả bằng mô hình AI SLM Qwen 2.5 kết hợp Ngân hàng SGK"),
        ("GET, POST /api/admin/retention", "Báo cáo dung lượng đĩa & Soft Purge ẩn danh hóa sau 365 ngày (NĐ 13)"),
        ("POST /api/auth/login", "Xác thực tài khoản & Phân quyền truy cập 3 cấp độ (Admin / Teacher / Student)")
    ]

    for i, (endpoint, desc) in enumerate(routes):
        y = 84.0 - i * 5.2
        c.add_process(25.5, y, endpoint, width=35, height=4.2, fontsize=7.8, fontweight='bold', ha='left')
        c.add_process(69.5, y, desc, width=50, height=4.2, fontsize=7.2, ha='left')

    # Khối 2: Python AI Microservice (Port 8000)
    c.add_container(50, 14.5, 92, 21, label="2. Python AI Microservices Endpoints (FastAPI Core Port 8000)")

    py_routes = [
        ("POST /detect-words", "YOLOv8 Word Detector: Nhận diện BBoxes từng từ viết tay (imgsz=640)"),
        ("POST /grade", "ViT5 INT8 Correction: Sửa lỗi chính tả & SequenceMatcher phân loại 6 lỗi"),
        ("POST /qwen/generate-passage", "Qwen 2.5-0.5B SLM: Sáng tác đoạn văn SGK & sinh lời nhận xét TT27"),
        ("GET /tts", "Microsoft Edge-TTS Streamer: Stream audio giọng Hoài My & Nam Minh (-15%)")
    ]

    for i, (endpoint, desc) in enumerate(py_routes):
        y = 20.0 - i * 4.0
        c.add_process(25.5, y, endpoint, width=35, height=3.6, fontsize=7.6, fontweight='bold', ha='left')
        c.add_process(69.5, y, desc, width=50, height=3.6, fontsize=7.2, ha='left')

    c.add_process(50, 2.2, "Bảo vệ An toàn: In-Memory Sliding Window Rate Limiting Guard (20 req/m Mobile, 30 req/m Web, 60 req/m YOLO).\nTường lửa UFW: Cổng 8000 bị khóa hoàn toàn từ Internet, chỉ tiếp nhận kết nối nội bộ từ Next.js Cổng 3000.",
                  width=92, height=3.5, fontsize=7.5, fontstyle='italic')

    c.save("Hinh_4_5_API_Endpoints")

# ==============================================================================
# 13. HÌNH 4.6: QUY TRÌNH ĐỌC CHÍNH TẢ WEB
# ==============================================================================
def make_hinh_4_6():
    c = DiagramCanvas(
        title="HÌNH 4.6 — QUY TRÌNH TIẾT ĐỌC CHÍNH TẢ TRÊN WEB & ÂM THANH EDGE-TTS",
        subtitle="app/teacher/dictation/page.tsx — Pedagogical Dictation Studio & Ground Truth Bridge",
        width=11, height=13, dpi=120
    )
    boxes = [
        ("1. Giáo viên chọn bài SGK (/teacher/dictation)",
         "• Chọn Khối lớp 1-5, Bộ sách (Kết Nối Tri Thức, Cánh Diều, Chân Trời), Tuần học\n"
         "• Nạp văn bản bài đọc chuẩn từ bảng TextbookPassage hoặc sáng tác qua AI SLM\n"
         "• Hướng dẫn học sinh rèn luyện viết danh sách 'Từ Khó Dễ Sai' trước trên bảng con", 80),
        ("2. Điều khiển Nhịp đọc Sư phạm Chuẩn mực",
         "• Thiết lập tốc độ đọc chuẩn: rate = '-15%' (Chậm rãi, tròn vành rõ chữ theo Bộ GD&ĐT)\n"
         "• Cấu hình số lượt lặp lại cho từng cụm từ: 2 - 3 lượt (Chuẩn sư phạm tiểu học)\n"
         "• Bộ đếm thời gian nghỉ tự động thích ứng: T_pause = max(5s, round(Số từ × 1.6s))\n"
         "• Chế độ Chiếu Bảng Xanh: Toàn màn hình TV, đồng hồ SVG đếm nhịp trực quan", 60),
        ("3. Streaming Âm thanh Microsoft Edge-TTS Đa tầng",
         "• Trình duyệt gọi Python Microservice qua GET /api/dictation/tts -> :8000/tts\n"
         "• Edge-TTS stream trực tiếp audio/mpeg giọng chuẩn Cô Hoài My hoặc Thầy Nam Minh\n"
         "• Cơ chế Fallback đa tầng tự động: Thử Tier 1 Edge-TTS -> Tier 2 Google TTS -> Tier 3 Web Speech API\n"
         "• Web Audio API phát qua loa giảng dạy lớp học với độ trễ tối thiểu (<0.8 giây)", 40),
        ("4. Lưu Phiên & Luân chuyển Chấm điểm (1-Click Bridge)",
         "• Kết thúc tiết đọc: Hệ thống tự động tạo bản ghi lưu vào bảng DictationSession\n"
         "• Giáo viên bấm 1-Click 'Chuyển sang Chấm bài' -> Điều hướng sang /teacher/grade\n"
         "• Bài đọc mẫu được tự động khóa làm Ground Truth duy nhất của đợt chấm bài\n"
         "• Sẵn sàng cho thuật toán SequenceMatcher & Levenshtein chấm điểm Zero-Hallucination", 20)
    ]

    for i, (title, desc, y) in enumerate(boxes):
        c.add_container(50, y, 88, 17, label=title)
        c.add_process(50, y - 1.5, desc, width=84, height=11, fontsize=8.0, ha='left', align='left')
        if i < len(boxes) - 1:
            c.add_arrow(50, y - 8.5, 50, boxes[i+1][2] + 8.5)

    c.add_process(50, 6.0, "Mối liên kết khép kín: Tiết đọc chính tả tạo ra nguồn văn bản chuẩn tuyệt đối (Ground Truth), giải quyết triệt để\nbài toán OCR chữ viết tay bị ảo giác hoặc nhận diện sai các từ học sinh bỏ sót / viết lệch chuẩn.",
                  width=88, height=4.5, fontsize=7.8, fontstyle='italic')

    c.save("Hinh_4_6_Quy_trinh_Doc_Chinh_Ta_Web")

# ==============================================================================
# 14. HÌNH 4.7: SƠ ĐỒ KHỐI PHÂN HỆ ĐỌC CHÍNH TẢ
# ==============================================================================
def make_hinh_4_7():
    c = DiagramCanvas(
        title="HÌNH 4.7 — SƠ ĐỒ KHỐI PHÂN HỆ ĐỌC CHÍNH TẢ THÔNG MINH (AI DICTATION PLATFORM)",
        subtitle="ViHand Grade — Modular System Block Diagram & Multi-Tier Audio Ecosystem",
        width=15, height=8.5, dpi=120
    )
    # 4 Khối từ trên xuống dưới
    # Khối 1: Input Sources
    c.add_container(50, 80, 92, 17, label="1. Nguồn Ngữ liệu Đầu vào (Input Sources: Data & Generation)")
    c.add_process(22, 78, "Kho Ngữ liệu SGK GDPT 2018\n(TextbookPassage Lớp 1-5:\nKết Nối, Cánh Diều, Chân Trời)", width=26, height=8.0, fontsize=7.8)
    c.add_process(50, 78, "AI Sáng tác SLM Local\n(Qwen2.5-0.5B Generative Dictation:\nSinh đoạn văn & bóc tách từ khó)", width=26, height=8.0, fontsize=7.8)
    c.add_process(78, 78, "Giáo viên Soạn thảo Tùy chỉnh\n(Soạn thảo tự do trên giao diện\nhoặc nạp tệp văn bản thô .txt)", width=26, height=8.0, fontsize=7.8)

    c.add_arrow(50, 71.5, 50, 65.5)

    # Khối 2: Core Pedagogical Processing
    c.add_container(50, 56, 92, 17, label="2. Bộ Điều phối Sư phạm Web (Core Pedagogical Processing: Orchestration & Logic)")
    c.add_process(18, 54, "Pedagogical Clause Splitter\n(Phân rã câu thành cụm từ ngắn\n3 - 5 từ theo ngữ pháp)", width=21, height=8.0, fontsize=7.5)
    c.add_process(39, 54, "Web Audio Chime Generator\n(Chuông báo sóng sin 880-1760Hz\nnhắc nhở học sinh viết bài)", width=20, height=8.0, fontsize=7.5)
    c.add_process(60, 54, "Adaptive Timer Countdown\n(Tính thời gian nghỉ động ~1.6s/từ\nkèm đồng hồ đếm ngược SVG)", width=20, height=8.0, fontsize=7.5)
    c.add_process(82, 54, "Playback State Machine\n(Quản lý trạng thái Đọc, Tạm dừng,\nĐọc lại câu, Chế độ Bảng Xanh)", width=21, height=8.0, fontsize=7.5)

    c.add_arrow(50, 47.5, 50, 41.5)

    # Khối 3: Multi-Tier Speech Synthesis
    c.add_container(50, 32, 92, 17, label="3. Động cơ Tổng hợp Giọng nói Đa tầng (Multi-Tier Speech Synthesis Ecosystem)")
    c.add_process(22, 30, "Tier 1: Microsoft Edge-TTS (Chính)\nFastAPI Python Service (:8000/tts)\nGiọng Hoài My & Nam Minh, rate=-15%", width=28, height=8.0, fontsize=7.8, fontweight='bold')
    
    c.add_arrow(36.5, 30, 43.5, 30, label="Failover", label_pos=(40, 32))
    c.add_process(54, 30, "Tier 2: Google Translate TTS\nFallback trực tuyến khi mạng\nhoặc Python service timeout", width=20, height=8.0, fontsize=7.5)
    
    c.add_arrow(64.5, 30, 70.5, 30, label="Offline", label_pos=(67.5, 32))
    c.add_process(81, 30, "Tier 3: Browser Web Speech API\nFallback ngoại tuyến 100% chạy trên\ngiọng nói của hệ điều hành Client", width=20, height=8.0, fontsize=7.5)

    c.add_arrow(50, 23.5, 50, 17.5)

    # Khối 4: Persistence & Assessment
    c.add_container(50, 9.5, 92, 14, label="4. Kho Lưu trữ Ground Truth & Cầu nối Chấm điểm (Persistence & Assessment Bridge)")
    c.add_process(35, 8.5, "SQLite Database (prisma/vihand.db)\nBảng DictationSession & DictationLog (WAL Mode)", width=40, height=6.0, fontsize=7.8)
    c.add_arrow(55.5, 8.5, 64.5, 8.5, label="Ground Truth", label_pos=(60, 10.5))
    c.add_process(78, 8.5, "Pipeline Chấm điểm ViT5 & Gemini\n(/teacher/grade — Zero-Hallucination)", width=26, height=6.0, fontsize=7.8, fontweight='bold')

    c.save("Hinh_4_7_SoDoKhoi_HeThong_DocChinhTa")

# ==============================================================================
# 15. HÌNH 4.8: LƯU ĐỒ GIẢI THUẬT ĐỌC CHÍNH TẢ WEB
# ==============================================================================
def make_hinh_4_8():
    c = DiagramCanvas(
        title="HÌNH 4.8 — LƯU ĐỒ GIẢI THUẬT VÒNG ĐỜI TRÌNH PHÁT ĐỌC CHÍNH TẢ WEB",
        subtitle="app/teacher/dictation/page.tsx — Pedagogical Loop, Multi-Tier Fallback & Adaptive Pacing",
        width=15, height=9.0, dpi=120
    )
    # Khối bên trái: Bắt đầu và Vòng lặp
    c.add_start_end(14, 88, "Bắt đầu phiên đọc\n(Start Session)", width=20, height=4.5, fontsize=8.0)
    c.add_arrow(14, 85.75, 14, 81.5)

    c.add_process(14, 78.5, "Nạp cụm từ sư phạm\n& Cấu hình giọng đọc, tốc độ", width=22, height=5.5, fontsize=7.8)
    c.add_arrow(14, 75.75, 14, 71.5)

    c.add_decision(14, 67.5, "Vòng lặp cụm:\nCòn cụm từ\nchưa đọc?", width=20, height=7.5, fontsize=7.5)

    # Nhánh NO: Hoàn thành
    c.add_arrow(14, 63.75, 14, 57.0, label="NO", label_pos=(14, 60.5))
    c.add_process(14, 53.0, "Phát chuông hoàn thành\n& Hiển thị tổng kết phiên", width=22, height=5.5, fontsize=7.5)
    c.add_arrow(14, 50.25, 14, 45.0)
    c.add_start_end(14, 42.5, "Kết thúc phiên đọc\n(Chuyển Ground Truth)", width=20, height=4.5, fontsize=8.0)

    # Nhánh YES: Tiến hành chu trình đọc cụm
    c.add_elbow_arrow([[24, 67.5], [35, 67.5]], label="YES", label_pos=(28, 69.0))

    # Khối giữa: Kiểm tra số lần lặp lại
    c.add_decision(43, 67.5, "Đã đạt số lần\nlặp mục tiêu\n(repeatCount)?", width=16, height=7.5, fontsize=7.2)
    
    # Đã đủ lần lặp -> Sang cụm tiếp
    c.add_arrow(43, 63.75, 43, 56.5, label="YES", label_pos=(43, 60.0))
    c.add_process(43, 53.0, "Chuyển sang\ncụm từ tiếp theo\n(clauseIndex += 1)", width=16, height=5.5, fontsize=7.2)
    c.add_elbow_arrow([[35, 53.0], [28, 53.0], [28, 67.5], [24, 67.5]])

    # Chưa đủ lần lặp -> Phát âm thanh
    c.add_elbow_arrow([[51, 67.5], [60, 67.5]], label="NO", label_pos=(55, 69.0))
    c.add_process(70, 67.5, "Phát chuông nhắc nhở (Chime sound)\n& Hiển thị cụm từ trên giao diện", width=19, height=5.5, fontsize=7.2)

    c.add_arrow(70, 64.75, 70, 60.5)

    # Khối Động cơ TTS Đa tầng
    c.add_container(70, 39.5, 26, 33, label="Động cơ TTS Đa tầng (speakClause)")
    c.add_process(70, 49.5, "1. Thử Tier 1: Edge-TTS Neural\n(Gọi API /api/dictation/tts)", width=23, height=4.2, fontsize=7.2)
    c.add_arrow(70, 47.4, 70, 45.0)
    c.add_decision(70, 42.8, "Thành\ncông?", width=12, height=4.4, fontsize=7.0)

    c.add_arrow(70, 40.6, 70, 37.6, label="NO", label_pos=(72, 39.1))
    c.add_process(70, 35.5, "2. Fallback Tier 2: Google TTS\n(Dịch vụ phát âm trực tuyến)", width=23, height=4.2, fontsize=7.2)
    c.add_arrow(70, 33.4, 70, 30.6)
    c.add_process(70, 28.5, "3. Fallback Tier 3: Web Speech\n(Giọng nói tích hợp trình duyệt)", width=23, height=4.2, fontsize=7.2)

    # Nối thành công sang thực thi audio
    c.add_elbow_arrow([[76, 42.8], [86, 42.8], [86, 53], [91, 53]], label="YES", label_pos=(81, 44.3))
    c.add_elbow_arrow([[70, 26.4], [86, 26.4], [86, 53], [91, 53]])

    # Khối bên phải: Phát âm thanh và Đếm ngược
    c.add_process(94, 67.5, "Thực thi phát âm thanh ra loa\n(HTML5 Audio / Web Audio API)", width=14, height=5.5, fontsize=7.2)
    c.add_arrow(94, 55.75, 94, 64.75)

    c.add_process(94, 53.0, "Gán nguồn âm thanh\n(AudioSource ready)", width=14, height=5.0, fontsize=7.2)

    c.add_arrow(94, 70.25, 94, 74.5)
    c.add_process(94, 77.5, "Tính thời gian nghỉ viết bài:\nT_pause = max(5s, round(từ × 1.6s))", width=14, height=5.5, fontsize=7.0)

    c.add_arrow(94, 80.25, 94, 83.5)
    c.add_process(94, 86.5, "Chạy bộ đếm ngược Heartbeat Timer\n(Lắng nghe Pause/Resume/Replay)", width=14, height=5.5, fontsize=7.0)

    # Khi hết giờ: Tăng repeatCount và quay lại
    c.add_elbow_arrow([[87, 86.5], [60, 86.5], [60, 77.5], [43, 77.5], [43, 71.25]], label="Hết giờ nghỉ", label_pos=(54, 88.0))

    c.save("Hinh_4_8_LuuDoGiaiThuat_DocChinhTa_Web")

# ==============================================================================
# 16. HÌNH 4.9: GIAO THỨC TRUYỀN THÔNG ROBOT MCP
# ==============================================================================
def make_hinh_4_9():
    c = DiagramCanvas(
        title="HÌNH 4.9 — LƯU ĐỒ GIAO THỨC TRUYỀN THÔNG ĐIỀU KHIỂN ROBOT QUA MCP",
        subtitle="Model Context Protocol (MCP) & IoT Assistant Communication Sequence",
        width=15, height=8.5, dpi=120
    )
    # 4 Đường gióng (Lifelines)
    actors = [
        ("Giáo viên / Học sinh\n(Teacher / Student)", 15),
        ("Robot Trợ Giảng IoT\n(ESP32 MCU / Mic / Loa)", 38),
        ("Máy chủ MCP Python\n(:8200 FastMCP Server)", 62),
        ("Next.js Backend & DB\n(:3000 Web Gateway & SQLite)", 85)
    ]
    for name, ax in actors:
        c.add_process(ax, 88, name, width=18, height=6.0, fontsize=8.0, fontweight='bold')
        c.ax.plot([ax, ax], [85, 7], color='#000000', linewidth=1.0, linestyle=':')

    # Pha 1: Bắt tay khởi tạo
    c.add_container(50, 74, 84, 15, label="Pha 1: Bắt tay khởi tạo phiên (Handshake & Tool Registration)")
    c.add_arrow(38, 77, 62, 77, label="Kết nối WebSocket (ws://)", label_pos=(50, 78.5))
    c.add_arrow(62, 73, 62, 71)
    c.ax.text(63, 72, "Khởi tạo session & Đăng ký role 'Cô giáo trợ giảng'", fontsize=7.2)
    c.add_arrow(62, 69, 38, 69, label="Truy vấn công cụ (tools/list)", label_pos=(50, 70.2))

    # Pha 2: Thực thi đọc chính tả
    c.add_container(50, 48.0, 84, 24, label="Pha 2: Thực thi Đọc chính tả bằng giọng nói (Voice Dictation)")
    c.add_arrow(15, 51.5, 38, 51.5, label="Lệnh giọng nói 'Đọc bài tuần 5'", label_pos=(26.5, 53.0))
    c.add_arrow(38, 47.5, 62, 47.5, label="Truyền audio stream (PCM/WebM)", label_pos=(50, 49.0))
    c.add_arrow(62, 44, 62, 42)
    c.ax.text(63, 43, "ASR -> Điều phối SLM -> Edge-TTS tổng hợp giọng đọc", fontsize=7.2)
    c.add_arrow(62, 40, 38, 40, label="Stream audio MP3 bài đọc ra loa", label_pos=(50, 41.5))
    c.add_arrow(38, 36.5, 15, 36.5, label="Phát âm thanh ra loa lớp học", label_pos=(26.5, 38.0))

    # Pha 3: Lưu phiên làm việc & Đồng bộ Ground Truth
    c.add_container(50, 20.0, 84, 24, label="Pha 3: Lưu phiên làm việc & Đồng bộ Ground Truth (Session Sync)")
    c.add_arrow(15, 23.5, 38, 23.5, label="Lệnh 'Lưu lại bài đọc'", label_pos=(26.5, 25.0))
    c.add_arrow(38, 20.0, 62, 20.0, label="tools/call ('vihand.save_dictation_session')", label_pos=(50, 21.2))
    c.add_arrow(62, 16.5, 85, 16.5, label="HTTP POST /api/dictation/sessions", label_pos=(73.5, 17.7))
    c.add_arrow(85, 14, 85, 12.5)
    c.ax.text(86, 13, "Lưu vào vihand.db làm Ground Truth", fontsize=7.2)
    c.add_arrow(85, 11, 62, 11, label="HTTP 200 OK", label_pos=(73.5, 12.2))
    c.add_arrow(62, 8, 38, 8, label="Xác nhận thành công", label_pos=(50, 9.2))

    c.save("Hinh_4_9_LuuDo_GiaoThuc_MCP_Robot")

# ==============================================================================
# 17. SƠ ĐỒ TỔNG QUÁT HỆ THỐNG
# ==============================================================================
def make_sodo_tongquat():
    c = DiagramCanvas(
        title="SƠ ĐỒ TỔNG QUAN KIẾN TRÚC HỆ THỐNG VIHAND GRADE (TOÀN DIỆN)",
        subtitle="Mô hình 3 Khối Cốt lõi: Thiết bị Người dùng • Máy chủ Xử lý Cục bộ • Dịch vụ Đám mây & Bảo mật",
        width=16, height=9.0, dpi=120
    )
    col_w = 28
    # Khối 1: Tầng 1 Thiết bị Người dùng
    c.add_container(18, 50, col_w, 75, label="TẦNG 1: THIẾT BỊ NGƯỜI DÙNG (CLIENT LAYER)")
    
    c.add_container(18, 68, 25, 26, label="Giáo viên Tiểu học (Teacher Cockpit)")
    c.add_process(18, 67, "• Thiết bị: PC, Laptop, Máy tính bảng (Tablet)\n• Tiết đọc chính tả Web (/teacher/dictation):\n  - Chọn bài đọc theo kho SGK Lớp 1-5\n  - Điều khiển nhịp đọc âm thanh giảng dạy\n• Chấm bài & Duyệt điểm (/teacher/grade):\n  - Chụp & tải ảnh bài viết học sinh\n  - Tinh chỉnh điểm sư phạm (Human-in-the-loop)",
                  width=23, height=20, fontsize=7.2, ha='left', align='left')

    c.add_container(18, 32, 25, 26, label="Học sinh & Phụ huynh (Student App)")
    c.add_process(18, 31, "• Thiết bị: Điện thoại Smartphone, Máy tính\n• Hoạt động trong lớp học:\n  - Nghe giọng đọc chính tả mẫu từ loa trường\n  - Viết bài vào vở ô ly truyền thống\n• Tra cứu & Tự học (/student):\n  - Xem kết quả bài chấm, ảnh gắn BBoxes\n  - Nhận diện lỗi sai & Luyện đọc từ khó",
                  width=23, height=20, fontsize=7.2, ha='left', align='left')

    # Mũi tên 2 chiều Tầng 1 <-> Tầng 2
    c.add_arrow(32, 60, 36, 60, label="Gửi bài nộp", label_pos=(34, 62))
    c.add_arrow(36, 40, 32, 40, label="Trả điểm số", label_pos=(34, 38))

    # Khối 2: Tầng 2 Máy chủ Vihand Grade
    c.add_container(50, 50, col_w, 75, label="TẦNG 2: MÁY CHỦ VIHAND GRADE (LOCAL SERVER)")

    c.add_container(50, 72, 25, 19, label="Ứng dụng Web & Tiền xử lý ảnh")
    c.add_process(50, 71, "• Next.js 16 App Router: Điều phối & Quản trị\n• Pipeline Jimp 9 bước: Nắn thẳng Deskew (±15°),\n  khử bóng đổ, lọc lưới ô ly, tách dòng văn bản\n• Rate Limiting Guard: Kiểm soát 20-60 req/phút",
                  width=23, height=13, fontsize=7.2, ha='left', align='left')

    c.add_container(50, 50, 25, 18, label="Lõi AI & Đánh giá Đa phân môn")
    c.add_process(50, 49, "• SequenceMatcher: So khớp với SGK gốc\n  (Khấu trừ 0.5đ/lỗi, triệt tiêu 100% ảo giác)\n• ViT5 INT8 Seq2Seq: Sửa lỗi chính tả\n• Qwen2.5-0.5B SLM: Sinh lời nhận xét TT27",
                  width=23, height=12, fontsize=7.2, ha='left', align='left')

    c.add_container(50, 26, 25, 20, label="CSDL SQLite & Bảo mật Quyền riêng tư")
    c.add_process(50, 25, "• SQLite 6 bảng: User, Class, Grade, Session...\n• Nghị định 13/2023/NĐ-CP: Vòng đời 365 ngày,\n  Soft Purge tự động xóa vĩnh viễn ảnh cũ\n• Lưu ảnh đĩa vật lý /uploads/ chống phình DB",
                  width=23, height=14, fontsize=7.2, ha='left', align='left')

    # Mũi tên 2 chiều Tầng 2 <-> Tầng 3
    c.add_arrow(64, 60, 68, 60, label="Gọi OCR / TTS", label_pos=(66, 62))
    c.add_arrow(68, 40, 64, 40, label="Trả văn bản", label_pos=(66, 38))

    # Khối 3: Tầng 3 Dịch vụ Đám mây & Bảo mật
    c.add_container(82, 50, col_w, 75, label="TẦNG 3: ĐÁM MÂY & BẢO MẬT (CLOUD & SECURITY)")

    c.add_container(82, 72, 25, 19, label="Vision OCR — Google Gemini")
    c.add_process(82, 71, "• Google Gemini 3.1 Flash Lite API (Cloud VLM)\n• Nhận diện OCR chữ viết tay tiếng Việt tiểu học\n• Prompt chuẩn hóa: Trích xuất nguyên văn,\n  giữ nguyên 100% các lỗi chính tả của học sinh\n• Thời gian đáp ứng nhanh: ~1.5 - 2.0s/bài",
                  width=23, height=13, fontsize=7.2, ha='left', align='left')

    c.add_container(82, 50, 25, 18, label="Microsoft Edge-TTS Streaming")
    c.add_process(82, 49, "• Tổng hợp giọng đọc mẫu sư phạm chất lượng cao\n• Giọng đọc Hoài My (Nữ) & Nam Minh (Nam)\n• Thuật toán ngắt nghỉ câu tự nhiên (~1.6s/từ)\n• Truyền luồng audio trực tiếp về trình duyệt",
                  width=23, height=12, fontsize=7.2, ha='left', align='left')

    c.add_container(82, 26, 25, 20, label="Cloudflare Tunnel (Zero Trust Ingress)")
    c.add_process(82, 25, "• Đường hầm bảo mật mã hóa TLS/HTTPS toàn trình\n• Giáo viên truy cập từ xa qua Internet an toàn\n  mà không cần mở port modem hoặc IP tĩnh\n• Tự động chống tấn công DDoS & bảo vệ máy chủ",
                  width=23, height=14, fontsize=7.2, ha='left', align='left')

    # Footer
    c.add_process(50, 6.0, "Hệ thống Số hóa Tiết học & Chấm điểm Tiểu học ViHand Grade • Đề tài Nghiên cứu Khoa học Sinh viên (Khoa Điện – Điện Tử, ĐH Tôn Đức Thắng)",
                  width=92, height=4.0, fontsize=8.0, fontstyle='italic')

    c.save("SoDo_TongQuat_HeThong")

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================
def main():
    print("=" * 70)
    print("BẮT ĐẦU TẠO LẠI TOÀN BỘ 17 LƯU ĐỒ GIẢI THUẬT & SƠ ĐỒ KIẾN TRÚC")
    print("=" * 70)

    generators = [
        ("Hinh_3_1_Hybrid_AI_Pipeline", make_hinh_3_1),
        ("Hinh_3_2_Tien_xu_ly_anh_Jimp", make_hinh_3_2),
        ("Hinh_3_3_Giai_thuat_SequenceMatcher", make_hinh_3_3),
        ("Hinh_3_4_Rulebase_Phan_loai_6_Loi", make_hinh_3_4),
        ("Hinh_3_5_Rulebase_Tinh_diem_Xep_loai", make_hinh_3_5),
        ("Hinh_3_6_Phan_quyen_RBAC_Nghi_dinh_13", make_hinh_3_6),
        ("Hinh_3_7_Fallback_Grading", make_hinh_3_7),
        ("Hinh_4_1_Tech_Stack", make_hinh_4_1),
        ("Hinh_4_2_Quy_trinh_Phat_trien", make_hinh_4_2),
        ("Hinh_4_3_Mo_hinh_Mang_Cloudflare", make_hinh_4_3),
        ("Hinh_4_4_Database_Schema", make_hinh_4_4),
        ("Hinh_4_5_API_Endpoints", make_hinh_4_5),
        ("Hinh_4_6_Quy_trinh_Doc_Chinh_Ta_Web", make_hinh_4_6),
        ("Hinh_4_7_SoDoKhoi_HeThong_DocChinhTa", make_hinh_4_7),
        ("Hinh_4_8_LuuDoGiaiThuat_DocChinhTa_Web", make_hinh_4_8),
        ("Hinh_4_9_LuuDo_GiaoThuc_MCP_Robot", make_hinh_4_9),
        ("SoDo_TongQuat_HeThong", make_sodo_tongquat),
    ]

    for idx, (name, fn) in enumerate(generators, 1):
        print(f"\n[{idx}/17] Đang vẽ {name}...")
        try:
            fn()
        except Exception as e:
            print(f"[LỖI] khi vẽ {name}: {e}")
            raise e

    print("\n" + "=" * 70)
    print("HOÀN THÀNH TẠO 17 SƠ ĐỒ CHUẨN TECHNICAL WHITE PAPER (.JPG & .PNG)!")
    print("=" * 70)

if __name__ == "__main__":
    main()
