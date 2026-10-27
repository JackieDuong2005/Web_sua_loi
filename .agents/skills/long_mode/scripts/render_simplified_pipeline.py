"""
Script ve lai Luu do Tong the Quy trinh Cham bai ViHand Grade
Khac phuc triet de loi: "Qua nhieu khoang trong"
- Thu hep toan bo khoang cach thang dung giua cac hop xuong 1.3 - 1.4 units
- Cat bo 100% khoang trang thua o duoi cung va tren cung (set_ylim vua khit)
- Cac mui ten co do dai ngan, dong deu, dep mat tu tren xuong duoi
- Giu nguyen noi dung don gian, de hieu theo yeu cau cua nguoi dung
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

plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans', 'Tahoma']
plt.rcParams['axes.unicode_minus'] = False


def render_compact_tight_pipeline(output_jpg_path):
    # Kich thuoc 9.2 x 12.8 inch: ti le vang, cuc ky gon gang, chat che
    fig_w, fig_h = 9.2, 12.8
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=180)
    
    # Canh y tu 16.0 den 99.0: bo hoan toan khoang trang du thua ben duoi
    ax.set_xlim(0, 100)
    ax.set_ylim(16.0, 99.0)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')

    # ==================== TIÊU ĐỀ ====================
    ax.text(50, 98.0, "QUY TRÌNH CHẤM BÀI TỰ ĐỘNG", ha='center', va='center',
            fontsize=14.5, fontweight='bold', color='#000000')
    ax.text(50, 96.3, "Hệ thống Đánh giá Chính tả & Tập làm văn Tiểu học (ViHand Grade)",
            ha='center', va='center', fontsize=8.6, fontstyle='italic', color='#333333')

    # Helper ve mui ten thang
    def draw_arrow(y_top, y_bottom, x=50):
        ax.annotate(
            '', xy=(x, y_bottom), xytext=(x, y_top),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.1, headwidth=4.6, headlength=5.0, shrink=0)
        )

    # 1. BẮT ĐẦU (Oval)
    start_y = 93.8
    start_h = 2.4
    start_box = patches.FancyBboxPatch(
        (40, start_y - start_h/2), 20, start_h,
        boxstyle=f"round,pad=0.1,rounding_size={start_h/2}",
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(start_box)
    ax.text(50, start_y, "Bắt đầu", ha='center', va='center',
            fontsize=9.2, fontweight='bold', color='#000000')

    # 2. KHỐI 1: Tiếp nhận ảnh
    k1_y = 88.9
    k1_h = 3.6
    draw_arrow(start_y - start_h/2, k1_y + k1_h/2)

    k1_box = patches.Rectangle(
        (18, k1_y - k1_h/2), 64, k1_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(k1_box)
    ax.text(50, k1_y + 0.65, "Giáo viên chụp / tải ảnh bài viết tay học sinh",
            ha='center', va='center', fontsize=9.0, fontweight='bold', color='#000000')
    ax.text(50, k1_y - 0.65, "Tiếp nhận ảnh chụp bài làm từ điện thoại hoặc máy tính",
            ha='center', va='center', fontsize=7.8, color='#333333')

    # 3. KHỐI 2: Tiền xử lý ảnh
    k2_y = 83.6
    k2_h = 3.6
    draw_arrow(k1_y - k1_h/2, k2_y + k2_h/2)

    k2_box = patches.Rectangle(
        (16, k2_y - k2_h/2), 68, k2_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(k2_box)
    ax.text(50, k2_y + 0.65, "Tiền xử lý ảnh (9 bước)",
            ha='center', va='center', fontsize=9.0, fontweight='bold', color='#000000')
    ax.text(50, k2_y - 0.65, "Tự động xoay đúng chiều, khử bóng, làm nét chữ & xóa nền ô ly",
            ha='center', va='center', fontsize=7.8, color='#333333')

    # 4. KHỐI 3: Gemini Flash OCR
    k3_y = 78.3
    k3_h = 3.6
    draw_arrow(k2_y - k2_h/2, k3_y + k3_h/2)

    k3_box = patches.Rectangle(
        (16, k3_y - k3_h/2), 68, k3_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(k3_box)
    ax.text(50, k3_y + 0.65, "Gemini Flash — OCR nhận diện chữ viết tay",
            ha='center', va='center', fontsize=9.0, fontweight='bold', color='#000000')
    ax.text(50, k3_y - 0.65, "Nhận diện toàn bộ chữ viết & tự động phân loại Thơ / Văn xuôi",
            ha='center', va='center', fontsize=7.8, color='#333333')

    # 5. KHỐI 4: YOLOv8 Bounding Box
    k4_y = 73.0
    k4_h = 3.6
    draw_arrow(k3_y - k3_h/2, k4_y + k4_h/2)

    k4_box = patches.Rectangle(
        (16, k4_y - k4_h/2), 68, k4_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(k4_box)
    ax.text(50, k4_y + 0.65, "YOLOv8 — Phát hiện vị trí từng từ",
            ha='center', va='center', fontsize=9.0, fontweight='bold', color='#000000')
    ax.text(50, k4_y - 0.65, "Xác định tọa độ khung bao (Bounding Box) của từng chữ trên trang vở",
            ha='center', va='center', fontsize=7.8, color='#333333')

    # 6. DECISION 1: Có bài mẫu đối chiếu?
    d1_y = 66.8
    d1_w = 26.0
    d1_h = 4.4
    draw_arrow(k4_y - k4_h/2, d1_y + d1_h/2)

    diamond1 = patches.Polygon([
        [50, d1_y + d1_h/2],
        [50 + d1_w/2, d1_y],
        [50, d1_y - d1_h/2],
        [50 - d1_w/2, d1_y]
    ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4)
    ax.add_patch(diamond1)
    ax.text(50, d1_y + 0.45, "Có Ground Truth hoặc", ha='center', va='center',
            fontsize=8.0, fontweight='bold', color='#000000')
    ax.text(50, d1_y - 0.55, "Gemini Fixed Text?", ha='center', va='center',
            fontsize=8.0, fontweight='bold', color='#000000')

    col_a_x = 22.0
    col_b_x = 78.0
    col_w = 34.0

    # --- NHÁNH YES (TRÁI): Có văn mẫu trong Database ---
    vm_x, vm_y = col_a_x, 66.8
    vm_w, vm_h = 15.0, 3.0
    vm_box = patches.FancyBboxPatch(
        (vm_x - vm_w/2, vm_y - vm_h/2), vm_w, vm_h,
        boxstyle=f"round,pad=0.1,rounding_size={vm_h/2}",
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.2
    )
    ax.add_patch(vm_box)
    ax.text(vm_x, vm_y, "Văn mẫu có trong\nDatabase", ha='center', va='center',
            fontsize=7.6, fontweight='bold', color='#000000')

    db_x, db_y = 6.5, 66.8
    db_w, db_h = 5.2, 3.0
    ax.add_patch(patches.FancyBboxPatch((db_x - db_w/2, db_y - db_h/2), db_w, db_h,
                                       boxstyle="round,pad=0.1,rounding_size=0.8",
                                       edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.2))
    ax.plot([db_x - db_w/2, db_x + db_w/2], [db_y + 0.4, db_y + 0.4], color='#000000', linewidth=1.0)
    ax.plot([db_x - db_w/2, db_x + db_w/2], [db_y - 0.4, db_y - 0.4], color='#000000', linewidth=1.0)
    ax.text(db_x, db_y - 2.2, "Database", ha='center', va='center', fontsize=7.0, fontweight='bold')

    ax.plot([db_x + db_w/2, vm_x - vm_w/2], [db_y, vm_y], color='#000000', linewidth=1.2, linestyle='--')

    d1_left = 50 - d1_w/2  # 37
    vm_right = vm_x + vm_w/2  # 29.5
    ax.annotate(
        '', xy=(vm_right, d1_y), xytext=(d1_left, d1_y),
        arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=1.1, headwidth=4.8, headlength=5.0, shrink=0)
    )
    ax.text((d1_left + vm_right)/2, d1_y + 1.1, "YES", ha='center', va='center',
            fontsize=8.2, fontweight='bold', color='#000000')

    # Mũi tên thẳng từ Oval xuống Luồng A
    a1_y = 60.5
    a1_h = 4.4
    draw_arrow(vm_y - vm_h/2, a1_y + a1_h/2, x=col_a_x)

    # --- NHÁNH NO (PHẢI): Sang Luồng B ---
    d1_right = 50 + d1_w/2  # 63
    ax.plot([d1_right, col_b_x], [d1_y, d1_y], color='#000000', linewidth=1.2)
    ax.text((d1_right + col_b_x)/2, d1_y + 1.1, "NO", ha='center', va='center',
            fontsize=8.2, fontweight='bold', color='#000000')
    b1_y = 60.5
    b1_h = 4.4
    draw_arrow(d1_y, b1_y + b1_h/2, x=col_b_x)

    # --- CỘT TRÁI: LUỒNG A (CHÍNH TẢ) ---
    a1_box = patches.Rectangle(
        (col_a_x - col_w/2, a1_y - a1_h/2), col_w, a1_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(a1_box)
    ax.text(col_a_x, a1_y + 0.85, "Luồng A: So khớp với bài mẫu",
            ha='center', va='center', fontsize=8.6, fontweight='bold', color='#000000')
    ax.text(col_a_x, a1_y - 0.7, "So sánh từng từ với bài mẫu chuẩn,\nphân tích âm tiết & bóc tách lỗi chính tả",
            ha='center', va='center', fontsize=7.4, color='#333333')

    # Barem Luồng A (2 phần)
    a2_y = 53.6
    a2_h = 6.2
    draw_arrow(a1_y - a1_h/2, a2_y + a2_h/2, x=col_a_x)

    a2_box = patches.Rectangle(
        (col_a_x - col_w/2, a2_y - a2_h/2), col_w, a2_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(a2_box)
    ax.text(col_a_x - col_w/2 + 2.0, a2_y + 1.9, "Barem 2 phần (Chính tả):",
            ha='left', va='center', fontsize=8.2, fontweight='bold', color='#000000')
    ax.text(col_a_x - col_w/2 + 2.0, a2_y + 0.8, "• Chính tả: tối đa 7.0đ (trừ 0.5đ/lỗi)",
            ha='left', va='center', fontsize=7.5, color='#222222')
    ax.text(col_a_x - col_w/2 + 2.0, a2_y - 0.4, "• Hình thức & Trình bày: tối đa 3.0đ",
            ha='left', va='center', fontsize=7.5, color='#222222')
    ax.text(col_a_x - col_w/2 + 2.0, a2_y - 1.7, "Tổng điểm = 10.0đ",
            ha='left', va='center', fontsize=8.0, fontweight='bold', color='#000000')

    # --- CỘT PHẢI: LUỒNG B (TẬP LÀM VĂN / TỰ DO) ---
    b1_box = patches.Rectangle(
        (col_b_x - col_w/2, b1_y - b1_h/2), col_w, b1_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(b1_box)
    ax.text(col_b_x, b1_y + 0.85, "Luồng B: Chấm tự do bằng AI (ViT5)",
            ha='center', va='center', fontsize=8.6, fontweight='bold', color='#000000')
    ax.text(col_b_x, b1_y - 0.7, "Mô hình ngôn ngữ tự động sửa lỗi,\nđối soát từ ngữ & phân loại lỗi chính tả",
            ha='center', va='center', fontsize=7.4, color='#333333')

    # Barem Luồng B (4 phần)
    b2_y = 53.6
    b2_h = 6.2
    draw_arrow(b1_y - b1_h/2, b2_y + b2_h/2, x=col_b_x)

    b2_box = patches.Rectangle(
        (col_b_x - col_w/2, b2_y - b2_h/2), col_w, b2_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(b2_box)
    ax.text(col_b_x - col_w/2 + 2.0, b2_y + 2.0, "Barem 4 phần (Tập làm văn):",
            ha='left', va='center', fontsize=8.2, fontweight='bold', color='#000000')
    ax.text(col_b_x - col_w/2 + 2.0, b2_y + 0.9, "• Chính tả: tối đa 4.0đ (trừ 0.5đ/lỗi)",
            ha='left', va='center', fontsize=7.5, color='#222222')
    ax.text(col_b_x - col_w/2 + 2.0, b2_y - 0.1, "• Hình thức: 3.0đ  |  Nội dung: 2.0đ",
            ha='left', va='center', fontsize=7.5, color='#222222')
    ax.text(col_b_x - col_w/2 + 2.0, b2_y - 1.0, "• Sáng tạo: 1.0đ (từ láy, tu từ)",
            ha='left', va='center', fontsize=7.5, color='#222222')
    ax.text(col_b_x - col_w/2 + 2.0, b2_y - 2.0, "Tổng điểm = 10.0đ",
            ha='left', va='center', fontsize=8.0, fontweight='bold', color='#000000')

    # --- HỘI TỤ VÀO DECISION 2 (KHÔNG ĐỂ MŨI TÊN LỖI Ở GIAO ĐIỂM) ---
    d2_y = 46.5
    d2_w = 22.0
    d2_h = 4.0
    merge_y1 = 49.2

    ax.plot([col_a_x, col_a_x, 50], [a2_y - a2_h/2, merge_y1, merge_y1], color='#000000', linewidth=1.2)
    ax.plot([col_b_x, col_b_x, 50], [b2_y - b2_h/2, merge_y1, merge_y1], color='#000000', linewidth=1.2)

    draw_arrow(merge_y1, d2_y + d2_h/2, x=50)

    diamond2 = patches.Polygon([
        [50, d2_y + d2_h/2],
        [50 + d2_w/2, d2_y],
        [50, d2_y - d2_h/2],
        [50 - d2_w/2, d2_y]
    ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4)
    ax.add_patch(diamond2)
    ax.text(50, d2_y, "Qwen SLM\nkhả dụng?", ha='center', va='center',
            fontsize=8.2, fontweight='bold', color='#000000')

    # --- NHÁNH DECISION 2 ---
    c1_y = 40.5
    c1_h = 4.4

    # YES (Trái): Sinh nhận xét bằng Qwen
    d2_left = 50 - d2_w/2  # 39
    ax.plot([d2_left, col_a_x], [d2_y, d2_y], color='#000000', linewidth=1.2)
    ax.text((d2_left + col_a_x)/2, d2_y + 1.1, "YES", ha='center', va='center',
            fontsize=8.2, fontweight='bold', color='#000000')
    draw_arrow(d2_y, c1_y + c1_h/2, x=col_a_x)

    c1_box = patches.Rectangle(
        (col_a_x - col_w/2, c1_y - c1_h/2), col_w, c1_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(c1_box)
    ax.text(col_a_x, c1_y + 0.8, "Sinh nhận xét bằng AI (Qwen)",
            ha='center', va='center', fontsize=8.6, fontweight='bold', color='#000000')
    ax.text(col_a_x, c1_y - 0.7, "Tự động tạo nhận xét sư phạm khích lệ,\nchỉ dẫn học sinh sửa lỗi cụ thể",
            ha='center', va='center', fontsize=7.4, color='#333333')

    # NO (Phải): Mẫu nhận xét có sẵn
    c2_y = 40.5
    c2_h = 4.4
    d2_right = 50 + d2_w/2  # 61
    ax.plot([d2_right, col_b_x], [d2_y, d2_y], color='#000000', linewidth=1.2)
    ax.text((d2_right + col_b_x)/2, d2_y + 1.1, "NO", ha='center', va='center',
            fontsize=8.2, fontweight='bold', color='#000000')
    draw_arrow(d2_y, c2_y + c2_h/2, x=col_b_x)

    c2_box = patches.Rectangle(
        (col_b_x - col_w/2, c2_y - c2_h/2), col_w, c2_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(c2_box)
    ax.text(col_b_x, c2_y + 0.8, "Mẫu nhận xét sư phạm có sẵn",
            ha='center', va='center', fontsize=8.6, fontweight='bold', color='#000000')
    ax.text(col_b_x, c2_y - 0.7, "Tự động chọn mẫu nhận xét phù hợp\ntheo số lỗi chính tả & mức độ sáng tạo",
            ha='center', va='center', fontsize=7.4, color='#333333')

    # --- HỘI TỤ VỀ XẾP LOẠI KẾT QUẢ ---
    r1_y = 32.3
    r1_h = 6.8
    merge_y2 = 36.9

    ax.plot([col_a_x, col_a_x, 50], [c1_y - c1_h/2, merge_y2, merge_y2], color='#000000', linewidth=1.2)
    ax.plot([col_b_x, col_b_x, 50], [c2_y - c2_h/2, merge_y2, merge_y2], color='#000000', linewidth=1.2)

    # 1 Mũi tên duy nhất đi từ giao điểm xuống ô Xếp loại (khoảng cách ngắn)
    draw_arrow(merge_y2, r1_y + r1_h/2, x=50)

    r1_box = patches.Rectangle(
        (27, r1_y - r1_h/2), 46, r1_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(r1_box)
    ax.text(50, r1_y + 2.1, "Xếp loại kết quả đánh giá:",
            ha='center', va='center', fontsize=8.8, fontweight='bold', color='#000000')
    
    # Căn lề trái các dòng điểm thẳng hàng
    ax.text(32.5, r1_y + 1.0, "•   ≥ 9.0đ   →   Xuất sắc", ha='left', va='center', fontsize=8.0, color='#222222')
    ax.text(32.5, r1_y + 0.05, "•   ≥ 7.0đ   →   Tốt", ha='left', va='center', fontsize=8.0, color='#222222')
    ax.text(32.5, r1_y - 0.85, "•   ≥ 5.0đ   →   Khá", ha='left', va='center', fontsize=8.0, color='#222222')
    ax.text(32.5, r1_y - 1.75, "•   ≥ 3.0đ   →   Trung bình", ha='left', va='center', fontsize=8.0, color='#222222')
    ax.text(32.5, r1_y - 2.65, "•   < 3.0đ   →   Cần cố gắng", ha='left', va='center', fontsize=8.0, color='#222222')

    # Mũi tên ngắn xuống ô Hiển thị & Lưu trữ
    r2_y = 23.5
    r2_h = 7.4
    draw_arrow(r1_y - r1_h/2, r2_y + r2_h/2, x=50)

    # --- HIỂN THỊ KẾT QUẢ VÀ LƯU TRỮ ---
    r2_box = patches.Rectangle(
        (15, r2_y - r2_h/2), 70, r2_h,
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(r2_box)
    ax.text(50, r2_y + 2.3, "Hiển thị kết quả lên giao diện & Lưu trữ:",
            ha='center', va='center', fontsize=9.0, fontweight='bold', color='#000000')
    ax.text(18.0, r2_y + 0.9, "•  Khoanh khung đỏ trực tiếp vào vị trí các từ sai trên ảnh bài viết",
            ha='left', va='center', fontsize=7.8, color='#222222')
    ax.text(18.0, r2_y - 0.4, "•  Bảng điểm chi tiết 4 thành phần & lời nhận xét sư phạm",
            ha='left', va='center', fontsize=7.8, color='#222222')
    ax.text(18.0, r2_y - 1.7, "•  Lưu toàn bộ bản ghi kết quả chấm bài vào cơ sở dữ liệu (SQLite)",
            ha='left', va='center', fontsize=7.8, color='#222222')

    # Mũi tên ngắn xuống Kết thúc
    end_y = 17.6
    end_h = 2.4
    draw_arrow(r2_y - r2_h/2, end_y + end_h/2, x=50)

    # 10. KẾT THÚC (Oval)
    end_box = patches.FancyBboxPatch(
        (40, end_y - end_h/2), 20, end_h,
        boxstyle=f"round,pad=0.1,rounding_size={end_h/2}",
        edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4
    )
    ax.add_patch(end_box)
    ax.text(50, end_y, "Kết thúc", ha='center', va='center',
            fontsize=9.2, fontweight='bold', color='#000000')

    # Lưu ảnh độ phân giải cao
    os.makedirs(os.path.dirname(os.path.abspath(output_jpg_path)), exist_ok=True)
    temp_png = output_jpg_path + ".temp.png"
    plt.savefig(temp_png, format='png', dpi=180, facecolor='#FFFFFF', bbox_inches='tight')
    plt.close(fig)

    img = Image.open(temp_png).convert('RGB')
    img.save(output_jpg_path, 'JPEG', quality=95)
    if os.path.exists(temp_png):
        os.remove(temp_png)


if __name__ == "__main__":
    import shutil
    out_dir = r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Lưu đồ giải thuật"
    artifact_dir = r"C:\Users\Jackie Duong\.gemini\antigravity-ide\brain\61fa99de-d7e3-4556-8059-1dcfb3f6ef5e"

    out_file = os.path.join(out_dir, "Hinh_3_1_Quy_Trinh_Cham_Bai_ViHand_Don_Gian.jpg")
    render_compact_tight_pipeline(out_file)

    if os.path.exists(artifact_dir):
        shutil.copy2(out_file, os.path.join(artifact_dir, "hybrid_pipeline_simplified.jpg"))

    print("COMPACT_TIGHT_RENDER_DONE")
