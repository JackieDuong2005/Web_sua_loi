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
  Sun, Moon, Copy, Scissors, ExternalLink, FastForward,
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

  const speakClause = (clause: string, sessionToken: number): Promise<boolean> => {
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
      const rateStr = `${percentDiff >= 0 ? "+" : ""}${percentDiff}%`

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

  const startPlayback = async () => {
    if (!passageText.trim()) return

    stopPlayback()

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
    setShowProjector(true) // Bật giao diện Bảng Xanh toàn màn hình

    const sessionToken = playbackIdRef.current
    const maxRepeat = parseInt(repeatCount, 10) || 2

    for (let i = 0; i < preparedClauses.length; i++) {
      if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

      setCurrentClauseIndex(i)

      for (let r = 1; r <= maxRepeat; r++) {
        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        while (isPausedRef.current && isPlayingRef.current && playbackIdRef.current === sessionToken) {
          await new Promise(res => setTimeout(res, 200))
        }

        setCurrentRepeat(r)
        await speakClause(preparedClauses[i], sessionToken)

        if (playbackIdRef.current !== sessionToken || !isPlayingRef.current) break

        // Tính toán thời gian nghỉ viết
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
      <footer className="fixed left-0 right-0 bottom-0 z-40 bg-card/95 border-t border-border px-5 py-3 flex items-center justify-between gap-3 backdrop-blur-md shadow-lg flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            onClick={startPlayback}
            className="h-11 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide shadow-xs gap-2 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Bắt đầu đọc cho cả lớp</span>
          </Button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Âm thanh {previewClauseList.length}/{previewClauseList.length} cụm đã sẵn sàng</span>
          </div>
        </div>

        {/* Animated Waveform Visualizer */}
        <div className="hidden md:flex items-end gap-1 h-6 min-w-[140px] px-2 opacity-80">
          {Array.from({ length: 32 }).map((_, idx) => {
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

        <div>
          <Button
            onClick={handleOpenGrading}
            variant="outline"
            className="h-10 px-4 rounded-xl text-xs font-semibold border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
          >
            🎯 Chấm bài theo phiên này
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
          <div className="flex items-center justify-between pb-4 border-b border-[#F4F1E8]/20 gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <span className="text-[#F6D365] font-extrabold">{formatClassName(selectedClass)}</span>
              <span>·</span>
              <span className="truncate max-w-[300px]">{title || "Bài đọc chính tả"}</span>
            </div>

            <div className="text-sm font-mono text-[#F6D365] font-bold">
              Cụm {currentClauseIndex + 1}/{Math.max(1, clauses.length || previewClauseList.length)} · Lần {currentRepeat}/{repeatCount}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowProjector(false)
              }}
              className="rounded-full border-[#F4F1E8]/40 text-[#F4F1E8] hover:bg-[#F4F1E8]/10 h-8 text-xs font-semibold"
            >
              Thoát trình chiếu (Esc)
            </Button>
          </div>

          {/* Central Stage */}
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-6">
            
            {/* Nhắc nhở trạng thái bằng phấn vàng */}
            <div className="text-sm md:text-base font-extrabold tracking-widest text-[#F6D365] uppercase animate-pulse">
              {isSpeakingNow ? "🔊 ĐANG ĐỌC · CÁC EM LẮNG NGHE" : countdown > 0 ? "✍️ CÁC EM VIẾT BÀI" : "⏳ CHUẨN BỊ..."}
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
                <circle
                  cx="70"
                  cy="70"
                  r="61"
                  fill="none"
                  stroke="#F4F1E82E"
                  strokeWidth="10"
                />
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
            <div className="flex items-center gap-2 pt-2">
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

          {/* Bottom Presenter Controls Bar */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#F4F1E8]/20 flex-wrap">
            <button
              onClick={repeatCurrentClause}
              className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all"
            >
              ↺ Đọc lại
            </button>
            <button
              onClick={togglePause}
              className="bg-[#F6D365] text-[#3B2F00] hover:bg-[#F6D365]/90 rounded-2xl px-6 py-3 text-base font-extrabold shadow-md transition-all"
            >
              {isPaused ? "▶ Tiếp tục" : "❚❚ Tạm dừng"}
            </button>
            <button
              onClick={() => setIsTextHidden(prev => !prev)}
              className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all"
            >
              {isTextHidden ? "Hiện chữ" : "Ẩn chữ"}
            </button>
            <button
              onClick={skipToNextClause}
              className="bg-[#F4F1E8]/15 hover:bg-[#F4F1E8]/25 text-[#F4F1E8] rounded-2xl px-5 py-3 text-base font-bold transition-all"
            >
              Cụm tiếp ›
            </button>
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
