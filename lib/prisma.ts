import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fix Issue #18: Kích hoạt SQLite WAL mode + busy_timeout để tránh "database is locked"
// WAL cho phép nhiều kết nối ĐỌC song song với 1 writer → phù hợp 30-50 học sinh nộp đồng thời
// busy_timeout=5000 — thay vì báo lỗi ngay, SQLite chờ tối đa 5s để khóa được giải phóng
async function createPrismaWithWAL(): Promise<PrismaClient> {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
  try {
    await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    await client.$executeRawUnsafe("PRAGMA busy_timeout = 5000;")
    await client.$executeRawUnsafe("PRAGMA synchronous = NORMAL;")
  } catch {
    // Bỏ qua nếu chạy trong môi trường test không phải SQLite
  }
  return client
}

let _prismaInstance: PrismaClient | undefined = globalForPrisma.prisma

if (!_prismaInstance) {
  // Đồng bộ hóa: Khởi tạo PrismaClient ngay (WAL được set async sau đó)
  _prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
  // Thiết lập WAL asynchronously ngay sau khi khởi tạo (fire-and-forget, không block import)
  createPrismaWithWAL().catch(() => {})
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _prismaInstance
  }
}

export const prisma = _prismaInstance
