"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { PenLine, ArrowLeft, User, Lock, GraduationCap, BookOpen, Eye, EyeOff, CheckCircle } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()

  // Form state
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"student" | "teacher">("student")
  const [className, setClassName] = useState("")

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [classes, setClasses] = useState<{ id: string; name: string; grade: number }[]>([])

  // Load available classes
  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        if (data.classes) setClasses(data.classes)
      })
      .catch(() => {})
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Client-side validation
    if (!name.trim()) {
      setError("Vui lòng nhập họ và tên")
      return
    }
    if (!username.trim() || username.length < 3) {
      setError("Tên đăng nhập phải có ít nhất 3 ký tự")
      return
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      return
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }
    if (role === "student" && !className) {
      setError("Vui lòng chọn lớp học")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          confirmPassword,
          role,
          className: role === "student" ? className : "",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Đăng ký thất bại")
        setIsLoading(false)
        return
      }

      setSuccess(data.message || "Đăng ký thành công!")
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch {
      setError("Không thể kết nối server. Vui lòng thử lại.")
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <PenLine className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ViHand Grade</h1>
          <p className="text-muted-foreground text-center mt-1 text-sm">
            Hệ thống chấm điểm chữ viết tay tiếng Việt
          </p>
        </div>

        {/* Register Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Đăng ký tài khoản</CardTitle>
            <CardDescription className="text-center">
              Điền thông tin bên dưới để tạo tài khoản mới
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Success message */}
            {success && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/50 p-3 rounded-lg mb-4 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Họ và tên <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nhập họ và tên đầy đủ"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  className="bg-background"
                  autoFocus
                  disabled={!!success}
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="reg-username" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Tên đăng nhập <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-username"
                  type="text"
                  placeholder="Ít nhất 3 ký tự, không dấu, không khoảng trắng"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.replace(/\s/g, "")); setError(""); }}
                  className="bg-background"
                  disabled={!!success}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Mật khẩu <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ít nhất 6 ký tự"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="bg-background pr-10"
                    disabled={!!success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password" className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Xác nhận mật khẩu <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    className="bg-background pr-10"
                    disabled={!!success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password match indicator */}
                {confirmPassword && (
                  <p className={`text-xs ${password === confirmPassword ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {password === confirmPassword ? "✓ Mật khẩu khớp" : "✗ Mật khẩu không khớp"}
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Vai trò <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setRole("student"); setClassName(""); setError(""); }}
                    disabled={!!success}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      role === "student"
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-sm font-medium">Học sinh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRole("teacher"); setClassName(""); setError(""); }}
                    disabled={!!success}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      role === "teacher"
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-sm font-medium">Giáo viên</span>
                  </button>
                </div>
              </div>

              {/* Class Selection (for students only) */}
              {role === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="reg-class" className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Lớp học <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="reg-class"
                    value={className}
                    onChange={(e) => { setClassName(e.target.value); setError(""); }}
                    disabled={!!success}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {classes.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Chưa có lớp nào được tạo. Liên hệ quản trị viên.
                    </p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-2.5 rounded-lg">{error}</p>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading || !!success}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Đang xử lý...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="mr-2 w-4 h-4" />
                    Đã đăng ký thành công
                  </>
                ) : (
                  "Đăng ký"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer - Link back to login */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Đã có tài khoản? Đăng nhập tại đây
          </Link>
        </div>
      </div>
    </main>
  )
}
