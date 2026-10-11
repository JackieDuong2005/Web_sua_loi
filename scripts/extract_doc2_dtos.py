import sys
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

DOC2 = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md"

with open(DOC2, "r", encoding="utf-8") as f:
    text = f.read()

# find all json code blocks and the preceding section heading
sections = re.split(r'\n(?=###?\s+)', text)
print(f"Total sections: {len(sections)}")

for sec in sections:
    header_match = re.match(r'###?\s+([^\n]+)', sec)
    if not header_match:
        continue
    header = header_match.group(1).strip()
    json_blocks = re.findall(r'```json(.*?)```', sec, re.DOTALL)
    if json_blocks:
        print(f"\n==========================================")
        print(f"SECTION: {header}")
        print(f"JSON Blocks count: {len(json_blocks)}")
        for idx, jb in enumerate(json_blocks, 1):
            print(f"--- Block {idx} ---")
            snippet = jb.strip()
            print(snippet[:300] + ("..." if len(snippet) > 300 else ""))
            # validate if it is valid json
            try:
                parsed = json.loads(snippet)
                print(f"  [JSON VALIDATION]: VALID JSON ({type(parsed).__name__})")
            except Exception as e:
                print(f"  [JSON VALIDATION]: INVALID JSON -> {e}")
