"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Mic, Bot, Clock, BookOpen, Loader2, Trash2,
  ChevronRight, GraduationCap, Search, Filter, X, SlidersHorizontal,
} from "lucide-react"

interface DictationLog {
  id: string
  speaker: string
  content: string
  createdAt: string
}

interface DictationSession {
  id: string
  title: string
  passage: string
  className: string
  teacherName: string
  status: string
  summary: string
  createdAt: string
  logs: DictationLog[]
}

type TimeFilter = "all" | "today" | "yesterday" | "week" | "month"

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Hôm nay"
  if (diffDays === 1) return "Hôm qua"
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString("vi-VN")
}

function isWithinTimeFilter(dateStr: string, filter: TimeFilter): boolean {
  if (filter === "all") return true
  const date = new Date(dateStr)
  const now = new Date()

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  switch (filter) {
    case "today":
      return date >= startOfDay(now)
    case "yesterday": {
      const yest = new Date(now)
      yest.setDate(now.getDate() - 1)
      return date >= startOfDay(yest) && date < startOfDay(now)
    }
    case "week": {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      return date >= weekAgo
    }
    case "month": {
      const monthAgo = new Date(now)
      monthAgo.setMonth(now.getMonth() - 1)
      return date >= monthAgo
    }
    default:
      return true
  }
}



export default function DictationPage() {
  const [sessions, setSessions] = useState<DictationSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedSession, setSelectedSession] = useState<DictationSession | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/dictation/sessions?limit=50")
      if (!res.ok) throw new Error("Không thể tải dữ liệu")
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // Extract unique class names for filter dropdown
  const uniqueClasses = useMemo(() => {
    const classes = sessions
      .map((s) => s.className)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort()
    return classes
  }, [sessions])

  // Apply all filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Search filter
      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const matchTitle = session.title?.toLowerCase().includes(q)
        const matchPassage = session.passage?.toLowerCase().includes(q)
        const matchClass = session.className?.toLowerCase().includes(q)
        if (!matchTitle && !matchPassage && !matchClass) return false
      }

      // Class filter
      if (classFilter !== "all" && session.className !== classFilter) return false

      // Time filter
      if (!isWithinTimeFilter(session.createdAt, timeFilter)) return false

      return true
    })
  }, [sessions, searchQuery, classFilter, timeFilter])

  const hasActiveFilters = searchQuery.trim() !== "" || classFilter !== "all" || timeFilter !== "all"

  const clearFilters = () => {
    setSearchQuery("")
    setClassFilter("all")
    setTimeFilter("all")
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Bạn có chắc muốn xoá phiên đọc chính tả này?")) return
    try {
      const res = await fetch(`/api/dictation/sessions/${sessionId}`, { method: "DELETE" })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        if (selectedSession?.id === sessionId) {
          setDialogOpen(false)
          setSelectedSession(null)
        }
      }
    } catch {
      alert("Lỗi khi xoá phiên")
    }
  }

  const openDetail = (session: DictationSession) => {
    setSelectedSession(session)
    setDialogOpen(true)
  }

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: "all", label: "Tất cả thời gian" },
    { value: "today", label: "Hôm nay" },
    { value: "yesterday", label: "Hôm qua" },
    { value: "week", label: "7 ngày qua" },
    { value: "month", label: "Tháng này" },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Đọc chính tả — Xiaozhi AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Lịch sử các buổi đọc chính tả được lưu tự động từ Xiaozhi Chatbot
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0 overflow-x-hidden">
        {/* Stats Row */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-xs text-muted-foreground">Tổng phiên</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <GraduationCap className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(sessions.map((s) => s.className).filter(Boolean)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Lớp đã đọc</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sessions.length > 0 ? formatRelativeDate(sessions[0].createdAt) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Phiên gần nhất</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Danh sách phiên đọc chính tả
            </CardTitle>
            <CardDescription>
              Mỗi phiên được Xiaozhi AI tự động lưu khi hoàn thành đọc bài cho học sinh
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ── Search & Filter Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="dictation-search"
                  placeholder="Tìm kiếm theo tên bài, nội dung, lớp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Xoá tìm kiếm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Class filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger id="class-filter" className="w-[140px]">
                    <SelectValue placeholder="Chọn lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả lớp</SelectItem>
                    {uniqueClasses.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                  <SelectTrigger id="time-filter" className="w-[160px]">
                    <SelectValue placeholder="Thời gian" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeFilterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filter summary + clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-accent/40 rounded-lg px-3 py-2">
                <span>
                  Đang lọc: hiển thị{" "}
                  <span className="font-semibold text-foreground">{filteredSessions.length}</span>{" "}
                  / {sessions.length} phiên
                  {classFilter !== "all" && (
                    <> · Lớp <Badge variant="secondary" className="text-xs mx-1">{classFilter}</Badge></>
                  )}
                  {timeFilter !== "all" && (
                    <> · {timeFilterOptions.find((o) => o.value === timeFilter)?.label}</>
                  )}
                  {searchQuery && <> · &quot;{searchQuery}&quot;</>}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Xoá bộ lọc
                </Button>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Đang tải dữ liệu...</span>
              </div>
            ) : error ? (
              <div className="text-center py-16 text-destructive text-sm">{error}</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">
                  Chưa có phiên đọc chính tả nào. Hãy nhờ Xiaozhi AI đọc bài cho học sinh!
                </p>
                <p className="text-xs text-muted-foreground">
                  Nói với Xiaozhi: &quot;Đọc bài chính tả Ai có lỗi cho lớp 3A1&quot;
                </p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  Không tìm thấy phiên nào phù hợp với bộ lọc hiện tại.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-2" />
                  Xoá bộ lọc
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-accent/50 cursor-pointer transition-colors group"
                    onClick={() => openDetail(session)}
                  >
                    {/* Icon */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                      <Mic className="w-5 h-5 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{session.title}</p>
                        {session.className && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {session.className}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {session.passage.substring(0, 80)}...
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-muted-foreground">{formatRelativeDate(session.createdAt)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(session.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-primary" />
                  {selectedSession.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(selectedSession.createdAt)}
                  </span>
                  {selectedSession.className && (
                    <Badge variant="secondary">{selectedSession.className}</Badge>
                  )}
                  {selectedSession.teacherName && (
                    <span className="text-xs">GV: {selectedSession.teacherName}</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Passage */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Đoạn văn chính tả
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedSession.passage}
                    </p>
                  </CardContent>
                </Card>


              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
