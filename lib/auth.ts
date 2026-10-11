import crypto from "crypto"

const JWT_SECRET = process.env.JWT_SECRET || "vihand-grade-secret-key-2026-secure"

/**
 * Băm mật khẩu an toàn bằng Scrypt (chuẩn mật mã khuyến nghị của OWASP)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `scrypt:${salt}:${hash}`
}

/**
 * Kiểm tra mật khẩu đối chiếu với hash lưu trong CSDL
 * Tương thích ngược: Nếu CSDL còn lưu mật khẩu dạng thô (plain-text), vẫn chấp nhận đăng nhập
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false
  if (!storedHash.startsWith("scrypt:")) {
    // Tương thích ngược mật khẩu cũ
    return storedHash === password
  }
  const parts = storedHash.split(":")
  if (parts.length !== 3) return false
  const [, salt, hash] = parts
  const checkHash = crypto.scryptSync(password, salt, 64).toString("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(checkHash, "hex"))
  } catch {
    return false
  }
}

/**
 * Tạo JWT Bearer Token (chuẩn HS256)
 */
export function signJwt(payload: object, expiresInSec: number = 86400 * 7): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })
  ).toString("base64url")
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${fullPayload}`)
    .digest("base64url")
  return `${header}.${fullPayload}.${signature}`
}

/**
 * Xác thực JWT Bearer Token và giải mã thông tin người dùng
 */
export function verifyJwt(token: string): any | null {
  try {
    if (!token) return null
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const [header, payload, signature] = parts
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url")
    if (signature !== expectedSignature) return null
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"))
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

/**
 * Lấy Bearer Token từ request header và trả về thông tin user (nếu có)
 */
export function getAuthUser(req: Request): any | null {
  const authHeader = req.headers.get("authorization") || ""
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim()
    return verifyJwt(token)
  }
  return null
}
