"""Chuong 4 - Hinh 4.2: API Grade Flow with Key Rotation"""
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
    ax.text(x, y, text, ha='center', va='center', fontsize=7.5, fontfamily='DejaVu Sans')

def arr(ax, x1, y1, x2, y2, c='#455A64'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=c, lw=1.5))

def main():
    fig, ax = plt.subplots(figsize=(14, 18))
    ax.set_xlim(0, 14); ax.set_ylim(0, 18); ax.axis('off')

    ax.text(7, 17.4, 'API GRADE FLOW: POST /api/grade', ha='center',
            fontsize=14, fontweight='bold', color='#E65100', fontfamily='DejaVu Sans')
    ax.text(7, 17.0, 'With API Key Rotation & Fault Tolerance', ha='center',
            fontsize=10, color='#546E7A', fontfamily='DejaVu Sans')

    # Client request
    box(ax, 7, 16.2, 5, 0.7, 'CLIENT: POST /api/grade\nBody: { image (Base64), studentName, title, className }',
        color='#E0F7FA', edge='#00838F', fs=9, bold=True)
    arr(ax, 7, 15.85, 7, 15.3)

    # Step 1: Preprocess
    box(ax, 7, 14.8, 5, 0.7, 'STEP 1: preprocessImage(base64)\n10-step Jimp pipeline → processedBase64 + QualityReport',
        color='#E3F2FD', edge='#1565C0', fs=8.5)
    arr(ax, 7, 14.45, 7, 13.8)

    # Quality check
    diamond(ax, 7, 13.2, 3.5, 0.8, 'Quality OK?')
    arr(ax, 9, 13.2, 11, 13.2, c='#C62828')
    box(ax, 12, 13.2, 2, 0.5, 'Return\nwarning', color='#FFEBEE', edge='#C62828', fs=7)
    ax.text(9.2, 13.4, 'FAIL', fontsize=7, color='#C62828', fontfamily='DejaVu Sans')
    ax.text(7.3, 12.7, 'PASS', fontsize=7, color='#2E7D32', fontfamily='DejaVu Sans')
    arr(ax, 7, 12.8, 7, 12.2)

    # Step 2: Build payload
    box(ax, 7, 11.7, 5, 0.7, 'STEP 2: Build Gemini Payload\nGRADING_PROMPT + processedBase64 + generationConfig',
        color='#E8EAF6', edge='#283593', fs=8.5)
    arr(ax, 7, 11.35, 7, 10.7)

    # Step 3: getApiKeys
    box(ax, 7, 10.2, 5, 0.7, 'STEP 3: getApiKeys()\nRead GEMINI_API_KEYS from .env.local → split by comma',
        color='#FFF3E0', edge='#E65100', fs=8.5, bold=True)
    arr(ax, 7, 9.85, 7, 9.2)

    # Step 4: Key rotation loop
    box(ax, 7, 8.7, 5.5, 0.8,
        'STEP 4: callGeminiWithKeyRotation(keys, body)\nShuffle keys randomly → iterate through pool',
        color='#FFF3E0', edge='#E65100', fs=8.5, bold=True)
    arr(ax, 7, 8.3, 7, 7.7)

    # Try key[i]
    box(ax, 7, 7.2, 4, 0.6, 'Try key[i]: POST /generateContent',
        color='#FCE4EC', edge='#AD1457', fs=8.5)
    arr(ax, 7, 6.9, 7, 6.3)

    # 503/429?
    diamond(ax, 7, 5.7, 3.5, 0.8, 'Status\n503 or 429?')
    arr(ax, 9, 5.7, 11, 5.7)
    ax.text(9.2, 5.9, 'YES', fontsize=7, color='#E65100', fontfamily='DejaVu Sans')

    # Retry logic
    box(ax, 12, 5.7, 2.2, 0.6, 'Backoff 1.5s\n→ retry once\n→ next key', color='#FFF3E0', edge='#E65100', fs=7)
    arr(ax, 12, 6.0, 12, 7.2)
    arr(ax, 12, 7.2, 9, 7.2, c='#E65100')

    ax.text(7.3, 5.2, 'NO (200 OK)', fontsize=7, color='#2E7D32', fontfamily='DejaVu Sans')
    arr(ax, 7, 5.3, 7, 4.7)

    # Parse JSON
    box(ax, 7, 4.2, 5, 0.7, 'STEP 5: Parse JSON Response\nStrip markdown → JSON.parse() → validate fields',
        color='#E0F7FA', edge='#00838F', fs=8.5)
    arr(ax, 7, 3.85, 7, 3.2)

    # Return result
    box(ax, 7, 2.7, 5, 0.7, 'STEP 6: Return Result to Client\n{ score, corrections, feedback, qualityReport, processingTime }',
        color='#E8F5E9', edge='#2E7D32', fs=8.5, bold=True)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'chuong4_2_api_grade_flow.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
