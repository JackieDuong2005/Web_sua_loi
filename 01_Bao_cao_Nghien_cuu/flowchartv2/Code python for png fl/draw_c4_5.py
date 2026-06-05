"""Chuong 4 - Hinh 4.5: Quy trinh phat trien he thong (9 giai doan)"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import os, math

def box(ax, x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fs=8, bold=False):
    p = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02",
                       facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(p)
    ax.text(x, y, text, ha='center', va='center', fontsize=fs,
            fontweight='bold' if bold else 'normal', fontfamily='DejaVu Sans')

def arr(ax, x1, y1, x2, y2, c='#455A64'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=c, lw=1.5))

def main():
    fig, ax = plt.subplots(figsize=(18, 12))
    ax.set_xlim(0, 18); ax.set_ylim(0, 12); ax.axis('off')

    ax.text(9, 11.5, 'DEVELOPMENT LIFECYCLE: 9-Phase Process',
            ha='center', fontsize=14, fontweight='bold', color='#1565C0', fontfamily='DejaVu Sans')

    colors = [
        ('#E8F5E9', '#2E7D32'), ('#E3F2FD', '#1565C0'), ('#FFF3E0', '#E65100'),
        ('#F3E5F5', '#7B1FA2'), ('#FCE4EC', '#AD1457'), ('#FFF9C4', '#F9A825'),
        ('#E0F7FA', '#00838F'), ('#E8EAF6', '#283593'), ('#EFEBE9', '#5D4037'),
    ]

    phases = [
        '1. DATA\nCOLLECTION\n\nReal handwriting\nsamples from\nprimary schools',
        '2. DATA\nEXPLORATION\n\nAnalyze error types,\ngrid paper features,\npen/pencil strokes',
        '3. IMAGE\nPREPROCESSING\n\n10-step Jimp pipeline\nGrid removal, CLAHE\nAdaptive threshold',
        '4. MODEL &\nPROMPT DESIGN\n\nGemini 3 Flash\n4-criteria rubric\nJSON Schema output',
        '5. TRAINING &\nTESTING\n\n27 test samples\nOCR accuracy check\nScore validation',
        '6. MODEL\nREFINEMENT\n\nTune C=5, block=31\nTemperature=0.1\n96.3% JSON valid',
        '7. INTEGRATION\nTESTING\n\nEnd-to-End test\nRBAC verification\nData isolation check',
        '8. DEPLOYMENT\n\nRaspberry Pi 4\nCloudflare Tunnel\nsystemd auto-start',
        '9. MONITORING\n& MAINTENANCE\n\nCPU/RAM tracking\nAPI cost monitoring\nTeacher feedback',
    ]

    # Layout: 3 rows x 3 columns
    positions = [
        (3, 9.5), (9, 9.5), (15, 9.5),
        (3, 6.5), (9, 6.5), (15, 6.5),
        (3, 3.5), (9, 3.5), (15, 3.5),
    ]

    for i, (text, (x, y)) in enumerate(zip(phases, positions)):
        col, edg = colors[i]
        box(ax, x, y, 4, 2, text, color=col, edge=edg, fs=7.5, bold=True)

    # Arrows: left to right in each row, then down at end of row
    for row in range(3):
        base = row * 3
        if base + 1 < 9:
            arr(ax, positions[base][0]+2, positions[base][1],
                positions[base+1][0]-2, positions[base+1][1])
        if base + 2 < 9:
            arr(ax, positions[base+1][0]+2, positions[base+1][1],
                positions[base+2][0]-2, positions[base+2][1])

    # Down arrows between rows
    arr(ax, 15, 8.5, 15, 7.5)  # row 1 → row 2 (right side)
    arr(ax, 3, 8.5, 3, 7.5)    # continue left
    arr(ax, 15, 5.5, 15, 4.5)  # row 2 → row 3

    # Connect row ends
    arr(ax, 15, 8.5, 15, 7.5)

    ax.text(9, 1.5, 'Iterative cycle: Phases 5-6 may repeat until quality targets are met',
            ha='center', fontsize=9, color='#9E9E9E', fontstyle='italic', fontfamily='DejaVu Sans')

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'chuong4_5_quy_trinh_phat_trien.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
