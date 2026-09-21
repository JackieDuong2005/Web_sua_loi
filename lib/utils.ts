import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Chuẩn hóa tự động quy tắc viết hoa Tiếng Việt:
 * 1. Chữ cái đầu tiên của mỗi dòng (đặc biệt quan trọng với thơ: mỗi dòng thơ luôn viết hoa chữ đầu).
 * 2. Chữ cái đầu tiên sau các dấu ngắt câu (. ! ?).
 */
export function ensureVietnameseCapitalization(text: string): string {
  if (!text) return ""
  return text
    .split("\n")
    .map(line => {
      return line.replace(/^([\s"“'‘(\[-]*)([\p{L}])/u, (_, prefix, firstLetter) => {
        return prefix + firstLetter.toUpperCase()
      })
    })
    .join("\n")
    .replace(/([.!?]\s+)([\p{L}])/gu, (_, punct, letter) => {
      return punct + letter.toUpperCase()
    })
}

/**
 * Chuẩn hóa thông báo lỗi từ các dịch vụ AI (Gemini, Qwen, ViT5)
 * Chuyển các chuỗi raw JSON hoặc mã lỗi kỹ thuật (503, 429, timeout) thành câu tiếng Việt thân thiện với giáo viên.
 */
export function formatAiErrorMessage(error: any): string {
  if (!error) return "Đã xảy ra lỗi không xác định khi kết nối với AI."

  let msg = ""
  let code: any = null
  let status: any = null

  if (typeof error === "string") {
    msg = error.trim()
    if (msg.startsWith("{") && msg.endsWith("}")) {
      try {
        const parsed = JSON.parse(msg)
        const inner = parsed.error || parsed
        code = inner.code
        status = inner.status
        msg = inner.message || msg
      } catch {
        // Giữ nguyên msg nếu parse thất bại
      }
    }
  } else if (typeof error === "object") {
    const inner = error.error || error
    code = inner.code || error.status || error.statusCode
    status = inner.status
    msg = inner.message || error.message || String(error)
  }

  const lower = (msg + " " + String(status || "") + " " + String(code || "")).toLowerCase()

  if (lower.includes("503") || lower.includes("unavailable") || lower.includes("overloaded")) {
    return "Hệ thống AI hiện đang quá tải do lượng truy cập cao. Thầy/cô vui lòng bấm 'Thử lại' sau vài giây."
  }

  if (lower.includes("429") || lower.includes("resource_exhausted") || lower.includes("quota")) {
    return "Hạn mức AI tạm thời hết lượt. Thầy/cô vui lòng chờ khoảng 1 phút rồi thử lại."
  }

  if (lower.includes("econnrefused") || lower.includes("failed to fetch") || lower.includes("connect econrefused")) {
    return "Không thể kết nối đến máy chủ AI nội bộ (Port 8000). Vui lòng kiểm tra cửa sổ ViHand AI Service."
  }

  if (lower.includes("timeout") || lower.includes("aborterror") || lower.includes("aborted")) {
    return "Quá thời gian phản hồi từ máy chủ AI. Thầy/cô vui lòng thử lại bài làm."
  }

  // Nếu chuỗi chứa JSON thô chưa được bóc tách
  if (msg.includes('{"error"') || msg.includes('"code"')) {
    return "Dịch vụ AI tạm thời gián đoạn. Thầy/cô vui lòng bấm 'Thử lại'."
  }

  return msg || "Không thể xử lý yêu cầu qua AI. Vui lòng thử lại."
}

