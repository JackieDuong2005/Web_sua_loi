"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Users, BookOpen, Trash2, TrendingUp, Loader2 } from "lucide-react"

interface ClassInfo {
  id: string
  name: string
  grade: number
  teacherId: string
  teacherName: string
  studentCount: number
  avgScore: number
  gradeCount: number
  createdAt: string
}

interface Teacher {
  id: string
  name: string
}

function getScoreColor(score: number) {
  if (score >= 8) return "text-success"
  if (score >= 7) return "text-info"
  return "text-warning-foreground"
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newClass, setNewClass] = useState({ name: "", grade: "3", teacherId: "" })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/classes")
      const data = await res.json()
      setClasses(data.classes || [])
    } catch {
      setError("Không thể tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/users?role=teacher")
      const data = await res.json()
      setTeachers((data.users || []).map((u: any) => ({ id: u.id, name: u.name })))
    } catch {}
  }

  useEffect(() => {
    fetchClasses()
    fetchTeachers()
  }, [])

  const handleAddClass = async () => {
    if (!newClass.name) { setError("Vui lòng nhập tên lớp"); return }
    if (!newClass.teacherId) { setError("Vui lòng chọn giáo viên chủ nhiệm"); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClass.name,
          grade: parseInt(newClass.grade),
          teacherId: newClass.teacherId,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Lỗi tạo lớp"); setSaving(false); return }
      await fetchClasses()
      setNewClass({ name: "", grade: "3", teacherId: "" })
      setIsAddDialogOpen(false)
    } catch {
      setError("Lỗi kết nối")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa lớp học này?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" })
      setClasses((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
  const overallAvg =
    classes.length > 0 && classes.some((c) => c.avgScore > 0)
      ? (classes.filter((c) => c.avgScore > 0).reduce((s, c) => s + c.avgScore, 0) /
          classes.filter((c) => c.avgScore > 0).length
        ).toFixed(1)
      : "0"

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Quản lý lớp học</h1>
          <p className="text-sm text-muted-foreground">Tạo và quản lý các lớp học trong hệ thống</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Tạo lớp mới</span>
              <span className="md:hidden">Tạo</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo lớp học mới</DialogTitle>
              <DialogDescription>Nhập thông tin để tạo lớp học</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="className">Tên lớp</Label>
                <Input
                  id="className"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  placeholder="VD: Lớp 3C"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Khối</Label>
                <Select value={newClass.grade} onValueChange={(value) => setNewClass({ ...newClass, grade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khối" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Khối 1</SelectItem>
                    <SelectItem value="2">Khối 2</SelectItem>
                    <SelectItem value="3">Khối 3</SelectItem>
                    <SelectItem value="4">Khối 4</SelectItem>
                    <SelectItem value="5">Khối 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher">Giáo viên chủ nhiệm</Label>
                <Select value={newClass.teacherId} onValueChange={(value) => setNewClass({ ...newClass, teacherId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn giáo viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <SelectItem value="__none" disabled>Chưa có GV (tạo GV trước)</SelectItem>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleAddClass} disabled={saving}>
                {saving ? <><Spinner className="mr-2" />Đang tạo...</> : "Tạo lớp"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Tổng số lớp</p>
                  <p className="text-2xl font-bold">{classes.length}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Tổng học sinh</p>
                  <p className="text-2xl font-bold text-primary">{totalStudents}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Điểm TB toàn trường</p>
                  <p className="text-2xl font-bold text-success">{overallAvg}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Số khối</p>
                  <p className="text-2xl font-bold">{new Set(classes.map((c) => c.grade)).size}</p>
                </CardContent>
              </Card>
            </div>

            {/* Classes Grid */}
            {classes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-medium">Chưa có lớp học nào</p>
                <p className="text-sm mt-1">Nhấn &ldquo;Tạo lớp mới&rdquo; để bắt đầu</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <Card key={cls.id} className="border-border/50 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <Badge variant="outline">Khối {cls.grade}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {cls.teacherName || "Chưa có GV"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-semibold">{cls.studentCount}</p>
                            <p className="text-xs text-muted-foreground">Học sinh</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className={`w-4 h-4 ${cls.avgScore > 0 ? getScoreColor(cls.avgScore) : "text-muted-foreground"}`} />
                          <div>
                            <p className={`text-lg font-semibold ${cls.avgScore > 0 ? getScoreColor(cls.avgScore) : "text-muted-foreground"}`}>
                              {cls.avgScore > 0 ? cls.avgScore : "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">Điểm TB</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cls.id)}
                          disabled={deletingId === cls.id}
                        >
                          {deletingId === cls.id ? (
                            <Spinner className="w-4 h-4" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Xóa
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
