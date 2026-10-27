# -*- coding: utf-8 -*-
"""
Script tạo Sơ đồ / Lưu đồ hoạt động Phân hệ Đọc chính tả sư phạm (Mục 3.2.2 Chương 3)
Phiên bản Phương án 1 (Tinh gọn dứt điểm - Tối ưu cho bảo vệ đồ án):
- Loại bỏ hoàn toàn bước "Mở màn hình trình chiếu lớp học" thừa thãi.
- Định vị hệ thống là "Trợ lý âm thanh sư phạm thông minh", truyền phát giọng đọc qua loa phòng học.
- Chuẩn hóa ngôn ngữ sư phạm, loại bỏ thuật ngữ code sâu.
- Nền trắng (#FFFFFF), nét đen kỹ thuật (#000000, 1.4pt).
"""
import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

# Cấu hình font chữ tiếng Việt sắc nét
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def create_streamlined_flowchart():
    # Canvas khổ dọc chuẩn tỷ lệ trang báo cáo A4
    fig, ax = plt.subplots(figsize=(8.6, 16.2), dpi=150)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')

    # 1. TIÊU ĐỀ BIỂU ĐỒ (CĂN GIỮA)
    ax.text(50, 98.4, "LƯU ĐỒ HOẠT ĐỘNG PHÂN HỆ ĐỌC CHÍNH TẢ SƯ PHẠM", 
            ha='center', va='center', fontsize=13.0, fontweight='bold', color='#000000')
    ax.text(50, 96.6, "Hệ sinh thái ViHand Grade — Trợ lý âm thanh lớp học và chuẩn hóa văn bản chấm điểm", 
            ha='center', va='center', fontsize=8.8, fontstyle='italic', color='#333333')

    # HÀM VẼ KHỐI START / END (Hình Oval bo tròn)
    def draw_start_end(x, y, text, w=22, h=2.6):
        box = patches.FancyBboxPatch(
            (x - w/2, y - h/2), w, h,
            boxstyle=f"round,pad=0.2,rounding_size={h/2}",
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5
        )
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=9.2, fontweight='bold', color='#000000')

    # HÀM VẼ KHỐI PROCESS (Hình chữ nhật: Dòng 1 Bold, Dòng 2 Regular)
    def draw_process(x, y, title, subtitle=None, w=68, h=4.4, is_highlight=False):
        box = patches.Rectangle(
            (x - w/2, y - h/2), w, h,
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.8 if is_highlight else 1.3
        )
        ax.add_patch(box)
        if subtitle:
            ax.text(x, y + 0.95, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#000000')
            ax.text(x, y - 1.05, subtitle, ha='center', va='center', fontsize=7.7, fontweight='normal', color='#262626')
        else:
            ax.text(x, y, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#000000')

    # HÀM VẼ KHỐI I/O (Hình bình hành)
    def draw_io(x, y, title, subtitle=None, w=68, h=4.3):
        offset = 2.4
        poly = patches.Polygon([
            [x - w/2 + offset, y + h/2],
            [x + w/2, y + h/2],
            [x + w/2 - offset, y - h/2],
            [x - w/2, y - h/2]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4)
        ax.add_patch(poly)
        if subtitle:
            ax.text(x, y + 0.95, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#000000')
            ax.text(x, y - 1.05, subtitle, ha='center', va='center', fontsize=7.7, fontweight='normal', color='#262626')
        else:
            ax.text(x, y, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#000000')

    # HÀM VẼ KHỐI DECISION (Hình thoi)
    def draw_decision(x, y, text, w=30, h=4.8):
        diamond = patches.Polygon([
            [x, y + h/2],
            [x + w/2, y],
            [x, y - h/2],
            [x - w/2, y]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.4)
        ax.add_patch(diamond)
        ax.text(x, y, text, ha='center', va='center', fontsize=8.2, fontweight='bold',
                color='#000000', multialignment='center')

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

    # HÀM VẼ MŨI TÊN VÒNG LẶP (UỐN KHÚC)
    def draw_loop(points):
        for i in range(len(points) - 2):
            p1, p2 = points[i], points[i+1]
            ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#000000', linewidth=1.1)
        p_pre, p_end = points[-2], points[-1]
        ax.annotate(
            '', xy=(p_end[0], p_end[1]), xytext=(p_pre[0], p_pre[1]),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=0.8, headwidth=4.3, headlength=5.0, shrink=0)
        )

    # ================== BẮT ĐẦU VẼ CÁC KHỐI TUẦN TỰ ==================

    # 1. Bắt đầu
    y_start = 93.8
    draw_start_end(50, y_start, "BẮT ĐẦU")
    draw_arrow(50, y_start - 1.3, 50, 90.7)

    # 2. Bước 1 (Hình bình hành)
    y_b1 = 88.5
    draw_io(50, y_b1, 
            "Bước 1: Tiếp nhận bài đọc chính tả", 
            "(Chọn từ SGK Lớp 1–5 / Giáo viên tự soạn / Trí tuệ nhân tạo gợi ý)")
    draw_arrow(50, y_b1 - 2.15, 50, 84.1)

    # 3. Bước 2 (Hình chữ nhật)
    y_b2 = 81.8
    draw_process(50, y_b2, 
                 "Bước 2: Tự động trích xuất danh sách \"Từ khó chính tả\"", 
                 "(Phát âm mẫu để học sinh luyện viết trước trên bảng con)")
    draw_arrow(50, y_b2 - 2.2, 50, 77.4)

    # 4. Bước 3 (Hình chữ nhật)
    y_b3 = 75.1
    draw_process(50, y_b3, 
                 "Bước 3: Thiết lập tham số nhịp đọc theo khối lớp", 
                 "• Tốc độ đọc: Thư thái, rõ chữ   |   • Lặp lại: 2–3 lượt   |   • Khoảng dừng: 1.5–2.0 giây/từ")
    draw_arrow(50, y_b3 - 2.2, 50, 70.7)

    # 5. Bước 4 (Hình chữ nhật)
    y_b4 = 68.4
    draw_process(50, y_b4, 
                 "Bước 4: Tách bài đọc thành các cụm từ ngắn vừa sức", 
                 "(Mỗi cụm từ gồm 3–7 từ, giữ nguyên vẹn nghĩa câu và từ ghép)")
    draw_arrow(50, y_b4 - 2.2, 50, 64.0)

    # 6. Bước 5 (Hình chữ nhật) - Khối nhận nhánh lặp âm thanh
    y_b5 = 61.7
    draw_process(50, y_b5, 
                 "Bước 5: Phát âm thanh câu đọc qua loa lớp học", 
                 "(Giọng đọc chuẩn tiếng Việt, ngữ điệu truyền cảm, phát âm tròn vành rõ chữ)")
    draw_arrow(50, y_b5 - 2.2, 50, 57.3)

    # 7. Bước 6 (Hình chữ nhật)
    y_b6 = 55.0
    draw_process(50, y_b6, 
                 "Bước 6: Tự động đếm nhịp dừng nghỉ chờ học sinh viết", 
                 "(Khoảng dừng chờ học sinh viết tính toán thích ứng theo độ dài từng cụm)")
    draw_arrow(50, y_b6 - 2.2, 50, 50.2)

    # 8. Rẽ nhánh 1 (Hình thoi)
    y_d1 = 47.7
    draw_decision(50, y_d1, "Đã đọc đủ\nsố lần lặp?", w=28, h=4.8)
    
    # YES -> xuống nhánh kiểm tra hết bài
    draw_arrow(50, y_d1 - 2.4, 50, 41.0, label="ĐÃ ĐỦ", label_pos=(50, 42.8))
    
    # NO -> quay lại Bước 5 phát nhắc lại
    # Cạnh trái hình thoi (x=36, y=47.7) -> ra lề trái x=6 -> lên y=61.7 -> vào mép trái Bước 5 (x=16)
    draw_loop([
        [36, y_d1], 
        [6, y_d1], 
        [6, y_b5], 
        [16, y_b5]
    ])
    # Nhãn nhánh lặp 1: thoáng đãng trên đoạn ngang
    ax.text(21, 48.9, "CHƯA ĐỦ (Đọc nhắc lại)", ha='center', va='center', 
            fontsize=7.6, fontweight='bold', color='#000000',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='#FFFFFF', edgecolor='none'))

    # 9. Rẽ nhánh 2 (Hình thoi)
    y_d2 = 38.4
    draw_decision(50, y_d2, "Đã đọc xong\ntoàn bộ bài?", w=28, h=4.8)
    
    # YES -> xuống thông báo kết thúc
    draw_arrow(50, y_d2 - 2.4, 50, 31.7, label="ĐÃ XONG", label_pos=(50, 33.5))
    
    # NO -> chuyển cụm từ kế tiếp (quay lại cạnh phải Bước 5)
    # Cạnh phải hình thoi (x=64, y=38.4) -> ra lề phải x=94 -> lên y=61.7 -> vào mép phải Bước 5 (x=84)
    draw_loop([
        [64, y_d2], 
        [94, y_d2], 
        [94, y_b5], 
        [84, y_b5]
    ])
    # Nhãn nhánh lặp 2: thoáng đãng trên đoạn ngang
    ax.text(79, 39.6, "CHƯA XONG (Cụm kế tiếp)", ha='center', va='center', 
            fontsize=7.6, fontweight='bold', color='#000000',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='#FFFFFF', edgecolor='none'))

    # 10. Bước 7 (Hình chữ nhật)
    y_b7 = 29.3
    draw_process(50, y_b7, 
                 "Bước 7: Phát câu thông báo kết thúc bài đọc", 
                 "(\"Đã hoàn thành bài đọc, các em hãy soát lại toàn bài!\")")
    draw_arrow(50, y_b7 - 2.2, 50, 24.9)

    # 11. Bước 8 (Hình bình hành - Lưu trữ dữ liệu)
    y_b8 = 22.6
    draw_io(50, y_b8, 
            "Bước 8: Tự động lưu thông tin tiết học vào hệ thống", 
            "(Lưu bài đọc mẫu để làm cơ sở đối chiếu chấm điểm tự động)")
    draw_arrow(50, y_b8 - 2.15, 50, 18.2)

    # 12. Bước 9 (Hình chữ nhật nổi bật)
    y_b9 = 15.9
    draw_process(50, y_b9, 
                 "Bước 9: Chuyển trực tiếp sang phân hệ Chấm điểm", 
                 "(Khóa bài đọc mẫu làm chuẩn đối chiếu với ảnh chụp bài làm của học sinh)", 
                 is_highlight=True)
    draw_arrow(50, y_b9 - 2.2, 50, 11.3)

    # 13. Kết thúc
    y_end = 9.8
    draw_start_end(50, y_end, "KẾT THÚC")

    # ================== XUẤT ẢNH JPEG CHẤT LƯỢNG CAO ==================
    target_paths = [
        r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\01_Bao_Cao_Tong_Ket_NCKH\hinh_3_2_luu_do_doc_chinh_ta.jpg",
        r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Lưu đồ giải thuật\Hinh_3_2_luu_do_doc_chinh_ta.jpg",
        r"C:\Users\Jackie Duong\.gemini\antigravity\brain\92de4067-ebc0-4563-ac10-c6929f8d5945\hinh_3_2_luu_do_doc_chinh_ta.jpg"
    ]

    for idx, out_path in enumerate(target_paths):
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        temp_png = out_path + ".temp.png"
        fig.savefig(temp_png, format='png', dpi=150, facecolor='#FFFFFF', bbox_inches='tight')
        img = Image.open(temp_png).convert('RGB')
        img.save(out_path, 'JPEG', quality=95)
        if os.path.exists(temp_png):
            os.remove(temp_png)
        print(f"[SUCCESS] Exported index {idx} - Size: {img.size}")
    
    plt.close(fig)

if __name__ == '__main__':
    create_streamlined_flowchart()
