import { NextResponse } from "next/server"

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://localhost:8000"

/**
 * GET /api/vit5-warmup
 * Gọi /preload trên Python service để kích hoạt ViT5 load model lên RAM.
 * Được gọi tự động từ frontend khi app khởi động để tránh timeout lần chấm đầu tiên.
 */
export async function GET() {
  try {
    // Gọi /preload với timeout 5 phút (model load có thể mất 30-60s)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300000) // 5 phút

    const res = await fetch(`${VIT5_SERVICE_URL}/preload`, {
      method: "POST",
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      console.log("[WarmUp] ✅ ViT5 model đã sẵn sàng:", data)
      return NextResponse.json({ status: "ready", detail: data })
    }

    console.warn("[WarmUp] ⚠️ ViT5 preload thất bại:", res.status)
    return NextResponse.json({ status: "failed", detail: res.status }, { status: 502 })
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ status: "timeout", detail: "ViT5 load model timeout" }, { status: 504 })
    }
    console.error("[WarmUp] ❌ Không kết nối ViT5:", err?.message)
    return NextResponse.json({ status: "unreachable", detail: err?.message }, { status: 503 })
  }
}
