import { NextRequest, NextResponse } from "next/server"

// ============================================================
// IN-MEMORY SLIDING WINDOW RATE LIMITER (Issue #12 Fix)
// Giới hạn số lượng request đến các AI endpoints (/api/grade, /api/ocr)
// ngăn chặn DoS và bảo vệ quota Gemini API trong mạng nội bộ
// ============================================================

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()
const CLEANUP_INTERVAL = 60 * 1000 // Dọn dẹp mỗi 1 phút

// Tự động dọn dẹp các IP không hoạt động để tránh rò rỉ bộ nhớ
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    for (const [ip, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter(t => t > oneMinuteAgo)
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(ip)
      }
    }
  }, CLEANUP_INTERVAL)
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = req.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }
  return "127.0.0.1"
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetInSeconds: number
}

export function checkRateLimit(
  key: string,
  limit: number = 30,       // Mặc định 30 requests / phút
  windowMs: number = 60000  // 60 giây
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  let record = rateLimitStore.get(key)
  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(key, record)
  }

  // Lọc chỉ giữ lại các request trong cửa sổ thời gian
  record.timestamps = record.timestamps.filter(t => t > windowStart)

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0]
    const resetInSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetInSeconds: Math.max(1, resetInSeconds),
    }
  }

  record.timestamps.push(now)
  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    limit,
    resetInSeconds: Math.ceil(windowMs / 1000),
  }
}

export function guardAiRoute(req: NextRequest, maxRequestsPerMinute = 30): NextResponse | null {
  const ip = getClientIp(req)
  const rateResult = checkRateLimit(`ai:${ip}`, maxRequestsPerMinute)

  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: `Quá nhiều yêu cầu gọi AI. Vui lòng đợi ${rateResult.resetInSeconds} giây trước khi thử lại.`,
        retryAfter: rateResult.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateResult.resetInSeconds.toString(),
          "X-RateLimit-Limit": rateResult.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  return null
}
