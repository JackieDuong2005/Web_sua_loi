# -*- coding: utf-8 -*-
"""
Script tạo Sơ đồ / Lưu đồ hoạt động Phân hệ Đọc chính tả (Mục 3.2 Chương 3)
Chuẩn Technical White Paper Flowchart: Nền trắng (#FFFFFF), nét đen (#000000, 1.5pt), 100% tiếng Việt UTF-8.
"""
import sys
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image

# Thiết lập font tiếng Việt
plt.rcParams['font.sans-serif'] = ['Arial', 'Segoe UI', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def generate_dictation_flowchart():
    # Canvas tỉ lệ dọc chuẩn (8.0 x 15.0 inches)
    fig, ax = plt.subplots(figsize=(8.2, 15.2), dpi=120)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FFFFFF')

    # Tiêu đề chính & phụ
    ax.text(50, 98.2, "LƯU ĐỒ HOẠT ĐỘNG PHÂN HỆ ĐỌC CHÍNH TẢ SƯ PHẠM", 
            ha='center', va='center', fontsize=13.5, fontweight='bold', color='#000000')
    ax.text(50, 96.2, "Hệ sinh thái ViHand Grade — Kiến trúc Đọc chính tả Trợ giảng số & Khóa Ground Truth", 
            ha='center', va='center', fontsize=9.0, fontstyle='normal', color='#333333')

    # Hàm vẽ khối Start / End
    def draw_start_end(x, y, text, w=24, h=2.6):
        box = patches.FancyBboxPatch(
            (x - w/2, y - h/2), w, h,
            boxstyle=f"round,pad=0.2,rounding_size={h/2}",
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5
        )
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=9, fontweight='bold', color='#000000')

    # Hàm vẽ khối Process
    def draw_process(x, y, text, w=68, h=4.4, fontsize=8.0, fontweight='normal'):
        box = patches.Rectangle(
            (x - w/2, y - h/2), w, h,
            edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5
        )
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, fontweight=fontweight,
                color='#000000', multialignment='center')

    # Hàm vẽ khối I/O (Hình bình hành)
    def draw_io(x, y, text, w=68, h=4.0, fontsize=8.0):
        offset = 2.5
        poly = patches.Polygon([
            [x - w/2 + offset, y + h/2],
            [x + w/2, y + h/2],
            [x + w/2 - offset, y - h/2],
            [x - w/2, y - h/2]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5)
        ax.add_patch(poly)
        ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, color='#000000', multialignment='center')

    # Hàm vẽ khối Decision (Hình thoi)
    def draw_decision(x, y, text, w=34, h=4.6, fontsize=7.5):
        diamond = patches.Polygon([
            [x, y + h/2],
            [x + w/2, y],
            [x, y - h/2],
            [x - w/2, y]
        ], closed=True, edgecolor='#000000', facecolor='#FFFFFF', linewidth=1.5)
        ax.add_patch(diamond)
        ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, fontweight='bold',
                color='#000000', multialignment='center')

    # Mũi tên thẳng xuống
    def draw_arrow(x1, y1, x2, y2, label=None, label_pos=None):
        ax.annotate(
            '', xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=0.9, headwidth=4.5, headlength=5.5, shrink=0)
        )
        if label:
            lx = (x1 + x2)/2 if label_pos is None else label_pos[0]
            ly = (y1 + y2)/2 if label_pos is None else label_pos[1]
            ax.text(lx, ly, label, ha='center', va='center', fontsize=8.0, fontweight='bold', color='#000000',
                    bbox=dict(boxstyle='square,pad=0.1', facecolor='#FFFFFF', edgecolor='none'))

    # Mũi tên uốn khúc
    def draw_elbow(points, label=None, label_pos=None):
        for i in range(len(points) - 2):
            p1, p2 = points[i], points[i+1]
            ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#000000', linewidth=1.1)
        p_pre, p_end = points[-2], points[-1]
        ax.annotate(
            '', xy=(p_end[0], p_end[1]), xytext=(p_pre[0], p_pre[1]),
            arrowprops=dict(facecolor='#000000', edgecolor='#000000', width=0.9, headwidth=4.5, headlength=5.5, shrink=0)
        )
        if label:
            lx = label_pos[0] if label_pos else points[0][0]
            ly = label_pos[1] if label_pos else points[0][1]
            ax.text(lx, ly, label, ha='center', va='center', fontsize=8.0, fontweight='bold', color='#000000',
                    bbox=dict(boxstyle='square,pad=0.1', facecolor='#FFFFFF', edgecolor='none'))

    # BẮT ĐẦU VẼ CÁC KHỐI
    # 1. Bắt đầu
    draw_start_end(50, 93.5, "BẮT ĐẦU")
    draw_arrow(50, 92.2, 50, 89.2)

    # 2. Nạp ngữ liệu
    draw_io(50, 87.0, "Bước 1: Nạp bài đọc chính tả đầu vào\n(Kho SGK Lớp 1-5 / Qwen 2.5 SLM / Soạn thảo tự do)")
    draw_arrow(50, 85.0, 50, 82.2)

    # 3. Trích xuất từ khó
    draw_process(50, 80.0, "Bước 2: Trích xuất danh sách \"Từ khó dễ sai\"\n(Hướng dẫn học sinh luyện viết trước trên bảng con)")
    draw_arrow(50, 77.8, 50, 75.0)

    # 4. Thiết lập tham số sư phạm
    draw_process(50, 72.8, "Bước 3: Thiết lập tham số nhịp đọc chuẩn sư phạm\n• Tốc độ: -15% | • Lặp lại: 2-3 lượt | • Khoảng dừng: 1.5s/từ")
    draw_arrow(50, 70.6, 50, 67.8)

    # 5. Kích hoạt Phòng học
    draw_process(50, 65.6, "Bước 4: Bấm \"Bắt đầu đọc\" → Mở Chế độ Phòng học\n(Classroom Theater View - Giao diện chiếu bảng lớp học)")
    draw_arrow(50, 63.4, 50, 60.6)

    # 6. Tách cụm từ sư phạm
    draw_process(50, 58.4, "Bước 5: Tách văn bản thành danh sách câu / cụm từ sư phạm\n(Thuật toán phân rã splitIntoPedagogicalClauses)")
    draw_arrow(50, 56.2, 50, 53.4)

    # 7. Phát âm thanh TTS
    draw_process(50, 51.0, "Bước 6: Tổng hợp & Phát âm thanh câu đọc hiện tại\nĐộng cơ đa tầng: Piper VITS Offline (22kHz) ↔ Edge-TTS")
    draw_arrow(50, 48.8, 50, 46.0)

    # 8. Đếm ngược ngắt nghỉ
    draw_process(50, 43.6, "Bước 7: Kích hoạt đồng hồ đếm ngược thời gian ngắt nghỉ\nThời gian chờ viết: T_pause = Số từ × 1.5 giây")
    draw_arrow(50, 41.4, 50, 38.6)

    # 9. Decision: Lặp lại cụm từ?
    draw_decision(50, 36.0, "Đã lặp đủ\nsố lượt câu?", w=30, h=4.6)
    # YES -> đi xuống
    draw_arrow(50, 33.7, 50, 30.5, label="YES", label_pos=(50, 32.0))
    # NO -> quay lại phát lại câu (elbow loop)
    draw_elbow([[35, 36.0], [10, 36.0], [10, 51.0], [16, 51.0]], label="NO (Đọc lặp lại)", label_pos=(18, 44.0))

    # 10. Decision: Hết bài đọc?
    draw_decision(50, 28.0, "Đã đọc hết\ntoàn bài?", w=30, h=4.6)
    # YES -> đi xuống
    draw_arrow(50, 25.7, 50, 22.5, label="YES", label_pos=(50, 24.0))
    # NO -> chuyển câu tiếp theo (elbow loop)
    draw_elbow([[65, 28.0], [90, 28.0], [90, 51.0], [84, 51.0]], label="NO (Câu kế tiếp)", label_pos=(84, 40.0))

    # 11. Thông báo kết thúc
    draw_process(50, 20.3, "Bước 8: Phát câu thông báo kết thúc bài đọc\n(\"Đã hoàn thành bài đọc, các em hãy soát lại toàn bài!\")", h=3.8)
    draw_arrow(50, 18.4, 50, 15.8)

    # 12. Lưu DictationSession SQLite
    draw_io(50, 13.8, "Bước 9: Tự động lưu phiên vào CSDL SQLite (Prisma)\n(Lưu DictationSession & DictationLog làm Ground Truth)", h=3.6)
    draw_arrow(50, 12.0, 50, 9.5)

    # 13. Luân chuyển 1-Click sang Chấm bài
    draw_process(50, 7.3, "Bước 10: Giáo viên bấm \"Chuyển sang Chấm bài\" (1-Click Handoff)\nKhóa Ground Truth đối soát trực tiếp với ảnh bài thi học sinh", h=4.0, fontweight='bold')
    draw_arrow(50, 5.3, 50, 3.2)

    # 14. Kết thúc
    draw_start_end(50, 2.0, "KẾT THÚC")

    # Lưu ảnh JPG chất lượng cao
    out_dir = r"c:\Users\Jackie Duong\Desktop\Web_sua_loi\01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\01_Bao_Cao_Tong_Ket_NCKH"
    out_path = os.path.join(out_dir, "hinh_3_2_luu_do_doc_chinh_ta.jpg")
    os.makedirs(out_dir, exist_ok=True)

    temp_png = out_path + ".temp.png"
    fig.savefig(temp_png, format='png', dpi=120, facecolor='#FFFFFF', bbox_inches='tight')
    plt.close(fig)

    img = Image.open(temp_png).convert('RGB')
    img.save(out_path, 'JPEG', quality=95)
    if os.path.exists(temp_png):
        os.remove(temp_png)

    print(f"[SUCCESS] Flowchart generated: {out_path} - Dimensions: {img.size}")

if __name__ == '__main__':
    generate_dictation_flowchart()
