import sys
import os
import paramiko
import time
import socket

RPI_IP = "192.168.1.56"
RPI_USER = "jackie"
SSH_PUB_KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519.pub")

def check_port(ip, port, timeout=2):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    result = sock.connect_ex((ip, port))
    sock.close()
    return result == 0

def enable_vnc(password):
    print(f"[*] Đang kết nối SSH tới {RPI_USER}@{RPI_IP}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(RPI_IP, port=22, username=RPI_USER, password=password, timeout=10)
        print("[✔] Đăng nhập SSH thành công!")
    except Exception as e:
        print(f"[✗] Đăng nhập thất bại: {e}")
        return False

    # 1. Thêm public key vào authorized_keys để tự động hóa hoàn toàn các lần sau
    try:
        if os.path.exists(SSH_PUB_KEY_PATH):
            with open(SSH_PUB_KEY_PATH, "r", encoding="utf-8") as f:
                pub_key = f.read().strip()
            print("[*] Cài đặt SSH Public Key vào ~/.ssh/authorized_keys...")
            setup_key_cmd = f"mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qxF '{pub_key}' ~/.ssh/authorized_keys 2>/dev/null || echo '{pub_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
            client.exec_command(setup_key_cmd)
            print("[✔] Đã lưu SSH Key (từ nay có thể SSH tự động không cần mật khẩu)!")
    except Exception as e:
        print(f"[⚠] Không thể lưu SSH Key: {e}")

    # 2. Bật VNC qua raspi-config và khởi động service
    print("[*] Đang kích hoạt VNC Server trên Raspberry Pi...")
    commands = [
        f"echo '{password}' | sudo -S raspi-config nonint do_vnc 0",
        f"echo '{password}' | sudo -S systemctl enable --now wayvnc 2>/dev/null || echo '{password}' | sudo -S systemctl enable --now vncserver-x11-serviced 2>/dev/null",
        f"echo '{password}' | sudo -S systemctl restart wayvnc 2>/dev/null || echo '{password}' | sudo -S systemctl restart vncserver-x11-serviced 2>/dev/null"
    ]
    
    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        stdout.channel.recv_exit_status()

    client.close()

    print("[*] Đang kiểm tra cổng VNC (Port 5900)...")
    time.sleep(2)
    if check_port(RPI_IP, 5900):
        print(f"[✔] HOÀN TẤT: VNC Server đã bật và đang lắng nghe tại {RPI_IP}:5900")
        return True
    else:
        print(f"[⚠] VNC đã được cấu hình nhưng cổng 5900 chưa phản hồi (có thể cần khởi động lại hoặc kiểm tra Wayland/X11).")
        return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pwd = sys.argv[1]
    else:
        pwd = input("Nhập mật khẩu cho jackie@192.168.1.56: ")
    enable_vnc(pwd)
