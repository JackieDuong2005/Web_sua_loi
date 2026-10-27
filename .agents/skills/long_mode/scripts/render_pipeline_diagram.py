"""
Script ve lai Luu do Tien xu ly anh (Image Preprocessing Pipeline)
Xuat file JPEG (.jpg) chuan:
1. Ban Academic White Paper (Trang den hoc thuat theo GEMINI.md)
2. Ban Modern Clean Vector (Mau sac pastel cao cap, dung 100% nguyen ban mau goc)
"""

import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

# Thiet lap font tieng Viet tren Windows
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans', 'Tahoma']
plt.rcParams['axes.unicode_minus'] = False


def create_academic_flowchart(output_path):
    """
    Ve luu do chuan Academic White Paper (Den trang, toi gian, chuan IEEE / Bao cao KH)
    """
    fig_w, fig_h = 8.2, 16.0
    aspect_ratio = fig_h / fig_w  # ~1.951
    
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=180)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')

    # Tieu de
    ax.text(50, 98.2, "QUY TRÌNH TIỀN XỬ LÝ ẢNH BÀI THI", ha='center', va='center',
            fontsize=15.5, fontweight='bold', color='#000000')
    ax.text(50, 96.3, "Pipeline: lib/image-processor.ts — 9 Bước Chuẩn Hóa & Thẩm Định Chất Lượng",
            ha='center', va='center', fontsize=8.8, fontstyle='italic', color='#333333')

    # 1. Input Box (Pill / Oval Start)
    input_box = patches.FancyBboxPatch(
        (16, 91.2), 68, 3.4,
        boxstyle="round,pad=0.2,rounding_size=1.2",
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5
    )
    ax.add_patch(input_box)
    ax.text(50, 92.9, "[Input] Ảnh gốc từ điện thoại (Camera / Upload)",
            ha='center', va='center', fontsize=9.5, fontweight='bold', color='#000000')

    # Mui ten xuong
    def draw_arrow(y_top, y_bottom, label=None, label_pos=None):
        ax.annotate(
            '', xy=(50, y_bottom), xytext=(50, y_top),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.1, headwidth=5.5, headlength=6.5, shrink=0)
        )
        if label:
            lx, ly = (50, (y_top + y_bottom)/2) if label_pos is None else label_pos
            ax.text(lx, ly, label, ha='center', va='center', fontsize=8.5, fontweight='bold',
                    color='#000000', bbox=dict(boxstyle='square,pad=0.15', facecolor='#FFFFFF', edgecolor='none'))

    draw_arrow(91.2, 88.2)

    # 9 Buoc tien xu ly
    steps = [
        ("1", "EXIF Auto-rotate", "Tự động xoay ảnh đúng chiều theo metadata EXIF Orientation"),
        ("2", "Resize (max 1600px)", "Thu nhỏ kích thước (chiều rộng tối đa 1600px), tối ưu dung lượng"),
        ("3", "White Balance (Gray World)", "Cân bằng trắng theo thuật toán Gray World, triệt tiêu ám màu"),
        ("4", "Grayscale Conversion", "Chuyển sang ảnh mức xám (chuẩn độ chói ITU-R BT.601)"),
        ("5", "Shadow Removal", "Khử bóng đổ cục bộ bằng Integral Image & Box Blur (K=51)"),
        ("6", "CLAHE", "Tăng cường tương phản cục bộ thích ứng, làm đậm nét bút chì"),
        ("7", "Unsharp Mask", "Làm sắc nét cạnh viền chữ và bảo toàn các dấu thanh tiếng Việt"),
        ("8", "Adaptive Threshold", "Nhị phân hóa thích nghi (Mean/Gaussian), tách nét chữ khỏi nền vở ô ly"),
        ("9", "Quality Assessment", "Thẩm định chất lượng ảnh (độ mờ Laplacian, độ sáng, tỷ lệ nét chữ)")
    ]

    cur_y = 88.2
    step_height = 5.2
    gap = 2.0

    badge_d_x = 3.8
    badge_d_y = badge_d_x / aspect_ratio

    for idx, name, desc in steps:
        box_y = cur_y - step_height
        
        # Hop xu ly (Process box)
        rect = patches.FancyBboxPatch(
            (12, box_y), 76, step_height,
            boxstyle="round,pad=0.2,rounding_size=0.6",
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
        )
        ax.add_patch(rect)

        # Badge so buoc hinh tron hoan hao
        badge_center_y = box_y + step_height/2
        badge = patches.Ellipse(
            (17.5, badge_center_y), badge_d_x, badge_d_y,
            edgecolor='#000000', facecolor='#000000'
        )
        ax.add_patch(badge)
        ax.text(17.5, badge_center_y, idx, ha='center', va='center',
                fontsize=9.5, fontweight='bold', color='#FFFFFF')

        # Noi dung buoc
        ax.text(22, box_y + step_height/2 + 0.9, name, ha='left', va='center',
                fontsize=9.2, fontweight='bold', color='#000000')
        ax.text(22, box_y + step_height/2 - 1.0, desc, ha='left', va='center',
                fontsize=7.8, fontstyle='normal', color='#222222')

        # Mui ten xuong buoc tiep theo
        next_top = box_y - gap
        draw_arrow(box_y, next_top)
        cur_y = next_top

    # Hinh thoi Decision: Chat luong dat?
    decision_y = cur_y - 2.8
    d_width = 28
    d_height = 5.6
    diamond = patches.Polygon([
        [50, decision_y + d_height/2],
        [50 + d_width/2, decision_y],
        [50, decision_y - d_height/2],
        [50 - d_width/2, decision_y]
    ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5)
    ax.add_patch(diamond)
    ax.text(50, decision_y, "Chất lượng đạt?", ha='center', va='center',
            fontsize=8.8, fontweight='bold', color='#000000')

    # Nhanh NO sang phai
    p_right = 50 + d_width/2
    warn_box_x = 73
    ax.annotate(
        '', xy=(warn_box_x, decision_y), xytext=(p_right, decision_y),
        arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.1, headwidth=5.5, headlength=6.5, shrink=0)
    )
    ax.text((p_right + warn_box_x)/2, decision_y + 1.2, "NO", ha='center', va='center',
            fontsize=8.5, fontweight='bold', color='#000000')

    # Hop Canh bao nguoi dung
    warn_box = patches.FancyBboxPatch(
        (warn_box_x, decision_y - 2.4), 21, 4.8,
        boxstyle="round,pad=0.2,rounding_size=0.6",
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(warn_box)
    ax.text(warn_box_x + 10.5, decision_y + 0.7, "Cảnh báo người dùng", ha='center', va='center',
            fontsize=8.0, fontweight='bold', color='#000000')
    ax.text(warn_box_x + 10.5, decision_y - 0.8, "(Chụp lại ảnh nét)", ha='center', va='center',
            fontsize=7.2, fontstyle='italic', color='#333333')

    # Nhanh YES xuong duoi
    draw_arrow(decision_y - d_height/2, decision_y - d_height/2 - 3.4, label="YES",
               label_pos=(55.0, decision_y - d_height/2 - 1.7))

    # Output Box
    out_y = decision_y - d_height/2 - 3.4 - 2.3
    out_box = patches.FancyBboxPatch(
        (14, out_y - 2.3), 44, 4.8,
        boxstyle="round,pad=0.2,rounding_size=0.8",
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5
    )
    ax.add_patch(out_box)
    ax.text(36, out_y + 0.8, "[Output] Ảnh đã xử lý", ha='center', va='center',
            fontsize=9.2, fontweight='bold', color='#000000')
    ax.text(36, out_y - 0.9, "(JPEG, base64 sạch nền)", ha='center', va='center',
            fontsize=7.8, fontstyle='normal', color='#333333')

    # Mui ten sang phai den module AI
    ax.annotate(
        '', xy=(66.5, out_y), xytext=(58, out_y),
        arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.1, headwidth=5.5, headlength=6.5, shrink=0)
    )

    # Box Gui cho AI
    ai_box = patches.FancyBboxPatch(
        (66.5, out_y - 2.3), 23.5, 4.8,
        boxstyle="round,pad=0.2,rounding_size=0.8",
        edgecolor='#000000', facecolor='#000000', linewidth=1.5
    )
    ax.add_patch(ai_box)
    ax.text(78.25, out_y + 0.8, "Gửi cho AI", ha='center', va='center',
            fontsize=9.2, fontweight='bold', color='#FFFFFF')
    ax.text(78.25, out_y - 0.9, "(Mô hình OCR ViT5)", ha='center', va='center',
            fontsize=7.8, color='#DDDDDD')

    # Luu file
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    temp_png = output_path + ".temp.png"
    plt.savefig(temp_png, format='png', dpi=180, facecolor='#FFFFFF', bbox_inches='tight')
    plt.close(fig)

    img = Image.open(temp_png).convert('RGB')
    img.save(output_path, 'JPEG', quality=95)
    if os.path.exists(temp_png):
        os.remove(temp_png)


