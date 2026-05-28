"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { PenLine, UserPlus } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại")
        setIsLoading(false)
        return
      }

      // Lưu thông tin user vào localStorage
      localStorage.setItem("vihand_user", JSON.stringify(data.user))

      // Redirect theo role
      switch (data.user.role) {
        case "teacher":
          router.push("/teacher")
          break
        case "student":
          router.push("/student")
          break
        case "admin":
          router.push("/admin")
          break
        default:
          router.push("/teacher")
      }
    } catch {
      setError("Không thể kết nối server")
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <PenLine className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ViHand Grade</h1>
          <p className="text-muted-foreground text-center mt-2">
            Hệ thống chấm điểm chữ viết tay tiếng Việt
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Đăng nhập</CardTitle>
            <CardDescription className="text-center">
              Đăng nhập để sử dụng hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-lg">{error}</p>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer - Register link */}
        <div className="text-center mt-6 space-y-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Chưa có tài khoản? Đăng ký ngay
          </Link>
          <p className="text-xs text-muted-foreground">
            Hoặc liên hệ quản trị viên để được cấp tài khoản
          </p>
        </div>
      </div>
      {/* Hidden Admin Register Trigger - góc dưới phải */}
      <Link
        href="/admin-register"
        className="fixed bottom-4 right-4 select-none no-underline z-50"
        style={{
          color: 'inherit',
          opacity: 0.05,
          transition: 'opacity 0.3s ease',
          fontSize: '11px',
          lineHeight: 1,
          padding: '6px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.3'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.05'; }}
        title=""
        tabIndex={-1}
        aria-hidden="true"
      >
        A
      </Link>
    </main>
  )
}
