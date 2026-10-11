import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fix: Kích hoạt SQLite WAL mode + busy_timeout trực tiếp trên instance đang hoạt động
// WAL cho phép nhiều kết nối ĐỌC song song với 1 writer → tránh "database is locked" khi nhiều học sinh nộp đồng thời
async function configureSQLitePragmas(client: PrismaClient) {
  try {
    await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    await client.$queryRawUnsafe("PRAGMA busy_timeout = 10000;")
    await client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;")
  } catch {
    // Bỏ qua nếu chạy trong môi trường test không phải SQLite
  }
}

let _prismaInstance: PrismaClient | undefined = globalForPrisma.prisma

if (!_prismaInstance) {
  _prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
  // Kích hoạt WAL và busy_timeout trực tiếp trên _prismaInstance (không block import)
  configureSQLitePragmas(_prismaInstance).catch(() => {})
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _prismaInstance
  }
}

export const prisma = _prismaInstance
