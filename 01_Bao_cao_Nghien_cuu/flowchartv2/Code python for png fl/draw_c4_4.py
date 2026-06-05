"""Chuong 4 - Hinh 4.4: Deployment Architecture (RPi4 + Cloudflare)"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os

def box(ax, x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fs=8, bold=False):
    p = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02",
                       facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(p)
    ax.text(x, y, text, ha='center', va='center', fontsize=fs,
            fontweight='bold' if bold else 'normal', fontfamily='DejaVu Sans')

def arr(ax, x1, y1, x2, y2, c='#455A64', style='<->'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=c, lw=1.5))

def main():
    fig, ax = plt.subplots(figsize=(18, 11))
    ax.set_xlim(0, 18); ax.set_ylim(0, 11); ax.axis('off')

    ax.text(9, 10.5, 'DEPLOYMENT ARCHITECTURE: Raspberry Pi 4 + Cloudflare Tunnel',
            ha='center', fontsize=14, fontweight='bold', color='#1565C0', fontfamily='DejaVu Sans')

    # ---- RPi4 Server (center) ----
    rect = FancyBboxPatch((5.5, 3.5), 7, 5.5, boxstyle="round,pad=0.1",
                          facecolor='#FFF8E1', edgecolor='#F57F17', linewidth=2.5)
    ax.add_patch(rect)
    ax.text(9, 8.7, 'RASPBERRY PI 4 (4GB RAM)', ha='center', fontsize=12,
            fontweight='bold', color='#F57F17', fontfamily='DejaVu Sans')

    box(ax, 9, 7.7, 4.5, 0.7, 'Next.js Production Server (:3000)\nvihand.service (systemd auto-start)',
        color='#E3F2FD', edge='#1565C0', fs=8.5, bold=True)
    box(ax, 7.5, 6.5, 3, 0.6, 'Prisma ORM\n+ SQLite DB', color='#E8F5E9', edge='#2E7D32', fs=8)
    box(ax, 10.8, 6.5, 2.5, 0.6, 'Jimp Image\nProcessor', color='#F3E5F5', edge='#7B1FA2', fs=8)
    box(ax, 9, 5.4, 4.5, 0.7, 'Node.js 20 LTS + npm\nSwap 2GB configured',
        color='#FFF3E0', edge='#E65100', fs=8)
    box(ax, 9, 4.3, 4, 0.6, '.env.local\nGEMINI_API_KEYS (4 keys)', color='#FCE4EC', edge='#AD1457', fs=8)

    # ---- School LAN (left) ----
    box(ax, 2.5, 7, 3.5, 1.5,
        'SCHOOL WiFi LAN\n\nTeachers (laptop/phone)\nStudents (phone)\n\nhttp://192.168.x.x:3000',
        color='#E8F5E9', edge='#2E7D32', fs=8, bold=True)
    arr(ax, 4.25, 7, 5.5, 7, c='#2E7D32', style='<->')
    ax.text(4.9, 7.4, 'LAN', fontsize=8, color='#2E7D32', fontweight='bold', fontfamily='DejaVu Sans')

    # ---- Cloudflare Tunnel (right) ----
    box(ax, 15.5, 7, 3.5, 1.5,
        'CLOUDFLARE TUNNEL\n\nhttps://vihandgrade.click\n\nHTTPS encryption\nNo port forwarding needed',
        color='#E3F2FD', edge='#1565C0', fs=8, bold=True)
    arr(ax, 12.5, 7, 13.75, 7, c='#1565C0', style='<->')
    ax.text(13.0, 7.4, 'Tunnel', fontsize=8, color='#1565C0', fontweight='bold', fontfamily='DejaVu Sans')

    # ---- Remote Users (far right) ----
    box(ax, 15.5, 4.5, 3.5, 1.2,
        'REMOTE USERS\n\nTeachers/Students at home\nAdmin (anywhere)\n4G / any WiFi',
        color='#FCE4EC', edge='#AD1457', fs=8)
    arr(ax, 15.5, 5.1, 15.5, 6.25, c='#AD1457', style='<->')

    # ---- Google Cloud (top) ----
    box(ax, 9, 1.5, 5, 1.2,
        'GOOGLE CLOUD (API)\n\nGemini 3 Flash Preview\nAPI Key Rotation (4 keys)\ngenerativelanguage.googleapis.com',
        color='#FFF9C4', edge='#F9A825', fs=8.5, bold=True)
    arr(ax, 9, 3.5, 9, 2.1, c='#F9A825', style='<->')
    ax.text(9.5, 2.8, 'HTTPS API', fontsize=8, color='#F9A825', fontweight='bold', fontfamily='DejaVu Sans')

    # Scripts
    box(ax, 2.5, 4.5, 3.5, 1.2,
        'DEPLOYMENT SCRIPTS\n\nsetup_rpi.sh\nsetup_network.sh\nupdate_keys.sh',
        color='#EFEBE9', edge='#5D4037', fs=8)
    arr(ax, 4.25, 4.5, 5.5, 4.5, c='#5D4037', style='->')

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'chuong4_4_trien_khai.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
