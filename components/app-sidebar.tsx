"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  PenLine, LayoutDashboard, Camera, FileText, History, Users, Settings,
  LogOut, ChevronUp, BarChart3, School, Server, Volume2,
} from "lucide-react"

type UserRole = "teacher" | "student" | "admin"

interface AppSidebarProps {
  userRole: UserRole
}

const teacherMenuItems = [
  { title: "Tổng quan", icon: LayoutDashboard, href: "/teacher" },
  { title: "Chấm điểm", icon: Camera, href: "/teacher/grade" },
  { title: "Đọc chính tả", icon: Volume2, href: "/teacher/dictation" },
  { title: "Báo cáo lớp", icon: FileText, href: "/teacher/reports" },
]

const studentMenuItems = [
  { title: "Tổng quan", icon: LayoutDashboard, href: "/student" },
  { title: "Lịch sử điểm", icon: History, href: "/student/history" },
]

const adminMenuItems = [
  { title: "Tổng quan", icon: LayoutDashboard, href: "/admin" },
  { title: "Quản lý người dùng", icon: Users, href: "/admin/users" },
  { title: "Quản lý lớp học", icon: School, href: "/admin/classes" },
  { title: "Thống kê", icon: BarChart3, href: "/admin/statistics" },
  { title: "Hệ thống", icon: Server, href: "/admin/system" },
  { title: "Cài đặt", icon: Settings, href: "/admin/settings" },
]

export function AppSidebar({ userRole }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState("Người dùng")

  useEffect(() => {
    const userStr = localStorage.getItem("vihand_user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserName(user.name || "Người dùng")
      } catch {}
    }
  }, [])

  const menuItems = userRole === "teacher"
    ? teacherMenuItems
    : userRole === "student"
    ? studentMenuItems
    : adminMenuItems

  const roleLabels: Record<UserRole, string> = {
    teacher: "Giáo viên",
    student: "Học sinh",
    admin: "Quản trị viên",
  }

  const roleAvatars: Record<UserRole, string> = {
    teacher: "GV",
    student: "HS",
    admin: "QT",
  }

  const handleLogout = () => {
    localStorage.removeItem("vihand_user")
    router.push("/")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sidebar-primary">
            <PenLine className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">ViHand Grade</span>
            <span className="text-xs text-sidebar-foreground/60">{roleLabels[userRole]}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== `/${userRole}` && pathname.startsWith(item.href))}
                  >
                    <a href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                      {roleAvatars[userRole]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left truncate">{userName}</span>
                  <ChevronUp className="w-4 h-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
