"""Flowchart 1: Lưu đồ hoạt động tổng thể hệ thống ViHand Grade (Hình 3.1)"""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import os

def draw_box(ax, x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fontsize=9, bold=False):
    box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                         boxstyle="round,pad=0.02", facecolor=color,
                         edgecolor=edge, linewidth=1.5)
    ax.add_patch(box)
    weight = 'bold' if bold else 'normal'
    ax.text(x, y, text, ha='center', va='center', fontsize=fontsize,
            fontweight=weight, wrap=True,
            fontfamily='DejaVu Sans')

def draw_diamond(ax, x, y, w, h, text, color='#FFF9C4', edge='#F9A825'):
    diamond = plt.Polygon([(x, y+h/2), (x+w/2, y), (x, y-h/2), (x-w/2, y)],
                          facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(diamond)
    ax.text(x, y, text, ha='center', va='center', fontsize=8, fontfamily='DejaVu Sans')

def draw_arrow(ax, x1, y1, x2, y2, color='#455A64'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.5))

def main():
    fig, ax = plt.subplots(1, 1, figsize=(14, 18))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 18)
    ax.axis('off')

    # Title
    ax.text(7, 17.3, 'FLOWCHART 1: OVERALL SYSTEM FLOW', ha='center', fontsize=14,
            fontweight='bold', fontfamily='DejaVu Sans', color='#1565C0')
    ax.text(7, 16.9, 'ViHand Grade - Vietnamese Handwriting Grading System', ha='center',
            fontsize=10, fontfamily='DejaVu Sans', color='#546E7A')

    # Step 1: Input
    draw_box(ax, 7, 16, 5, 0.8,
             'STEP 1: DATA INPUT\nTeacher/Student uploads photo of handwritten essay on grid paper',
             color='#E8F5E9', edge='#2E7D32', fontsize=9, bold=True)

    draw_arrow(ax, 7, 15.6, 7, 15.0)

    # Step 2: Preprocessing
    draw_box(ax, 7, 14.4, 5.5, 1.2,
             'STEP 2: IMAGE PREPROCESSING (10-step Pipeline)\n'
             'EXIF rotate → Resize → White Balance → Grayscale\n'
             '→ Shadow Removal → Grid Line Removal → CLAHE\n'
             '→ Sharpen → Quality Assessment → Adaptive Threshold',
             color='#E3F2FD', edge='#1565C0', fontsize=8)

    draw_arrow(ax, 7, 13.8, 7, 13.2)

    # Quality check diamond
    draw_diamond(ax, 7, 12.6, 4, 0.9, 'Quality OK?\n(blur, brightness, contrast)')

    # Quality fail path
    draw_arrow(ax, 9, 12.6, 11.5, 12.6, color='#C62828')
    draw_box(ax, 12.5, 12.6, 2.2, 0.7,
             'WARNING\nReturn quality\nalert to user',
             color='#FFEBEE', edge='#C62828', fontsize=7)

    # Quality pass path
    draw_arrow(ax, 7, 12.15, 7, 11.5)
    ax.text(7.3, 12.0, 'PASS', fontsize=7, color='#2E7D32', fontfamily='DejaVu Sans')
    ax.text(9.3, 12.75, 'FAIL', fontsize=7, color='#C62828', fontfamily='DejaVu Sans')

    # Step 3: AI Analysis
    draw_box(ax, 7, 10.9, 5.5, 1.0,
             'STEP 3: MULTIMODAL AI ANALYSIS (Gemini 3 Flash)\n'
             'Base64 image + Grading Prompt → API Key Rotation\n'
             '→ OCR handwriting + Spelling error detection (NLP)',
             color='#F3E5F5', edge='#7B1FA2', fontsize=8.5, bold=True)

    draw_arrow(ax, 7, 10.4, 7, 9.7)

    # Step 4: JSON Parsing
    draw_box(ax, 7, 9.1, 5.5, 1.0,
             'STEP 4: JSON PARSING & SCORE CALCULATION\n'
             'Parse AI response → Extract 4 criteria scores\n'
             '(Spelling 4.0 | Form 3.0 | Content 2.0 | Creativity 1.0)',
             color='#FFF3E0', edge='#E65100', fontsize=8.5)

    draw_arrow(ax, 7, 8.6, 7, 7.9)

    # JSON valid check
    draw_diamond(ax, 7, 7.4, 3.5, 0.8, 'JSON Valid?')

    draw_arrow(ax, 9, 7.4, 11.5, 7.4, color='#C62828')
    draw_box(ax, 12.5, 7.4, 2.2, 0.7,
             'ERROR\nParsing failed\nReturn raw text',
             color='#FFEBEE', edge='#C62828', fontsize=7)

    draw_arrow(ax, 7, 7.0, 7, 6.3)
    ax.text(7.3, 6.9, 'YES', fontsize=7, color='#2E7D32', fontfamily='DejaVu Sans')
    ax.text(9.3, 7.55, 'NO', fontsize=7, color='#C62828', fontfamily='DejaVu Sans')

    # Step 5: Teacher Review
    draw_box(ax, 7, 5.7, 5, 0.9,
             'STEP 5: TEACHER REVIEW & APPROVAL\n'
             'Teacher reviews score, edits feedback if needed\n'
             'Then clicks "Save Result"',
             color='#E8F5E9', edge='#2E7D32', fontsize=8.5)

    draw_arrow(ax, 7, 5.25, 7, 4.6)

    # Step 6: Database Storage
    draw_box(ax, 7, 4.0, 5, 0.9,
             'STEP 6: DATABASE STORAGE (SQLite + Prisma ORM)\n'
             'Save Grade record: scores, corrections,\n'
             'feedback, original image (Base64)',
             color='#E0F7FA', edge='#00838F', fontsize=8.5)

    draw_arrow(ax, 7, 3.55, 7, 2.8)

    # Step 7: Output
    draw_box(ax, 7, 2.2, 5, 0.9,
             'STEP 7: VISUALIZATION & REPORTS\n'
             'Student history view | Progress charts (Recharts)\n'
             'Class statistics | Error frequency analysis',
             color='#FCE4EC', edge='#AD1457', fontsize=8.5)

    # Legend
    ax.text(1, 1.2, 'LEGEND:', fontsize=9, fontweight='bold', fontfamily='DejaVu Sans')
    draw_box(ax, 2, 0.6, 1.5, 0.35, 'Process', color='#E3F2FD', edge='#1565C0', fontsize=7)
    draw_diamond(ax, 4.5, 0.6, 1.5, 0.35, 'Decision', color='#FFF9C4', edge='#F9A825')
    draw_box(ax, 7, 0.6, 1.5, 0.35, 'Error', color='#FFEBEE', edge='#C62828', fontsize=7)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'flowchart_1_tong_quan.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
