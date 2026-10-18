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
  Wand2, Send, Tag, FileText, Check, Split, ChevronDown, ChevronUp,
  Sun, Moon, Copy, Scissors, ExternalLink, FastForward, Presentation,
} from "lucide-react"
import { formatAiErrorMessage } from "@/lib/utils"
import { HelpGuideButton } from "@/components/help-guide"

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

// ─── Voice Cards Definition ───────────────────────────────────────────────────

interface VoiceCardDef {
  id: string
  name: string
  gender: "f" | "m"
  region: string
  engine: string
  desc: string
  recommended?: boolean
  isCustom?: boolean
  isOffline?: boolean
}

const VOICE_CARDS: VoiceCardDef[] = [
  {
    id: "vi_VN-vais1000-medium",
    name: "Cô Hoài My (ONNX)",
    gender: "f",
    region: "Bắc",
    engine: "vi_VN-vais1000-medium",
    desc: "Nữ · Chuẩn mực sư phạm, tự nhiên (VAIS1000)",
    recommended: true,
    isOffline: true,
  },
  {
    id: "vi_VN-mailinh-medium",
    name: "Cô Mai Linh (ONNX)",
    gender: "f",
    region: "Bắc",
    engine: "vi_VN-mailinh-medium",
    desc: "Nữ · Ấm áp, rõ nét, rèn chính tả (MaiLinh)",
    isOffline: true,
  },
  {
    id: "vi_VN-25hours_single-low",
    name: "Cô Trúc Ly (Light)",
    gender: "f",
    region: "Bắc",
    engine: "vi_VN-25hours_single-low",
    desc: "Nữ · Siêu nhẹ, tối ưu RAM CPU Raspberry Pi",
    isOffline: true,
  },
  {
    id: "custom_teacher",
    name: "Giọng Clone Giáo Viên",
    gender: "f",
    region: "Tùy biến",
    engine: "custom_teacher",
    desc: "Giọng mẫu của bạn nạp từ file .onnx",
    isCustom: true,
    isOffline: true,
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_PASSAGES_BY_GRADE: Record<number, { title: string; content: string; difficultWords: string }> = {
  1: {
    title: "Bé và Chú Cún Nhỏ (Lớp 1)",
    content: "Bé Na có một chú cún nhỏ rất xinh. Bộ lông của cún trắng tinh như bông. Mỗi khi bé đi học về, cún lại vẫy đuôi mừng rỡ đón bé vào nhà.",
    difficultWords: "chú cún, trắng tinh, vẫy đuôi, mừng rỡ",
  },
  2: {
    title: "Buổi Sáng Mùa Thu (Lớp 2)",
    content: "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.",
    difficultWords: "se lạnh, trong vắt, gợn mây, dịu dàng, thân quen",
  },
  3: {
    title: "Ai có lỗi - Trích (Lớp 3)",
    content: "Cơn giận lặng xuống. Tôi bắt đầu thấy hối hận. Chắc là En-ri-cô không cố ý làm hỏng trang viết của tôi thật. Tôi nhìn cậu, thấy vai áo cậu sứt chỉ, thấy thương cậu quá. Nhưng tôi không đủ can đảm để xin lỗi cậu.",
    difficultWords: "hối hận, En-ri-cô, sứt chỉ, can đảm",
  },
}

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
  if (!name) return "Lớp 3A1"
  const trimmed = name.trim()
  if (trimmed.toLowerCase().startsWith("lớp")) {
    return trimmed
  }
  return `Lớp ${trimmed}`
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

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH: TeacherDictationPage (v2.5.0)
// ══════════════════════════════════════════════════════════════════════════════

export default function TeacherDictationPage() {
  const router = useRouter()

  // ─── Theme State (Light Paper / Dark Green) ─────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
        document.documentElement.setAttribute("data-theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        document.documentElement.removeAttribute("data-theme")
      }
      return next
    })
  }

  // ─── Active Tab State ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"editor" | "corpus" | "history" | "design">("editor")

  // ─── Classroom & Teacher Profile ────────────────────────────────────────────
  const [teacherName, setTeacherName] = useState("Cô Nguyễn Mai Lan")
  const [selectedClass, setSelectedClass] = useState("3A1")
  const [classList, setClassList] = useState<string[]>(["3A1", "3A2", "4B", "5A"])

  // ─── Text & Pedagogical Setup ───────────────────────────────────────────────
  const [title, setTitle] = useState("Ai có lỗi (Trích)")
  const [passageText, setPassageText] = useState(
    "Cơn giận lặng xuống. Tôi bắt đầu thấy hối hận. Chắc là En-ri-cô không cố ý làm hỏng trang viết của tôi thật. Tôi nhìn cậu, thấy vai áo cậu sứt chỉ, thấy thương cậu quá. Nhưng tôi không đủ can đảm để xin lỗi cậu."
  )
  const [difficultWords, setDifficultWords] = useState("hối hận, En-ri-cô, sứt chỉ, can đảm")

  // ─── Voice & Pedagogical Cadence (Piper VITS ONNX Offline) ───────────────────
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"all" | "f" | "m">("all")
  const [selectedVoiceId, setSelectedVoiceId] = useState("vi_VN-vais1000-medium")
  const [voiceEngine, setVoiceEngine] = useState("vi_VN-vais1000-medium")
  const [audioOutputDest, setAudioOutputDest] = useState<"web" | "rpi_local">("web")
  const [isVoiceCloningModalOpen, setIsVoiceCloningModalOpen] = useState(false)
  const [voiceList, setVoiceList] = useState<VoiceCardDef[]>(VOICE_CARDS)
  const [speedRate, setSpeedRate] = useState("0.85") // 0.65 to 1.10
  const [repeatCount, setRepeatCount] = useState("2") // 1, 2, 3
  const [pauseSetting, setPauseSetting] = useState("auto") // auto, 10, 15
  const [chunkMode, setChunkMode] = useState<"short" | "standard" | "sentence">("standard")

  // ─── Playback Execution State ───────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [clauses, setClauses] = useState<string[]>([])
  const [currentClauseIndex, setCurrentClauseIndex] = useState(0)
  const [currentRepeat, setCurrentRepeat] = useState(1)
  const [countdown, setCountdown] = useState(0)
  const [maxCountdown, setMaxCountdown] = useState(10)
  const [isSpeakingNow, setIsSpeakingNow] = useState(false)
  const [playbackComplete, setPlaybackComplete] = useState(false)

  // ─── 4-Step Pedagogical Workflow State (GDPT 2018) ──────────────────────────
  const [pedagogicalStep, setPedagogicalStep] = useState<1 | 2 | 3 | 4>(1)
  const [step2WordIndex, setStep2WordIndex] = useState(0)
  const [stepStatusMessage, setStepStatusMessage] = useState("")
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null)
  const [isWorkflowAutoAdvancing, setIsWorkflowAutoAdvancing] = useState(false)

  // ─── Classroom Chalkboard Presentation Overlay State ────────────────────────
  const [showProjector, setShowProjector] = useState(false)
  const [isTextHidden, setIsTextHidden] = useState(false)

  // ─── Textbook Corpus & History States ───────────────────────────────────────
  const [passages, setPassages] = useState<TextbookPassage[]>([])
  const [loadingPassages, setLoadingPassages] = useState(false)
  const [filterGrade, setFilterGrade] = useState("3")
  const [filterBookSet, setFilterBookSet] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [sessions, setSessions] = useState<DictationSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [searchSession, setSearchSession] = useState("")
  const [classFilter, setClassFilter] = useState("all")

  // ─── Modals State ───────────────────────────────────────────────────────────
  const [isAiGenerateOpen, setIsAiGenerateOpen] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiGradeLevel, setAiGradeLevel] = useState("3")
  const [aiSentenceCount, setAiSentenceCount] = useState("4")
  const [aiBookSet, setAiBookSet] = useState("KetNoi")

  const [isAddPassageOpen, setIsAddPassageOpen] = useState(false)
  const [newPassage, setNewPassage] = useState({
    title: "",
    gradeLevel: "3",
    bookSet: "KetNoi",
    unit: "Tuần 1",
    content: "",
    difficultWords: "",
  })

  const [isEditPassageOpen, setIsEditPassageOpen] = useState(false)
  const [editingPassage, setEditingPassage] = useState<TextbookPassage | null>(null)
  const [viewingSession, setViewingSession] = useState<DictationSession | null>(null)

  // ─── Audio Playback Session Control Refs ────────────────────────────────────
  const playbackIdRef = useRef(0)
  const isPausedRef = useRef(false)
  const isPlayingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  isPlayingRef.current = isPlaying
  isPausedRef.current = isPaused

  // ─── Clause Segmentation & Statistics Calculation ───────────────────────────
  const previewClauseList = useMemo(() => {
    return splitIntoPedagogicalClauses(passageText, chunkMode)
  }, [passageText, chunkMode])

  const difficultWordsList = useMemo(() => {
    return difficultWords
      .split(/[,;\n]+/)
      .map(w => w.trim())
      .filter(Boolean)
  }, [difficultWords])

  const stats = useMemo(() => {
    const chars = passageText.length
    const words = passageText.split(/\s+/).filter(Boolean).length
    const sentences = passageText.split(/[.?!;\n]+/).filter(Boolean).length
    const estimatedSeconds = Math.round(words * 2.8 + previewClauseList.length * 6)
    const minutes = Math.floor(estimatedSeconds / 60)
    const seconds = estimatedSeconds % 60
    return { chars, words, sentences, duration: `~${minutes} phút ${seconds} giây` }
  }, [passageText, previewClauseList])

  // ─── Nạp Danh Sách Giọng Đọc Offline Từ Raspberry Pi ───────────────────────
  useEffect(() => {
    const fetchOfflineVoices = async () => {
      try {
        const res = await fetch("/api/dictation/voices")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.voices) && data.voices.length > 0) {
            const mapped: VoiceCardDef[] = data.voices.map((v: any) => ({
              id: v.id,
              name: v.name,
              gender: (v.gender === "m" ? "m" : "f") as "f" | "m",
              region: v.region || "Bắc",
              engine: v.id,
              desc: v.desc || "",
              recommended: Boolean(v.recommended),
              isCustom: Boolean(v.isCustom),
              isOffline: true,
            }))
            setVoiceList(mapped)
          }
        }
      } catch (e) {
        console.error("Lỗi nạp danh sách giọng offline:", e)
      }
    }

    fetchOfflineVoices()

    fetchClasses()
    fetchPassages()
    fetchSessions()

    return () => {
      stopPlayback()
    }
  }, [])

  // ─── Keyboard Shortcuts for Presentation Mode ───────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showProjector) return
      if (e.key === "Escape") {
        setShowProjector(false)
      } else if (e.code === "Space") {
        e.preventDefault()
        togglePause()
      } else if (e.key.toLowerCase() === "r") {
        repeatCurrentClause()
      } else if (e.key.toLowerCase() === "h") {
        setIsTextHidden(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showProjector, isPaused])

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/classes")
      if (res.ok) {
        const data = await res.json()
        if (data.classes && data.classes.length > 0) {
          const names = data.classes.map((c: any) => c.name)
          setClassList(names)
          if (!names.includes(selectedClass)) setSelectedClass(names[0])
        }
      }
    } catch {}
  }

  const fetchPassages = async () => {
    setLoadingPassages(true)
    try {
      const params = new URLSearchParams()
      if (filterGrade !== "all") params.append("gradeLevel", filterGrade)
      if (filterBookSet !== "all") params.append("bookSet", filterBookSet)
      if (searchQuery.trim()) params.append("q", searchQuery.trim())

      const res = await fetch(`/api/dictation/passages?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPassages(data.passages || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPassages(false)
    }
  }

  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const res = await fetch("/api/dictation/sessions?limit=30")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSessions(false)
    }
  }

  // ─── Playback Engine (Multi-Tier TTS without Chime) ──────────────────────────
  const stopPlayback = () => {
    playbackIdRef.current += 1
    setIsPlaying(false)
    isPlayingRef.current = false
    setIsPaused(false)
    isPausedRef.current = false
    setIsSpeakingNow(false)
    setCountdown(0)

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
  }

  const sleepWithCountdown = (seconds: number, sessionToken: number): Promise<boolean> => {
    return new Promise(resolve => {
      let remaining = seconds
      setCountdown(remaining)
      setMaxCountdown(seconds)

      if (timerRef.current) clearInterval(timerRef.current)

      timerRef.current = setInterval(() => {
        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) {
          if (timerRef.current) clearInterval(timerRef.current)
          resolve(false)
          return
        }

        if (isPausedRef.current) return

        remaining -= 1
        setCountdown(remaining)

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          resolve(true)
        }
      }, 1000)
    })
  }

  const speakClause = (clause: string, sessionToken: number, customRateStr?: string): Promise<boolean> => {
    return new Promise(resolve => {
      if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) {
        resolve(false)
        return
      }

      setIsSpeakingNow(true)

      const cleanupAndResolve = (success: boolean) => {
        setIsSpeakingNow(false)
        resolve(success)
      }

      // Convert speed rate string into percent (-15%, -25%, etc.)
      const speedNum = parseFloat(speedRate) || 0.85
      const percentDiff = Math.round((speedNum - 1.0) * 100)
      const rateStr = customRateStr || `${percentDiff >= 0 ? "+" : ""}${percentDiff}%`

      // ── PHÁT ÂM THANH OFFLINE ĐƠN TẦNG (PIPER VITS ONNX) ──
      if (audioOutputDest === "rpi_local") {
        // Chế độ 1: Phát trực tiếp ra Loa phần cứng cắm trên Raspberry Pi
        fetch("/api/dictation/play-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: clause,
            voice: voiceEngine,
            rate: rateStr,
          }),
        })
          .then(res => res.json())
          .then(data => {
            cleanupAndResolve(data.success !== false)
          })
          .catch(err => {
            console.error("Lỗi phát loa Raspberry Pi:", err)
            cleanupAndResolve(false)
          })
      } else {
        // Chế độ 2: Stream WAV về Web Audio trình duyệt giáo viên
        const ttsUrl = `/api/dictation/tts?text=${encodeURIComponent(clause)}&voice=${encodeURIComponent(voiceEngine)}&rate=${encodeURIComponent(rateStr)}`
        const audio = new Audio(ttsUrl)
        currentAudioRef.current = audio

        audio.onended = () => {
          currentAudioRef.current = null
          cleanupAndResolve(true)
        }

        audio.onerror = () => {
          currentAudioRef.current = null
          console.error("❌ Không thể nạp âm thanh từ trạm TTS Raspberry Pi. Đảm bảo python_service đang chạy.")
          cleanupAndResolve(false)
        }

        audio.play().catch(err => {
          console.warn("Audio playback interrupted or blocked:", err)
          cleanupAndResolve(false)
        })
      }
    })
  }

  // ─── BƯỚC 1: ĐỌC MẪU TOÀN BÀI (Listen to Full Passage) ─────────────────────
  const startStep1Overview = async (autoAdvance = false) => {
    if (!passageText.trim()) return
    stopPlayback()

    setPedagogicalStep(1)
    setIsPlaying(true)
    isPlayingRef.current = true
    setIsPaused(false)
    isPausedRef.current = false
    setStepStatusMessage("Bước 1: Đang đọc mẫu toàn bài · Học sinh chú ý lắng nghe để hiểu nội dung và nhịp điệu.")

    const sessionToken = playbackIdRef.current
    await speakClause(`Các em hãy lắng nghe cô đọc mẫu bài chính tả: ${title || "bài đọc hôm nay"}.`, sessionToken, "-10%")
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    await speakClause(passageText, sessionToken, "-10%")
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    await speakClause("Đã kết thúc phần đọc mẫu. Bây giờ chúng ta cùng chuyển sang Bước 2: Luyện viết từ khó trên bảng con.", sessionToken, "-10%")
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    setIsPlaying(false)
    isPlayingRef.current = false
    setStepStatusMessage("Đã hoàn thành đọc mẫu. Sẵn sàng chuyển sang Bước 2: Luyện từ khó.")

    if (autoAdvance) {
      setPedagogicalStep(2)
      await startStep2DrillWord(0, true)
    }
  }

  // ─── BƯỚC 2: HƯỚNG DẪN TỪ KHÓ & LUYỆN VIẾT BẢNG CON ────────────────────────
  const startStep2DrillWord = async (wordIndex: number, autoAdvanceNext = false) => {
    if (difficultWordsList.length === 0) {
      setStepStatusMessage("Bài đọc chưa có danh sách từ khó. Sẵn sàng vào Bước 3: Nghe - Viết chính thức.")
      setPedagogicalStep(3)
      return
    }

    const targetIdx = Math.max(0, Math.min(difficultWordsList.length - 1, wordIndex))
    setStep2WordIndex(targetIdx)
    setPedagogicalStep(2)

    stopPlayback()
    setIsPlaying(true)
    isPlayingRef.current = true
    setIsPaused(false)
    isPausedRef.current = false

    const sessionToken = playbackIdRef.current
    const word = difficultWordsList[targetIdx]
    setStepStatusMessage(`Bước 2: Luyện từ khó (${targetIdx + 1}/${difficultWordsList.length}): "${word}"`)

    await speakClause(`Từ khó thứ ${targetIdx + 1}: ${word}.`, sessionToken, "-15%")
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    await speakClause(word, sessionToken, "-20%")
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    setStepStatusMessage(`✍️ Các em viết từ "${word}" vào bảng con`)
    const finishedWait = await sleepWithCountdown(12, sessionToken)
    if (!finishedWait || playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    await speakClause("Các em giơ bảng con để cô kiểm tra!", sessionToken, "-10%")
    await sleepWithCountdown(4, sessionToken)

    setIsPlaying(false)
    isPlayingRef.current = false

    if (autoAdvanceNext) {
      if (targetIdx + 1 < difficultWordsList.length) {
        await startStep2DrillWord(targetIdx + 1, true)
      } else {
        setStepStatusMessage("Đã luyện xong tất cả từ khó. Sẵn sàng vào Bước 3: Nghe - Viết chính thức!")
        setPedagogicalStep(3)
        if (isWorkflowAutoAdvancing) {
          await startStep3Dictation(true)
        }
      }
    }
  }

  // ─── BƯỚC 3: ĐỌC TỪNG CÂU / CỤM (NGHE - VIẾT CHÍNH THỨC) ───────────────────
  const startStep3Dictation = async (autoAdvance = false) => {
    if (!passageText.trim()) return
    stopPlayback()

    setPedagogicalStep(3)
    const preparedClauses = splitIntoPedagogicalClauses(passageText, chunkMode)
    if (preparedClauses.length === 0) return

    setClauses(preparedClauses)
    setCurrentClauseIndex(0)
    setCurrentRepeat(1)
    setIsPlaying(true)
    isPlayingRef.current = true
    setIsPaused(false)
    isPausedRef.current = false
    setPlaybackComplete(false)

    const sessionToken = playbackIdRef.current
    const maxRepeat = parseInt(repeatCount, 10) || 2

    await speakClause("Bây giờ cả lớp mở vở và bắt đầu viết bài. Các em chú ý lắng nghe và ngồi thẳng lưng.", sessionToken, "-10%")

    for (let i = 0; i < preparedClauses.length; i++) {
      if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

      setCurrentClauseIndex(i)
      setStepStatusMessage(`Bước 3: Đang đọc cụm ${i + 1}/${preparedClauses.length} (${stats.words} từ)`)

      for (let r = 1; r <= maxRepeat; r++) {
        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        while (isPausedRef.current && isPlayingRef.current && playbackIdRef.current === sessionToken) {
          await new Promise(res => setTimeout(res, 200))
        }

        setCurrentRepeat(r)
        await speakClause(preparedClauses[i], sessionToken)

        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        let pauseTime = 10
        if (pauseSetting === "auto") {
          const wCount = preparedClauses[i].split(/\s+/).filter(Boolean).length
          pauseTime = Math.max(5, Math.round(wCount * 1.6))
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
      setStepStatusMessage("Đã viết xong toàn bài. Chuyển sang Bước 4: Đọc soát lỗi toàn bài.")

      if (autoAdvance) {
        setPedagogicalStep(4)
        await startStep4Proofread()
      } else {
        setPedagogicalStep(4)
      }
    }
  }

  // ─── BƯỚC 4: ĐỌC SOÁT LỖI TOÀN BÀI & KHÓA GROUND TRUTH ─────────────────────
  const startStep4Proofread = async () => {
    if (!passageText.trim()) return
    stopPlayback()

    setPedagogicalStep(4)
    setIsPlaying(true)
    isPlayingRef.current = true
    setIsPaused(false)
    isPausedRef.current = false
    setStepStatusMessage("Bước 4: Đọc soát lỗi · Học sinh dùng đầu bút chì dò từng chữ trong vở.")

    const sessionToken = playbackIdRef.current

    await speakClause("Bây giờ các em hãy dùng đầu bút chì dò theo từng chữ trong vở để soát lại toàn bộ lỗi chính tả.", sessionToken, "-12%")
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    await speakClause(passageText, sessionToken, "-15%")
    if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) return

    await speakClause("Đã kết thúc bài đọc chính tả! Các em gấp vở lại và chuẩn bị nộp bài.", sessionToken, "-10%")

    setIsPlaying(false)
    isPlayingRef.current = false
    setIsWorkflowAutoAdvancing(false)
    setStepStatusMessage("🎉 Đã hoàn thành trọn vẹn tiết học chính tả! Đang khóa Ground Truth...")

    // Tự động tạo và lưu DictationSession làm Ground Truth duy nhất
    try {
      const res = await fetch("/api/dictation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || `Bài đọc chính tả: ${new Date().toLocaleDateString("vi-VN")}`,
          passage: passageText,
          className: selectedClass,
          teacherName,
          source: "web",
          status: "completed",
          summary: `Bài đọc Lớp ${selectedClass}, ${stats.words} từ, ${previewClauseList.length} cụm câu. Luyện từ khó: ${difficultWords}`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.session?.id) {
          setCreatedSessionId(data.session.id)
          fetchSessions()
          setStepStatusMessage(`✅ Ground Truth đã khóa thành công (Mã phiên: ${data.session.id}). Sẵn sàng chấm bài!`)
        }
      }
    } catch (err) {
      console.error("Lỗi lưu session ground truth:", err)
    }
  }

  // ─── CHẠY TRỌN VẸN 4 BƯỚC SƯ PHẠM LIÊN HOÀN ────────────────────────────────
  const startFullPedagogicalWorkflow = async () => {
    setIsWorkflowAutoAdvancing(true)
    await startStep1Overview(true)
  }

  // Alias tương thích ngược cho startPlayback
  const startPlayback = async () => {
    if (pedagogicalStep === 1) await startStep1Overview(false)
    else if (pedagogicalStep === 2) await startStep2DrillWord(step2WordIndex, false)
    else if (pedagogicalStep === 3) await startStep3Dictation(false)
    else if (pedagogicalStep === 4) await startStep4Proofread()
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
    await speakClause(clauses[currentClauseIndex], playbackIdRef.current)
  }

  const skipToNextClause = () => {
    if (currentClauseIndex < clauses.length - 1) {
      setCurrentClauseIndex(prev => prev + 1)
      setCurrentRepeat(1)
      repeatCurrentClause()
    }
  }

  const testVoiceSpecific = (voiceDef: VoiceCardDef) => {
    stopPlayback()
    const sample = `Xin chào các em. Tôi là ${voiceDef.name}, giọng đọc chính tả ngoại tuyến của hệ sinh thái ViHand Grade.`
    
    if (audioOutputDest === "rpi_local") {
      fetch("/api/dictation/play-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sample,
          voice: voiceDef.engine,
          rate: "-15%",
        }),
      }).catch(err => console.error("Lỗi nghe thử loa Pi:", err))
    } else {
      const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(sample)}&voice=${encodeURIComponent(voiceDef.engine)}&rate=-15%`)
      currentAudioRef.current = audio
      audio.play().catch(err => console.warn("Lỗi phát audio nghe thử:", err))
    }
  }

  // ─── Ground Truth Session Integration ────────────────────────────────────────
  const handleOpenGrading = async () => {
    try {
      const res = await fetch("/api/dictation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || `Bài đọc: ${new Date().toLocaleDateString("vi-VN")}`,
          passage: passageText,
          className: selectedClass,
          teacherName,
          source: "web",
          status: "completed",
          summary: `Bài đọc ${stats.words} từ, ${previewClauseList.length} cụm câu`,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const sessionId = data.session?.id
        const q = new URLSearchParams({
          title,
          passage: passageText,
          className: selectedClass,
          sessionId: sessionId || "",
          mode: "dictation",
        })
        router.push(`/teacher/grade?${q.toString()}`)
      } else {
        router.push(`/teacher/grade?title=${encodeURIComponent(title)}&passage=${encodeURIComponent(passageText)}&className=${encodeURIComponent(selectedClass)}&mode=dictation`)
      }
    } catch {
      router.push(`/teacher/grade?title=${encodeURIComponent(title)}&passage=${encodeURIComponent(passageText)}&className=${encodeURIComponent(selectedClass)}&mode=dictation`)
    }
  }

  // ─── Quick Actions & Inserts ────────────────────────────────────────────────
  const insertCommand = (textToInsert: string) => {
    setPassageText(prev => prev + textToInsert)
  }

  const loadPresetByGrade = (grade: number) => {
    const sample = SAMPLE_PASSAGES_BY_GRADE[grade]
    if (sample) {
      setTitle(sample.title)
      setPassageText(sample.content)
      setDifficultWords(sample.difficultWords)
    }
  }

  const handleSelectPassage = (p: TextbookPassage) => {
    setTitle(p.title)
    setPassageText(p.content)
    setDifficultWords(p.difficultWords || "")
    setActiveTab("editor")
  }

  const handleDeletePassage = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài đọc này khỏi kho ngữ liệu?")) return
    try {
      const res = await fetch(`/api/dictation/passages?id=${id}`, { method: "DELETE" })
      if (res.ok) fetchPassages()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiên đọc này khỏi lịch sử?")) return
    try {
      const res = await fetch(`/api/dictation/sessions?id=${id}`, { method: "DELETE" })
      if (res.ok) fetchSessions()
    } catch (e) {
      console.error(e)
    }
  }

  // ─── Filtered Voice Cards (Piper ONNX) ──────────────────────────────────────
  const filteredVoices = useMemo(() => {
    if (voiceGenderFilter === "all") return voiceList
    return voiceList.filter(v => v.gender === voiceGenderFilter)
  }, [voiceGenderFilter, voiceList])

  return (
    <div className="flex flex-col min-h-screen">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. UNIFIED TEACHER HEADER
      ────────────────────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-3.5 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-semibold text-card-foreground">Đọc chính tả</h1>
          <p className="text-xs text-muted-foreground">
            Hỗ trợ phát âm chuẩn tiếng Việt &amp; đồng bộ dữ liệu chấm bài
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Piper Offline TTS (Pi 4/5)</span>
          </div>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-8 text-xs font-semibold rounded-lg w-28 border-border/60">
              <SelectValue placeholder="Lớp" />
            </SelectTrigger>
            <SelectContent>
              {classList.map(c => (
                <SelectItem key={c} value={c}>
                  {formatClassName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <HelpGuideButton role="teacher" />
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. UNIFIED SUB-NAVIGATION TABS BAR
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "editor"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span className="material-symbols-rounded text-lg text-emerald-600 shrink-0">record_voice_over</span>
              <span>Trình phát đọc</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("corpus")}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "corpus"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span className="material-symbols-rounded text-lg text-emerald-600 shrink-0">menu_book</span>
              <span>Kho ngữ liệu SGK</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "history"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span className="material-symbols-rounded text-lg text-emerald-600 shrink-0">history</span>
              <span>Lịch sử phiên ({sessions.length})</span>
            </button>
          </div>

          <div className="py-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowProjector(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs cursor-pointer"
            >
              <span className="material-symbols-rounded text-base">slideshow</span>
              <span>Bảng xanh trình chiếu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. MAIN CONTAINER
      ────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0 overflow-x-hidden pb-12">
        
        {/* ════════════════════════════════════════════════════════════════════════
            TAB 1: TRÌNH PHÁT ĐỌC & SOẠN BÀI (MAIN COCKPIT)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
            
            {/* ── CỘT TRÁI: BÀN SOẠN BÀI & LUYỆN TỪ KHÓ ── */}
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
              
              {/* Header bài đọc */}
              <div className="flex items-center justify-between p-3.5 md:p-4 border-b border-border/60 gap-3 flex-wrap bg-muted/20">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="material-symbols-rounded text-muted-foreground text-lg shrink-0">edit_note</span>
                  <input
                    id="title-input"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Tiêu đề bài đọc chính tả..."
                    className="font-bold text-sm bg-transparent border-b border-border/60 hover:border-emerald-500 focus:border-emerald-600 text-card-foreground outline-hidden px-1.5 py-0.5 transition-colors w-full max-w-sm"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAiGenerateOpen(true)}
                    className="h-8 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 rounded-lg cursor-pointer"
                    title="Dùng AI soạn bài đọc theo chuẩn SGK"
                  >
                    <span className="material-symbols-rounded text-base">auto_fix_high</span>
                    <span>AI soạn bài</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab("corpus")}
                    className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 rounded-lg cursor-pointer"
                    title="Chọn bài từ kho SGK"
                  >
                    <span className="material-symbols-rounded text-base">menu_book</span>
                    <span>Kho SGK</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText()
                        if (text) setPassageText(text)
                      } catch {}
                    }}
                    className="h-8 px-2.5 text-xs font-medium border-border/60 rounded-lg cursor-pointer gap-1"
                    title="Dán từ bộ nhớ tạm"
                  >
                    <span className="material-symbols-rounded text-base">content_paste</span>
                    <span>Dán</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPassageText("")}
                    className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Xóa trắng nội dung"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                  </Button>
                </div>
              </div>

              {/* Textarea trang vở */}
              <div className="p-4 md:p-5">
                <textarea
                  id="tx"
                  spellCheck={false}
                  value={passageText}
                  onChange={e => setPassageText(e.target.value)}
                  placeholder="Nhập hoặc dán nội dung đoạn văn bài đọc chính tả vào đây..."
                  className="w-full min-h-[220px] border-0 outline-hidden resize-none bg-transparent text-card-foreground text-base md:text-lg leading-[1.8]"
                  style={{ fontFamily: "'Lexend', sans-serif" }}
                />
              </div>

              {/* Section Từ khó luyện viết */}
              <div className="px-4 py-3 border-t border-border/60 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-card-foreground">
                    <span className="material-symbols-rounded text-amber-600 text-base">spellcheck</span>
                    <span>Từ khó luyện viết ({difficultWordsList.length})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>Mẫu bài nhanh:</span>
                    {[1, 2, 3].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => loadPresetByGrade(g)}
                        className="px-2 py-0.5 rounded border border-border/60 bg-card hover:border-emerald-600 hover:text-emerald-700 text-xs font-medium cursor-pointer transition-colors"
                      >
                        Lớp {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danh sách chip từ khó với phát âm nhanh */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {difficultWordsList.map((w, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 rounded-lg px-2.5 py-1 text-xs font-medium transition-all"
                    >
                      <span>{w}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const token = ++playbackIdRef.current
                          speakClause(w, token)
                        }}
                        className="hover:text-amber-700 dark:hover:text-amber-100 cursor-pointer ml-0.5 flex items-center"
                        title={`Nghe phát âm từ "${w}"`}
                      >
                        <span className="material-symbols-rounded text-sm">volume_up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = difficultWordsList.filter((_, i) => i !== idx).join(", ")
                          setDifficultWords(updated)
                        }}
                        className="hover:text-rose-600 cursor-pointer text-muted-foreground ml-0.5 flex items-center"
                        title="Xóa từ khó này"
                      >
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    </span>
                  ))}
                  <Input
                    value={difficultWords}
                    onChange={e => setDifficultWords(e.target.value)}
                    placeholder="+ Thêm từ khó (cách nhau dấu phẩy)..."
                    className="h-7 text-xs max-w-[240px] border-border/60 rounded-lg bg-card"
                  />
                </div>
              </div>

              {/* Thống kê bài đọc */}
              <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-base text-muted-foreground">analytics</span>
                  <span>{stats.words} từ · {stats.sentences} câu · {previewClauseList.length} cụm câu</span>
                </div>
                <span>Thời gian ước tính: {stats.duration}</span>
              </div>
            </div>

            {/* ── CỘT PHẢI: THIẾT LẬP SƯ PHẠM & BẮT ĐẦU ── */}
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs p-5 space-y-4">
              
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-emerald-600 text-xl">tune</span>
                  <h3 className="font-semibold text-sm text-card-foreground">Thiết lập sư phạm</h3>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsVoiceCloningModalOpen(true)}
                  className="h-7 px-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 rounded-md cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">mic</span>
                  <span>Clone giọng</span>
                </Button>
              </div>

              {/* Giọng đọc đang chọn */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Giọng đọc mẫu (Piper ONNX)
                </label>
                
                {/* Active Voice Card */}
                {(() => {
                  const activeVoice = voiceList.find(v => v.id === selectedVoiceId) || voiceList[0] || VOICE_CARDS[0]
                  return (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <span className="material-symbols-rounded text-xl">record_voice_over</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-card-foreground truncate">{activeVoice?.name}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                              {activeVoice?.region}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{activeVoice?.desc}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => testVoiceSpecific(activeVoice)}
                        className="w-8 h-8 rounded-full border border-emerald-500/30 bg-card hover:bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 cursor-pointer shadow-2xs transition-all ml-2"
                        title="Nghe thử giọng này"
                      >
                        <span className="material-symbols-rounded text-base">volume_up</span>
                      </button>
                    </div>
                  )
                })()}

                {/* Chọn giọng khác */}
                <Select
                  value={selectedVoiceId}
                  onValueChange={(val) => {
                    setSelectedVoiceId(val)
                    const v = voiceList.find(item => item.id === val)
                    if (v) setVoiceEngine(v.engine)
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium border-border/60 rounded-lg">
                    <SelectValue placeholder="Đổi giọng đọc..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceList.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.name} ({v.region}) {v.isCustom ? "• Giọng clone" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Thiết bị phát âm thanh */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Đầu ra âm thanh
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudioOutputDest("web")}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      audioOutputDest === "web"
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-2xs"
                        : "bg-muted/20 text-muted-foreground border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base">desktop_windows</span>
                    <span>Loa máy tính</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioOutputDest("rpi_local")}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                      audioOutputDest === "rpi_local"
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-2xs"
                        : "bg-muted/20 text-muted-foreground border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base">cast</span>
                    <span>Loa Raspberry Pi</span>
                  </button>
                </div>
              </div>

              {/* Tốc độ đọc */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-rounded text-base">speed</span>
                    <span>Tốc độ đọc</span>
                  </span>
                  <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                    {parseFloat(speedRate).toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Math.max(0.65, Math.min(1.10, parseFloat(speedRate) - 0.05))
                      setSpeedRate(cur.toFixed(2))
                    }}
                    className="w-7 h-7 rounded-md border border-border/60 text-card-foreground font-bold text-sm flex items-center justify-center hover:bg-muted cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={65}
                    max={110}
                    value={Math.round(parseFloat(speedRate) * 100)}
                    onChange={e => setSpeedRate((parseInt(e.target.value, 10) / 100).toFixed(2))}
                    className="flex-1 accent-emerald-600 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Math.max(0.65, Math.min(1.10, parseFloat(speedRate) + 0.05))
                      setSpeedRate(cur.toFixed(2))
                    }}
                    className="w-7 h-7 rounded-md border border-border/60 text-card-foreground font-bold text-sm flex items-center justify-center hover:bg-muted cursor-pointer"
                  >
                    +
                  </button>
                </div>
                
                <p className="text-[10px] text-muted-foreground text-center">
                  Gợi ý GDPT: Lớp 1 (0.65x) · Lớp 2-3 (0.85x) · Lớp 4-5 (0.95x)
                </p>
              </div>

              {/* Lặp lại & Nghỉ viết */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">repeat</span>
                    <span>Lặp lại câu</span>
                  </label>
                  <div className="flex bg-muted/50 border border-border/60 rounded-lg p-0.5 text-xs font-semibold">
                    {["1", "2", "3"].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRepeatCount(r)}
                        className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                          repeatCount === r
                            ? "bg-card text-card-foreground shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r} lần
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm">timer</span>
                    <span>Nghỉ viết</span>
                  </label>
                  <div className="flex bg-muted/50 border border-border/60 rounded-lg p-0.5 text-xs font-semibold">
                    {[
                      { val: "auto", lbl: "Tự động" },
                      { val: "10", lbl: "10s" },
                      { val: "15", lbl: "15s" },
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setPauseSetting(p.val)}
                        className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                          pauseSetting === p.val
                            ? "bg-card text-card-foreground shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p.lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── NÚT BẮT ĐẦU TIẾT HỌC (PRIMARY HERO ACTION) ── */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <Button
                  type="button"
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(1)
                    setShowProjector(true)
                  }}
                  className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-rounded text-2xl">slideshow</span>
                  <span>Bắt đầu tiết học (Trình chiếu)</span>
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Mở Bảng xanh 4 bước sư phạm: Đọc mẫu ➔ Từ khó ➔ Viết chính tả ➔ Soát lỗi
                </p>
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={startFullPedagogicalWorkflow}
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1 h-7 px-2"
                  >
                    <span className="material-symbols-rounded text-base">auto_awesome</span>
                    <span>Chạy liên hoàn 4 bước</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleOpenGrading}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
                  >
                    <span className="material-symbols-rounded text-base">open_in_new</span>
                    <span>Chấm bài (GT)</span>
                  </Button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 2: KHO NGỮ LIỆU SÁCH GIÁO KHOA (TEXTBOOK CORPUS)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "corpus" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="w-28 h-8 text-xs font-bold border-border/60">
                    <SelectValue placeholder="Lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả lớp</SelectItem>
                    <SelectItem value="1">Lớp 1</SelectItem>
                    <SelectItem value="2">Lớp 2</SelectItem>
                    <SelectItem value="3">Lớp 3</SelectItem>
                    <SelectItem value="4">Lớp 4</SelectItem>
                    <SelectItem value="5">Lớp 5</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterBookSet} onValueChange={setFilterBookSet}>
                  <SelectTrigger className="w-40 h-8 text-xs font-bold border-border/60">
                    <SelectValue placeholder="Bộ sách" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKSET_OPTIONS.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm bài đọc..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs w-48 md:w-64 border-border/60"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={fetchPassages}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 border-border/60"
                >
                  <RefreshCw className="h-3 w-3" /> Làm mới
                </Button>
                <Button
                  onClick={() => setIsAddPassageOpen(true)}
                  size="sm"
                  className="h-8 text-xs gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm bài đọc
                </Button>
              </div>
            </div>

            {loadingPassages ? (
              <div className="py-16 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs">Đang tải kho ngữ liệu SGK...</p>
              </div>
            ) : passages.length === 0 ? (
              <div className="py-16 text-center bg-card rounded-2xl border border-border/60 space-y-2">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="font-bold text-sm">Chưa có bài đọc nào phù hợp với bộ lọc</p>
                <p className="text-xs text-muted-foreground">Thử chọn lớp khác hoặc thêm bài đọc mới vào kho.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {passages.map(p => (
                  <Card key={p.id} className="border-border/60 bg-card flex flex-col justify-between shadow-xs hover:border-emerald-600 transition-all">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 text-[10px] font-bold">
                          Lớp {p.gradeLevel} • {p.unit}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {p.bookSet === "KetNoi" ? "Kết Nối" : p.bookSet === "CanhDieu" ? "Cánh Diều" : "Chân Trời"}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-bold leading-snug">{p.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed font-sans">
                        {p.content}
                      </p>
                      {p.difficultWords && (
                        <div className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/40 truncate font-semibold">
                          ⚠️ Từ khó: {p.difficultWords}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => handleSelectPassage(p)}
                          size="sm"
                          className="flex-1 h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                        >
                          Chọn đọc bài này
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePassage(p.id)}
                          className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 3: LỊCH SỬ PHIÊN ĐỌC (GROUND TRUTH ARCHIVE)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tên bài đã đọc..."
                    value={searchSession}
                    onChange={e => setSearchSession(e.target.value)}
                    className="pl-8 h-8 text-xs border-border/60"
                  />
                </div>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs font-bold border-border/60">
                    <SelectValue placeholder="Lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả lớp</SelectItem>
                    {classList.map(c => (
                      <SelectItem key={c} value={c}>{formatClassName(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchSessions}
                className="h-8 text-xs gap-1 border-border/60"
              >
                <RefreshCw className="h-3 w-3" /> Làm mới
              </Button>
            </div>

            {loadingSessions ? (
              <div className="py-16 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs">Đang tải lịch sử phiên đọc...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-16 text-center bg-card rounded-2xl border border-border/60 space-y-2">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="font-bold text-sm">Chưa có phiên đọc chính tả nào được lưu</p>
                <p className="text-xs text-muted-foreground">Các bài đọc hoàn thành sẽ tự động xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions
                  .filter(s => {
                    const matchQ = searchSession ? s.title.toLowerCase().includes(searchSession.toLowerCase()) : true
                    const matchC = classFilter !== "all" ? s.className === classFilter : true
                    return matchQ && matchC
                  })
                  .map(s => (
                    <Card key={s.id} className="border-border/60 bg-card flex flex-col justify-between shadow-xs hover:border-emerald-600 transition-all">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatClassName(s.className)}</span>
                          <span>{formatDate(s.createdAt)}</span>
                        </div>
                        <CardTitle className="text-sm font-bold">{s.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {s.passage}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
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
                            className="flex-1 h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1"
                          >
                            <Sparkles className="h-3 w-3" /> Chấm bài theo bài này
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSession(s.id)}
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 4: HỆ THIẾT KẾ (DESIGN SYSTEM SHOWCASE)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "design" && (
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-lg font-bold text-card-foreground">
                BẢNG MÀU · “BẢNG XANH & BÚT ĐỎ / GIẤY KEM & PHẤN VÀNG”
              </h2>
              <p className="text-xs text-muted-foreground">
                Hệ màu sư phạm chuẩn mực cho phần mềm giáo dục tiểu học Việt Nam
              </p>
            </div>

            {/* Color Swatches Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="rounded-xl p-3 min-h-[90px] flex flex-col justify-end border border-border/60 bg-muted/30">
                <b className="text-sm text-card-foreground">Giấy kem</b>
                <span className="text-[11px] text-muted-foreground">Nền bài viết</span>
              </div>
              <div className="rounded-xl p-3 min-h-[90px] flex flex-col justify-end text-white bg-emerald-700">
                <b className="text-sm">Xanh bảng</b>
                <span className="text-[11px] opacity-80">Màu chính hệ thống</span>
              </div>
              <div className="rounded-xl p-3 min-h-[90px] flex flex-col justify-end text-white bg-rose-600">
                <b className="text-sm">Bút đỏ</b>
                <span className="text-[11px] opacity-80">Chấm điểm, xoá</span>
              </div>
              <div className="rounded-xl p-3 min-h-[90px] flex flex-col justify-end bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <b className="text-sm">Vàng dạ</b>
                <span className="text-[11px] opacity-80">Từ khó highlight</span>
              </div>
              <div className="rounded-xl p-3 min-h-[90px] flex flex-col justify-end bg-[#16382F] text-[#F4F1E8]">
                <b className="text-sm">Bảng xanh</b>
                <span className="text-[11px] opacity-80">Chiếu màn hình</span>
              </div>
              <div className="rounded-xl p-3 min-h-[90px] flex flex-col justify-end bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                <b className="text-sm">Phấn vàng</b>
                <span className="text-[11px] opacity-80">Nhấn trọng tâm</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                Bài đọc & trình chiếu: Lexend (Chống loạn thị, hỗ trợ học sinh đọc tốt)
              </p>
              <p className="text-sm font-semibold text-card-foreground">
                Giao diện điều khiển: Be Vietnam Pro / Sans-serif (Tối ưu hóa dấu thanh tiếng Việt)
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Đồng bộ 100% với ngôn ngữ thiết kế tổng thể của ViHand Grade.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. FLOATING ACTIVE PLAYBACK PILL (CHỈ HIỆN KHI PHÁT NGẦM NGOÀI MÁY CHIẾU)
      ────────────────────────────────────────────────────────────────────────── */}
      {isPlaying && !showProjector && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card/95 border border-border shadow-lg rounded-2xl px-5 py-2.5 flex items-center gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-card-foreground">
              {stepStatusMessage || `Đang phát Bước ${pedagogicalStep}/4`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <Button
              size="sm"
              variant="outline"
              onClick={togglePause}
              className="h-8 px-2.5 text-xs font-medium border-border/60 rounded-lg gap-1 cursor-pointer"
            >
              <span className="material-symbols-rounded text-base">{isPaused ? "play_arrow" : "pause"}</span>
              <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={stopPlayback}
              className="h-8 px-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg gap-1 cursor-pointer"
            >
              <span className="material-symbols-rounded text-base">stop</span>
              <span>Dừng</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowProjector(true)}
              className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-rounded text-base">slideshow</span>
              <span>Mở bảng chiếu</span>
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          5. CLASSROOM CHALKBOARD OVERLAY (CHẾ ĐỘ BẢNG XANH TRÌNH CHIẾU)
      ────────────────────────────────────────────────────────────────────────── */}
      {showProjector && (
        <div
          id="pr"
          className="fixed inset-0 z-50 bg-[#132A22] text-[#F4F1E8] flex flex-col justify-between p-6 md:p-8 select-none transition-all duration-300"
          style={{ fontFamily: "'Lexend', sans-serif" }}
        >
          {/* Top Bar Trình Chiếu */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F4F1E8]/15 gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium tracking-wide">
              <span className="text-[#FDE68A] font-bold px-2.5 py-0.5 rounded bg-[#FDE68A]/10 border border-[#FDE68A]/20">
                {formatClassName(selectedClass)}
              </span>
              <span className="text-[#F4F1E8]/40">·</span>
              <span className="truncate max-w-[280px] text-[#F4F1E8]/90 font-semibold">{title || "Bài đọc chính tả"}</span>
            </div>

            {/* 4 Mini Pills Chọn Bước Sư Phạm */}
            <div className="flex bg-[#F4F1E8]/10 rounded-xl p-1 gap-1 border border-[#F4F1E8]/15">
              {[
                { step: 1 as const, label: "1. Đọc mẫu", icon: "hearing" },
                { step: 2 as const, label: `2. Luyện từ khó (${difficultWordsList.length})`, icon: "edit_note" },
                { step: 3 as const, label: `3. Nghe - Viết (${previewClauseList.length})`, icon: "school" },
                { step: 4 as const, label: "4. Soát lỗi", icon: "task_alt" },
              ].map(s => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(s.step)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    pedagogicalStep === s.step
                      ? "bg-[#FDE68A] text-[#132A22] shadow-xs font-bold"
                      : "text-[#F4F1E8]/70 hover:text-[#F4F1E8] hover:bg-[#F4F1E8]/10"
                  }`}
                >
                  <span className="material-symbols-rounded text-sm">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowProjector(false)
              }}
              className="rounded-lg border-[#F4F1E8]/20 bg-transparent text-[#F4F1E8]/80 hover:bg-[#F4F1E8]/10 hover:text-[#F4F1E8] h-8 text-xs font-medium cursor-pointer gap-1"
            >
              <span className="material-symbols-rounded text-base">close</span>
              <span>Thoát (Esc)</span>
            </Button>
          </div>

          {/* Central Stage Dựa Vào pedagogicalStep */}
          {pedagogicalStep === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-[#FDE68A] uppercase px-3 py-1 rounded-full bg-[#FDE68A]/10 border border-[#FDE68A]/20">
                <span className="material-symbols-rounded text-base">hearing</span>
                <span>{isSpeakingNow ? "BƯỚC 1: ĐANG ĐỌC MẪU TOÀN BÀI" : "BƯỚC 1: ĐỌC MẪU TOÀN BÀI"}</span>
              </div>

              <div className="text-xl sm:text-2xl md:text-3xl font-normal text-center leading-relaxed max-w-[950px] p-8 rounded-2xl bg-[#F4F1E8]/5 border border-[#F4F1E8]/10 shadow-inner">
                {passageText}
              </div>

              <div className="text-xs text-[#F4F1E8]/60">
                Học sinh lắng nghe để nắm nội dung toàn bài, nhịp điệu và ngữ điệu câu.
              </div>
            </div>
          )}

          {pedagogicalStep === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-[#FDE68A] uppercase px-3 py-1 rounded-full bg-[#FDE68A]/10 border border-[#FDE68A]/20">
                <span className="material-symbols-rounded text-base">edit_note</span>
                <span>
                  {countdown > 0
                    ? `CÁC EM VIẾT BẢNG CON: ${countdown}s`
                    : isSpeakingNow
                    ? "ĐANG PHÁT ÂM TỪ KHÓ..."
                    : `BƯỚC 2: LUYỆN TỪ KHÓ TRÊN BẢNG CON (${step2WordIndex + 1}/${difficultWordsList.length})`}
                </span>
              </div>

              {/* Từ khó siêu to */}
              <div className="text-[clamp(44px,8vw,92px)] font-bold text-[#FDE68A] tracking-wide py-2">
                {difficultWordsList[step2WordIndex] || "Từ khó"}
              </div>

              {/* Đồng hồ đếm ngược 12s viết bảng con */}
              <div className="relative w-24 h-24 md:w-28 md:h-28">
                <svg width="100%" height="100%" viewBox="0 0 140 140" className="-rotate-90">
                  <circle cx="70" cy="70" r="61" fill="none" stroke="#F4F1E820" strokeWidth="8" />
                  <circle
                    cx="70"
                    cy="70"
                    r="61"
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="383.27"
                    style={{
                      strokeDashoffset: `${383.27 * (1 - (countdown / Math.max(1, maxCountdown || 12)))}`,
                      transition: "stroke-dashoffset 1s linear",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-mono font-bold text-[#F4F1E8]">
                  {isSpeakingNow ? (
                    <span className="material-symbols-rounded text-3xl">volume_up</span>
                  ) : countdown > 0 ? (
                    countdown
                  ) : (
                    <span className="material-symbols-rounded text-3xl text-emerald-400">check</span>
                  )}
                </div>
              </div>

              {/* Dãy nút bấm chuyển từ khó nhanh */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center pt-2">
                {difficultWordsList.map((w, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStep2WordIndex(idx)
                      startStep2DrillWord(idx, false)
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      step2WordIndex === idx
                        ? "bg-[#FDE68A] text-[#132A22] shadow-xs font-bold"
                        : "bg-[#F4F1E8]/10 text-[#F4F1E8]/80 hover:bg-[#F4F1E8]/20 hover:text-[#F4F1E8]"
                    }`}
                  >
                    {idx + 1}. {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pedagogicalStep === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-[#FDE68A] uppercase px-3 py-1 rounded-full bg-[#FDE68A]/10 border border-[#FDE68A]/20">
                <span className="material-symbols-rounded text-base">school</span>
                <span>
                  {isSpeakingNow
                    ? `ĐANG ĐỌC CỤM ${currentClauseIndex + 1}/${previewClauseList.length} (LẦN ${currentRepeat}/${repeatCount})`
                    : countdown > 0
                    ? `CÁC EM VIẾT VỞ: ${countdown}s`
                    : `BƯỚC 3: NGHE - VIẾT CHÍNH THỨC (${currentClauseIndex + 1}/${previewClauseList.length})`}
                </span>
              </div>

              {/* Văn bản cụm câu chữ to rõ */}
              <div
                className={`text-[clamp(28px,4.5vw,52px)] font-bold text-center leading-[1.4] max-w-[1000px] transition-all duration-300 ${
                  isTextHidden ? "blur-md opacity-25 select-none" : "opacity-100"
                }`}
              >
                "{clauses[currentClauseIndex] || previewClauseList[currentClauseIndex] || "Bắt đầu bài đọc..."}"
              </div>

              {/* Circular Ring Countdown Timer */}
              <div className="relative w-24 h-24 md:w-28 md:h-28">
                <svg width="100%" height="100%" viewBox="0 0 140 140" className="-rotate-90">
                  <circle cx="70" cy="70" r="61" fill="none" stroke="#F4F1E820" strokeWidth="8" />
                  <circle
                    cx="70"
                    cy="70"
                    r="61"
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="383.27"
                    style={{
                      strokeDashoffset: `${383.27 * (1 - (countdown / Math.max(1, maxCountdown)))}`,
                      transition: "stroke-dashoffset 1s linear",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-mono font-bold text-[#F4F1E8]">
                  {isSpeakingNow ? (
                    <span className="material-symbols-rounded text-3xl">volume_up</span>
                  ) : countdown > 0 ? (
                    countdown
                  ) : (
                    <span className="material-symbols-rounded text-3xl text-emerald-400">check</span>
                  )}
                </div>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                {(clauses.length > 0 ? clauses : previewClauseList).map((_, idx) => (
                  <i
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full border border-[#F4F1E8]/40 transition-all duration-300 ${
                      idx < currentClauseIndex
                        ? "bg-[#F4F1E8] opacity-90"
                        : idx === currentClauseIndex
                        ? "bg-[#FDE68A] border-[#FDE68A] scale-125 opacity-100 shadow-2xs"
                        : "opacity-30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {pedagogicalStep === 4 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-[#FDE68A] uppercase px-3 py-1 rounded-full bg-[#FDE68A]/10 border border-[#FDE68A]/20">
                <span className="material-symbols-rounded text-base">task_alt</span>
                <span>{isSpeakingNow ? "BƯỚC 4: ĐANG ĐỌC SOÁT LỖI..." : "BƯỚC 4: SOÁT LỖI TOÀN BÀI & DÒ BÚT CHÌ"}</span>
              </div>

              <div className="text-xl sm:text-2xl md:text-3xl font-normal text-center leading-relaxed max-w-[950px] p-8 rounded-2xl bg-[#F4F1E8]/5 border border-[#F4F1E8]/10 shadow-inner">
                {passageText}
              </div>

              <div className="text-xs text-[#F4F1E8]/60">
                Học sinh dùng bút chì dò lại từng từ. Khi hoàn tất, thầy/cô bấm nút Khóa Ground Truth để chuyển sang chấm bài.
              </div>
            </div>
          )}

          {/* Bottom Presenter Controls Bar */}
          <div className="flex items-center justify-center gap-2.5 pt-3.5 border-t border-[#F4F1E8]/15 flex-wrap">
            {pedagogicalStep === 1 && (
              <>
                <button
                  onClick={() => startStep1Overview(false)}
                  disabled={isPlaying && !isPaused}
                  className="bg-[#FDE68A] text-[#132A22] hover:bg-[#FDE68A]/90 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">play_arrow</span>
                  <span>{isPlaying ? "Đang đọc mẫu..." : "Bắt đầu đọc mẫu"}</span>
                </button>
                <button
                  onClick={togglePause}
                  disabled={!isPlaying}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">{isPaused ? "play_arrow" : "pause"}</span>
                  <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
                </button>
                <button
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(2)
                  }}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Sang Bước 2: Luyện từ khó</span>
                  <span className="material-symbols-rounded text-lg">arrow_forward</span>
                </button>
              </>
            )}

            {pedagogicalStep === 2 && (
              <>
                <button
                  onClick={() => {
                    if (step2WordIndex > 0) {
                      setStep2WordIndex(i => i - 1)
                      startStep2DrillWord(step2WordIndex - 1, false)
                    }
                  }}
                  disabled={step2WordIndex <= 0}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">arrow_back</span>
                  <span>Từ trước</span>
                </button>
                <button
                  onClick={() => startStep2DrillWord(step2WordIndex, false)}
                  className="bg-[#FDE68A] text-[#132A22] hover:bg-[#FDE68A]/90 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">volume_up</span>
                  <span>Phát âm lại từ này</span>
                </button>
                <button
                  onClick={() => {
                    if (step2WordIndex < difficultWordsList.length - 1) {
                      setStep2WordIndex(i => i + 1)
                      startStep2DrillWord(step2WordIndex + 1, false)
                    }
                  }}
                  disabled={step2WordIndex >= difficultWordsList.length - 1}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Từ tiếp theo</span>
                  <span className="material-symbols-rounded text-lg">arrow_forward</span>
                </button>
                <button
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(3)
                  }}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Sang Bước 3: Nghe - Viết</span>
                  <span className="material-symbols-rounded text-lg">arrow_forward</span>
                </button>
              </>
            )}

            {pedagogicalStep === 3 && (
              <>
                <button
                  onClick={repeatCurrentClause}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">replay</span>
                  <span>Đọc lại</span>
                </button>
                <button
                  onClick={togglePause}
                  className="bg-[#FDE68A] text-[#132A22] hover:bg-[#FDE68A]/90 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">{isPaused ? "play_arrow" : "pause"}</span>
                  <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
                </button>
                <button
                  onClick={() => setIsTextHidden(prev => !prev)}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">{isTextHidden ? "visibility" : "visibility_off"}</span>
                  <span>{isTextHidden ? "Hiện chữ" : "Ẩn chữ"}</span>
                </button>
                <button
                  onClick={skipToNextClause}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Cụm tiếp</span>
                  <span className="material-symbols-rounded text-lg">skip_next</span>
                </button>
                <button
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(4)
                  }}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Sang Bước 4</span>
                  <span className="material-symbols-rounded text-lg">arrow_forward</span>
                </button>
              </>
            )}

            {pedagogicalStep === 4 && (
              <>
                <button
                  onClick={startStep4Proofread}
                  disabled={isPlaying}
                  className="bg-[#FDE68A] text-[#132A22] hover:bg-[#FDE68A]/90 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">play_arrow</span>
                  <span>{isPlaying ? "Đang đọc soát lỗi..." : "Đọc soát lỗi"}</span>
                </button>
                <button
                  onClick={togglePause}
                  disabled={!isPlaying}
                  className="bg-white/10 hover:bg-white/20 text-[#F4F1E8] border border-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">{isPaused ? "play_arrow" : "pause"}</span>
                  <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
                </button>
                <button
                  onClick={handleOpenGrading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-lg">open_in_new</span>
                  <span>Khóa GT &amp; Mở Chấm Bài</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: AI SÁNG TÁC BÀI ĐỌC (QWEN 2.5 SLM / GDPT 2018 BANK)
      ────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isAiGenerateOpen} onOpenChange={setIsAiGenerateOpen}>
        <DialogContent className="max-w-md bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" /> AI Sáng Tác Bài Đọc Chính Tả (Qwen 2.5)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mô hình SLM cục bộ sẽ tự động sáng tác đoạn văn chuẩn GDPT 2018 và trích xuất từ khó.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Chủ đề bài đọc</Label>
              <Input
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="VD: Mùa hè quê em, Tình bạn, Bảo vệ môi trường..."
                className="h-8 text-xs border-border/60"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {AI_TOPIC_SUGGESTIONS.slice(0, 4).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAiTopic(t)}
                    className="text-[10px] bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-0.5 rounded-full text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Khối lớp</Label>
                <Select value={aiGradeLevel} onValueChange={setAiGradeLevel}>
                  <SelectTrigger className="h-8 text-xs font-bold border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lớp 1</SelectItem>
                    <SelectItem value="2">Lớp 2</SelectItem>
                    <SelectItem value="3">Lớp 3</SelectItem>
                    <SelectItem value="4">Lớp 4</SelectItem>
                    <SelectItem value="5">Lớp 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Số câu</Label>
                <Select value={aiSentenceCount} onValueChange={setAiSentenceCount}>
                  <SelectTrigger className="h-8 text-xs font-bold border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 câu</SelectItem>
                    <SelectItem value="4">4 câu</SelectItem>
                    <SelectItem value="5">5 câu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAiGenerateOpen(false)}
              className="h-8 text-xs border-border/60 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              disabled={generatingAi}
              onClick={async () => {
                setGeneratingAi(true)
                try {
                  const res = await fetch("/api/dictation/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      gradeLevel: aiGradeLevel,
                      topic: aiTopic || "Tình bạn và trường lớp",
                      sentenceCount: aiSentenceCount,
                      bookSet: aiBookSet,
                    }),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    if (data.passage) {
                      setTitle(data.passage.title)
                      setPassageText(data.passage.content)
                      setDifficultWords(data.passage.difficultWords || "")
                      setIsAiGenerateOpen(false)
                    }
                  }
                } catch (e) {
                  console.error(e)
                } finally {
                  setGeneratingAi(false)
                }
              }}
              className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1 cursor-pointer"
            >
              {generatingAi ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              <span>{generatingAi ? "Đang sáng tác..." : "Tạo bài đọc"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: THÊM BÀI ĐỌC MỚI VÀO KHO SGK
      ────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isAddPassageOpen} onOpenChange={setIsAddPassageOpen}>
        <DialogContent className="max-w-lg bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              Thêm Bài Đọc Mới Vào Kho SGK
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-bold">Khối lớp</Label>
                <Select
                  value={newPassage.gradeLevel}
                  onValueChange={v => setNewPassage(p => ({ ...p, gradeLevel: v }))}
                >
                  <SelectTrigger className="h-8 text-xs border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lớp 1</SelectItem>
                    <SelectItem value="2">Lớp 2</SelectItem>
                    <SelectItem value="3">Lớp 3</SelectItem>
                    <SelectItem value="4">Lớp 4</SelectItem>
                    <SelectItem value="5">Lớp 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Bộ sách</Label>
                <Select
                  value={newPassage.bookSet}
                  onValueChange={v => setNewPassage(p => ({ ...p, bookSet: v }))}
                >
                  <SelectTrigger className="h-8 text-xs border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KetNoi">Kết Nối</SelectItem>
                    <SelectItem value="CanhDieu">Cánh Diều</SelectItem>
                    <SelectItem value="ChanTroi">Chân Trời</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">Tuần/Bài</Label>
                <Input
                  value={newPassage.unit}
                  onChange={e => setNewPassage(p => ({ ...p, unit: e.target.value }))}
                  placeholder="Tuần 1"
                  className="h-8 text-xs border-border/60"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Tiêu đề bài đọc</Label>
              <Input
                value={newPassage.title}
                onChange={e => setNewPassage(p => ({ ...p, title: e.target.value }))}
                placeholder="VD: Cánh én tuổi thơ"
                className="h-8 text-xs border-border/60"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Nội dung đoạn văn</Label>
              <Textarea
                rows={4}
                value={newPassage.content}
                onChange={e => setNewPassage(p => ({ ...p, content: e.target.value }))}
                placeholder="Nhập toàn bộ văn bản bài đọc chính tả..."
                className="text-xs border-border/60"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Từ khó (cách nhau dấu phẩy)</Label>
              <Input
                value={newPassage.difficultWords}
                onChange={e => setNewPassage(p => ({ ...p, difficultWords: e.target.value }))}
                placeholder="VD: sứt chỉ, hối hận..."
                className="h-8 text-xs border-border/60"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPassageOpen(false)}
              className="h-8 text-xs border-border/60 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!newPassage.title || !newPassage.content) return
                try {
                  const res = await fetch("/api/dictation/passages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newPassage),
                  })
                  if (res.ok) {
                    setIsAddPassageOpen(false)
                    fetchPassages()
                  }
                } catch (e) {
                  console.error(e)
                }
              }}
              className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
            >
              Lưu vào kho SGK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 9. DIALOG HƯỚNG DẪN CLONE GIỌNG GIÁO VIÊN (STUDIO-TO-EDGE) ── */}
      <Dialog open={isVoiceCloningModalOpen} onOpenChange={setIsVoiceCloningModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Nhân Bản Giọng Nói Giáo Viên (Studio-to-Edge)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tạo giọng đọc chính tả mang âm sắc của chính bạn để chạy offline trên trạm Raspberry Pi với độ trễ dưới 0.2s.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-2">
              <p className="font-semibold text-card-foreground">Quy trình 3 bước thực hiện:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed">
                <li>
                  <strong className="text-card-foreground">Thu âm:</strong> Ghi âm 10–15 câu mẫu tiếng Việt ngắn (~3 phút âm thanh rõ ràng, không ồn).
                </li>
                <li>
                  <strong className="text-card-foreground">Fine-tuning ONNX:</strong> Chạy notebook Google Colab / script PC có GPU để tinh chỉnh từ pre-trained model và xuất file <code className="bg-muted px-1 py-0.5 rounded text-emerald-600 font-mono">custom_teacher.onnx</code> (~45MB).
                </li>
                <li>
                  <strong className="text-card-foreground">Nạp vào Raspberry Pi:</strong> Copy file <code className="bg-muted px-1 py-0.5 rounded text-emerald-600 font-mono">.onnx</code> và <code className="bg-muted px-1 py-0.5 rounded text-emerald-600 font-mono">.onnx.json</code> vào thư mục <code className="bg-muted px-1 py-0.5 rounded font-mono">python_service/models/tts/</code>.
                </li>
              </ol>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold mb-1">⚡ Ưu điểm vượt trội của Piper VITS ONNX:</p>
              <p className="text-[11px] leading-relaxed">
                Sau khi nạp model, Raspberry Pi cất giọng đọc của bạn hoàn toàn offline qua tập lệnh tối ưu ARM NEON, không tốn GPU, không cần Internet, và đọc trơn tru từng cụm từ chính tả mà không bị giật rè hay delay!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsVoiceCloningModalOpen(false)}
              className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
            >
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
