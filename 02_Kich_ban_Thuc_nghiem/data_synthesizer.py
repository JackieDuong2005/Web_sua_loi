"""
===============================================================================
ViHand Grade — Data Synthesizer: Tạo lỗi chính tả tiếng Việt tự động
===============================================================================
Mô tả:
    Module Rule-based + Dictionary để tự động "bơm" (inject) lỗi chính tả
    vào các đoạn văn tiếng Việt chuẩn, mô phỏng 5 nhóm lỗi thực tế của
    học sinh tiểu học:
      1. Nhầm phụ âm đầu (phương ngữ Nam Bộ)
      2. Sai vần (ảnh hưởng phương ngữ)
      3. Sai/thiếu dấu thanh (nhầm hỏi/ngã)
      4. Sai quy tắc viết hoa
      5. Bỏ sót/thêm chữ

Cách sử dụng:
    from data_synthesizer import inject_errors

    correct_text = "Hôm nay trời đẹp quá, em đi học rất vui."
    noisy_text, log = inject_errors(correct_text, error_rate=0.15)
    print(noisy_text)
    # => "Hôm nay chời đẹp quá, em đi học rấc vui."

Tác giả: ViHand Grade Research — 2026
===============================================================================
"""

import re
import random
from typing import Optional

# ============================================================
# 1. TỪ ĐIỂN NHẦM PHỤ ÂM ĐẦU (Phương ngữ Nam Bộ)
# ============================================================
# Key: phụ âm đầu đúng → Value: list phụ âm đầu sai thường gặp
PHU_AM_DAU_MAP = {
    "tr":  ["ch"],               # trường → chường
    "ch":  ["tr"],               # cha → tra
    "s":   ["x"],                # sáng → xáng
    "x":   ["s"],                # xinh → sinh
    "gi":  ["d", "r"],           # giày → dày
    "d":   ["gi", "r"],          # dọn → giọn
    "r":   ["d", "gi"],          # rồi → dồi
    "v":   ["d"],                # về → dề
    "l":   ["n"],                # lòng → nòng
    "n":   ["l"],                # nắng → lắng
    "ng":  ["ngh"],              # ngày → nghày (ít gặp nhưng có)
    "ngh": ["ng"],               # nghĩ → ngĩ
    "c":   ["k"],                # coi → koi
    "k":   ["c"],                # kể → cể
    "g":   ["gh"],               # gà → ghà
    "gh":  ["g"],                # ghen → gen
}

# ============================================================
# 2. TỪ ĐIỂN SAI VẦN (nhầm vần phức tạp, phương ngữ)
# ============================================================
VAN_MAP = {
    "ương": ["uơng", "ườn"],
    "ượi":  ["ợi"],
    "uyên": ["uên", "uyến"],
    "uyết": ["uết", "uyếc"],
    "oai":  ["oay"],
    "oay":  ["oai"],
    "uôi":  ["uối", "ôi"],
    "iêu":  ["iu", "iêu"],
    "ươu":  ["ưu"],
    "ướt":  ["ước"],
    "ước":  ["ướt"],
    "ưởi":  ["ởi"],
    "ăng":  ["ăn"],
    "ăn":   ["ăng"],
    "ân":   ["âng"],
    "âng":  ["ân"],
    "ong":  ["on"],
    "on":   ["ong"],
    "anh":  ["an"],
    "an":   ["anh"],
    "inh":  ["in"],
    "in":   ["inh"],
    "ênh":  ["ên"],
    "ên":   ["ênh"],
    "ung":  ["un"],
    "un":   ["ung"],
    "ết":   ["ếc"],
    "ất":   ["ấc"],
    "ật":   ["ậc"],
    "ốt":   ["ốc"],
    "ắt":   ["ắc"],
    "ục":   ["ục", "út"],
    "ơi":   ["ới"],
    "ưng":  ["ưn"],
}

