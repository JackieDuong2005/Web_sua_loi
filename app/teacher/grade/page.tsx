"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
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
  Camera, CheckCircle, AlertCircle, X,
  FolderOpen, Clock, Zap, FileText, RefreshCw,
  Star, MessageSquare, Save, User, BookOpen, ScrollText, Sparkles,
  Image as ImageIcon
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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

// ─── Popup kết quả chấm điểm ────────────────────────────────────────────────
interface ResultPopupProps {
  open: boolean
  onClose: () => void
  gradingResult: GradingResult
  studentName: string
  originalImage: string | null
  processedImage: string | null
  hinhThucOverride: number | null
  noiDungOverride: number | null
  sangTaoOverride: number | null
  setHinhThucOverride: (v: number) => void
  setNoiDungOverride: (v: number) => void
  setSangTaoOverride: (v: number) => void
  teacherComment: string
  setTeacherComment: (v: string) => void
  isSaving: boolean
  isSaved: boolean
  onSave: () => void
}

// ── Helper: annotate text with correction highlights + interactive ──
function annotateText(
  text: string,
  corrections: Array<{ error: string; suggestion: string }>,
  mode: "inline" | "highlight-error" | "highlight-fix",
  activeIdx: number | null = null,
  onHover?: (idx: number | null) => void,
  onClick?: (idx: number) => void
): React.ReactNode {
  if (!corrections || corrections.length === 0) return <span className="whitespace-pre-wrap">{text}</span>

  const source = mode === "highlight-fix" ? corrections.map(c => c.suggestion) : corrections.map(c => c.error)
  const baseText = text

  const spans: { start: number; end: number; idx: number }[] = []
  for (let i = 0; i < source.length; i++) {
    const word = source[i]
    let searchFrom = 0
    while (searchFrom <= baseText.length - word.length) {
      const pos = baseText.indexOf(word, searchFrom)
      if (pos === -1) break
      const overlaps = spans.some(s => pos < s.end && pos + word.length > s.start)
      if (!overlaps) { spans.push({ start: pos, end: pos + word.length, idx: i }); break }
      searchFrom = pos + 1
    }
  }
  spans.sort((a, b) => a.start - b.start)

  const nodes: React.ReactNode[] = []
  let cursor = 0
  let key = 0

  const handlers = (idx: number) => ({
    onMouseEnter: () => onHover?.(idx),
    onMouseLeave: () => onHover?.(null),
    onClick: () => onClick?.(idx),
    "data-error-idx": idx,
  })

  for (const sp of spans) {
    if (cursor < sp.start) nodes.push(<span key={key++} className="whitespace-pre-wrap">{baseText.slice(cursor, sp.start)}</span>)
    const c = corrections[sp.idx]
    const isActive = activeIdx === sp.idx
    const ringClass = isActive ? "error-highlight-active" : ""

    if (mode === "inline") {
      nodes.push(
        <span
          key={key++}
          className={`inline-flex items-baseline gap-0.5 mx-0.5 rounded-sm px-0.5 cursor-pointer transition-all duration-200 ${ringClass} ${isActive ? "bg-amber-100/80 ring-2 ring-amber-400 scale-105" : "hover:bg-amber-50/50"}`}
          {...handlers(sp.idx)}
        >
          <span style={{ color: "#dc2626", textDecoration: "line-through", textDecorationColor: "#fca5a5", textDecorationThickness: "2px" }} className="font-medium">{c.error}</span>
          <span style={{ color: "#15803d", textDecoration: "underline", textDecorationColor: "#86efac", textDecorationThickness: "2px", textUnderlineOffset: "2px" }} className="font-semibold">{c.suggestion}</span>
        </span>
      )
    } else if (mode === "highlight-error") {
      nodes.push(
        <span
          key={key++}
          style={{ color: "#b91c1c", borderBottom: "2px solid #fca5a5" }}
          className={`font-medium not-italic cursor-pointer rounded-sm px-0.5 transition-all duration-200 ${ringClass} ${isActive ? "bg-red-100/80 ring-2 ring-red-400 scale-105" : "hover:bg-red-50/50"}`}
          {...handlers(sp.idx)}
        >{c.error}</span>
      )
    } else {
      nodes.push(
        <span
          key={key++}
          style={{ color: "#15803d", textDecoration: "underline", textDecorationColor: "#86efac", textDecorationThickness: "2px", textUnderlineOffset: "2px" }}
          className={`font-semibold not-italic cursor-pointer rounded-sm px-0.5 transition-all duration-200 ${ringClass} ${isActive ? "bg-green-100/80 ring-2 ring-green-400 scale-105" : "hover:bg-green-50/50"}`}
          {...handlers(sp.idx)}
        >{c.suggestion}</span>
      )
    }
    cursor = sp.end
  }
  if (cursor < baseText.length) nodes.push(<span key={key++} className="whitespace-pre-wrap">{baseText.slice(cursor)}</span>)
  return <>{nodes}</>
}

