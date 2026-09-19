"""
yolo_detector.py — Universal Word Detection & Vertical Overlap Line Analysis for Handwriting.

Thuật toán gom dòng: Vertical Overlap (thay thế Adaptive Line Sweeping cũ).

Lý do thay đổi:
  Thuật toán cũ dùng tâm y (y_mid) để quyết định từ nào thuộc dòng nào.
  Chữ viết tay tiếng Việt có nhiều ký tự vươn cao (h, b, l, dấu hỏi/ngã) hoặc
  kéo xuống (g, y, p) làm tâm y bị lệch mạnh → từ bị xếp nhầm dòng → toàn bộ
  chỉ số từ phía sau bị trượt → khung bounding box khoanh sai vị trí trên giao diện.

Thuật toán Vertical Overlap:
  Với mỗi box mới, tính độ giao thoa trục Y với đường bao TRUNG BÌNH của từng dòng:
    line_y1_avg = mean(y1 của các box trong dòng)
    line_y2_avg = mean(y2 của các box trong dòng)
    inter_h     = max(0, min(by2, line_y2_avg) - max(by1, line_y1_avg))
    overlap_ratio = inter_h / min(box_h, line_h)
  Nếu overlap_ratio >= overlap_threshold → gán vào dòng có overlap cao nhất.
  Nếu không dòng nào đạt ngưỡng → tạo dòng mới.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from PIL import Image

logger = logging.getLogger("yolo_detector")

# Đường dẫn mặc định đến trọng số đã train
DEFAULT_WEIGHTS_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "Test_train_29_12",
        "ver2",
        "runs",
        "detect",
        "train",
        "weights",
        "best.pt",
    )
)

_yolo_model = None
_model_loaded = False


def load_yolo_model(weights_path: Optional[str] = None):
    """Khởi tạo và tải model YOLOv8 (Singleton)"""
    global _yolo_model, _model_loaded
    if _model_loaded and _yolo_model is not None:
        return _yolo_model

    path = weights_path or os.getenv("YOLO_WEIGHTS_PATH") or DEFAULT_WEIGHTS_PATH
    if not os.path.exists(path):
        logger.warning(f"[YOLO] Không tìm thấy file trọng số tại: {path}")
        return None

    try:
        from ultralytics import YOLO

        logger.info(f"[YOLO] Đang nạp model từ: {path}...")
        _yolo_model = YOLO(path)
        _model_loaded = True
        logger.info("[YOLO] ✅ Nạp model YOLOv8 thành công!")
        return _yolo_model
    except Exception as e:
        logger.error(f"[YOLO] ❌ Lỗi khi nạp model YOLOv8: {e}")
        return None


def sort_reading_order(
    boxes: List[Dict[str, Any]],
    img_width: int,
    img_height: int,
    overlap_threshold: float = 0.4,
) -> Dict[str, Any]:
    """
    Sắp xếp YOLO boxes theo thứ tự đọc tự nhiên bằng thuật toán Vertical Overlap.

    Thuật toán:
      1. Sort sơ bộ các box theo y1 tăng dần.
      2. Với mỗi box, tính độ giao thoa trục Y với đường bao trung bình
         (mean y1, mean y2) của từng dòng hiện có:
           inter_h      = max(0, min(by2, line_y2_avg) - max(by1, line_y1_avg))
           overlap_ratio = inter_h / min(box_h, line_h)
      3. Nếu overlap_ratio >= overlap_threshold → gán vào dòng có overlap cao nhất.
         Nếu không dòng nào đạt ngưỡng → tạo dòng mới.
      4. Sort các dòng từ trên xuống dưới theo avg(y1).
      5. Trong mỗi dòng, sort từ từ trái sang phải theo x1.
      6. Chuẩn hóa tọa độ tương đối [0..1] để render responsive trên mọi màn hình.

    Tham số:
      boxes             : list dict {"x1", "y1", "x2", "y2", "conf"}  (pixel tuyệt đối)
      img_width         : chiều rộng ảnh (pixel)
      img_height        : chiều cao ảnh (pixel)
      overlap_threshold : ngưỡng giao thoa tối thiểu để gán vào dòng (mặc định 0.4)

    Trả về:
      dict chuẩn {"total_words", "total_lines", "image_dimensions", "lines", "flat_boxes", "boxes"}
    """
    if not boxes:
        return {
            "total_words": 0,
            "total_lines": 0,
            "image_dimensions": {"width": img_width, "height": img_height},
            "lines": [],
            "flat_boxes": [],
            "boxes": [],
        }

    # ─── Bước 1: Sort sơ bộ theo y1 ─────────────────────────────────────────
    raw = sorted(boxes, key=lambda b: b["y1"])

    # ─── Bước 2-3: Gom dòng bằng Vertical Overlap ───────────────────────────
    lines_raw: List[List[Dict]] = []  # mỗi phần tử là list box cùng dòng

    for b in raw:
        bx1, by1, bx2, by2 = b["x1"], b["y1"], b["x2"], b["y2"]
        box_h = max(1.0, by2 - by1)

        best_line_idx = -1
        best_overlap = 0.0

        for i, line in enumerate(lines_raw):
            # Đường bao trung bình cộng (không dùng min/max để tránh trôi biên)
            line_y1_avg = sum(lb["y1"] for lb in line) / len(line)
            line_y2_avg = sum(lb["y2"] for lb in line) / len(line)
            line_h = max(1.0, line_y2_avg - line_y1_avg)

            # Độ giao thoa theo trục Y
            inter_h = max(0.0, min(by2, line_y2_avg) - max(by1, line_y1_avg))
            overlap_ratio = inter_h / min(box_h, line_h)

            if overlap_ratio > best_overlap:
                best_overlap = overlap_ratio
                best_line_idx = i

        if best_overlap >= overlap_threshold and best_line_idx >= 0:
            lines_raw[best_line_idx].append(b)
        else:
            lines_raw.append([b])

    # ─── Bước 4: Sort dòng từ trên xuống dưới theo avg(y1) ──────────────────
    lines_raw.sort(key=lambda line: sum(lb["y1"] for lb in line) / len(line))

    # ─── Bước 5-6: Sort trong dòng + chuẩn hóa tọa độ ──────────────────────
    structured_lines = []
    flat_boxes: List[Dict] = []
    box_id_counter = 0

    for line_idx, line in enumerate(lines_raw):
        # Sort từ trái sang phải theo x1
        line_sorted = sorted(line, key=lambda b: b["x1"])
        line_boxes = []

        for word_idx_in_line, b in enumerate(line_sorted):
            x1, y1, x2, y2 = b["x1"], b["y1"], b["x2"], b["y2"]

            # Chuẩn hóa tỉ lệ tương đối [0..1] — an toàn với ảnh kích thước bất kỳ
            rel_x1 = max(0.0, min(1.0, x1 / img_width))  if img_width  > 0 else 0.0
            rel_y1 = max(0.0, min(1.0, y1 / img_height)) if img_height > 0 else 0.0
            rel_x2 = max(0.0, min(1.0, x2 / img_width))  if img_width  > 0 else 1.0
            rel_y2 = max(0.0, min(1.0, y2 / img_height)) if img_height > 0 else 1.0
            rel_w  = max(0.0, min(1.0, (x2 - x1) / img_width))  if img_width  > 0 else 0.0
            rel_h  = max(0.0, min(1.0, (y2 - y1) / img_height)) if img_height > 0 else 0.0

            box_data = {
                "box_id":            box_id_counter,
                "line_index":        line_idx,
                "word_index_in_line": word_idx_in_line,
                "x1":    round(x1, 1),
                "y1":    round(y1, 1),
                "x2":    round(x2, 1),
                "y2":    round(y2, 1),
                "width":  round(x2 - x1, 1),
                "height": round(y2 - y1, 1),
                "conf":   round(float(b.get("conf", 1.0)), 4),
                "rel_x1": round(rel_x1, 5),
                "rel_y1": round(rel_y1, 5),
                "rel_x2": round(rel_x2, 5),
                "rel_y2": round(rel_y2, 5),
                "rel_w":  round(rel_w, 5),
                "rel_h":  round(rel_h, 5),
            }

            line_boxes.append(box_data)
            flat_boxes.append(box_data)
            box_id_counter += 1

        structured_lines.append(
            {
                "line_index": line_idx,
                "word_count": len(line_boxes),
                "y_avg": round(
                    sum(b["y1"] for b in line_boxes) / max(1, len(line_boxes)), 1
                ),
                "boxes": line_boxes,
                "words": line_boxes,  # alias để tương thích với code cũ
            }
        )

    return {
        "total_words":       len(flat_boxes),
        "total_lines":       len(structured_lines),
        "image_dimensions":  {"width": img_width, "height": img_height},
        "lines":             structured_lines,
        "flat_boxes":        flat_boxes,
        "boxes":             flat_boxes,  # alias để tương thích với code cũ
    }


def detect_words_from_image(
    image: Image.Image,
    conf_threshold: float = 0.50,
    iou_threshold: float = 0.45,
) -> Dict[str, Any]:
    """
    Chạy YOLOv8 detect trên ảnh PIL và sắp xếp theo thứ tự đọc tự nhiên
    bằng thuật toán Vertical Overlap.

    Tham số:
      image          : ảnh PIL (RGB)
      conf_threshold : ngưỡng tin cậy YOLO (mặc định 0.50 — lọc sạch noise)
      iou_threshold  : ngưỡng IoU cho NMS (mặc định 0.45)
    """
    model = load_yolo_model()
    if model is None:
        return {
            "error": "Model YOLOv8 chưa sẵn sàng hoặc không tìm thấy file trọng số",
            "total_words": 0,
            "total_lines": 0,
            "lines": [],
            "flat_boxes": [],
            "boxes": [],
        }

    width, height = image.size

    # Inference YOLOv8 với conf và iou được chỉ định rõ
    results = model(image, conf=conf_threshold, iou=iou_threshold, verbose=False)
    raw_boxes: List[Dict] = []

    if results and len(results) > 0:
        det_boxes = results[0].boxes
        if det_boxes is not None and len(det_boxes) > 0:
            xyxy_list = det_boxes.xyxy.cpu().numpy()
            conf_list = det_boxes.conf.cpu().numpy()
            for coords, conf in zip(xyxy_list, conf_list):
                x1, y1, x2, y2 = coords.tolist()
                raw_boxes.append(
                    {
                        "x1": float(x1),
                        "y1": float(y1),
                        "x2": float(x2),
                        "y2": float(y2),
                        "conf": float(conf),
                    }
                )

    logger.info(
        f"[YOLO] Inference xong: {len(raw_boxes)} box thô "
        f"(conf>={conf_threshold}, iou={iou_threshold})"
    )

    return sort_reading_order(raw_boxes, width, height)
