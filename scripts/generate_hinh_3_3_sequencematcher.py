# -*- coding: utf-8 -*-
"""
Script thiết kế và xuất ảnh Lưu đồ thuật toán SequenceMatcher & Phân loại lỗi
Chuẩn mực Academic Technical White Paper (Quy trình Long Mode - Tối ưu hóa triệt để):
- Bố cục 3 luồng song song đối xứng hoàn mỹ (Zero line-crossing):
  + Cột Trái (x=14): Khối Match -> Đường dẫn thông thoáng dọc lề trái xuống thanh gom
  + Cột Giữa (x=50): Khối Replace -> Decision Cặp 1-1 -> Bước 4 (4 nhóm lỗi ký tự x=29.5, 43.1, 56.9, 70.5)
  + Cột Phải (x=86): Khối Insert/Delete -> Đường dẫn thông thoáng dọc lề phải xuống thanh gom
- Thanh gom luồng (Collector Bus) tại y=44.8 hợp nhất toàn bộ kết quả vào Bước 5 và Bước 6.
- Khoảng cách và độ dài mũi tên được cân bằng nhịp nhàng (~3.2 - 4.4 đơn vị tọa độ).
- Nền trắng tinh khiết (#FFFFFF), nét đen kỹ thuật (#000000, 1.4pt), font Segoe UI / Arial tiếng Việt.
"""
import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

