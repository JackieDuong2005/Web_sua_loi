"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import {
  Camera, Upload, CheckCircle, AlertCircle, X,
  FolderOpen, Clock, Zap, FileText, RefreshCw,
  Star, MessageSquare, Pencil, Save, User, BookOpen
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HelpGuideButton } from "@/components/help-guide"

interface Correction {
  error: string
  suggestion: string
  error_type: string
  is_dialect: boolean
  reason: string
}

interface ScoreBreakdown {
  chinh_ta:  { raw: number; max: number; error_count: number; deduction: number }
  hinh_thuc: { raw: number; max: number; note: string }
  noi_dung:  { raw: number; max: number; note: string }
  sang_tao:  { raw: number; max: number; note: string }
}

interface GradingResult {
  fixed_text: string
  original_text: string
  corrections: Correction[]
  score: string
  score_breakdown?: ScoreBreakdown
  feedback: string
  overall_rating: string
  processingTimeMs: number
  tokenCount: number
}

const ERROR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  phu_am_dau: { label: "Phụ âm đầu", color: "bg-red-100 text-red-700 border-red-200" },
  van:        { label: "Vần", color: "bg-orange-100 text-orange-700 border-orange-200" },
  dau_thanh:  { label: "Dấu thanh", color: "bg-purple-100 text-purple-700 border-purple-200" },
  viet_hoa:   { label: "Viết hoa", color: "bg-blue-100 text-blue-700 border-blue-200" },
  bo_sot_them:{ label: "Bỏ sót/Thêm", color: "bg-pink-100 text-pink-700 border-pink-200" },
  dau_cau:    { label: "Dấu câu", color: "bg-teal-100 text-teal-700 border-teal-200" },
}

function getRatingStyle(rating: string) {
  if (rating.includes("Xuất sắc")) return { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", emoji: "🏆" }
  if (rating.includes("Tốt")) return { badge: "bg-green-100 text-green-700 border-green-200", emoji: "🌟" }
  if (rating.includes("Khá")) return { badge: "bg-blue-100 text-blue-700 border-blue-200", emoji: "👍" }
  if (rating.includes("Trung bình")) return { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", emoji: "📝" }
  return { badge: "bg-red-100 text-red-700 border-red-200", emoji: "💪" }
}

function ScoreDisplay({ score }: { score: string }) {
  const num = parseFloat(score)
  const color = num >= 9 ? "text-emerald-600" : num >= 7 ? "text-green-600" : num >= 5 ? "text-blue-600" : num >= 3 ? "text-yellow-600" : "text-red-600"
  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-border bg-card">
      <span className="text-xs text-muted-foreground mb-1">Điểm số</span>
      <span className={`text-5xl font-bold ${color}`}>{score}</span>
    </div>
  )
}

function ScoreBar({ label, raw, max, note }: { label: string; raw: number; max: number; note?: string }) {
  const pct = max > 0 ? (raw / max) * 100 : 0
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : pct >= 30 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{raw}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )
}

