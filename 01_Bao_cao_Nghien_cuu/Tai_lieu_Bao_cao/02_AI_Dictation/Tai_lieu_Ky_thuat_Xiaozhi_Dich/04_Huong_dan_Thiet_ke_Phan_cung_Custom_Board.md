# Hướng Dẫn Thiết Kế & Cấu Hình Phần Cứng Tự Chọn (Custom Board Guide)

> **Tài liệu dịch kỹ thuật từ**: `xiaozhi-esp32-main/docs/custom-board.md`  
> **Áp dụng cho**: Chế tạo và gán chân GPIO cho phần cứng Robot ESP32-S3 trong ViHand Grade

---

## 1. Lưu Ý Quan Trọng Khi Thiết Kế Phần Cứng

> ⚠️ **Cảnh báo an toàn cấu hình**: Đối với một bo mạch tự thiết kế có sơ đồ chân I/O khác với các bo mạch thương mại có sẵn, **tuyệt đối không ghi đè** lên cấu hình của bo mạch gốc. Phải luôn tạo một thư mục bo mạch mới (hoặc khai báo cấu hình riêng trong `config.json`).
>
> Việc ghi đè cấu hình rất nguy hiểm vì các bản cập nhật firmware OTA từ server có thể vô tình nạp đè firmware mặc định làm sai chân GPIO của mạch tự chế.

---

## 2. Cấu Trúc Thư Mục Một Bo Mạch Phần Cứng

Mỗi bo mạch được đặt trong một thư mục con thuộc `main/boards/[tên-bo-mạch]/` với 4 file chuẩn:

* `xxx_board.cc`: Mã nguồn C++ khởi tạo phần cứng, I2C, SPI, Audio Codec, Màn hình, Nút bấm.
* `config.h`: Định nghĩa sơ đồ chân GPIO và các hằng số phần cứng.
* `config.json`: Cấu hình dung lượng Flash, Partition Table cho script build `scripts/release.py`.
* `README.md`: Hướng dẫn đấu dây và ghi chú phần cứng.

---

## 3. Các Bước Tạo Bo Mạch Mới Cho Robot ViHand Grade

### Bước 1: Tạo thư mục bo mạch
```bash
mkdir main/boards/vihand-robot-esp32s3
```

---

### Bước 2: Viết file định nghĩa chân phần cứng (`config.h`)

File `config.h` chỉ định rõ các chân giao tiếp I2S (Mic & Loa), SPI (Màn hình), I2C (Audio Codec) và nút bấm:

```c
#ifndef _BOARD_CONFIG_H_
#define _BOARD_CONFIG_H_

#include <driver/gpio.h>

// 1. Cấu hình Âm thanh (Audio Sample Rate & I2S Pins)
#define AUDIO_INPUT_SAMPLE_RATE  16000  // Tần số thu âm Micro (16kHz chuẩn cho ASR)
#define AUDIO_OUTPUT_SAMPLE_RATE 24000  // Tần số phát loa TTS (24kHz cho giọng đọc rõ)

// Chân I2S Audio Bus
#define AUDIO_I2S_GPIO_BCLK GPIO_NUM_8   // Bit Clock (SCK)
#define AUDIO_I2S_GPIO_WS   GPIO_NUM_12  // Word Select / L/R Clock (WS)
#define AUDIO_I2S_GPIO_DIN  GPIO_NUM_7   // Dữ liệu Micro vào (Data In)
#define AUDIO_I2S_GPIO_DOUT GPIO_NUM_11  // Dữ liệu Loa/Amp ra (Data Out)

// Chân điều khiển Audio Codec / Amply bật tắt (Power Amp PA Pin)
#define AUDIO_CODEC_PA_PIN       GPIO_NUM_13

// 2. Cấu hình Nút bấm (Tactile Buttons)
#define BOOT_BUTTON_GPIO        GPIO_NUM_9   // Nút bấm đa năng / Cấu hình Wi-Fi / Tạm dừng

// 3. Cấu hình Màn hình hiển thị LCD ST7789 qua bus SPI
#define DISPLAY_SPI_SCK_PIN     GPIO_NUM_3   // Chân SPI Clock
#define DISPLAY_SPI_MOSI_PIN    GPIO_NUM_5   // Chân SPI Data (MOSI)
#define DISPLAY_DC_PIN          GPIO_NUM_6   // Chân Data/Command (D/C)
#define DISPLAY_SPI_CS_PIN      GPIO_NUM_4   // Chân Chip Select (CS)

// Kích thước & Hướng hiển thị màn hình
#define DISPLAY_WIDTH   240                  // Chiều rộng (pixel)
#define DISPLAY_HEIGHT  240                  // Chiều cao (pixel)
#define DISPLAY_MIRROR_X true
#define DISPLAY_MIRROR_Y false
#define DISPLAY_SWAP_XY  true

#define DISPLAY_BACKLIGHT_PIN GPIO_NUM_2     // Chân điều khiển độ sáng đèn nền LED Backlight

#endif // _BOARD_CONFIG_H_
```

---

### Bước 3: Viết file cấu hình biên dịch (`config.json`)

Chỉ định loại chip (ESP32-S3), dung lượng bộ nhớ Flash và bảng phân vùng bộ nhớ (Partition Table):

```json
{
    "target": "esp32s3",
    "builds": [
        {
            "name": "vihand-robot-esp32s3",
            "sdkconfig_append": [
                "CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y",
                "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME=\"partitions/v2/16m.csv\"",
                "CONFIG_LANGUAGE_VI_VN=y",
                "CONFIG_USE_DEVICE_AEC=y"
            ]
        }
    ]
}
```