# Cấu hình font tiếng Việt chuẩn
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def generate_optimized_sequencematcher_flowchart():
    # Canvas khổ dọc chuẩn tỷ lệ trang báo cáo A4 (9.6 x 16.0 inches)
    fig, ax = plt.subplots(figsize=(9.6, 16.0), dpi=150)
    ax.set_xlim(0, 100)
    ax.set_ylim(24, 100)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')

    # 1. TIÊU ĐỀ BIỂU ĐỒ (CĂN GIỮA)
    ax.text(50, 98.4, "LƯU ĐỒ THUẬT TOÁN ĐỐI SOÁT VÀ PHÂN LOẠI LỖI CHÍNH TẢ", 
            ha='center', va='center', fontsize=12.5, fontweight='bold', color='#000000')
    ax.text(50, 96.8, "Hệ sinh thái ViHand Grade — Giải thuật SequenceMatcher kết hợp phân tích âm vị học tiếng Việt", 
            ha='center', va='center', fontsize=8.5, fontstyle='italic', color='#333333')

    # HÀM VẼ KHỐI OVAL (Start / End / Final Output)
    def draw_oval(x, y, title, subtitle=None, w=76, h=4.8):
        box = patches.FancyBboxPatch(
            (x - w/2, y - h/2), w, h,
            boxstyle=f"round,pad=0.2,rounding_size={h/2}",
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5
        )
        ax.add_patch(box)
        if subtitle:
            ax.text(x, y + 0.9, title, ha='center', va='center', fontsize=8.6, fontweight='bold', color='#000000')
            ax.text(x, y - 0.9, subtitle, ha='center', va='center', fontsize=7.5, color='#262626')
        else:
            ax.text(x, y, title, ha='center', va='center', fontsize=8.8, fontweight='bold', color='#000000')

    # HÀM VẼ KHỐI PROCESS (Hình chữ nhật)
    def draw_process(x, y, title, subtitle=None, w=76, h=4.2, is_highlight=False, sub_fontsize=7.4, line_spacing=0.9):
        box = patches.Rectangle(
            (x - w/2, y - h/2), w, h,
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.8 if is_highlight else 1.3
        )
        ax.add_patch(box)
        if subtitle:
            ax.text(x, y + line_spacing, title, ha='center', va='center', fontsize=8.3, fontweight='bold', color='#000000')
            ax.text(x, y - line_spacing, subtitle, ha='center', va='center', fontsize=sub_fontsize, color='#262626')
        else:
            ax.text(x, y, title, ha='center', va='center', fontsize=8.3, fontweight='bold', color='#000000')

    # HÀM VẼ KHỐI I/O (Hình bình hành)
    def draw_io(x, y, title, subtitle=None, w=76, h=4.2):
        offset = 2.4
        poly = patches.Polygon([
            [x - w/2 + offset, y + h/2],
            [x + w/2, y + h/2],
            [x + w/2 - offset, y - h/2],
            [x - w/2, y - h/2]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4)
        ax.add_patch(poly)
        if subtitle:
            ax.text(x, y + 0.9, title, ha='center', va='center', fontsize=8.4, fontweight='bold', color='#000000')
            ax.text(x, y - 1.0, subtitle, ha='center', va='center', fontsize=7.4, color='#262626')
        else:
            ax.text(x, y, title, ha='center', va='center', fontsize=8.4, fontweight='bold', color='#000000')

    # HÀM VẼ KHỐI DECISION (Hình thoi)
    def draw_decision(x, y, title, subtitle=None, w=20, h=4.8):
        diamond = patches.Polygon([
            [x, y + h/2],
            [x + w/2, y],
            [x, y - h/2],
            [x - w/2, y]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4)
        ax.add_patch(diamond)
        if subtitle:
            ax.text(x, y + 0.75, title, ha='center', va='center', fontsize=8.1, fontweight='bold', color='#000000')
            ax.text(x, y - 0.95, subtitle, ha='center', va='center', fontsize=7.2, color='#262626')
        else:
            ax.text(x, y, title, ha='center', va='center', fontsize=8.1, fontweight='bold', color='#000000')

    # HÀM VẼ KHỐI CON NHỎ (Sub-process box)
    def draw_sub_box(x, y, title, subtitle=None, w=12.6, h=4.4):
        box = patches.Rectangle(
            (x - w/2, y - h/2), w, h,
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.2
        )
        ax.add_patch(box)
        if subtitle:
            ax.text(x, y + 0.85, title, ha='center', va='center', fontsize=7.4, fontweight='bold', color='#000000')
            ax.text(x, y - 0.95, subtitle, ha='center', va='center', fontsize=6.5, color='#262626')
        else:
            ax.text(x, y, title, ha='center', va='center', fontsize=7.4, fontweight='bold', color='#000000')

    # HÀM VẼ MŨI TÊN THẲNG
    def draw_arrow(x1, y1, x2, y2, label=None, label_pos=None):
        ax.annotate(
            '', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=0.8, headwidth=4.3, headlength=5.0, shrink=0)
        )
        if label:
            lx = (x1 + x2)/2 if label_pos is None else label_pos[0]
            ly = (y1 + y2)/2 if label_pos is None else label_pos[1]
            ax.text(lx, ly, label, ha='center', va='center', fontsize=7.8, fontweight='bold', color='#000000',
                    bbox=dict(boxstyle='square,pad=0.15', facecolor='#FFFFFF', edgecolor='none'))

    # ================== BẮT ĐẦU VẼ CÁC KHỐI TUẦN TỰ ==================

    # 1. Khối Đầu vào (Hình bình hành)
    y_in = 93.8
    draw_io(50, y_in, 
            "ĐẦU VÀO: CẶP VĂN BẢN ĐỐI SOÁT", 
            "(Văn bản học sinh nhận dạng từ ảnh + Văn bản mẫu chuẩn SGK hoặc ViT5 sửa)")
    draw_arrow(50, y_in - 2.1, 50, 89.8)

    # 2. Bước 1: Tiền xử lý văn bản
    y_b1 = 87.7
    draw_process(50, y_b1, 
                 "Bước 1: Tiền xử lý văn bản (Text Preprocessing)", 
                 "• Chuẩn hóa dấu thanh unicode  • Xóa khoảng trắng thừa  • Đồng nhất kiểu chữ")
    draw_arrow(50, y_b1 - 2.1, 50, 83.7)

    # 3. Bước 2: Tách từ
    y_b2 = 81.6
    draw_process(50, y_b2, 
                 "Bước 2: Phân tách từ vựng (Word Tokenization)", 
                 "• Tách chuỗi thành mảng từ đơn / từ ghép  • Lưu trữ chỉ mục vị trí dòng và câu")
    draw_arrow(50, y_b2 - 2.1, 50, 77.5)

    # 4. Bước 3: Căn chỉnh từ SequenceMatcher
    y_b3 = 75.4
    draw_process(50, y_b3, 
                 "Bước 3: Căn chỉnh cấp độ từ (SequenceMatcher Alignment)", 
                 "Thuật toán dãy con chung dài nhất (LCS) đối soát mảng từ và sinh 3 mã thao tác (Opcode)")

    # ================== 3 NHÁNH ĐỐI XỨNG TỪ BƯỚC 3 ==================
    # Thanh ngang chia 3 nhánh tại y = 72.8
    y_split = 72.8
    ax.plot([14, 86], [y_split, y_split], color='#000000', linewidth=1.1)
    ax.plot([50, 50], [y_b3 - 2.1, y_split], color='#000000', linewidth=1.1)

    y_branch_boxes = 66.8

    # CỘT TRÁI (x=14): Nhánh Match
    draw_arrow(14, y_split, 14, y_branch_boxes + 2.1, 
               label="Trùng khớp\n(Match)", label_pos=(14, 70.3))
    draw_process(14, y_branch_boxes, 
                 "Không trừ điểm", 
                 "(Từ viết đúng 100%)", 
                 w=20, h=4.2)

    # CỘT PHẢI (x=86): Nhánh Insert / Delete
    draw_arrow(86, y_split, 86, y_branch_boxes + 2.1, 
               label="Thừa / Xóa\n(Insert / Delete)", label_pos=(86, 70.3))
    draw_process(86, y_branch_boxes, 
                 "Trừ 0.5 điểm mỗi từ", 
                 "(Lỗi thừa hoặc thiếu từ)", 
                 w=20, h=4.2)

    # CỘT GIỮA (x=50): Nhánh Replace -> Decision "Cặp từ 1-1?"
    draw_arrow(50, y_split, 50, y_branch_boxes + 2.4, 
               label="Thay thế\n(Replace)", label_pos=(50, 70.3))
    draw_decision(50, y_branch_boxes, 
                   "Cặp từ 1 - 1?", 
                   "(1 từ đổi 1 từ)", 
                   w=20, h=4.8)

    # TỪ DECISION "Cặp từ 1-1?":
    # Nhánh KHÔNG (lệch cụm): Cạnh phải hình thoi x=60 -> Mép trái khối Insert/Delete x=76
    draw_arrow(60, y_branch_boxes, 76, y_branch_boxes, 
               label="Không", label_pos=(68.0, y_branch_boxes + 1.2))

    # Nhánh CÓ (đúng cặp 1-1): Đáy hình thoi y=64.4 -> Đỉnh Bước 4 y=60.0
    draw_arrow(50, y_branch_boxes - 2.4, 50, 60.0, 
               label="Có", label_pos=(52.2, 62.4))

    # ================== BƯỚC 4: PHÂN LOẠI LỖI KÝ TỰ ==================
    # Chiều rộng w=56 (từ x=22 đến x=78), cách đều hai luồng biên x=14 và x=86 đúng 8.0 đơn vị
    y_b4 = 57.8
    draw_process(50, y_b4, 
                 "Bước 4: Phân loại chi tiết lỗi cấp độ ký tự & âm vị học", 
                 "Bóc tách 5 thành phần âm tiết tiếng Việt để đối soát từng chữ cái", 
                 w=56, h=4.4, sub_fontsize=7.4)

    # 4 Khối lỗi âm vị học con nằm ngang (X: 29.5, 43.1, 56.9, 70.5)
    y_sub = 50.4
    y_sub_arrow_top = y_b4 - 2.2 # 55.6
    y_sub_split = 54.5
    ax.plot([29.5, 70.5], [y_sub_split, y_sub_split], color='#000000', linewidth=1.1)
    ax.plot([50, 50], [y_sub_arrow_top, y_sub_split], color='#000000', linewidth=1.1)

    sub_items = [
        (29.5, "Lỗi phụ âm đầu", "tr/ch, s/x, d/r/gi..."),
        (43.1, "Lỗi phần vần", "an/ang, uôn/uông"),
        (56.9, "Lỗi dấu thanh", "hỏi/ngã, sắc/huyền"),
        (70.5, "Lỗi viết hoa", "Đầu câu, tên riêng")
    ]
    for sx, stitle, ssub in sub_items:
        draw_arrow(sx, y_sub_split, sx, y_sub + 2.2)
        draw_sub_box(sx, y_sub, stitle, ssub, w=12.6, h=4.4)

    # ================== HỢP LƯU TẤT CẢ VỀ BƯỚC 5 ==================
    # Thanh gom chung (Collector Bus) tại y = 44.8 kéo từ x=14 đến x=86
    y_bus = 44.8
    ax.plot([14, 86], [y_bus, y_bus], color='#000000', linewidth=1.2)

    # 1. Luồng Cột Trái (Match): Đi thẳng dọc x=14 từ y=64.7 xuống thẳng y_bus (x=14 nằm ngoài Bước 4 x=22)
    ax.plot([14, 14], [y_branch_boxes - 2.1, y_bus], color='#000000', linewidth=1.1)

    # 2. Luồng Cột Phải (Insert/Delete): Đi thẳng dọc x=86 từ y=64.7 xuống thẳng y_bus (x=86 nằm ngoài Bước 4 x=78)
    ax.plot([86, 86], [y_branch_boxes - 2.1, y_bus], color='#000000', linewidth=1.1)

    # 3. Luồng từ 4 khối lỗi ký tự: Đi thẳng từ đáy mỗi khối con (y=50.4 - 2.2 = 48.2) xuống y_bus
    for sx, _, _ in sub_items:
        ax.plot([sx, sx], [y_sub - 2.2, y_bus], color='#000000', linewidth=1.1)

    # Mũi tên duy nhất từ tâm thanh gom xuống Bước 5 (y_bus=44.8 -> đỉnh B5=41.4, chiều dài=3.4)
    y_b5 = 38.6
    draw_arrow(50, y_bus, 50, y_b5 + 2.8)

    # ================== BƯỚC 5: TỔNG HỢP ĐIỂM SỐ ==================
    # Chiều cao h=5.6 đảm bảo đệm trên/dưới rộng rãi, cân xứng hoàn hảo
    draw_process(50, y_b5, 
                 "Bước 5: Tổng hợp điểm số theo barem sư phạm (Score Synthesis)", 
                 "• Luồng Chính tả: max(0, 7.0 - Tổng lỗi × 0.5) + Điểm Hình thức (3.0đ)\n• Luồng Tập làm văn: Chính tả (4đ) + Hình thức (3đ) + Nội dung (2đ) + Sáng tạo (1đ)", 
                 w=78, h=5.6, sub_fontsize=7.4, line_spacing=1.0)
    
    # Mũi tên từ đáy Bước 5 (35.8) xuống đỉnh Bước 6 (32.6), chiều dài=3.2
    y_b6 = 30.2
    draw_arrow(50, y_b5 - 2.8, 50, y_b6 + 2.4)

    # ================== BƯỚC 6: KẾT QUẢ ĐẦU RA ==================
    draw_oval(50, y_b6, 
              "KẾT QUẢ ĐẦU RA (FINAL OUTPUT)", 
              "• Điểm tổng kết thang 10  • Bảng định vị hộp bao từ sai  • Lời nhận xét sư phạm", 
              w=76, h=4.8)

    # ================== XUẤT ẢNH JPEG CHẤT LƯỢNG CAO ==================
    target_paths = [
        r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Lưu đồ giải thuật\Hinh_3_3_Giai_thuat_SequenceMatcher.jpg",
        r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\01_Bao_Cao_Tong_Ket_NCKH\Hinh_3_3_Giai_thuat_SequenceMatcher.jpg",
        r"C:\Users\Jackie Duong\.gemini\antigravity\brain\92de4067-ebc0-4563-ac10-c6929f8d5945\Hinh_3_3_Giai_thuat_SequenceMatcher.jpg"
    ]

    for idx, out_path in enumerate(target_paths):
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        temp_png = out_path + ".temp.png"
        fig.savefig(temp_png, format='png', dpi=150, facecolor='#FFFFFF', bbox_inches='tight', pad_inches=0.25)
        img = Image.open(temp_png).convert('RGB')
        img.save(out_path, 'JPEG', quality=95)
        if os.path.exists(temp_png):
            os.remove(temp_png)
        print(f"[SUCCESS] Exported index {idx} - Size: {img.size}")
    
    plt.close(fig)

if __name__ == '__main__':
    generate_optimized_sequencematcher_flowchart()
