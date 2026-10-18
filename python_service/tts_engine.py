"""
Module: python_service/tts_engine.py
Động cơ tổng hợp giọng nói OFFLINE ĐƠN TẦNG cho ViHand Grade (chạy trên Raspberry Pi & Local Machine)
Sử dụng Piper TTS (VITS ONNX Runtime) - Real-Time Factor < 0.15 trên ARM Cortex-A72
Hỗ trợ Multi-Voice, Voice Cloning (ONNX), Text Normalizer và phát ra Loa ngoài Raspberry Pi
"""

import os
import re
import sys
import json
import wave
import io
import time
import logging
import threading
import urllib.request
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger("vihand.tts_engine")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models", "tts")
os.makedirs(MODELS_DIR, exist_ok=True)

# URL tải các model tiếng Việt chuẩn từ Hugging Face rhasspy/piper-voices
HF_BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN"
OFFICIAL_MODELS_MAP = {
    "vi_VN-vais1000-medium": {
        "name": "Cô Hoài My (ONNX)",
        "gender": "f",
        "region": "Bắc",
        "desc": "Nữ · Truyền cảm, ấm áp, chuẩn mực sư phạm (VAIS1000 22kHz)",
        "onnx_url": f"{HF_BASE_URL}/vais1000/medium/vi_VN-vais1000-medium.onnx",
        "json_url": f"{HF_BASE_URL}/vais1000/medium/vi_VN-vais1000-medium.onnx.json",
        "file_base": "vi_VN-vais1000-medium",
        "recommended": True,
    },
    "vi_VN-25hours_single-low": {
        "name": "Cô Trúc Ly (Light)",
        "gender": "f",
        "region": "Bắc",
        "desc": "Nữ · Nhẹ nhàng, siêu tiết kiệm tài nguyên Pi (25h Single)",
        "onnx_url": f"{HF_BASE_URL}/25hours_single/low/vi_VN-25hours_single-low.onnx",
        "json_url": f"{HF_BASE_URL}/25hours_single/low/vi_VN-25hours_single-low.onnx.json",
        "file_base": "vi_VN-25hours_single-low",
        "recommended": False,
    },
    "vi_VN-vivos-x_low": {
        "name": "Thầy Nam Minh (VIVOS)",
        "gender": "m",
        "region": "Bắc",
        "desc": "Nam · Dõng dạc, rõ ràng, tập trung vào trọng âm",
        "onnx_url": f"{HF_BASE_URL}/vivos/x_low/vi_VN-vivos-x_low.onnx",
        "json_url": f"{HF_BASE_URL}/vivos/x_low/vi_VN-vivos-x_low.onnx.json",
        "file_base": "vi_VN-vivos-x_low",
        "recommended": False,
    },
}

# ==============================================================================
# 1. BỘ TIỀN XỬ LÝ & CHUẨN HÓA VĂN BẢN TIẾNG VIỆT SƯ PHẠM (TEXT NORMALIZER)
# ==============================================================================

UNIT_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]


def _two_digits_to_vietnamese(n: int) -> str:
    ten = n // 10
    unit = n % 10
    if ten == 0:
        return UNIT_DIGITS[unit]
    elif ten == 1:
        if unit == 0:
            return "mười"
        elif unit == 5:
            return "mười lăm"
        else:
            return f"mười {UNIT_DIGITS[unit]}"
    else:
        prefix = f"{UNIT_DIGITS[ten]} mươi"
        if unit == 0:
            return prefix
        elif unit == 1:
            return f"{prefix} mốt"
        elif unit == 4:
            return f"{prefix} tư"
        elif unit == 5:
            return f"{prefix} lăm"
        else:
            return f"{prefix} {UNIT_DIGITS[unit]}"


def _three_digits_to_vietnamese(n: int, is_highest: bool = True) -> str:
    hundred = n // 100
    rem = n % 100
    if hundred == 0 and is_highest:
        return _two_digits_to_vietnamese(rem)
    prefix = f"{UNIT_DIGITS[hundred]} trăm"
    if rem == 0:
        return prefix
    if rem < 10:
        return f"{prefix} linh {UNIT_DIGITS[rem]}"
    return f"{prefix} {_two_digits_to_vietnamese(rem)}"


