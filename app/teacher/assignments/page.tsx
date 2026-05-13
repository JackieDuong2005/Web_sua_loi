"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, FileText, Users, CheckCircle, Clock, Eye, CalendarDays } from "lucide-react"
import Link from "next/link"
import { mockAssignments } from "@/lib/mock-data"
import { Assignment } from "@/lib/types"

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [newAssignment, setNewAssignment] = useState({
    title: "", template_text: "", class_id: "1", instructions: "", deadline: ""
  })

  const filtered = assignments.filter(a => {
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (classFilter !== "all" && a.class_id.toString() !== classFilter) return false
    return true
  })

  const handleAdd = () => {
    const newA: Assignment = {
      id: assignments.length + 1, title: newAssignment.title,
      template_text: newAssignment.template_text, class_id: parseInt(newAssignment.class_id),
      teacher_id: 1, subject: "chinh_ta", max_score: 10,
      deadline: newAssignment.deadline || undefined,
      instructions: newAssignment.instructions || undefined,
      is_active: true, created_at: new Date().toISOString().split("T")[0],
      class_name: newAssignment.class_id === "1" ? "Lớp 3A" : "Lớp 3B",
      submission_count: 0, graded_count: 0,
    }
    setAssignments([newA, ...assignments])
    setNewAssignment({ title: "", template_text: "", class_id: "1", instructions: "", deadline: "" })
    setIsAddOpen(false)
  }

  const totalGraded = assignments.reduce((s, a) => s + (a.graded_count || 0), 0)
  const totalSubmissions = assignments.reduce((s, a) => s + (a.submission_count || 0), 0)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Bài tập</h1>
          <p className="text-sm text-muted-foreground">Quản lý bài chính tả và văn bản mẫu</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Tạo bài tập</span>
              <span className="md:hidden">Tạo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tạo bài tập mới</DialogTitle>
              <DialogDescription>Nhập thông tin bài chính tả và văn bản mẫu</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Tên bài tập</Label>
                <Input placeholder="VD: Bài chính tả số 4 - Mùa hè" value={newAssignment.title} onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lớp</Label>
                <Select value={newAssignment.class_id} onValueChange={v => setNewAssignment({ ...newAssignment, class_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lớp 3A</SelectItem>
                    <SelectItem value="2">Lớp 3B</SelectItem>
                    <SelectItem value="3">Lớp 4A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Văn bản mẫu <span className="text-destructive">*</span></Label>
                <Textarea rows={5} placeholder="Nhập văn bản mẫu mà học sinh sẽ viết..." value={newAssignment.template_text} onChange={e => setNewAssignment({ ...newAssignment, template_text: e.target.value })} />
                <p className="text-xs text-muted-foreground">AI sẽ dùng văn bản này để so sánh với bài viết tay của học sinh</p>
              </div>
              <div className="space-y-2">
                <Label>Hạn nộp (tùy chọn)</Label>
                <Input type="date" value={newAssignment.deadline} onChange={e => setNewAssignment({ ...newAssignment, deadline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hướng dẫn thêm (tùy chọn)</Label>
                <Textarea rows={2} placeholder="Ghi chú thêm cho bài tập..." value={newAssignment.instructions} onChange={e => setNewAssignment({ ...newAssignment, instructions: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Hủy</Button>
              <Button onClick={handleAdd} disabled={!newAssignment.title || !newAssignment.template_text}>Tạo bài tập</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tổng bài tập</p><p className="text-2xl font-bold">{assignments.length}</p></CardContent></Card>
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Đang hoạt động</p><p className="text-2xl font-bold text-success">{assignments.filter(a => a.is_active).length}</p></CardContent></Card>
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tổng bài nộp</p><p className="text-2xl font-bold text-primary">{totalSubmissions}</p></CardContent></Card>
          <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Đã chấm</p><p className="text-2xl font-bold text-info">{totalGraded}</p></CardContent></Card>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Tìm bài tập..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Lớp" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả lớp</SelectItem>
                  <SelectItem value="1">Lớp 3A</SelectItem>
                  <SelectItem value="2">Lớp 3B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => (
            <Card key={a.id} className="border-border/50 hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-1">{a.title}</CardTitle>
                  <Badge variant="outline" className={a.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                    {a.is_active ? "Đang mở" : "Đã đóng"}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Users className="w-3 h-3" /> {a.class_name}
                  {a.deadline && <><CalendarDays className="w-3 h-3 ml-2" /> {a.deadline}</>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm line-clamp-3 text-muted-foreground italic">&ldquo;{a.template_text}&rdquo;</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div><p className="font-semibold">{a.submission_count}</p><p className="text-xs text-muted-foreground">Bài nộp</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <div><p className="font-semibold text-success">{a.graded_count}</p><p className="text-xs text-muted-foreground">Đã chấm</p></div>
                  </div>
                </div>
                {(a.submission_count || 0) > (a.graded_count || 0) && (
                  <div className="flex items-center gap-2 text-sm text-warning-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{(a.submission_count || 0) - (a.graded_count || 0)} bài chưa chấm</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/teacher/assignments/${a.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full"><Eye className="w-4 h-4 mr-1" />Chi tiết</Button>
                  </Link>
                  <Link href={`/teacher/grade?assignment=${a.id}`} className="flex-1">
                    <Button size="sm" className="w-full">Chấm điểm</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
