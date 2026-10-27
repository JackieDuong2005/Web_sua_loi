import sys, os
sys.path.insert(0, os.path.abspath("."))
import re
from python_service.main import segment_into_pedagogical_clauses

p1 = 'Bác Hồ căn dặn: "Các vua Hùng đã có công dựng nước, Bác cháu ta phải cùng nhau giữ lấy nước!". Đó là lời dạy thiêng liêng.'
p2 = 'Cô giáo nói: "Hãy chăm ngoan!", rồi cô cười.'
p3 = 'Bác Hồ căn dặn: "Các vua Hùng đã có công dựng nước, Bác cháu ta phải cùng nhau giữ lấy nước!" Đó là lời dạy thiêng liêng.'

for p in [p1, p2, p3]:
    print("--- PASSAGE ---")
    print(p)
    clauses = segment_into_pedagogical_clauses(p)
    for i, c in enumerate(clauses):
        print(f"  Clause {i}: {repr(c)}")
    orig_words = p.split()
    clause_words = [w for c in clauses for w in c.split()]
    print(f"  Orig == Clause? {orig_words == clause_words}")
    if orig_words != clause_words:
        print(f"  Orig:   {orig_words}")
        print(f"  Clause: {clause_words}")