export default function GradingPage() {
  const [inputMode, setInputMode] = useState<"image" | "processed" | "text">("image")
  const [activeTab, setActiveTab] = useState<"image" | "processed" | "text">("image")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [qualityReport, setQualityReport] = useState<any>(null)
  const [studentText, setStudentText] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<"ocr" | "grade" | null>(null)
  const [isPreprocessing, setIsPreprocessing] = useState(false)
  const [ocrText, setOcrText] = useState("")
  const [isOcring, setIsOcring] = useState(false)
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [error, setError] = useState("")

  // Form lưu điểm
  const [studentName, setStudentName] = useState("")
  const [assignmentTitle, setAssignmentTitle] = useState("")
  const [className, setClassName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [teacherClasses, setTeacherClasses] = useState<string[]>([])
  const [allClasses, setAllClasses] = useState<string[]>([])
  const [classStudents, setClassStudents] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Cấu hình điểm — chỉ giữ penalty (trước khi chấm)
  const [scoreConfig, setScoreConfig] = useState({ penalty: 0.5 })
  // Override sau khi có kết quả — giáo viên chỉnh bên bảng chi tiết
  const [hinhThucOverride, setHinhThucOverride] = useState<number | null>(null)
  const [noiDungOverride,  setNoiDungOverride]  = useState<number | null>(null)
  const [sangTaoOverride,  setSangTaoOverride]  = useState<number | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  // Load teacher classes on mount + fetch all classes from API + warm-up ViT5
  useEffect(() => {
    const userStr = localStorage.getItem("vihand_user")
    if (userStr) {
      const user = JSON.parse(userStr)
      const classes = user.classes || []
      if (classes.length > 0) {
        setTeacherClasses(classes)
        setClassName(classes[0])
      }
    }
    // Always fetch all classes from API as fallback
    fetch("/api/classes")
      .then(r => r.json())
      .then(data => {
        const names = (data.classes || []).map((c: any) => c.name)
        setAllClasses(names)
      })
      .catch(() => {})

    // 🔥 Warm-up ViT5: kích hoạt model load sớm, tránh timeout lần chấm đầu tiên
    fetch("/api/vit5-warmup")
      .then(r => r.json())
      .then(data => console.log("[WarmUp] ViT5 status:", data.status))
      .catch(() => console.warn("[WarmUp] Không thể kết nối ViT5 service"))
  }, [])

  // Load students when className changes
  useEffect(() => {
    if (!className) { setClassStudents([]); return }
    fetch(`/api/users?role=student`)
      .then(r => r.json())
      .then(data => {
        const all = data.users || []
        const inClass = all
          .filter((u: any) => u.className === className && u.active)
          .map((u: any) => u.name)
        setClassStudents(inClass)
      })
      .catch(() => {})
  }, [className])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith("image/")) processFile(file)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imgBase64 = e.target?.result as string
      setUploadedImage(imgBase64)
      setProcessedImage(null)
      setGradingResult(null)
      setOcrText("")
      setError("")
      setIsSaved(false)
      setInputMode("processed")
      setActiveTab("processed")
      // Tự động tiền xử lý ảnh ngay sau khi upload
      await handlePreprocess(imgBase64)
    }
    reader.readAsDataURL(file)
  }

  // Nén ảnh trước khi gửi API — giảm kích thước đáng kể để tăng tốc Gemini
  const compressImageForAPI = (base64: string, maxDim = 1280, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        // Resize nếu ảnh quá lớn
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)
        // Xuất JPEG nén
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = base64
    })
  }

  const callGemini = async () => {
    setIsProcessing(true)
    setProcessingStep(null)
    setError("")
    setGradingResult(null)
    setIsSaved(false)
    try {
      let textToGrade = studentText
      let geminiFixedText: string | undefined = undefined

      // Bước 1 (nếu nhập ảnh): Gọi OCR — Gemini trích xuất văn bản GỐC + bản đã sửa
      if ((inputMode === "image" || inputMode === "processed") && uploadedImage) {
        setProcessingStep("ocr")
        const compressed = await compressImageForAPI(uploadedImage)
        const ocrRes = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: compressed, mimeType: "image/jpeg" }),
        })
        const ocrData = await ocrRes.json()
        if (!ocrRes.ok) { setError(ocrData.error || "Lỗi OCR"); return }
        textToGrade = ocrData.text || ""
        // Lấy bản Gemini đã sửa từ bước OCR để dùng làm chuẩn chấm điểm
        geminiFixedText = ocrData.gemini_fixed_text || undefined
        setOcrText(textToGrade)
      }

      if (!textToGrade.trim()) { setError("Không trích xuất được văn bản từ ảnh."); return }

      // Bước 2: Chấm điểm — ViT5 chạy ngầm, Gemini fixed text làm chuẩn so sánh
      setProcessingStep("grade")
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentText: textToGrade,
          geminiFixedText,          // Bản Gemini đã sửa — dùng thay Levenshtein so với ViT5
          penalty_per_error: scoreConfig.penalty,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Lỗi chấm điểm"); return }
      setGradingResult(data as GradingResult)
      // Khởi tạo override từ kết quả AI (giáo viên sẽ chỉnh sau)
      const sb = data?.score_breakdown
      setHinhThucOverride(sb?.hinh_thuc?.raw ?? 2.5)
      setNoiDungOverride(sb?.noi_dung?.raw ?? 1.5)
      setSangTaoOverride(sb?.sang_tao?.raw ?? 0)
    } catch {
      setError("Không thể kết nối server.")
    } finally {
      setIsProcessing(false)
      setProcessingStep(null)
    }
  }

  const handleSave = async () => {
    if (!gradingResult || !studentName.trim()) {
      setError("Vui lòng nhập tên học sinh trước khi lưu")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          assignmentTitle: assignmentTitle.trim() || "Bài viết",
          className: className.trim(),
          originalText: gradingResult.original_text,
          fixedText: gradingResult.fixed_text,
          corrections: gradingResult.corrections,
          score: gradingResult.score,
          scoreBreakdown: gradingResult.score_breakdown,
          feedback: gradingResult.feedback,
          overallRating: gradingResult.overall_rating,
          processingTimeMs: gradingResult.processingTimeMs,
          tokenCount: gradingResult.tokenCount,
          imageBase64: uploadedImage || "",
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Lỗi khi lưu"); return }
      setIsSaved(true)
    } catch {
      setError("Không thể lưu vào database.")
    } finally {
      setIsSaving(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Yêu cầu portrait để khớp với dialog 3:4
        video: { facingMode: "environment", width: { ideal: 1080 }, height: { ideal: 1920 } }
      })
      setCameraStream(stream)
      setIsCameraOpen(true)
    } catch {
      cameraInputRef.current?.click()
    }
  }

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const vw = video.videoWidth
    const vh = video.videoHeight

    // Crop về đúng tỉ lệ 3:4 (portrait) — khớp với vùng hiển thị trong dialog
    const TARGET_RATIO = 3 / 4
    let cropW = vw
    let cropH = vh
    if (vw / vh > TARGET_RATIO) {
      // Video rộng hơn 3:4 → cắt hai bên trái/phải
      cropW = Math.round(vh * TARGET_RATIO)
    } else {
      // Video cao hơn 3:4 → cắt trên/dưới
      cropH = Math.round(vw / TARGET_RATIO)
    }
    const offsetX = Math.round((vw - cropW) / 2)
    const offsetY = Math.round((vh - cropH) / 2)

    const canvas = document.createElement("canvas")
    canvas.width = cropW
    canvas.height = cropH
    canvas.getContext("2d")?.drawImage(video, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH)
    const capturedImg = canvas.toDataURL("image/jpeg", 0.9)
    setUploadedImage(capturedImg)
    setProcessedImage(null)
    setGradingResult(null)
    setOcrText("")
    setIsSaved(false)
    setError("")
    setInputMode("processed")
    setActiveTab("processed")
    stopCamera()
    // Tự động tiền xử lý ảnh sau khi chụp
    handlePreprocess(capturedImg)
  }

  const clearAll = () => {
    setUploadedImage(null); setProcessedImage(null); setStudentText(""); setGradingResult(null)
    setOcrText(""); setIsOcring(false)
    setError(""); setIsSaved(false); setStudentName(""); setAssignmentTitle(""); setClassName("")
    setInputMode("image"); setActiveTab("image")
  }

  const canGrade = (inputMode === "image" || inputMode === "processed") ? !!uploadedImage : !!studentText.trim()

  const handlePreprocess = async (imgBase64: string) => {
    setIsPreprocessing(true)
    setQualityReport(null)
    try {
      const res = await fetch("/api/preprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgBase64 })
      })
      const data = await res.json()
      if (res.ok) {
        setProcessedImage(data.processedImageBase64)
        if (data.quality) setQualityReport(data.quality)
      }
    } catch (err) {
      console.error("Preprocessing error:", err)
    } finally {
      setIsPreprocessing(false)
    }
  }

  const handleOCR = async () => {
    if (!uploadedImage) return
    setIsOcring(true)
    setOcrText("")
    setError("")
    try {
      const compressed = await compressImageForAPI(uploadedImage)
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressed, mimeType: "image/jpeg" }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Lỗi OCR"); return }
      setOcrText(data.text || "")
    } catch {
      setError("Không thể kết nối server OCR.")
    } finally {
      setIsOcring(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Chấm điểm AI</h1>
          <p className="text-sm text-muted-foreground">OCR (Gemini) → Sửa lỗi (ViT5) → Chấm điểm (Levenshtein)</p>
        </div>
        <HelpGuideButton role="teacher" />
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        {/* Pipeline Banner */}
        <div className="mb-5 flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { step: 1, icon: "📷", label: "Chụp/Upload", active: !processedImage },
            { step: 2, icon: "🔧", label: "Tiền xử lý (9 bước)", active: !!processedImage && !ocrText },
            { step: 3, icon: "🔍", label: "OCR (Gemini)", active: !!ocrText && !gradingResult },
            { step: 4, icon: "🤖", label: "ViT5 sửa lỗi", active: isProcessing },
            { step: 5, icon: "📊", label: "Levenshtein", active: !!gradingResult },
          ].map(({ step, icon, label, active }, i, arr) => (
            <>
              <div key={step} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : (step < (gradingResult ? 5 : ocrText ? 3 : processedImage ? 2 : 1))
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
              }`}>
                <span>{icon}</span><span>{label}</span>
              </div>
              {i < arr.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </>
          ))}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">

          {/* LEFT: Input */}
          <div className="space-y-6">
            {/* Thông tin học sinh */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Thông tin học sinh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 relative">
                  <Label htmlFor="studentName">Tên học sinh <span className="text-destructive">*</span></Label>
                  <Input
                    id="studentName"
                    placeholder="Nguyễn Văn A"
                    value={studentName}
                    onChange={e => { setStudentName(e.target.value); setShowSuggestions(true) }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  {showSuggestions && classStudents.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      {classStudents
                        .filter(name => name.toLowerCase().includes(studentName.toLowerCase()))
                        .map(name => (
                          <button
                            key={name}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                            onMouseDown={() => { setStudentName(name); setShowSuggestions(false) }}
                          >
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                              {name.charAt(0)}
                            </span>
                            {name}
                          </button>
                        ))
                      }
                      {classStudents.filter(name => name.toLowerCase().includes(studentName.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Đặt tên mới: "{studentName}"</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="className">Lớp</Label>
                    {(() => {
                      const classOptions = teacherClasses.length > 0 ? teacherClasses : allClasses
                      return classOptions.length > 0 ? (
                        <Select value={className} onValueChange={setClassName}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn lớp" />
                          </SelectTrigger>
                          <SelectContent>
                            {classOptions.map((cls) => (
                              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input id="className" placeholder="3A" value={className} onChange={e => setClassName(e.target.value)} />
                      )
                    })()}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="assignmentTitle">Tên bài</Label>
                    <Input id="assignmentTitle" placeholder="Bài viết số 1" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nhập bài */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nhập bài viết</CardTitle>
                <CardDescription>Chọn cách nhập bài của học sinh</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => {
                  setActiveTab(v as any)
                  setInputMode(v as any)
                  // Chỉ clearAll khi chuyển sang tab ảnh (để reset ảnh cũ nếu đang ở text mode)
                  if (v === "text") {
                    // Chuyển sang nhập text — GIỮ NGUYÊN ảnh đã upload (không xóa)
                    // Chỉ reset studentText nếu cần (không làm gì thêm)
                  } else if (v === "processed" && uploadedImage && !processedImage) {
                    handlePreprocess(uploadedImage)
                  }
                }}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="image" className="flex-1 gap-2"><Camera className="w-4 h-4" /> Ảnh gốc</TabsTrigger>
                    <TabsTrigger value="processed" className="flex-1 gap-2"><Zap className="w-4 h-4" /> Tiền xử lý + OCR</TabsTrigger>
                  </TabsList>

                  <TabsContent value="image">
                    {!uploadedImage ? (
                      <div className="space-y-3">
                        <Button onClick={startCamera} className="w-full h-20 text-base gap-3" size="lg">
                          <Camera className="w-7 h-7" /> Chụp ảnh bài viết
                        </Button>
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                        <div className="relative flex items-center">
                          <span className="flex-1 border-t border-border" />
                          <span className="mx-3 text-xs text-muted-foreground uppercase">hoặc</span>
                          <span className="flex-1 border-t border-border" />
                        </div>
                        <div
                          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FolderOpen className="w-10 h-10 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground text-center">Kéo thả ảnh hoặc <span className="text-primary font-medium">click để chọn</span></p>
                          <p className="text-xs text-muted-foreground">JPG, PNG, WebP — tối đa 10MB</p>
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={uploadedImage} alt="Bài viết" className="w-full rounded-lg border border-border object-contain max-h-80" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={clearAll}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="processed">
                    {!uploadedImage ? (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                        <Zap className="w-10 h-10 mb-3 opacity-50" />
                        <p>Vui lòng chọn hoặc chụp ảnh ở tab Ảnh gốc trước</p>
                      </div>
                    ) : isPreprocessing ? (
                      <div className="flex flex-col items-center justify-center py-16 border-2 border-border rounded-lg text-muted-foreground">
                        <Spinner className="w-8 h-8 mb-3" />
                        <p>Đang xử lý ảnh...</p>
                      </div>
                    ) : processedImage ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <img src={processedImage} alt="Ảnh đã xử lý" className="w-full rounded-lg border border-border object-contain max-h-80" />
                          <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={clearAll}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        {qualityReport && (
                          <div className={`p-3 rounded-lg border text-sm space-y-1 ${
                            qualityReport.is_good
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-yellow-50 border-yellow-200 text-yellow-700"
                          }`}>
                            <p className="font-medium flex items-center gap-1.5">
                              {qualityReport.is_good ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                              {qualityReport.is_good ? "Chất lượng ảnh tốt" : "Cảnh báo chất lượng ảnh"}
                            </p>
                            {qualityReport.warnings?.map((w: string, i: number) => (
                              <p key={i} className="text-xs ml-5">⚠ {w}</p>
                            ))}
                            <div className="flex gap-3 text-xs opacity-70 ml-5 pt-1">
                              <span>Blur: {qualityReport.blur_score}</span>
                              <span>Sáng: {qualityReport.brightness}</span>
                              <span>Res: {qualityReport.resolution}px</span>
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                        <Zap className="w-10 h-10 mb-3 opacity-50" />
                        <p>Lỗi tiền xử lý ảnh</p>
                      </div>
                    )}
                  </TabsContent>

                </Tabs>

                {/* === Cấu hình chấm điểm === */}
                <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    ⚙️ Cấu hình điểm <span className="font-normal normal-case">(tiếp nhận trước khi chấm)</span>
                  </p>

                  {/* Chỉ giữ: Trừ điểm mỗi lỗi chính tả */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">✖️ Trừ điểm mỗi lỗi chính tả</Label>
                      <span className="text-sm font-bold text-destructive tabular-nums">
                        −{scoreConfig.penalty.toFixed(1)} đ
                      </span>
                    </div>
                    <input
                      type="range" min={0.1} max={1.0} step={0.1}
                      value={scoreConfig.penalty}
                      onChange={e => setScoreConfig(c => ({ ...c, penalty: parseFloat(e.target.value) }))}
                      className="w-full accent-destructive h-2 rounded-full cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0.1 — Nhẹ</span><span>0.5 — Chuẩn</span><span>1.0 — Ngặt</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button className="w-full mt-4 h-12 text-base gap-2" onClick={callGemini} disabled={!canGrade || isProcessing}>
                  {isProcessing
                    ? processingStep === "ocr"
                      ? <><Spinner className="mr-2" />🔍 Đang OCR (Gemini)...</>
                      : <><Spinner className="mr-2" />🤖 Đang chấm điểm (ViT5)...</>
                    : <><Zap className="w-5 h-5" />Chấm điểm</>}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Results */}
          <div className="space-y-6">
            {gradingResult ? (
              <>
                {/* Score + Rating */}
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    {(() => {
                      const sb = gradingResult.score_breakdown
                      const ht = hinhThucOverride ?? sb?.hinh_thuc?.raw ?? 2.5
                      const nd = noiDungOverride  ?? sb?.noi_dung?.raw ?? 1.5
                      const st = sangTaoOverride  ?? sb?.sang_tao?.raw ?? 0
                      const total = Math.min(10, Math.round(((sb?.chinh_ta?.raw ?? 0) + ht + nd + st) * 10) / 10)
                      const displayScore = `${total.toFixed(1)}/10`
                      const ratingStyle = getRatingStyle(gradingResult.overall_rating)
                      return (
                        <div className="flex items-center gap-4">
                          <ScoreDisplay score={displayScore} />
                          <div className="flex-1 space-y-2">
                            <Badge className={`text-sm px-3 py-1 border ${ratingStyle.badge}`}>{ratingStyle.emoji} {gradingResult.overall_rating}</Badge>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(gradingResult.processingTimeMs / 1000).toFixed(1)}s</span>
                              <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{gradingResult.tokenCount} tokens</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Score Breakdown */}
                {gradingResult.score_breakdown && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" /> Bảng điểm chi tiết
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <ScoreBar
                          label="📝 Chính tả & Ngữ pháp"
                          raw={gradingResult.score_breakdown.chinh_ta.raw}
                          max={gradingResult.score_breakdown.chinh_ta.max}
                          note={`${gradingResult.score_breakdown.chinh_ta.error_count} lỗi, trừ ${gradingResult.score_breakdown.chinh_ta.deduction}đ`}
                        />

                        {/* Hình thức — editable */}
                        {hinhThucOverride !== null ? (
                          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-blue-700">✍️ Hình thức trình bày</span>
                              <span className="text-sm font-bold text-blue-700 tabular-nums">
                                {hinhThucOverride.toFixed(1)} <span className="font-normal text-muted-foreground">/ 3</span>
                              </span>
                            </div>
                            <input type="range" min={0} max={3} step={0.5}
                              value={hinhThucOverride}
                              onChange={e => setHinhThucOverride(parseFloat(e.target.value))}
                              className="w-full accent-blue-500 h-2 rounded-full cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-blue-500">
                              <span>0 — Chữ xấu</span><span>1.5 — TB</span><span>3 — Rất đẹp</span>
                            </div>
                          </div>
                        ) : (
                          <ScoreBar label="✍️ Hình thức trình bày"
                            raw={gradingResult.score_breakdown.hinh_thuc.raw}
                            max={gradingResult.score_breakdown.hinh_thuc.max}
                            note={gradingResult.score_breakdown.hinh_thuc.note}
                          />
                        )}

                        {/* Nội dung — editable */}
                        {noiDungOverride !== null ? (
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-indigo-700">💡 Nội dung & Ý tưởng</span>
                              <span className="text-sm font-bold text-indigo-700 tabular-nums">
                                {noiDungOverride.toFixed(1)} <span className="font-normal text-muted-foreground">/ 2</span>
                              </span>
                            </div>
                            <input type="range" min={0} max={2} step={0.5}
                              value={noiDungOverride}
                              onChange={e => setNoiDungOverride(parseFloat(e.target.value))}
                              className="w-full accent-indigo-500 h-2 rounded-full cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-indigo-500">
                              <span>0 — Lạc đề</span><span>1 — Đủ ý</span><span>2 — Sâu sắc</span>
                            </div>
                          </div>
                        ) : (
                          <ScoreBar label="💡 Nội dung & Ý tưởng"
                            raw={gradingResult.score_breakdown.noi_dung.raw}
                            max={gradingResult.score_breakdown.noi_dung.max}
                            note={gradingResult.score_breakdown.noi_dung.note}
                          />
                        )}

                        {/* Sáng tạo — chỉ slider, không có ScoreBar thần */}
                        {sangTaoOverride !== null && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-amber-700">✨ Điều chỉnh Sáng tạo</span>
                              <span className="text-sm font-bold text-amber-700 tabular-nums">
                                {sangTaoOverride.toFixed(1)} <span className="font-normal text-muted-foreground">/ 1</span>
                              </span>
                            </div>
                            <input type="range" min={0} max={1} step={0.5}
                              value={sangTaoOverride}
                              onChange={e => setSangTaoOverride(parseFloat(e.target.value))}
                              className="w-full accent-amber-500 h-2 rounded-full cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-amber-600">
                              <span>0 — Không có</span><span>0.5 — Có ít</span><span>1 — Nổi bật</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Save Form */}
                <Card className={`border-2 ${isSaved ? "border-green-300 bg-green-50/30" : "border-primary/20"}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Save className="w-4 h-4 text-primary" /> Lưu kết quả vào Database
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isSaved ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-100 text-green-700">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="font-medium">Đã lưu thành công!</p>
                          <p className="text-sm opacity-80">Bài của {studentName} đã được lưu vào cơ sở dữ liệu</p>
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full gap-2" onClick={handleSave} disabled={isSaving || !studentName.trim()}>
                        {isSaving ? <><Spinner className="mr-2" />Đang lưu...</> : <><Save className="w-4 h-4" />Lưu bài của {studentName || "học sinh"}</>}
                      </Button>
                    )}
                    {!studentName.trim() && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">Điền tên học sinh ở cột bên trái để lưu</p>
                    )}
                  </CardContent>
                </Card>

                {/* Feedback */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" /> Nhận xét của AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{gradingResult.feedback}</p>
                  </CardContent>
                </Card>

                {/* Corrections */}
                {gradingResult.corrections?.length > 0 && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        Lỗi chính tả ({gradingResult.corrections.length} lỗi)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {gradingResult.corrections.map((c, i) => {
                          const typeInfo = ERROR_TYPE_LABELS[c.error_type] || { label: c.error_type, color: "bg-gray-100 text-gray-700 border-gray-200" }
                          return (
                            <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/60 bg-muted/30 text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-destructive font-medium line-through">{c.error}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-green-600 font-semibold">{c.suggestion}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border ${typeInfo.color}`}>{typeInfo.label}</Badge>
                                {c.is_dialect && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border bg-amber-50 text-amber-700 border-amber-200">🗣 Phương ngữ</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{c.reason}</p>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fixed text */}
                <Card className="border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" /> Văn bản đã sửa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{gradingResult.fixed_text}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Original text */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4" /> Văn bản gốc (AI nhận dạng)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{gradingResult.original_text}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-border/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Star className="w-14 h-14 mb-4 opacity-20" />
                  <p className="font-medium">Chưa có kết quả</p>
                  <p className="text-sm mt-1">Nhập bài viết và nhấn "Chấm điểm" để bắt đầu</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Camera Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="w-full max-w-sm sm:max-w-md p-0 overflow-hidden bg-black border-none rounded-2xl">
          <DialogHeader className="p-3 bg-black/60 backdrop-blur-md absolute top-0 inset-x-0 z-10">
            <DialogTitle className="text-white flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4 text-primary" /> Camera quét bài viết
            </DialogTitle>
          </DialogHeader>

          {/* Video — toàn màn hình, không overlay */}
          <div className="relative w-full bg-black" style={{ aspectRatio: "3/4" }}>
            <video
              ref={(el) => {
                if (el && cameraStream) { el.srcObject = cameraStream; el.play().catch(console.error) }
                // @ts-ignore
                videoRef.current = el
              }}
              autoPlay playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-row items-center justify-center gap-6 p-5 bg-black">
            <Button variant="outline" size="icon" onClick={stopCamera}
              className="rounded-full w-11 h-11 bg-white/10 border-white/20 text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
            <button onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-lg flex items-center justify-center active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-full bg-primary" />
            </button>
            <Button variant="outline" size="icon"
              className="rounded-full w-11 h-11 bg-white/10 border-white/20 text-white hover:bg-white/20">
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
