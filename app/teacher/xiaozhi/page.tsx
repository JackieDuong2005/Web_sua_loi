"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Volume2, Loader2 } from "lucide-react"

export default function XiaozhiRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/teacher/dictation")
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
      <Volume2 className="h-8 w-8 text-indigo-600 animate-pulse" />
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang chuyển sang Trình phát đọc chính tả AI...
      </p>
    </div>
  )
}
