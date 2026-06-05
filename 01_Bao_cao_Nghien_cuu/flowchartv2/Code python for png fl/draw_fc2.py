"""Flowchart 2: Pipeline tien xu ly anh 10 buoc (Hinh 3.2)"""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import os

def draw_box(ax, x, y, w, h, text, color='#E3F2FD', edge='#1565C0', fs=8, bold=False):
    box = FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.02",
                         facecolor=color, edgecolor=edge, linewidth=1.5)
    ax.add_patch(box)
    ax.text(x, y, text, ha='center', va='center', fontsize=fs,
            fontweight='bold' if bold else 'normal', fontfamily='DejaVu Sans')

def arrow(ax, x1, y1, x2, y2, c='#455A64'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=c, lw=1.5))

def main():
    fig, ax = plt.subplots(figsize=(16, 14))
    ax.set_xlim(0, 16); ax.set_ylim(0, 14); ax.axis('off')

    ax.text(8, 13.5, 'FLOWCHART 2: IMAGE PREPROCESSING PIPELINE (10 Steps)',
            ha='center', fontsize=14, fontweight='bold', color='#1565C0', fontfamily='DejaVu Sans')
    ax.text(8, 13.1, 'Jimp TypeScript - Optimized for Vietnamese grid paper', ha='center',
            fontsize=10, color='#546E7A', fontfamily='DejaVu Sans')

    # Input
    draw_box(ax, 8, 12.4, 4, 0.6, 'INPUT: Raw photo from smartphone\n(JPEG/PNG, variable quality)', 
             color='#E8F5E9', edge='#2E7D32', fs=9, bold=True)
    arrow(ax, 8, 12.1, 8, 11.7)

    steps = [
        ('1. EXIF Auto-Rotate', 'Fix orientation from phone metadata', '#E3F2FD', '#1565C0'),
        ('2. Resize (max 1600px)', 'Reduce size, preserve aspect ratio', '#E3F2FD', '#1565C0'),
        ('3. White Balance (Gray World)', 'Remove color cast (yellow/blue tint)', '#E8EAF6', '#283593'),
        ('4. Grayscale Conversion', 'Y = 0.299R + 0.587G + 0.114B', '#E8EAF6', '#283593'),
        ('5. Shadow Removal', 'Background normalization (Box Blur k=51)', '#FFF3E0', '#E65100'),
        ('6. Grid Line Removal', 'Run-Length analysis + Otsu threshold', '#FFF3E0', '#E65100'),
        ('7. CLAHE', 'Local histogram eq. (8x8 tiles, clip=2.0)', '#F3E5F5', '#7B1FA2'),
        ('8. Unsharp Mask', 'Sharpen strokes (alpha=0.5)', '#F3E5F5', '#7B1FA2'),
        ('9. Quality Assessment', 'Blur score, brightness, dark pixel ratio', '#FFF9C4', '#F9A825'),
        ('10. Adaptive Threshold', 'Gaussian local mean (block=31, C=5)', '#FCE4EC', '#AD1457'),
    ]

    y = 11.3
    for i, (title, desc, col, edge) in enumerate(steps):
        num = f'{title}\n{desc}'
        draw_box(ax, 8, y, 6, 0.7, num, color=col, edge=edge, fs=8)
        if i < len(steps) - 1:
            arrow(ax, 8, y - 0.35, 8, y - 0.75)
        y -= 1.1

    # Output
    arrow(ax, 8, y + 0.75, 8, y + 0.35)
    draw_box(ax, 8, y, 4, 0.6, 'OUTPUT: Binary image (B&W)\n+ QualityReport JSON',
             color='#E8F5E9', edge='#2E7D32', fs=9, bold=True)

    # Side annotations
    ax.annotate('Color\nProcessing', xy=(4.5, 10.0), fontsize=8, ha='center',
                color='#283593', fontweight='bold', fontfamily='DejaVu Sans',
                bbox=dict(boxstyle='round', fc='#E8EAF6', ec='#283593', alpha=0.7))
    ax.annotate('Noise\nRemoval', xy=(4.5, 7.8), fontsize=8, ha='center',
                color='#E65100', fontweight='bold', fontfamily='DejaVu Sans',
                bbox=dict(boxstyle='round', fc='#FFF3E0', ec='#E65100', alpha=0.7))
    ax.annotate('Enhancement\n& Output', xy=(4.5, 5.6), fontsize=8, ha='center',
                color='#7B1FA2', fontweight='bold', fontfamily='DejaVu Sans',
                bbox=dict(boxstyle='round', fc='#F3E5F5', ec='#7B1FA2', alpha=0.7))

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'flowchart_2_tien_xu_ly.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
