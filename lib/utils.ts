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
