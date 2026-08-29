"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Bot, Cpu, BookOpen, ScrollText, Wifi, WifiOff, Volume2,
  Plus, Trash2, RefreshCw, Send, Eye, Pencil, Settings2,
  GraduationCap, Mic, Play, Save, CheckCircle2, Clock, Loader2,
  AlertCircle, X, ChevronRight, Radio,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RobotDevice {
  id: string
  macAddress: string
  name: string
  ipAddress: string
  className: string
  isOnline: boolean
  volume: number
  voiceName: string
  speedRate: string
  lastSeen: string
  createdAt: string
}

interface TextbookPassage {
  id: string
  gradeLevel: number
  bookSet: string
  unit: string
  title: string
  content: string
  difficultWords: string
  createdAt: string
}

interface DictationSession {
  id: string
  title: string
  passage: string
  className: string
  teacherName: string
  source: string      // "robot" | "mcp" | "manual"
  deviceId: string    // MAC Address Robot (nếu source="robot")
  status: string
  summary: string
  createdAt: string
  logs?: { id: string; speaker: string; content: string; createdAt: string }[]
}

interface XiaozhiConfig {
  voiceName: string
  speedRate: string
  volume: number
  llmProvider: string
  llmModel: string
  asrProvider: string
  systemPrompt: string
  mcpEnabled: boolean
  mcpEndpoint: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VOICE_OPTIONS = [
  { value: "vi-VN-HoaiMyNeural", label: "Hoài My (Nữ) — Giọng miền Nam" },
  { value: "vi-VN-NamMinhNeural", label: "Nam Minh (Nam) — Giọng miền Nam" },
]
const SPEED_OPTIONS = [
  { value: "-25%", label: "-25% (Rất chậm — Lớp 1-2)" },
  { value: "-15%", label: "-15% (Chuẩn chính tả Tiểu học)" },
  { value: "-5%",  label: "-5% (Hơi chậm)" },
  { value: "+0%",  label: "0% (Bình thường — Đàm thoại)" },
]
const BOOKSET_OPTIONS = [
  { value: "KetNoi",   label: "Kết Nối Tri Thức" },
  { value: "CanhDieu", label: "Cánh Diều" },
  { value: "ChanTroi", label: "Chân Trời Sáng Tạo" },
]

function formatDate(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime()
  if (diff < 60_000) return "Vừa xong"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`
  return `${Math.floor(diff / 86_400_000)} ngày trước`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ online }: { online: boolean }) {
  return online ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      ONLINE
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      OFFLINE
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function XiaozhiHubPage() {
  const router = useRouter()

  // ── Data states
  const [devices, setDevices] = useState<RobotDevice[]>([])
  const [passages, setPassages] = useState<TextbookPassage[]>([])
  const [sessions, setSessions] = useState<DictationSession[]>([])
  const [config, setConfig] = useState<XiaozhiConfig | null>(null)

  // ── Loading / error
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [loadingPassages, setLoadingPassages] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)

  // ── Filter/search
  const [passageSearch, setPassageSearch] = useState("")
  const [passageGrade, setPassageGrade] = useState("all")
  const [passageBook, setPassageBook] = useState("all")
  const [sessionSearch, setSessionSearch] = useState("")

  // ── Dialogs
  const [addPassageOpen, setAddPassageOpen] = useState(false)
  const [viewPassageItem, setViewPassageItem] = useState<TextbookPassage | null>(null)
  const [viewSessionItem, setViewSessionItem] = useState<DictationSession | null>(null)
  const [sendingPassageId, setSendingPassageId] = useState<string | null>(null)

  // ── Inline device edit
  const [editDeviceId, setEditDeviceId] = useState<string | null>(null)
  const [editDeviceData, setEditDeviceData] = useState<Partial<RobotDevice>>({})

  // ── New passage form
  const [newPassage, setNewPassage] = useState({
    title: "", gradeLevel: "3", bookSet: "KetNoi", unit: "Tuần 1",
    content: "", difficultWords: "",
  })

  // ── Config local edit
  const [editConfig, setEditConfig] = useState<XiaozhiConfig | null>(null)

  // ─── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true)
      const r = await fetch("/api/xiaozhi/devices")
      const d = await r.json()
      setDevices(d.devices || [])
    } finally { setLoadingDevices(false) }
  }, [])

  const fetchPassages = useCallback(async () => {
    try {
      setLoadingPassages(true)
      const params = new URLSearchParams()
      if (passageGrade !== "all") params.set("gradeLevel", passageGrade)
      if (passageBook  !== "all") params.set("bookSet", passageBook)
      if (passageSearch.trim())   params.set("q", passageSearch.trim())
      const r = await fetch(`/api/xiaozhi/passages?${params}`)
      const d = await r.json()
      setPassages(d.passages || [])
    } finally { setLoadingPassages(false) }
  }, [passageGrade, passageBook, passageSearch])

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true)
      const r = await fetch("/api/dictation/sessions?limit=30")
      const d = await r.json()
      setSessions(d.sessions || [])
    } finally { setLoadingSessions(false) }
  }, [])

  const fetchConfig = useCallback(async () => {
    const r = await fetch("/api/xiaozhi/config")
    const d = await r.json()
    setConfig(d.config)
    setEditConfig(d.config)
  }, [])

  useEffect(() => { fetchDevices() }, [fetchDevices])
  useEffect(() => { fetchPassages() }, [fetchPassages])
  useEffect(() => { fetchSessions() }, [fetchSessions])
  useEffect(() => { fetchConfig()   }, [fetchConfig])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const saveDevice = async (id: string) => {
    await fetch("/api/xiaozhi/devices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editDeviceData }),
    })
    setEditDeviceId(null)
    fetchDevices()
  }

  const deleteDevice = async (id: string) => {
    if (!confirm("Xoá thiết bị này khỏi hệ thống?")) return
    await fetch(`/api/xiaozhi/devices?id=${id}`, { method: "DELETE" })
    fetchDevices()
  }

  const addPassage = async () => {
    if (!newPassage.title.trim() || !newPassage.content.trim()) return
    await fetch("/api/xiaozhi/passages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newPassage, gradeLevel: Number(newPassage.gradeLevel) }),
    })
    setAddPassageOpen(false)
    setNewPassage({ title: "", gradeLevel: "3", bookSet: "KetNoi", unit: "Tuần 1", content: "", difficultWords: "" })
    fetchPassages()
  }

  const deletePassage = async (id: string) => {
    if (!confirm("Xoá bài đọc này khỏi kho ngữ liệu?")) return
    await fetch(`/api/xiaozhi/passages?id=${id}`, { method: "DELETE" })
    fetchPassages()
  }

  const sendPassage = async (passage: TextbookPassage) => {
    setSendingPassageId(passage.id)
    try {
      const r = await fetch("/api/xiaozhi/send-passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId: passage.id }),
      })
      if (r.ok) {
        fetchSessions()
        alert(`✅ Đã gửi bài "${passage.title}" cho Robot đọc!\nPhiên chấm điểm đã được tạo — vào tab Nhật ký để mở.`)
      }
    } finally { setSendingPassageId(null) }
  }

  const saveConfig = async () => {
    if (!editConfig) return
    setSavingConfig(true)
    try {
      await fetch("/api/xiaozhi/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editConfig),
      })
      setConfig(editConfig)
      alert("✅ Cấu hình đã được lưu thành công!")
    } finally { setSavingConfig(false) }
  }

  const openGradeSession = (session: DictationSession) => {
    const params = new URLSearchParams({
      sessionId: session.id,
      passage: session.passage,
      className: session.className,
      title: session.title,
    })
    router.push(`/teacher/grade?${params}`)
  }

  const deleteSession = async (id: string) => {
    if (!confirm("Xoá phiên đọc này?")) return
    await fetch(`/api/dictation/sessions/${id}`, { method: "DELETE" })
    fetchSessions()
  }

  // ─── Filtered data ──────────────────────────────────────────────────────────

  const filteredSessions = sessions.filter(s => {
    const q = sessionSearch.trim().toLowerCase()
    if (!q) return true
    return s.title?.toLowerCase().includes(q) || s.className?.toLowerCase().includes(q) || s.passage?.toLowerCase().includes(q)
  })

  const onlineCount = devices.filter(d => d.isOnline).length

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6 sticky top-0 z-10">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary shrink-0" />
            Trung tâm Robot Đọc Chính Tả Xiaozhi
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            Quản lý thiết bị ESP32, cấu hình AI và kho bài chính tả Sách Giáo Khoa
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchDevices(); fetchSessions(); fetchPassages() }} className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0 overflow-x-hidden">

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Radio className="w-5 h-5 text-primary" />, bg: "bg-primary/10",        value: devices.length,  label: "Thiết bị đăng ký" },
            { icon: <Wifi  className="w-5 h-5 text-emerald-500" />, bg: "bg-emerald-500/10", value: onlineCount,     label: "Đang online" },
            { icon: <BookOpen className="w-5 h-5 text-blue-500" />, bg: "bg-blue-500/10",    value: passages.length, label: "Bài đọc trong kho" },
            { icon: <ScrollText className="w-5 h-5 text-orange-500" />, bg: "bg-orange-500/10", value: sessions.length, label: "Phiên đã đọc" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="devices"  className="gap-2"><Radio className="w-4 h-4" /> Thiết Bị ESP32</TabsTrigger>
            <TabsTrigger value="config"   className="gap-2"><Settings2 className="w-4 h-4" /> Cấu Hình AI</TabsTrigger>
            <TabsTrigger value="passages" className="gap-2"><BookOpen className="w-4 h-4" /> Kho Bài SGK</TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2"><ScrollText className="w-4 h-4" /> Nhật Ký Phiên Đọc</TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1 — THIẾT BỊ ESP32
          ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="devices" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-primary" /> Danh sách Mạch ESP32-S3
                    </CardTitle>
                    <CardDescription>Mạch tự đăng ký khi kết nối vào Voice Core Server</CardDescription>
                  </div>
                  <Button size="sm" className="gap-2" onClick={fetchDevices} variant="outline">
                    <RefreshCw className="w-4 h-4" /> Cập nhật
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingDevices ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang tải thiết bị...
                  </div>
                ) : devices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <WifiOff className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Chưa có mạch ESP32 nào đăng ký.</p>
                    <p className="text-xs text-muted-foreground">Khởi động Xiaozhi Voice Server và nạp firmware lên mạch ESP32 để bắt đầu.</p>
                  </div>
                ) : (
                  devices.map(device => (
                    <div key={device.id} className="border border-border/60 rounded-xl p-4 space-y-4">
                      {/* Header của Card thiết bị */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge online={device.isOnline} />
                            <span className="font-semibold text-sm">{device.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>📍 IP: <code className="bg-muted px-1 rounded">{device.ipAddress || "Chưa xác định"}</code></span>
                            <span>📶 MAC: <code className="bg-muted px-1 rounded">{device.macAddress}</code></span>
                            <span>🕒 {timeAgo(device.lastSeen)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {editDeviceId === device.id ? (
                            <>
                              <Button size="sm" onClick={() => saveDevice(device.id)} className="gap-1">
                                <Save className="w-3.5 h-3.5" /> Lưu
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditDeviceId(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="gap-1"
                                onClick={() => { setEditDeviceId(device.id); setEditDeviceData({ name: device.name, className: device.className, volume: device.volume, voiceName: device.voiceName, speedRate: device.speedRate }) }}>
                                <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteDevice(device.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Form chỉnh sửa inline */}
                      {editDeviceId === device.id ? (
                        <div className="grid gap-3 sm:grid-cols-2 bg-muted/40 rounded-lg p-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Tên thiết bị</Label>
                            <Input value={editDeviceData.name || ""} onChange={e => setEditDeviceData(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Gắn với lớp</Label>
                            <Input value={editDeviceData.className || ""} placeholder="VD: 3A" onChange={e => setEditDeviceData(p => ({ ...p, className: e.target.value }))} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Giọng đọc TTS</Label>
                            <Select value={editDeviceData.voiceName || device.voiceName} onValueChange={v => setEditDeviceData(p => ({ ...p, voiceName: v }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{VOICE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Tốc độ đọc</Label>
                            <Select value={editDeviceData.speedRate || device.speedRate} onValueChange={v => setEditDeviceData(p => ({ ...p, speedRate: v }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{SPEED_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">Âm lượng loa: <strong>{editDeviceData.volume ?? device.volume}%</strong></Label>
                            <input type="range" min={0} max={100} value={editDeviceData.volume ?? device.volume}
                              onChange={e => setEditDeviceData(p => ({ ...p, volume: Number(e.target.value) }))}
                              className="w-full accent-primary" />
                          </div>
                        </div>
                      ) : (
                        /* Hiển thị thông tin hiện tại (chế độ xem) */
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                            <Volume2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="font-semibold">{device.volume}%</p>
                            <p className="text-xs text-muted-foreground">Âm lượng</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                            <Mic className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="font-semibold text-xs">{device.voiceName === "vi-VN-HoaiMyNeural" ? "Hoài My" : "Nam Minh"}</p>
                            <p className="text-xs text-muted-foreground">Giọng đọc</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                            <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="font-semibold">{device.speedRate}</p>
                            <p className="text-xs text-muted-foreground">Tốc độ</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                            <GraduationCap className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="font-semibold">{device.className || "—"}</p>
                            <p className="text-xs text-muted-foreground">Lớp gắn kết</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Hướng dẫn kết nối mạch */}
                <div className="border border-dashed border-border/60 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Cách kết nối mạch ESP32 mới</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs">
                    <li>Nạp firmware <code className="bg-muted px-1 rounded">xiaozhi-esp32-main</code> vào mạch ESP32-S3</li>
                    <li>Cấu hình WebSocket URL trỏ về <code className="bg-muted px-1 rounded">ws://[IP_MÁY_CHỦ]:8100/xiaozhi/v1/</code></li>
                    <li>Kết nối Wi-Fi phòng học qua Bluetooth (BluFi). Mạch sẽ tự động đăng ký vào danh sách này.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2 — CẤU HÌNH AI & GIỌNG ĐỌC
          ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="config" className="space-y-4">
            {!editConfig ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Đang tải cấu hình...
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Cột trái — Cài đặt kỹ thuật */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings2 className="w-4 h-4 text-primary" /> Giọng đọc & Nhà cung cấp AI
                    </CardTitle>
                    <CardDescription>Thiết lập TTS, ASR và mô hình ngôn ngữ lớn cho Robot</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Giọng đọc TTS</Label>
                        <Select value={editConfig.voiceName} onValueChange={v => setEditConfig(p => p ? { ...p, voiceName: v } : p)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{VOICE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tốc độ đọc</Label>
                        <Select value={editConfig.speedRate} onValueChange={v => setEditConfig(p => p ? { ...p, speedRate: v } : p)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{SPEED_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <Label>Nhà cung cấp ASR (Nhận dạng giọng nói)</Label>
                      <Select value={editConfig.asrProvider} onValueChange={v => setEditConfig(p => p ? { ...p, asrProvider: v } : p)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Gemini Audio API (Online, chính xác cao)</SelectItem>
                          <SelectItem value="sensevoice">SenseVoiceSmall (Offline, nhanh)</SelectItem>
                          <SelectItem value="whisper">Whisper (Offline, chính xác)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Nhà cung cấp LLM</Label>
                        <Select value={editConfig.llmProvider} onValueChange={v => setEditConfig(p => p ? { ...p, llmProvider: v } : p)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini">Google Gemini</SelectItem>
                            <SelectItem value="openai">OpenAI GPT</SelectItem>
                            <SelectItem value="deepseek">DeepSeek</SelectItem>
                            <SelectItem value="qwen">Qwen (Alibaba)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Model cụ thể</Label>
                        <Input value={editConfig.llmModel} onChange={e => setEditConfig(p => p ? { ...p, llmModel: e.target.value } : p)} placeholder="gemini-3.1-flash-lite" />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <Label>MCP Endpoint (API nhận kết quả phiên đọc)</Label>
                      <Input value={editConfig.mcpEndpoint} onChange={e => setEditConfig(p => p ? { ...p, mcpEndpoint: e.target.value } : p)} placeholder="http://localhost:3000/api/dictation/sessions" />
                    </div>
                  </CardContent>
                </Card>

                {/* Cột phải — System Prompt & MCP Tools */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bot className="w-4 h-4 text-primary" /> Kịch bản Sư phạm (System Prompt)
                    </CardTitle>
                    <CardDescription>Hành vi và quy trình 3 bước của Trợ giảng Alexa</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      className="min-h-[200px] font-mono text-xs resize-y"
                      value={editConfig.systemPrompt}
                      onChange={e => setEditConfig(p => p ? { ...p, systemPrompt: e.target.value } : p)}
                    />
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 space-y-1">
                      <p className="font-medium">💡 Biến số hỗ trợ trong prompt:</p>
                      <p><code className="bg-background px-1 rounded">{"{grade}"}</code> — Khối lớp hiện tại</p>
                      <p><code className="bg-background px-1 rounded">{"{className}"}</code> — Tên lớp học</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="font-medium">MCP Tools được kích hoạt</Label>
                      {[
                        { key: "save_dictation_session", label: "save_dictation_session", desc: "Lưu phiên đọc & đoạn văn vào DB" },
                        { key: "get_textbook_passage",   label: "get_textbook_passage",   desc: "Tra cứu bài đọc từ Kho SGK" },
                        { key: "get_class_students",     label: "get_class_students",     desc: "Lấy danh sách học sinh lớp" },
                      ].map(tool => (
                        <label key={tool.key} className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                          <input type="checkbox" className="mt-0.5 accent-primary" defaultChecked={tool.key !== "get_class_students"} />
                          <div>
                            <p className="text-sm font-mono font-medium">{tool.label}</p>
                            <p className="text-xs text-muted-foreground">{tool.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <Button onClick={saveConfig} disabled={savingConfig} className="w-full gap-2">
                      {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingConfig ? "Đang lưu..." : "Lưu cấu hình"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 3 — KHO NGỮU LIỆU SGK
          ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="passages" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" /> Kho Ngữ Liệu Sách Giáo Khoa
                    </CardTitle>
                    <CardDescription>Bài đọc chuẩn Tiếng Việt Tiểu học để Robot đọc chính xác 100%</CardDescription>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => setAddPassageOpen(true)}>
                    <Plus className="w-4 h-4" /> Thêm bài mới
                  </Button>
                </div>

                {/* Bộ lọc */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Input placeholder="🔍 Tìm theo tên bài hoặc nội dung..." className="max-w-xs h-9"
                    value={passageSearch} onChange={e => setPassageSearch(e.target.value)} />
                  <Select value={passageGrade} onValueChange={setPassageGrade}>
                    <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Khối lớp" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả lớp</SelectItem>
                      {[1,2,3,4,5].map(g => <SelectItem key={g} value={String(g)}>Lớp {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={passageBook} onValueChange={setPassageBook}>
                    <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Bộ sách" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả bộ sách</SelectItem>
                      {BOOKSET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {loadingPassages ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang tải kho ngữ liệu...
                  </div>
                ) : passages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Kho bài trống hoặc không tìm thấy kết quả.</p>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => setAddPassageOpen(true)}>
                      <Plus className="w-4 h-4" /> Thêm bài đọc đầu tiên
                    </Button>
                  </div>
                ) : (
                  passages.map(p => (
                    <div key={p.id} className="border border-border/60 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">📖 {p.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">Lớp {p.gradeLevel}</Badge>
                            <Badge variant="outline" className="text-xs shrink-0">{BOOKSET_OPTIONS.find(b => b.value === p.bookSet)?.label ?? p.bookSet}</Badge>
                            <Badge variant="outline" className="text-xs shrink-0">{p.unit}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{p.content}</p>
                          {p.difficultWords && (
                            <p className="text-xs text-amber-600">
                              ⚠️ Từ khó: {p.difficultWords}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0 flex-wrap">
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-8 px-2.5"
                            onClick={() => setViewPassageItem(p)}>
                            <Eye className="w-3.5 h-3.5" /> Xem
                          </Button>
                          <Button size="sm" className="gap-1 text-xs h-8 px-2.5"
                            disabled={sendingPassageId === p.id}
                            onClick={() => sendPassage(p)}>
                            {sendingPassageId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {sendingPassageId === p.id ? "Đang gửi..." : "Gửi Robot đọc"}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            onClick={() => deletePassage(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 4 — NHẬT KÝ PHIÊN ĐỌC & 1-CLICK CHẤM BÀI
          ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="sessions" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ScrollText className="w-5 h-5 text-primary" /> Nhật Ký Phiên Đọc Chính Tả
                    </CardTitle>
                    <CardDescription>Mỗi phiên Robot hoàn thành được lưu tự động — bấm để mở chấm bài tức thì</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2" onClick={fetchSessions}>
                    <RefreshCw className="w-4 h-4" /> Làm mới
                  </Button>
                </div>
                <Input placeholder="🔍 Tìm theo tên bài, lớp học..." className="max-w-sm h-9 mt-2"
                  value={sessionSearch} onChange={e => setSessionSearch(e.target.value)} />
              </CardHeader>

              <CardContent className="space-y-3">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang tải nhật ký...
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <ScrollText className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Chưa có phiên đọc nào. Robot sẽ tự lưu sau khi đọc xong bài trên lớp.</p>
                  </div>
                ) : (
                  filteredSessions.map(session => (
                    <div key={session.id} className="border border-border/60 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {session.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                <Loader2 className="w-3 h-3 animate-spin" /> Đang đọc...
                              </span>
                            )}
                            {session.className && <Badge variant="outline" className="text-xs">{session.className}</Badge>}
                          </div>
                          <p className="font-semibold text-sm truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground">🕒 {formatDate(session.createdAt)}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {session.passage}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0 flex-wrap">
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-8 px-2.5"
                            onClick={() => setViewSessionItem(session)}>
                            <Eye className="w-3.5 h-3.5" /> Chi tiết
                          </Button>
                          <Button size="sm" className="gap-1 text-xs h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => openGradeSession(session)}>
                            <GraduationCap className="w-3.5 h-3.5" />
                            Mở chấm bài
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            onClick={() => deleteSession(session.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: Xem chi tiết bài SGK
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewPassageItem} onOpenChange={open => !open && setViewPassageItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {viewPassageItem?.title}
            </DialogTitle>
            <DialogDescription className="flex gap-2 flex-wrap">
              {viewPassageItem && <>
                <Badge variant="outline">Lớp {viewPassageItem.gradeLevel}</Badge>
                <Badge variant="outline">{BOOKSET_OPTIONS.find(b => b.value === viewPassageItem.bookSet)?.label}</Badge>
                <Badge variant="outline">{viewPassageItem.unit}</Badge>
              </>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Nội dung đoạn văn chính tả</Label>
              <div className="bg-muted/40 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap border border-border/60">
                {viewPassageItem?.content}
              </div>
            </div>
            {viewPassageItem?.difficultWords && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">⚠️ Từ khó cần lưu ý</Label>
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  {viewPassageItem.difficultWords}
                </p>
              </div>
            )}
            <Button className="w-full gap-2" onClick={() => { if (viewPassageItem) { sendPassage(viewPassageItem); setViewPassageItem(null) } }}>
              <Send className="w-4 h-4" /> Gửi bài này cho Robot đọc ngay
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: Xem chi tiết phiên đọc
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!viewSessionItem} onOpenChange={open => !open && setViewSessionItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              {viewSessionItem?.title}
            </DialogTitle>
            <DialogDescription className="flex gap-2 flex-wrap">
              {viewSessionItem && <>
                {viewSessionItem.className && <Badge variant="outline">{viewSessionItem.className}</Badge>}
                <Badge variant="outline">{formatDate(viewSessionItem.createdAt)}</Badge>
              </>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Đoạn văn Robot đã đọc (Ground Truth)</Label>
              <div className="bg-muted/40 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap border border-border/60">
                {viewSessionItem?.passage}
              </div>
            </div>
            {viewSessionItem?.summary && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Tóm tắt phiên</Label>
                <p className="text-sm text-muted-foreground">{viewSessionItem.summary}</p>
              </div>
            )}
            <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { if (viewSessionItem) { openGradeSession(viewSessionItem); setViewSessionItem(null) } }}>
              <GraduationCap className="w-4 h-4" /> Mở phiên chấm điểm với bài này
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOG: Thêm bài đọc mới vào Kho SGK
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addPassageOpen} onOpenChange={setAddPassageOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Thêm bài đọc vào Kho SGK
            </DialogTitle>
            <DialogDescription>Nhập thông tin bài chính tả để Robot có thể tra cứu và đọc chuẩn xác</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Khối lớp</Label>
                <Select value={newPassage.gradeLevel} onValueChange={v => setNewPassage(p => ({ ...p, gradeLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(g => <SelectItem key={g} value={String(g)}>Lớp {g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bộ sách</Label>
                <Select value={newPassage.bookSet} onValueChange={v => setNewPassage(p => ({ ...p, bookSet: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BOOKSET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tuần / Đơn vị</Label>
                <Input value={newPassage.unit} onChange={e => setNewPassage(p => ({ ...p, unit: e.target.value }))} placeholder="VD: Tuần 3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tiêu đề bài đọc <span className="text-destructive">*</span></Label>
              <Input value={newPassage.title} onChange={e => setNewPassage(p => ({ ...p, title: e.target.value }))} placeholder="VD: Ai có lỗi" />
            </div>

            <div className="space-y-1.5">
              <Label>Nội dung đoạn văn chính tả <span className="text-destructive">*</span></Label>
              <Textarea className="min-h-[120px]" value={newPassage.content}
                onChange={e => setNewPassage(p => ({ ...p, content: e.target.value }))}
                placeholder="Nhập nguyên văn đoạn chính tả học sinh cần viết..." />
            </div>

            <div className="space-y-1.5">
              <Label>Từ khó cần chú ý (cách nhau bằng dấu phẩy)</Label>
              <Input value={newPassage.difficultWords} onChange={e => setNewPassage(p => ({ ...p, difficultWords: e.target.value }))}
                placeholder="VD: hối hận, gương mặt, rơi nước mắt" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddPassageOpen(false)}>Huỷ</Button>
              <Button className="flex-1 gap-2" onClick={addPassage}
                disabled={!newPassage.title.trim() || !newPassage.content.trim()}>
                <Save className="w-4 h-4" /> Lưu vào Kho SGK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
