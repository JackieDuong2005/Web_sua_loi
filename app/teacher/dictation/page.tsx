"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Volume2, Play, Pause, RotateCcw, Square,
  BookOpen, Clock, CheckCircle2, AlertCircle, Plus, Trash2,
  GraduationCap, Search, Sparkles, Settings2, Music, RefreshCw,
  SlidersHorizontal, Gauge, Repeat, Hourglass, Mic, Pencil, Eye,
  Wand2, Send, Tag, FileText, Check, Bell, Split, ChevronDown, ChevronUp,
} from "lucide-react"

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TextbookPassage {
  id: string
  gradeLevel: number
  bookSet: string
  unit: string
  title: string
  content: string
  difficultWords: string
  createdAt?: string
}

interface DictationLog {
  id?: string
  speaker: string
  content: string
  createdAt?: string
}

interface DictationSession {
  id: string
  title: string
  passage: string
  className: string
  teacherName: string
  source: string
  speedRate?: string
  status: string
  summary: string
  createdAt: string
  logs?: DictationLog[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEED_OPTIONS = [
  { value: "0.65", label: "Cực chậm (-35%) — Lớp 1" },
  { value: "0.75", label: "Rất chậm (-25%) — Lớp 1-2" },
  { value: "0.80", label: "Chậm (-20%) — Rèn chữ" },
  { value: "0.85", label: "Chuẩn (-15%) — Khuyên dùng" },
  { value: "0.90", label: "Vừa phải (-10%) — Lớp 3" },
  { value: "0.95", label: "Hơi chậm (-5%) — Lớp 4-5" },
  { value: "1.00", label: "Bình thường (0%)" },
  { value: "1.10", label: "Nhanh (+10%)" },
  { value: "custom", label: "⚙️ Tự chỉnh..." },
]

const REPEAT_OPTIONS = [
  { value: "1", label: "1 lần" },
  { value: "2", label: "2 lần (Chuẩn)" },
  { value: "3", label: "3 lần" },
  { value: "4", label: "4 lần" },
  { value: "5", label: "5 lần" },
  { value: "custom", label: "⚙️ Tự nhập..." },
]

const PAUSE_OPTIONS = [
  { value: "1",    label: "1 giây" },
  { value: "2",    label: "2 giây" },
  { value: "3",    label: "3 giây" },
  { value: "4",    label: "4 giây" },
  { value: "5",    label: "5 giây" },
  { value: "6",    label: "6 giây" },
  { value: "7",    label: "7 giây" },
  { value: "8",    label: "8 giây" },
  { value: "9",    label: "9 giây" },
  { value: "10",   label: "10 giây (Chuẩn)" },
  { value: "auto", label: "Tự động (~1.6s/từ)" },
]

const CHUNK_OPTIONS = [
  { value: "short",    label: "🐣 Cụm ngắn (3–5 từ) — Lớp 1-2" },
  { value: "standard", label: "📖 Cụm chuẩn (5–8 từ) — Lớp 3" },
  { value: "sentence", label: "📝 Cả câu dài — Lớp 4-5" },
]

const VOICE_ENGINE_OPTIONS = [
  { value: "vi-VN-HoaiMyNeural", label: "🌸 Cô Hoài My (Nữ Miền Bắc — Khuyên dùng)" },
  { value: "vi-VN-NamMinhNeural", label: "👨‍🏫 Thầy Nam Minh (Nam Miền Bắc chuẩn)" },
  { value: "google_tts",          label: "🌐 Giọng đọc Google Tiếng Việt (Online)" },
  { value: "browser_voice",       label: "💻 Giọng đọc Hệ thống Máy tính (Offline)" },
]

const BOOKSET_OPTIONS = [
  { value: "all",      label: "Tất cả bộ sách" },
  { value: "KetNoi",   label: "Kết Nối Tri Thức" },
  { value: "CanhDieu", label: "Cánh Diều" },
  { value: "ChanTroi", label: "Chân Trời Sáng Tạo" },
]

const AI_TOPIC_SUGGESTIONS = [
  "Mùa hè & Thiên nhiên",
  "Tình bạn & Trường lớp",
  "Gia đình yêu thương",
  "Bảo vệ môi trường",
  "Quê hương đất nước",
  "Ngày Tết cổ truyền",
  "Lao động & Ước mơ",
]

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatClassName(name: string) {
  if (!name) return "Chọn lớp"
  const trimmed = name.trim()
  if (trimmed.toLowerCase().startsWith("lớp")) {
    return trimmed
  }
  return `Lớp ${trimmed}`
}

// ─── Chuông báo hiệu Web Audio (Chime Cue) ──────────────────────────────────
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {}
}

// ─── Thuật toán tách cụm từ sư phạm nâng cao ─────────────────────────────────
function splitIntoPedagogicalClauses(
  text: string,
  chunkMode: "short" | "standard" | "sentence" = "standard"
): string[] {
  if (!text || !text.trim()) return []

  const rawSentences = text
    .replace(/\r\n/g, "\n")
    .split(/([.\n?!;]+)/)
    .filter(Boolean)

  const sentences: string[] = []
  for (let i = 0; i < rawSentences.length; i += 2) {
    const content = rawSentences[i]?.trim()
    const punctuation = rawSentences[i + 1]?.trim() || ""
    if (content) {
      sentences.push(content + (punctuation && punctuation !== "\n" ? punctuation : ""))
    }
  }

  if (chunkMode === "sentence") {
    return sentences.filter(c => c.trim().length > 0)
  }

  const maxWords = chunkMode === "short" ? 5 : 7
  const clauses: string[] = []

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) {
      clauses.push(sentence)
    } else {
      const subClauses = sentence.split(/([,:]+)/)
      for (let j = 0; j < subClauses.length; j += 2) {
        const sub = subClauses[j]?.trim()
        const comma = subClauses[j + 1]?.trim() || ""
        if (sub) {
          if (chunkMode === "short") {
            const subWords = sub.split(/\s+/).filter(Boolean)
            if (subWords.length > 5) {
              const half = Math.ceil(subWords.length / 2)
              clauses.push(subWords.slice(0, half).join(" "))
              clauses.push(subWords.slice(half).join(" ") + comma)
            } else {
              clauses.push(sub + comma)
            }
          } else {
            clauses.push(sub + comma)
          }
        }
      }
    }
  }

  return clauses.filter(c => c.trim().length > 0)
}

// ─── Component Chính ──────────────────────────────────────────────────────────

