import os
from PIL import Image, ImageDraw, ImageFont

def draw_text_with_highlights(draw, x_start, y_start, text, font_text, font_note, text_color, highlight_word_map):
    words = text.split(" ")
    curr_x = x_start
    for word in words:
        # Clean the word from punctuation to check mapping
        word_clean = word.rstrip(".,?!")
        punctuation = word[len(word_clean):]
        
        # Get width of word
        word_width = draw.textlength(word_clean, font=font_text)
        
        # Draw word
        draw.text((curr_x, y_start), word_clean, fill=text_color, font=font_text)
        
        # If the word needs highlighting
        if word_clean in highlight_word_map:
            color, note = highlight_word_map[word_clean]
            # Draw underline (5px below font baseline)
            underline_y = y_start + 55
            draw.line([(curr_x, underline_y), (curr_x + word_width, underline_y)], fill=color, width=4)
            # Draw label below the line
            note_x = curr_x - 10
            note_y = underline_y + 10
            draw.text((note_x, note_y), note, fill=color, font=font_note)
            
        curr_x += word_width
        
        # Draw punctuation
        if punctuation:
            punct_width = draw.textlength(punctuation, font=font_text)
            draw.text((curr_x, y_start), punctuation, fill=text_color, font=font_text)
            curr_x += punct_width
            
        # Draw space
        curr_x += draw.textlength(" ", font=font_text)

def generate_grid_image():
    # Canvas dimensions (larger for bigger text)
    width = 1500
    height = 700
    
    # Create background (warm paper color)
    image = Image.new("RGB", (width, height), "#FCFAF5")
    draw = ImageDraw.Draw(image)
    
    # 1. Draw grids (vở ô ly) - larger grid size (30px)
    grid_size = 30
    for x in range(0, width, grid_size):
        draw.line([(x, 0), (x, height)], fill="#E2EBF5", width=1)
    for y in range(0, height, grid_size):
        draw.line([(0, y), (width, y)], fill="#E2EBF5", width=1)
        
    # Thicker grid lines every 5 grids (150px)
    for x in range(0, width, grid_size * 5):
        draw.line([(x, 0), (x, height)], fill="#C5D5E8", width=2)
    for y in range(0, height, grid_size * 5):
        draw.line([(0, y), (width, y)], fill="#C5D5E8", width=2)
        
    # Draw left red margin line (lề vở) at x = 120
    draw.line([(120, 0), (120, height)], fill="#FFA8A8", width=2)

    # 2. Select font
    font_local = "c:/Users/Jackie Duong/Desktop/Web_sua_loi/02_Kich_ban_Thuc_nghiem/DancingScript-Regular.ttf"
    if not os.path.exists(font_local):
        import urllib.request
        font_url = "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf"
        try:
            print("Downloading Dancing Script font...")
            urllib.request.urlretrieve(font_url, font_local)
        except Exception as e:
            print(f"Failed to download font: {e}")
            font_local = "C:\\Windows\\Fonts\\arial.ttf"
            
    # Significantly larger font sizes
    try:
        font_title = ImageFont.truetype(font_local, 36)
        font_text = ImageFont.truetype(font_local, 54)
        font_note = ImageFont.truetype(font_local, 26)
    except IOError:
        font_title = ImageFont.load_default()
        font_text = ImageFont.load_default()
        font_note = ImageFont.load_default()
        
    ink_color = "#154360"
    correct_ink_color = "#1D8348"
    label_color = "#A04000"
    
    # 3. Draw Section 1 (Student Writing)
    draw.text((150, 50), "1. Bài viết của học sinh (Có 2 lỗi sai):", fill=label_color, font=font_title)
    
    student_paragraph = "Mẹ đưa em đi chơi ngày têt. Con đừơg làng rực rỡ cờ hoa."
    highlight_map_1 = {
        "têt": ("#E74C3C", "(thiếu dấu sắc)"),
        "đừơg": ("#E74C3C", "(sai vần 'ương' -> 'ươg')")
    }
    draw_text_with_highlights(draw, 150, 100, student_paragraph, font_text, font_note, ink_color, highlight_map_1)
    
    # Divider line
    draw.line([(150, 330), (1400, 330)], fill="#BDC3C7", width=1)
    
    # 4. Draw Section 2 (Corrected Version)
    draw.text((150, 370), "2. Kết quả sau khi ViHand Grade sửa lỗi chính tả:", fill=correct_ink_color, font=font_title)
    
    corrected_paragraph = "Mẹ đưa em đi chơi ngày tết. Con đường làng rực rỡ cờ hoa."
    highlight_map_2 = {
        "tết": ("#27AE60", "(đã thêm dấu)"),
        "đường": ("#27AE60", "(đã sửa đúng vần)")
    }
    draw_text_with_highlights(draw, 150, 430, corrected_paragraph, font_text, font_note, correct_ink_color, highlight_map_2)

    # Save to artifacts directory
    output_path = "C:/Users/Jackie Duong/.gemini/antigravity/brain/fba358db-3b29-46d3-a02f-14b1e9d24ecf/artifacts/spelling_comparison_paragraph_v5.png"
    image.save(output_path, "PNG")
    print(f"Generated large-text spelling comparison image and saved to {output_path}")

if __name__ == "__main__":
    generate_grid_image()
