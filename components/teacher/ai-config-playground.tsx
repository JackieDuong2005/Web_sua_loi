"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sliders,
  Sparkles,
  Zap,
  Camera,
  Upload,
  RefreshCw,
  Save,
  RotateCcw,
  CheckCircle2,
  Scan,
  Layers,
  Clock,
  Eye,
  EyeOff,
  Crosshair,
  Server,
  Info,
  ImageIcon,
} from "lucide-react"

export interface GeminiConfig {
  model: string
  temperature: number
  maxOutputTokens: number
  penalty_per_error: number
}

export interface YoloConfig {
  conf_threshold: number
  iou_threshold: number
  imgsz: number
  reading_order: boolean
}

export const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  model: "gemini-3.1-flash-lite",
  temperature: 0.1,
  maxOutputTokens: 8192,
  penalty_per_error: 0.5,
}

export const DEFAULT_YOLO_CONFIG: YoloConfig = {
  conf_threshold: 0.50,
  iou_threshold: 0.45,
  imgsz: 640,
  reading_order: true,
}

const LINE_COLORS = [
  { border: "border-sky-500", bg: "bg-sky-500/20", text: "text-sky-700 dark:text-sky-300", badgeBg: "bg-sky-600" },
  { border: "border-emerald-500", bg: "bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", badgeBg: "bg-emerald-600" },
  { border: "border-amber-500", bg: "bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", badgeBg: "bg-amber-600" },
  { border: "border-purple-500", bg: "bg-purple-500/20", text: "text-purple-700 dark:text-purple-300", badgeBg: "bg-purple-600" },
  { border: "border-rose-500", bg: "bg-rose-500/20", text: "text-rose-700 dark:text-rose-300", badgeBg: "bg-rose-600" },
  { border: "border-teal-500", bg: "bg-teal-500/20", text: "text-teal-700 dark:text-teal-300", badgeBg: "bg-teal-600" },
  { border: "border-indigo-500", bg: "bg-indigo-500/20", text: "text-indigo-700 dark:text-indigo-300", badgeBg: "bg-indigo-600" },
]

