import { NextRequest, NextResponse } from "next/server"
import { guardAiRoute } from "@/lib/api-guard"

export const maxDuration = 60

/**
 * Endpoint nhận diện Bounding Box các từ viết tay phục vụ YOLO Playground & Studio.
 * Cho phép tùy biến conf_threshold, iou_threshold theo thời gian thực.
 */
export async function POST(req: NextRequest) {
  const blocked = guardAiRoute(req, 60)
  if (blocked) return blocked

  try {
    const body = await req.json()
    const {
      imageBase64,
      conf_threshold = 0.50,
      iou_threshold = 0.45,
      imgsz = 640,
    } = body

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { error: "Vui lòng cung cấp ảnh bài viết (imageBase64)" },
        { status: 400 }
      )
    }

    const conf = Math.max(0.05, Math.min(0.95, Number(conf_threshold) || 0.50))
    const iou = Math.max(0.10, Math.min(0.90, Number(iou_threshold) || 0.45))

    const serviceUrls = [
      process.env.VIT5_SERVICE_URL || "http://localhost:8000",
      "http://192.168.1.56:8000", // Fallback đến trạm biên Raspberry Pi nếu chạy dev nội bộ
    ]

    let responseData: any = null
    let usedUrl = ""
    let startTime = Date.now()

    for (const url of serviceUrls) {
      try {
        console.log(`[YOLO Playground] Đang gọi ${url}/detect-words (conf=${conf}, iou=${iou})...`)
        startTime = Date.now()
        const res = await fetch(`${url}/detect-words`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64,
            conf_threshold: conf,
            iou_threshold: iou,
            imgsz,
          }),
          signal: AbortSignal.timeout(25000),
        })

        if (res.ok) {
          responseData = await res.json()
          usedUrl = url
          break
        } else {
          console.warn(`[YOLO Playground] ${url}/detect-words trả về mã lỗi ${res.status}`)
        }
      } catch (err: any) {
        console.warn(`[YOLO Playground] Không thể kết nối ${url}: ${err?.message || err}`)
      }
    }

    if (!responseData) {
      return NextResponse.json(
        {
          error: "Không thể kết nối đến dịch vụ AI YOLOv8 (cả localhost và trạm Raspberry Pi đều không phản hồi).",
        },
        { status: 503 }
      )
    }

    const latencyMs = Date.now() - startTime
    const boxes = responseData.flat_boxes || responseData.boxes || []
    const lines = responseData.lines || []

    return NextResponse.json({
      success: true,
      total_words: responseData.total_words ?? boxes.length,
      total_lines: responseData.total_lines ?? lines.length,
      boxes,
      lines,
      image_dimensions: responseData.image_dimensions || null,
      inference_time_ms: latencyMs,
      conf_threshold: conf,
      iou_threshold: iou,
      engine: `YOLOv8 nano (imgsz=${imgsz})`,
      server: usedUrl.includes("192.168") ? "Raspberry Pi 4" : "Local Engine",
    })
  } catch (error: any) {
    console.error("[YOLO Playground] Lỗi xử lý:", error)
    return NextResponse.json(
      { error: error?.message || "Lỗi hệ thống khi quét chữ YOLOv8" },
      { status: 500 }
    )
  }
}