export default function DictationPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("player")

  // User & Classes
  const [teacherName, setTeacherName] = useState("Giáo viên")
  const [selectedClass, setSelectedClass] = useState("3A1")
  const [classList, setClassList] = useState<string[]>(["3A1", "3A2", "4A1", "4A2"])

  // Passages State
  const [passages, setPassages] = useState<TextbookPassage[]>([])
  const [loadingPassages, setLoadingPassages] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [selectedBookSet, setSelectedBookSet] = useState("all")
  const [searchPassage, setSearchPassage] = useState("")

  // Current Active Passage for Dictation
  const [title, setTitle] = useState("Ai có lỗi (Trích)")
  const [content, setContent] = useState(
    "Cơn giận lắng xuống. Tôi bắt đầu thấy hối hận. Chắc là En-ri-cô không cố ý làm hỏng trang viết của tôi thật. Tôi nhìn cậu, thấy vai áo cậu sứt chỉ, thấy thương cậu quá. Nhưng tôi không đủ can đảm để xin lỗi cậu."
  )
  const [difficultWords, setDifficultWords] = useState("hối hận, En-ri-cô, sứt chỉ, can đảm")

  // TTS Settings & Custom Parameters
  const [voiceEngine, setVoiceEngine] = useState("vi-VN-HoaiMyNeural")
  const [speedRate, setSpeedRate] = useState("0.85")
  const [customSpeedPercent, setCustomSpeedPercent] = useState("-15")
  const [repeatCount, setRepeatCount] = useState("2")
  const [customRepeatNum, setCustomRepeatNum] = useState("2")
  const [pauseSetting, setPauseSetting] = useState("10")
  const [customPauseSeconds, setCustomPauseSeconds] = useState("10")
  const [chunkMode, setChunkMode] = useState<"short" | "standard" | "sentence">("standard")
  const [enableChime, setEnableChime] = useState(false)
  const [showPreviewClauses, setShowPreviewClauses] = useState(false)
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedBrowserVoiceUri, setSelectedBrowserVoiceUri] = useState<string>("")

  // Playback Execution State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [clauses, setClauses] = useState<string[]>([])
  const [currentClauseIndex, setCurrentClauseIndex] = useState(0)
  const [currentRepeat, setCurrentRepeat] = useState(1)
  const [countdown, setCountdown] = useState(0)
  const [isSpeakingNow, setIsSpeakingNow] = useState(false)
  const [playbackComplete, setPlaybackComplete] = useState(false)

  // Sessions History State
  const [sessions, setSessions] = useState<DictationSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [searchSession, setSearchSession] = useState("")
  const [classFilter, setClassFilter] = useState("all")

  // Add Passage Dialog
  const [isAddPassageOpen, setIsAddPassageOpen] = useState(false)
  const [newPassage, setNewPassage] = useState({
    title: "",
    gradeLevel: "3",
    bookSet: "KetNoi",
    unit: "Tuần 1",
    content: "",
    difficultWords: "",
  })

  // Edit Passage Dialog
  const [isEditPassageOpen, setIsEditPassageOpen] = useState(false)
  const [editingPassage, setEditingPassage] = useState<TextbookPassage | null>(null)

  // AI Generative Dictation Dialog
  const [isAiGenerateOpen, setIsAiGenerateOpen] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiGradeLevel, setAiGradeLevel] = useState("3")
  const [aiSentenceCount, setAiSentenceCount] = useState("4")
  const [aiBookSet, setAiBookSet] = useState("KetNoi")

  // View Session Detail Dialog
  const [viewingSession, setViewingSession] = useState<DictationSession | null>(null)

  // Audio Playback Session Control
  const playbackIdRef = useRef(0)
  const isPausedRef = useRef(false)
  const isPlayingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  isPlayingRef.current = isPlaying
  isPausedRef.current = isPaused

  // Preview generated clauses & Word Count
  const previewClauseList = useMemo(() => {
    return splitIntoPedagogicalClauses(content, chunkMode)
  }, [content, chunkMode])

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0
  }, [content])

  // ─── 1. Load User & Voices ──────────────────────────────────────────────────
  useEffect(() => {
    const userStr = localStorage.getItem("vihand_user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.name) setTeacherName(user.name)
        if (user.classes && user.classes.length > 0) {
          setClassList(user.classes)
          setSelectedClass(user.classes[0])
        }
      } catch {}
    }

    fetch("/api/classes")
      .then(r => r.json())
      .then(data => {
        const names = (data.classes || []).map((c: any) => c.name)
        if (names.length > 0) setClassList(names)
      })
      .catch(() => {})

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadBrowserVoices = () => {
        const av = window.speechSynthesis.getVoices()
        setBrowserVoices(av)
        const vi = av.find(v => v.lang.includes("vi") || v.lang.includes("VI"))
        if (vi) setSelectedBrowserVoiceUri(vi.voiceURI)
      }
      loadBrowserVoices()
      window.speechSynthesis.onvoiceschanged = loadBrowserVoices
    }

    return () => {
      stopPlayback()
    }
  }, [])

  // ─── 2. Fetch Passages & Sessions ───────────────────────────────────────────
  const fetchPassages = useCallback(async () => {
    try {
      setLoadingPassages(true)
      const params = new URLSearchParams()
      if (selectedGrade !== "all") params.append("gradeLevel", selectedGrade)
      if (selectedBookSet !== "all") params.append("bookSet", selectedBookSet)
      if (searchPassage) params.append("q", searchPassage)

      const res = await fetch(`/api/dictation/passages?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPassages(data.passages || [])
      }
    } catch (err) {
      console.error("Lỗi tải kho ngữ liệu:", err)
    } finally {
      setLoadingPassages(false)
    }
  }, [selectedGrade, selectedBookSet, searchPassage])

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true)
      const res = await fetch("/api/dictation/sessions?limit=50")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử phiên:", err)
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    fetchPassages()
  }, [fetchPassages])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // ─── 3. High-Quality Audio Engine (Edge-TTS Neural Voice + Fallback) ───────

  const stopPlayback = useCallback(() => {
    playbackIdRef.current += 1
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.src = ""
      currentAudioRef.current = null
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    isPlayingRef.current = false
    isPausedRef.current = false
    setIsPlaying(false)
    setIsPaused(false)
    setIsSpeakingNow(false)
    setCountdown(0)
  }, [])

  const getRateString = useCallback((): string => {
    if (speedRate === "custom") {
      const num = parseInt(customSpeedPercent, 10) || -15
      return num >= 0 ? `+${num}%` : `${num}%`
    }
    const val = parseFloat(speedRate) || 0.85
    if (val <= 0.68) return "-35%"
    if (val <= 0.78) return "-25%"
    if (val <= 0.82) return "-20%"
    if (val <= 0.88) return "-15%"
    if (val <= 0.92) return "-10%"
    if (val <= 0.97) return "-5%"
    if (val <= 1.05) return "+0%"
    return "+10%"
  }, [speedRate, customSpeedPercent])

  const speakClause = (text: string, sessionToken: number): Promise<void> => {
    return new Promise((resolve) => {
      if (playbackIdRef.current !== sessionToken) {
        resolve()
        return
      }

      setIsSpeakingNow(true)
      const rateStr = getRateString()
      const numericRate = speedRate === "custom" 
        ? Math.max(0.5, Math.min(1.5, 1 + (parseInt(customSpeedPercent, 10) || 0) / 100))
        : (parseFloat(speedRate) || 0.85)

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }

      if (voiceEngine !== "browser_voice") {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          currentAudioRef.current.src = ""
          currentAudioRef.current = null
        }

        const audioUrl = `/api/dictation/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceEngine)}&rate=${encodeURIComponent(rateStr)}&lang=vi`
        const audio = new Audio(audioUrl)
        audio.preload = "auto"
        currentAudioRef.current = audio

        let hasResolved = false
        let isFallbackActive = false

        const safeResolve = () => {
          if (!hasResolved) {
            hasResolved = true
            setIsSpeakingNow(false)
            currentAudioRef.current = null
            resolve()
          }
        }

        const triggerFallback = () => {
          if (hasResolved || isFallbackActive || playbackIdRef.current !== sessionToken) return
          isFallbackActive = true

          if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current.src = ""
            currentAudioRef.current = null
          }
          speakWithBrowser(text, numericRate, sessionToken).then(safeResolve)
        }

        audio.onended = () => {
          if (playbackIdRef.current === sessionToken && !isFallbackActive) {
            safeResolve()
          }
        }

        audio.onerror = () => {
          if (playbackIdRef.current === sessionToken && !hasResolved) {
            triggerFallback()
          }
        }

        audio.play().catch((err: any) => {
          if (err?.name === "AbortError" || isPausedRef.current) {
            return
          }
          if (playbackIdRef.current === sessionToken && !hasResolved) {
            triggerFallback()
          }
        })
      } else {
        speakWithBrowser(text, numericRate, sessionToken).then(() => {
          setIsSpeakingNow(false)
          resolve()
        })
      }
    })
  }

  const speakWithBrowser = (text: string, rate: number, sessionToken: number): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || playbackIdRef.current !== sessionToken) {
        setIsSpeakingNow(false)
        resolve()
        return
      }

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = rate
      utterance.lang = "vi-VN"

      if (selectedBrowserVoiceUri) {
        const v = browserVoices.find(bv => bv.voiceURI === selectedBrowserVoiceUri)
        if (v) utterance.voice = v
      }

      utterance.onend = () => {
        if (playbackIdRef.current === sessionToken) setIsSpeakingNow(false)
        resolve()
      }
      utterance.onerror = () => {
        if (playbackIdRef.current === sessionToken) setIsSpeakingNow(false)
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  const sleepWithCountdown = (seconds: number, sessionToken: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (playbackIdRef.current !== sessionToken) {
        resolve(false)
        return
      }

      let remaining = seconds
      setIsSpeakingNow(false)
      setCountdown(remaining)

      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) {
          clearInterval(timerRef.current!)
          resolve(false)
          return
        }

        if (isPausedRef.current) {
          return
        }

        remaining -= 1
        setCountdown(remaining)

        if (remaining <= 0) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          resolve(true)
        }
      }, 1000)
    })
  }

  const startPlayback = async () => {
    const clauseList = splitIntoPedagogicalClauses(content, chunkMode)
    if (clauseList.length === 0) return

    stopPlayback()
    const sessionToken = playbackIdRef.current
    isPlayingRef.current = true
    isPausedRef.current = false

    setClauses(clauseList)
    setIsPlaying(true)
    setIsPaused(false)
    setPlaybackComplete(false)
    setCurrentClauseIndex(0)
    setCurrentRepeat(1)

    const maxRepeat = repeatCount === "custom"
      ? (parseInt(customRepeatNum, 10) || 2)
      : (parseInt(repeatCount, 10) || 2)

    for (let i = 0; i < clauseList.length; i++) {
      if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

      setCurrentClauseIndex(i)
      const clause = clauseList[i]

      for (let r = 1; r <= maxRepeat; r++) {
        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        while (isPausedRef.current && isPlayingRef.current && playbackIdRef.current === sessionToken) {
          await new Promise(res => setTimeout(res, 200))
        }

        setCurrentRepeat(r)

        if (enableChime && r === 1) {
          playChime()
          await new Promise(res => setTimeout(res, 350))
        }

        await speakClause(clause, sessionToken)

        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        let pauseTime = 10
        if (pauseSetting === "auto") {
          const wCount = clause.split(/\s+/).filter(Boolean).length
          pauseTime = Math.max(5, Math.round(wCount * 1.6))
        } else if (pauseSetting === "custom") {
          pauseTime = Math.max(2, parseInt(customPauseSeconds, 10) || 10)
        } else {
          pauseTime = parseInt(pauseSetting, 10) || 10
        }

        const finishedPause = await sleepWithCountdown(pauseTime, sessionToken)
        if (!finishedPause) break
      }
    }

    if (playbackIdRef.current === sessionToken && isPlayingRef.current) {
      setIsPlaying(false)
      isPlayingRef.current = false
      setIsSpeakingNow(false)
      setCountdown(0)
      setPlaybackComplete(true)
      if (enableChime) playChime()
      await speakClause("Đã hoàn thành bài đọc chính tả. Các em hãy soát lại bài.", sessionToken)
    }
  }

  const togglePause = () => {
    const nextPaused = !isPausedRef.current
    isPausedRef.current = nextPaused
    setIsPaused(nextPaused)

    if (nextPaused) {
      if (currentAudioRef.current) currentAudioRef.current.pause()
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.pause()
    } else {
      if (currentAudioRef.current && currentAudioRef.current.paused) {
        currentAudioRef.current.play().catch(() => {})
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.resume()
    }
  }

  const repeatCurrentClause = async () => {
    if (!clauses[currentClauseIndex]) return
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.src = ""
      currentAudioRef.current = null
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    if (enableChime) playChime()
    await speakClause(clauses[currentClauseIndex], playbackIdRef.current)
  }

  const testVoice = () => {
    stopPlayback()
    const sessionToken = playbackIdRef.current
    if (enableChime) playChime()
    speakClause("Xin chào thầy cô và các em. Đây là giọng đọc chính tả chuẩn tiếng Việt của ViHand Grade.", sessionToken)
  }

  // ─── 4. Mở Phiên Chấm Điểm & Lưu Ground Truth ──────────────────────────────
  const handleOpenGrading = async () => {
    try {
      const res = await fetch("/api/dictation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          passage: content,
          className: selectedClass,
          teacherName,
          source: "web_tts",
          status: "completed",
          summary: `Bài đọc chính tả ${title} lớp ${selectedClass}`,
        }),
      })

      let sessionId = ""
      if (res.ok) {
        const data = await res.json()
        sessionId = data.session?.id || ""
      }

      const query = new URLSearchParams({
        title,
        passage: content,
        className: selectedClass,
        mode: "dictation",
        ...(sessionId && { sessionId }),
      })

      router.push(`/teacher/grade?${query.toString()}`)
    } catch (err) {
      console.error("Lỗi mở phiên chấm:", err)
      router.push(`/teacher/grade`)
    }
  }

  // ─── 5. Chọn bài từ Kho SGK ─────────────────────────────────────────────────
  const handleSelectPassage = (p: TextbookPassage) => {
    setTitle(p.title)
    setContent(p.content)
    setDifficultWords(p.difficultWords || "")
    setActiveTab("player")
  }

  // ─── 6. AI Sáng Tác Bài Đọc Theo Chủ Đề (Generative Dictation) ───────────────
  const handleGenerateAiPassage = async () => {
    if (!aiTopic.trim()) return

    try {
      setGeneratingAi(true)
      const res = await fetch("/api/dictation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeLevel: Number(aiGradeLevel),
          topic: aiTopic.trim(),
          sentenceCount: Number(aiSentenceCount),
          bookSet: aiBookSet,
        }),
      })

      const data = await res.json()
      if (res.ok && data.passage) {
        setTitle(data.passage.title)
        setContent(data.passage.content)
        setDifficultWords(data.passage.difficultWords || "")
        setIsAiGenerateOpen(false)
        setActiveTab("player")
      } else {
        alert(data.error || "Không thể tạo bài đọc AI.")
      }
    } catch (err) {
      console.error("Lỗi tạo bài đọc AI:", err)
      alert("Không thể kết nối đến máy chủ AI.")
    } finally {
      setGeneratingAi(false)
    }
  }

  // ─── 7. Thêm bài mới vào Kho SGK ────────────────────────────────────────────
  const handleCreatePassage = async () => {
    if (!newPassage.title || !newPassage.content) return

    try {
      const res = await fetch("/api/dictation/passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPassage),
      })

      if (res.ok) {
        setIsAddPassageOpen(false)
        setNewPassage({
          title: "",
          gradeLevel: "3",
          bookSet: "KetNoi",
          unit: "Tuần 1",
          content: "",
          difficultWords: "",
        })
        fetchPassages()
      }
    } catch (err) {
      console.error("Lỗi thêm bài đọc:", err)
    }
  }

  // ─── 8. Xóa bài đọc khỏi Kho SGK ──────────────────────────────────────────
  const handleDeletePassage = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài đọc này khỏi kho ngữ liệu?")) return
    try {
      const res = await fetch(`/api/dictation/passages?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setPassages(prev => prev.filter(p => p.id !== id))
      }
    } catch (err) {
      console.error("Lỗi xóa bài đọc SGK:", err)
    }
  }

  // ─── 9. Chỉnh sửa bài đọc trong Kho SGK ──────────────────────────────────
  const handleOpenEditPassage = (p: TextbookPassage) => {
    setEditingPassage({ ...p })
    setIsEditPassageOpen(true)
  }

  const handleSaveEditPassage = async () => {
    if (!editingPassage || !editingPassage.title || !editingPassage.content) return

    try {
      const res = await fetch("/api/dictation/passages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPassage.id,
          title: editingPassage.title,
          content: editingPassage.content,
          difficultWords: editingPassage.difficultWords,
          unit: editingPassage.unit,
          gradeLevel: Number(editingPassage.gradeLevel),
          bookSet: editingPassage.bookSet,
        }),
      })

      if (res.ok) {
        setIsEditPassageOpen(false)
        setEditingPassage(null)
        fetchPassages()
      }
    } catch (err) {
      console.error("Lỗi cập nhật bài đọc SGK:", err)
    }
  }

  // ─── 10. Xóa phiên đọc lịch sử ──────────────────────────────────────────────
  const handleDeleteSession = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiên đọc này?")) return
    try {
      const res = await fetch(`/api/dictation/sessions/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id))
      }
    } catch (err) {
      console.error("Lỗi xóa phiên:", err)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/70 dark:bg-slate-950 font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-5 backdrop-blur shadow-xs">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Đọc Chính Tả AI — Trợ Giảng Lớp Học
            </h1>
            <span className="hidden md:inline-block text-xs text-muted-foreground ml-2">
              (Truyền âm qua TV/Loa & Tạo bài chuẩn Ground Truth)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="gap-1 py-0.5 px-2.5 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 text-xs font-medium">
            <GraduationCap className="h-3.5 w-3.5" />
            {teacherName}
          </Badge>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-auto min-w-[125px] max-w-[200px] h-8 px-2.5 text-xs font-semibold">
              <SelectValue placeholder="Chọn lớp">
                {formatClassName(selectedClass)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[150px]">
              {classList.map(cls => (
                <SelectItem key={cls} value={cls}>
                  {formatClassName(cls)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-4 md:p-5 max-w-[1500px] mx-auto w-full space-y-3.5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3.5">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-3 w-full sm:w-[460px] h-9 p-1 bg-slate-200/80 dark:bg-slate-900">
              <TabsTrigger value="player" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
                Trình Phát Đọc AI
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                Kho Ngữ Liệu SGK
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                Lịch Sử Phiên Đọc
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 1: TRÌNH PHÁT ĐỌC CHÍNH TẢ (UNIFIED COMPACT DASHBOARD)
          ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="player" className="space-y-3.5 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              
              {/* ──────────────────────────────────────────────────────────────
                  CỘT TRÁI (6 CỘT): SOẠN BÀI ĐỌC CHÍNH TẢ
              ────────────────────────────────────────────────────────────── */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 flex-1 flex flex-col overflow-hidden">
                  {/* Header Trái */}
                  <div className="py-2.5 px-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
                          Bài Đọc Chính Tả
                        </h2>
                        <span className="text-[10px] text-muted-foreground">Soạn văn bản hoặc trích nguồn SGK</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-indigo-700 bg-indigo-50/90 border-indigo-200 hover:bg-indigo-100 h-7 px-2.5 gap-1 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                        onClick={() => setIsAiGenerateOpen(true)}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        AI Soạn bài
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-slate-700 bg-white border-slate-200 hover:bg-slate-50 hover:text-indigo-600 h-7 px-2.5 gap-1 font-medium dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        onClick={() => setActiveTab("library")}
                      >
                        <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                        Kho SGK
                      </Button>
                    </div>
                  </div>

                  {/* Body Trái */}
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                    {/* Tiêu đề */}
                    <div className="space-y-1">
                      <Label htmlFor="title" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Tên bài viết
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="VD: Ai có lỗi, Hạt gạo làng ta..."
                        className="h-8 text-sm font-semibold"
                      />
                    </div>

                    {/* Đoạn văn */}
                    <div className="space-y-1 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="content" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Đoạn văn đọc cho học sinh viết ({wordCount} từ)
                        </Label>
                        <button
                          type="button"
                          onClick={() => setShowPreviewClauses(!showPreviewClauses)}
                          className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Split className="h-3 w-3" />
                          {showPreviewClauses ? "Thu gọn cụm câu" : `Xem ${previewClauseList.length} cụm câu`}
                          {showPreviewClauses ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={6}
                        placeholder="Nhập hoặc dán nội dung đoạn văn chính tả..."
                        className="leading-relaxed text-sm resize-none font-sans bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 flex-1 min-h-[120px]"
                      />
                    </div>

                    {/* Danh sách cụm câu nếu bấm xem */}
                    {showPreviewClauses && (
                      <div className="p-2.5 bg-indigo-50/50 dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900 rounded-lg space-y-1.5 text-xs max-h-32 overflow-y-auto">
                        <span className="font-semibold text-indigo-900 dark:text-indigo-300 text-[11px]">
                          Danh sách {previewClauseList.length} cụm câu theo nhịp ngắt:
                        </span>
                        {previewClauseList.map((cl, idx) => (
                          <div key={idx} className="p-1 px-2 bg-white dark:bg-slate-800 rounded border text-slate-700 dark:text-slate-200 flex items-start gap-1.5 text-[11px]">
                            <span className="font-bold text-indigo-600">{idx + 1}.</span>
                            <span className="font-sans leading-snug">{cl}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Từ khó */}
                    <div className="space-y-1.5 pt-0.5">
                      <Label htmlFor="difficult" className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>Từ khó cần lưu ý cho học sinh</span>
                        <span className="text-[10px] font-normal text-muted-foreground">(phân cách bằng dấu phẩy)</span>
                      </Label>
                      <Input
                        id="difficult"
                        value={difficultWords}
                        onChange={e => setDifficultWords(e.target.value)}
                        placeholder="VD: hối hận, En-ri-cô, sứt chỉ..."
                        className="h-8 text-xs bg-slate-50/60 dark:bg-slate-900"
                      />
                      {difficultWords && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {difficultWords.split(",").map((w, idx) => {
                            const word = w.trim()
                            if (!word) return null
                            return (
                              <Badge key={idx} variant="secondary" className="text-[10px] h-5 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300">
                                ⚠️ {word}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────────
                  CỘT PHẢI (6 CỘT): TRUNG TÂM PHÁT ĐỌC & CẤU HÌNH NHỊP SƯ PHẠM
              ────────────────────────────────────────────────────────────── */}
              <div className="lg:col-span-6 flex flex-col">
                <div className={`rounded-xl border transition-all shadow-xs overflow-hidden flex-1 flex flex-col bg-white dark:bg-slate-900 ${isPlaying ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20 ring-1 ring-indigo-500/20" : "border-slate-200 dark:border-slate-800"}`}>
                  
                  {/* Header Phải */}
                  <div className="py-2.5 px-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                        <Volume2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
                          Trình Phát Đọc Lớp Học
                        </h2>
                        <span className="text-[10px] text-muted-foreground">Phát âm qua loa & điều khiển nhịp đọc</span>
                      </div>
                    </div>

                    {/* Live Badge */}
                    {!isPlaying ? (
                      playbackComplete ? (
                        <Badge className="bg-emerald-600 text-white gap-1 text-[11px] h-6 px-2.5 font-medium">
                          <Check className="h-3 w-3" /> Đã hoàn thành
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[11px] h-6 px-2.5 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sẵn sàng phát đọc
                        </Badge>
                      )
                    ) : isPaused ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[11px] h-6 px-2.5 font-bold animate-pulse">
                        ⏸ Đang tạm dừng
                      </Badge>
                    ) : isSpeakingNow ? (
                      <Badge className="bg-indigo-600 text-white animate-pulse gap-1 text-[11px] h-6 px-2.5 font-bold">
                        🔊 Đang đọc... (Lần {currentRepeat}/{repeatCount === "custom" ? customRepeatNum : repeatCount})
                      </Badge>
                    ) : countdown > 0 ? (
                      <Badge className="bg-purple-600 text-white animate-pulse gap-1 text-[11px] h-6 px-2.5 font-bold">
                        ⏳ Học sinh viết ({countdown}s)
                      </Badge>
                    ) : (
                      <Badge className="bg-indigo-500 text-white text-[11px] h-6 px-2.5">
                        ⏳ Chuẩn bị cụm tiếp...
                      </Badge>
                    )}
                  </div>

                  {/* Body Phải */}
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    
                    {/* Khu vực hiển thị câu đọc */}
                    <div className="space-y-2">
                      {isPlaying ? (
                        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-1.5 shadow-inner">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-indigo-700 dark:text-indigo-400">
                              Cụm câu {currentClauseIndex + 1}/{clauses.length}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              Lần đọc {currentRepeat}/{repeatCount === "custom" ? customRepeatNum : repeatCount}
                            </span>
                          </div>
                          <p className="text-sm md:text-base font-bold text-indigo-950 dark:text-indigo-100 leading-relaxed font-sans min-h-[42px] flex items-center">
                            "{clauses[currentClauseIndex] || ""}"
                          </p>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full transition-all duration-300"
                              style={{
                                width: `${((currentClauseIndex + 1) / Math.max(1, clauses.length)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border rounded-xl text-center space-y-0.5">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Sẵn sàng đọc cho <span className="text-indigo-600 font-bold">{formatClassName(selectedClass)}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Truyền âm qua TV • {voiceEngine === "vi-VN-HoaiMyNeural" ? "Cô Hoài My" : voiceEngine === "vi-VN-NamMinhNeural" ? "Thầy Nam Minh" : "Giọng máy tính"} • {repeatCount === "custom" ? `${customRepeatNum} lần` : `${repeatCount} lần/cụm`}
                          </p>
                        </div>
                      )}

                      {/* Nút Master Control */}
                      <div className="space-y-1.5">
                        {!isPlaying ? (
                          <Button
                            onClick={startPlayback}
                            size="lg"
                            className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm h-10 text-sm font-bold tracking-wide"
                          >
                            <Play className="h-4 w-4 fill-current" />
                            BẮT ĐẦU ĐỌC CHO CẢ LỚP
                          </Button>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant={isPaused ? "default" : "outline"}
                              onClick={togglePause}
                              className="gap-1.5 h-9 text-xs font-semibold"
                            >
                              {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
                              {isPaused ? "Tiếp tục" : "Tạm dừng"}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={repeatCurrentClause}
                              className="gap-1.5 h-9 text-xs font-semibold"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Đọc lại
                            </Button>

                            <Button
                              variant="destructive"
                              onClick={stopPlayback}
                              className="gap-1.5 h-9 text-xs font-semibold"
                            >
                              <Square className="h-3.5 w-3.5 fill-current" />
                              Dừng hẳn
                            </Button>
                          </div>
                        )}

                        <Button
                          variant="default"
                          onClick={handleOpenGrading}
                          className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-8 font-semibold text-xs shadow-xs"
                        >
                          <Sparkles className="h-3 w-3" />
                          🎯 Mở Phiên Chấm Điểm Cho Bài Này
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-1" />

                    {/* Section Thiết Lập Nhịp Đọc Gọn Gàng */}
                    <div className="space-y-2 pt-0.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
                          Thiết Lập Nhịp Đọc
                        </span>
                        <button
                          type="button"
                          onClick={testVoice}
                          className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Play className="h-2.5 w-2.5 fill-current" /> Thử giọng
                        </button>
                      </div>

                      {/* Grid 3 cột: Tốc độ | Lặp | Nghỉ */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
                            <Gauge className="h-2.5 w-2.5 text-amber-500" /> Tốc độ
                          </Label>
                          <Select value={speedRate} onValueChange={setSpeedRate}>
                            <SelectTrigger className="h-7 text-xs px-2 truncate font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SPEED_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
                            <Repeat className="h-2.5 w-2.5 text-blue-500" /> Lặp lại
                          </Label>
                          <Select value={repeatCount} onValueChange={setRepeatCount}>
                            <SelectTrigger className="h-7 text-xs px-2 truncate font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {REPEAT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
                            <Hourglass className="h-2.5 w-2.5 text-purple-500" /> Nghỉ viết
                          </Label>
                          <Select value={pauseSetting} onValueChange={setPauseSetting}>
                            <SelectTrigger className="h-7 text-xs px-2 truncate font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAUSE_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Custom inputs nếu chọn tự nhập */}
                      {(speedRate === "custom" || repeatCount === "custom") && (
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded border grid grid-cols-2 gap-2 text-xs">
                          {speedRate === "custom" && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500">Tỉ lệ tốc độ:</span>
                              <Input
                                type="number"
                                value={customSpeedPercent}
                                onChange={e => setCustomSpeedPercent(e.target.value)}
                                className="h-6 text-xs font-bold text-center px-1"
                              />
                              <span className="text-[10px]">%</span>
                            </div>
                          )}
                          {repeatCount === "custom" && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500">Số lần lặp:</span>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={customRepeatNum}
                                onChange={e => setCustomRepeatNum(e.target.value)}
                                className="h-6 text-xs font-bold text-center px-1"
                              />
                              <span className="text-[10px]">lần</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Grid 2 cột: Giọng đọc AI | Độ dài ngắt cụm */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                            <Mic className="h-2.5 w-2.5 text-emerald-500" /> Giọng đọc AI
                          </Label>
                          <Select value={voiceEngine} onValueChange={setVoiceEngine}>
                            <SelectTrigger className="h-7 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VOICE_ENGINE_OPTIONS.map(v => (
                                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                            <Split className="h-2.5 w-2.5 text-sky-500" /> Ngắt cụm
                          </Label>
                          <Select value={chunkMode} onValueChange={(v: any) => setChunkMode(v)}>
                            <SelectTrigger className="h-7 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHUNK_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Voice máy tính phụ nếu chọn browser_voice */}
                      {voiceEngine === "browser_voice" && (
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded border space-y-1">
                          <Label className="text-[10px] text-slate-500 font-semibold">Giọng máy tính:</Label>
                          <Select value={selectedBrowserVoiceUri} onValueChange={setSelectedBrowserVoiceUri}>
                            <SelectTrigger className="h-6 text-xs truncate">
                              <SelectValue placeholder="Chọn giọng" />
                            </SelectTrigger>
                            <SelectContent className="max-h-40">
                              {browserVoices.map(v => (
                                <SelectItem key={v.voiceURI} value={v.voiceURI}>{v.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Toggle Chuông hiệu lệnh */}
                      <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={enableChime}
                            onChange={e => setEnableChime(e.target.checked)}
                            className="h-3 w-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
                            <Bell className="h-3 w-3 text-amber-500" /> Chuông hiệu lệnh trước mỗi cụm
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={playChime}
                          className="text-[10px] text-slate-400 hover:text-indigo-600 hover:underline"
                        >
                          Thử chuông
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 2: KHO NGỮ LIỆU SÁCH GIÁO KHOA
          ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="library" className="space-y-3.5 mt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border shadow-xs">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tên bài hoặc nội dung..."
                    value={searchPassage}
                    onChange={e => setSearchPassage(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue placeholder="Khối lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả khối</SelectItem>
                    <SelectItem value="1">Lớp 1</SelectItem>
                    <SelectItem value="2">Lớp 2</SelectItem>
                    <SelectItem value="3">Lớp 3</SelectItem>
                    <SelectItem value="4">Lớp 4</SelectItem>
                    <SelectItem value="5">Lớp 5</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedBookSet} onValueChange={setSelectedBookSet}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue placeholder="Bộ sách" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKSET_OPTIONS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setIsAddPassageOpen(true)}
                size="sm"
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm bài đọc mới
              </Button>
            </div>

            {loadingPassages ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs">Đang tải kho ngữ liệu SGK...</p>
              </div>
            ) : passages.length === 0 ? (
              <div className="py-12 text-center border rounded-xl bg-white dark:bg-slate-900 space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">Không tìm thấy bài đọc nào phù hợp</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Thử thay đổi bộ lọc hoặc thêm một bài đọc chính tả mới vào kho ngữ liệu.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {passages.map(p => (
                  <Card key={p.id} className="flex flex-col justify-between border-slate-200 hover:border-indigo-300 transition-all shadow-xs hover:shadow-sm">
                    <CardHeader className="pb-2 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                          Lớp {p.gradeLevel} • {p.unit}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {p.bookSet === "KetNoi" ? "Kết Nối" : p.bookSet === "CanhDieu" ? "Cánh Diều" : "Chân Trời"}
                        </span>
                      </div>
                      <CardTitle className="text-sm leading-snug font-bold">{p.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 flex-1 flex flex-col justify-between p-3 pt-0">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed font-sans">
                        {p.content}
                      </p>

                      {p.difficultWords && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200/60 truncate">
                          ⚠️ Từ khó: {p.difficultWords}
                        </div>
                      )}

                      <div className="pt-1.5 flex items-center gap-1.5">
                        <Button
                          onClick={() => handleSelectPassage(p)}
                          size="sm"
                          className="flex-1 min-w-0 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
                        >
                          <Volume2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">Chọn đọc</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditPassage(p)}
                          className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                          title="Chỉnh sửa bài đọc"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePassage(p.id)}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                          title="Xóa bài đọc khỏi kho"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════════
              TAB 3: LỊCH SỬ CÁC PHIÊN ĐÃ ĐỌC (GROUND TRUTH SESSIONS)
          ══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="history" className="space-y-3.5 mt-0">
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tên bài đã đọc..."
                    value={searchSession}
                    onChange={e => setSearchSession(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-auto min-w-[120px] max-w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả lớp</SelectItem>
                    {classList.map(c => (
                      <SelectItem key={c} value={c}>
                        {formatClassName(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchSessions}
                className="gap-1.5 text-xs shrink-0 h-8"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Làm mới
              </Button>
            </div>

            {loadingSessions ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs">Đang tải lịch sử phiên đọc...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center border rounded-xl bg-white dark:bg-slate-900 space-y-2">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">Chưa có phiên đọc chính tả nào</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Hãy dùng Trình Phát Đọc AI để thực hiện buổi đọc chính tả cho học sinh.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sessions
                  .filter(s => {
                    const matchQuery = searchSession ? s.title.toLowerCase().includes(searchSession.toLowerCase()) : true
                    const matchClass = classFilter !== "all" ? s.className === classFilter : true
                    return matchQuery && matchClass
                  })
                  .map(s => (
                    <Card key={s.id} className="border-slate-200 hover:border-slate-300 shadow-xs flex flex-col justify-between">
                      <CardHeader className="pb-2 p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <Badge variant="secondary" className="font-semibold text-[10px]">
                            {formatClassName(s.className || "Chung")}
                          </Badge>
                          <span className="text-[10px]">{formatDate(s.createdAt)}</span>
                        </div>
                        <CardTitle className="text-sm font-bold">{s.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3 pt-0">
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed font-sans">
                          {s.passage}
                        </p>
                        <div className="pt-1.5 flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingSession(s)}
                            className="gap-1 text-xs h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-800 shrink-0"
                            title="Xem chi tiết toàn văn bài đọc"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Chi tiết</span>
                          </Button>
                          <Button
                            onClick={() => {
                              const q = new URLSearchParams({
                                title: s.title,
                                passage: s.passage,
                                className: s.className,
                                sessionId: s.id,
                                mode: "dictation",
                              })
                              router.push(`/teacher/grade?${q.toString()}`)
                            }}
                            size="sm"
                            className="flex-1 min-w-0 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                          >
                            <Sparkles className="h-3 w-3 shrink-0" />
                            <span className="truncate">Chấm bài</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSession(s.id)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                            title="Xóa phiên đọc"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Dialog: AI Sáng Tác Bài Đọc Theo Chủ Đề (Generative Dictation) ─── */}
      <Dialog open={isAiGenerateOpen} onOpenChange={setIsAiGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI Sáng Tác Bài Đọc Chính Tả Theo Chủ Đề
            </DialogTitle>
            <DialogDescription className="text-xs">
              Gemini AI tự động sáng tác đoạn văn ngắn đạt chuẩn sư phạm GDPT 2018 theo khối lớp và trích xuất từ khó.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="font-semibold">Khối Lớp</Label>
                <Select value={aiGradeLevel} onValueChange={setAiGradeLevel}>
                  <SelectTrigger className="h-8 font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lớp 1 (2–3 câu ngắn)</SelectItem>
                    <SelectItem value="2">Lớp 2 (3–4 câu)</SelectItem>
                    <SelectItem value="3">Lớp 3 (4 câu - chuẩn)</SelectItem>
                    <SelectItem value="4">Lớp 4 (4–5 câu)</SelectItem>
                    <SelectItem value="5">Lớp 5 (5–6 câu)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Số lượng câu</Label>
                <Select value={aiSentenceCount} onValueChange={setAiSentenceCount}>
                  <SelectTrigger className="h-8 font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 câu (ngắn gọn)</SelectItem>
                    <SelectItem value="3">3 câu (vừa phải)</SelectItem>
                    <SelectItem value="4">4 câu (chuẩn tiết học)</SelectItem>
                    <SelectItem value="5">5 câu (mở rộng)</SelectItem>
                    <SelectItem value="6">6 câu (nâng cao)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold">Chủ Đề Bài Viết</Label>
              <Input
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="VD: Mùa hè của em, Tình bạn tuổi thơ, Cây bàng trường em..."
                className="h-8 text-xs"
              />
            </div>

            {/* Quick Topic Chips */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Chủ đề gợi ý nhanh:</Label>
              <div className="flex flex-wrap gap-1">
                {AI_TOPIC_SUGGESTIONS.map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setAiTopic(topic)}
                    className="text-[10px] py-0.5 px-2 rounded-full border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 transition-colors"
                  >
                    + {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAiGenerateOpen(false)} disabled={generatingAi} className="h-8 text-xs">
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateAiPassage}
              disabled={generatingAi || !aiTopic.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold h-8 text-xs"
            >
              {generatingAi ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Đang sáng tác bài đọc...
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3" />
                  Tạo Bài Đọc Ngay
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Xem Chi Tiết Toàn Văn Bài Đọc & Từ Khó Trong Lịch Sử ──── */}
      <Dialog open={!!viewingSession} onOpenChange={open => !open && setViewingSession(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base font-bold text-indigo-950 dark:text-indigo-200">
                {viewingSession?.title}
              </DialogTitle>
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                {formatClassName(viewingSession?.className || "Chung")}
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Thực hiện vào ngày {viewingSession?.createdAt ? formatDate(viewingSession.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {viewingSession && (
            <div className="space-y-2.5 py-2 text-xs">
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">
                  Toàn văn đoạn văn chuẩn:
                </Label>
                <div className="p-3 bg-amber-50/40 dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 rounded-xl leading-relaxed text-sm font-sans text-slate-900 dark:text-slate-100 whitespace-pre-wrap shadow-inner">
                  {viewingSession.passage}
                </div>
              </div>

              {viewingSession.summary && (
                <div className="text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-900 p-2 rounded-lg">
                  📌 <span className="font-medium">Ghi chú:</span> {viewingSession.summary}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewingSession) {
                  setTitle(viewingSession.title)
                  setContent(viewingSession.passage)
                  setViewingSession(null)
                  setActiveTab("player")
                }
              }}
              className="gap-1 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 h-8"
            >
              <Volume2 className="h-3 w-3" />
              Nạp vào Trình phát đọc
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (viewingSession) {
                  const q = new URLSearchParams({
                    title: viewingSession.title,
                    passage: viewingSession.passage,
                    className: viewingSession.className,
                    sessionId: viewingSession.id,
                    mode: "dictation",
                  })
                  setViewingSession(null)
                  router.push(`/teacher/grade?${q.toString()}`)
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs font-semibold h-8"
            >
              <Sparkles className="h-3 w-3" />
              Mở Chấm Bài Cho Phiên Này
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Thêm Bài Đọc Mới Vào Kho SGK ───────────────────────────── */}
      <Dialog open={isAddPassageOpen} onOpenChange={setIsAddPassageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-indigo-600" />
              Thêm Bài Đọc Vào Kho Ngữ Liệu SGK
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lưu bài chính tả chuẩn vào CSDL để dùng lại nhiều lần và đối chiếu chấm bài.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Khối Lớp</Label>
                <Select value={newPassage.gradeLevel} onValueChange={v => setNewPassage(p => ({ ...p, gradeLevel: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lớp 1</SelectItem>
                    <SelectItem value="2">Lớp 2</SelectItem>
                    <SelectItem value="3">Lớp 3</SelectItem>
                    <SelectItem value="4">Lớp 4</SelectItem>
                    <SelectItem value="5">Lớp 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Bộ Sách</Label>
                <Select value={newPassage.bookSet} onValueChange={v => setNewPassage(p => ({ ...p, bookSet: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KetNoi">Kết Nối</SelectItem>
                    <SelectItem value="CanhDieu">Cánh Diều</SelectItem>
                    <SelectItem value="ChanTroi">Chân Trời</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Tuần / Bài</Label>
                <Input
                  value={newPassage.unit}
                  onChange={e => setNewPassage(p => ({ ...p, unit: e.target.value }))}
                  placeholder="VD: Tuần 2"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tiêu Đề Bài Viết</Label>
              <Input
                value={newPassage.title}
                onChange={e => setNewPassage(p => ({ ...p, title: e.target.value }))}
                placeholder="VD: Cô giáo tí hon, Chuyện hoa chuyện quả..."
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label>Nội Dung Toàn Văn</Label>
              <Textarea
                value={newPassage.content}
                onChange={e => setNewPassage(p => ({ ...p, content: e.target.value }))}
                rows={4}
                placeholder="Nhập đoạn văn chính tả SGK..."
                className="text-xs font-sans resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label>Danh Sách Từ Khó (Phân tách bởi dấu phẩy)</Label>
              <Input
                value={newPassage.difficultWords}
                onChange={e => setNewPassage(p => ({ ...p, difficultWords: e.target.value }))}
                placeholder="VD: nghiêng ngả, sương sớm, long lanh..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddPassageOpen(false)} className="h-8 text-xs">Hủy</Button>
            <Button size="sm" onClick={handleCreatePassage} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs">
              Lưu Vào Kho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Chỉnh Sửa Bài Đọc Trong Kho SGK ────────────────────────── */}
      <Dialog open={isEditPassageOpen} onOpenChange={setIsEditPassageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4 text-amber-600" />
              Chỉnh Sửa Bài Đọc SGK
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cập nhật nội dung đoạn văn, từ khó và thông tin khối lớp.
            </DialogDescription>
          </DialogHeader>

          {editingPassage && (
            <div className="space-y-2.5 py-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>Khối Lớp</Label>
                  <Select
                    value={String(editingPassage.gradeLevel)}
                    onValueChange={v => setEditingPassage(p => p ? { ...p, gradeLevel: Number(v) } : null)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Lớp 1</SelectItem>
                      <SelectItem value="2">Lớp 2</SelectItem>
                      <SelectItem value="3">Lớp 3</SelectItem>
                      <SelectItem value="4">Lớp 4</SelectItem>
                      <SelectItem value="5">Lớp 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Bộ Sách</Label>
                  <Select
                    value={editingPassage.bookSet}
                    onValueChange={v => setEditingPassage(p => p ? { ...p, bookSet: v } : null)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KetNoi">Kết Nối</SelectItem>
                      <SelectItem value="CanhDieu">Cánh Diều</SelectItem>
                      <SelectItem value="ChanTroi">Chân Trời</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Tuần / Bài</Label>
                  <Input
                    value={editingPassage.unit}
                    onChange={e => setEditingPassage(p => p ? { ...p, unit: e.target.value } : null)}
                    placeholder="VD: Tuần 2"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Tiêu Đề Bài Viết</Label>
                <Input
                  value={editingPassage.title}
                  onChange={e => setEditingPassage(p => p ? { ...p, title: e.target.value } : null)}
                  placeholder="VD: Cô giáo tí hon..."
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label>Nội Dung Toàn Văn</Label>
                <Textarea
                  value={editingPassage.content}
                  onChange={e => setEditingPassage(p => p ? { ...p, content: e.target.value } : null)}
                  rows={4}
                  placeholder="Nhập đoạn văn chính tả SGK..."
                  className="text-xs font-sans resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label>Danh Sách Từ Khó (Phân tách bởi dấu phẩy)</Label>
                <Input
                  value={editingPassage.difficultWords}
                  onChange={e => setEditingPassage(p => p ? { ...p, difficultWords: e.target.value } : null)}
                  placeholder="VD: nghiêng ngả, sương sớm..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditPassageOpen(false)} className="h-8 text-xs">Hủy</Button>
            <Button size="sm" onClick={handleSaveEditPassage} className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs">
              Cập Nhật Bài Đọc
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
