import sys
import os
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python_service"))

from tts_engine import inject_pedagogical_punctuation
from main import direct_prosody_script, segment_into_pedagogical_clauses

text = """Gió mùa thu se lạnh, bầu trời xanh trong vắt.
- Bác Hồ từng căn dặn: "Học tập tốt, lao động tốt..."!"""

print("=== ORIGINAL TEXT ===")
print(text)

res = inject_pedagogical_punctuation(text, enabled=True)
print("\n=== INJECTED PUNCTUATION ===")
print(res)

assert ", phẩy," in res, "Missing phẩy"
assert ", chấm." in res, "Missing chấm"
assert ", xuống dòng." in res, "Missing xuống dòng"
assert ", hai chấm," in res, "Missing hai chấm"
assert ", mở ngoặc kép," in res, "Missing mở ngoặc kép"
assert ", đóng ngoặc kép," in res, "Missing đóng ngoặc kép"
assert "..." in res, "Missing ellipsis"
assert ", chấm than." in res, "Missing chấm than"

# Test idempotent
res2 = inject_pedagogical_punctuation(res, enabled=True)
assert res == res2, f"Idempotent failed!\nRes1:\n{res}\nRes2:\n{res2}"
print("\n[OK] Idempotent passed!")

# Test direct_prosody_script
prosody = direct_prosody_script(
    "Gió mùa thu se lạnh, bầu trời xanh trong vắt. Bạn có thích mùa thu không?",
    difficult_words=["se lạnh", "trong vắt"],
    grade=3
)
print("\n=== PROSODY CLAUSES ===")
for c in prosody["clauses"]:
    print(f"[{c['index']}] text: {c['text']} | style: {c['style']} | pause: {c['pause_sec']}s | starts_para: {c['starts_new_paragraph']}")

assert prosody["clauses"][0]["starts_new_paragraph"] is True
assert prosody["clauses"][0]["style"] == "emphasis"
assert prosody["clauses"][0]["pause_sec"] >= 4.0

print("\nALL DICTATION UNIT TESTS PASSED SUCCESSFULLY!")
