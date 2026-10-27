import { NextRequest, NextResponse } from "next/server"
import { guardAiRoute } from "@/lib/api-guard"

export const dynamic = "force-dynamic"
export const maxDuration = 35

// ============================================================
// Next.js BFF API Gateway: Qwen Director Route
// app/api/dictation/qwen-director/route.ts
//
// Proxies Qwen2.5-0.5B Pedagogical Director endpoints on Python AI Core (:8000)
// - GET: Health & RAM status (/qwen/status) with 10s timeout & graceful offline fallback
// - POST: Action multiplexer for SGK cleaner (/qwen/extract-sgk) & Prosody Director (/qwen/direct-prosody)
// ============================================================

const VIT5_SERVICE_URL = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")

export async function GET() {
  try {
    const upstreamRes = await fetch(`${VIT5_SERVICE_URL}/qwen/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!upstreamRes.ok) {
      return NextResponse.json({
        enabled: false,
        is_loaded: false,
        available_ram_mb: 0,
        offline: true,
        lifecycle_mode: "offline",
      })
    }

    const data = await upstreamRes.json()
    return NextResponse.json({
      enabled: data.enabled ?? true,
      model_id: data.model_id ?? "Qwen/Qwen2.5-0.5B-Instruct",
      is_loaded: data.is_loaded ?? true,
      lifecycle_mode: data.lifecycle_mode ?? "always_active",
      available_ram_mb: data.available_ram_mb ?? 0,
      cache_entries: data.cache_entries ?? 0,
      memory_mode: data.memory_mode ?? "always_active",
      offline: false,
      ...data,
    })
  } catch (err: any) {
    return NextResponse.json({
      enabled: false,
      is_loaded: false,
      available_ram_mb: 0,
      offline: true,
      lifecycle_mode: "offline",
    })
  }
}

export async function POST(req: NextRequest) {
  // 1. Rate Limiting Guard: Tối đa 20 yêu cầu / phút / IP
  const rateLimitResponse = guardAiRoute(req, 20, "qwen-director")
  if (rateLimitResponse) return rateLimitResponse

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ" }, { status: 400 })
  }

  if (!body || typeof body !== "object" || !body.action) {
    return NextResponse.json(
      { error: "Yêu cầu thiếu thuộc tính 'action' (extract_sgk hoặc direct_prosody)" },
      { status: 400 }
    )
  }

  const { action } = body

  // Nhánh 1: Trích xuất & làm sạch SGK/PDF
  if (action === "extract_sgk") {
    const rawText = typeof body?.raw_text === "string" ? body.raw_text.trim() : ""
    if (!rawText) {
      return NextResponse.json(
        { error: "Văn bản thô không được để trống (raw_text is required)" },
        { status: 400 }
      )
    }

    const grade = Number(body?.grade) || 3

    try {
      const res = await fetch(`${VIT5_SERVICE_URL}/qwen/extract-sgk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          grade,
        }),
        signal: AbortSignal.timeout(30000), // Cho phép cold-start Qwen on-demand trên RPi 4
      })

      if (!res.ok) {
        const errDetail = await res.text().catch(() => "")
        return NextResponse.json(
          { error: `Python service báo lỗi (${res.status}): ${errDetail || "Không thể trích xuất SGK"}` },
          { status: res.status }
        )
      }

      const result = await res.json()
      return NextResponse.json({
        success: true,
        data: result,
        ...result,
      })
    } catch (err: any) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return NextResponse.json(
          { error: "Dịch vụ Qwen Director quá hạn xử lý (Timeout 30s). Có thể mô hình đang khởi động nguội trên Raspberry Pi, vui lòng thử lại." },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: "Không thể kết nối đến trạm AI Python Core (Port 8000). Vui lòng kiểm tra dịch vụ python_service." },
        { status: 503 }
      )
    }
  }

  // Nhánh 2: Đạo diễn nhịp đọc sư phạm
  if (action === "direct_prosody") {
    const passage = typeof body?.passage === "string" ? body.passage.trim() : ""
    if (!passage) {
      return NextResponse.json(
        { error: "Đoạn văn không được để trống (passage is required)" },
        { status: 400 }
      )
    }

    const difficultWords = body?.difficult_words || []
    const grade = Number(body?.grade) || 3
    const chunkMode = body?.chunk_mode || "phrase"

    try {
      const res = await fetch(`${VIT5_SERVICE_URL}/qwen/direct-prosody`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage,
          difficult_words: difficultWords,
          grade,
          chunk_mode: chunkMode,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (!res.ok) {
        const errDetail = await res.text().catch(() => "")
        return NextResponse.json(
          { error: `Python service báo lỗi (${res.status}): ${errDetail || "Không thể đạo diễn nhịp đọc"}` },
          { status: res.status }
        )
      }

      const result = await res.json()
      return NextResponse.json({
        success: true,
        data: result,
        ...result,
      })
    } catch (err: any) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return NextResponse.json(
          { error: "Dịch vụ Qwen Director quá hạn xử lý (Timeout 30s). Có thể mô hình đang khởi động nguội trên Raspberry Pi, vui lòng thử lại." },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: "Không thể kết nối đến trạm AI Python Core (Port 8000). Vui lòng kiểm tra dịch vụ python_service." },
        { status: 503 }
      )
    }
  }

  // Nhánh 3: Hành động không hợp lệ
  return NextResponse.json(
    { error: `Hành động (action) '${action}' không hợp lệ. Chỉ chấp nhận 'extract_sgk' hoặc 'direct_prosody'.` },
    { status: 400 }
  )
}
