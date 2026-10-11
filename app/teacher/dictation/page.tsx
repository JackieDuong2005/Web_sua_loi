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
}

const VOICE_CARDS: VoiceCardDef[] = [
  {
    id: "hoaimy",
    name: "Cô Hoài My",
    gender: "f",
    region: "Bắc",
    engine: "vi-VN-HoaiMyNeural",
    desc: "Nữ · Truyền cảm, rõ nét",
    recommended: true,
  },
  {
    id: "namminh",
    name: "Thầy Nam Minh",
    gender: "m",
    region: "Bắc",
    engine: "vi-VN-NamMinhNeural",
    desc: "Nam · Chuẩn mực, trang trọng",
  },
  {
    id: "trucly",
    name: "Cô Trúc Ly",
    gender: "f",
    region: "Bắc",
    engine: "google_tts",
    desc: "Nữ · Tự nhiên, nhẹ nhàng",
  },
  {
    id: "minhduc",
    name: "Thầy Minh Đức",
    gender: "m",
    region: "Bắc",
    engine: "browser_voice",
    desc: "Nam · Phong cách bản tin",
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

  // ─── Voice & Pedagogical Cadence ────────────────────────────────────────────
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"all" | "f" | "m">("all")
  const [selectedVoiceId, setSelectedVoiceId] = useState("hoaimy")
  const [voiceEngine, setVoiceEngine] = useState("vi-VN-HoaiMyNeural")
  const [speedRate, setSpeedRate] = useState("0.85") // 0.65 to 1.10
  const [repeatCount, setRepeatCount] = useState("2") // 1, 2, 3
  const [pauseSetting, setPauseSetting] = useState("auto") // auto, 10, 15
  const [chunkMode, setChunkMode] = useState<"short" | "standard" | "sentence">("standard")
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([])

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

  // ─── Load Browser Voices & Initial Data ─────────────────────────────────────
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const vList = window.speechSynthesis.getVoices()
        const viVoices = vList.filter(v => v.lang.toLowerCase().includes("vi"))
        setBrowserVoices(viVoices.length > 0 ? viVoices : vList)
      }
    }

    updateVoices()
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices
    }

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

      // ── TẦNG 1 & 2: Edge-TTS qua API Next.js /api/dictation/tts ──
      const ttsUrl = `/api/dictation/tts?text=${encodeURIComponent(clause)}&voice=${encodeURIComponent(voiceEngine)}&rate=${encodeURIComponent(rateStr)}`
      const audio = new Audio(ttsUrl)
      currentAudioRef.current = audio

      audio.onended = () => {
        currentAudioRef.current = null
        cleanupAndResolve(true)
      }

      audio.onerror = () => {
        // ── TẦNG 3: Fallback ngoại tuyến Web Speech API ──
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(clause)
          utterance.lang = "vi-VN"
          utterance.rate = speedNum
          utterance.onend = () => cleanupAndResolve(true)
          utterance.onerror = () => cleanupAndResolve(false)
          window.speechSynthesis.speak(utterance)
        } else {
          cleanupAndResolve(false)
        }
      }

      audio.play().catch(() => {
        // Fallback sang SpeechSynthesis
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(clause)
          utterance.lang = "vi-VN"
          utterance.rate = speedNum
          utterance.onend = () => cleanupAndResolve(true)
          utterance.onerror = () => cleanupAndResolve(false)
          window.speechSynthesis.speak(utterance)
        } else {
          cleanupAndResolve(false)
        }
      })
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
    const sessionToken = playbackIdRef.current
    const sample = `Xin chào các em. Tôi là ${voiceDef.name}, giọng đọc chính tả chuẩn tiếng Việt.`
    
    const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(sample)}&voice=${encodeURIComponent(voiceDef.engine)}&rate=-15%`)
    currentAudioRef.current = audio
    audio.play().catch(() => {})
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

  // ─── Filtered Voice Cards ───────────────────────────────────────────────────
  const filteredVoices = useMemo(() => {
    if (voiceGenderFilter === "all") return VOICE_CARDS
    return VOICE_CARDS.filter(v => v.gender === voiceGenderFilter)
  }, [voiceGenderFilter])

  return (
    <div className="flex flex-col min-h-screen">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. UNIFIED TEACHER HEADER
      ────────────────────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-semibold text-card-foreground">Đọc chính tả sư phạm</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Trợ giảng đọc chính tả thông minh theo chuẩn GDPT 2018 &amp; Khóa Ground Truth chấm bài
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 border border-border/60 bg-muted/40 rounded-full px-3 py-1 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Neural TTS · 48 kHz</span>
          </div>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-9 text-xs font-semibold rounded-lg w-28 border-border/60">
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
              <Mic className="w-4 h-4 text-emerald-600 shrink-0" />
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
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
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
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Lịch sử phiên ({sessions.length})</span>
            </button>
          </div>

          <div className="py-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowProjector(true)}
              className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Bật Bảng Xanh Trình Chiếu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. MAIN CONTAINER
      ────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0 overflow-x-hidden pb-32">
        
        {/* ════════════════════════════════════════════════════════════════════════
            TAB 1: TRÌNH PHÁT ĐỌC & SOẠN BÀI (MAIN COCKPIT)
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "editor" && (
          <div className="space-y-5">
            {/* ── 1. THANH TIẾN TRÌNH 4 BƯỚC SƯ PHẠM (PEDAGOGICAL STEPPER GDPT 2018) ── */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 md:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[11px] font-bold">
                      Quy chuẩn GDPT 2018
                    </Badge>
                    <span className="text-xs text-muted-foreground font-semibold">
                      Phân môn Chính tả (Nghe - Viết Tiểu học)
                    </span>
                  </div>
                  <h2 className="text-sm md:text-base font-extrabold text-card-foreground mt-1">
                    Quy Trình 4 Bước Sư Phạm Chuẩn Bộ GD&amp;ĐT
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={startFullPedagogicalWorkflow}
                    className="h-9 px-4 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Dạy trọn vẹn 4 Bước liên hoàn</span>
                  </Button>
                </div>
              </div>

              {/* 4 Step Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Step 1 */}
                <div
                  onClick={() => setPedagogicalStep(1)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    pedagogicalStep === 1
                      ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-600 shadow-xs"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      pedagogicalStep === 1
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>1</span>
                    {pedagogicalStep === 1 && isPlaying && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-card-foreground">
                    1. Đọc mẫu toàn bài
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    Nghe toàn bộ nội dung &amp; ngữ điệu
                  </p>
                </div>

                {/* Step 2 */}
                <div
                  onClick={() => setPedagogicalStep(2)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    pedagogicalStep === 2
                      ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-600 shadow-xs"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      pedagogicalStep === 2
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>2</span>
                    {pedagogicalStep === 2 && isPlaying && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-card-foreground">
                    2. Luyện từ khó
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    Rèn bảng con ({difficultWordsList.length} từ khó)
                  </p>
                </div>

                {/* Step 3 */}
                <div
                  onClick={() => setPedagogicalStep(3)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    pedagogicalStep === 3
                      ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-600 shadow-xs"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      pedagogicalStep === 3
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>3</span>
                    {pedagogicalStep === 3 && isPlaying && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-card-foreground">
                    3. Nghe - Viết chính thức
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    Đọc từng nhịp ({previewClauseList.length} cụm câu)
                  </p>
                </div>

                {/* Step 4 */}
                <div
                  onClick={() => setPedagogicalStep(4)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    pedagogicalStep === 4
                      ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-600 shadow-xs"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      pedagogicalStep === 4
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>4</span>
                    {createdSessionId && (
                      <Badge className="bg-emerald-500 text-white text-[9px] px-1 py-0 h-4">
                        Đã khóa GT
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-card-foreground">
                    4. Soát lỗi &amp; Khóa GT
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    Dò bút chì &amp; Cầu nối chấm bài
                  </p>
                </div>
              </div>
            </div>

            {/* ── 2. ACTIVE STEP CONSOLE STAGE (BUỒNG LÁI THEO BƯỚC SƯ PHẠM ĐANG CHỌN) ── */}
            <div className="bg-card border border-border/60 rounded-2xl p-4 md:p-5 shadow-xs space-y-4 bg-gradient-to-br from-card via-card to-muted/20">
              
              {/* Banner Trạng Thái Sư Phạm */}
              <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold text-card-foreground">
                    {stepStatusMessage || (
                      pedagogicalStep === 1
                        ? "Bước 1: Sẵn sàng đọc mẫu toàn bài cho học sinh lắng nghe"
                        : pedagogicalStep === 2
                        ? `Bước 2: Hướng dẫn viết bảng con (${difficultWordsList.length} từ khó)`
                        : pedagogicalStep === 3
                        ? `Bước 3: Nghe - Viết chính thức (${previewClauseList.length} cụm câu)`
                        : "Bước 4: Đọc soát lỗi toàn bài và lưu khóa Ground Truth chấm bài"
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-muted text-muted-foreground border-border/60 text-xs">
                    {formatClassName(selectedClass)}
                  </Badge>
                  {isSpeakingNow && (
                    <Badge className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 text-xs animate-pulse">
                      🔊 Đang phát âm...
                    </Badge>
                  )}
                  {countdown > 0 && (
                    <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-xs font-mono font-bold">
                      ⏳ Học sinh viết: {countdown}s
                    </Badge>
                  )}
                </div>
              </div>

              {/* NỘI DUNG SÂN KHẤU TƯƠNG ỨNG TỪNG BƯỚC */}
              {pedagogicalStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Toàn văn bài đọc mẫu
                      </span>
                      <span>Tốc độ: 0.90x · Giọng: {VOICE_CARDS.find(v => v.id === selectedVoiceId)?.name}</span>
                    </div>
                    <p className="text-base sm:text-lg leading-relaxed text-card-foreground font-medium" style={{ fontFamily: "'Lexend', sans-serif" }}>
                      {passageText}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={() => startStep1Overview(false)}
                      disabled={isPlaying}
                      className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Bắt đầu đọc mẫu toàn bài</span>
                    </Button>

                    <Button
                      onClick={togglePause}
                      disabled={!isPlaying}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 gap-1.5 cursor-pointer"
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
                    </Button>

                    <Button
                      onClick={stopPlayback}
                      disabled={!isPlaying}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer"
                    >
                      <Square className="h-4 w-4" />
                      <span>Dừng đọc</span>
                    </Button>

                    <Button
                      onClick={() => {
                        stopPlayback()
                        setPedagogicalStep(2)
                      }}
                      variant="ghost"
                      className="h-10 px-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ml-auto cursor-pointer"
                    >
                      <span>Bỏ qua sang Bước 2: Luyện từ khó ›</span>
                    </Button>
                  </div>
                </div>
              )}

              {pedagogicalStep === 2 && (
                <div className="space-y-4">
                  {/* Pills chọn từ khó */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-card-foreground">Danh sách từ khó:</span>
                    {difficultWordsList.map((w, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setStep2WordIndex(idx)
                          startStep2DrillWord(idx, false)
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          step2WordIndex === idx
                            ? "bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400 shadow-2xs"
                            : "bg-card border-border/60 hover:bg-muted text-card-foreground"
                        }`}
                      >
                        <span className="text-[10px] opacity-75">{idx + 1}.</span>
                        <span>{w}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sân khấu từ khó to */}
                  <div className="p-6 md:p-8 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-center space-y-3">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                      Từ khó đang luyện ({step2WordIndex + 1}/{Math.max(1, difficultWordsList.length)})
                    </span>
                    <div className="text-3xl md:text-5xl font-black text-amber-900 dark:text-amber-100 py-2 tracking-wide" style={{ fontFamily: "'Lexend', sans-serif" }}>
                      "{difficultWordsList[step2WordIndex] || "Chưa có từ khó"}"
                    </div>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      💡 <b>Lời dặn giáo viên:</b> Hướng dẫn học sinh đặt nét bút, phân biệt phụ âm đầu và dấu thanh. Học sinh viết vào bảng con trong 12 giây rồi giơ lên.
                    </p>
                  </div>

                  {/* Điều khiển Bước 2 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={() => startStep2DrillWord(step2WordIndex, false)}
                      disabled={isPlaying}
                      className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer"
                    >
                      <Volume2 className="h-4 w-4" />
                      <span>Phát âm từ này (2 lần + Viết bảng con)</span>
                    </Button>

                    <Button
                      onClick={() => {
                        const prevIdx = Math.max(0, step2WordIndex - 1)
                        setStep2WordIndex(prevIdx)
                        startStep2DrillWord(prevIdx, false)
                      }}
                      disabled={step2WordIndex === 0 || isPlaying}
                      variant="outline"
                      className="h-10 px-3 rounded-xl text-xs font-bold border-border/60 cursor-pointer"
                    >
                      ‹ Từ trước
                    </Button>

                    <Button
                      onClick={() => {
                        const nextIdx = Math.min(difficultWordsList.length - 1, step2WordIndex + 1)
                        setStep2WordIndex(nextIdx)
                        startStep2DrillWord(nextIdx, false)
                      }}
                      disabled={step2WordIndex >= difficultWordsList.length - 1 || isPlaying}
                      variant="outline"
                      className="h-10 px-3 rounded-xl text-xs font-bold border-border/60 cursor-pointer"
                    >
                      Từ sau ›
                    </Button>

                    <Button
                      onClick={() => startStep2DrillWord(0, true)}
                      disabled={isPlaying}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 cursor-pointer"
                    >
                      <span>Luyện tự động tất cả từ khó</span>
                    </Button>

                    <Button
                      onClick={() => {
                        stopPlayback()
                        setPedagogicalStep(3)
                      }}
                      variant="ghost"
                      className="h-10 px-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ml-auto cursor-pointer"
                    >
                      <span>Sang Bước 3: Nghe - Viết chính thức ›</span>
                    </Button>
                  </div>
                </div>
              )}

              {pedagogicalStep === 3 && (
                <div className="space-y-4">
                  {/* Sân khấu Cụm câu đang đọc */}
                  <div className="p-6 md:p-8 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-center space-y-3">
                    <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold max-w-lg mx-auto">
                      <span>Cụm {currentClauseIndex + 1}/{Math.max(1, clauses.length || previewClauseList.length)}</span>
                      <span>Lần {currentRepeat}/{repeatCount}</span>
                      <span>Nghỉ: {pauseSetting === "auto" ? "Tự động (~1.6s/từ)" : `${pauseSetting}s`}</span>
                    </div>

                    <div className="text-2xl md:text-4xl font-extrabold text-card-foreground py-2 leading-relaxed" style={{ fontFamily: "'Lexend', sans-serif" }}>
                      "{clauses[currentClauseIndex] || previewClauseList[currentClauseIndex] || previewClauseList[0] || "Bắt đầu bài đọc..."}"
                    </div>

                    {/* Thanh tiến trình cụm */}
                    <div className="w-full max-w-md mx-auto bg-muted/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300"
                        style={{
                          width: `${Math.round(((currentClauseIndex + 1) / Math.max(1, clauses.length || previewClauseList.length)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Điều khiển Bước 3 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={() => startStep3Dictation(false)}
                      disabled={isPlaying}
                      className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>{isPlaying ? "Đang đọc..." : "Bắt đầu Nghe - Viết"}</span>
                    </Button>

                    <Button
                      onClick={togglePause}
                      disabled={!isPlaying}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 gap-1.5 cursor-pointer"
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
                    </Button>

                    <Button
                      onClick={repeatCurrentClause}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Đọc lại cụm này</span>
                    </Button>

                    <Button
                      onClick={skipToNextClause}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 gap-1.5 cursor-pointer"
                    >
                      <FastForward className="h-4 w-4" />
                      <span>Cụm tiếp theo</span>
                    </Button>

                    <Button
                      onClick={stopPlayback}
                      disabled={!isPlaying}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer"
                    >
                      <Square className="h-4 w-4" />
                      <span>Dừng hẳn</span>
                    </Button>

                    <Button
                      onClick={() => {
                        stopPlayback()
                        setPedagogicalStep(4)
                      }}
                      variant="ghost"
                      className="h-10 px-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ml-auto cursor-pointer"
                    >
                      <span>Sang Bước 4: Soát lỗi toàn bài ›</span>
                    </Button>
                  </div>
                </div>
              )}

              {pedagogicalStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Văn bản học sinh dò bài soát lỗi
                      </span>
                      <span>Tốc độ: 0.85x · Đọc chậm để học sinh dò bút chì</span>
                    </div>
                    <p className="text-base sm:text-lg leading-relaxed text-card-foreground font-medium" style={{ fontFamily: "'Lexend', sans-serif" }}>
                      {passageText}
                    </p>
                  </div>

                  {/* Bảng nghiệm thu Ground Truth nếu đã hoàn tất */}
                  {createdSessionId ? (
                    <div className="p-4 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-400 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                          <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                            Ground Truth Đã Được Khóa An Toàn Vào CSDL SQLite
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono">
                          Mã phiên: {createdSessionId} · Lớp: {selectedClass} · {stats.words} từ
                        </p>
                      </div>

                      <Button
                        onClick={handleOpenGrading}
                        className="h-10 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs gap-2 shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>🎯 Mở Phiên Chấm Điểm Cho Lớp Ngay (1-Click)</span>
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={startStep4Proofread}
                      disabled={isPlaying}
                      className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>{isPlaying ? "Đang đọc soát lỗi..." : "Bắt đầu đọc soát lỗi toàn bài"}</span>
                    </Button>

                    <Button
                      onClick={togglePause}
                      disabled={!isPlaying}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 gap-1.5 cursor-pointer"
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      <span>{isPaused ? "Tiếp tục" : "Tạm dừng"}</span>
                    </Button>

                    <Button
                      onClick={stopPlayback}
                      disabled={!isPlaying}
                      variant="outline"
                      className="h-10 px-4 rounded-xl text-xs font-bold border-border/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer"
                    >
                      <Square className="h-4 w-4" />
                      <span>Dừng đọc</span>
                    </Button>

                    <Button
                      onClick={handleOpenGrading}
                      className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-2 ml-auto shadow-xs cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>🎯 Khóa Ground Truth &amp; Chuyển Sang Chấm Bài</span>
                    </Button>
                  </div>
                </div>
              )}

            </div>

            {/* ── 3. KHUNG SOẠN THẢO VÀ CẤU HÌNH SƯ PHẠM ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5 items-start">
            
            {/* ── CỘT TRÁI: VĂN BẢN ĐỌC & SOẠN THẢO TRANG VỞ ── */}
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
              
              {/* Card Header */}
              <div className="flex items-center justify-between p-3.5 md:p-4 border-b border-border/60 gap-2 flex-wrap bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Văn bản đọc · Đang soạn:
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Tiêu đề bài đọc..."
                    className="font-bold text-sm bg-transparent border-b border-dashed border-emerald-600 text-card-foreground outline-hidden px-1"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => testVoiceSpecific(VOICE_CARDS.find(v => v.id === selectedVoiceId) || VOICE_CARDS[0])}
                    className="text-xs font-semibold px-2 py-1 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-muted transition-colors cursor-pointer"
                  >
                    Nghe thử
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText()
                        if (text) setPassageText(text)
                      } catch {}
                    }}
                    className="text-xs font-semibold px-2 py-1 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-muted transition-colors cursor-pointer"
                  >
                    Dán
                  </button>
                  <button
                    onClick={() => setIsAiGenerateOpen(true)}
                    className="text-xs font-bold px-2 py-1 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Wand2 className="h-3 w-3" /> AI soạn bài
                  </button>
                  <button
                    onClick={() => setPassageText("")}
                    className="text-xs font-semibold px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    Xóa
                  </button>
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
                  className="w-full min-h-[190px] border-0 outline-hidden resize-none bg-transparent text-card-foreground text-base md:text-lg leading-[1.75]"
                  style={{ fontFamily: "'Lexend', sans-serif" }}
                />
              </div>

              {/* Row Từ khó */}
              <div className="px-4 py-3 border-t border-border/60 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className="font-semibold text-card-foreground">Từ khó:</span>
                {difficultWords.split(",").filter(Boolean).map((w, idx) => (
                  <span
                    key={idx}
                    className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-semibold rounded-full px-3 py-0.5 text-xs shadow-2xs"
                  >
                    {w.trim()}
                  </span>
                ))}
                <Input
                  value={difficultWords}
                  onChange={e => setDifficultWords(e.target.value)}
                  placeholder="Thêm từ khó (cách nhau dấu phẩy)..."
                  className="h-7 text-xs max-w-[200px] ml-auto border-border/60"
                />
              </div>

              {/* Row Chèn lệnh sư phạm & Mẫu nhanh */}
              <div className="px-4 py-2.5 border-t border-border/60 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className="font-semibold text-card-foreground">Chèn lệnh:</span>
                <button
                  type="button"
                  onClick={() => insertCommand(" [nghỉ 3s] ")}
                  className="border border-border/60 bg-muted/40 text-card-foreground rounded-full px-2.5 py-1 font-semibold hover:border-emerald-600 transition-colors cursor-pointer"
                >
                  ⏸ Nghỉ 3s
                </button>
                <button
                  type="button"
                  onClick={() => insertCommand(" [nghỉ 5s] ")}
                  className="border border-border/60 bg-muted/40 text-card-foreground rounded-full px-2.5 py-1 font-semibold hover:border-emerald-600 transition-colors cursor-pointer"
                >
                  ⏸ Nghỉ 5s
                </button>
                <button
                  type="button"
                  onClick={() => insertCommand(" [chậm] ")}
                  className="border border-border/60 bg-muted/40 text-card-foreground rounded-full px-2.5 py-1 font-semibold hover:border-emerald-600 transition-colors cursor-pointer"
                >
                  🐢 Đọc chậm
                </button>
                <button
                  type="button"
                  onClick={() => insertCommand(" [nhấn] ")}
                  className="border border-border/60 bg-muted/40 text-card-foreground rounded-full px-2.5 py-1 font-semibold hover:border-emerald-600 transition-colors cursor-pointer"
                >
                  🎯 Nhấn giọng
                </button>

                <div className="ml-auto flex items-center gap-1.5">
                  <span className="font-semibold text-card-foreground">Mẫu nhanh:</span>
                  <button
                    type="button"
                    onClick={() => loadPresetByGrade(1)}
                    className="border border-border/60 bg-muted/40 text-card-foreground rounded-full px-2.5 py-0.5 font-bold text-xs hover:border-emerald-600 cursor-pointer"
                  >
                    Lớp 1
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetByGrade(2)}
                    className="border border-border/60 bg-muted/40 text-card-foreground rounded-full px-2.5 py-0.5 font-bold text-xs hover:border-emerald-600 cursor-pointer"
                  >
                    Lớp 2
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetByGrade(3)}
                    className="border border-border/60 bg-muted/40 text-card-foreground rounded-full px-2.5 py-0.5 font-bold text-xs hover:border-emerald-600 cursor-pointer"
                  >
                    Lớp 3
                  </button>
                </div>
              </div>

              {/* Row Hiển thị các cụm từ phân rã sư phạm */}
              <div className="px-4 py-2.5 border-t border-border/60 flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {previewClauseList.length} cụm đọc:
                </span>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {previewClauseList.slice(0, 4).map((c, idx) => (
                    <span
                      key={idx}
                      className="border border-dashed border-border/60 bg-muted/20 rounded-lg px-2 py-0.5 text-xs text-card-foreground"
                    >
                      <b className="text-rose-600 mr-1">{idx + 1}</b>
                      {c.length > 24 ? c.slice(0, 24) + "…" : c}
                    </span>
                  ))}
                  {previewClauseList.length > 4 && (
                    <span className="text-xs text-muted-foreground font-semibold">
                      +{previewClauseList.length - 4} cụm khác
                    </span>
                  )}
                </div>
              </div>

              {/* Row Thống kê */}
              <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono bg-muted/10">
                <span>{stats.chars} ký tự · {stats.words} từ · {stats.sentences} câu</span>
                <span>Ước tính: {stats.duration}</span>
              </div>
            </div>

            {/* ── CỘT PHẢI: TRUNG TÂM GIỌNG ĐỌC & CẤU HÌNH NHỊP SƯ PHẠM ── */}
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs space-y-4 p-4 md:p-5">
              
              {/* Header Thẻ Giọng Đọc & Bộ lọc */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="font-bold text-base text-card-foreground flex items-center gap-1.5">
                  <span>Giọng đọc ({filteredVoices.length})</span>
                </h3>
                
                <div className="flex bg-muted/50 border border-border/60 rounded-xl p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setVoiceGenderFilter("all")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      voiceGenderFilter === "all"
                        ? "bg-card text-card-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceGenderFilter("f")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      voiceGenderFilter === "f"
                        ? "bg-card text-card-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Nữ
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceGenderFilter("m")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      voiceGenderFilter === "m"
                        ? "bg-card text-card-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Nam
                  </button>
                </div>
              </div>

              {/* Danh sách 4 Voice Cards */}
              <div className="grid gap-2.5">
                {filteredVoices.map(v => {
                  const isSelected = selectedVoiceId === v.id
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        setSelectedVoiceId(v.id)
                        setVoiceEngine(v.engine)
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-600"
                          : "border-border/60 hover:border-border bg-card"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                          v.gender === "f" 
                            ? "bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300" 
                            : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {v.gender === "f" ? "♀" : "♂"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-card-foreground truncate">
                            {v.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted border border-border/60 text-muted-foreground">
                            {v.region}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.desc}
                        </p>
                      </div>

                      {/* Nút nghe thử riêng */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          testVoiceSpecific(v)
                        }}
                        className="w-8 h-8 rounded-full border border-border/60 bg-card hover:bg-muted flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-emerald-700 dark:text-emerald-400 shrink-0 cursor-pointer shadow-2xs"
                        title={`Nghe thử giọng ${v.name}`}
                      >
                        ▶
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* ── BỘ ĐIỀU KHIỂN TỐC ĐỘ SƯ PHẠM ── */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>TỐC ĐỘ ĐỌC · CHUẨN SƯ PHẠM {Math.round((parseFloat(speedRate) - 1.0) * 100)}%</span>
                  <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                    {parseFloat(speedRate).toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = Math.max(0.65, Math.min(1.10, parseFloat(speedRate) - 0.05))
                      setSpeedRate(cur.toFixed(2))
                    }}
                    className="w-8 h-8 rounded-lg border border-border/60 text-card-foreground font-bold text-sm flex items-center justify-center hover:bg-muted cursor-pointer"
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
                    className="w-8 h-8 rounded-lg border border-border/60 text-card-foreground font-bold text-sm flex items-center justify-center hover:bg-muted cursor-pointer"
                  >
                    +
                  </button>
                </div>
                
                <p className="text-[11px] text-muted-foreground text-center">
                  Lớp 1: 0.65 · Lớp 3: 0.90 · Lớp 5: 0.95
                </p>
              </div>

              {/* ── LẶP LẠI VÀ NGHỈ VIẾT SEGMENTS ── */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
                
                {/* Lặp lại */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5 uppercase">
                    Lặp lại
                  </label>
                  <div className="flex bg-muted/50 border border-border/60 rounded-xl p-0.5 text-xs font-semibold">
                    {["1", "2", "3"].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRepeatCount(r)}
                        className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                          repeatCount === r
                            ? "bg-card text-card-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nghỉ viết */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5 uppercase">
                    Nghỉ viết
                  </label>
                  <div className="flex bg-muted/50 border border-border/60 rounded-xl p-0.5 text-xs font-semibold">
                    {[
                      { val: "auto", lbl: "Auto" },
                      { val: "10", lbl: "10s" },
                      { val: "15", lbl: "15s" },
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setPauseSetting(p.val)}
                        className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                          pauseSetting === p.val
                            ? "bg-card text-card-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p.lbl}
                      </button>
                    ))}
                  </div>
                </div>
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
          4. STICKY BOTTOM ACTION BAR (CỐ ĐỊNH CHÂN TRANG)
      ────────────────────────────────────────────────────────────────────────── */}
      <footer className="fixed left-0 right-0 bottom-0 z-40 bg-card/95 border-t border-border px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 backdrop-blur-md shadow-lg flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Nút hành động chính phản ánh bước hiện tại */}
          <Button
            onClick={() => {
              if (pedagogicalStep === 1) startStep1Overview(false)
              else if (pedagogicalStep === 2) startStep2DrillWord(step2WordIndex, false)
              else if (pedagogicalStep === 3) startStep3Dictation(false)
              else if (pedagogicalStep === 4) startStep4Proofread()
            }}
            disabled={isPlaying}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm tracking-wide shadow-xs gap-2 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>
              {isPlaying
                ? "Đang phát đọc..."
                : pedagogicalStep === 1
                ? "Bắt đầu Bước 1: Đọc mẫu"
                : pedagogicalStep === 2
                ? `Bắt đầu Bước 2: Từ khó (${difficultWordsList[step2WordIndex] || "Từ khó"})`
                : pedagogicalStep === 3
                ? "Bắt đầu Bước 3: Nghe - Viết"
                : "Bắt đầu Bước 4: Soát lỗi"}
            </span>
          </Button>

          {/* Quick Step Switcher 1..4 */}
          <div className="hidden sm:flex bg-muted/60 border border-border/60 rounded-xl p-0.5 text-xs font-semibold">
            {([1, 2, 3, 4] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  stopPlayback()
                  setPedagogicalStep(s)
                }}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pedagogicalStep === s
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={`Chuyển sang Bước ${s}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              {stepStatusMessage || `Bước ${pedagogicalStep}/4 GDPT 2018`}
            </span>
          </div>
        </div>

        {/* Animated Waveform Visualizer */}
        <div className="hidden md:flex items-end gap-1 h-6 min-w-[120px] px-2 opacity-80">
          {Array.from({ length: 24 }).map((_, idx) => {
            const height = 5 + Math.round(Math.abs(Math.sin(idx * 1.3)) * 18)
            return (
              <span
                key={idx}
                className={`w-1 rounded-sm bg-emerald-600 dark:bg-emerald-400 transition-all ${
                  isPlaying ? "dict-wave-bar" : "opacity-30"
                }`}
                style={{
                  height: `${height}px`,
                  animationDelay: `${(idx % 8) * 0.15}s`,
                }}
              />
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowProjector(true)}
            variant="outline"
            className="h-10 px-3.5 rounded-xl text-xs font-bold border-border/60 gap-1.5 hover:bg-muted cursor-pointer"
          >
            <Presentation className="h-4 w-4" />
            <span className="hidden sm:inline">Bảng xanh trình chiếu</span>
          </Button>

          <Button
            onClick={handleOpenGrading}
            className="h-10 px-4 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 shadow-xs cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Chấm bài (GT)</span>
          </Button>
        </div>
      </footer>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. CLASSROOM CHALKBOARD OVERLAY (CHẾ ĐỘ BẢNG XANH TRÌNH CHIẾU)
      ────────────────────────────────────────────────────────────────────────── */}
      {showProjector && (
        <div
          id="pr"
          className="fixed inset-0 z-50 bg-[#16382F] text-[#F4F1E8] flex flex-col justify-between p-6 md:p-8 select-none transition-all duration-300"
          style={{ fontFamily: "'Lexend', sans-serif" }}
        >
          {/* Top Bar Trình Chiếu */}
          <div className="flex items-center justify-between pb-4 border-b border-[#F4F1E8]/20 gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <span className="text-[#F6D365] font-extrabold">{formatClassName(selectedClass)}</span>
              <span>·</span>
              <span className="truncate max-w-[260px]">{title || "Bài đọc chính tả"}</span>
            </div>

            {/* 4 Mini Pills Chọn Bước Sư Phạm Trực Tiếp Trên Máy Chiếu */}
            <div className="flex bg-[#F4F1E8]/10 rounded-xl p-1 gap-1 border border-[#F4F1E8]/20">
              {[
                { step: 1 as const, label: "1. Đọc mẫu" },
                { step: 2 as const, label: `2. Luyện từ khó (${difficultWordsList.length})` },
                { step: 3 as const, label: `3. Nghe - Viết (${previewClauseList.length})` },
                { step: 4 as const, label: "4. Soát lỗi & Khóa GT" },
              ].map(s => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(s.step)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pedagogicalStep === s.step
                      ? "bg-[#F6D365] text-[#16382F] shadow-sm font-extrabold"
                      : "text-[#F4F1E8]/70 hover:text-[#F4F1E8] hover:bg-[#F4F1E8]/10"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowProjector(false)
              }}
              className="rounded-full border-[#F4F1E8]/40 text-[#F4F1E8] hover:bg-[#F4F1E8]/10 h-8 text-xs font-semibold cursor-pointer"
            >
              Thoát trình chiếu (Esc)
            </Button>
          </div>

          {/* Central Stage Dựa Vào pedagogicalStep */}
          {pedagogicalStep === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6 max-w-4xl mx-auto">
              <div className="text-sm md:text-base font-extrabold tracking-widest text-[#F6D365] uppercase animate-pulse">
                {isSpeakingNow ? "🎧 BƯỚC 1: ĐANG ĐỌC MẪU TOÀN BÀI · HỌC SINH LẮNG NGHE" : "🎧 BƯỚC 1: ĐỌC MẪU TOÀN BÀI"}
              </div>

              <div className="text-xl sm:text-2xl md:text-3xl font-medium text-center leading-relaxed max-w-[950px] p-6 rounded-2xl bg-[#F4F1E8]/5 border border-[#F4F1E8]/10">
                {passageText}
              </div>

              <div className="text-xs text-[#F4F1E8]/70">
                Học sinh lắng nghe để nắm nội dung toàn bài, nhịp điệu và ngữ điệu câu.
              </div>
            </div>
          )}

          {pedagogicalStep === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6">
              <div className="text-sm md:text-base font-extrabold tracking-widest text-[#F6D365] uppercase animate-pulse">
                {countdown > 0
                  ? `✍️ CÁC EM VIẾT BẢNG CON: ${countdown}s`
                  : isSpeakingNow
                  ? "🔊 ĐANG PHÁT ÂM TỪ KHÓ..."
                  : `✍️ BƯỚC 2: LUYỆN TỪ KHÓ TRÊN BẢNG CON (${step2WordIndex + 1}/${difficultWordsList.length})`}
              </div>

              {/* Từ khó siêu to */}
              <div className="text-[clamp(42px,8vw,96px)] font-black text-[#F6D365] tracking-wide drop-shadow-md py-4">
                {difficultWordsList[step2WordIndex] || "Từ khó"}
              </div>

              {/* Đồng hồ đếm ngược 12s viết bảng con */}
              <div className="relative w-28 h-28 md:w-32 md:h-32">
                <svg width="100%" height="100%" viewBox="0 0 140 140" className="-rotate-90">
                  <circle cx="70" cy="70" r="61" fill="none" stroke="#F4F1E82E" strokeWidth="10" />
                  <circle
                    cx="70"
                    cy="70"
                    r="61"
                    fill="none"
                    stroke="#F6D365"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="383.27"
                    style={{
                      strokeDashoffset: `${383.27 * (1 - (countdown / Math.max(1, maxCountdown || 12)))}`,
                      transition: "stroke-dashoffset 1s linear",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-3xl md:text-4xl font-mono font-bold text-[#F4F1E8]">
                  {isSpeakingNow ? "🔊" : countdown > 0 ? countdown : "✓"}
                </div>
              </div>

              {/* Dãy nút bấm chuyển từ khó nhanh */}
              <div className="flex items-center gap-2 flex-wrap justify-center pt-2">
                {difficultWordsList.map((w, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStep2WordIndex(idx)
                      startStep2DrillWord(idx, false)
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      step2WordIndex === idx
                        ? "bg-[#F6D365] text-[#16382F] scale-110 shadow-sm"
                        : "bg-[#F4F1E8]/15 text-[#F4F1E8] hover:bg-[#F4F1E8]/25"
                    }`}
                  >
                    {idx + 1}. {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pedagogicalStep === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6">
              <div className="text-sm md:text-base font-extrabold tracking-widest text-[#F6D365] uppercase animate-pulse">
                {isSpeakingNow
                  ? `🔊 ĐANG ĐỌC CỤM ${currentClauseIndex + 1}/${previewClauseList.length} (LẦN ${currentRepeat}/${repeatCount})`
                  : countdown > 0
                  ? `✍️ CÁC EM VIẾT VỞ: ${countdown}s`
                  : `✍️ BƯỚC 3: NGHE - VIẾT CHÍNH THỨC (${currentClauseIndex + 1}/${previewClauseList.length})`}
              </div>

              {/* Văn bản cụm câu chữ khổng lồ */}
              <div
                className={`text-[clamp(28px,5vw,56px)] font-bold text-center leading-[1.35] max-w-[1050px] transition-all duration-300 ${
                  isTextHidden ? "blur-md opacity-25 select-none" : "opacity-100"
                }`}
              >
                "{clauses[currentClauseIndex] || previewClauseList[currentClauseIndex] || "Bắt đầu bài đọc..."}"
              </div>

              {/* Circular Ring Countdown Timer */}
              <div className="relative w-32 h-32 md:w-36 md:h-36">
                <svg width="100%" height="100%" viewBox="0 0 140 140" className="-rotate-90">
                  <circle cx="70" cy="70" r="61" fill="none" stroke="#F4F1E82E" strokeWidth="10" />
                  <circle
                    cx="70"
                    cy="70"
                    r="61"
                    fill="none"
                    stroke="#F6D365"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="383.27"
                    style={{
                      strokeDashoffset: `${383.27 * (1 - (countdown / Math.max(1, maxCountdown)))}`,
                      transition: "stroke-dashoffset 1s linear",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-mono font-bold text-[#F4F1E8]">
                  {isSpeakingNow ? "🔊" : countdown > 0 ? countdown : "✓"}
                </div>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
                {(clauses.length > 0 ? clauses : previewClauseList).map((_, idx) => (
                  <i
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 border-[#F4F1E8] transition-all duration-300 ${
                      idx < currentClauseIndex
                        ? "bg-[#F4F1E8] opacity-100"
                        : idx === currentClauseIndex
                        ? "bg-[#F6D365] border-[#F6D365] scale-125 opacity-100 shadow-sm"
                        : "opacity-35"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {pedagogicalStep === 4 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6 max-w-4xl mx-auto">
              <div className="text-sm md:text-base font-extrabold tracking-widest text-[#F6D365] uppercase animate-pulse">
                {isSpeakingNow ? "🔍 BƯỚC 4: ĐANG ĐỌC SOÁT LỖI TOÀN BÀI..." : "🔍 BƯỚC 4: SOÁT LỖI TOÀN BÀI & DÒ BÚT CHÌ"}
              </div>

              <div className="text-xl sm:text-2xl md:text-3xl font-medium text-center leading-relaxed max-w-[950px] p-6 rounded-2xl bg-[#F4F1E8]/5 border border-[#F4F1E8]/10">
                {passageText}
              </div>

              <div className="text-xs text-[#F4F1E8]/70">
                Học sinh dùng bút chì dò lại từng từ. Khi hoàn tất, thầy/cô bấm nút Khóa Ground Truth để chuyển sang chấm bài.
              </div>
            </div>
          )}

          {/* Bottom Presenter Controls Bar */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#F4F1E8]/20 flex-wrap">
            {pedagogicalStep === 1 && (
              <>
                <button
                  onClick={() => startStep1Overview(false)}
                  disabled={isPlaying}
                  className="bg-[#F6D365] text-[#16382F] hover:bg-[#F6D365]/90 rounded-2xl px-6 py-3 text-base font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isPlaying ? "Đang đọc mẫu..." : "▶ Bắt đầu đọc mẫu"}
                </button>
                <button
                  onClick={togglePause}
                  disabled={!isPlaying}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  {isPaused ? "▶ Tiếp tục" : "❚❚ Tạm dừng"}
                </button>
                <button
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(2)
                  }}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  Sang Bước 2: Luyện từ khó ›
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
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  ‹ Từ trước
                </button>
                <button
                  onClick={() => startStep2DrillWord(step2WordIndex, false)}
                  className="bg-[#F6D365] text-[#16382F] hover:bg-[#F6D365]/90 rounded-2xl px-6 py-3 text-base font-extrabold shadow-md transition-all cursor-pointer"
                >
                  ↺ Phát âm từ này
                </button>
                <button
                  onClick={() => {
                    if (step2WordIndex < difficultWordsList.length - 1) {
                      setStep2WordIndex(i => i + 1)
                      startStep2DrillWord(step2WordIndex + 1, false)
                    }
                  }}
                  disabled={step2WordIndex >= difficultWordsList.length - 1}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  Từ tiếp theo ›
                </button>
                <button
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(3)
                  }}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  Sang Bước 3: Nghe - Viết ›
                </button>
              </>
            )}

            {pedagogicalStep === 3 && (
              <>
                <button
                  onClick={repeatCurrentClause}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  ↺ Đọc lại
                </button>
                <button
                  onClick={togglePause}
                  className="bg-[#F6D365] text-[#3B2F00] hover:bg-[#F6D365]/90 rounded-2xl px-6 py-3 text-base font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isPaused ? "▶ Tiếp tục" : "❚❚ Tạm dừng"}
                </button>
                <button
                  onClick={() => setIsTextHidden(prev => !prev)}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  {isTextHidden ? "Hiện chữ" : "Ẩn chữ"}
                </button>
                <button
                  onClick={skipToNextClause}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  Cụm tiếp ›
                </button>
                <button
                  onClick={() => {
                    stopPlayback()
                    setPedagogicalStep(4)
                  }}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  Sang Bước 4 ›
                </button>
              </>
            )}

            {pedagogicalStep === 4 && (
              <>
                <button
                  onClick={startStep4Proofread}
                  disabled={isPlaying}
                  className="bg-[#F6D365] text-[#16382F] hover:bg-[#F6D365]/90 rounded-2xl px-6 py-3 text-base font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isPlaying ? "Đang đọc soát lỗi..." : "▶ Đọc soát lỗi toàn bài"}
                </button>
                <button
                  onClick={togglePause}
                  disabled={!isPlaying}
                  className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all cursor-pointer"
                >
                  {isPaused ? "▶ Tiếp tục" : "❚❚ Tạm dừng"}
                </button>
                <button
                  onClick={handleOpenGrading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-3 text-base font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>🎯 Khóa Ground Truth & Mở Chấm Bài</span>
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
    </div>
  )
}
