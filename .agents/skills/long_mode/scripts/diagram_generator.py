"""
Module / CLI để vẽ Lưu đồ giải thuật & Sơ đồ hệ thống chuẩn học thuật (Technical White Paper Flowchart)
Xuất file ảnh JPEG (.jpg) độ phân giải cao theo chuẩn thiết kế kỹ thuật độc lập.

Đặc trưng thiết kế:
- Nền trắng tinh khiết (#FFFFFF), viền đen sắc nét (#000000, 1.5pt).
- Tiêu đề in hoa đậm căn giữa, dòng phụ ghi rõ đường dẫn file / pipeline.
- Các khối hình học chuẩn: Oval (Start/End), Rectangle (Process/Action), Diamond (Decision), Parallelogram (I/O).
- Mũi tên định hướng vuông góc (Orthogonal Arrows) kèm nhãn YES/NO rõ ràng.
- Hỗ trợ tiếng Việt 100% UTF-8 qua font Arial / Segoe UI.
"""

import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image
import os

# Thiết lập font tiếng Việt
plt.rcParams['font.sans-serif'] = ['Arial', 'Segoe UI', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

class AcademicFlowchart:
    def __init__(self, title, subtitle=None, width_inch=7.68, height_inch=13.76, dpi=100):
        """
        Khởi tạo canvas lưu đồ:
        Mặc định tỉ lệ 9:16 (768 x 1376 px) với dpi=100
        """
        self.fig, self.ax = plt.subplots(figsize=(width_inch, height_inch), dpi=dpi)
        self.ax.set_xlim(0, 100)
        self.ax.set_ylim(0, 100)
        self.ax.axis('off')
        self.fig.patch.set_facecolor('#FFFFFF')
        self.ax.set_facecolor('#FFFFFF')
        
        # Tiêu đề
        self.ax.text(50, 97, title.upper(), ha='center', va='center',
                     fontsize=15, fontweight='bold', color='#000000')
        if subtitle:
            self.ax.text(50, 94.5, subtitle, ha='center', va='center',
                         fontsize=10, fontstyle='normal', color='#222222')

    def add_start_end(self, x, y, text, width=20, height=3.2):
        """Khối Bắt đầu / Kết thúc hình viên thuốc (Pill/Oval)"""
        box = patches.FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle=f"round,pad=0.2,rounding_size={height/2}",
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5
        )
        self.ax.add_patch(box)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=9.5, fontweight='bold', color='#000000')
        return (x, y, width, height)

    def add_process(self, x, y, text, width=65, height=6.0, facecolor='#FFFFFF', fontweight='normal', fontsize=8.5):
        """Khối xử lý hình chữ nhật"""
        box = patches.Rectangle(
            (x - width/2, y - height/2), width, height,
            edgecolor='#000000', facecolor=facecolor, linewidth=1.5
        )
        self.ax.add_patch(box)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=fontsize, fontweight=fontweight, color='#000000', multialignment='center')
        return (x, y, width, height)

    def add_decision(self, x, y, text, width=32, height=5.5, fontsize=8.0):
        """Khối điều kiện hình thoi (Rhombus/Diamond)"""
        diamond = patches.Polygon([
            [x, y + height/2],
            [x + width/2, y],
            [x, y - height/2],
            [x - width/2, y]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5)
        self.ax.add_patch(diamond)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=fontsize, fontweight='bold', color='#000000', multialignment='center')
        return (x, y, width, height)

    def add_io(self, x, y, text, width=65, height=4.5, fontsize=8.5):
        """Khối Nhập / Xuất dữ liệu hình bình hành (Parallelogram)"""
        offset = 3.0
        poly = patches.Polygon([
            [x - width/2 + offset, y + height/2],
            [x + width/2, y + height/2],
            [x + width/2 - offset, y - height/2],
            [x - width/2, y - height/2]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5)
        self.ax.add_patch(poly)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=fontsize, color='#000000', multialignment='center')
        return (x, y, width, height)

    def add_arrow(self, x1, y1, x2, y2, label=None, label_pos=None):
        """Mũi tên định hướng thẳng hoặc có nhãn YES/NO"""
        self.ax.annotate(
            '', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.0, headwidth=5, headlength=6, shrink=0)
        )
        if label:
            lx = (x1 + x2)/2 if label_pos is None else label_pos[0]
            ly = (y1 + y2)/2 if label_pos is None else label_pos[1]
            self.ax.text(lx, ly, label, ha='center', va='center',
                         fontsize=8.5, fontweight='bold', color='#000000',
                         bbox=dict(boxstyle='square,pad=0.1', facecolor='#FFFFFF', edgecolor='none'))

    def add_elbow_arrow(self, points, label=None, label_pos=None):
        """Mũi tên uốn khúc vuông góc (Orthogonal) qua danh sách các điểm [[x1,y1], [x2,y2], ...]"""
        for i in range(len(points) - 2):
            p1, p2 = points[i], points[i+1]
            self.ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#000000', linewidth=1.2)
        # Đoạn cuối vẽ mũi tên
        p_pre, p_end = points[-2], points[-1]
        self.ax.annotate(
            '', xy=(p_end[0], p_end[1]), xytext=(p_pre[0], p_pre[1]),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.0, headwidth=5, headlength=6, shrink=0)
        )
        if label:
            lx = label_pos[0] if label_pos else points[0][0]
            ly = label_pos[1] if label_pos else points[0][1]
            self.ax.text(lx, ly, label, ha='center', va='center',
                         fontsize=8.5, fontweight='bold', color='#000000',
                         bbox=dict(boxstyle='square,pad=0.1', facecolor='#FFFFFF', edgecolor='none'))

    def save_jpg(self, output_path, quality=95):
        """Lưu ra file ảnh JPEG chất lượng cao chuẩn RGB"""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        # Lưu tạm PNG để không mất nét vector rồi nén sang JPG chuẩn 100%
        temp_png = output_path + ".temp.png"
        self.fig.savefig(temp_png, format='png', dpi=100, facecolor='#FFFFFF', bbox_inches='tight')
        plt.close(self.fig)
        
        # Chuyển đổi sang JPEG RGB
        img = Image.open(temp_png).convert('RGB')
        img.save(output_path, 'JPEG', quality=quality)
        if os.path.exists(temp_png):
            os.remove(temp_png)
        print(f"[OK] Saved flowchart JPEG: {os.path.basename(output_path)} (Size: {img.size})")