def number_to_vietnamese(n: int) -> str:
    """Chuyển đổi số nguyên thành chuỗi đọc tiếng Việt chuẩn sư phạm."""
    if n == 0:
        return "không"
    if n < 0:
        return f"âm {number_to_vietnamese(-n)}"

    groups = []
    temp = n
    while temp > 0:
        groups.append(temp % 1000)
        temp //= 1000

    scales = ["", "nghìn", "triệu", "tỷ"]
    parts = []
    for i in range(len(groups) - 1, -1, -1):
        g = groups[i]
        if g == 0:
            continue
        g_text = _three_digits_to_vietnamese(g, is_highest=(i == len(groups) - 1))
        scale = scales[i % 4]
        if scale:
            parts.append(f"{g_text} {scale}")
        else:
            parts.append(g_text)

    return " ".join(parts).strip()


def normalize_vietnamese_text(text: str) -> str:
    """Chuẩn hóa văn bản sư phạm tiểu học trước khi đưa vào mô hình TTS:
    - Đổi số thành chữ: 3A -> ba A, ngày 15/10 -> ngày mười lăm tháng mười
    - Chuẩn hóa ký hiệu SGK: tr. -> trang, bài 2 -> bài hai
    - Xóa các ký tự đặc biệt gây giật giọng đọc
    """
    if not text:
        return ""

    t = text.strip()

    # 1. Chuẩn hóa ngày tháng năm (dd/mm/yyyy hoặc dd-mm-yyyy, có hoặc không có từ "ngày" đi trước)
    def _sub_date(m):
        has_ngay = bool(m.group(1))
        d, mth, y = m.group(2), m.group(3), m.group(4)
        d_str = number_to_vietnamese(int(d))
        m_str = number_to_vietnamese(int(mth))
        y_str = number_to_vietnamese(int(y))
        prefix = "ngày " if not has_ngay else ""
        return f"{prefix}{d_str} tháng {m_str} năm {y_str}"

    t = re.sub(r"\b(ngày\s+)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b", _sub_date, t, flags=re.IGNORECASE)

    # 2. Chuẩn hóa tên lớp học: Lớp 1A -> Lớp một A, 3B -> ba B
    def _sub_class(m):
        prefix, num, letter = m.group(1) or "", m.group(2), m.group(3).upper()
        num_str = number_to_vietnamese(int(num))
        return f"{prefix}{num_str} {letter}".strip()

    t = re.sub(r"\b(Lớp\s+|lớp\s+)?(\d{1,2})([A-Ea-e])\b", _sub_class, t)

    # 3. Chuẩn hóa từ viết tắt sư phạm
    abbreviations = {
        r"\btr\.": "trang ",
        r"\bSGK\b": "sách giáo khoa",
        r"\bGDPT\b": "giáo dục phổ thông",
        r"\bVD\b": "ví dụ",
        r"\bkg\b": "ki lô gam",
        r"\bkm\b": "ki lô mét",
        r"\bcm\b": "xen ti mét",
        r"\bm\b": "mét",
    }
    for pat, rep in abbreviations.items():
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)

    # 4. Chuẩn hóa các số còn lại thành chữ
    def _sub_nums(m):
        try:
            val = int(m.group(0))
            return number_to_vietnamese(val)
        except Exception:
            return m.group(0)

    t = re.sub(r"\b\d+\b", _sub_nums, t)

    # 5. Dọn dẹp khoảng trắng và dấu câu
    t = re.sub(r'["“”«»]', '', t)
    t = re.sub(r"\s+", " ", t).strip()

    return t


# ==============================================================================
# 2. QUẢN LÝ MODEL ONNX VÀ PIPER TTS ENGINE
# ==============================================================================

