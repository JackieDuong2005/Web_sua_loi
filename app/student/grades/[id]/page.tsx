"use client"

import { use, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageCircle, AlertCircle, Clock, Zap, Loader2 } from "lucide-react"
import Link from "next/link"

interface GradeDetail {
  id: string
  studentName: string
  assignmentTitle: string
  className: string
  originalText: string
  fixedText: string
  corrections: string
  score: string
  scoreNum: number
  feedback: string
  overallRating: string
  processingTimeMs: number
  tokenCount: number
  imageBase64: string
  createdAt: string
}

interface Correction {
  error: string
  suggestion: string
  reason: string
}

function getScoreLevel(score: number) {
  if (score >= 9) return { label: "Hoàn thành tốt", color: "text-success", bg: "bg-success/10", emoji: "🌟" }
  if (score >= 7) return { label: "Hoàn thành", color: "text-info", bg: "bg-info/10", emoji: "👍" }
  if (score >= 5) return { label: "Cần cố gắng", color: "text-warning-foreground", bg: "bg-warning/10", emoji: "📝" }
  return { label: "Chưa hoàn thành", color: "text-destructive", bg: "bg-destructive/10", emoji: "💪" }
}

export default function StudentGradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [grade, setGrade] = useState<GradeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchGrade() {
      try {
        const res = await fetch(`/api/grades/${id}`)
        if (!res.ok) throw new Error("Không tìm thấy bài")
        const data = await res.json()
        setGrade(data.grade)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchGrade()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="h-6" />
          <span className="text-muted-foreground">Đang tải...</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !grade) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="h-6" />
          <Link href="/student/history"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Quay lại</Button></Link>
        </header>
        <div className="flex-1 flex items-center justify-center text-destructive">
          {error || "Không tìm thấy bài"}
        </div>
      </div>
    )
  }

  const level = getScoreLevel(grade.scoreNum)
  let corrections: Correction[] = []
  try { corrections = JSON.parse(grade.corrections) } catch {}

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <Link href="/student/history"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Quay lại</Button></Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">{grade.assignmentTitle}</h1>
          <p className="text-sm text-muted-foreground">Ngày chấm: {new Date(grade.createdAt).toLocaleString("vi-VN")}</p>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {/* Ảnh bài viết */}
        {grade.imageBase64 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ảnh bài viết</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={grade.imageBase64}
                alt="Ảnh bài viết của {grade.studentName}"
                className="w-full rounded-lg border border-border object-contain max-h-80"
              />
            </CardContent>
          </Card>
        )}

        {/* Score Display */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-6">
              <div className={`flex items-center justify-center w-24 h-24 rounded-2xl ${level.bg} shadow-lg`}>
                <span className={`text-4xl font-bold ${level.color}`}>{grade.scoreNum}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{level.emoji}</span>
                  <span className={`text-xl font-semibold ${level.color}`}>{level.label}</span>
                </div>
                <p className="text-muted-foreground">Điểm: {grade.score}</p>
                {grade.overallRating && (
                  <Badge variant="outline" className="mt-2 text-xs">{grade.overallRating}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Original Text */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Văn bản gốc</CardTitle>
              <CardDescription>Nội dung AI nhận dạng từ bài viết</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="leading-relaxed whitespace-pre-wrap">{grade.originalText || "Không có dữ liệu"}</p>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(grade.processingTimeMs / 1000).toFixed(1)}s</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{grade.tokenCount} tokens</span>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                Lỗi phát hiện ({corrections.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {corrections.length > 0 ? (
                <div className="space-y-2">
                  {corrections.map((c, i) => (
                    <div key={i} className="p-2 rounded-lg border border-border/50 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-destructive line-through font-medium">{c.error}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-success font-medium">{c.suggestion}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-success font-medium">🌟 Không có lỗi!</p>
                  <p className="text-sm mt-1">Bài viết rất tốt</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Văn bản đã sửa */}
        {grade.fixedText && (
          <Card className="border-border/50 border-green-200">
            <CardHeader>
              <CardTitle className="text-base">Văn bản đã sửa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <p className="leading-relaxed whitespace-pre-wrap">{grade.fixedText}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback */}
        <Card className="border-border/50 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-primary mb-1">Nhận xét:</p>
                <p className="text-foreground">{grade.feedback || "Chưa có nhận xét"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
