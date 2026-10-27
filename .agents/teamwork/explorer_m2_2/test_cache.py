import hashlib
import time
import threading
from collections import OrderedDict
from typing import Optional

_PROSODY_CACHE_MAX_ENTRIES = 128
_prosody_script_cache: OrderedDict[str, dict] = OrderedDict()
_prosody_cache_lock = threading.Lock()

def compute_prosody_cache_key(passage: str, grade: int, chunk_mode: str, difficult_words: list) -> str:
    norm_passage = (passage or "").strip().lower()
    norm_words = ",".join(sorted(w.strip().lower() for w in (difficult_words or [])))
    key_str = f"{norm_passage}|grade={grade}|mode={chunk_mode}|diff={norm_words}"
    return hashlib.sha256(key_str.encode("utf-8")).hexdigest()

def get_cached_prosody_script(key: str) -> Optional[dict]:
    with _prosody_cache_lock:
        if key in _prosody_script_cache:
            _prosody_script_cache.move_to_end(key)
            return _prosody_script_cache[key]
    return None

def set_cached_prosody_script(key: str, data: dict):
    with _prosody_cache_lock:
        if key in _prosody_script_cache:
            _prosody_script_cache.move_to_end(key)
        _prosody_script_cache[key] = data
        if len(_prosody_script_cache) > _PROSODY_CACHE_MAX_ENTRIES:
            _prosody_script_cache.popitem(last=False)

if __name__ == "__main__":
    # Test key computation
    k1 = compute_prosody_cache_key("Gió mùa thu se lạnh.", 3, "phrase", ["se lạnh"])
    set_cached_prosody_script(k1, {"clauses": [{"text": "Gió mùa thu se lạnh."}]})
    
    t0 = time.perf_counter()
    res = get_cached_prosody_script(k1)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    print(f"Cache hit latency: {elapsed_ms:.4f} ms (expected < 1ms)")
    assert res is not None, "Cache hit failed"
    
    # Test capacity eviction
    for i in range(200):
        k = compute_prosody_cache_key(f"Sentence {i}", 3, "phrase", [])
        set_cached_prosody_script(k, {"index": i})
    
    print(f"Cache size after 201 entries: {len(_prosody_script_cache)} (max: {_PROSODY_CACHE_MAX_ENTRIES})")
    assert len(_prosody_script_cache) == _PROSODY_CACHE_MAX_ENTRIES
    # First entry k1 must be evicted
    assert get_cached_prosody_script(k1) is None, "Old entry should have been evicted"
    print("LRU Cache verification passed!")
