"use client"

import { use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, FileText, Users, CheckCircle, Clock, Camera } from "lucide-react"
import Link from "next/link"
import { mockAssignments, mockGrades } from "@/lib/mock-data"
import { getScoreLevel } from "@/lib/types"

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const assignment = mockAssignments.find(a => a.id === parseInt(id)) || mockAssignments[0]
  const grades = mockGrades.filter(g => g.assignment_id === assignment.id)

  const pending = (assignment.submission_count || 0) - (assignment.graded_count || 0)
  const avgScore = grades.length > 0 ? (grades.reduce((s, g) => s + g.final_score, 0) / grades.length).toFixed(1) : "—"

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <Link href="/teacher/assignments">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Quay lại</Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-card-foreground truncate">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">{assignment.class_name} • {assignment.created_at}</p>
        </div>
        <Link href={`/teacher/grade?assignment=${assignment.id}`}>
          <Button size="sm"><Camera className="w-4 h-4 mr-2" />Chấm điểm</Button>
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Bài nộp</p><p className="text-2xl font-bold">{assignment.submission_count}</p></CardContent></Card>
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Đã chấm</p><p className="text-2xl font-bold text-success">{assignment.graded_count}</p></CardContent></Card>
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Chưa chấm</p><p className="text-2xl font-bold text-warning-foreground">{pending}</p></CardContent></Card>
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Điểm TB</p><p className="text-2xl font-bold text-primary">{avgScore}</p></CardContent></Card>
        </div>

        {/* Template Text */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Văn bản mẫu</CardTitle>
            <CardDescription>AI sẽ dùng văn bản này để so sánh với bài viết tay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="leading-relaxed whitespace-pre-wrap text-foreground">{assignment.template_text}</p>
            </div>
            {assignment.instructions && (
              <div className="mt-4 p-3 rounded-lg bg-info/5 border border-info/20">
                <p className="text-sm font-medium text-info mb-1">Hướng dẫn:</p>
                <p className="text-sm text-muted-foreground">{assignment.instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Danh sách đã chấm</CardTitle>
            <CardDescription>Kết quả chấm điểm của học sinh</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">STT</TableHead>
                  <TableHead>Học sinh</TableHead>
                  <TableHead>Điểm AI</TableHead>
                  <TableHead>Điểm cuối</TableHead>
                  <TableHead className="hidden md:table-cell">Xếp loại</TableHead>
                  <TableHead className="hidden md:table-cell">Thời gian xử lý</TableHead>
                  <TableHead className="hidden lg:table-cell">Nhận xét</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g, i) => {
                  const level = getScoreLevel(g.final_score)
                  return (
                    <TableRow key={g.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{g.student_name}</TableCell>
                      <TableCell className="text-muted-foreground">{g.ai_score ?? "—"}</TableCell>
                      <TableCell><span className={`font-bold text-lg ${level.color}`}>{g.final_score}</span></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className={`${level.bg} ${level.color} border-0`}>{level.emoji} {level.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{g.processing_time_ms ? `${(g.processing_time_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">{g.teacher_comment || g.ai_comment || "—"}</TableCell>
                    </TableRow>
                  )
                })}
                {grades.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có bài nào được chấm</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
