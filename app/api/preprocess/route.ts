import { NextRequest, NextResponse } from "next/server"
import { preprocessImage } from "@/lib/image-processor"

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Cần cung cấp ảnh (imageBase64)" },
        { status: 400 }
      )
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
    const { processedBase64, quality } = await preprocessImage(base64Data)

    return NextResponse.json({
      processedImageBase64: `data:image/jpeg;base64,${processedBase64}`,
      quality,
    })
  } catch (err: any) {
    console.error("Preprocess API error:", err)
    return NextResponse.json(
      { error: err.message || "Lỗi không xác định khi tiền xử lý" },
      { status: 500 }
    )
  }
}
