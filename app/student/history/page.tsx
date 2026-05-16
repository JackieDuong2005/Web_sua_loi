"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Eye, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Grade {
  id: string
  studentName: string
  assignmentTitle: string
  className: string
  scoreNum: number
  score: string
  feedback: string
  originalText: string
  fixedText: string
  corrections: string
  overallRating: string
  createdAt: string
}

interface Correction {
  error: string
  suggestion: string
  error_type?: string
  is_dialect?: boolean
  reason: string
}

function getScoreLevel(score: number) {
  if (score >= 9) return { label: "Xuất sắc", color: "text-emerald-600", bg: "bg-emerald-50", emoji: "🏆" }
  if (score >= 7) return { label: "Tốt", color: "text-success", bg: "bg-success/10", emoji: "🌟" }
  if (score >= 5) return { label: "Khá", color: "text-info", bg: "bg-info/10", emoji: "⭐" }
  if (score >= 3) return { label: "Trung bình", color: "text-warning-foreground", bg: "bg-warning/10", emoji: "📈" }
  return { label: "Cần cố gắng", color: "text-destructive", bg: "bg-destructive/10", emoji: "📝" }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN")
}

export default function StudentHistoryPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Lấy thông tin user đã đăng nhập
        const userStr = localStorage.getItem("vihand_user")
        let myName = ""
        if (userStr) {
          const user = JSON.parse(userStr)
          myName = user.name || ""
        }

        const res = await fetch("/api/grades")
        if (!res.ok) throw new Error("Không thể tải dữ liệu")
        const data = await res.json()
        const allGrades = data.grades || []

        // Lọc chỉ bài của học sinh này
        setGrades(myName ? allGrades.filter((g: any) => g.studentName === myName) : allGrades)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const avg =
    grades.length > 0
      ? (grades.reduce((s, g) => s + g.scoreNum, 0) / grades.length).toFixed(1)
      : "0"
  const excellent = grades.filter((g) => g.scoreNum >= 9).length
  const good = grades.filter((g) => g.scoreNum >= 7 && g.scoreNum < 9).length

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-lg font-semibold text-card-foreground">Lịch sử điểm</h1>
          <p className="text-sm text-muted-foreground">Tất cả các bài viết đã được chấm</p>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-sm">{error}</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Tổng số bài</p>
                  <p className="text-2xl font-bold">{grades.length}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 border-success/20">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Hoàn thành tốt</p>
                  <p className="text-2xl font-bold text-success">{excellent}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 border-info/20">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Hoàn thành</p>
                  <p className="text-2xl font-bold text-info">{good}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Điểm TB</p>
                  <p className="text-2xl font-bold">{avg}</p>
                </CardContent>
              </Card>
            </div>

            {/* Grade List */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Danh sách bài viết</CardTitle>
                <CardDescription>Nhấn &ldquo;Xem chi tiết&rdquo; để xem nội dung và nhận xét</CardDescription>
              </CardHeader>
              <CardContent>
                {grades.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Chưa có bài nào được chấm điểm.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {grades.map((grade) => {
                      const level = getScoreLevel(grade.scoreNum)
                      return (
                        <div
                          key={grade.id}
                          className="flex flex-col gap-3 p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex items-center justify-center w-12 h-12 shrink-0 rounded-xl ${level.bg}`}
                            >
                              <span className={`text-lg font-bold ${level.color}`}>{grade.scoreNum}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="font-medium truncate">{grade.assignmentTitle}</p>
                                <Badge variant="outline" className={`${level.bg} ${level.color} border-0 shrink-0`}>
                                  {level.emoji} {level.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {grade.feedback || "Không có nhận xét"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {grade.studentName} • {formatDate(grade.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedGrade(grade)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Xem chi tiết
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedGrade} onOpenChange={(open) => !open && setSelectedGrade(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết bài: {selectedGrade?.studentName}</DialogTitle>
          </DialogHeader>
          {selectedGrade && (
            <div className="space-y-4 text-sm">
              <div className="flex gap-3 flex-wrap">
                <Badge variant="outline">{selectedGrade.className || "Không rõ lớp"}</Badge>
                <Badge variant="outline">{selectedGrade.assignmentTitle}</Badge>
                <Badge variant="secondary" className="text-lg font-bold">{selectedGrade.score}</Badge>
                {selectedGrade.overallRating && (
                  <Badge variant="outline">{selectedGrade.overallRating}</Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Nhận xét:</p>
                <p className="leading-relaxed">{selectedGrade.feedback}</p>
              </div>

              {(() => {
                let corrections: Correction[] = []
                try { corrections = JSON.parse(selectedGrade.corrections) } catch {}
                return corrections.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">Lỗi chính tả ({corrections.length}):</p>
                    {corrections.map((c, i) => (
                      <div key={i} className="p-2 rounded border border-border/60 bg-muted/30">
                        <span className="text-destructive line-through">{c.error}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className="text-green-600 font-medium">{c.suggestion}</span>
                        <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : null
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Văn bản gốc:</p>
                  <div className="p-3 rounded bg-muted/40 border text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedGrade.originalText}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Văn bản đã sửa:</p>
                  <div className="p-3 rounded bg-green-50 border border-green-100 text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedGrade.fixedText}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Chấm lúc: {new Date(selectedGrade.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
