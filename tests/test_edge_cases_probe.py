import sys, os
sys.path.insert(0, os.path.abspath("."))
from python_service.main import (
    app,
    clean_raw_sgk_text,
    extract_deterministic_difficult_words,
    segment_into_pedagogical_clauses,
    direct_prosody_script,
)
from fastapi.testclient import TestClient

client = TestClient(app)

print("=== 1. Passages with only headers and questions ===")
bad_sgk = """
Tiếng Việt 3 - Tập 1
Tuần 12
Trang 45
Câu 1: Em hãy trả lời câu hỏi sau?
Câu 2: Đặt câu với từ khó.
"""
t, c = clean_raw_sgk_text(bad_sgk)
print("clean_raw_sgk_text:", repr(t), repr(c))
r = client.post("/qwen/extract-sgk", json={"raw_text": bad_sgk})
print("extract-sgk response:", r.status_code, r.json())

print("\n=== 2. Grade clamping ===")
r_grade = client.post("/qwen/direct-prosody", json={"passage": "Chào buổi sáng.", "grade": -5})
print("grade=-5 response:", r_grade.status_code)

print("\n=== 3. Difficult words as comma-separated string ===")
r_diff_str = client.post("/qwen/direct-prosody", json={"passage": "Chào buổi sáng em yêu.", "difficult_words": "buổi sáng, em yêu"})
print("diff_str response:", r_diff_str.status_code, "matched:", [c["matched_difficult_words"] for c in r_diff_str.json()["clauses"]])

print("\n=== 4. Ellipsis handling in clauses ===")
p_dots = "Trời thu trong xanh... ngút ngàn."
clauses_dots = segment_into_pedagogical_clauses(p_dots)
print("clauses_dots:", clauses_dots)
orig_w = p_dots.split()
cl_w = [w for c in clauses_dots for w in c.split()]
print("orig_w == cl_w:", orig_w == cl_w)

print("\n=== 5. Multiple punctuation marks ===")
p_multi = "Gió thổi mạnh quá!..."
clauses_multi = segment_into_pedagogical_clauses(p_multi)
print("clauses_multi:", clauses_multi)
