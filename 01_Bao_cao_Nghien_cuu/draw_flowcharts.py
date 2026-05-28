import os
import math
from PIL import Image, ImageDraw, ImageFont

# Set up paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "flowchartv2")
os.makedirs(OUT_DIR, exist_ok=True)

# Colors - Modern Premium Palette
BG_COLOR = (255, 255, 255)         # Pure white canvas
BORDER_COLOR = (30, 41, 59)        # Slate 800 (Charcoal)
TEXT_COLOR = (15, 23, 42)          # Slate 900 (Near black)
ARROW_COLOR = (71, 85, 105)        # Slate 600
SHADOW_COLOR = (226, 232, 240)     # Slate 200

# Node Colors
COLOR_START_END = (241, 245, 249)  # Light gray
COLOR_PROCESS = (239, 246, 255)    # Very soft light blue
COLOR_DECISION = (254, 243, 199)   # Soft amber/yellow
COLOR_API_AI = (245, 243, 255)     # Soft purple
COLOR_DB = (236, 253, 245)         # Soft emerald/green
COLOR_WARNING = (255, 241, 242)    # Soft rose/red

# Load Font
def get_font(size=13, bold=False):
    # Standard paths for Windows fonts
    font_name = "arialbd.ttf" if bold else "arial.ttf"
    font_path = os.path.join("C:\\Windows\\Fonts", font_name)
    if os.path.exists(font_path):
        return ImageFont.truetype(font_path, size)
    # Fallback to default
    return ImageFont.load_default()

def draw_shadowed_rect(draw, x1, y1, x2, y2, fill, radius=6):
    # Draw subtle shadow
    draw.rounded_rectangle([x1 + 3, y1 + 3, x2 + 3, y2 + 3], radius=radius, fill=SHADOW_COLOR)
    # Draw main box
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill, outline=BORDER_COLOR, width=2)

def draw_diamond(draw, cx, cy, w, h, fill):
    # Diamond coordinates
    coords = [(cx, cy - h/2), (cx + w/2, cy), (cx, cy + h/2), (cx - w/2, cy)]
    # Shadow
    shadow_coords = [(x + 3, y + 3) for x, y in coords]
    draw.polygon(shadow_coords, fill=SHADOW_COLOR)
    # Main
    draw.polygon(coords, fill=fill, outline=BORDER_COLOR, width=2)

def draw_cylinder(draw, x1, y1, x2, y2, fill):
    # Cylinder (Database) shape
    r = (x2 - x1) / 2
    h_cap = 12
    # Shadow
    draw.rectangle([x1 + 3, y1 + h_cap + 3, x2 + 3, y2 - h_cap + 3], fill=SHADOW_COLOR)
    draw.ellipse([x1 + 3, y1 + 3, x2 + 3, y1 + 2*h_cap + 3], fill=SHADOW_COLOR)
    draw.ellipse([x1 + 3, y2 - 2*h_cap + 3, x2 + 3, y2 + 3], fill=SHADOW_COLOR)
    # Main shape
    draw.rectangle([x1, y1 + h_cap, x2, y2 - h_cap], fill=fill, outline=BORDER_COLOR, width=2)
    # Cover borders by drawing filled ellipses
    draw.ellipse([x1, y1, x2, y1 + 2*h_cap], fill=fill, outline=BORDER_COLOR, width=2)
    draw.ellipse([x1, y2 - 2*h_cap, x2, y2], fill=fill, outline=BORDER_COLOR, width=2)

def draw_arrow(draw, x1, y1, x2, y2, text=""):
    # Draw line
    draw.line([x1, y1, x2, y2], fill=ARROW_COLOR, width=2)
    
    # Arrowhead
    head_size = 7
    if x1 == x2: # Vertical arrow
        direction = 1 if y2 > y1 else -1
        draw.polygon([(x2 - head_size, y2 - direction*head_size), 
                      (x2 + head_size, y2 - direction*head_size), 
                      (x2, y2)], fill=BORDER_COLOR)
    elif y1 == y2: # Horizontal arrow
        direction = 1 if x2 > x1 else -1
        draw.polygon([(x2 - direction*head_size, y2 - head_size), 
                      (x2 - direction*head_size, y2 + head_size), 
                      (x2, y2)], fill=BORDER_COLOR)
                      
    # Optional label text
    if text:
        font = get_font(11, bold=True)
        tx = (x1 + x2) / 2
        ty = (y1 + y2) / 2 - 12
        draw_text_centered(draw, tx, ty, text, font, fill=TEXT_COLOR)

