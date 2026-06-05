"""Flowchart 4: RBAC - Phan quyen va kiem soat truy cap (Hinh 3.4)"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

def box(ax, x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fs=8, bold=False):
    p = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02",
                       facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(p)
    ax.text(x, y, text, ha='center', va='center', fontsize=fs,
            fontweight='bold' if bold else 'normal', fontfamily='DejaVu Sans')

def diamond(ax, x, y, w, h, text, color='#FFF9C4', edge='#F9A825'):
    d = plt.Polygon([(x, y+h/2), (x+w/2, y), (x, y-h/2), (x-w/2, y)],
                    facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(d)
    ax.text(x, y, text, ha='center', va='center', fontsize=8, fontfamily='DejaVu Sans')

def arr(ax, x1, y1, x2, y2, c='#455A64'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=c, lw=1.5))

def main():
    fig, ax = plt.subplots(figsize=(16, 14))
    ax.set_xlim(0, 16); ax.set_ylim(0, 14); ax.axis('off')

    ax.text(8, 13.5, 'FLOWCHART 4: AUTHENTICATION & RBAC FLOW', ha='center',
            fontsize=14, fontweight='bold', color='#1565C0', fontfamily='DejaVu Sans')
    ax.text(8, 13.1, 'Role-Based Access Control: Admin | Teacher | Student', ha='center',
            fontsize=10, color='#546E7A', fontfamily='DejaVu Sans')

    # Login
    box(ax, 8, 12.2, 4.5, 0.7, 'LOGIN PAGE (/)\nEnter username + password',
        color='#E0F7FA', edge='#00838F', fs=10, bold=True)
    arr(ax, 8, 11.85, 8, 11.3)

    # Auth API
    box(ax, 8, 10.8, 4.5, 0.7, 'POST /api/auth\nVerify credentials against User table',
        color='#E3F2FD', edge='#1565C0', fs=9)
    arr(ax, 8, 10.45, 8, 9.9)

    # Check valid
    diamond(ax, 8, 9.3, 3.5, 0.9, 'Credentials\nValid?')
    arr(ax, 10, 9.3, 13, 9.3, c='#C62828')
    box(ax, 14, 9.3, 2, 0.6, 'ERROR\nInvalid login', color='#FFEBEE', edge='#C62828', fs=8)
    ax.text(10.3, 9.5, 'NO', fontsize=8, color='#C62828', fontfamily='DejaVu Sans')
    ax.text(8.3, 8.7, 'YES', fontsize=8, color='#2E7D32', fontfamily='DejaVu Sans')
    arr(ax, 8, 8.85, 8, 8.2)

    # Role check
    diamond(ax, 8, 7.6, 4, 1.0, 'Check user.role\n"admin" | "teacher"\n| "student"')

    # Admin branch
    arr(ax, 6, 7.6, 3, 7.6)
    ax.text(5.7, 7.9, 'admin', fontsize=8, color='#7B1FA2', fontweight='bold', fontfamily='DejaVu Sans')
    box(ax, 3, 6.3, 3.8, 1.8,
        'ADMIN INTERFACE\n/admin\n\nDashboard\nUser Management\nClass Management\nStatistics\nSystem Monitor\nSettings',
        color='#F3E5F5', edge='#7B1FA2', fs=7.5, bold=True)

    # Teacher branch
    arr(ax, 8, 7.1, 8, 6.3)
    ax.text(8.3, 6.9, 'teacher', fontsize=8, color='#1565C0', fontweight='bold', fontfamily='DejaVu Sans')
    box(ax, 8, 5.2, 3.8, 1.8,
        'TEACHER INTERFACE\n/teacher\n\nAI Grading Dashboard\nGrade Detail Page\nClass Reports\nStudent List\nProgress Charts',
        color='#E3F2FD', edge='#1565C0', fs=7.5, bold=True)

    # Student branch
    arr(ax, 10, 7.6, 13, 7.6)
    ax.text(10.3, 7.9, 'student', fontsize=8, color='#2E7D32', fontweight='bold', fontfamily='DejaVu Sans')
    box(ax, 13, 6.3, 3.8, 1.8,
        'STUDENT INTERFACE\n/student\n\nScore Overview\nGrading History\nProgress Charts\nBadges & Awards\n(Read-Only)',
        color='#E8F5E9', edge='#2E7D32', fs=7.5, bold=True)

    # Data isolation boxes
    box(ax, 3, 3.8, 3.5, 0.8,
        'FULL ACCESS\nAll users, classes,\ngrades, system config',
        color='#EDE7F6', edge='#7B1FA2', fs=7.5)
    arr(ax, 3, 5.4, 3, 4.2)

    box(ax, 8, 3.8, 3.5, 0.8,
        'SCOPED ACCESS\nOwn classes only\nGrade + save results',
        color='#BBDEFB', edge='#1565C0', fs=7.5)
    arr(ax, 8, 4.3, 8, 4.2)

    box(ax, 13, 3.8, 3.5, 0.8,
        'READ-ONLY\nOwn grades only\nNo edit permissions',
        color='#C8E6C9', edge='#2E7D32', fs=7.5)
    arr(ax, 13, 5.4, 13, 4.2)

    # Database
    box(ax, 8, 2.3, 6, 0.7, 'SQLite DATABASE (Prisma ORM)\nUser | Class | Grade tables',
        color='#FFF3E0', edge='#E65100', fs=9, bold=True)
    arr(ax, 3, 3.4, 6, 2.6)
    arr(ax, 8, 3.4, 8, 2.7)
    arr(ax, 13, 3.4, 10, 2.6)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'flowchart_4_phan_quyen.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
