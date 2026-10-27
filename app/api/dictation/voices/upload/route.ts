import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// ============================================================
// POST /api/dictation/voices/upload
// Nhận và nạp tệp mô hình Piper TTS ONNX (.onnx + .onnx.json) của giáo viên
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const modelFile = (formData.get("model") || formData.get("file")) as File | null
    const configFile = (formData.get("config") || formData.get("configFile")) as File | null
    const voiceName = (formData.get("voiceName") || formData.get("name") || "Giọng Giáo Viên").toString().trim()
    const voiceIdInput = (formData.get("voiceId") || "").toString().trim()

    if (!modelFile) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp mô hình ONNX (.onnx)" },
        { status: 400 }
      )
    }

    if (!modelFile.name.endsWith(".onnx")) {
      return NextResponse.json(
        { error: "Tệp mô hình phải có định dạng .onnx" },
        { status: 400 }
      )
    }

    // Giới hạn kích thước tối đa 150MB
    const MAX_SIZE_BYTES = 150 * 1024 * 1024
    if (modelFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Tệp mô hình vượt quá giới hạn 150MB" },
        { status: 400 }
      )
    }

    // Sanitize voice id: loại bỏ ký tự lạ, giữ lại chữ cái, số và dấu gạch dưới
    const baseSlug = voiceIdInput || (voiceName ? voiceName.toLowerCase().replace(/[^a-z0-9_]/g, "_") : "custom_teacher")
    const voiceId = baseSlug.replace(/^_+|_+$/g, "") || "custom_teacher"

    // Thư mục lưu trữ models/tts của python_service
    const modelsDir = path.join(process.cwd(), "python_service", "models", "tts")
    await fs.mkdir(modelsDir, { recursive: true })

    const onnxTarget = path.join(modelsDir, `${voiceId}.onnx`)
    const jsonTarget = path.join(modelsDir, `${voiceId}.onnx.json`)

    // Ghi file ONNX
    const modelBuffer = Buffer.from(await modelFile.arrayBuffer())
    await fs.writeFile(onnxTarget, modelBuffer)

    // Ghi file JSON config
    if (configFile && configFile.name.endsWith(".json")) {
      const configBuffer = Buffer.from(await configFile.arrayBuffer())
      await fs.writeFile(jsonTarget, configBuffer)
    } else {
      // Tự động tạo config JSON chuẩn cho Piper VITS nếu người dùng chưa có
      const defaultConfig = {
        audio: { sample_rate: 22050 },
        espeak: { voice: "vi" },
        inference: { noise_scale: 0.667, length_scale: 1.0, noise_w: 0.8 },
        voice_name: voiceName || voiceId,
      }
      await fs.writeFile(jsonTarget, JSON.stringify(defaultConfig, null, 2), "utf-8")
    }

    return NextResponse.json({
      success: true,
      voiceId,
      voiceName: voiceName || voiceId,
      message: `Đã nạp thành công giọng đọc cá nhân '${voiceName || voiceId}' vào hệ thống TTS Offline`,
    })
  } catch (error: any) {
    console.error("[POST /api/dictation/voices/upload]", error)
    return NextResponse.json(
      { error: `Lỗi khi lưu tệp mô hình giọng đọc: ${error?.message || "Không xác định"}` },
      { status: 500 }
    )
  }
}