def create_modern_flowchart(output_path):
    """
    Ve luu do chuan Modern Clean Pastel (Mau sac pastel cao cap, dung 100% nguyen ban mau goc)
    """
    fig_w, fig_h = 8.2, 16.0
    aspect_ratio = fig_h / fig_w  # ~1.951

    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=180)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')

    # Khung vien ngoai bo goc
    outer_border = patches.FancyBboxPatch(
        (2.5, 0.8), 95, 98.4,
        boxstyle="round,pad=0.4,rounding_size=2.0",
        edgecolor='#E2E8F0', facecolor='#FFFFFF', linewidth=1.5
    )
    ax.add_patch(outer_border)

    # Tieu de tong the
    ax.text(50, 97.4, "HỆ THỐNG TIỀN XỬ LÝ ẢNH BÀI THI", ha='center', va='center',
            fontsize=15, fontweight='bold', color='#1E293B')
    ax.text(50, 95.5, "Image Preprocessing & Quality Assessment Pipeline",
            ha='center', va='center', fontsize=8.8, color='#64748B')

    # 1. Input Box
    input_box = patches.FancyBboxPatch(
        (18, 90.2), 64, 3.6,
        boxstyle="round,pad=0.2,rounding_size=1.2",
        edgecolor='#CBD5E1', facecolor='#F8FAFC', linewidth=1.2
    )
    ax.add_patch(input_box)
    
    # Icon dien thoai mini bang vector
    ax.add_patch(patches.FancyBboxPatch((23.5, 91.1), 1.8, 1.8/aspect_ratio*1.6,
                                       boxstyle="round,pad=0.05,rounding_size=0.3",
                                       edgecolor='#475569', facecolor='#64748B', linewidth=1.0))
    ax.text(51, 92.0, "[Input]  Ảnh gốc từ điện thoại",
            ha='center', va='center', fontsize=9.5, fontweight='bold', color='#1E293B')

    def draw_arrow(y_top, y_bottom, color='#94A3B8'):
        ax.annotate(
            '', xy=(50, y_bottom), xytext=(50, y_top),
            arrowprops=dict(facecolor=color, edgecolor=color, width=1.1, headwidth=5.5, headlength=6.5, shrink=0)
        )

    draw_arrow(90.2, 88.0)

    # 9 Buoc voi bang mau pastel giong anh mau goc
    # (badge_color, bg_color, border_color, title, desc, tag_symbol)
    steps_data = [
        (
            '#2563EB', '#EFF6FF', '#BFDBFE',
            'EXIF Auto-rotate', 'Tự động xoay ảnh đúng chiều', 'ROT'
        ),
        (
            '#0284C7', '#F0F9FF', '#BAE6FD',
            'Resize (max 1600px)', 'Thu nhỏ ảnh, tối ưu dung lượng', 'RES'
        ),
        (
            '#16A34A', '#F0FDF4', '#BBF7D0',
            'White Balance (Gray World)', 'Cân bằng trắng, sửa ám màu', 'WB'
        ),
        (
            '#059669', '#ECFDF5', '#A7F3D0',
            'Grayscale', 'Chuyển ảnh xám', 'GRAY'
        ),
        (
            '#EA580C', '#FFF7ED', '#FED7AA',
            'Shadow Removal', 'Xóa bóng tay/điện thoại', 'SHD'
        ),
        (
            '#9333EA', '#FAF5FF', '#E9D5FF',
            'CLAHE', 'Tăng tương phản nét bút chì', 'CLH'
        ),
        (
            '#7C3AED', '#F5F3FF', '#DDD6FE',
            'Unsharp Mask', 'Làm sắc nét cạnh chữ', 'SHP'
        ),
        (
            '#E11D48', '#FFF1F2', '#FECDD3',
            'Adaptive Threshold', 'Nhị phân hóa thích nghi', 'BIN'
        ),
        (
            '#DC2626', '#FEF2F2', '#FECACA',
            'Quality Assessment', 'Đánh giá chất lượng ảnh', 'QA'
        )
    ]

    cur_y = 88.0
    step_height = 5.2
    gap = 2.0

    badge_d_x = 4.2
    badge_d_y = badge_d_x / aspect_ratio

    for idx, (badge_c, bg_c, border_c, title, desc, tag) in enumerate(steps_data, 1):
        box_y = cur_y - step_height
        
        # The chu nhat bo goc
        card = patches.FancyBboxPatch(
            (14, box_y), 72, step_height,
            boxstyle="round,pad=0.2,rounding_size=1.0",
            edgecolor=border_c, facecolor=bg_c, linewidth=1.2
        )
        ax.add_patch(card)

        # Huy hieu so buoc ben trai (Hinh tron hoan hao)
        badge_y = box_y + step_height/2
        badge = patches.Ellipse(
            (8.5, badge_y), badge_d_x, badge_d_y,
            edgecolor='none', facecolor=badge_c
        )
        ax.add_patch(badge)
        ax.text(8.5, badge_y, str(idx), ha='center', va='center',
                fontsize=9.8, fontweight='bold', color='#FFFFFF')

        # Icon tag nho tao diem nhan
        tag_box = patches.FancyBboxPatch(
            (16.5, badge_y - 1.2), 4.8, 2.4,
            boxstyle="round,pad=0.1,rounding_size=0.4",
            edgecolor=border_c, facecolor='#FFFFFF', linewidth=1.0
        )
        ax.add_patch(tag_box)
        ax.text(18.9, badge_y, tag, ha='center', va='center',
                fontsize=6.8, fontweight='bold', color=badge_c)

        # Ten buoc & Mo ta
        ax.text(23.5, box_y + step_height/2 + 0.9, title, ha='left', va='center',
                fontsize=9.2, fontweight='bold', color='#0F172A')
        ax.text(23.5, box_y + step_height/2 - 1.0, desc, ha='left', va='center',
                fontsize=7.8, color='#475569')

        # Mui ten xuong
        next_top = box_y - gap
        draw_arrow(box_y, next_top)
        cur_y = next_top

    # Hinh thoi Decision: Chat luong dat?
    decision_y = cur_y - 2.8
    d_width = 28
    d_height = 5.6
    diamond = patches.Polygon([
        [50, decision_y + d_height/2],
        [50 + d_width/2, decision_y],
        [50, decision_y - d_height/2],
        [50 - d_width/2, decision_y]
    ], closed=True, edgecolor='#64748B', facecolor='#F8FAFC', linewidth=1.5)
    ax.add_patch(diamond)
    
    # Huy hieu checkmark tren chop hinh thoi
    check_badge = patches.Ellipse(
        (50, decision_y + d_height/2 + 0.3), 2.8, 2.8 / aspect_ratio,
        edgecolor='none', facecolor='#16A34A'
    )
    ax.add_patch(check_badge)
    # Ve checkmark bang vector lines
    chk_x, chk_y = 50, decision_y + d_height/2 + 0.3
    ax.plot([chk_x - 0.6, chk_x - 0.1, chk_x + 0.7],
            [chk_y + 0.05, chk_y - 0.35, chk_y + 0.45],
            color='#FFFFFF', linewidth=1.6, solid_capstyle='round')

    ax.text(50, decision_y, "Chất lượng đạt?", ha='center', va='center',
            fontsize=8.8, fontweight='bold', color='#0F172A')

    # Nhanh NO (sang phai, mau do)
    p_right = 50 + d_width/2
    warn_x = 73
    ax.annotate(
        '', xy=(warn_x, decision_y), xytext=(p_right, decision_y),
        arrowprops=dict(facecolor='#EF4444', edgecolor='#EF4444', width=1.1, headwidth=5.5, headlength=6.5, shrink=0)
    )
    ax.text((p_right + warn_x)/2, decision_y + 1.2, "No", ha='center', va='center',
            fontsize=8.5, fontweight='bold', color='#DC2626')

    # Box Canh bao nguoi dung
    warn_card = patches.FancyBboxPatch(
        (warn_x, decision_y - 2.4), 21, 4.8,
        boxstyle="round,pad=0.2,rounding_size=0.8",
        edgecolor='#FECACA', facecolor='#FEF2F2', linewidth=1.2
    )
    ax.add_patch(warn_card)
    ax.text(warn_x + 10.5, decision_y + 0.7, "Cảnh báo", ha='center', va='center',
            fontsize=8.2, fontweight='bold', color='#DC2626')
    ax.text(warn_x + 10.5, decision_y - 0.8, "người dùng", ha='center', va='center',
            fontsize=7.8, fontweight='bold', color='#DC2626')

    # Nhanh YES (xuong duoi, mau xanh)
    ax.annotate(
        '', xy=(50, decision_y - d_height/2 - 3.4), xytext=(50, decision_y - d_height/2),
        arrowprops=dict(facecolor='#16A34A', edgecolor='#16A34A', width=1.1, headwidth=5.5, headlength=6.5, shrink=0)
    )
    ax.text(54.5, decision_y - d_height/2 - 1.7, "Yes", ha='center', va='center',
            fontsize=8.5, fontweight='bold', color='#16A34A')

    # Output Box (xanh la nhe)
    out_y = decision_y - d_height/2 - 3.4 - 2.3
    out_box = patches.FancyBboxPatch(
        (15, out_y - 2.3), 43, 4.8,
        boxstyle="round,pad=0.2,rounding_size=1.0",
        edgecolor='#BBF7D0', facecolor='#F0FDF4', linewidth=1.2
    )
    ax.add_patch(out_box)
    ax.text(36.5, out_y + 0.8, "[Output] Ảnh đã xử lý", ha='center', va='center',
            fontsize=8.8, fontweight='bold', color='#166534')
    ax.text(36.5, out_y - 0.9, "(JPEG, base64)", ha='center', va='center',
            fontsize=7.8, color='#15803D')

    # Mui ten sang Box AI
    ax.annotate(
        '', xy=(66.5, out_y), xytext=(58, out_y),
        arrowprops=dict(facecolor='#94A3B8', edgecolor='#94A3B8', width=1.1, headwidth=5.5, headlength=6.5, shrink=0)
    )

    # Box Gui cho AI
    ai_box = patches.FancyBboxPatch(
        (66.5, out_y - 2.3), 23.5, 4.8,
        boxstyle="round,pad=0.2,rounding_size=1.0",
        edgecolor='#BAE6FD', facecolor='#F0F9FF', linewidth=1.2
    )
    ax.add_patch(ai_box)
    ax.text(78.25, out_y, "Gửi cho AI", ha='center', va='center',
            fontsize=9.0, fontweight='bold', color='#0369A1')

    # Luu file
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    temp_png = output_path + ".temp.png"
    plt.savefig(temp_png, format='png', dpi=180, facecolor='#FFFFFF', bbox_inches='tight')
    plt.close(fig)

    img = Image.open(temp_png).convert('RGB')
    img.save(output_path, 'JPEG', quality=95)
    if os.path.exists(temp_png):
        os.remove(temp_png)


if __name__ == "__main__":
    import shutil
    out_dir = r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Lưu đồ giải thuật"
    artifact_dir = r"C:\Users\Jackie Duong\.gemini\antigravity-ide\brain\61fa99de-d7e3-4556-8059-1dcfb3f6ef5e"

    academic_file = os.path.join(out_dir, "Hinh_3_2_Pipeline_Tien_Xu_Ly_Academic.jpg")
    modern_file = os.path.join(out_dir, "Hinh_3_2_Pipeline_Tien_Xu_Ly_Modern.jpg")

    create_academic_flowchart(academic_file)
    create_modern_flowchart(modern_file)

    # Sao chep vao artifact dir de hien thi
    if os.path.exists(artifact_dir):
        shutil.copy2(academic_file, os.path.join(artifact_dir, "pipeline_academic.jpg"))
        shutil.copy2(modern_file, os.path.join(artifact_dir, "pipeline_modern.jpg"))

    print("DONE_ALL")