export default function AiConfigPlayground() {
  // Cấu hình AI
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>(DEFAULT_GEMINI_CONFIG)
  const [yoloConfig, setYoloConfig] = useState<YoloConfig>(DEFAULT_YOLO_CONFIG)
  const [saveToast, setSaveToast] = useState(false)
  const [activeConfigTab, setActiveConfigTab] = useState<"gemini" | "yolo">("gemini")

  // Playground state (không còn preset mẫu cứng)
  const [playgroundImage, setPlaygroundImage] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [filterConf, setFilterConf] = useState<number>(0.50)
  const [selectedBox, setSelectedBox] = useState<any | null>(null)
  const [showBoxes, setShowBoxes] = useState(true)

  // Camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  // Image container ref for relative overlay
  const imgContainerRef = useRef<HTMLDivElement>(null)
  const [renderedDims, setRenderedDims] = useState<{
    width: number
    height: number
    offsetX: number
    offsetY: number
  }>({ width: 0, height: 0, offsetX: 0, offsetY: 0 })

  // Nạp cấu hình từ localStorage khi mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vihand_ai_config")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.geminiConfig) setGeminiConfig(parsed.geminiConfig)
        if (parsed.yoloConfig) {
          setYoloConfig(parsed.yoloConfig)
          setFilterConf(parsed.yoloConfig.conf_threshold ?? 0.50)
        }
      }
    } catch (e) {
      console.warn("Không đọc được vihand_ai_config:", e)
    }
  }, [])

  // Lưu cấu hình vào localStorage
  const handleSaveConfig = () => {
    try {
      localStorage.setItem(
        "vihand_ai_config",
        JSON.stringify({ geminiConfig, yoloConfig })
      )
      setSaveToast(true)
      setTimeout(() => setSaveToast(false), 3000)
    } catch (e) {
      console.error("Lỗi lưu vihand_ai_config:", e)
    }
  }

  // Khôi phục mặc định
  const handleResetConfig = () => {
    setGeminiConfig(DEFAULT_GEMINI_CONFIG)
    setYoloConfig(DEFAULT_YOLO_CONFIG)
    setFilterConf(DEFAULT_YOLO_CONFIG.conf_threshold)
    try {
      localStorage.removeItem("vihand_ai_config")
      setSaveToast(true)
      setTimeout(() => setSaveToast(false), 3000)
    } catch {}
  }

  // Tính toán vùng hiển thị ảnh thực tế bên trong container (letterboxing handling)
  const updateRenderedDimensions = (img: HTMLImageElement) => {
    if (!imgContainerRef.current) return
    const container = imgContainerRef.current
    const cWidth = container.clientWidth
    const cHeight = container.clientHeight
    const natWidth = img.naturalWidth || 800
    const natHeight = img.naturalHeight || 600

    const imgRatio = natWidth / natHeight
    const containerRatio = cWidth / cHeight

    let dWidth = cWidth
    let dHeight = cHeight
    let offX = 0
    let offY = 0

    if (imgRatio > containerRatio) {
      // Co theo width, padding trên/dưới
      dWidth = cWidth
      dHeight = cWidth / imgRatio
      offY = (cHeight - dHeight) / 2
    } else {
      // Co theo height, padding 2 bên
      dHeight = cHeight
      dWidth = cHeight * imgRatio
      offX = (cWidth - dWidth) / 2
    }

    setRenderedDims({
      width: dWidth,
      height: dHeight,
      offsetX: offX,
      offsetY: offY,
    })
  }

  // Chạy quét chữ YOLOv8
  const handleRunYoloDetect = async () => {
    if (!playgroundImage) return
    setIsScanning(true)
    setScanError(null)
    setSelectedBox(null)

    try {
      let b64 = playgroundImage
      if (playgroundImage.startsWith("/") || playgroundImage.startsWith("http")) {
        const res = await fetch(playgroundImage)
        const blob = await res.blob()
        b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }

      const res = await fetch("/api/yolo/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: b64,
          conf_threshold: 0.10, // Lấy toàn bộ từ 0.10 để thanh trượt dynamic filter mượt mà
          iou_threshold: yoloConfig.iou_threshold,
          imgsz: yoloConfig.imgsz,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi quét chữ viết tay")
      }

      setScanResult(data)
      setFilterConf(yoloConfig.conf_threshold)
    } catch (err: any) {
      console.error("Lỗi scan YOLO:", err)
      setScanError(err?.message || "Không thể thực hiện quét chữ viết tay.")
    } finally {
      setIsScanning(false)
    }
  }

  // Tải ảnh từ máy
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPlaygroundImage(reader.result as string)
      setScanResult(null)
      setSelectedBox(null)
    }
    reader.readAsDataURL(file)
  }

  // Camera handlers
  const startCamera = async () => {
    setIsCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      setMediaStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (e) {
      console.error("Lỗi mở camera:", e)
    }
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      setMediaStream(null)
    }
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
      setPlaygroundImage(dataUrl)
      setScanResult(null)
      setSelectedBox(null)
    }
    stopCamera()
  }

  // Danh sách box được lọc theo thanh trượt dynamic confidence
  const visibleBoxes = useMemo(() => {
    if (!scanResult?.boxes) return []
    return scanResult.boxes.filter((b: any) => (b.conf ?? 1.0) >= filterConf)
  }, [scanResult, filterConf])

  // Thống kê độ tin cậy trung bình
  const avgConf = useMemo(() => {
    if (visibleBoxes.length === 0) return 0
    const sum = visibleBoxes.reduce((acc: number, b: any) => acc + (b.conf ?? 1.0), 0)
    return Math.round((sum / visibleBoxes.length) * 100)
  }, [visibleBoxes])

  return (
    <div className="space-y-4">
      {/* Thông báo lưu cấu hình */}
      {saveToast && (
        <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-200 flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-medium">
              Đã cập nhật cấu hình AI! Các thông số này sẽ tự động áp dụng khi chấm bài ở tab Tập làm văn & Chính tả.
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setSaveToast(false)}>
            Đóng
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[400px_1fr] gap-5 items-start">
        {/* ========================================================================= */}
        {/* CỘT TRÁI: GỌN GÀNG VỚI TABS — KHÔNG CẦN CUỘN LÊN XUỐNG                   */}
        {/* ========================================================================= */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-3 pb-2 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Cấu hình tham số AI
              </span>

              {/* Sub-tabs chuyển nhanh giữa Gemini và YOLO */}
              <div className="flex items-center p-0.5 bg-muted rounded-md border border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveConfigTab("gemini")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    activeConfigTab === "gemini"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Gemini
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConfigTab("yolo")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    activeConfigTab === "yolo"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  YOLOv8
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3.5 space-y-3.5">
            {/* TAB 1: GEMINI AI */}
            {activeConfigTab === "gemini" ? (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Model selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gemini-model" className="text-xs font-semibold text-foreground">
                      Mô hình Gemini AI
                    </Label>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                      Vision & LLM
                    </Badge>
                  </div>
                  <Select
                    value={geminiConfig.model}
                    onValueChange={(val) => setGeminiConfig((prev) => ({ ...prev, model: val }))}
                  >
                    <SelectTrigger id="gemini-model" className="w-full text-xs h-8.5 bg-background">
                      <SelectValue placeholder="Chọn mô hình" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-3.5-flash" className="text-xs">
                        <span className="font-semibold text-purple-600">gemini-3.5-flash</span> (⭐ Siêu thông minh)
                      </SelectItem>
                      <SelectItem value="gemini-3.5-flash-lite" className="text-xs">
                        <span className="font-semibold text-indigo-600">gemini-3.5-flash-lite</span> (⚡ Siêu nhẹ & nhanh)
                      </SelectItem>
                      <SelectItem value="gemini-3.1-flash-lite" className="text-xs">
                        <span className="font-semibold text-blue-600">gemini-3.1-flash-lite</span> (Chuẩn mặc định)
                      </SelectItem>
                      <SelectItem value="gemini-2.5-flash" className="text-xs">
                        gemini-2.5-flash (Tập làm văn)
                      </SelectItem>
                      <SelectItem value="gemini-2.0-flash" className="text-xs">
                        gemini-2.0-flash (Tốc độ cân bằng)
                      </SelectItem>
                      <SelectItem value="gemini-1.5-flash" className="text-xs">
                        gemini-1.5-flash (Bản tiền nhiệm)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">Độ ngẫu nhiên (Temperature)</Label>
                    <Badge variant="secondary" className="font-mono text-[11px] h-5 px-1.5">
                      {geminiConfig.temperature.toFixed(2)}
                    </Badge>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[Math.round(geminiConfig.temperature * 100)]}
                    onValueChange={([val]) =>
                      setGeminiConfig((prev) => ({ ...prev, temperature: val / 100 }))
                    }
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0.0 (Chuẩn xác, ít ảo giác)</span>
                    <span>1.0 (Rất sáng tạo)</span>
                  </div>
                </div>

                {/* Max tokens & Penalty */}
                <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Max Tokens</Label>
                    <Select
                      value={String(geminiConfig.maxOutputTokens)}
                      onValueChange={(val) =>
                        setGeminiConfig((prev) => ({ ...prev, maxOutputTokens: Number(val) }))
                      }
                    >
                      <SelectTrigger className="w-full text-xs h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2048" className="text-xs">2048 tokens</SelectItem>
                        <SelectItem value="4096" className="text-xs">4096 tokens</SelectItem>
                        <SelectItem value="8192" className="text-xs">8192 tokens</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Trừ lỗi chính tả</Label>
                    <Select
                      value={String(geminiConfig.penalty_per_error)}
                      onValueChange={(val) =>
                        setGeminiConfig((prev) => ({ ...prev, penalty_per_error: Number(val) }))
                      }
                    >
                      <SelectTrigger className="w-full text-xs h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25" className="text-xs">-0.25đ / lỗi</SelectItem>
                        <SelectItem value="0.5" className="text-xs">-0.50đ (chuẩn)</SelectItem>
                        <SelectItem value="1.0" className="text-xs">-1.00đ / lỗi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: YOLOV8 */
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Conf threshold */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Ngưỡng tin cậy (conf_threshold)
                    </Label>
                    <Badge variant="secondary" className="font-mono text-[11px] h-5 px-1.5 text-amber-700 bg-amber-50 border-amber-200">
                      {yoloConfig.conf_threshold.toFixed(2)}
                    </Badge>
                  </div>
                  <Slider
                    min={10}
                    max={90}
                    step={5}
                    value={[Math.round(yoloConfig.conf_threshold * 100)]}
                    onValueChange={([val]) => {
                      const c = val / 100
                      setYoloConfig((prev) => ({ ...prev, conf_threshold: c }))
                      setFilterConf(c)
                    }}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0.10 (Nhạy)</span>
                    <span className="font-semibold text-amber-700">0.50 (Khuyên dùng)</span>
                    <span>0.90 (Chặt)</span>
                  </div>
                </div>

                {/* IoU threshold */}
                <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Ngưỡng IoU NMS
                    </Label>
                    <Badge variant="secondary" className="font-mono text-[11px] h-5 px-1.5">
                      {yoloConfig.iou_threshold.toFixed(2)}
                    </Badge>
                  </div>
                  <Slider
                    min={10}
                    max={80}
                    step={5}
                    value={[Math.round(yoloConfig.iou_threshold * 100)]}
                    onValueChange={([val]) =>
                      setYoloConfig((prev) => ({ ...prev, iou_threshold: val / 100 }))
                    }
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Khử box trùng trên cùng 1 từ (Chuẩn: 0.45)</span>
                  </div>
                </div>

                {/* imgsz & reading order */}
                <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Kích thước (imgsz)</Label>
                    <Select
                      value={String(yoloConfig.imgsz)}
                      onValueChange={(val) =>
                        setYoloConfig((prev) => ({ ...prev, imgsz: Number(val) }))
                      }
                    >
                      <SelectTrigger className="w-full text-xs h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="640" className="text-xs">640px (Nhanh/Pi)</SelectItem>
                        <SelectItem value="800" className="text-xs">800px (Cân bằng)</SelectItem>
                        <SelectItem value="1024" className="text-xs">1024px (Nét)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Thứ tự đọc</Label>
                    <div className="flex items-center gap-2 h-8 pt-0.5">
                      <Switch
                        checked={yoloConfig.reading_order}
                        onCheckedChange={(checked) =>
                          setYoloConfig((prev) => ({ ...prev, reading_order: checked }))
                        }
                      />
                      <span className="text-[11px] text-muted-foreground">Vertical Overlap</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons gắn liền bên dưới card */}
            <div className="flex items-center gap-2 pt-2.5 border-t border-border/60">
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs gap-1.5 cursor-pointer text-xs font-semibold h-8.5"
                onClick={handleSaveConfig}
              >
                <Save className="w-3.5 h-3.5" />
                Lưu cấu hình
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 text-xs border-border text-muted-foreground hover:text-foreground gap-1 cursor-pointer shrink-0"
                onClick={handleResetConfig}
              >
                <RotateCcw className="w-3 h-3" />
                Mặc định
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ========================================================================= */}
        {/* CỘT PHẢI: INTERACTIVE YOLO PLAYGROUND (KHÔNG CÒN PRESET MẪU CỨNG)         */}
        {/* ========================================================================= */}
        <Card className="border-border/60 shadow-xs overflow-hidden">
          <CardHeader className="p-3.5 pb-2.5 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
                  <Scan className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Phòng thí nghiệm Quét chữ YOLOv8 (Playground)
                </CardTitle>
                <CardDescription className="text-xs">
                  Chọn hoặc chụp ảnh bài viết để xem trực quan cách YOLOv8 phát hiện từng ô chữ
                </CardDescription>
              </div>

              {/* Action buttons: Tải ảnh, Chụp ảnh, Quét chữ */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Tải ảnh
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                  onClick={startCamera}
                >
                  <Camera className="w-3.5 h-3.5" />
                  Chụp ảnh
                </Button>

                <Button
                  size="sm"
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs cursor-pointer font-semibold"
                  onClick={handleRunYoloDetect}
                  disabled={isScanning || !playgroundImage}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang quét...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Quét chữ YOLOv8
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-4 space-y-3">
            {/* Thanh trượt lọc Dynamic Confidence khi đã có kết quả */}
            {scanResult && (
              <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-800/60 space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold text-foreground">
                      Lọc độ tin cậy thời gian thực:
                    </span>
                    <Badge variant="outline" className="font-mono text-xs px-1.5 py-0 bg-white dark:bg-background text-indigo-700 dark:text-indigo-300">
                      ≥ {(filterConf * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                      onClick={() => setShowBoxes(!showBoxes)}
                    >
                      {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {showBoxes ? "Ẩn khung" : "Hiện khung"}
                    </Button>
                    <span className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
                      Hiển thị <b>{visibleBoxes.length}</b> / {scanResult.boxes?.length || 0} từ
                    </span>
                  </div>
                </div>

                <Slider
                  min={10}
                  max={90}
                  step={2}
                  value={[Math.round(filterConf * 100)]}
                  onValueChange={([val]) => setFilterConf(val / 100)}
                  className="py-0.5"
                />
              </div>
            )}

            {/* Khung trực quan hóa hình ảnh & Bounding Boxes */}
            <div
              ref={imgContainerRef}
              className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[500px] bg-stone-900/90 rounded-xl overflow-hidden border border-border flex items-center justify-center select-none"
            >
              {playgroundImage ? (
                <>
                  {/* Ảnh bài viết */}
                  <img
                    src={playgroundImage}
                    alt="Ảnh bài thi viết tay"
                    className="w-full h-full object-contain pointer-events-none"
                    onLoad={(e) => updateRenderedDimensions(e.currentTarget)}
                  />

                  {/* Lớp phủ Bounding Boxes căn chỉnh chính xác theo pixel thực */}
                  {showBoxes && renderedDims.width > 0 && visibleBoxes.map((box: any, idx: number) => {
                    const lineIdx = box.line_index ?? box.line_idx ?? 0
                    const colorTheme = LINE_COLORS[lineIdx % LINE_COLORS.length]
                    const isSelected = selectedBox?.id === box.id || selectedBox === box

                    const relX = box.rel_x1 ?? (box.x1 ? box.x1 / (scanResult?.image_dimensions?.width || 1) : 0)
                    const relY = box.rel_y1 ?? (box.y1 ? box.y1 / (scanResult?.image_dimensions?.height || 1) : 0)
                    const relW = box.rel_w ?? (box.width ? box.width / (scanResult?.image_dimensions?.width || 1) : 0.05)
                    const relH = box.rel_h ?? (box.height ? box.height / (scanResult?.image_dimensions?.height || 1) : 0.04)

                    const leftPx = renderedDims.offsetX + (renderedDims.width * relX)
                    const topPx = renderedDims.offsetY + (renderedDims.height * relY)
                    const widthPx = Math.max(14, renderedDims.width * relW)
                    const heightPx = Math.max(12, renderedDims.height * relH)

                    const confPercent = Math.round((box.conf ?? 1.0) * 100)
                    const isTopNear = topPx < 22

                    return (
                      <div
                        key={box.id ?? idx}
                        onClick={() => setSelectedBox(box)}
                        style={{
                          left: `${leftPx}px`,
                          top: `${topPx}px`,
                          width: `${widthPx}px`,
                          height: `${heightPx}px`,
                        }}
                        className={`absolute border-2 rounded-xs cursor-pointer transition-all duration-150 z-10 group ${
                          isSelected
                            ? "border-yellow-400 bg-yellow-400/30 ring-2 ring-yellow-300 z-30"
                            : `${colorTheme.border} ${colorTheme.bg} hover:border-white hover:z-20`
                        }`}
                      >
                        {/* Nhãn tag hiển thị số thứ tự và % độ tin cậy */}
                        <div
                          style={{
                            transform: isTopNear ? "translateY(2px)" : "translateY(-100%)",
                          }}
                          className={`absolute left-0 text-[9px] font-bold text-white px-1 py-0.2 rounded-xs whitespace-nowrap shadow-xs pointer-events-none opacity-90 group-hover:opacity-100 ${
                            isSelected ? "bg-yellow-600" : colorTheme.badgeBg
                          }`}
                        >
                          #{idx + 1} • {confPercent}%
                        </div>
                      </div>
                    )
                  })}

                  {/* Loading overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-40">
                      <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
                      <p className="text-xs font-semibold text-foreground">
                        YOLOv8 đang nhận diện từng nét chữ...
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Empty state: Dropzone hướng dẫn tải ảnh hoặc chụp */
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-muted/60 text-muted-foreground/80">
                    <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Chưa chọn ảnh để quét chữ
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Bạn hãy tải ảnh bài viết tay từ máy tính hoặc bấm chụp ảnh trực tiếp từ Camera để bắt đầu.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Tải ảnh từ máy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                      onClick={startCamera}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Chụp từ Camera
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Thông báo lỗi nếu có */}
            {scanError && (
              <div className="p-2.5 rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs">
                {scanError}
              </div>
            )}

            {/* Bảng thống kê chỉ số hiệu năng (HUD) */}
            {scanResult && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                <div className="p-2 rounded-lg border border-border bg-card">
                  <div className="text-[10px] text-muted-foreground">Tổng số từ</div>
                  <div className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Scan className="w-3.5 h-3.5 text-indigo-600" />
                    {visibleBoxes.length} từ
                  </div>
                </div>

                <div className="p-2 rounded-lg border border-border bg-card">
                  <div className="text-[10px] text-muted-foreground">Số dòng văn bản</div>
                  <div className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    {scanResult.total_lines ?? 0} dòng
                  </div>
                </div>

                <div className="p-2 rounded-lg border border-border bg-card">
                  <div className="text-[10px] text-muted-foreground">Độ tin cậy TB</div>
                  <div className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Crosshair className="w-3.5 h-3.5 text-amber-600" />
                    {avgConf}%
                  </div>
                </div>

                <div className="p-2 rounded-lg border border-border bg-card">
                  <div className="text-[10px] text-muted-foreground">Thời gian suy luận</div>
                  <div className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    {scanResult.inference_time_ms} ms
                  </div>
                </div>

                <div className="p-2 rounded-lg border border-border bg-card col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-muted-foreground">Máy chủ xử lý</div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-1 truncate">
                    <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{scanResult.server || "AI Core"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chi tiết ô từ được chọn */}
            {selectedBox && (
              <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-700/80 flex items-center justify-between text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <b>Từ đang chọn:</b> Dòng {(selectedBox.line_index ?? 0) + 1}, Từ thứ {(selectedBox.word_index_in_line ?? 0) + 1} • Độ tin cậy: <b>{Math.round((selectedBox.conf ?? 1.0) * 100)}%</b> • Tọa độ: [{(selectedBox.x1 ?? 0).toFixed(0)}, {(selectedBox.y1 ?? 0).toFixed(0)}] → [{(selectedBox.x2 ?? 0).toFixed(0)}, {(selectedBox.y2 ?? 0).toFixed(0)}]
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-[10px] text-amber-800 hover:bg-amber-100 dark:text-amber-200 px-1.5"
                  onClick={() => setSelectedBox(null)}
                >
                  Bỏ chọn
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal chụp ảnh từ Camera */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              Chụp ảnh bài viết học sinh
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hướng camera thẳng góc và đủ sáng vào trang vở ô ly
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2">
            <Button variant="ghost" size="sm" onClick={stopCamera}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              onClick={capturePhoto}
            >
              <Camera className="w-3.5 h-3.5" />
              Chụp ảnh này
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
