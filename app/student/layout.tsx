"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem("vihand_user")
    if (!user) {
      router.push("/")
      return
    }
    const parsed = JSON.parse(user)
    if (parsed.role !== "student") {
      router.push("/")
      return
    }
    setIsAuthed(true)
  }, [router])

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar userRole="student" />
      <SidebarInset className="min-w-0 w-full overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
