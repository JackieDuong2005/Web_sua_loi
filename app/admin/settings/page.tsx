"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, School, Bell, Shield, Database } from "lucide-react"

export default function SettingsPage() {
  const [schoolName, setSchoolName] = useState("Trường Tiểu học ABC")
  const [schoolAddress, setSchoolAddress] = useState("123 Đường XYZ, Quận 1, TP.HCM")
  const [notifyGrade, setNotifyGrade] = useState(true)
  const [notifyReport, setNotifyReport] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-lg font-semibold text-card-foreground">Cài đặt hệ thống</h1>
          <p className="text-sm text-muted-foreground">Quản lý các thiết lập của hệ thống</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="school" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="school" className="gap-2">
              <School className="w-4 h-4" />
              <span className="hidden md:inline">Trường học</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">Thông báo</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">Bảo mật</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden md:inline">Dữ liệu</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="school">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Thông tin trường học</CardTitle>
                <CardDescription>Cập nhật thông tin cơ bản của trường</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">Tên trường</Label>
                    <Input
                      id="schoolName"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolAddress">Địa chỉ</Label>
                    <Input
                      id="schoolAddress"
                      value={schoolAddress}
                      onChange={(e) => setSchoolAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input id="phone" defaultValue="028 1234 5678" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="contact@school.edu.vn" />
                  </div>
                </div>
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Cài đặt thông báo</CardTitle>
                <CardDescription>Quản lý các thông báo của hệ thống</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">Thông báo khi chấm điểm xong</p>
                    <p className="text-sm text-muted-foreground">Gửi thông báo cho học sinh khi có điểm mới</p>
                  </div>
                  <Switch checked={notifyGrade} onCheckedChange={setNotifyGrade} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">Thông báo báo cáo hàng tuần</p>
                    <p className="text-sm text-muted-foreground">Gửi báo cáo tổng hợp cho giáo viên mỗi tuần</p>
                  </div>
                  <Switch checked={notifyReport} onCheckedChange={setNotifyReport} />
                </div>
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Bảo mật</CardTitle>
                <CardDescription>Cài đặt bảo mật hệ thống</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">Yêu cầu phê duyệt tài khoản mới</p>
                    <p className="text-sm text-muted-foreground">Admin phải phê duyệt trước khi tài khoản được kích hoạt</p>
                  </div>
                  <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Thời gian hết phiên (giờ)</Label>
                  <Input id="sessionTimeout" type="number" defaultValue="8" className="w-32" />
                  <p className="text-xs text-muted-foreground">Tự động đăng xuất sau thời gian không hoạt động</p>
                </div>
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Quản lý dữ liệu</CardTitle>
                <CardDescription>Sao lưu và khôi phục dữ liệu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">Tự động sao lưu</p>
                    <p className="text-sm text-muted-foreground">Sao lưu dữ liệu hàng ngày vào lúc 2:00 AM</p>
                  </div>
                  <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium mb-2">Sao lưu gần nhất</p>
                  <p className="text-sm text-muted-foreground">2024-01-15 02:00:00 - 2.4 GB</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    Sao lưu ngay
                  </Button>
                  <Button variant="outline">
                    Khôi phục dữ liệu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
