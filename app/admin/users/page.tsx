"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Trash2, BookOpen, PenLine, Users, Loader2, KeyRound, Eye, EyeOff } from "lucide-react"

interface User {
  id: string
  name: string
  username: string
  role: string
  className: string
  active: boolean
  createdAt: string
}

const roleConfig: Record<string, { label: string; icon: any; color: string }> = {
  teacher: { label: "Giáo viên", icon: BookOpen, color: "bg-primary/10 text-primary" },
  student: { label: "Học sinh", icon: PenLine, color: "bg-info/10 text-info" },
  admin: { label: "Quản trị", icon: Users, color: "bg-success/10 text-success" },
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", username: "", password: "", role: "student", className: "" })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [showNewPw, setShowNewPw] = useState(false)
  const [resetting, setResetting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (roleFilter !== "all") params.set("role", roleFilter)
      const res = await fetch(`/api/users?${params}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      setError("Không thể tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter])

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes")
      const data = await res.json()
      setClasses((data.classes || []).map((c: any) => ({ id: c.id, name: c.name })))
    } catch {}
  }

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { fetchClasses() }, [])

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username) { setError("Vui lòng nhập đầy đủ họ tên và tên đăng nhập"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser, password: newUser.password || "123456" }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Lỗi tạo người dùng"); return }
      setUsers((prev) => [data.user, ...prev])
      setNewUser({ name: "", username: "", password: "", role: "student", className: "" })
      setIsAddDialogOpen(false)
    } catch {
      setError("Lỗi kết nối")
    } finally {
      setSaving(false)
    }
  }

  const toggleUserActive = async (user: User) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)))
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa người dùng này?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/users/${id}`, { method: "DELETE" })
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget || newPassword.trim().length < 6) return
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword.trim() }),
      })
      if (!res.ok) throw new Error("Lỗi cập nhật")
      setResetTarget(null)
      setNewPassword("")
    } catch {
      alert("Không thể đổi mật khẩu")
    } finally {
      setResetting(false)
    }
  }

  const totalUsers = users.length
  const teacherCount = users.filter((u) => u.role === "teacher").length
  const studentCount = users.filter((u) => u.role === "student").length
  const activeCount = users.filter((u) => u.active).length

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground">Thêm, sửa, xóa tài khoản người dùng</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">Thêm người dùng</span>
              <span className="md:hidden">Thêm</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm người dùng mới</DialogTitle>
              <DialogDescription>Nhập thông tin để tạo tài khoản mới</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="nguyenvana"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Mặc định: 123456"
                />
                <p className="text-xs text-muted-foreground">Để trống sẽ dùng mật khẩu mặc định: <strong>123456</strong></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Giáo viên</SelectItem>
                    <SelectItem value="student">Học sinh</SelectItem>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newUser.role === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="class">Lớp</Label>
                  <Select value={newUser.className} onValueChange={(value) => setNewUser({ ...newUser, className: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn lớp" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.length === 0 ? (
                        <SelectItem value="__none" disabled>Chưa có lớp nào (tạo lớp trước)</SelectItem>
                      ) : (
                        classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleAddUser} disabled={saving}>
                {saving ? <><Spinner className="mr-2" />Đang tạo...</> : "Thêm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Tổng số</p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Giáo viên</p>
              <p className="text-2xl font-bold text-primary">{teacherCount}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Học sinh</p>
              <p className="text-2xl font-bold text-info">{studentCount}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Đang hoạt động</p>
              <p className="text-2xl font-bold text-success">{activeCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm người dùng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="teacher">Giáo viên</SelectItem>
                  <SelectItem value="student">Học sinh</SelectItem>
                  <SelectItem value="admin">Quản trị</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Danh sách người dùng</CardTitle>
            <CardDescription>
              {loading ? "Đang tải..." : `Hiển thị ${users.length} người dùng`}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">Chưa có người dùng nào</p>
                <p className="text-sm mt-1">Nhấn &ldquo;Thêm người dùng&rdquo; để bắt đầu</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead className="hidden md:table-cell">Tên đăng nhập</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead className="hidden lg:table-cell">Lớp</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const roleInfo = roleConfig[user.role] || roleConfig.student
                    const RoleIcon = roleInfo.icon
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">{user.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleInfo.color}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{user.className || "-"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={user.active}
                            onCheckedChange={() => toggleUserActive(user)}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              title="Đổi mật khẩu"
                              onClick={() => { setResetTarget(user); setNewPassword(""); setShowNewPw(false) }}
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(user.id)}
                              disabled={deletingId === user.id}
                            >
                              {deletingId === user.id ? (
                                <Spinner className="w-4 h-4" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Đổi mật khẩu
            </DialogTitle>
            <DialogDescription>
              Đổi mật khẩu cho <strong>{resetTarget?.name}</strong> ({resetTarget?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Mật khẩu mới</Label>
            <div className="relative">
              <Input
                type={showNewPw ? "text" : "password"}
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setShowNewPw(!showNewPw)}
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Tối thiểu 6 ký tự</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Hủy</Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetting || newPassword.trim().length < 6}
            >
              {resetting ? <><Spinner className="mr-2" />Đang lưu...</> : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