class OfflineTTSEngine:
    """Quản lý các mô hình Piper TTS ONNX tiếng Việt chạy hoàn toàn ngoại tuyến."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(OfflineTTSEngine, cls).__new__(cls)
                cls._instance._init_engine()
            return cls._instance

    def _init_engine(self):
        self._loaded_voices: Dict[str, Any] = {}
        self._piper_voice_cls = None
        self._import_lock = threading.Lock()

    def _get_piper_class(self):
        """Lazy load thư viện piper."""
        with self._import_lock:
            if self._piper_voice_cls is None:
                try:
                    from piper import PiperVoice
                    self._piper_voice_cls = PiperVoice
                    logger.info("✅ Đã nạp thành công module piper.PiperVoice")
                except ImportError:
                    logger.warning("⚠️ Module 'piper' chưa được cài đặt qua pip. Sẽ kiểm tra lệnh nhị phân 'piper'.")
            return self._piper_voice_cls

    def list_available_voices(self) -> List[Dict[str, Any]]:
        """Quét thư mục models/tts/ và kết hợp với danh mục có sẵn để trả về danh sách giọng."""
        voices = []

        # 1. Các giọng chuẩn đã biết
        for vid, info in OFFICIAL_MODELS_MAP.items():
            onnx_path = os.path.join(MODELS_DIR, f"{info['file_base']}.onnx")
            is_downloaded = os.path.exists(onnx_path)
            voices.append({
                "id": vid,
                "name": info["name"],
                "gender": info["gender"],
                "region": info["region"],
                "desc": info["desc"],
                "isOffline": True,
                "isDownloaded": is_downloaded,
                "recommended": info.get("recommended", False),
                "isCustom": False,
            })

        # 2. Quét các file .onnx tùy biến (Custom Cloned Voices do giáo viên nạp)
        if os.path.exists(MODELS_DIR):
            for fname in os.listdir(MODELS_DIR):
                if fname.endswith(".onnx"):
                    base_name = fname[:-5]
                    # Bỏ qua nếu đã nằm trong danh mục chuẩn
                    if any(info["file_base"] == base_name for info in OFFICIAL_MODELS_MAP.values()):
                        continue

                    json_path = os.path.join(MODELS_DIR, f"{base_name}.onnx.json")
                    voices.append({
                        "id": base_name,
                        "name": f"Giọng: {base_name.replace('_', ' ').title()}",
                        "gender": "f",
                        "region": "Tùy biến",
                        "desc": "Giọng nhân bản (Voice Cloning) nạp từ file ONNX giáo viên",
                        "isOffline": True,
                        "isDownloaded": True,
                        "recommended": False,
                        "isCustom": True,
                    })

        return voices

    def ensure_model_files(self, voice_id: str) -> Tuple[Optional[str], Optional[str]]:
        """Đảm bảo file .onnx và .onnx.json tồn tại, tự động tải về nếu là model chuẩn."""
        # 1. Tìm trong OFFICIAL_MODELS_MAP
        matched_info = None
        for k, v in OFFICIAL_MODELS_MAP.items():
            if voice_id == k or voice_id == v["file_base"]:
                matched_info = v
                break

        if matched_info:
            file_base = matched_info["file_base"]
            onnx_path = os.path.join(MODELS_DIR, f"{file_base}.onnx")
            json_path = os.path.join(MODELS_DIR, f"{file_base}.onnx.json")

            if not os.path.exists(onnx_path) or not os.path.exists(json_path):
                logger.info(f"📥 Đang tự động tải mô hình {file_base} từ Hugging Face...")
                try:
                    if not os.path.exists(json_path):
                        urllib.request.urlretrieve(matched_info["json_url"], json_path)
                    if not os.path.exists(onnx_path):
                        urllib.request.urlretrieve(matched_info["onnx_url"], onnx_path)
                    logger.info(f"✅ Tải thành công mô hình {file_base}")
                except Exception as e:
                    logger.error(f"❌ Lỗi khi tải mô hình {file_base}: {e}")
                    return None, None

            return onnx_path, json_path

        # 2. Tìm model custom trực tiếp theo tên file
        custom_onnx = os.path.join(MODELS_DIR, f"{voice_id}.onnx")
        custom_json = os.path.join(MODELS_DIR, f"{voice_id}.onnx.json")
        if os.path.exists(custom_onnx):
            if not os.path.exists(custom_json):
                # Tạo config json tối thiểu nếu bị thiếu
                default_config = {
                    "audio": {"sample_rate": 22050},
                    "espeak": {"voice": "vi"},
                    "inference": {"noise_scale": 0.667, "length_scale": 1.0, "noise_w": 0.8},
                }
                with open(custom_json, "w", encoding="utf-8") as f:
                    json.dump(default_config, f)
            return custom_onnx, custom_json

        # Fallback về model mặc định
        default_base = OFFICIAL_MODELS_MAP["vi_VN-vais1000-medium"]["file_base"]
        return self.ensure_model_files(default_base)

    def _get_or_load_voice(self, voice_id: str):
        """Nạp model ONNX vào bộ nhớ RAM Cache."""
        onnx_path, json_path = self.ensure_model_files(voice_id)
        if not onnx_path or not os.path.exists(onnx_path):
            raise FileNotFoundError(f"Không tìm thấy file model ONNX cho giọng '{voice_id}'")

        cache_key = onnx_path
        if cache_key in self._loaded_voices:
            return self._loaded_voices[cache_key]

        PiperVoice = self._get_piper_class()
        if PiperVoice is not None:
            logger.info(f"⏳ Đang nạp Piper Voice từ: {onnx_path}")
            t0 = time.time()
            voice = PiperVoice.load(onnx_path, config_path=json_path)
            self._loaded_voices[cache_key] = voice
            logger.info(f"✅ Đã nạp Piper Voice '{voice_id}' trong {time.time() - t0:.2f}s")
            return voice

        return None

    def synthesize_wav(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bytes:
        """Tổng hợp chuỗi văn bản thành dữ liệu âm thanh định dạng WAV."""
        norm_text = normalize_vietnamese_text(text)
        if not norm_text:
            raise ValueError("Văn bản sau khi chuẩn hóa bị rỗng")

        # Quy đổi tốc độ đọc sang length_scale (tốc độ chậm -> length_scale > 1.0)
        # rate = "-15%" -> chậm hơn 15% -> length_scale = 1.15
        # rate = "-25%" -> chậm hơn 25% -> length_scale = 1.25
        # rate = "+10%" -> nhanh hơn 10% -> length_scale = 0.90
        length_scale = 1.15  # Mặc định chuẩn sư phạm
        try:
            clean_rate = rate.replace("%", "").strip()
            rate_val = float(clean_rate)
            if rate_val < 0:
                length_scale = 1.0 + abs(rate_val) / 100.0
            else:
                length_scale = max(0.5, 1.0 - rate_val / 100.0)
        except Exception:
            length_scale = 1.15

        PiperVoice = self._get_piper_class()
        if PiperVoice is not None:
            voice = self._get_or_load_voice(voice_id)
            if voice:
                syn_config = None
                try:
                    from piper import SynthesisConfig
                    syn_config = SynthesisConfig(length_scale=length_scale)
                except Exception:
                    pass

                wav_io = io.BytesIO()
                with wave.open(wav_io, "wb") as wav_file:
                    voice.synthesize_wav(norm_text, wav_file, syn_config=syn_config)
                return wav_io.getvalue()

        # Nếu chưa có thư viện piper trong python, thử gọi lệnh piper CLI nếu có
        import shutil
        import subprocess
        piper_bin = shutil.which("piper")
        if piper_bin:
            onnx_path, json_path = self.ensure_model_files(voice_id)
            cmd = [
                piper_bin,
                "--model", onnx_path,
                "--config", json_path,
                "--length_scale", str(length_scale),
                "--output_file", "-"
            ]
            proc = subprocess.run(cmd, input=norm_text.encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if proc.returncode == 0 and len(proc.stdout) > 44:
                return proc.stdout

        # Nếu hoàn toàn chưa tải được model ONNX hoặc piper, sinh một file WAV thông báo
        logger.warning(f"⚠️ Chưa có Piper engine hoặc file model. Tạo âm thanh dự phòng cho '{norm_text[:30]}...'")
        return self._generate_beeps_wav(norm_text)

    def play_on_local_speaker(self, text: str, voice_id: str = "vi_VN-vais1000-medium", rate: str = "-15%") -> bool:
        """Phát âm thanh trực tiếp ra Loa phần cứng cắm trên Raspberry Pi (3.5mm AUX / USB Speaker)."""
        import tempfile
        import subprocess

        audio_bytes = self.synthesize_wav(text, voice_id=voice_id, rate=rate)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Trên Linux / Raspberry Pi: Dùng aplay của ALSA
            if sys.platform.startswith("linux"):
                res = subprocess.run(["aplay", "-q", tmp_path], check=False)
                return res.returncode == 0
            elif sys.platform.startswith("win"):
                import winsound
                winsound.PlaySound(tmp_path, winsound.SND_FILENAME)
                return True
            else:
                res = subprocess.run(["afplay", tmp_path], check=False)
                return res.returncode == 0
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    def _generate_beeps_wav(self, text: str) -> bytes:
        """Tạo sóng âm thanh PCM 16-bit cơ bản phòng trường hợp máy chưa nạp xong model."""
        import math
        sample_rate = 22050
        duration = 0.8
        freq = 440.0
        n_samples = int(sample_rate * duration)
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            samples = bytearray()
            for i in range(n_samples):
                val = int(32767.0 * 0.3 * math.sin(2.0 * math.pi * freq * (i / sample_rate)))
                samples.extend(val.to_bytes(2, byteorder="little", signed=True))
            wf.writeframes(samples)
        wav_io.seek(0)
        return wav_io.read()


# Khởi tạo singleton
tts_engine = OfflineTTSEngine()
