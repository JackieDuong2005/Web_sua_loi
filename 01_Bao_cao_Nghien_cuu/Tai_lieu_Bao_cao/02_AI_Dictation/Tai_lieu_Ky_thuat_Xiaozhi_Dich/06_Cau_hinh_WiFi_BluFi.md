# Hướng Dẫn Cấu Hình Wi-Fi Bằng Bluetooth BLE (BluFi Provisioning)

> **Tài liệu dịch kỹ thuật từ**: `xiaozhi-esp32-main/docs/blufi.md`  
> **Áp dụng cho**: Cấu hình mạng Wi-Fi ban đầu cho Robot Xiaozhi trong lớp học qua điện thoại

---

## 1. Tổng Quan về BluFi

**BluFi (Bluetooth Low Energy WiFi Provisioning)** là giải pháp truyền thông tin mạng Wi-Fi (Tên SSID và Mật khẩu) từ điện thoại thông minh sang chip ESP32 thông qua sóng Bluetooth năng lượng thấp (BLE). 

Giải pháp này giúp giáo viên dễ dàng kết nối Robot vào mạng Wi-Fi trường học lần đầu tiên mà không cần cắm cáp nạp code hay kết nối vào điểm phát sóng phụ (Hotspot).

---

## 2. Điều Kiện Tiên Quyết (Prerequisites)

* Phần cứng sử dụng chip ESP32-S3 có hỗ trợ BLE.
* Trong cấu hình `idf.py menuconfig`, bật mục:
  `WiFi Configuration Method -> Esp Blufi` (`CONFIG_USE_ESP_BLUFI_WIFI_PROVISIONING=y`).
* Bật một trong hai ngăn xếp Bluetooth: `CONFIG_BT_BLUEDROID_ENABLED` hoặc `CONFIG_BT_NIMBLE_ENABLED`.

---

## 3. Quy Trình Cấu Hình Qua Điện Thoại (4 Bước)

```text
  [📱 Điện thoại Giáo viên]                               [🤖 Robot ESP32-S3]
              │                                                   │
              │── 1. Quét tìm thiết bị Bluetooth "Xiaozhi-Blufi" ─▶│
              │                                                   │
              │── 2. Yêu cầu danh sách Wi-Fi xung quanh ──────────▶│
              │◀── Trả về danh sách Wi-Fi (SSID, RSSI) ───────────┤
              │                                                   │
              │── 3. Gửi Tên Wi-Fi (SSID) + Mật khẩu (Password) ──▶│
              │                                                   │
              │                                   [Lưu NVS Flash]
              │                                   [Thử kết nối Wi-Fi]
              │                                                   │
              │◀── 4. Báo cáo kết quả kết nối thành công ─────────┤
```

### Các bước thực hiện:
1. **Khởi động**: Khi bật nguồn lần đầu hoặc khi nhấn giữ nút BOOT trong 3 giây lúc bật máy, robot tự động phát sóng Bluetooth BLE với tên `"Xiaozhi-Blufi"`.
2. **Mở App trên điện thoại**: Mở ứng dụng **EspBlufi** (có sẵn trên Android/iOS), quét và chọn robot.
3. **Nhập mật khẩu**: Chọn tên mạng Wi-Fi của trường/lớp học, nhập mật khẩu và nhấn "Connect".
4. **Lưu trữ**: Chip ESP32 tự động lưu thông tin Wi-Fi vào bộ nhớ Flash (phân vùng NVS) và tự động kết nối lại ở tất cả các lần bật nguồn tiếp theo mà không cần cấu hình lại.