# ============================================================
# 3. TỪ ĐIỂN SAI DẤU THANH (hỏi/ngã, nặng/sắc)
# ============================================================
DAU_THANH_MAP = {
    # Nhầm hỏi ↔ ngã (lỗi rất phổ biến)
    "ả": "ã", "ã": "ả",
    "ẻ": "ẽ", "ẽ": "ẻ",
    "ỉ": "ĩ", "ĩ": "ỉ",
    "ỏ": "õ", "õ": "ỏ",
    "ủ": "ũ", "ũ": "ủ",
    "ỷ": "ỹ", "ỹ": "ỷ",
    "ẳ": "ẵ", "ẵ": "ẳ",
    "ẩ": "ẫ", "ẫ": "ẩ",
    "ổ": "ỗ", "ỗ": "ổ",
    "ử": "ữ", "ữ": "ử",
    "ở": "ỡ", "ỡ": "ở",
    # Bỏ quên dấu (viết nhanh)
    "á": "a", "à": "a", "ả": "a", "ã": "a", "ạ": "a",
    "é": "e", "è": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
    "í": "i", "ì": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
    "ó": "o", "ò": "o", "ỏ": "o", "õ": "o", "ọ": "o",
    "ú": "u", "ù": "u", "ủ": "u", "ũ": "u", "ụ": "u",
    "ý": "y", "ỳ": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
    "ắ": "ă", "ằ": "ă", "ẳ": "ă", "ẵ": "ă", "ặ": "ă",
    "ấ": "â", "ầ": "â", "ẩ": "â", "ẫ": "â", "ậ": "â",
    "ế": "ê", "ề": "ê", "ể": "ê", "ễ": "ê", "ệ": "ê",
    "ố": "ô", "ồ": "ô", "ổ": "ô", "ỗ": "ô", "ộ": "ô",
    "ớ": "ơ", "ờ": "ơ", "ở": "ơ", "ỡ": "ơ", "ợ": "ơ",
    "ứ": "ư", "ừ": "ư", "ử": "ư", "ữ": "ư", "ự": "ư",
}

# Tách riêng nhóm hỏi/ngã (dùng khi chỉ muốn nhầm hỏi-ngã, không muốn mất dấu)
HOI_NGA_MAP = {
    "ả": "ã", "ã": "ả",
    "ẻ": "ẽ", "ẽ": "ẻ",
    "ỉ": "ĩ", "ĩ": "ỉ",
    "ỏ": "õ", "õ": "ỏ",
    "ủ": "ũ", "ũ": "ủ",
    "ỷ": "ỹ", "ỹ": "ỷ",
    "ẳ": "ẵ", "ẵ": "ẳ",
    "ẩ": "ẫ", "ẫ": "ẩ",
    "ổ": "ỗ", "ỗ": "ổ",
    "ử": "ữ", "ữ": "ử",
    "ở": "ỡ", "ỡ": "ở",
}

# ============================================================
# 4. DANH SÁCH TỪ THƯỜNG BỊ VIẾT THIẾU/THÊM CHỮ
# ============================================================
BO_SOT_THEM_MAP = {
    # Viết thiếu âm cuối (rất phổ biến với trẻ)
    "tiếng": "tiến",
    "trường": "trườn",
    "nắng":  "nắn",
    "sáng":  "sán",
    "mạnh":  "mạn",
    "thành":  "thàn",
    "xanh":  "xan",
    "tranh":  "tran",
    "bảng":  "bản",
    "nhanh": "nhan",
    "đường": "đườn",
    "vườn":  "vườ",
    "buồn":  "buồ",
    "trăng": "trăn",
    "bóng":  "bón",
    "sóng":  "són",
    "hồng":  "hồn",
    "không": "khôn",
    "trong": "tron",
    "trồng": "trồn",
    "giữa":  "giữ",
    # Thêm chữ thừa
    "rất":   "rấc",      # thêm 'c' cuối
    "biết":  "biếc",
    "việt":  "việc",
    "hết":   "hếc",
    "mát":   "mác",
}

# ============================================================
# CÁC HÀM INJECT LỖI (Error Injection Functions)
# ============================================================

def _inject_phu_am_dau(word: str) -> Optional[str]:
    """Thay thế phụ âm đầu của từ bằng phụ âm đầu sai (phương ngữ)."""
    lower = word.lower()
    # Sắp xếp theo độ dài giảm dần để match "ngh" trước "ng" trước "n"
    sorted_keys = sorted(PHU_AM_DAU_MAP.keys(), key=len, reverse=True)
    for phu_am in sorted_keys:
        if lower.startswith(phu_am):
            replacements = PHU_AM_DAU_MAP[phu_am]
            new_phu_am = random.choice(replacements)
            rest = word[len(phu_am):]
            # Giữ nguyên viết hoa nếu từ gốc viết hoa
            if word[0].isupper():
                new_word = new_phu_am.capitalize() + rest
            else:
                new_word = new_phu_am + rest
            return new_word
    return None