*Một số macro cấu hình thường dùng:*
* `CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y`: Cấu hình chip Flash 16MB.
* `CONFIG_PARTITION_TABLE_CUSTOM_FILENAME`: Chọn bảng phân vùng chứa firmware + OTA + Assets.
* `CONFIG_USE_DEVICE_AEC=y`: Bật tính năng chống vọng âm (Acoustic Echo Cancellation) trên phần cứng.

---

### Bước 4: Triển khai lớp điều khiển Bo mạch (`vihand_robot_board.cc`)

Lớp C++ kế thừa từ `WifiBoard` để khởi tạo toàn bộ ngoại vi:

```cpp
#include "wifi_board.h"
#include "codecs/simple_audio_codec.h"
#include "display/lcd_display.h"
#include "application.h"
#include "button.h"
#include "config.h"
#include "mcp_server.h"

#include <esp_log.h>
#include <driver/spi_common.h>

#define TAG "ViHandRobotBoard"

class ViHandRobotBoard : public WifiBoard {
private:
    Button boot_button_;
    LcdDisplay* display_;

    // Khởi tạo bus SPI điều khiển màn hình ST7789
    void InitializeSpi() {
        spi_bus_config_t buscfg = {};
        buscfg.mosi_io_num = DISPLAY_SPI_MOSI_PIN;
        buscfg.miso_io_num = GPIO_NUM_NC;
        buscfg.sclk_io_num = DISPLAY_SPI_SCK_PIN;
        buscfg.quadwp_io_num = GPIO_NUM_NC;
        buscfg.quadhd_io_num = GPIO_NUM_NC;
        buscfg.max_transfer_sz = DISPLAY_WIDTH * DISPLAY_HEIGHT * sizeof(uint16_t);
        ESP_ERROR_CHECK(spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO));
    }

    // Cấu hình Nút nhấn vật lý
    void InitializeButtons() {
        boot_button_.OnClick([this]() {
            auto& app = Application::GetInstance();
            // Nếu đang khởi động ──▶ Vào chế độ cấu hình WiFi (BluFi)
            if (app.GetDeviceState() == kDeviceStateStarting) {
                EnterWifiConfigMode();
                return;
            }
            // Đang đọc ──▶ Bật / Tắt trạng thái hội thoại
            app.ToggleChatState();
        });
    }

    // Khởi tạo Màn hình LCD hiển thị biểu cảm và mã QR ghép nối
    void InitializeDisplay() {
        esp_lcd_panel_io_handle_t panel_io = nullptr;
        esp_lcd_panel_handle_t panel = nullptr;

        esp_lcd_panel_io_spi_config_t io_config = {};
        io_config.cs_gpio_num = DISPLAY_SPI_CS_PIN;
        io_config.dc_gpio_num = DISPLAY_DC_PIN;
        io_config.spi_mode = 0;
        io_config.pclk_hz = 40 * 1000 * 1000;
        io_config.trans_queue_depth = 10;
        io_config.lcd_cmd_bits = 8;
        io_config.lcd_param_bits = 8;
        ESP_ERROR_CHECK(esp_lcd_new_panel_io_spi(SPI2_HOST, &io_config, &panel_io));

        esp_lcd_panel_dev_config_t panel_config = {};
        panel_config.reset_gpio_num = GPIO_NUM_NC;
        panel_config.rgb_ele_order = LCD_RGB_ELEMENT_ORDER_RGB;
        panel_config.bits_per_pixel = 16;
        ESP_ERROR_CHECK(esp_lcd_new_panel_st7789(panel_io, &panel_config, &panel));

        esp_lcd_panel_reset(panel);
        esp_lcd_panel_init(panel);
        esp_lcd_panel_invert_color(panel, true);
        esp_lcd_panel_swap_xy(panel, DISPLAY_SWAP_XY);
        esp_lcd_panel_mirror(panel, DISPLAY_MIRROR_X, DISPLAY_MIRROR_Y);

        display_ = new SpiLcdDisplay(panel_io, panel,
                                    DISPLAY_WIDTH, DISPLAY_HEIGHT,
                                    0, 0,
                                    DISPLAY_MIRROR_X, DISPLAY_MIRROR_Y, DISPLAY_SWAP_XY);
    }

public:
    ViHandRobotBoard() : boot_button_(BOOT_BUTTON_GPIO) {
        InitializeSpi();
        InitializeDisplay();
        InitializeButtons();
        GetBacklight()->SetBrightness(100); // Bật tối đa độ sáng màn hình
    }

    virtual AudioCodec* GetAudioCodec() override {
        // Trả về đối tượng Codec I2S cấu hình theo chân trong config.h
        static SimpleAudioCodec codec(AUDIO_INPUT_SAMPLE_RATE, AUDIO_OUTPUT_SAMPLE_RATE,
                                      AUDIO_I2S_GPIO_BCLK, AUDIO_I2S_GPIO_WS,
                                      AUDIO_I2S_GPIO_DOUT, AUDIO_I2S_GPIO_DIN,
                                      AUDIO_CODEC_PA_PIN);
        return &codec;
    }

    virtual Display* GetDisplay() override {
        return display_;
    }
};

// Đăng ký bo mạch vào hệ thống Xiaozhi
DECLARE_BOARD(ViHandRobotBoard);
```

---

## 4. Biên Dịch và Nạp Firmware Lên Phần Cứng

Sử dụng lệnh Python có sẵn trong dự án để build toàn bộ mã nguồn:

```bash
# Biên dịch cho bo mạch vừa tạo
python scripts/release.py main/boards/vihand-robot-esp32s3

# Nạp firmware vào chip ESP32-S3 qua cổng COM (VD: COM5 trên Windows hoặc /dev/ttyUSB0 trên Linux)
idf.py -p COM5 flash monitor
```
