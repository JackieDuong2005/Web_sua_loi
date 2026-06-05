"""Chuong 4 - Hinh 4.1: So do CSDL Entity-Relationship"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

def box(ax, x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fs=8, bold=False):
    p = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02",
                       facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(p)
    ax.text(x, y, text, ha='center', va='center', fontsize=fs,
            fontweight='bold' if bold else 'normal', fontfamily='DejaVu Sans')

def arr(ax, x1, y1, x2, y2, c='#455A64', style='->'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=c, lw=1.5, linestyle='dashed'))

def main():
    fig, ax = plt.subplots(figsize=(16, 12))
    ax.set_xlim(0, 16); ax.set_ylim(0, 12); ax.axis('off')

    ax.text(8, 11.5, 'ER DIAGRAM: DATABASE SCHEMA (3 Models)', ha='center',
            fontsize=14, fontweight='bold', color='#1565C0', fontfamily='DejaVu Sans')

    # Model User
    user_text = (
        'MODEL: User\n'
        '─────────────────────\n'
        'id        String  PK (cuid)\n'
        'name      String\n'
        'username  String  UNIQUE\n'
        'password  String  (default: 123456)\n'
        'role      String  (admin|teacher|student)\n'
        'className String  (student class)\n'
        'active    Boolean (default: true)\n'
        'createdAt DateTime'
    )
    box(ax, 3.5, 7.5, 5, 3.5, user_text, color='#E3F2FD', edge='#1565C0', fs=8.5, bold=False)
    ax.text(3.5, 9.5, 'User', fontsize=12, fontweight='bold', color='#1565C0',
            ha='center', fontfamily='DejaVu Sans')

    # Model Class
    class_text = (
        'MODEL: Class\n'
        '─────────────────────\n'
        'id        String  PK (cuid)\n'
        'name      String  UNIQUE\n'
        'grade     Int     (1-5)\n'
        'teacherId String  (FK → User.id)\n'
        'createdAt DateTime'
    )
    box(ax, 12.5, 7.5, 5, 3, class_text, color='#F3E5F5', edge='#7B1FA2', fs=8.5)
    ax.text(12.5, 9.2, 'Class', fontsize=12, fontweight='bold', color='#7B1FA2',
            ha='center', fontfamily='DejaVu Sans')

    # Model Grade
    grade_text = (
        'MODEL: Grade\n'
        '─────────────────────────\n'
        'id              String  PK (cuid)\n'
        'studentName     String\n'
        'assignmentTitle String\n'
        'className       String\n'
        'originalText    String (OCR result)\n'
        'fixedText       String (corrected)\n'
        'corrections     String (JSON array)\n'
        'score / scoreNum  String / Float\n'
        'scoreBreakdown  String (JSON)\n'
        'feedback        String\n'
        'overallRating   String\n'
        'processingTimeMs Int\n'
        'tokenCount      Int\n'
        'imageBase64     String\n'
        'createdAt       DateTime'
    )
    box(ax, 8, 2.5, 6.5, 4.5, grade_text, color='#E8F5E9', edge='#2E7D32', fs=8)
    ax.text(8, 5.0, 'Grade', fontsize=12, fontweight='bold', color='#2E7D32',
            ha='center', fontfamily='DejaVu Sans')

    # Relationships
    arr(ax, 6, 7.5, 10, 7.5, c='#7B1FA2')
    ax.text(8, 7.8, 'Class.teacherId → User.id', fontsize=8, ha='center',
            color='#7B1FA2', fontfamily='DejaVu Sans', fontstyle='italic')
    ax.text(8, 7.3, '(Teacher manages Class)', fontsize=7, ha='center',
            color='#9E9E9E', fontfamily='DejaVu Sans')

    arr(ax, 3.5, 5.75, 5.5, 4.5, c='#2E7D32')
    ax.text(3.5, 5.0, 'User.className\n→ Class.name', fontsize=7.5, ha='center',
            color='#2E7D32', fontfamily='DejaVu Sans', fontstyle='italic')

    arr(ax, 12.5, 6.0, 10.5, 4.5, c='#E65100')
    ax.text(12.5, 5.0, 'Grade.className\n→ Class.name', fontsize=7.5, ha='center',
            color='#E65100', fontfamily='DejaVu Sans', fontstyle='italic')

    ax.text(8, 0.5, 'Note: SQLite does not enforce FK constraints by default.\n'
            'Logical relationships are maintained at application level (Prisma ORM).',
            fontsize=8, ha='center', color='#9E9E9E', fontfamily='DejaVu Sans', fontstyle='italic')

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'chuong4_1_so_do_csdl.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