def _inject_sai_van(word: str) -> Optional[str]:
    """Thay thế vần của từ bằng vần sai."""
    lower = word.lower()
    # Sắp xếp theo độ dài giảm dần
    sorted_keys = sorted(VAN_MAP.keys(), key=len, reverse=True)
    for van in sorted_keys:
        if van in lower:
            replacements = VAN_MAP[van]
            new_van = random.choice(replacements)
            idx = lower.index(van)
            new_word = word[:idx] + new_van + word[idx + len(van):]
            return new_word
    return None


def _inject_sai_dau_thanh(word: str, mode: str = "mixed") -> Optional[str]:
    """Thay đổi dấu thanh của từ.
    mode:
      - 'hoi_nga': chỉ nhầm hỏi ↔ ngã
      - 'drop':    bỏ mất dấu thanh
      - 'mixed':   random cả hai
    """
    if mode == "mixed":
        mode = random.choice(["hoi_nga", "drop"])

    dau_map = HOI_NGA_MAP if mode == "hoi_nga" else DAU_THANH_MAP

    chars = list(word)
    changed = False
    for i, c in enumerate(chars):
        if c in dau_map:
            chars[i] = dau_map[c]
            changed = True
            break  # Chỉ thay 1 ký tự dấu / từ
    return "".join(chars) if changed else None


def _inject_sai_viet_hoa(word: str, position: int) -> Optional[str]:
    """Viết thường một từ đáng lẽ phải viết hoa (tên riêng, đầu câu)."""
    if word[0].isupper() and word[0].isalpha():
        return word[0].lower() + word[1:]
    return None


def _inject_bo_sot_them(word: str) -> Optional[str]:
    """Viết thiếu hoặc thêm chữ."""
    lower = word.lower()
    if lower in BO_SOT_THEM_MAP:
        replacement = BO_SOT_THEM_MAP[lower]
        # Giữ viết hoa
        if word[0].isupper():
            return replacement[0].upper() + replacement[1:]
        return replacement
    return None


# ============================================================
# HÀM CHÍNH: inject_errors
# ============================================================

# Trọng số mặc định cho mỗi loại lỗi (tổng = 1.0)
DEFAULT_ERROR_WEIGHTS = {
    "phu_am_dau":   0.25,    # 25% lỗi phụ âm đầu
    "sai_van":      0.20,    # 20% lỗi vần
    "dau_thanh":    0.25,    # 25% lỗi dấu thanh
    "viet_hoa":     0.10,    # 10% lỗi viết hoa
    "bo_sot_them":  0.20,    # 20% lỗi bỏ sót/thêm
}


