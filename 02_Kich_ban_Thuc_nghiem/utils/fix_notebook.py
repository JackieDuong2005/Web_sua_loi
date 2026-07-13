import json

notebook_path = r"C:\Users\Jackie Duong\Desktop\Web_sua_loi\02_Kich_ban_Thuc_nghiem\gemini_ocr.ipynb"

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

new_code = """import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# Đã gỡ bỏ cấu hình font Segoe UI để tránh lỗi Warning trên Google Colab
# Colab sẽ tự động dùng font mặc định hỗ trợ tốt tiếng Việt

# ==========================================
# BIỂU ĐỒ 1: ĐỘ CHÍNH XÁC (HANDWRITING)
# ==========================================
models = ['Gemini API (Multimodal)', 'LLaMA-3.2-11B-Vision', 'Chandra OCR', 'Light-on-OCR1B', 'EasyOCR (DL)', 'Tesseract-VietOCR']
# Sắp xếp theo độ chính xác từ cao xuống thấp
acc_min = [92, 85, 80, 78, 65, 30]
acc_max = [98, 90, 87, 84, 75, 50]
acc_avg = [(m + x) / 2 for m, x in zip(acc_min, acc_max)]

fig1, ax1 = plt.subplots(figsize=(10, 6))
y_pos = np.arange(len(models))

# Vẽ dải phần trăm
ax1.barh(y_pos, [x - m for m, x in zip(acc_min, acc_max)], left=acc_min, height=0.5, color='#4A90E2', edgecolor='black', alpha=0.8)

# Thêm điểm trung bình
ax1.scatter(acc_avg, y_pos, color='#E74C3C', zorder=5, s=80, label='Trung bình')

# Thêm text chỉ số vào bên cạnh bar
for i in range(len(models)):
    ax1.text(acc_max[i] + 1.5, y_pos[i], f"{acc_min[i]}-{acc_max[i]}%", va='center', fontsize=11, fontweight='bold')

ax1.set_yticks(y_pos)
ax1.set_yticklabels(models, fontsize=11)
ax1.invert_yaxis()
ax1.set_xlabel('Độ chính xác (%)', fontsize=12)
ax1.set_title('Biểu đồ 1: So sánh Độ chính xác trích xuất Văn bản (Handwriting)', fontsize=14, fontweight='bold', pad=15)
ax1.set_xlim(0, 105)
ax1.grid(axis='x', linestyle='--', alpha=0.7)
ax1.legend(loc='lower right')
plt.tight_layout()
plt.show()

# ==========================================
# BIỂU ĐỒ 2: ĐÁNH GIÁ CÁC TIÊU CHÍ ĐỊNH TÍNH (HEATMAP)
# ==========================================
# Thang điểm quy đổi 1-5
data_qualitative = {
    'Mô hình': ['Gemini API', 'LLaMA-3.2-11B', 'Chandra OCR', 'Light-on-OCR1B', 'EasyOCR', 'Tesseract'],
    'Xử lý dấu tiếng Việt': [5, 4, 4, 3, 2, 1],
    'Độ trễ (Tốc độ)': [1, 3, 4, 5, 4, 5],
    'Xử lý Văn bằng': [5, 4, 3, 3, 2, 2],
    'Ghi chú tay (Notes)': [5, 4, 3, 3, 2, 1]
}

df_qualitative = pd.DataFrame(data_qualitative)
df_qualitative.set_index('Mô hình', inplace=True)

# Ghi chú tóm tắt hiển thị trên Heatmap
annotations = np.array([
    ['Xuất sắc', 'Cao', 'JSON cực chuẩn', 'Đọc chữ "ngoáy"'],
    ['Rất tốt', 'T.Bình', 'Trích xuất tốt', 'Đọc liền mạch'],
    ['Tốt', 'Thấp', 'Tập trung OCR', 'Chuyên cho dòng'],
    ['Khá', 'Rất thấp', 'Cần Prompt', 'Tốt chữ rõ'],
    ['Trung bình', 'Thấp', 'Cần Layout', 'Lỗi dòng xiên'],
    ['Kém', 'Rất thấp', 'Form cố định', 'Không khả thi']
])

plt.figure(figsize=(11, 6)) # Chỉnh lại kích thước cho gọn gàng hơn
sns.heatmap(df_qualitative, annot=annotations, fmt="", cmap='YlGnBu', 
            cbar_kws={'label': 'Điểm đánh giá quy đổi (1: Kém -> 5: Tốt nhất)'}, 
            linewidths=1, linecolor='white', annot_kws={'size': 11, 'weight': 'bold'})

plt.title('Biểu đồ 2: Đánh giá tiêu chí Định tính & Hiệu năng thực tế', fontsize=14, fontweight='bold', pad=15)
# Sửa lỗi chữ bị cắt bằng cách đặt rotation=0
plt.xticks(rotation=0, ha='center', fontsize=11)
plt.yticks(rotation=0, fontsize=11)
plt.tight_layout()
plt.show()

# Đã lược bỏ Biểu đồ 3 (Radar Chart) theo yêu cầu để giao diện gọn gàng, dễ nhìn hơn.
"""

# Format code lines into list for json source
code_lines = [line + '\n' for line in new_code.split('\n')]
code_lines[-1] = code_lines[-1].rstrip('\n') # remove last newline

# Find the cell that has the chart plotting code and replace it
found = False
for cell in reversed(nb['cells']):
    if cell['cell_type'] == 'code':
        source_text = "".join(cell.get('source', []))
        if 'BIỂU ĐỒ 1: ĐỘ CHÍNH XÁC' in source_text:
            cell['source'] = code_lines
            found = True
            break

if found:
    with open(notebook_path, 'w', encoding='utf-8') as f:
        json.dump(nb, f, indent=1, ensure_ascii=False)
    print("Notebook updated successfully.")
else:
    print("Could not find the target cell.")
