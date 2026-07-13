# Phân tích chi tiết 3 case WARN từ kết quả test

## ❌ Case WARN — Nguyên nhân và Giải pháp

### T10 — Sai vần in/inh (van) | WARN: KHÔNG PHÁT HIỆN LỖI
**Input:** "Con chim sẻ xinh xắn. Mỗi sang, chim sẻ hót rất vui..."
**Output:** Model sửa được nhưng phát hiện 0 lỗi trong chấm điểm
**Nguyên nhân:** Các từ như "sang" (sáng), "xinh" (đã đúng) → model không sửa, SequenceMatcher không diff được

### T11 — Thiếu từ (bo_sot_them) | WARN: KHÔNG PHÁT HIỆN LỖI
**Input:** "Mùa hè, [] xanh um... Chúng em [] thích..."
**Output:** Model GIỮ nguyên dấu [] trong output → SequenceMatcher thấy [] = [] nên đếm = 0 lỗi
**Fix cần:** Phát hiện ký tự [] trong văn bản học sinh và đánh dấu lỗi bỏ sót

### T13 — Thiếu + thừa hỗn hợp (bo_sot_them) | WARN: KHÔNG PHÁT HIỆN LỖI
**Input:** "Con trâu là là người bạn... đồng đồng..."
**Output:** "Con trâu là là người bạn... đồng đồng..."
**Nguyên nhân:** Model không sửa từ lặp "là là", "đồng đồng" → SequenceMatcher input=output → 0 diff
**Fix cần:** Thêm bước post-processing phát hiện từ lặp liền kề (word dedup)
