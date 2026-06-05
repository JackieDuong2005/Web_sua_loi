"""Flowchart 3: AI Grading Pipeline (Hinh 3.3)"""
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

    ax.text(7, 17.4, 'FLOWCHART 3: AI GRADING PIPELINE', ha='center',
            fontsize=14, fontweight='bold', color='#7B1FA2', fontfamily='DejaVu Sans')
    ax.text(7, 17.0, 'Google Gemini 3 Flash + API Key Rotation', ha='center',
            fontsize=10, color='#546E7A', fontfamily='DejaVu Sans')

    # Step 1
    box(ax, 7, 16.2, 5, 0.7, 'Step 1: IMAGE PREPROCESSING\n10-step Jimp pipeline → Binary B&W image',
        color='#E3F2FD', edge='#1565C0', fs=9, bold=True)
    arr(ax, 7, 15.85, 7, 15.3)

    # Step 2
    box(ax, 7, 14.8, 5, 0.7, 'Step 2: BASE64 ENCODING\nConvert binary image → Base64 string + MIME type',
        color='#E8EAF6', edge='#283593', fs=9)
    arr(ax, 7, 14.45, 7, 13.9)

    # Step 3
    box(ax, 7, 13.3, 5.5, 1.0,
        'Step 3: BUILD PROMPT PAYLOAD\n(a) Role: Vietnamese primary school teacher\n'
        '(b) Rubric: 4 criteria (Spelling/Form/Content/Creative)\n'
        '(c) JSON Schema: forced structured output',
        color='#F3E5F5', edge='#7B1FA2', fs=8.5)
    arr(ax, 7, 12.8, 7, 12.2)

    # Step 4 - Key Rotation
    box(ax, 7, 11.6, 5.5, 0.9,
        'Step 4: API KEY ROTATION & CALL\nShuffle key pool → Try key[i] → POST /generateContent\n'
        'If 503/429: backoff 1.5s → retry → next key',
        color='#FFF3E0', edge='#E65100', fs=8.5, bold=True)
    arr(ax, 7, 11.15, 7, 10.5)

    # Step 5 - Check response
    diamond(ax, 7, 9.9, 4, 0.9, 'HTTP Status == 200?\n(API response OK)')
    arr(ax, 9, 9.9, 11.5, 9.9, c='#C62828')
    box(ax, 12.5, 9.9, 2.2, 0.6, 'ERROR\nLog error +\nReturn message', color='#FFEBEE', edge='#C62828', fs=7)
    ax.text(9.3, 10.1, 'NO', fontsize=7, color='#C62828', fontfamily='DejaVu Sans')
    ax.text(7.3, 9.35, 'YES', fontsize=7, color='#2E7D32', fontfamily='DejaVu Sans')
    arr(ax, 7, 9.45, 7, 8.8)

    # Step 6 - Parse JSON
    box(ax, 7, 8.3, 5, 0.7, 'Step 6: PARSE JSON RESPONSE\nStrip markdown fences → JSON.parse()',
        color='#E0F7FA', edge='#00838F', fs=9)
    arr(ax, 7, 7.95, 7, 7.3)

    # Step 7 - Validate
    diamond(ax, 7, 6.7, 3.5, 0.8, 'JSON Valid?\n(all required fields)')
    arr(ax, 9, 6.7, 11.5, 6.7, c='#C62828')
    box(ax, 12.5, 6.7, 2.2, 0.6, 'PARSE ERROR\nReturn raw text\nfor debugging', color='#FFEBEE', edge='#C62828', fs=7)
    ax.text(9.3, 6.9, 'NO', fontsize=7, color='#C62828', fontfamily='DejaVu Sans')
    ax.text(7.3, 6.2, 'YES', fontsize=7, color='#2E7D32', fontfamily='DejaVu Sans')
    arr(ax, 7, 6.3, 7, 5.6)

    # Step 8 - Display + Save
    box(ax, 7, 5.0, 5.5, 0.9,
        'Step 8: DISPLAY RESULTS & SAVE TO SQLite\nShow 4 criteria scores + error list + feedback\n'
        'Teacher reviews → edits → saves to Grade table',
        color='#E8F5E9', edge='#2E7D32', fs=8.5, bold=True)
    arr(ax, 7, 4.55, 7, 3.9)

    # Student view
    box(ax, 7, 3.4, 4.5, 0.7, 'STUDENT VIEW\nHistory page + progress charts + badges',
        color='#FCE4EC', edge='#AD1457', fs=9)

    plt.tight_layout()
    out = os.path.join(os.path.dirname(__file__), 'flowchart_3_cham_diem_ai.png')
    fig.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
    print(f'Saved: {out}')
    plt.close()

if __name__ == '__main__':
    main()