def inject_errors(
    text: str,
    error_rate: float = 0.15,
    min_errors: int = 2,
    max_errors: int = 5,
    error_weights: Optional[dict] = None,
    seed: Optional[int] = None,
) -> tuple[str, list[dict]]:
    """
    Tự động bơm lỗi chính tả vào đoạn văn chuẩn.

    Args:
        text:          Đoạn văn bản chuẩn (không lỗi).
        error_rate:    Tỷ lệ từ bị lỗi (0.0 – 1.0). VD: 0.15 = 15% từ.
        min_errors:    Số lỗi tối thiểu bơm vào.
        max_errors:    Số lỗi tối đa bơm vào.
        error_weights: Dict trọng số cho mỗi loại lỗi.
        seed:          Random seed (để reproduce).

    Returns:
        (noisy_text, injection_log)
        - noisy_text: văn bản đã bơm lỗi
        - injection_log: danh sách dict mô tả từng lỗi đã bơm
    """
    if seed is not None:
        random.seed(seed)

    weights = error_weights or DEFAULT_ERROR_WEIGHTS

    words = text.split()
    n_words = len(words)
    if n_words == 0:
        return text, []

    # Tính số lỗi cần bơm
    n_errors = max(min_errors, min(max_errors, int(n_words * error_rate)))

    # Chọn vị trí random (tránh trùng lặp)
    # Loại bỏ dấu câu đứng một mình ra khỏi danh sách ứng viên
    candidates = [
        i for i in range(n_words)
        if len(words[i]) > 1 or words[i].isalpha()
    ]
    if len(candidates) < n_errors:
        n_errors = len(candidates)

    chosen_positions = random.sample(candidates, n_errors)

    # Chọn loại lỗi cho mỗi vị trí theo trọng số
    error_types = list(weights.keys())
    error_type_weights = [weights[t] for t in error_types]

    injection_log: list[dict] = []
    modified_words = words.copy()

    for pos in chosen_positions:
        original_word = words[pos]

        # Chọn loại lỗi (weighted random)
        chosen_type = random.choices(error_types, weights=error_type_weights, k=1)[0]

        new_word = None
        attempts = 0
        # Thử tối đa 5 loại lỗi nếu loại được chọn không áp dụng được
        tried_types = set()
        while new_word is None and attempts < 5:
            if chosen_type == "phu_am_dau":
                new_word = _inject_phu_am_dau(original_word)
            elif chosen_type == "sai_van":
                new_word = _inject_sai_van(original_word)
            elif chosen_type == "dau_thanh":
                new_word = _inject_sai_dau_thanh(original_word)
            elif chosen_type == "viet_hoa":
                new_word = _inject_sai_viet_hoa(original_word, pos)
            elif chosen_type == "bo_sot_them":
                new_word = _inject_bo_sot_them(original_word)

            if new_word is None:
                tried_types.add(chosen_type)
                remaining = [t for t in error_types if t not in tried_types]
                if not remaining:
                    break
                chosen_type = random.choice(remaining)
            attempts += 1

        if new_word is not None and new_word != original_word:
            modified_words[pos] = new_word
            injection_log.append({
                "position": pos,
                "original": original_word,
                "injected": new_word,
                "error_type": chosen_type,
            })

    noisy_text = " ".join(modified_words)
    return noisy_text, injection_log


# ============================================================
# HÀM TIỆN ÍCH: Sinh dataset hàng loạt
# ============================================================

def generate_dataset(
    clean_texts: list[str],
    error_rate: float = 0.15,
    min_errors: int = 2,
    max_errors: int = 5,
    seed: int = 42,
) -> tuple[list[str], list[str], list[list[dict]]]:
    """
    Sinh dataset (input_texts, reference_texts) từ danh sách văn bản sạch.

    Args:
        clean_texts: Danh sách câu/đoạn văn chuẩn (không lỗi).
        error_rate:  Tỷ lệ lỗi trên mỗi đoạn.
        min_errors:  Số lỗi tối thiểu / đoạn.
        max_errors:  Số lỗi tối đa / đoạn.
        seed:        Random seed.

    Returns:
        (input_texts, reference_texts, all_logs)
    """
    random.seed(seed)
    input_texts: list[str] = []
    reference_texts: list[str] = []
    all_logs: list[list[dict]] = []

    for i, clean in enumerate(clean_texts):
        noisy, log = inject_errors(
            clean,
            error_rate=error_rate,
            min_errors=min_errors,
            max_errors=max_errors,
            seed=seed + i,
        )
        input_texts.append(noisy)
        reference_texts.append(clean)
        all_logs.append(log)

    return input_texts, reference_texts, all_logs


# ============================================================
# DEMO
# ============================================================
if __name__ == "__main__":
    # Demo inject lỗi
    examples = [
        "Hôm nay trời rất đẹp, em đi học sớm và gặp bạn Nguyễn Văn Hùng ở cổng trường.",
        "Mùa xuân đến, hoa mai nở vàng rực rỡ khắp nơi. Chim chóc hót líu lo trên cành cây.",
        "Sáng nay mẹ đưa em đến trường bằng xe đạp. Trên đường đi em thấy cánh đồng lúa xanh mướt.",
        "Bà ngoại kể cho em nghe câu chuyện cổ tích rất hay. Em rất thích nghe bà kể chuyện.",
    ]

    print("=" * 70)
    print("DEMO: Data Synthesizer — Inject lỗi chính tả")
    print("=" * 70)

    for i, text in enumerate(examples):
        noisy, log = inject_errors(text, error_rate=0.15, min_errors=2, max_errors=4, seed=i)
        print(f"\n--- Mẫu {i+1} ---")
        print(f"  Gốc : {text}")
        print(f"  Lỗi : {noisy}")
        print(f"  Log : {log}")
