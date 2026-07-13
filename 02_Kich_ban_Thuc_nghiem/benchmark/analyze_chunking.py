"""
OFFLINE ANALYSIS — Phân tích logic split/chunk của python_service/main.py
Không cần model chạy. Test các hàm:
  - _split_prose_to_chunks
  - _is_header_line
  - detect_text_type
  - _dynamic_max_tokens
  - _remove_repetition

Chạy: python 02_Kich_ban_Thuc_nghiem/analyze_chunking.py
"""
import sys, re, math
sys.path.insert(0, 'python_service')

# ==== Copy các hàm từ main.py (không cần import model) ====

def _is_header_line(line):
    stripped = line.strip()
    if stripped.endswith(':') and len(stripped) <= 30:
        return True
    header_keywords = ['đề bài', 'làm bài', 'bài làm', 'họ tên', 'lớp', 'ngày']
    low = stripped.lower()
    if any(kw in low for kw in header_keywords) and len(stripped) <= 50:
        return True
    return False

def detect_text_type(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    content_lines = lines[1:] if len(lines) > 1 else lines
    if not content_lines:
        return 'van_xuoi'
    avg_len = sum(len(l) for l in content_lines) / len(content_lines)
    if avg_len < 40 and len(content_lines) >= 2:
        return 'tho'
    return 'van_xuoi'

def _dynamic_max_tokens(chunk):
    estimated = int(len(chunk) * 1.5 * 1.5)
    return max(32, min(estimated, 256))

def _split_prose_to_chunks_NEW(paragraph, max_chunk=160):
    """Phiên bản mới (không có prev_tail)"""
    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
    sentences = [s.strip() for s in sentences if s.strip()]
    chunks = []
    for sent in sentences:
        if len(sent) <= max_chunk:
            chunks.append(sent)
        else:
            parts = re.split(r',\s+', sent)
            current = ""
            for part in parts:
                candidate = (current + ", " + part).lstrip(", ") if current else part
                if len(candidate) <= max_chunk:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    current = part[:max_chunk]
            if current:
                chunks.append(current)
    return chunks

def _remove_repetition(text, original):
    words = text.split()
    if len(words) < 6:
        return text
    for window in range(3, 6):
        for start in range(len(words) - window * 3):
            phrase = tuple(words[start:start + window])
            count = 0
            for i in range(start, len(words) - window + 1, window):
                if tuple(words[i:i + window]) == phrase:
                    count += 1
                else:
                    break
            if count >= 3:
                return None
    if len(words) > len(original.split()) * 2.5:
        return None
    return text

# ==== TEST CASES ====
TEST_PARAGRAPHS = [
    {
        "id": "P1",
        "label": "Đoạn 3 câu ngắn — dấu thanh",
        "text": "Buổi sang, em ra vươn cùng bà. Em thây một con bướm đang đâu trên bong hoa hong. Con bướm có đôi canh rât đep."
    },
    {
        "id": "P2",
        "label": "Đoạn 4 câu trung bình — phụ âm",
        "text": "Gia dình em có bốn người. Bố em làm ruộng, mẹ em bán hàng ở chợ. Anh hai thì đi học zo ràng, còn em thì ở nhà dúp mẹ nấu cơm. Chúng em rất yêu thương nhau."
    },
    {
        "id": "P3",
        "label": "Đoạn 5 câu — hỗn hợp nhiều lỗi",
        "text": "Nha em co nuôi môt con meo tên là Bông. Nó có bo long trăng muôt. Bông rât thich chay nhay và bắt chươt. Mỗi tôi, Bông năm ở goc bep sưởi âm. Em rât yêu con meo Bông của mình."
    },
    {
        "id": "P4",
        "label": "Đoạn 6 câu dài — tổng hợp",
        "text": "thầy giáo em tên là nguyễn văn minh. thầy dạy chúng em lớp bốn. thầy giảng bai rât ro rang và hay kê nhưng câu chuyên hay. mỗi khi chung em hiểu bai, thầy mỉm cươi rất hiên. chung em rât quy mến thầy. em hưa sẽ chăm chi hoc để không phụ công thầy đã day."
    },
    {
        "id": "P5",
        "label": "Câu rất dài hơn 160 ký tự (stress test)",
        "text": "Đây là một câu rất rất dài được thiết kế để kiểm tra khả năng xử lý của hệ thống khi gặp phải những đoạn văn bản có độ dài vượt quá ngưỡng cho phép của tokenizer mà không bị truncate hay sinh thêm nội dung không mong muốn."
    },
    {
        "id": "P6",
        "label": "Đoạn thơ (phát hiện loại)",
        "text": "Quê hương em\nCánh đồng xanh bát ngát\nLúa vàng rợp một màu\nBướm bay trên ngọn lúa\nChim hót trong vườn cau"
    },
]

# ==== CHẠY PHÂN TÍCH ====
print("=" * 70)
print("  OFFLINE CHUNK ANALYSIS — python_service/main.py")
print("=" * 70)

total_issues = 0

for p in TEST_PARAGRAPHS:
    print(f"\n[{p['id']}] {p['label']}")
    text = p['text']
    
    # Phát hiện loại văn bản
    text_type = detect_text_type(text)
    print(f"  Loại: {text_type} | Ký tự: {len(text)} | Từ: {len(text.split())}")
    
    if text_type == 'van_xuoi':
        # Tách thành chunks
        # Lấy từng dòng (paragraph) rồi split
        lines = [l for l in text.split('\n')]
        
        # Lọc title
        first_line = lines[0].strip()
        content_lines = lines
        
        print(f"  Số dòng (paragraphs): {len(content_lines)}")
        
        all_chunks = []
        for para in content_lines:
            if not para.strip():
                continue
            if _is_header_line(para):
                print(f"  [HEADER skip]: '{para.strip()[:40]}'")
                continue
            chunks = _split_prose_to_chunks_NEW(para)
            all_chunks.extend(chunks)
            for i, chunk in enumerate(chunks):
                tok_estimate = int(len(chunk) * 1.5)
                max_tok = _dynamic_max_tokens(chunk)
                flag = "⚠️  QUÁ DÀI!" if tok_estimate > 256 else ("✅" if tok_estimate <= 200 else "⚡ gần giới hạn")
                print(f"    Chunk {i+1}: {len(chunk)} ký tự ≈ {tok_estimate} tokens | max_new_tokens={max_tok} {flag}")
                if len(chunk) > 20:
                    print(f"           \"{chunk[:80]}{'...' if len(chunk)>80 else ''}\"")
                
                if tok_estimate > 256:
                    total_issues += 1
        
        print(f"  → Tổng {len(all_chunks)} chunks")
    
    else:  # thơ ca
        lines = [l for l in text.split('\n') if l.strip()]
        print(f"  → Thơ: {len(lines)} dòng, xử lý từng dòng độc lập")
        for i, line in enumerate(lines):
            tok_estimate = int(len(line) * 1.5)
            flag = "⚠️  DÀI" if tok_estimate > 256 else "✅"
            print(f"    Dòng {i+1}: {len(line)} ký tự ≈ {tok_estimate} tokens {flag}")

print("\n" + "=" * 70)
print(f"  Tổng số chunk QUÁT ĐỘ DÀI: {total_issues}")
print("=" * 70)

# ==== KIỂM TRA REMOVE_REPETITION ====
print("\n" + "=" * 70)
print("  TEST _remove_repetition")
print("=" * 70)

repetition_cases = [
    {
        "label": "Output bình thường (không lặp)",
        "output": "Một hôm, quạ rủ công lấy màu về áo khoác cho đẹp. Qua cho công chiếc áo rực rỡ.",
        "original": "Một hôm, quạ rủ công lấy màu về áo khoác cho đẹp. Qua cho công chiếc áo rực rỡ."
    },
    {
        "label": "Output lặp câu (hallucination)",
        "output": "Một hôm, quạ rủ công lấy màu về áo khoác cho đẹp. Một hôm, quạ rủ công lấy màu về áo khoác cho đẹp. Một hôm, quạ rủ công.",
        "original": "Một hôm quạ rủ công lấy màu về áo khoác cho đẹp."
    },
    {
        "label": "Output dài gấp 3x (hallucination dài)",
        "output": "Mùa hè đã về rồi. Chúng em được nghỉ học và đi chơi. Buổi chiều, chúng em ra đồng lúa chơi đùa thoải mái. Em rất thích mùa hè vì được gặp bạn bè. Còn nhiều điều thú vị nữa.",
        "original": "Mùa hè về."
    },
    {
        "label": "Output ngắn hơn input (cắt nội dung)",
        "output": "Con mèo nhà em.",
        "original": "Nhà em có nuôi một con mèo tên là Bông. Nó có bộ lông trắng mượt. Bông rất thích chạy nhảy và bắt chuột."
    },
]

for rc in repetition_cases:
    result = _remove_repetition(rc["output"], rc["original"])
    orig_words = len(rc["original"].split())
    out_words = len(rc["output"].split())
    ratio = out_words / orig_words if orig_words > 0 else 0
    status = "→ FALLBACK (None)" if result is None else "→ CHẤP NHẬN"
    print(f"\n  [{rc['label']}]")
    print(f"    Input: {orig_words} từ | Output: {out_words} từ | Ratio: {ratio:.2f}")
    print(f"    Kết quả: {status}")

print("\n" + "=" * 70)
print("  PHÂN TÍCH HOÀN TẤT")
print("=" * 70)
