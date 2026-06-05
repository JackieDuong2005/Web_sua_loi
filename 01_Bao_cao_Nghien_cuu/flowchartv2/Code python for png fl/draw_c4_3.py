"""Chuong 4 - Hinh 4.3: UI Navigation Map (3 roles)"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

def box(ax, x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fs=8, bold=False):
    p = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02",
                       facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(p)
    ax.text(x, y, text, ha='center', va='center', fontsize=fs,
            fontweight='bold' if bold else 'normal', fontfamily='DejaVu Sans')

def arr(ax, x1, y1, x2, y2, c='#455A64'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=c, lw=1.3))

def main():
    fig, ax = plt.subplots(figsize=(18, 12))
    ax.set_xlim(0, 18); ax.set_ylim(0, 12); ax.axis('off')

    ax.text(9, 11.5, 'UI NAVIGATION MAP (3 User Roles)', ha='center',
            fontsize=14, fontweight='bold', color='#1565C0', fontfamily='DejaVu Sans')

    # Login page
    box(ax, 9, 10.3, 3.5, 0.7, 'LOGIN PAGE  /\nUsername + Password', color='#E0F7FA', edge='#00838F', fs=10, bold=True)

    # Three branches
    arr(ax, 7.25, 9.95, 3.5, 9.0)
    arr(ax, 9, 9.95, 9, 9.0)
    arr(ax, 10.75, 9.95, 14.5, 9.0)

    ax.text(4.5, 9.6, 'role = admin', fontsize=8, color='#7B1FA2', fontweight='bold', fontfamily='DejaVu Sans')
    ax.text(9.3, 9.5, 'role = teacher', fontsize=8, color='#1565C0', fontweight='bold', fontfamily='DejaVu Sans')
    ax.text(13, 9.6, 'role = student', fontsize=8, color='#2E7D32', fontweight='bold', fontfamily='DejaVu Sans')

    # ADMIN pages
    admin_pages = [
        ('Dashboard\n/admin', 8.3),
        ('User Mgmt\n/admin/users', 7.2),
        ('Class Mgmt\n/admin/classes', 6.1),
        ('Statistics\n/admin/statistics', 5.0),
        ('Settings\n/admin/settings', 3.9),
        ('System Monitor\n/admin/system', 2.8),
    ]
    for text, y in admin_pages:
        box(ax, 3.5, y, 3, 0.7, text, color='#F3E5F5', edge='#7B1FA2', fs=8)
    for i in range(len(admin_pages)-1):
        arr(ax, 3.5, admin_pages[i][1]-0.35, 3.5, admin_pages[i+1][1]+0.35, c='#7B1FA2')

    # TEACHER pages
    teacher_pages = [
        ('Dashboard\n/teacher', 8.3),
        ('Grade Detail\n/teacher/grade', 7.0),
        ('Class Reports\n/teacher/reports', 5.7),
    ]
    for text, y in teacher_pages:
        box(ax, 9, y, 3, 0.7, text, color='#E3F2FD', edge='#1565C0', fs=8)
    for i in range(len(teacher_pages)-1):
        arr(ax, 9, teacher_pages[i][1]-0.35, 9, teacher_pages[i+1][1]+0.35, c='#1565C0')

    # Sub-features for teacher
    box(ax, 9, 4.2, 3.5, 1.0,
        'AI Grading Features:\n- Upload image / text\n- Quality report\n- 4-criteria scoring\n- Save to DB',
        color='#BBDEFB', edge='#1565C0', fs=7)
    arr(ax, 9, 5.35, 9, 4.7, c='#1565C0')

    # STUDENT pages
    student_pages = [
        ('Overview\n/student', 8.3),
        ('History\n/student/history', 7.0),
    ]
    for text, y in student_pages:
        box(ax, 14.5, y, 3, 0.7, text, color='#E8F5E9', edge='#2E7D32', fs=8)
    arr(ax, 14.5, 7.95, 14.5, 7.35, c='#2E7D32')

    box(ax, 14.5, 5.7, 3.5, 1.0,
        'Student Features:\n- Score overview + badges\n- Detailed grade view\n- Progress charts\n- READ-ONLY',
        color='#C8E6C9', edge='#2E7D32', fs=7)
    arr(ax, 14.5, 6.65, 14.5, 6.2, c='#2E7D32')

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'chuong4_3_ui_navigation.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
