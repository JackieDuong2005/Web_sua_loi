import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('python_service/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

endpoints = re.findall(r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']', code)
print(f"Total FastAPI endpoints in python_service/main.py: {len(endpoints)}")
for m, ep in endpoints:
    print(f"{m.upper():6} {ep}")