if __name__ == "__main__":
    # Test script tạo 1 sơ đồ mẫu
    flow = AcademicFlowchart(
        title="LƯU ĐỒ MẪU KIỂM TRA CHUẨN ĐỒ HỌA",
        subtitle="system/pipeline.py — Verification Flow"
    )
    flow.add_start_end(50, 90, "Bắt đầu")
    flow.add_arrow(50, 88.4, 50, 84)
    flow.add_process(50, 80, "Bước 1: Tiếp nhận yêu cầu & Khảo sát context\n→ Kiểm tra file & kiến trúc dự án")
    flow.add_arrow(50, 77, 50, 72)
    flow.add_decision(50, 68, "Khớp kiến trúc?")
    flow.add_arrow(50, 65.25, 50, 59, label="YES", label_pos=(50, 62))
    flow.add_process(50, 55, "Bước 2: Sửa đổi vi phẫu (Surgical Edits)\n→ Giữ nguyên cấu trúc & comment")
    flow.add_arrow(50, 52, 50, 47)
    flow.add_process(50, 43, "Bước 3: Xác thực thực nghiệm (Rigorous Verify)\n→ Chạy npm run build / pytest")
    flow.add_arrow(50, 40, 50, 35)
    flow.add_start_end(50, 33, "Kết thúc")
    
    # Nhánh NO quay lại
    flow.add_elbow_arrow([[66, 68], [88, 68], [88, 80], [82.5, 80]], label="NO", label_pos=(75, 69.5))

    test_output = "c:/Users/Jackie Duong/Desktop/Web_sua_loi/01_Bao_cao_Nghien_cuu/Lưu đồ giải thuật/docs/test_sample_output.jpg"
    flow.save_jpg(test_output)
