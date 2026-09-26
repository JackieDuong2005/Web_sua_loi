"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Volume2,
  Layers,
  Sparkles,
  Maximize2,
  FileText,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface BBoxCoordinates {
  rel_x1: number
  rel_y1: number
  rel_w: number
  rel_h: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export interface StudentBBoxCorrectionItem {
  id?: string
  error: string
  suggestion: string
  error_type: string
  is_dialect?: boolean
  reason: string
  lineNumber?: number
  bbox?: BBoxCoordinates
  rel_x1?: number
  rel_y1?: number
  rel_w?: number
  rel_h?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  errorType?: string
  originalWord?: string
  correctedWord?: string
}

interface StudentBoundingBoxCanvasProps {
  imageSrc: string
  originalText?: string
  studentName?: string
  corrections: StudentBBoxCorrectionItem[]
  hoveredErrorIdx: number | null
  onHoverError: (idx: number | null) => void
  onSelectError: (idx: number) => void
  onPlayAudio: (text: string) => void
  playingText?: string | null
  filterType?: string
  className?: string
}

export function getErrorTheme(type?: string) {
  switch (type) {
    case "dau_thanh":
      return {
        label: "Dấu thanh",
        badge: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
        border: "border-purple-500",
        bg: "bg-purple-500/20",
        tagBg: "bg-purple-600 text-white",
        ring: "ring-purple-500",
      }
    case "van":
      return {
        label: "Vần",
        badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
        border: "border-blue-500",
        bg: "bg-blue-500/20",
        tagBg: "bg-blue-600 text-white",
        ring: "ring-blue-500",
      }
    case "am_chinh":
      return {
        label: "Nguyên âm",
        badge: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300",
        border: "border-cyan-500",
        bg: "bg-cyan-500/20",
        tagBg: "bg-cyan-600 text-white",
        ring: "ring-cyan-500",
      }
    case "phu_am_cuoi":
    case "bo_sot_them":
      return {
        label: "Âm cuối / Nét",
        badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
        border: "border-rose-500",
        bg: "bg-rose-500/20",
        tagBg: "bg-rose-600 text-white",
        ring: "ring-rose-500",
      }
    case "viet_hoa":
      return {
        label: "Viết hoa",
        badge: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
        border: "border-indigo-500",
        bg: "bg-indigo-500/20",
        tagBg: "bg-indigo-600 text-white",
        ring: "ring-indigo-500",
      }
    case "thay_the_tu":
      return {
        label: "Thay thế từ",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
        border: "border-emerald-500",
        bg: "bg-emerald-500/20",
        tagBg: "bg-emerald-600 text-white",
        ring: "ring-emerald-500",
      }
    case "phu_am_dau":
    default:
      return {
        label: "Phụ âm đầu",
        badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
        border: "border-amber-500",
        bg: "bg-amber-500/20",
        tagBg: "bg-amber-600 text-white",
        ring: "ring-amber-500",
      }
  }
}

export function StudentBoundingBoxCanvas({
  imageSrc,
  originalText,
  studentName = "Học sinh",
  corrections,
  hoveredErrorIdx,
  onHoverError,
  onSelectError,
  onPlayAudio,
  playingText,
  filterType = "all",
  className = "",
}: StudentBoundingBoxCanvasProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [showBoxes, setShowBoxes] = useState<boolean>(true)
  const [imageLoaded, setImageLoaded] = useState<boolean>(false)
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Xử lý khi ảnh tải xong để lấy kích thước gốc
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setNaturalDimensions({
      width: img.naturalWidth || 800,
      height: img.naturalHeight || 600,
    })
    setImageLoaded(true)
  }

  // Chuẩn hóa tọa độ Bounding Box đa tầng an toàn 100%
  const normalizedBoxes = useMemo(() => {
    return corrections.map((c, index) => {
      const b = c.bbox
      const naturalW = naturalDimensions.width || 800
      const naturalH = naturalDimensions.height || 600

      // 1. Trích xuất rel_x1
      let rx1 = 0
      if (b && typeof b.rel_x1 === "number" && b.rel_x1 >= 0 && b.rel_x1 <= 1) {
        rx1 = b.rel_x1
      } else if (typeof c.rel_x1 === "number" && c.rel_x1 >= 0 && c.rel_x1 <= 1) {
        rx1 = c.rel_x1
      } else if (b && typeof b.x1 === "number" && b.x1 > 1) {
        rx1 = b.x1 / naturalW
      } else if (typeof c.x1 === "number" && c.x1 > 1) {
        rx1 = c.x1 / naturalW
      }

      // 2. Trích xuất rel_y1
      let ry1 = 0
      if (b && typeof b.rel_y1 === "number" && b.rel_y1 >= 0 && b.rel_y1 <= 1) {
        ry1 = b.rel_y1
      } else if (typeof c.rel_y1 === "number" && c.rel_y1 >= 0 && c.rel_y1 <= 1) {
        ry1 = c.rel_y1
      } else if (b && typeof b.y1 === "number" && b.y1 > 1) {
        ry1 = b.y1 / naturalH
      } else if (typeof c.y1 === "number" && c.y1 > 1) {
        ry1 = c.y1 / naturalH
      }

      // 3. Trích xuất rel_w
      let rw = 0.08
      if (b && typeof b.rel_w === "number" && b.rel_w > 0 && b.rel_w <= 1) {
        rw = b.rel_w
      } else if (typeof c.rel_w === "number" && c.rel_w > 0 && c.rel_w <= 1) {
        rw = c.rel_w
      } else if (b && typeof b.x2 === "number" && typeof b.x1 === "number" && b.x2 > b.x1) {
        rw = (b.x2 - b.x1) / naturalW
      } else if (typeof c.x2 === "number" && typeof c.x1 === "number" && c.x2 > c.x1) {
        rw = (c.x2 - c.x1) / naturalW
      }

      // 4. Trích xuất rel_h
      let rh = 0.05
      if (b && typeof b.rel_h === "number" && b.rel_h > 0 && b.rel_h <= 1) {
        rh = b.rel_h
      } else if (typeof c.rel_h === "number" && c.rel_h > 0 && c.rel_h <= 1) {
        rh = c.rel_h
      } else if (b && typeof b.y2 === "number" && typeof b.y1 === "number" && b.y2 > b.y1) {
        rh = (b.y2 - b.y1) / naturalH
      } else if (typeof c.y2 === "number" && typeof c.y1 === "number" && c.y2 > c.y1) {
        rh = (c.y2 - c.y1) / naturalH
      }

      // Giới hạn an toàn [0..0.98]
      const safeRelX = Math.max(0, Math.min(0.95, rx1))
      const safeRelY = Math.max(0, Math.min(0.95, ry1))
      const safeRelW = Math.max(0.03, Math.min(0.35, rw))
      const safeRelH = Math.max(0.03, Math.min(0.16, rh))

      const hasValidBox = (b && (b.rel_x1 !== undefined || b.x1 !== undefined)) ||
                          c.rel_x1 !== undefined ||
                          (c.x1 !== undefined && c.x1 > 0)

      return {
        index,
        item: c,
        safeRelX,
        safeRelY,
        safeRelW,
        safeRelH,
        hasValidBox,
        isTopNear: safeRelY < 0.08,
      }
    })
  }, [corrections, naturalDimensions])

  // Lọc theo loại lỗi
  const displayedBoxes = useMemo(() => {
    return normalizedBoxes.filter(box => {
      if (filterType === "all") return true
      return box.item.error_type === filterType
    })
  }, [normalizedBoxes, filterType])

  const totalDetected = normalizedBoxes.filter(b => b.hasValidBox).length

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))
  const handleZoomReset = () => setZoomLevel(1)

  return (
    <div className={`flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs ${className}`}>
      {/* ── TOOLBAR ĐIỀU KHIỂN BÀI CHẤM CHO PHỤ HUYNH ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-muted/40 border-b border-border/70 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background text-primary border-primary/30 font-semibold gap-1.5 py-0.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>AI Bounding Box</span>
          </Badge>
          <span className="text-muted-foreground hidden sm:inline text-[11px]">
            Đã định vị: <strong className="text-foreground">{totalDetected}/{corrections.length}</strong> từ lỗi
          </span>
        </div>

        {/* Các nút công cụ Zoom & Bật/Tắt */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={showBoxes ? "default" : "outline"}
            className={`h-7 px-2 text-[11px] gap-1 font-semibold ${showBoxes ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setShowBoxes(!showBoxes)}
            title={showBoxes ? "Tạm ẩn khung lỗi để xem chữ gốc của con" : "Hiện khung khoanh lỗi của cô giáo"}
          >
            {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showBoxes ? "Hiện hộp lỗi" : "Ẩn hộp lỗi"}</span>
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.75}
            title="Thu nhỏ ảnh"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>

          <span className="text-[11px] font-mono text-muted-foreground px-1 select-none min-w-[36px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2.5}
            title="Phóng to ảnh"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>

          {zoomLevel !== 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleZoomReset}
              title="Đặt lại kích thước chuẩn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── KHUNG CHỨA ẢNH & BOUNDING BOX OVERLAY ── */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-slate-100 dark:bg-slate-950/60 overflow-auto min-h-[340px] max-h-[580px] p-2 sm:p-4 flex items-center justify-center select-none"
      >
        {imageSrc ? (
          <div
            className="relative transition-transform duration-150 ease-out origin-center inline-block max-w-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Ảnh gốc bài làm học sinh */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt={`Bài viết tay của ${studentName}`}
              onLoad={handleImageLoad}
              className="block w-full h-auto max-h-[520px] object-contain rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"
            />

            {/* Lớp phủ các Bounding Box thông minh */}
            {showBoxes && imageLoaded && (
              <div className="absolute inset-0 pointer-events-none">
                {displayedBoxes.map(box => {
                  if (!box.hasValidBox) return null

                  const isHovered = hoveredErrorIdx === box.index
                  const theme = getErrorTheme(box.item.error_type)
                  const errWord = box.item.error || box.item.originalWord || ""
                  const suggWord = box.item.suggestion || box.item.correctedWord || ""
                  const label = suggWord ? `✓ ${suggWord}` : `✕ ${errWord}`
                  const isPlaying = playingText === suggWord

                  return (
                    <div
                      key={box.index}
                      className={`absolute pointer-events-auto cursor-pointer rounded-sm transition-all duration-200 ${
                        isHovered
                          ? `ring-3 ring-amber-400 bg-amber-400/35 z-30 shadow-lg scale-[1.03] ${theme.border}`
                          : `border-2 border-dashed ${theme.border} ${theme.bg} hover:border-solid hover:ring-2 hover:ring-amber-300 z-10`
                      }`}
                      style={{
                        left: `${box.safeRelX * 100}%`,
                        top: `${box.safeRelY * 100}%`,
                        width: `${box.safeRelW * 100}%`,
                        height: `${box.safeRelH * 100}%`,
                      }}
                      onMouseEnter={() => onHoverError(box.index)}
                      onMouseLeave={() => onHoverError(null)}
                      onClick={() => {
                        onSelectError(box.index)
                        if (suggWord) onPlayAudio(suggWord)
                      }}
                    >
                      {/* Floating Smart Badge (Nhãn chữ đúng kèm số thứ tự) */}
                      <div
                        className={`absolute ${
                          box.isTopNear ? "top-full mt-1" : "bottom-full mb-1"
                        } left-0 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-xs transition-all pointer-events-none flex items-center gap-1 ${
                          isHovered
                            ? "bg-amber-600 text-white scale-110 z-40 ring-2 ring-white dark:ring-slate-900 shadow-md"
                            : `${theme.tagBg} opacity-95`
                        }`}
                      >
                        <span>#{box.index + 1}</span>
                        <span>{label}</span>
                        {isPlaying && <Volume2 className="w-3 h-3 text-white animate-pulse" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Khung mô phỏng Giấy ô ly Tiểu học nếu bài chưa có ảnh đĩa */
          <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-amber-300 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Bản xem bài viết mô phỏng (Chữ viết tay)</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                Bài kiểm tra này được nạp trực tiếp qua văn bản. Toàn bộ các vị trí lỗi chính tả đã được phân loại chuẩn mực bên dưới.
              </p>
            </div>
            {originalText && (
              <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200 text-left text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {originalText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CHÚ THÍCH MÃ MÀU SƯ PHẠM CHO PHỤ HUYNH ── */}
      <div className="px-3.5 py-2 bg-card border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Mẹo cho Ba Mẹ: Chạm vào hộp trên ảnh để nghe cô giáo phát âm chuẩn</span>
        </span>

        {/* Legend màu sắc */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Phụ âm đầu
          </span>
          <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Dấu thanh
          </span>
          <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Vần & Nguyên âm
          </span>
          <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Khác
          </span>
        </div>
      </div>
    </div>
  )
}
