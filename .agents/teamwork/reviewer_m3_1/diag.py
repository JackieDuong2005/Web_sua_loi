import subprocess
import sys
import time
import socket

def is_open(host="127.0.0.1", port=8000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

print("Testing uvicorn startup...")
t0 = time.time()
p = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "python_service.main:app", "--host", "127.0.0.1", "--port", "8000"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

ready = False
for i in range(50):
    if is_open():
        print(f"Uvicorn became ready in {time.time() - t0:.2f}s (iteration {i})")
        ready = True
        break
    time.sleep(0.5)

if not ready:
    print(f"Not ready after {time.time() - t0:.2f}s! Return code: {p.poll()}")
    try:
        out, err = p.communicate(timeout=2)
        print("STDOUT:", out.decode(errors="ignore"))
        print("STDERR:", err.decode(errors="ignore"))
    except Exception as e:
        print("Error reading output:", e)

p.terminate()
try:
    p.wait(timeout=3)
except Exception:
    p.kill()
print("Cleaned up process.")
