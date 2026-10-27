import re
from typing import Tuple, List, Optional

def clean_raw_sgk_text(raw_text: str) -> Tuple[str, str]:
    """Làm sạch văn bản thô từ SGK / PDF:
    - Loại bỏ tiêu đề đầu trang: Tuần, Bài đọc, Tiếng Việt...
    - Loại bỏ số trang: Trang 45, tr. 45, 45/120, dòng chỉ có số
    - Cắt bỏ phần câu hỏi thảo luận, bài tập ở cuối bài
    Trả về: (title, clean_content)
    """
    if not raw_text:
        return "", ""

    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")

    # Danh sách regex phát hiện tiêu đề sách/trang cần loại bỏ
    header_patterns = [
        re.compile(r"^(?:tiếng\s*việt|tập\s*đọc|chính\s*tả)\s*\d*(?:\s*[-–]\s*tập\s*\d*)?.*$", re.IGNORECASE),
        re.compile(r"^tuần\s*\d+.*$", re.IGNORECASE),
        re.compile(r"^bài\s*(?:đọc|học)?\s*\d+:?.*$", re.IGNORECASE),
        re.compile(r"^(?:trang|tr\.?)\s*\d+\b.*$", re.IGNORECASE),
        re.compile(r"^\s*\d+\s*(?:/\s*\d+)?\s*$"),  # Dòng chỉ có số trang (ví dụ '45' hoặc '45/120')
    ]

    # Regex phát hiện phần bài tập / câu hỏi thảo luận để cắt bỏ từ đó đến hết bài
    exercise_cutoff = re.compile(
        r"^\s*(?:câu\s*\d+|câu\s*hỏi(?:\s*và\s*bài\s*tập)?|bài\s*tập(?:\s*\d+)?|luyện\s*từ\s*và\s*câu|tập\s*làm\s*văn|\*?\s*ghi\s*nhớ|\d+\.\s*(?:em\s+hãy|tìm|hãy|đặt\s+câu|chọn|đọc\s+lại)).*",
        re.IGNORECASE
    )

    valid_lines: List[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Nếu gặp phần câu hỏi bài tập thảo luận -> cắt bỏ toàn bộ từ đây
        if exercise_cutoff.match(stripped):
            break

        # Kiểm tra xem có phải dòng tiêu đề sách / số trang không
        is_header = any(p.match(stripped) for p in header_patterns)
        if is_header:
            continue

        # Loại bỏ các mẫu số trang nằm lẻ loi trong dòng (ví dụ '(Trang 45)')
        cleaned_line = re.sub(r"\(?\b(?:trang|tr\.?)\s*\d+\b\)?", "", stripped, flags=re.IGNORECASE).strip()
        if cleaned_line:
            valid_lines.append(cleaned_line)

    if not valid_lines:
        return "", ""

    # Trích xuất tiêu đề nếu dòng đầu tiên ngắn (< 10 từ) và không kết thúc bằng dấu chấm ngắt câu văn xuôi
    title = ""
    first_line = valid_lines[0]
    words_first = first_line.split()
    if len(words_first) <= 10 and not first_line.endswith((".", "!", "?")):
        title = first_line
        content_lines = valid_lines[1:]
    else:
        # Dòng đầu là nội dung, suy ra tiêu đề từ 5 từ đầu
        title = " ".join(words_first[:5])
        content_lines = valid_lines

    clean_content = "\n".join(content_lines).strip()
    if not clean_content and title:
        clean_content = title
        title = "Bài đọc chính tả"

    return title, clean_content

if __name__ == "__main__":
    sample_raw = """
    Tiếng Việt 3 - Tập 1
    Tuần 5 - Bài đọc 1: Gió mùa thu
    Trang 42
    
    Buổi Sáng Mùa Thu
    Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.
    
    42
    Câu 1: Em hãy tìm các hình ảnh so sánh trong bài thơ trên?
    Câu 2: Đặt câu với từ 'dịu dàng'.
    Ghi nhớ: Mùa thu miền Bắc có gió heo may.
    """
    
    t, c = clean_raw_sgk_text(sample_raw)
    print("=== EXTRACTED TITLE ===")
    print(t)
    print("=== CLEAN CONTENT ===")
    print(c)
