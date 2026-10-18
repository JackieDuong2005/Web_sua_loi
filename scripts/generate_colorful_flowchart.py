# -*- coding: utf-8 -*-
"""
Script vẽ lại Lưu đồ giải thuật Chấm điểm và Nhận xét tự động (ViHand Grade)
- Phong cách: Hiện đại, màu sắc trực quan, thẻ bo góc có bóng đổ nhẹ (Modern Colorful UI Cards).
- Từ ngữ: Đơn giản, tự nhiên, KHÔNG học thuật, phù hợp giáo viên và phụ huynh tiểu học.
- Bố cục: Cân đối hoàn hảo, không chồng chéo chữ hay hình khối, đường gióng thẳng tắp.
- Định dạng: Ảnh JPEG (.jpg) độ phân giải cao (2700 x 3900 px).
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

OUTPUT_DIR = r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Lưu đồ giải thuật"
os.makedirs(OUTPUT_DIR, exist_ok=True)

class BeautifulFlowchart:
    def __init__(self, title, subtitle=None, width=18, height=26, dpi=150):
        self.fig, self.ax = plt.subplots(figsize=(width, height), dpi=dpi)
        self.ax.set_xlim(0, 100)
        self.ax.set_ylim(0, 100)
        self.ax.axis('off')
        
        # Nền sáng dịu mắt hiện đại
        self.fig.patch.set_facecolor('#F8FAFC')
        self.ax.set_facecolor('#F8FAFC')
        
        # Khung viền ngoài trang nhã
        border = patches.Rectangle((0.8, 0.8), 98.4, 98.4, linewidth=1.5,
                                   edgecolor='#E2E8F0', facecolor='none', linestyle='-')
        self.ax.add_patch(border)
        
        # Tiêu đề chính
        self.ax.text(50, 98.3, title.upper(), ha='center', va='center',
                     fontsize=15.0, fontweight='bold', color='#0F172A')
        
        # Dòng phụ giải thích
        if subtitle:
            self.ax.text(50, 96.8, subtitle, ha='center', va='center',
                         fontsize=10.2, fontstyle='italic', color='#475569')
            
        # Đường kẻ phân cách đỉnh
        self.ax.plot([4, 96], [95.6, 95.6], color='#E2E8F0', linewidth=1.2)

    def add_shadow(self, x, y, width, height, rounding=0.6):
        """Tạo bóng đổ nhẹ dưới thẻ để tạo chiều sâu giao diện"""
        sx, sy = x + 0.35, y - 0.35
        shadow = patches.FancyBboxPatch(
            (sx - width/2, sy - height/2), width, height,
            boxstyle=f"round,pad=0.15,rounding_size={rounding}",
            edgecolor='none', facecolor='#E2E8F0', alpha=0.75, zorder=1
        )
        self.ax.add_patch(shadow)

    def add_start_end(self, x, y, text, width=22, height=3.2, is_start=True):
        """Khối Bắt đầu / Kết thúc dạng viên thuốc (Pill) nổi bật"""
        self.add_shadow(x, y, width, height, rounding=height/2)
        
        bg_color = '#ECFDF5' if is_start else '#F0FDF4'
        border_color = '#059669' if is_start else '#16A34A'
        txt_color = '#065F46' if is_start else '#14532D'
        
        box = patches.FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle=f"round,pad=0.1,rounding_size={height/2}",
            edgecolor=border_color, facecolor=bg_color, linewidth=2.0, zorder=2
        )
        self.ax.add_patch(box)
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=10.0, fontweight='bold', color=txt_color, zorder=3)
        return (x, y, width, height)

    def add_card(self, x, y, width, height, badge_text, badge_color, desc_lines,
                 bg_color='#FFFFFF', border_color='#CBD5E1', font_size=8.2, badge_w=None):
        """Thẻ xử lý hiện đại gồm: Huy hiệu màu sắc ở đỉnh + Nội dung mô tả rõ ràng"""
        self.add_shadow(x, y, width, height, rounding=0.8)
        
        # Thân thẻ chính
        card = patches.FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle="round,pad=0.15,rounding_size=0.8",
            edgecolor=border_color, facecolor=bg_color, linewidth=1.8, zorder=2
        )
        self.ax.add_patch(card)
        
        # Huy hiệu tiêu đề (Header Badge)
        badge_h = 1.55
        bw = badge_w if badge_w else min(width - 2.5, len(badge_text) * 0.68 + 2.8)
        badge_y = y + height/2 - 0.85
        
        badge = patches.FancyBboxPatch(
            (x - bw/2, badge_y - badge_h/2), bw, badge_h,
            boxstyle="round,pad=0.1,rounding_size=0.75",
            edgecolor='none', facecolor=badge_color, zorder=3
        )
        self.ax.add_patch(badge)
        self.ax.text(x, badge_y, badge_text, ha='center', va='center',
                     fontsize=8.2, fontweight='bold', color='#FFFFFF', zorder=4)
        
        # Các dòng mô tả đơn giản, dễ hiểu
        text_y_start = badge_y - 1.15
        line_spacing = (height - 2.3) / (max(len(desc_lines), 1) + 0.3)
        
        for i, line in enumerate(desc_lines):
            cur_y = text_y_start - i * line_spacing
            is_summary = line.startswith("->") or line.startswith("• Điểm")
            weight = 'bold' if is_summary else 'normal'
            color = '#0F172A' if not line.startswith("  (") else '#475569'
            
            self.ax.text(x - width/2 + 1.8, cur_y, line, ha='left', va='center',
                         fontsize=font_size, fontweight=weight, color=color, zorder=3)
            
        return (x, y, width, height)

    def add_decision(self, x, y, text, width=30, height=5.2, badge_color='#D97706'):
        """Khối điều kiện hình thoi viền vàng ấm áp"""
        # Bóng đổ
        shadow_diamond = patches.Polygon([
            [x + 0.35, y - 0.35 + height/2],
            [x + 0.35 + width/2, y - 0.35],
            [x + 0.35, y - 0.35 - height/2],
            [x + 0.35 - width/2, y - 0.35]
        ], closed=True, edgecolor='none', facecolor='#E2E8F0', alpha=0.75, zorder=1)
        self.ax.add_patch(shadow_diamond)
        
        # Hình thoi chính
        diamond = patches.Polygon([
            [x, y + height/2],
            [x + width/2, y],
            [x, y - height/2],
            [x - width/2, y]
        ], closed=True, edgecolor=badge_color, facecolor='#FFFBEB', linewidth=2.0, zorder=2)
        self.ax.add_patch(diamond)
        
        self.ax.text(x, y, text, ha='center', va='center',
                     fontsize=8.5, fontweight='bold', color='#92400E',
                     multialignment='center', zorder=3)
        return (x, y, width, height)

    def add_database_cylinder(self, x, y, width=10, height=4.5, label="Kho bài mẫu\ntrong CSDL"):
        """Vẽ biểu tượng Database trực quan có màu sắc"""
        self.add_shadow(x, y, width, height, rounding=0.5)
        
        # Thân hộp
        box = patches.FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle="round,pad=0.12,rounding_size=0.5",
            edgecolor='#0891B2', facecolor='#ECFEFF', linewidth=1.6, zorder=2
        )
        self.ax.add_patch(box)
        
        # 3 đĩa tượng trưng cho Database
        for offset_y in [0.9, 0.0, -0.9]:
            ellipse_top = patches.Ellipse((x, y + offset_y + 0.3), width - 2.4, 0.72,
                                          facecolor='#06B6D4', edgecolor='#0891B2', linewidth=1.1, zorder=3)
            self.ax.add_patch(ellipse_top)
            
        self.ax.text(x, y - 1.25, label, ha='center', va='center',
                     fontsize=7.0, fontweight='bold', color='#0E7490', zorder=4)
        return (x, y, width, height)

    def add_reference_card(self, x, y, width=13, height=7.2):
        """Khối bài mẫu giáo viên soạn sẵn / Sách giáo khoa"""
        self.add_shadow(x, y, width, height, rounding=0.6)
        
        # Khung viền nét đứt màu xanh ngọc
        box = patches.FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle="round,pad=0.15,rounding_size=0.6",
            edgecolor='#0D9488', facecolor='#F0FDFA', linewidth=1.6, linestyle='--', zorder=2
        )
        self.ax.add_patch(box)
        
        # Tiêu đề
        self.ax.text(x, y + height/2 - 0.95, "BÀI MẪU CHUẨN", ha='center', va='center',
                     fontsize=7.4, fontweight='bold', color='#0F766E', zorder=3)
        
        # Mô phỏng trang vở kẻ ô ly
        paper_w, paper_h = width - 2.6, height - 2.6
        paper_y = y - 0.5
        paper = patches.Rectangle((x - paper_w/2, paper_y - paper_h/2), paper_w, paper_h,
                                  facecolor='#FFFFFF', edgecolor='#99F6E4', linewidth=0.9, zorder=3)
        self.ax.add_patch(paper)
        
        # Dòng kẻ ô ly mờ
        for grid_y in [-1.3, -0.5, 0.3, 1.1]:
            self.ax.plot([x - paper_w/2 + 0.3, x + paper_w/2 - 0.3],
                         [paper_y + grid_y, paper_y + grid_y],
                         color='#E0F2FE', linewidth=0.7, linestyle=':', zorder=4)
        
        # Chữ viết mẫu minh họa
        lines = [
            "Ngày đầu tuần đi học:",
            "Mỗi buổi sáng thứ hai,",
            "em thức dậy thật sớm...",
            "(SGK hoặc cô soạn)"
        ]
        for i, txt in enumerate(lines):
            style = 'italic' if i == 0 or i == 3 else 'normal'
            col = '#047857' if i < 3 else '#64748B'
            fontw = 'bold' if i == 0 else 'normal'
            self.ax.text(x, paper_y + paper_h/2 - 0.75 - i * 0.8, txt,
                         ha='center', va='center', fontsize=6.2, fontstyle=style,
                         fontweight=fontw, color=col, zorder=5)

    def add_arrow(self, x1, y1, x2, y2, color='#334155', width=1.4,
                  label=None, label_pos=None, label_color='#475569', label_bg='#FFFFFF'):
        """Mũi tên thẳng với đầu mũi tên sắc nét"""
        self.ax.annotate(
            '', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(facecolor=color, edgecolor=color, width=width,
                            headwidth=6.0, headlength=7.0, shrink=0),
            zorder=5
        )
        if label:
            lx = label_pos[0] if label_pos else (x1 + x2)/2
            ly = label_pos[1] if label_pos else (y1 + y2)/2
            bw = len(label) * 0.72 + 2.0
            badge = patches.FancyBboxPatch(
                (lx - bw/2, ly - 0.8), bw, 1.6,
                boxstyle="round,pad=0.1,rounding_size=0.5",
                edgecolor=label_color, facecolor=label_bg, linewidth=1.2, zorder=6
            )
            self.ax.add_patch(badge)
            self.ax.text(lx, ly, label, ha='center', va='center',
                         fontsize=7.3, fontweight='bold', color=label_color, zorder=7)

    def add_elbow_arrow(self, points, color='#334155', width=1.4,
                        label=None, label_pos=None, label_color='#475569', label_bg='#FFFFFF'):
        """Mũi tên gấp khúc vuông góc"""
        for i in range(len(points) - 2):
            p1, p2 = points[i], points[i+1]
            self.ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color=color, linewidth=width, zorder=5)
            
        p_pre, p_end = points[-2], points[-1]
        self.ax.annotate(
            '', xy=(p_end[0], p_end[1]), xytext=(p_pre[0], p_pre[1]),
            arrowprops=dict(facecolor=color, edgecolor=color, width=width,
                            headwidth=6.0, headlength=7.0, shrink=0),
            zorder=5
        )
        if label:
            lx = label_pos[0] if label_pos else (points[0][0] + points[1][0])/2
            ly = label_pos[1] if label_pos else (points[0][1] + points[1][1])/2
            
            bw = len(label) * 0.72 + 2.0
            badge = patches.FancyBboxPatch(
                (lx - bw/2, ly - 0.8), bw, 1.6,
                boxstyle="round,pad=0.1,rounding_size=0.5",
                edgecolor=label_color, facecolor=label_bg, linewidth=1.2, zorder=6
            )
            self.ax.add_patch(badge)
            self.ax.text(lx, ly, label, ha='center', va='center',
                         fontsize=7.3, fontweight='bold', color=label_color, zorder=7)

    def add_rating_card(self, x, y, width=62, height=6.2):
        """Khối xếp loại học lực với các nhãn màu sắc bắt mắt"""
        self.add_shadow(x, y, width, height, rounding=0.8)
        
        card = patches.FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle="round,pad=0.15,rounding_size=0.8",
            edgecolor='#EAB308', facecolor='#FEFCE8', linewidth=1.8, zorder=2
        )
        self.ax.add_patch(card)
        
        # Tiêu đề huy hiệu
        badge_w = 46.0
        badge_h = 1.55
        badge_y = y + height/2 - 0.85
        badge = patches.FancyBboxPatch(
            (x - badge_w/2, badge_y - badge_h/2), badge_w, badge_h,
            boxstyle="round,pad=0.1,rounding_size=0.75",
            edgecolor='none', facecolor='#CA8A04', zorder=3
        )
        self.ax.add_patch(badge)
        self.ax.text(x, badge_y, "XẾP LOẠI HỌC LỰC (THEO CHUẨN THÔNG TƯ 27 - BỘ GD&ĐT)", ha='center', va='center',
                     fontsize=8.2, fontweight='bold', color='#FFFFFF', zorder=4)
        
        # 5 mức xếp loại kèm nhãn màu
        ratings = [
            ("Từ 9.0đ trở lên", "XUẤT SẮC", "#15803D", "#DCFCE7", "Chữ viết rất đẹp, bài làm tròn trịa, biểu dương"),
            ("Từ 7.0đ đến dưới 9.0đ", "TỐT", "#1D4ED8", "#DBEAFE", "Bài làm tốt, câu từ rõ ràng, chỉ mắc vài lỗi nhỏ"),
            ("Từ 5.0đ đến dưới 7.0đ", "KHÁ", "#B45309", "#FEF3C7", "Nội dung đạt yêu cầu, cần chú ý rèn thêm chính tả"),
            ("Từ 3.0đ đến dưới 5.0đ", "TRUNG BÌNH", "#C2410C", "#FFEDD5", "Cần rèn luyện thêm viết chữ và cách đặt câu"),
            ("Dưới 3.0 điểm", "CẦN CỐ GẮNG", "#B91C1C", "#FEE2E2", "Cần giáo viên và phụ huynh hỗ trợ kèm cặp thêm")
        ]
        
        start_y = badge_y - 1.05
        dy = 0.82
        for i, (score_range, rank_name, tag_col, tag_bg, note) in enumerate(ratings):
            cy = start_y - i * dy
            
            # Khoảng điểm
            self.ax.text(x - width/2 + 2.0, cy, f"• {score_range}:", ha='left', va='center',
                         fontsize=7.6, fontweight='bold', color='#334155', zorder=3)
            
            # Huy hiệu xếp loại màu sắc
            pill_x = x - width/2 + 19.5
            pill_w = len(rank_name) * 0.72 + 2.0
            pill = patches.FancyBboxPatch(
                (pill_x - pill_w/2, cy - 0.35), pill_w, 0.72,
                boxstyle="round,pad=0.08,rounding_size=0.35",
                edgecolor=tag_col, facecolor=tag_bg, linewidth=0.9, zorder=3
            )
            self.ax.add_patch(pill)
            self.ax.text(pill_x, cy, rank_name, ha='center', va='center',
                         fontsize=7.2, fontweight='bold', color=tag_col, zorder=4)
            
            # Lời giải thích
            self.ax.text(pill_x + pill_w/2 + 1.2, cy, f"({note})", ha='left', va='center',
                         fontsize=7.3, fontstyle='normal', color='#475569', zorder=3)

    def save_jpg(self, filename="Luu_do_giai_thuat_de_hieu_mau_sac.jpg", quality=95):
        output_path = os.path.join(OUTPUT_DIR, filename)
        temp_png = output_path + ".temp.png"
        self.fig.savefig(temp_png, format='png', dpi=150, facecolor=self.fig.get_facecolor(), bbox_inches='tight')
        plt.close(self.fig)
        
        img = Image.open(temp_png).convert('RGB')
        img.save(output_path, 'JPEG', quality=quality)
        if os.path.exists(temp_png):
            os.remove(temp_png)
        print(f"[THÀNH CÔNG] Đã lưu lưu đồ JPEG: {output_path} (Kích thước ảnh: {img.size})")

def build_beautiful_diagram():
    # Khởi tạo canvas
    flow = BeautifulFlowchart(
        title="LƯU ĐỒ QUY TRÌNH CHẤM BÀI VÀ NHẬN XÉT TỰ ĐỘNG THÔNG MINH",
        subtitle="Hệ thống hỗ trợ giáo viên chấm bài chính tả và bài tập làm văn tiểu học (Giao diện trực quan - Dễ hiểu)",
        width=18, height=26, dpi=150
    )

    # Trục giữa chính của các bước 1 -> 4 và điều kiện
    MID_X = 56.0

    # 1. BẮT ĐẦU
    flow.add_start_end(MID_X, 93.8, "BẮT ĐẦU", width=20, height=2.8, is_start=True)
    flow.add_arrow(MID_X, 92.4, MID_X, 90.3)

    # 2. BƯỚC 1: Chụp hoặc tải ảnh
    flow.add_card(
        x=MID_X, y=87.8, width=54, height=4.8,
        badge_text="BƯỚC 1: CHỤP HOẶC TẢI ẢNH BÀI VIẾT TAY HỌC SINH",
        badge_color='#0284C7', # Xanh da trời
        border_color='#38BDF8', bg_color='#F0F9FF',
        desc_lines=[
            "• Giáo viên dùng điện thoại hoặc máy tính để chụp trang vở của học sinh",
            "• Tải ảnh bài viết lên hệ thống để chuẩn bị tiến hành chấm điểm tự động"
        ]
    )
    flow.add_arrow(MID_X, 85.4, MID_X, 83.3)

    # 3. BƯỚC 2: Căn chỉnh & Làm nét ảnh
    flow.add_card(
        x=MID_X, y=80.6, width=54, height=5.2,
        badge_text="BƯỚC 2: TỰ ĐỘNG CĂN CHỈNH VÀ LÀM NÉT ẢNH",
        badge_color='#0D9488', # Xanh ngọc
        border_color='#2DD4BF', bg_color='#F0FDFA',
        desc_lines=[
            "• Tự động xoay ngay ngắn và nắn thẳng trang giấy bị nghiêng khi chụp",
            "• Xóa bóng mờ của bàn tay và điện thoại đổ lên trang vở",
            "• Làm đậm nét bút chì mờ và tự động lọc sạch các đường kẻ ô ly để dễ đọc chữ"
        ]
    )
    flow.add_arrow(MID_X, 78.0, MID_X, 75.9)

    # 4. BƯỚC 3: AI Đọc chữ viết tay
    flow.add_card(
        x=MID_X, y=73.2, width=54, height=5.2,
        badge_text="BƯỚC 3: TRÍ TUỆ NHÂN TẠO (AI) ĐỌC CHỮ VIẾT TAY",
        badge_color='#7C3AED', # Tím hoa cà
        border_color='#A78BFA', bg_color='#FAF5FF',
        desc_lines=[
            "• AI thông minh tự động đọc chữ viết tay và chuyển thành văn bản máy tính",
            "• Nhận biết bài là thơ hay văn xuôi để canh hàng đúng chuẩn",
            "• Giữ nguyên vẹn 100% lỗi sai của học sinh để chuyển sang bước chấm điểm"
        ]
    )
    flow.add_arrow(MID_X, 70.6, MID_X, 68.5)

    # 5. BƯỚC 4: Xác định vị trí từng từ
    flow.add_card(
        x=MID_X, y=65.8, width=54, height=5.2,
        badge_text="BƯỚC 4: XÁC ĐỊNH VỊ TRÍ TỪNG TỪ TRÊN TRANG VỞ",
        badge_color='#2563EB', # Xanh dương
        border_color='#60A5FA', bg_color='#EFF6FF',
        desc_lines=[
            "• Tự động tìm và khoanh vùng khung vị trí của từng từ ngữ trên trang giấy",
            "• Gom các từ thành từng dòng viết theo thứ tự từ trên xuống dưới",
            "• Sắp xếp đúng thứ tự từ trái sang phải như lúc học sinh viết bài"
        ]
    )
    flow.add_arrow(MID_X, 63.2, MID_X, 60.9)

    # =========================================================================
    # CỘT PHỤ BÊN TRÁI: KHO BÀI MẪU CHUẨN (KHÔNG CHỒNG CHÉO)
    # =========================================================================
    REF_X = 9.5
    flow.add_reference_card(x=REF_X, y=60.8, width=13, height=7.2)
    flow.add_arrow(REF_X, 57.2, REF_X, 55.7, color='#0891B2', width=1.4)
    flow.add_database_cylinder(x=REF_X, y=53.4, width=10, height=4.5, label="Kho bài mẫu\ntrong CSDL")

    # Tọa độ 2 cột phân nhánh:
    LEFT_COL_X = 40.0   # Cột trái: Bài chính tả (rộng 29.5 -> mép trái tại 25.25)
    RIGHT_COL_X = 74.0  # Cột phải: Tập làm văn (rộng 29.5 -> mép phải tại 88.75)
    COL_W = 29.5        # Chiều rộng thẻ phân nhánh

    # Mũi tên từ Database sang Khối bài mẫu bên Luồng 1 (ngang, có khoảng đệm 10 đơn vị)
    flow.add_arrow(REF_X + 5.0, 53.4, LEFT_COL_X - COL_W/2, 53.4,
                   color='#0891B2', width=1.4,
                   label="Nạp bài mẫu", label_pos=(20.0, 54.8),
                   label_color='#0E7490', label_bg='#ECFEFF')

    # =========================================================================
    # ĐIỀU KIỆN 1: BÀI CÓ SẴN BÀI MẪU KHÔNG?
    # =========================================================================
    flow.add_decision(
        x=MID_X, y=58.5, width=28, height=4.8,
        badge_color='#D97706',
        text="Bài viết có sẵn\nbài mẫu chuẩn không?"
    )

    # -------------------------------------------------------------------------
    # NHÁNH CÓ (BÊN TRÁI) -> BÀI CHÍNH TẢ
    # -------------------------------------------------------------------------
    flow.add_elbow_arrow(
        [[MID_X - 14.0, 58.5], [LEFT_COL_X, 58.5], [LEFT_COL_X, 55.5]],
        color='#16A34A', width=1.8,
        label="CÓ (Bài chính tả)", label_pos=(45.5, 59.8),
        label_color='#15803D', label_bg='#DCFCE7'
    )

    # Khối 5A: Bài mẫu sẵn có trong kho
    flow.add_card(
        x=LEFT_COL_X, y=53.4, width=COL_W, height=3.8,
        badge_text="LẤY BÀI MẪU TỪ KHO DỮ LIỆU",
        badge_color='#0D9488',
        border_color='#5EEAD4', bg_color='#F0FDFA',
        desc_lines=[
            "• Nạp văn bản chuẩn từ kho Sách giáo khoa",
            "• Dùng làm thước đo chuẩn để đối chiếu 1-1"
        ],
        font_size=7.6
    )
    flow.add_arrow(LEFT_COL_X, 51.5, LEFT_COL_X, 49.6, color='#16A34A', width=1.6)

    # Khối 6A: So sánh từng từ với bài mẫu
    flow.add_card(
        x=LEFT_COL_X, y=45.6, width=COL_W, height=6.8,
        badge_text="LUỒNG 1: SO SÁNH TỪNG TỪ VỚI BÀI MẪU",
        badge_color='#16A34A',
        border_color='#4ADE80', bg_color='#F0FDF4',
        desc_lines=[
            "• Đối chiếu từng từ của học sinh với bài mẫu chuẩn",
            "• Phát hiện chữ viết sai, thiếu chữ hoặc thừa chữ",
            "• Phân loại lỗi: Viết hoa, dấu thanh, âm đầu, vần, dấu câu",
            "• Đánh dấu đúng vị trí chữ sai trên hình ảnh trang vở"
        ],
        font_size=7.6
    )
    flow.add_arrow(LEFT_COL_X, 42.2, LEFT_COL_X, 40.2, color='#16A34A', width=1.6)

    # Khối 7A: Chấm điểm bài chính tả
    flow.add_card(
        x=LEFT_COL_X, y=36.4, width=COL_W, height=6.4,
        badge_text="CHẤM ĐIỂM BÀI CHÍNH TẢ (THANG 10 ĐIỂM)",
        badge_color='#059669',
        border_color='#34D399', bg_color='#ECFDF5',
        desc_lines=[
            "• Đúng chính tả: Tối đa 7.0 điểm (sai mỗi lỗi trừ 0.5đ)",
            "• Chữ viết & Trình bày: Tối đa 3.0 điểm",
            "  (Chữ sạch đẹp, lùi đầu dòng, không bôi xóa)",
            "-> Tổng điểm tối đa: 10.0 điểm"
        ],
        font_size=7.6
    )

    # -------------------------------------------------------------------------
    # NHÁNH KHÔNG (BÊN PHẢI) -> BÀI TẬP LÀM VĂN
    # -------------------------------------------------------------------------
    flow.add_elbow_arrow(
        [[MID_X + 14.0, 58.5], [RIGHT_COL_X, 58.5], [RIGHT_COL_X, 55.5]],
        color='#EA580C', width=1.8,
        label="KHÔNG (Tập làm văn)", label_pos=(67.5, 59.8),
        label_color='#C2410C', label_bg='#FFEDD5'
    )

    # Khối 5B: AI tự động đọc hiểu bài văn
    flow.add_card(
        x=RIGHT_COL_X, y=52.8, width=COL_W, height=5.0,
        badge_text="LUỒNG 2: AI TỰ ĐỘNG ĐỌC HIỂU ĐOẠN VĂN",
        badge_color='#EA580C',
        border_color='#FB923C', bg_color='#FFF7ED',
        desc_lines=[
            "• AI tự đọc hiểu nội dung đoạn văn tự do của học sinh",
            "• Phát hiện các lỗi sai chính tả và gợi ý từ ngữ đúng",
            "• Có cơ chế dự phòng thông minh không lo gián đoạn"
        ],
        font_size=7.6
    )
    flow.add_arrow(RIGHT_COL_X, 50.3, RIGHT_COL_X, 48.4, color='#EA580C', width=1.6)

    # Khối 6B: Đối chiếu lỗi sai và định vị
    flow.add_card(
        x=RIGHT_COL_X, y=45.6, width=COL_W, height=5.2,
        badge_text="ĐỐI CHIẾU LỖI SAI VÀ ĐÁNH DẤU VỊ TRÍ",
        badge_color='#D97706',
        border_color='#FBBF24', bg_color='#FFFBEB',
        desc_lines=[
            "• So sánh bài học sinh viết với đoạn văn AI đã sửa đúng",
            "• Phân loại cụ thể từng lỗi sai: Dấu thanh, âm đầu, vần...",
            "• Định vị chính xác chữ bị sai trên hình ảnh trang vở"
        ],
        font_size=7.6
    )
    flow.add_arrow(RIGHT_COL_X, 43.0, RIGHT_COL_X, 41.0, color='#EA580C', width=1.6)

    # Khối 7B: Chấm điểm tập làm văn 4 phần
    flow.add_card(
        x=RIGHT_COL_X, y=36.4, width=COL_W, height=8.0,
        badge_text="CHẤM ĐIỂM TẬP LÀM VĂN (THANG 10 ĐIỂM)",
        badge_color='#C2410C',
        border_color='#F87171', bg_color='#FEF2F2',
        desc_lines=[
            "• Chính tả & Câu từ: Tối đa 4.0 điểm (sai mỗi lỗi trừ 0.5đ)",
            "• Hình thức đoạn văn: Tối đa 3.0 điểm (chữ viết, lùi dòng)",
            "• Nội dung bài viết: Tối đa 2.0 điểm (đúng đề, câu rõ ý)",
            "• Sáng tạo: Tối đa 1.0 điểm (dùng từ láy, so sánh hay)",
            "-> Tổng điểm tối đa: 10.0 điểm"
        ],
        font_size=7.6
    )

    # =========================================================================
    # HỢP LƯU VÀO ĐIỀU KIỆN 2: AI VIẾT NHẬN XÉT SƯ PHẠM
    # =========================================================================
    # Nối từ 7A xuống Điều kiện 2
    flow.add_elbow_arrow([[LEFT_COL_X, 33.2], [LEFT_COL_X, 29.8], [MID_X - 14.0, 29.8]],
                         color='#334155', width=1.5)
    # Nối từ 7B xuống Điều kiện 2
    flow.add_elbow_arrow([[RIGHT_COL_X, 32.4], [RIGHT_COL_X, 29.8], [MID_X + 14.0, 29.8]],
                         color='#334155', width=1.5)

    flow.add_decision(
        x=MID_X, y=29.8, width=28, height=4.6,
        badge_color='#D97706',
        text="Hệ thống AI viết\nnhận xét sẵn sàng?"
    )

    # NHÁNH CÓ (BÊN TRÁI) -> AI VIẾT NHẬN XÉT
    flow.add_elbow_arrow(
        [[MID_X - 14.0, 29.8], [LEFT_COL_X, 29.8], [LEFT_COL_X, 26.8]],
        color='#7C3AED', width=1.8,
        label="CÓ (Dùng AI)", label_pos=(45.5, 31.0),
        label_color='#6D28D9', label_bg='#EDE9FE'
    )
    flow.add_card(
        x=LEFT_COL_X, y=24.0, width=COL_W, height=4.6,
        badge_text="AI TỰ ĐỘNG VIẾT LỜI NHẬN XÉT SƯ PHẠM",
        badge_color='#7C3AED',
        border_color='#C4B5FD', bg_color='#F5F3FF',
        desc_lines=[
            "• Sinh lời nhận xét thân thiện, ấm áp và gần gũi",
            "• Khen ngợi điểm tốt, chữ đẹp hoặc câu văn hay",
            "• Nhắc nhở lỗi sai nhẹ nhàng và khích lệ con tiến bộ"
        ],
        font_size=7.5
    )

    # NHÁNH KHÔNG (BÊN PHẢI) -> DÙNG CÂU MẪU CÓ SẴN
    flow.add_elbow_arrow(
        [[MID_X + 14.0, 29.8], [RIGHT_COL_X, 29.8], [RIGHT_COL_X, 26.8]],
        color='#475569', width=1.8,
        label="KHÔNG (Dùng câu mẫu)", label_pos=(67.5, 31.0),
        label_color='#334155', label_bg='#F1F5F9'
    )
    flow.add_card(
        x=RIGHT_COL_X, y=24.0, width=COL_W, height=4.6,
        badge_text="SỬ DỤNG LỜI NHẬN XÉT MẪU CHUẨN MỰC",
        badge_color='#475569',
        border_color='#94A3B8', bg_color='#F8FAFC',
        desc_lines=[
            "• Tự động chọn câu nhận xét chuẩn mực từ ngân hàng",
            "• Khớp chính xác theo số lỗi sai và mức điểm số",
            "• Đảm bảo luôn có lời động viên kịp thời cho học sinh"
        ],
        font_size=7.5
    )

    # Hợp lưu từ 2 nhánh nhận xét xuống Xếp loại
    flow.add_elbow_arrow([[LEFT_COL_X, 21.7], [LEFT_COL_X, 19.8], [MID_X - 2.0, 19.8], [MID_X - 2.0, 18.5]],
                         color='#334155', width=1.5)
    flow.add_elbow_arrow([[RIGHT_COL_X, 21.7], [RIGHT_COL_X, 19.8], [MID_X + 2.0, 19.8], [MID_X + 2.0, 18.5]],
                         color='#334155', width=1.5)

    # =========================================================================
    # XẾP LOẠI HỌC LỰC (THÔNG TƯ 27)
    # =========================================================================
    flow.add_rating_card(x=MID_X, y=15.1, width=62, height=6.2)
    flow.add_arrow(MID_X, 12.0, MID_X, 9.9)

    # =========================================================================
    # HIỂN THỊ KẾT QUẢ CHO GIÁO VIÊN & HỌC SINH
    # =========================================================================
    flow.add_card(
        x=MID_X, y=7.0, width=62, height=5.0,
        badge_text="HIỂN THỊ KẾT QUẢ TRỰC QUAN CHO GIÁO VIÊN & HỌC SINH",
        badge_color='#0F766E', # Xanh ngọc sẫm
        border_color='#14B8A6', bg_color='#F0FDFA',
        desc_lines=[
            "• Khoanh khung đỏ nổi bật các chữ viết sai ngay trên hình ảnh bài viết",
            "• Bảng điểm rõ ràng từng tiêu chí: Chính tả, Trình bày, Nội dung, Sáng tạo",
            "• Lời nhận xét sư phạm ấm áp động viên học sinh và gửi cho phụ huynh xem",
            "• Tự động lưu kết quả vào hệ thống để theo dõi sự tiến bộ qua từng tuần học"
        ],
        font_size=7.8
    )
    flow.add_arrow(MID_X, 4.5, MID_X, 2.8)

    # =========================================================================
    # KẾT THÚC
    # =========================================================================
    flow.add_start_end(MID_X, 1.4, "HOÀN THÀNH", width=20, height=2.4, is_start=False)

    flow.save_jpg("Luu_do_giai_thuat_de_hieu_mau_sac.jpg")

if __name__ == "__main__":
    build_beautiful_diagram()
