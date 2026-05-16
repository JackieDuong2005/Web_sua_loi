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
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [qualityReport, setQualityReport] = useState<any>(null)
  const [studentText, setStudentText] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPreprocessing, setIsPreprocessing] = useState(false)
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

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  // Load teacher classes on mount + fetch all classes from API
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
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string)
      setProcessedImage(null)
      setGradingResult(null)
      setError("")
      setIsSaved(false)
    }
    reader.readAsDataURL(file)
  }

  const callGemini = async () => {
    if ((inputMode === "image" || inputMode === "processed") && !uploadedImage) return
    if (inputMode === "text" && !studentText.trim()) return

    setIsProcessing(true)
    setError("")
    setGradingResult(null)
    setIsSaved(false)

    try {
      const body: any = {}
      if ((inputMode === "image" || inputMode === "processed") && uploadedImage) {
        const mimeMatch = uploadedImage.match(/^data:(image\/\w+);base64,/)
        body.imageBase64 = uploadedImage
        body.mimeType = mimeMatch?.[1] || "image/jpeg"
      } else {
        body.studentText = studentText
      }

      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || "Lỗi khi gọi API"); return }
      setGradingResult(data as GradingResult)
    } catch {
      setError("Không thể kết nối server.")
    } finally {
      setIsProcessing(false)
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
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
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
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    setUploadedImage(canvas.toDataURL("image/jpeg", 0.9))
    setProcessedImage(null)
    setGradingResult(null)
    setIsSaved(false)
    setError("")
    stopCamera()
  }

  const clearAll = () => {
    setUploadedImage(null); setProcessedImage(null); setStudentText(""); setGradingResult(null)
    setError(""); setIsSaved(false); setStudentName(""); setAssignmentTitle(""); setClassName("")
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

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-card-foreground">Chấm điểm AI</h1>
          <p className="text-sm text-muted-foreground">Phân tích chính tả và chấm điểm tự động bằng Gemini</p>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
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
                <Tabs value={inputMode} onValueChange={(v) => { 
                  if ((inputMode === "image" || inputMode === "processed") && (v === "image" || v === "processed")) {
                    setInputMode(v as any);
                    if (v === "processed" && uploadedImage && !processedImage) {
                      handlePreprocess(uploadedImage);
                    }
                  } else {
                    setInputMode(v as any); clearAll();
                  }
                }}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="image" className="flex-1 gap-2"><Camera className="w-4 h-4" /> Ảnh gốc</TabsTrigger>
                    <TabsTrigger value="processed" className="flex-1 gap-2"><Zap className="w-4 h-4" /> Đã xử lý</TabsTrigger>
                    <TabsTrigger value="text" className="flex-1 gap-2"><Pencil className="w-4 h-4" /> Nhập text</TabsTrigger>
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

                  <TabsContent value="text">
                    <div className="space-y-2">
                      <Label>Văn bản của học sinh</Label>
                      <Textarea
                        placeholder="Dán hoặc nhập đoạn văn của học sinh vào đây..."
                        value={studentText} onChange={e => setStudentText(e.target.value)}
                        rows={8} className="resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground text-right">{studentText.length} ký tự</p>
                    </div>
                  </TabsContent>
                </Tabs>

                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button className="w-full mt-4 h-12 text-base gap-2" onClick={callGemini} disabled={!canGrade || isProcessing}>
                  {isProcessing ? <><Spinner className="mr-2" />Đang phân tích...</> : <><Zap className="w-5 h-5" />Chấm điểm với Gemini AI</>}
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
                    <div className="flex items-center gap-4">
                      <ScoreDisplay score={gradingResult.score} />
                      <div className="flex-1 space-y-2">
                        {(() => {
                          const s = getRatingStyle(gradingResult.overall_rating)
                          return <Badge className={`text-sm px-3 py-1 border ${s.badge}`}>{s.emoji} {gradingResult.overall_rating}</Badge>
                        })()}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(gradingResult.processingTimeMs / 1000).toFixed(1)}s</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{gradingResult.tokenCount} tokens</span>
                        </div>
                      </div>
                    </div>
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
                        <ScoreBar
                          label="✍️ Hình thức trình bày"
                          raw={gradingResult.score_breakdown.hinh_thuc.raw}
                          max={gradingResult.score_breakdown.hinh_thuc.max}
                          note={gradingResult.score_breakdown.hinh_thuc.note}
                        />
                        <ScoreBar
                          label="💡 Nội dung & Ý tưởng"
                          raw={gradingResult.score_breakdown.noi_dung.raw}
                          max={gradingResult.score_breakdown.noi_dung.max}
                          note={gradingResult.score_breakdown.noi_dung.note}
                        />
                        <ScoreBar
                          label="🎨 Sáng tạo"
                          raw={gradingResult.score_breakdown.sang_tao.raw}
                          max={gradingResult.score_breakdown.sang_tao.max}
                          note={gradingResult.score_breakdown.sang_tao.note}
                        />
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
        <DialogContent className="sm:max-w-md md:max-w-lg p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="p-4 bg-background/10 backdrop-blur-md absolute top-0 inset-x-0 z-10">
            <DialogTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Camera quét bài viết
            </DialogTitle>
          </DialogHeader>
          <div className="relative aspect-[3/4] md:aspect-video bg-muted flex items-center justify-center">
            <video
              ref={(el) => {
                if (el && cameraStream) { el.srcObject = cameraStream; el.play().catch(console.error) }
                // @ts-ignore
                videoRef.current = el
              }}
              autoPlay playsInline className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full border-2 border-white/30 border-dashed rounded-lg flex items-center justify-center">
                <p className="text-white/50 text-xs text-center px-4">Đặt bài viết vào khung hình</p>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-background flex-row justify-center gap-4 sm:justify-center">
            <Button variant="outline" size="icon" onClick={stopCamera} className="rounded-full w-12 h-12"><X className="w-6 h-6" /></Button>
            <Button onClick={capturePhoto} size="lg" className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 shadow-lg p-0">
              <div className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white" />
              </div>
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-12 h-12"><RefreshCw className="w-6 h-6" /></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
