# Báo cáo kết quả thử nghiệm Thuật toán Chấm điểm Levenshtein

- **Thời điểm thực nghiệm:** 2026-06-24 23:11:57
- **Tổng số mẫu thử nghiệm:** 1000 mẫu
- **Độ trễ trung bình:** 0.21 ms/mẫu

## 1. Kết quả phát hiện lỗi chính tả (Word-level Detection)

Đánh giá xem thuật toán có chỉ ra đúng từ viết sai trong câu hay không:

| Chỉ số | Số lượng / Tỷ lệ | Ý nghĩa |
|---|---|---|
| **True Positives (TP)** | 2264 từ | Lỗi thật được phát hiện đúng vị trí |
| **False Positives (FP)** | 0 từ | Phát hiện nhầm từ đúng thành từ sai |
| **False Negatives (FN)** | 0 từ | Bỏ sót lỗi chính tả thật |
| **Precision (Độ chính xác)** | **100.0%** | Tỷ lệ lỗi phát hiện là đúng |
| **Recall (Độ phủ)** | **100.0%** | Tỷ lệ lỗi thật được tìm thấy |
| **F1-score (Cân bằng)** | **100.0%** | Điểm F1 tổng thể của phát hiện lỗi |

## 2. Kết quả phân loại lỗi chính tả (Classification Accuracy)

Đánh giá xem thuật toán có xếp đúng loại lỗi (Ví dụ: sai vần, sai phụ âm đầu, sai dấu thanh) cho những từ đã phát hiện đúng:

- **Độ chính xác phân loại tổng thể:** **84.67%** (1917/2264 từ)

### Chi tiết theo từng loại lỗi chính tả:

| Loại lỗi chính tả | GT lỗi | Dự đoán | Đúng (TP) | Precision (%) | Recall (%) | F1-score (%) |
|---|---|---|---|---|---|---|
| Viết hoa | 224 | 224 | 224 | 100.0% | 100.0% | **100.0%** |
| Sai dấu thanh | 667 | 699 | 667 | 95.42% | 100.0% | **97.66%** |
| Sai phụ âm đầu | 1072 | 849 | 849 | 100.0% | 79.2% | **88.39%** |
| Sai vần | 209 | 492 | 177 | 35.98% | 84.69% | **50.5%** |
| Bỏ sót/Thêm chữ | 92 | 0 | 0 | 0% | 0.0% | **0%** |

## 3. Sai số tính điểm chính tả (Score Accuracy)

Đo lường mức độ chênh lệch giữa điểm tính bởi thuật toán Levenshtein và điểm chuẩn (Ground Truth):

| Chỉ số sai số | Giá trị | Ý nghĩa |
|---|---|---|
| **MAE (Sai số tuyệt đối trung bình)** | 0.000 điểm | Chênh lệch điểm trung bình trên mỗi bài |
| **RMSE (Sai số bình phương trung bình)** | 0.000 điểm | Đo mức độ sai số lớn (phạt nặng sai số lớn) |

## 4. Phân tích định tính & Các trường hợp lỗi tiêu biểu

Qua phân tích các trường hợp phát hiện sai (FP) hoặc bỏ sót (FN), nhóm xác định được các trường hợp đặc trưng:

| STT | Câu gốc (Clean) | Câu lỗi (Noisy) | Lỗi Ground Truth | Thuật toán nhận diện | Nhận xét |
|---|---|---|---|---|---|