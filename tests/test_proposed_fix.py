import re

def fixed_segment(passage, chunk_mode="phrase"):
    if not passage or not passage.strip():
        return []
    if chunk_mode == "sentence":
        delimiters = r"([\.!\?\n]+(?:[\"'\u201d\u2019\)]*[\.!\?\n]*)*)"
    else:
        delimiters = r"([,;:!\?\.\n]+(?:[\"'\u201d\u2019\)]*[,;:!\?\.\n]*)*)"
    tokens = re.split(delimiters, passage)
    clauses = []
    current_text = ""
    for token in tokens:
        if not token:
            continue
        if re.match(delimiters, token):
            current_text += token
            clause_str = current_text.strip()
            if any(c.isalnum() for c in clause_str):
                clauses.append(clause_str)
                current_text = ""
        else:
            current_text += token
    if current_text.strip() and any(c.isalnum() for c in current_text):
        clauses.append(current_text.strip())
    return clauses

p1 = 'Bác Hồ căn dặn: "Các vua Hùng đã có công dựng nước, Bác cháu ta phải cùng nhau giữ lấy nước!". Đó là lời dạy thiêng liêng.'
p2 = 'Cô giáo nói: "Hãy chăm ngoan!", rồi cô cười.'
p3 = 'Bác Hồ căn dặn: "Các vua Hùng đã có công dựng nước, Bác cháu ta phải cùng nhau giữ lấy nước!" Đó là lời dạy thiêng liêng.'

for p in [p1, p2, p3]:
    print("--- PASSAGE ---")
    print(p)
    clauses = fixed_segment(p)
    for i, c in enumerate(clauses):
        print(f"  Clause {i}: {repr(c)}")
    orig_words = p.split()
    clause_words = [w for c in clauses for w in c.split()]
    print(f"  Orig == Clause? {orig_words == clause_words}")
