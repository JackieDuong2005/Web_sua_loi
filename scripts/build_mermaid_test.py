import re
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

DOC1_PATH = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md"
DOC2_PATH = r"01_Bao_cao_Nghien_cuu\Tai_lieu_Bao_cao\03_Dac_Ta_Kien_Truc_He_Thong\02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md"

def extract_code_blocks(filepath, lang="mermaid"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    pattern = rf"```{lang}(.*?)```"
    return [b.strip() for b in re.findall(pattern, content, re.DOTALL)]

m1 = extract_code_blocks(DOC1_PATH, "mermaid")
m2 = extract_code_blocks(DOC2_PATH, "mermaid")

diagrams = []
for i, d in enumerate(m1, 1):
    diagrams.append({"doc": "Doc 1", "index": i, "code": d})
for i, d in enumerate(m2, 1):
    diagrams.append({"doc": "Doc 2", "index": i, "code": d})

html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Mermaid Empirical Test</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
    <h1>Mermaid Parsing Empirical Verification</h1>
    <div id="results"></div>
    <script>
        const diagrams = {json.dumps(diagrams, ensure_ascii=False)};
        mermaid.initialize({{ startOnLoad: false, securityLevel: 'loose' }});

        async function testAll() {{
            const results = [];
            for (let i = 0; i < diagrams.length; i++) {{
                const item = diagrams[i];
                try {{
                    const parseResult = await mermaid.parse(item.code);
                    results.push({{
                        doc: item.doc,
                        index: item.index,
                        status: 'PASS',
                        error: null
                    }});
                }} catch (err) {{
                    results.push({{
                        doc: item.doc,
                        index: item.index,
                        status: 'FAIL',
                        error: err.message || String(err)
                    }});
                }}
            }}
            window.__TEST_RESULTS__ = results;
            document.getElementById('results').textContent = JSON.stringify(results, null, 2);
        }}
        window.addEventListener('DOMContentLoaded', testAll);
    </script>
</body>
</html>
"""

out_path = r"scripts\mermaid_test.html"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Built {out_path} with {len(diagrams)} diagrams.")