def draw_text_centered(draw, cx, cy, text, font, fill=TEXT_COLOR):
    # Wrap text if needed
    lines = text.split("\n")
    total_h = len(lines) * (font.size + 4)
    y_start = cy - total_h / 2
    for i, line in enumerate(lines):
        # Calculate size using getlength or textbbox
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
        except AttributeError:
            w = font.getsize(line)[0]
            h = font.size
        
        draw.text((cx - w/2, y_start + i * (font.size + 4)), line, font=font, fill=fill)

def generate_flowchart_1():
    # 1. TỔNG QUAN HỆ THỐNG
    # Dimensions: 800 x 500
    img = Image.new("RGB", (850, 520), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Title
    font_title = get_font(16, bold=True)
    draw_text_centered(draw, 425, 25, "HÌNH 3.1: LƯU ĐỒ HOẠT ĐỘNG TỔNG THỂ HỆ THỐNG VIHAND GRADE", font_title)
    
    # Steps:
    # 1. Người dùng chụp/tải ảnh bài viết -> 2. Tiền xử lý Jimp (10 bước) -> 3. Gemini AI -> 4. Parse JSON -> 5. SQLite DB / Hiển thị
    font_node = get_font(12, bold=False)
    font_node_b = get_font(12, bold=True)
    
    # Define boxes coordinates
    # Step 1 (Input)
    draw_shadowed_rect(draw, 50, 100, 210, 180, COLOR_START_END)
    draw_text_centered(draw, 130, 140, "Người dùng\nChụp/Tải ảnh bài viết\n(Giao diện Web PWA)", font_node)
    
    # Step 2 (Process)
    draw_shadowed_rect(draw, 290, 100, 470, 180, COLOR_PROCESS)
    draw_text_centered(draw, 380, 140, "Tiền xử lý ảnh số\n(10 bước - Jimp)\nKhử dòng kẻ & ám màu", font_node_b)
    
    # Step 3 (API/AI)
    draw_shadowed_rect(draw, 550, 100, 780, 180, COLOR_API_AI)
    draw_text_centered(draw, 665, 140, "Google Gemini 3.0 Flash\n(Multimodal AI)\nNhận dạng nét viết & Sửa lỗi", font_node_b)
    
    # Step 4 (Decision/Parse)
    draw_diamond(draw, 665, 300, 180, 100, COLOR_DECISION)
    draw_text_centered(draw, 665, 300, "Phản hồi JSON\nhợp lệ?", font_node)
    
    # Step 4b (Error warning)
    draw_shadowed_rect(draw, 380, 260, 520, 340, COLOR_WARNING)
    draw_text_centered(draw, 450, 300, "Thông báo lỗi\nYêu cầu chấm lại", font_node)

    # Step 5 (Save/Show)
    draw_cylinder(draw, 50, 260, 210, 360, COLOR_DB)
    draw_text_centered(draw, 130, 310, "Lưu SQLite CSDL\n(Prisma ORM)\nHiển thị lịch sử/đồ thị", font_node_b)
    
    # Arrows
    draw_arrow(draw, 210, 140, 290, 140)
    draw_arrow(draw, 470, 140, 550, 140)
    draw_arrow(draw, 665, 180, 665, 250)
    
    # Yes arrow to step 5
    draw_arrow(draw, 575, 300, 210, 300, "Đúng (JSON)")
    
    # No arrow to error
    draw_arrow(draw, 665, 350, 665, 410)
    draw_arrow(draw, 665, 410, 450, 410)
    draw_arrow(draw, 450, 410, 450, 340, "Sai")
    
    # From error back to input
    draw_arrow(draw, 380, 300, 130, 300)
    draw_arrow(draw, 130, 300, 130, 180)
    
    img.save(os.path.join(OUT_DIR, "flowchart_1_tong_quan.png"), "PNG")

def generate_flowchart_2():
    # 2. PIPELINE TIỀN XỬ LÝ 10 BƯỚC
    img = Image.new("RGB", (900, 500), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Title
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 450, 25, "HÌNH 3.2: PIPELINE TIỀN XỬ LÝ ẢNH SỐ 10 BƯỚC (JIMP CỤC BỘ)", font_title)
    
    # 10 Steps horizontally and vertically
    # Row 1: 1 -> 2 -> 3 -> 4 -> 5
    # Row 2: 10 <- 9 <- 8 <- 7 <- 6
    steps_r1 = [
        "1. EXIF Auto-rotate\nXoay ảnh đúng hướng",
        "2. Resize (max 1600px)\nTối ưu dung lượng",
        "3. White Balance\nCân bằng Gray World",
        "4. Grayscale\nChuyển ảnh xám",
        "5. Shadow Removal\nKhử bóng che"
    ]
    steps_r2 = [
        "10. Adaptive Threshold\nNhị phân hóa thích nghi",
        "9. Quality Assessment\nĐo Blur & Brightness",
        "8. Unsharp Mask\nLàm sắc nét nét viết",
        "7. CLAHE Contrast\nTăng tương phản cục bộ",
        "6. Grid Line Removal\nXóa sạch dòng ô ly"
    ]
    
    font_node = get_font(10, bold=False)
    font_node_b = get_font(10, bold=True)
    
    # Row 1 drawing
    y1 = 80
    for i, txt in enumerate(steps_r1):
        x = 40 + i * 170
        draw_shadowed_rect(draw, x, y1, x + 140, y1 + 75, COLOR_PROCESS)
        draw_text_centered(draw, x + 70, y1 + 37, txt, font_node_b if "Xóa" in txt or "Threshold" in txt else font_node)
        if i < 4:
            draw_arrow(draw, x + 140, y1 + 37, x + 170, y1 + 37)
            
    # Arrow down from 5 to 6
    draw_arrow(draw, 40 + 4 * 170 + 70, y1 + 75, 40 + 4 * 170 + 70, 240)
    
    # Row 2 drawing
    y2 = 240
    for i, txt in enumerate(steps_r2):
        col_idx = 4 - i
        x = 40 + col_idx * 170
        draw_shadowed_rect(draw, x, y2, x + 140, y2 + 75, COLOR_API_AI if i == 0 else COLOR_PROCESS)
        draw_text_centered(draw, x + 70, y2 + 37, txt, font_node_b if "10" in txt or "6" in txt else font_node)
        if i < 4:
            # Arrow pointing left
            draw_arrow(draw, x, y2 + 37, x - 30, y2 + 37)
            
    # Arrow to Output
    draw_shadowed_rect(draw, 40, 390, 210, 460, COLOR_DB)
    draw_text_centered(draw, 125, 425, "ẢNH NHỊ PHÂN SẠCH SẼ\nĐen trắng - Sẵn sàng OCR", font_node_b)
    draw_arrow(draw, 110, y2 + 75, 110, 390)
    
    img.save(os.path.join(OUT_DIR, "flowchart_2_tien_xu_ly.png"), "PNG")

def generate_flowchart_3():
    # 3. QUY TRÌNH CHẤM ĐIỂM AI (END-TO-END)
    img = Image.new("RGB", (900, 650), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Title
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 450, 25, "HÌNH 3.3: QUY TRÌNH CHẤM ĐIỂM BẰNG AI ĐA PHƯƠNG THỨC TIỂU HỌC", font_title)
    
    # Vertical Flow: Input -> Pipeline 10 bước -> Base64 -> Payload + System Prompt -> Gemini 3.0 API -> JSON validation -> Save/Display
    steps = [
        ("B1. Tải ảnh & nhập thông tin", COLOR_START_END, "Nhập tên học sinh, lớp, tiêu đề chính tả"),
        ("B2. Tiền xử lý 10 bước cục bộ", COLOR_PROCESS, "Khử bóng, Gridlines, nhị phân hóa bằng Jimp"),
        ("B3. Mã hóa Base64 ảnh sạch", COLOR_PROCESS, "Đóng gói ảnh nhị phân sang định dạng text"),
        ("B4. Lắp ráp Prompt Sư phạm", COLOR_DECISION, "Barem Thông tư 27 + JSON Output Schema"),
        ("B5. Gọi Gemini 3.0 API", COLOR_API_AI, "Xoay vòng API Keys ngẫu nhiên (Key Rotation)"),
        ("B6. Nhận phản hồi & Parse JSON", COLOR_API_AI, "Lọc Markdown, trích xuất cấu hình điểm"),
        ("B7. Giáo viên duyệt & Sửa đổi", COLOR_DECISION, "Cho phép GV điều chỉnh điểm và nhận xét"),
        ("B8. Lưu SQLite & Hiển thị", COLOR_DB, "Lưu trữ lịch sử, cập nhật biểu đồ tiến trình")
    ]
    
    font_h = get_font(12, bold=True)
    font_d = get_font(10, bold=False)
    
    y = 70
    for i, (title, color, desc) in enumerate(steps):
        # Draw box
        draw_shadowed_rect(draw, 250, y, 650, y + 50, color)
        draw_text_centered(draw, 450, y + 16, title, font_h)
        draw_text_centered(draw, 450, y + 36, desc, font_d)
        
        # Draw side annotations for Key Rotation
        if i == 4:
            draw_shadowed_rect(draw, 680, y, 880, y + 50, COLOR_WARNING)
            draw_text_centered(draw, 780, y + 16, "Cơ chế chịu lỗi (503/429)", font_h)
            draw_text_centered(draw, 780, y + 36, "Tự động đổi Key & Retry", font_d)
            draw_arrow(draw, 650, y + 25, 680, y + 25)
            draw_arrow(draw, 780, y + 50, 780, y + 80)
            draw_arrow(draw, 780, y + 80, 450, y + 80)
            
        if i < 7:
            draw_arrow(draw, 450, y + 50, 450, y + 70)
            
        y += 70
        
    img.save(os.path.join(OUT_DIR, "flowchart_3_cham_diem_ai.png"), "PNG")

def generate_flowchart_4():
    # 4. PHÂN QUYỀN RBAC
    img = Image.new("RGB", (800, 480), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Title
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 400, 25, "HÌNH 3.4: SƠ ĐỒ PHÂN QUYỀN VÀ XÁC THỰC NGƯỜI DÙNG (RBAC)", font_title)
    
    # Login -> Middleware Role check -> 3 branches
    font_h = get_font(12, bold=True)
    font_d = get_font(10, bold=False)
    
    # Login Box
    draw_shadowed_rect(draw, 300, 70, 500, 130, COLOR_START_END)
    draw_text_centered(draw, 400, 100, "ĐĂNG NHẬP HỆ THỐNG\n(Username / Password)", font_h)
    
    # Role Check Decision
    draw_diamond(draw, 400, 210, 180, 80, COLOR_DECISION)
    draw_text_centered(draw, 400, 210, "Kiểm tra quyền\n(Middleware RBAC)", font_h)
    draw_arrow(draw, 400, 130, 400, 170)
    
    # 3 Branches: Admin, Teacher, Student
    y_branch = 310
    # Branch 1: Student
    draw_shadowed_rect(draw, 40, y_branch, 240, 410, COLOR_PROCESS)
    draw_text_centered(draw, 140, y_branch + 25, "Học sinh (Student)\n- Xem lịch sử cá nhân\n- Theo dõi đồ thị tiến bộ\n- Không có quyền chấm điểm", font_d)
    draw_arrow(draw, 310, 210, 140, 210)
    draw_arrow(draw, 140, 210, 140, y_branch)
    
    # Branch 2: Teacher
    draw_shadowed_rect(draw, 290, y_branch, 510, 410, COLOR_API_AI)
    draw_text_centered(draw, 400, y_branch + 25, "Giáo viên (Teacher)\n- Gọi AI chấm bài lớp mình\n- Xem thống kê lớp học\n- Duyệt/chỉnh sửa điểm bài làm", font_d)
    draw_arrow(draw, 400, 250, 400, y_branch)
    
    # Branch 3: Admin
    draw_shadowed_rect(draw, 560, y_branch, 760, 410, COLOR_DB)
    draw_text_centered(draw, 660, y_branch + 25, "Quản trị viên (Admin)\n- Quản lý tài khoản (CRUD)\n- Quản lý lớp & Phân công GV\n- Giám sát hệ thống / API keys", font_d)
    draw_arrow(draw, 490, 210, 660, 210)
    draw_arrow(draw, 660, 210, 660, y_branch)
    
    img.save(os.path.join(OUT_DIR, "flowchart_4_phan_quyen.png"), "PNG")

def generate_chuong4_1():
    # CHUONG 4 - HÌNH 4.1: SƠ ĐỒ CSDL (ER DIAGRAM)
    img = Image.new("RGB", (900, 450), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 450, 25, "HÌNH 4.1: SƠ ĐỒ CƠ SỞ DỮ LIỆU (ENTITY-RELATIONSHIP DIAGRAM)", font_title)
    
    font_h = get_font(12, bold=True)
    font_d = get_font(10, bold=False)
    
    # Model User
    draw_shadowed_rect(draw, 50, 80, 270, 360, COLOR_PROCESS)
    draw_text_centered(draw, 160, 105, "Table: User", font_h)
    draw.line([50, 125, 270, 125], fill=BORDER_COLOR, width=2)
    user_fields = [
        "id: String (PK)",
        "name: String",
        "username: String (UQ)",
        "password: String",
        "role: String",
        "className: String",
        "active: Boolean",
        "createdAt: DateTime"
    ]
    draw_text_centered(draw, 160, 245, "\n".join(user_fields), font_d)
    
    # Model Class
    draw_shadowed_rect(draw, 340, 80, 560, 260, COLOR_DB)
    draw_text_centered(draw, 450, 105, "Table: Class", font_h)
    draw.line([340, 125, 560, 125], fill=BORDER_COLOR, width=2)
    class_fields = [
        "id: String (PK)",
        "name: String (UQ)",
        "grade: Int",
        "teacherId: String",
        "createdAt: DateTime"
    ]
    draw_text_centered(draw, 450, 195, "\n".join(class_fields), font_d)
    
    # Model Grade
    draw_shadowed_rect(draw, 630, 80, 850, 400, COLOR_API_AI)
    draw_text_centered(draw, 740, 105, "Table: Grade", font_h)
    draw.line([630, 125, 850, 125], fill=BORDER_COLOR, width=2)
    grade_fields = [
        "id: String (PK)",
        "studentName: String",
        "assignmentTitle: String",
        "className: String",
        "originalText: String",
        "fixedText: String",
        "corrections: String (JSON)",
        "score: String",
        "scoreNum: Float",
        "scoreBreakdown: String",
        "feedback: String",
        "overallRating: String",
        "imageBase64: String",
        "createdAt: DateTime"
    ]
    draw_text_centered(draw, 740, 265, "\n".join(grade_fields), font_d)
    
    # Relationship lines
    # Class.teacherId -> User.id
    draw_arrow(draw, 340, 200, 270, 200, "Logic FK")
    # User.className -> Class.name
    draw_arrow(draw, 270, 220, 340, 220, "Logic FK")
    # Grade.className -> Class.name
    draw_arrow(draw, 630, 200, 560, 200, "Logic FK")
    
    img.save(os.path.join(OUT_DIR, "chuong4_1_so_do_csdl.png"), "PNG")

def generate_chuong4_2():
    # HÌNH 4.2: LƯU ĐỒ API CHẤM ĐIỂM /API/GRADE
    img = Image.new("RGB", (900, 680), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 450, 25, "HÌNH 4.2: LƯU ĐỒ LUỒNG XỬ LÝ CHI TIẾT API CHẤM ĐIỂM (/api/grade)", font_title)
    
    font_h = get_font(12, bold=True)
    font_d = get_font(10, bold=False)
    
    # Flow
    # Client POST base64 image -> Preprocessing Jimp -> Quality Check Decision -> Gemini Key Rotation call -> JSON Parser -> Response
    y = 70
    draw_shadowed_rect(draw, 280, y, 620, y + 45, COLOR_START_END)
    draw_text_centered(draw, 450, y + 22, "1. Nhận yêu cầu POST (Base64 + Thông tin)", font_h)
    draw_arrow(draw, 450, y + 45, 450, y + 65)
    
    y += 65
    draw_shadowed_rect(draw, 280, y, 620, y + 45, COLOR_PROCESS)
    draw_text_centered(draw, 450, y + 22, "2. Gọi Jimp tiền xử lý ảnh 10 bước", font_h)
    draw_arrow(draw, 450, y + 45, 450, y + 65)
    
    y += 65
    draw_diamond(draw, 450, y + 40, 180, 80, COLOR_DECISION)
    draw_text_centered(draw, 450, y + 40, "Đạt chất lượng?\n(Quality Assessment)", font_d)
    draw_arrow(draw, 450, y + 80, 450, y + 105)
    
    # Reject path (No)
    draw_arrow(draw, 540, y + 40, 720, y + 40, "Không đạt")
    draw_shadowed_rect(draw, 720, y + 15, 870, y + 65, COLOR_WARNING)
    draw_text_centered(draw, 795, y + 40, "Trả cảnh báo mờ/tối\nYêu cầu chụp lại", font_d)
    
    y += 105
    draw_shadowed_rect(draw, 280, y, 620, y + 65, COLOR_API_AI)
    draw_text_centered(draw, 450, y + 20, "3. Trộn và gọi ngẫu nhiên API Keys", font_h)
    draw_text_centered(draw, 450, y + 45, "Gemini 3.0 Flash Preview (Key Rotation)", font_d)
    draw_arrow(draw, 450, y + 65, 450, y + 90)
    
    y += 90
    draw_diamond(draw, 450, y + 40, 180, 80, COLOR_DECISION)
    draw_text_centered(draw, 450, y + 40, "API lỗi 503/429?", font_d)
    draw_arrow(draw, 450, y + 80, 450, y + 105)
    
    # Failover path
    draw_arrow(draw, 540, y + 40, 720, y + 40, "Có")
    draw_shadowed_rect(draw, 720, y + 15, 870, y + 65, COLOR_WARNING)
    draw_text_centered(draw, 795, y + 40, "Đổi API Key khác\nTự động Retry (tối đa 2 lần)", font_d)
    draw_arrow(draw, 795, y + 15, 795, y - 60)
    draw_arrow(draw, 795, y - 60, 620, y - 60)
    
    y += 105
    draw_shadowed_rect(draw, 280, y, 620, y + 55, COLOR_DB)
    draw_text_centered(draw, 450, y + 18, "4. Trích xuất JSON & Chống ảo giác AI", font_h)
    draw_text_centered(draw, 450, y + 38, "Loại bỏ thẻ markdown, parse dữ liệu chấm điểm", font_d)
    draw_arrow(draw, 450, y + 55, 450, y + 75)
    
    y += 75
    draw_shadowed_rect(draw, 280, y, 620, y + 45, COLOR_START_END)
    draw_text_centered(draw, 450, y + 22, "5. Trả kết quả JSON cấu trúc cho Client", font_h)
    
    img.save(os.path.join(OUT_DIR, "chuong4_2_api_grade_flow.png"), "PNG")

def generate_chuong4_3():
    # HÌNH 4.3: SƠ ĐỒ ĐIỀU HƯỚNG GIAO DIỆN (UI NAVIGATION MAP)
    img = Image.new("RGB", (900, 500), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 450, 25, "HÌNH 4.3: SƠ ĐỒ ĐIỀU HƯỚNG GIAO DIỆN (UI NAVIGATION MAP)", font_title)
    
    font_h = get_font(11, bold=True)
    font_d = get_font(10, bold=False)
    
    # Login Center Box
    draw_shadowed_rect(draw, 350, 70, 550, 130, COLOR_START_END)
    draw_text_centered(draw, 450, 100, "TRANG ĐĂNG NHẬP\n(Role Auto-Redirection)", font_h)
    
    # Hidden Admin register button
    draw_shadowed_rect(draw, 640, 70, 840, 130, COLOR_WARNING)
    draw_text_centered(draw, 740, 100, "Đăng ký Quản trị ẩn\n(/admin-register)", font_h)
    draw_arrow(draw, 550, 100, 640, 100, "Secret Key")
    
    # Three main roles
    # 1. Student
    draw_shadowed_rect(draw, 40, 200, 260, 440, COLOR_PROCESS)
    draw_text_centered(draw, 150, 225, "PHÂN HỆ HỌC SINH", font_h)
    draw.line([40, 240, 260, 240], fill=BORDER_COLOR, width=1)
    student_routes = [
        "- Dashboard chính (/student)",
        "- Xem điểm trung bình & Badge",
        "- Lịch sử bài chấm (/student/history)",
        "- Xem nhận xét chi tiết và ảnh",
        "- Biểu đồ xu hướng tiến bộ chính tả"
    ]
    draw_text_centered(draw, 150, 340, "\n".join(student_routes), font_d)
    
    # 2. Teacher
    draw_shadowed_rect(draw, 320, 200, 580, 440, COLOR_API_AI)
    draw_text_centered(draw, 450, 225, "PHÂN HỆ GIÁO VIÊN", font_h)
    draw.line([320, 240, 580, 240], fill=BORDER_COLOR, width=1)
    teacher_routes = [
        "- Dashboard lớp (/teacher)",
        "- Chụp ảnh / Tải lên bài học sinh",
        "- Nhận kết quả chấm điểm AI",
        "- Sửa điểm / Sửa nhận xét thủ công",
        "- Lưu CSDL SQLite qua Prisma",
        "- Báo cáo thống kê lớp (/teacher/reports)"
    ]
    draw_text_centered(draw, 450, 340, "\n".join(teacher_routes), font_d)
    
    # 3. Admin
    draw_shadowed_rect(draw, 640, 200, 860, 440, COLOR_DB)
    draw_text_centered(draw, 750, 225, "PHÂN HỆ QUẢN TRỊ", font_h)
    draw.line([640, 240, 860, 240], fill=BORDER_COLOR, width=1)
    admin_routes = [
        "- Dashboard tổng quan (/admin)",
        "- Quản lý User (GV/HS CRUD)",
        "- Quản lý Lớp & phân công chủ nhiệm",
        "- Cài đặt hệ thống & API Key Pool",
        "- Giám sát tình trạng Pi 4 (/admin/system)"
    ]
    draw_text_centered(draw, 750, 340, "\n".join(admin_routes), font_d)
    
    # Navigation arrows
    draw_arrow(draw, 350, 110, 150, 110)
    draw_arrow(draw, 150, 110, 150, 200)
    
    draw_arrow(draw, 450, 130, 450, 200)
    
    draw_arrow(draw, 550, 120, 750, 120)
    draw_arrow(draw, 750, 120, 750, 200)
    
    img.save(os.path.join(OUT_DIR, "chuong4_3_ui_navigation.png"), "PNG")

def generate_chuong4_4():
    # HÌNH 4.4: KIẾN TRÚC TRIỂN KHAI RASPBERRY PI 4 + CLOUDFLARE
    img = Image.new("RGB", (900, 500), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 450, 25, "HÌNH 4.4: KIẾN TRÚC TRIỂN KHAI THỰC TẾ (RASPBERRY PI 4 + CLOUDFLARE)", font_title)
    
    font_h = get_font(12, bold=True)
    font_d = get_font(10, bold=False)
    
    # Outer World
    draw_shadowed_rect(draw, 40, 80, 260, 220, COLOR_START_END)
    draw_text_centered(draw, 150, 110, "Giáo viên / Học sinh ở nhà", font_h)
    draw_text_centered(draw, 150, 160, "Kết nối Internet (4G/WiFi)\nTruy cập qua HTTPS\nhttps://vihandgrade.click", font_d)
    
    # Cloudflare Tunnel
    draw_shadowed_rect(draw, 330, 80, 570, 220, COLOR_API_AI)
    draw_text_centered(draw, 450, 110, "Cloudflare Edge network", font_h)
    draw_text_centered(draw, 450, 160, "Cloudflare Tunnel Daemon\n(An toàn - Không cần mở port)\nSSL tự động hóa", font_d)
    draw_arrow(draw, 260, 150, 330, 150)
    
    # Local Network
    draw_shadowed_rect(draw, 640, 80, 860, 220, COLOR_START_END)
    draw_text_centered(draw, 750, 110, "Thiết bị nội bộ trường", font_h)
    draw_text_centered(draw, 750, 160, "Truy cập trực tiếp LAN\nKhông cần internet\nhttp://192.168.195.x:3000", font_d)
    
    # Raspberry Pi 4 (Heart of deployment)
    draw_shadowed_rect(draw, 220, 280, 680, 470, COLOR_DB)
    draw_text_centered(draw, 450, 310, "MÁY CHỦ NHÚNG RASPBERRY PI 4 (4GB RAM)", font_h)
    draw.line([220, 330, 680, 330], fill=BORDER_COLOR, width=2)
    
    pi_services = (
        "- Next.js Production Web Server (Port 3000) - Khởi chạy bằng Systemd daemon\n"
        "- Jimp Image Preprocessing (Xử lý ảnh cục bộ cực nhẹ, không tốn RAM)\n"
        "- SQLite CSDL nhúng tệp tin vihand.db + Prisma ORM (Không chạy service ngầm)\n"
        "- Script update_keys.sh: Tự động pull code Github + Rebuild + Rotation Keys"
    )
    draw_text_centered(draw, 450, 400, pi_services, font_d)
    
    # Connect Cloudflare and LAN to Pi
    draw_arrow(draw, 450, 220, 450, 280, "Secure Tunnel")
    draw_arrow(draw, 750, 220, 750, 380)
    draw_arrow(draw, 750, 380, 680, 380, "LAN Direct")
    
    img.save(os.path.join(OUT_DIR, "chuong4_4_trien_khai.png"), "PNG")

def generate_chuong4_5():
    # HÌNH 4.5: QUY TRÌNH PHÁT TRIỂN HỆ THỐNG
    img = Image.new("RGB", (900, 520), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, bold=True)
    draw_text_centered(draw, 450, 25, "HÌNH 4.5: QUY TRÌNH 9 GIAI ĐOẠN PHÁT TRIỂN HỆ THỐNG VIHAND GRADE", font_title)
    
    steps = [
        "1. Thu thập dữ liệu\n(Ảnh viết tay tiểu học)",
        "2. Khám phá dữ liệu\n(Phân loại nhóm lỗi phổ biến)",
        "3. Tiền xử lý Jimp\n(Pipeline ảnh 10 bước)",
        "4. Xây dựng prompt & barem\n(Theo Thông tư 27 quy chuẩn)",
        "5. Thử nghiệm thực tế\n(Kiểm chứng độ chính xác)",
        "6. Tinh chỉnh mô hình\n(Random API keys, temp=0.1)",
        "7. Kiểm thử liên kết\n(Next.js + Prisma + SQLite)",
        "8. Triển khai phần cứng\n(Pi 4 + Cloudflare Tunnel)",
        "9. Giám sát duy trì\n(Nhiệt độ CPU, SQLite db size)"
    ]
    
    font_node = get_font(10, bold=True)
    
    # Let's draw in a 3x3 grid with clean flow arrows
    coords = [
        (100, 80), (400, 80), (700, 80),
        (700, 230), (400, 230), (100, 230),
        (100, 380), (400, 380), (700, 380)
    ]
    
    for i, txt in enumerate(steps):
        cx, cy = coords[i]
        color = COLOR_DB if i == 8 else (COLOR_START_END if i in [0, 4] else COLOR_PROCESS)
        if i == 5:
            color = COLOR_DECISION
        if i == 7:
            color = COLOR_API_AI
            
        draw_shadowed_rect(draw, cx - 90, cy, cx + 90, cy + 70, color)
        draw_text_centered(draw, cx, cy + 35, txt, font_node)
        
    # Flow arrows
    draw_arrow(draw, 190, 115, 310, 115) # 1 -> 2
    draw_arrow(draw, 490, 115, 610, 115) # 2 -> 3
    draw_arrow(draw, 700, 150, 700, 230) # 3 -> 4
    draw_arrow(draw, 610, 265, 490, 265) # 4 -> 5
    draw_arrow(draw, 310, 265, 190, 265) # 5 -> 6
    draw_arrow(draw, 100, 300, 100, 380) # 6 -> 7
    draw_arrow(draw, 190, 415, 310, 415) # 7 -> 8
    draw_arrow(draw, 490, 415, 610, 415) # 8 -> 9
    
    img.save(os.path.join(OUT_DIR, "chuong4_5_quy_trinh_phat_trien.png"), "PNG")

def generate_system_pipeline():
    # Helper to generate the general system_pipeline image if referenced
    img = Image.new("RGB", (900, 400), BG_COLOR)
    draw = ImageDraw.Draw(img)
    font_title = get_font(14, bold=True)
    draw_text_centered(draw, 450, 20, "SƠ ĐỒ LUỒNG DỮ LIỆU PIPELINE TỔNG THỂ HỆ THỐNG", font_title)
    
    font_h = get_font(12, bold=True)
    font_d = get_font(10, bold=False)
    
    steps = [
        "Ảnh chụp thô ô ly",
        "Pipeline Jimp 10 bước",
        "Ảnh nhị phân sạch",
        "Gemini 3.0 (Rotation)",
        "Đánh giá & Lưu SQLite"
    ]
    for i, step in enumerate(steps):
        x = 50 + i * 165
        color = COLOR_START_END if i == 0 else (COLOR_DB if i == 4 else COLOR_PROCESS)
        if i == 3:
            color = COLOR_API_AI
        draw_shadowed_rect(draw, x, 120, x + 140, 200, color)
        draw_text_centered(draw, x + 70, 160, step, font_h)
        if i < 4:
            draw_arrow(draw, x + 140, 160, x + 165, 160)
            
    img.save(os.path.join(OUT_DIR, "system_pipeline.png"), "PNG")

if __name__ == "__main__":
    print("Starting to draw all flowcharts for flowchartv2...")
    generate_flowchart_1()
    generate_flowchart_2()
    generate_flowchart_3()
    generate_flowchart_4()
    generate_chuong4_1()
    generate_chuong4_2()
    generate_chuong4_3()
    generate_chuong4_4()
    generate_chuong4_5()
    generate_system_pipeline()
    print("Successfully generated all 10 high-quality flowcharts in 01_Bao_cao_Nghien_cuu/flowchartv2/")