function ResultPopup({
  open, onClose, gradingResult, studentName,
  originalImage, processedImage,
  hinhThucOverride, noiDungOverride, sangTaoOverride,
  setHinhThucOverride, setNoiDungOverride, setSangTaoOverride,
  teacherComment, setTeacherComment,
  isSaving, isSaved, onSave
}: ResultPopupProps) {
  const [viewMode, setViewMode] = useState<"inline" | "sidebyside">("inline")
  const [activeErrorIdx, setActiveErrorIdx] = useState<number | null>(null)
  const [imageLayer, setImageLayer] = useState(false)
  const displayImage = processedImage || originalImage

  const sb = gradingResult.score_breakdown
  const ht = hinhThucOverride ?? sb?.hinh_thuc?.raw ?? 2.5
  const nd = noiDungOverride  ?? sb?.noi_dung?.raw ?? 1.5
  const st = sangTaoOverride  ?? sb?.sang_tao?.raw ?? 0
  const chinhTaRaw = sb?.chinh_ta?.raw ?? 0
  const total = Math.min(10, Math.round((chinhTaRaw + ht + nd + st) * 10) / 10)
  const displayScore = `${total.toFixed(1)}`
  const scoreNum = total
  const scoreColor = scoreNum >= 9 ? "text-emerald-600" : scoreNum >= 7 ? "text-green-600" : scoreNum >= 5 ? "text-blue-600" : scoreNum >= 3 ? "text-yellow-600" : "text-red-600"
  const ratingStyle = getRatingStyle(gradingResult.overall_rating)

  const scoreGradient = scoreNum >= 9
    ? "from-emerald-600 to-emerald-500"
    : scoreNum >= 7 ? "from-green-600 to-green-500"
    : scoreNum >= 5 ? "from-blue-600 to-blue-500"
    : scoreNum >= 3 ? "from-amber-500 to-orange-400"
    : "from-red-500 to-rose-500"

  // ── Inline JSX (KHÔNG phải component con) để tránh lỗi unmount/remount khi state thay đổi ──
  const scorePanelJSX = (
    <div className="space-y-3">
      {sb && (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Bảng điểm chi tiết</span>
            <span className="ml-auto text-[11px] text-muted-foreground italic">Kéo thanh điều chỉnh</span>
          </div>
          <div className="p-3 space-y-2.5">
            {/* Chính tả */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  📝 Chính tả &amp; Ngữ pháp
                  <span className="font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full text-[10px]">
                    {sb.chinh_ta.error_count} lỗi, −{sb.chinh_ta.deduction}đ
                  </span>
                </span>
                <span className="text-lg font-extrabold tabular-nums">
                  {sb.chinh_ta.raw}<span className="text-xs font-normal text-muted-foreground"> / {sb.chinh_ta.max}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${(sb.chinh_ta.raw / sb.chinh_ta.max) * 100}%` }} />
              </div>
            </div>
            {/* Hình thức */}
            <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">✍️ Hình thức trình bày</span>
                <span className="text-xl font-extrabold text-blue-600 tabular-nums">{ht.toFixed(1)}<span className="text-xs font-normal text-stone-400"> /3</span></span>
              </div>
              <input type="range" min={0} max={3} step={0.5} value={ht} onChange={e => setHinhThucOverride(parseFloat(e.target.value))} className="w-full accent-blue-500 h-2 rounded-full cursor-pointer" />
              <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                <span>0 Xấu</span><span>1.5 TB</span><span>3 Đẹp</span>
              </div>
            </div>
            {/* Nội dung */}
            <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">💡 Nội dung &amp; Ý tưởng</span>
                <span className="text-xl font-extrabold text-indigo-600 tabular-nums">{nd.toFixed(1)}<span className="text-xs font-normal text-stone-400"> /2</span></span>
              </div>
              <input type="range" min={0} max={2} step={0.5} value={nd} onChange={e => setNoiDungOverride(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-2 rounded-full cursor-pointer" />
              <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                <span>0 Lạc đề</span><span>1 Đủ ý</span><span>2 Sâu</span>
              </div>
            </div>
            {/* Sáng tạo */}
            <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">✨ Sáng tạo</span>
                <span className="text-xl font-extrabold text-amber-600 tabular-nums">{st.toFixed(1)}<span className="text-xs font-normal text-stone-400"> /1</span></span>
              </div>
              <input type="range" min={0} max={1} step={0.5} value={st} onChange={e => setSangTaoOverride(parseFloat(e.target.value))} className="w-full accent-amber-500 h-2 rounded-full cursor-pointer" />
              <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                <span>0 Không</span><span>0.5 Ít</span><span>1 Nổi bật</span>
              </div>
            </div>
            {/* Tổng */}
            <div className="flex items-center justify-between rounded-lg bg-stone-50 border-2 border-stone-200 px-4 py-3">
              <div>
                <span className="text-xs font-bold text-stone-600">Tổng điểm</span>
                <p className="text-[10px] text-stone-400 mt-0.5">{chinhTaRaw} + {ht.toFixed(1)} + {nd.toFixed(1)} + {st.toFixed(1)}</p>
              </div>
              <span className={`text-3xl font-extrabold ${scoreColor}`}>{displayScore}<span className="text-sm font-normal text-stone-400">/10</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Lưu vào Database */}
      <div className={`rounded-xl border overflow-hidden ${isSaved ? "border-green-300 bg-green-50/40" : "border-stone-200 bg-white"}`}>
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
          <Save className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Lưu kết quả vào Database</span>
        </div>
        <div className="p-4">
          {isSaved ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-100 text-green-700">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div><p className="font-medium">Đã lưu thành công!</p><p className="text-sm opacity-80">Bài của {studentName} đã được lưu vào cơ sở dữ liệu</p></div>
            </div>
          ) : (
            <Button className="w-full gap-2 h-11" onClick={onSave} disabled={isSaving || !studentName.trim()}>
              {isSaving ? <><Spinner className="mr-2" />Đang lưu...</> : <><Save className="w-4 h-4" />Lưu bài của {studentName || "học sinh"}</>}
            </Button>
          )}
          {!studentName.trim() && <p className="text-xs text-muted-foreground mt-2 text-center">⚠️ Điền tên học sinh ở form bên ngoài để lưu</p>}
        </div>
      </div>

      {/* Nhận xét của giáo viên */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-stone-500" />
          <span className="font-semibold text-sm text-stone-700">Nhận xét của giáo viên</span>
          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-5 bg-stone-100 text-stone-500 border-stone-300">Có thể chỉnh sửa</Badge>
        </div>
        <div className="p-4 space-y-3">
          {gradingResult.feedback && (
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-500">
              <p className="font-semibold text-foreground/70 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary/60" /> Gợi ý từ AI (tham khảo):
              </p>
              <p className="leading-relaxed whitespace-pre-wrap">{gradingResult.feedback}</p>
            </div>
          )}
          <Textarea
            value={teacherComment}
            onChange={e => setTeacherComment(e.target.value)}
            placeholder="Nhập nhận xét của giáo viên tại đây..."
            className="min-h-[140px] resize-y text-sm leading-relaxed"
            style={{ minHeight: "140px" }}
          />
          <p className="text-[11px] text-muted-foreground text-right">
            {teacherComment.length > 0 ? `${teacherComment.length} ký tự` : "Chưa có nhận xét"}
          </p>
        </div>
      </div>
    </div>
  )

  const corrections = gradingResult.corrections ?? []

  const errorsTextsJSX = (
    <div className="space-y-4">

      {/* ── Header với compact toggle ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Bài viết học sinh</span>
          {corrections.length > 0 && (
            <span className="text-[10px] text-muted-foreground">({corrections.length} lỗi được đánh dấu)</span>
          )}
        </div>
        {/* Compact pill toggle */}
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("inline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "inline"
                ? "bg-white shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📄 Trực tiếp
          </button>
          <button
            onClick={() => setViewMode("sidebyside")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === "sidebyside"
                ? "bg-white shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Song song
          </button>
        </div>
      </div>

      {/* ── Cách 1: Bài viết + Danh sách lỗi side-by-side ── */}
      {viewMode === "inline" && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 300px" }}>
          {/* CỘT TRÁI: Bài viết có annotation */}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Panel header: legend + Image/Text toggle */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 flex items-center gap-2">
                <span style={{ color: "#b91c1c", textDecoration: "line-through", textDecorationColor: "#fca5a5", fontSize: "12px" }}>sai</span>
                <span className="text-slate-400">→</span>
                <span style={{ color: "#15803d", borderBottom: "2px solid #86efac" }}>đúng</span>
                &nbsp;·&nbsp; Học sinh đối chiếu trực tiếp
              </span>
              {/* Ảnh/Text toggle trong panel */}
              {displayImage && (
                <div className="flex items-center gap-0.5 bg-slate-200/60 rounded-md p-0.5">
                  <button
                    onClick={() => setImageLayer(false)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      !imageLayer ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <FileText className="w-3 h-3" /> Text
                  </button>
                  <button
                    onClick={() => setImageLayer(true)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      imageLayer ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" /> Ảnh
                  </button>
                </div>
              )}
            </div>
            {/* Panel body: Ảnh hoặc văn bản có annotation */}
            {imageLayer && displayImage ? (
              <div className="p-3 bg-white">
                <img
                  src={displayImage}
                  alt="Bài viết học sinh"
                  className="w-full rounded-lg border border-slate-100"
                  style={{ maxHeight: "60vh", objectFit: "contain" }}
                />
                <p className="mt-2 text-[10px] text-slate-400 text-center italic">{processedImage ? "Ảnh đã tiền xử lý (9 bước)" : "Ảnh gốc"}</p>
              </div>
            ) : (
              <div
                className="px-5 text-sm text-gray-900 font-bold font-tieu-hoc"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 39px, #c7d7f0 39px, #c7d7f0 40px)",
                  backgroundSize: "100% 40px",
                  backgroundPosition: "0 20px",
                  lineHeight: "40px",
                  minHeight: "200px",
                  backgroundColor: "#fefefe",
                  paddingTop: "20px",
                  paddingBottom: "20px",
                }}
              >
                {corrections.length > 0
                  ? annotateText(gradingResult.original_text, corrections, "inline", activeErrorIdx, setActiveErrorIdx, (idx) => setActiveErrorIdx(idx))
                  : <span className="whitespace-pre-wrap">{gradingResult.original_text}</span>
                }
              </div>
            )}
          </div>

          {/* CỘT PHẢI: Danh sách lỗi */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col">
            <div className="px-3 py-2.5 bg-muted/50 border-b border-border flex items-center gap-2 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="font-semibold text-xs">Danh sách lỗi</span>
              {corrections.length > 0 && (
                <Badge className="ml-auto bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 h-4">{corrections.length} lỗi</Badge>
              )}
            </div>
            <div className="overflow-y-auto flex-1 p-2.5 space-y-2">
              {corrections.length > 0 ? corrections.map((c, i) => {
                const typeInfo = ERROR_TYPE_LABELS[c.error_type] || { label: c.error_type, color: "bg-gray-100 text-gray-700 border-gray-200" }
                const isActive = activeErrorIdx === i
                return (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300 shadow-md scale-[1.02]"
                        : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
                    }`}
                    onMouseEnter={() => setActiveErrorIdx(i)}
                    onMouseLeave={() => setActiveErrorIdx(null)}
                    onClick={() => setActiveErrorIdx(isActive ? null : i)}
                    data-error-card={i}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded">#{i + 1}</span>
                      <span className="text-destructive text-xs font-medium line-through bg-red-50 px-1 rounded">{c.error}</span>
                      <span className="text-muted-foreground text-xs font-bold">→</span>
                      <span className="text-green-700 text-xs font-semibold bg-green-50 px-1 rounded">{c.suggestion}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border ${typeInfo.color}`}>{typeInfo.label}</Badge>
                      {c.is_dialect && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border bg-amber-50 text-amber-700 border-amber-200">🗣</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{c.reason}</p>
                  </div>
                )
              }) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mb-2 text-green-400 opacity-60" />
                  <p className="text-xs font-semibold text-green-600">Không có lỗi!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cách 2: Side-by-Side (giữ nguyên) ── */}
      {viewMode === "sidebyside" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Bài gốc */}
            <div className="rounded-xl border border-red-200 overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-red-50/70 border-b border-red-100 flex items-center gap-2">
                <span className="text-xs font-semibold text-red-600">📝 Bài gốc</span>
                <span className="ml-auto text-[10px] text-red-400 italic">chỗ sai gạch chân đỏ</span>
              </div>
              <div
                className="p-4 text-sm text-gray-900 font-bold font-tieu-hoc"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 39px, #fca5a5 39px, #fca5a5 40px)",
                  backgroundSize: "100% 40px",
                  backgroundPosition: "0 16px",
                  lineHeight: "40px",
                  minHeight: "160px",
                  backgroundColor: "#fff9f9",
                  paddingTop: "16px",
                }}
              >
                {corrections.length > 0
                  ? annotateText(gradingResult.original_text, corrections, "highlight-error", activeErrorIdx, setActiveErrorIdx, (idx) => setActiveErrorIdx(idx))
                  : <span className="whitespace-pre-wrap">{gradingResult.original_text}</span>
                }
              </div>
            </div>
            {/* Bài chuẩn */}
            <div className="rounded-xl border border-green-200 overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-green-50/70 border-b border-green-100 flex items-center gap-2">
                <span className="text-xs font-semibold text-green-700">✅ Bài chuẩn</span>
                <span className="ml-auto text-[10px] text-green-500 italic">chỗ sửa gạch chân xanh</span>
              </div>
              <div
                className="p-4 text-sm text-gray-900 font-bold font-tieu-hoc"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 39px, #6ee7b7 39px, #6ee7b7 40px)",
                  backgroundSize: "100% 40px",
                  backgroundPosition: "0 16px",
                  lineHeight: "40px",
                  minHeight: "160px",
                  backgroundColor: "#f6fffe",
                  paddingTop: "16px",
                }}
              >
                {corrections.length > 0
                  ? annotateText(gradingResult.fixed_text, corrections, "highlight-fix", activeErrorIdx, setActiveErrorIdx, (idx) => setActiveErrorIdx(idx))
                  : <span className="whitespace-pre-wrap">{gradingResult.fixed_text}</span>
                }
              </div>
            </div>
          </div>

          {/* Danh sách lỗi bên dưới cho Cách 2 */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="font-semibold text-sm">Danh sách lỗi chi tiết</span>
              {corrections.length > 0 && (
                <Badge className="ml-auto bg-destructive/10 text-destructive border-destructive/20 text-xs">{corrections.length} lỗi</Badge>
              )}
            </div>
            <div className="p-3">
              {corrections.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {corrections.map((c, i) => {
                    const typeInfo = ERROR_TYPE_LABELS[c.error_type] || { label: c.error_type, color: "bg-gray-100 text-gray-700 border-gray-200" }
                    const isActive = activeErrorIdx === i
                    return (
                      <div
                        key={i}
                        className={`flex flex-col gap-1 p-2.5 rounded-lg border text-sm transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300 shadow-md scale-[1.02]"
                            : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
                        }`}
                        onMouseEnter={() => setActiveErrorIdx(i)}
                        onMouseLeave={() => setActiveErrorIdx(null)}
                        onClick={() => setActiveErrorIdx(isActive ? null : i)}
                        data-error-card={i}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">#{i + 1}</span>
                          <span className="text-destructive font-medium line-through bg-red-50 px-1 rounded">{c.error}</span>
                          <span className="text-muted-foreground font-bold">→</span>
                          <span className="text-green-700 font-semibold bg-green-50 px-1 rounded">{c.suggestion}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border ${typeInfo.color}`}>{typeInfo.label}</Badge>
                          {c.is_dialect && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border bg-amber-50 text-amber-700 border-amber-200">🗣 Phương ngữ</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{c.reason}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mb-2 text-green-400 opacity-60" />
                  <p className="font-semibold text-green-600">Không có lỗi chính tả!</p>
                  <p className="text-sm mt-1">Bài viết rất tốt 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )


  // ── Luôn hiển thị fullscreen qua portal ──
  if (!open || typeof document === "undefined") return null

  const handleClose = () => { onClose() }

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column",
        overflow: "hidden", backgroundColor: "#f9f6f0",
      }}
    >
      {/* ── Header ── */}
      <div className={`bg-gradient-to-r ${scoreGradient} px-5 py-3 flex items-center gap-4 shrink-0 transition-all duration-700`}>

        {/* TRÁI: Điểm số — 1 hàng ngang */}
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 shrink-0">
          <span className="text-white/70 text-xs font-medium uppercase tracking-wide">Điểm số</span>
          <span className="text-2xl font-extrabold text-white leading-none">{displayScore}</span>
          <span className="text-white/60 text-sm">/10</span>
        </div>

        {/* GIỮA: Tên + Xếp loại */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <h2 className="text-white font-bold text-base leading-tight truncate">Kết quả chấm điểm — {studentName || "Học sinh"}</h2>
          <Badge className={`text-xs px-2.5 py-0.5 border font-semibold shrink-0 ${ratingStyle.badge}`}>
            {ratingStyle.emoji} {gradingResult.overall_rating}
          </Badge>
        </div>

        {/* PHẢI: stats + đóng */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
              <Clock className="w-3.5 h-3.5" />{(gradingResult.processingTimeMs / 1000).toFixed(1)}s
            </span>
            {gradingResult.corrections?.length > 0 && (
              <span className="flex items-center gap-1.5 bg-red-500/30 text-red-100 font-semibold rounded-lg px-2.5 py-1.5">
                <AlertCircle className="w-3.5 h-3.5" />{gradingResult.corrections.length} lỗi
              </span>
            )}
          </div>
          {/* Nút đóng — chỉ 1 nút duy nhất */}
          <button
            onClick={handleClose}
            title="Đóng"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-red-500/70 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" /> Đóng
          </button>
        </div>
      </div>

      {/* ── Body: 2 cột ── */}
      <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: "360px 1fr" }}>
        {/* Cột trái: Bảng điểm + Lưu + Nhận xét */}
        <div className="overflow-y-auto border-r border-stone-200 bg-white p-5 space-y-4">
          {scorePanelJSX}
        </div>
        {/* Cột phải: Ảnh hoặc Lỗi + Văn bản */}
        <div className="overflow-y-auto p-5" style={{ backgroundColor: "#f9f6f0" }}>
          {errorsTextsJSX}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-5 py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{isSaved ? "✅ Đã lưu vào database" : "⚠️ Chưa lưu — nhấn nút Lưu nhanh hoặc Lưu trong bảng điểm"}</p>
        <div className="flex gap-2">
          {!isSaved && (
            <Button size="sm" onClick={onSave} disabled={isSaving || !studentName.trim()} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />{isSaving ? "Đang lưu..." : "Lưu nhanh"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleClose}>Đóng</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
// ─── Main page ───────────────────────────────────────────────────────────────
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

  // Popup kết quả
  const [showResultPopup, setShowResultPopup] = useState(false)

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

  // Nhận xét giáo viên
  const [teacherComment, setTeacherComment] = useState("")

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
  // Fix Issue #6: Thống nhất ngưỡng 1600px với server-side image-processor.ts
  // Tăng quality lên 0.85 để bảo toàn nét chữ bút chì và dấu thanh tiếng Việt nhỏ
  const compressImageForAPI = (base64: string, maxDim = 1600, quality = 0.85): Promise<string> => {
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
    setTeacherComment("")
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
      // Mở popup kết quả ngay sau khi chấm xong
      setShowResultPopup(true)
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
          feedback: teacherComment || gradingResult.feedback,
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
    setShowResultPopup(false); setTeacherComment("")
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 items-start">

          {/* LEFT: Form cham diem */}
          <div className="space-y-5">
            {/* Thong tin hoc sinh */}
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
                  if (v === "processed" && uploadedImage && !processedImage) {
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
                    ⚙️ Cấu hình điểm <span className="font-normal normal-case">(thiết lập trước khi chấm)</span>
                  </p>

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

                {/* Nút mở lại popup nếu đã có kết quả */}
                {gradingResult && !showResultPopup && (
                  <Button
                    variant="outline"
                    className="w-full mt-2 gap-2 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setShowResultPopup(true)}
                  >
                    <ScrollText className="w-4 h-4" />
                    Xem lại kết quả chấm điểm
                    {isSaved && <Badge className="ml-1 bg-green-100 text-green-700 border-green-200 text-[10px]">Đã lưu</Badge>}
                  </Button>
                )}
              </CardContent>
            </Card>
        </div>

          {/* RIGHT: Huong dan su dung */}
          <div className="hidden lg:block sticky top-6 space-y-4">

            {/* Pipeline trang thai */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">🔄 Quy trình AI</p>
              <div className="space-y-2">
                {[
                  { step: 1, icon: "📷", label: "Chụp/Upload ảnh", active: !processedImage, done: !!processedImage },
                  { step: 2, icon: "🔧", label: "Tiền xử lý (9 bước)", active: !!processedImage && !ocrText, done: !!ocrText },
                  { step: 3, icon: "🔍", label: "OCR (Gemini)", active: !!ocrText && !gradingResult, done: !!gradingResult },
                  { step: 4, icon: "🤖", label: "ViT5 sửa lỗi", active: isProcessing, done: !!gradingResult },
                  { step: 5, icon: "📊", label: "Chấm điểm Levenshtein", active: !!gradingResult, done: false },
                ].map(({ step, icon, label, active, done }) => (
                  <div key={step} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    done ? "bg-green-50 text-green-700"
                    : active ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground"
                  }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      done ? "bg-green-200 text-green-700"
                      : active ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {done ? "✓" : step}
                    </span>
                    <span>{icon} {label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Huong dan su dung */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">📖 Hướng dẫn nhanh</p>
              <div className="space-y-3">
                {[
                  { num: "1", color: "bg-blue-500", title: "Nhập thông tin học sinh", desc: "Điền tên, lớp và tên bài viết" },
                  { num: "2", color: "bg-purple-500", title: "Chụp hoặc tải ảnh bài viết", desc: "Camera hoặc chọn ảnh từ máy tính" },
                  { num: "3", color: "bg-orange-500", title: "Cấu hình mức trừ điểm", desc: "Điều chỉnh điểm trừ mỗi lỗi (0.1 – 1.0)" },
                  { num: "4", color: "bg-primary", title: 'Nhấn "Chấm điểm"', desc: "AI nhận dạng → sửa lỗi → tính điểm" },
                  { num: "5", color: "bg-green-500", title: "Xem kết quả & lưu", desc: "Điều chỉnh điểm + nhận xét rồi lưu" },
                ].map(({ num, color, title, desc }) => (
                  <div key={num} className="flex gap-3">
                    <span className={`${color} text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5`}>{num}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meo hay */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">💡 Mẹo để đạt kết quả tốt</p>
              <ul className="space-y-1.5 text-xs text-amber-700">
                <li className="flex gap-2"><span>•</span><span>Chụp ảnh thẳng góc, đủ sáng, chữ gọn trong khung</span></li>
                <li className="flex gap-2"><span>•</span><span>Tránh ảnh mờ, nhòe hoặc bị che khuất</span></li>
                <li className="flex gap-2"><span>•</span><span>Có thể điều chỉnh điểm từng tiêu chí sau khi chấm</span></li>
                <li className="flex gap-2"><span>•</span><span>Nhận xét giáo viên sẽ lưu thay thế gợi ý AI</span></li>
              </ul>
            </div>

            {/* Thang diem */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">🏆 Thang điểm</p>
              <div className="space-y-1.5">
                {[
                  { range: "9–10", label: "Xuất sắc", color: "bg-emerald-100 text-emerald-700" },
                  { range: "7–8", label: "Tốt", color: "bg-green-100 text-green-700" },
                  { range: "5–6", label: "Khá", color: "bg-blue-100 text-blue-700" },
                  { range: "3–4", label: "Trung bình", color: "bg-yellow-100 text-yellow-700" },
                  { range: "0–2", label: "Cần cố gắng", color: "bg-red-100 text-red-700" },
                ].map(({ range, label, color }) => (
                  <div key={range} className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{range} điểm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Popup kết quả ── */}
      {gradingResult && (
        <ResultPopup
          open={showResultPopup}
          onClose={() => setShowResultPopup(false)}
          gradingResult={gradingResult}
          studentName={studentName}
          originalImage={uploadedImage}
          processedImage={processedImage}
          hinhThucOverride={hinhThucOverride}
          noiDungOverride={noiDungOverride}
          sangTaoOverride={sangTaoOverride}
          setHinhThucOverride={setHinhThucOverride}
          setNoiDungOverride={setNoiDungOverride}
          setSangTaoOverride={setSangTaoOverride}
          teacherComment={teacherComment}
          setTeacherComment={setTeacherComment}
          isSaving={isSaving}
          isSaved={isSaved}
          onSave={handleSave}
        />
      )}

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
