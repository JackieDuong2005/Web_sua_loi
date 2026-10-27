import re
from typing import List

def segment_into_pedagogical_clauses(passage: str, chunk_mode: str = "phrase") -> List[str]:
    """Phân đoạn bài đọc thành các vế câu sư phạm bảo toàn 100% từ ngữ và dấu câu gốc.
    Nếu chunk_mode == 'phrase': Tách theo dấu phẩy, chấm phẩy, hai chấm, chấm, hỏi, than, xuống dòng.
    Nếu chunk_mode == 'sentence': Tách theo dấu chấm, hỏi, than, xuống dòng.
    """
    if not passage or not passage.strip():
        return []

    # Định nghĩa ranh giới phân đoạn, bao gồm cả dấu ngoặc kép/đóng ngoặc sau dấu câu
    if chunk_mode == "sentence":
        delimiters = r"([\.!\?\n]+[\"'\u201d\u2019\)]*)"
    else:
        # phrase mode: tách theo cả dấu ngắt nhịp giữa câu (, ; :)
        delimiters = r"([,;:!\?\.\n]+[\"'\u201d\u2019\)]*)"

    tokens = re.split(delimiters, passage)
    clauses = []
    
    current_text = ""
    for token in tokens:
        if not token:
            continue
        if re.match(delimiters, token):
            current_text += token
            clause_str = current_text.strip()
            if clause_str:
                clauses.append(clause_str)
            current_text = ""
        else:
            current_text += token

    if current_text.strip():
        clauses.append(current_text.strip())

    return clauses

if __name__ == "__main__":
    cases = [
        "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.",
        'Bé hỏi: "Mẹ ơi, trăng tròn như cái đĩa đúng không?" Mẹ mỉm cười gật đầu.',
        'Một đoạn văn không có dấu câu nào cả',
        'Hoa nở rực rỡ... Hương thơm ngào ngạt! Ôi, đẹp quá!',
    ]
    for idx, p in enumerate(cases):
        cl = segment_into_pedagogical_clauses(p)
        orig_words = p.split()
        clause_words = [w for c in cl for w in c.split()]
        print(f"Case {idx}: orig={len(orig_words)}, cl={len(clause_words)}, match={orig_words == clause_words}")
        assert orig_words == clause_words, f"Mismatch in case {idx}"
        for i, c in enumerate(cl):
            print(f"  [{i}]: {c}")
    print("ALL VERBATIM INVARIANT TESTS PASSED!")
