import { NextRequest, NextResponse } from "next/server"
import { preprocessImage } from "@/lib/image-processor"

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, gradeLevel, className } = await req.json()

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Cần cung cấp ảnh (imageBase64)" },
        { status: 400 }
      )
    }

    // Parse gradeLevel hoặc suy luận từ className (ví dụ: "Lớp 1A", "Lớp 2", "2/1", ...)
    let parsedGrade = typeof gradeLevel === "number" ? gradeLevel : (typeof gradeLevel === "string" ? parseInt(gradeLevel, 10) : undefined)
    if ((!parsedGrade || isNaN(parsedGrade)) && className && typeof className === "string") {
      const match = className.match(/^[^\d]*([1-5])/)
      if (match) {
        parsedGrade = parseInt(match[1], 10)
      }
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
    const { processedBase64, quality } = await preprocessImage(base64Data, {
      gradeLevel: parsedGrade && parsedGrade >= 1 && parsedGrade <= 5 ? parsedGrade : undefined,
    })

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
