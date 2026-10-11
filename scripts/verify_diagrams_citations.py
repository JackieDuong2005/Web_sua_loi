import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

DOC1_PATH = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md"
DOC2_PATH = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md"

def extract_code_blocks(filepath, lang="mermaid"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    pattern = rf"```{lang}(.*?)```"
    return re.findall(pattern, content, re.DOTALL)

def inspect_mermaid():
    print("=== INSPECTING MERMAID DIAGRAMS ===")
    m1 = extract_code_blocks(DOC1_PATH, "mermaid")
    m2 = extract_code_blocks(DOC2_PATH, "mermaid")
    
    print(f"Doc 1 has {len(m1)} Mermaid blocks")
    for idx, block in enumerate(m1, 1):
        print(f"\n--- Doc 1 Diagram {idx} ---")
        lines = block.strip().splitlines()
        print(f"Type/Header: {lines[0]}")
        print(f"Line count: {len(lines)}")
        # Check potential syntax issues in mermaid:
        # e.g., unbalanced quotes, unescaped brackets in labels, illegal node IDs with spaces or hyphens without quotes, etc.
        for line_no, l in enumerate(lines, 1):
            # check quotes balance
            quotes = l.count('"')
            if quotes % 2 != 0:
                print(f"  [WARNING] Unbalanced quotes at line {line_no}: {l}")
            # check invalid characters outside quotes
            # e.g. parentheses inside node brackets without quotes: [Text (note)] can break if not ["Text (note)"]
            if "[" in l and "]" in l:
                label_match = re.search(r'\[(.*?)\]', l)
                if label_match:
                    label = label_match.group(1)
                    if ("(" in label or ")" in label or "{" in label or "}" in label) and not (label.startswith('"') and label.endswith('"')):
                        print(f"  [POTENTIAL SYNTAX RISK] Brackets/parens in unquoted label at line {line_no}: {l}")

    print(f"\nDoc 2 has {len(m2)} Mermaid blocks")
    for idx, block in enumerate(m2, 1):
        print(f"\n--- Doc 2 Diagram {idx} ---")
        lines = block.strip().splitlines()
        print(f"Type/Header: {lines[0]}")
        print(f"Line count: {len(lines)}")
        for line_no, l in enumerate(lines, 1):
            quotes = l.count('"')
            if quotes % 2 != 0:
                print(f"  [WARNING] Unbalanced quotes at line {line_no}: {l}")

if __name__ == "__main__":
    inspect_mermaid()
