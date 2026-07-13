"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Mic, Bot, User, Clock, BookOpen, MessageSquare, Loader2, Trash2,
  ChevronRight, GraduationCap,
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

function SpeakerIcon({ speaker }: { speaker: string }) {
  switch (speaker) {
    case "xiaozhi":
      return <Bot className="w-4 h-4 text-primary" />
    case "teacher":
      return <GraduationCap className="w-4 h-4 text-amber-500" />
    case "student":
      return <User className="w-4 h-4 text-emerald-500" />
    default:
      return <MessageSquare className="w-4 h-4 text-muted-foreground" />
  }
}

function SpeakerLabel({ speaker }: { speaker: string }) {
  switch (speaker) {
    case "xiaozhi":
      return <span className="text-xs font-semibold text-primary">Xiaozhi AI</span>
    case "teacher":
      return <span className="text-xs font-semibold text-amber-600">Giáo viên</span>
    case "student":
      return <span className="text-xs font-semibold text-emerald-600">Học sinh</span>
    default:
      return <span className="text-xs font-semibold text-muted-foreground">{speaker}</span>
  }
}

export default function DictationPage() {
  const [sessions, setSessions] = useState<DictationSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedSession, setSelectedSession] = useState<DictationSession | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sessions.reduce((sum, s) => sum + (s.logs?.length || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Tổng lượt chat</p>
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
          <CardContent>
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
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
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
                      <div className="flex items-center gap-2">
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
                        <p className="text-xs text-muted-foreground">
                          {session.logs?.length || 0} lượt chat
                        </p>
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

                {/* Summary */}
                {selectedSession.summary && (
                  <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        📝 {selectedSession.summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Chat Logs */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Nhật ký hội thoại ({selectedSession.logs?.length || 0} lượt)
                  </h3>
                  <div className="space-y-3">
                    {selectedSession.logs?.length > 0 ? (
                      selectedSession.logs.map((log) => (
                        <div
                          key={log.id}
                          className={`flex gap-3 ${
                            log.speaker === "xiaozhi" ? "" : "flex-row-reverse"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                              log.speaker === "xiaozhi"
                                ? "bg-primary/10"
                                : log.speaker === "teacher"
                                ? "bg-amber-500/10"
                                : "bg-emerald-500/10"
                            }`}
                          >
                            <SpeakerIcon speaker={log.speaker} />
                          </div>
                          <div
                            className={`flex-1 max-w-[80%] ${
                              log.speaker === "xiaozhi" ? "" : "text-right"
                            }`}
                          >
                            <SpeakerLabel speaker={log.speaker} />
                            <div
                              className={`mt-1 p-3 rounded-xl text-sm leading-relaxed ${
                                log.speaker === "xiaozhi"
                                  ? "bg-muted rounded-tl-sm"
                                  : log.speaker === "teacher"
                                  ? "bg-amber-500/10 rounded-tr-sm ml-auto"
                                  : "bg-emerald-500/10 rounded-tr-sm ml-auto"
                              }`}
                            >
                              {log.content}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Không có log hội thoại cho phiên này
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
