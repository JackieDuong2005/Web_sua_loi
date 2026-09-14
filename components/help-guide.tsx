"use client"

import type { JSX } from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle, Camera, Zap, Save, FileText, History,
  ChevronLeft, ChevronRight, X, Star, BookOpen, Sliders
} from "lucide-react"

// Inline SVG illustrations — no external files needed
const StepIllustration = ({ stepId }: { stepId: string }) => {  const illustrations: Record<string, JSX.Element> = {
    mode: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f5f3ff" rx="12"/>
        <rect x="25" y="30" width="165" height="135" rx="8" fill="white" stroke="#c4b5fd" strokeWidth="2"/>
        <rect x="40" y="45" width="60" height="20" rx="4" fill="#ede9fe"/>
        <text x="70" y="59" textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="bold" fontFamily="sans-serif">🎯 CHÍNH TẢ</text>
        <text x="40" y="85" fontSize="11" fontWeight="bold" fill="#1e293b" fontFamily="sans-serif">Chấm theo bài đọc mẫu</text>
        <text x="40" y="103" fontSize="10" fill="#64748b" fontFamily="sans-serif">• Có sẵn bài đọc SGK</text>
        <text x="40" y="119" fontSize="10" fill="#64748b" fontFamily="sans-serif">• Đối chiếu chuẩn xác từng từ</text>
        <rect x="40" y="132" width="135" height="22" rx="5" fill="#7c3aed"/>
        <text x="107" y="147" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" fontFamily="sans-serif">Kho SGK Tuần 1–35</text>

        <rect x="210" y="30" width="165" height="135" rx="8" fill="white" stroke="#e9d5ff" strokeWidth="1.5"/>
        <rect x="225" y="45" width="80" height="20" rx="4" fill="#fdf4ff"/>
        <text x="265" y="59" textAnchor="middle" fontSize="10" fill="#c026d3" fontWeight="bold" fontFamily="sans-serif">✍️ TẬP LÀM VĂN</text>
        <text x="225" y="85" fontSize="11" fontWeight="bold" fill="#1e293b" fontFamily="sans-serif">Chấm bài viết tự do</text>
        <text x="225" y="103" fontSize="10" fill="#64748b" fontFamily="sans-serif">• Không cần bài mẫu</text>
        <text x="225" y="119" fontSize="10" fill="#64748b" fontFamily="sans-serif">• Gợi ý lời nhận xét sư phạm</text>
        <rect x="225" y="132" width="135" height="22" rx="5" fill="#f3e8ff" stroke="#d8b4fe" strokeWidth="1"/>
        <text x="292" y="147" textAnchor="middle" fontSize="10" fill="#9333ea" fontWeight="bold" fontFamily="sans-serif">Gợi ý lời nhận xét</text>
        <text x="200" y="186" textAnchor="middle" fontSize="11" fill="#6d28d9" fontFamily="sans-serif">Hỗ trợ đầy đủ Chính tả &amp; Tập làm văn tiểu học</text>
      </svg>
    ),
    capture: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0fdf4" rx="12"/>
        <rect x="25" y="35" width="150" height="110" rx="8" fill="white" stroke="#94a3b8" strokeWidth="1.5"/>
        <line x1="40" y1="58" x2="150" y2="58" stroke="#cbd5e1" strokeWidth="2"/>
        <line x1="40" y1="73" x2="130" y2="73" stroke="#cbd5e1" strokeWidth="2"/>
        <line x1="40" y1="88" x2="145" y2="88" stroke="#cbd5e1" strokeWidth="2"/>
        <line x1="40" y1="103" x2="120" y2="103" stroke="#cbd5e1" strokeWidth="2"/>
        <text x="100" y="130" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif">Ảnh chụp ban đầu</text>

        <path d="M190 90 L212 90" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2"/>
        <circle cx="201" cy="90" r="13" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5"/>
        <text x="201" y="94" textAnchor="middle" fontSize="11">✨</text>

        <rect x="225" y="35" width="150" height="110" rx="8" fill="white" stroke="#10b981" strokeWidth="2"/>
        <line x1="240" y1="58" x2="350" y2="58" stroke="#334155" strokeWidth="2"/>
        <line x1="240" y1="73" x2="330" y2="73" stroke="#334155" strokeWidth="2"/>
        <line x1="240" y1="88" x2="345" y2="88" stroke="#334155" strokeWidth="2"/>
        <line x1="240" y1="103" x2="320" y2="103" stroke="#334155" strokeWidth="2"/>
        <rect x="235" y="122" width="130" height="18" rx="4" fill="#d1fae5"/>
        <text x="300" y="135" textAnchor="middle" fontSize="8.5" fill="#065f46" fontWeight="bold" fontFamily="sans-serif">✓ Tự động xoay thẳng &amp; làm rõ nét</text>
        <text x="200" y="185" textAnchor="middle" fontSize="11" fill="#047857" fontFamily="sans-serif">Hệ thống tự động làm rõ nét chữ viết tay của học sinh</text>
      </svg>
    ),
    ai: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0f9ff" rx="12"/>
        <rect x="25" y="40" width="105" height="100" rx="8" fill="white" stroke="#38bdf8" strokeWidth="1.5"/>
        <text x="77" y="65" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0284c7" fontFamily="sans-serif">1. Đọc chữ</text>
        <text x="77" y="85" textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="sans-serif">Nhận diện chữ viết</text>
        <text x="77" y="100" textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="sans-serif">trên trang vở ô ly</text>
        <rect x="35" y="112" width="85" height="16" rx="3" fill="#e0f2fe"/>
        <text x="77" y="124" textAnchor="middle" fontSize="8" fill="#0369a1" fontWeight="bold" fontFamily="sans-serif">Nhanh &amp; chính xác</text>

        <path d="M135 90 L152 90" stroke="#0ea5e9" strokeWidth="2"/>
        <rect x="155" y="40" width="105" height="100" rx="8" fill="white" stroke="#6366f1" strokeWidth="1.5"/>
        <text x="207" y="65" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4f46e5" fontFamily="sans-serif">2. Tìm lỗi sai</text>
        <text x="207" y="85" textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="sans-serif">Phụ âm, vần,</text>
        <text x="207" y="100" textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="sans-serif">dấu thanh, viết hoa</text>
        <rect x="165" y="112" width="85" height="16" rx="3" fill="#ede9fe"/>
        <text x="207" y="124" textAnchor="middle" fontSize="8" fill="#4338ca" fontWeight="bold" fontFamily="sans-serif">Chuẩn tiếng Việt</text>

        <path d="M265 90 L282 90" stroke="#6366f1" strokeWidth="2"/>
        <rect x="285" y="40" width="95" height="100" rx="8" fill="white" stroke="#10b981" strokeWidth="1.5"/>
        <text x="332" y="65" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#059669" fontFamily="sans-serif">3. Gợi ý lời phê</text>
        <text x="332" y="85" textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="sans-serif">Nhận xét mẫu</text>
        <text x="332" y="100" textAnchor="middle" fontSize="8.5" fill="#64748b" fontFamily="sans-serif">ấm áp, khích lệ</text>
        <rect x="293" y="112" width="80" height="16" rx="3" fill="#d1fae5"/>
        <text x="333" y="124" textAnchor="middle" fontSize="8" fill="#047857" fontWeight="bold" fontFamily="sans-serif">Động viên các con</text>

        <text x="200" y="185" textAnchor="middle" fontSize="11" fill="#0369a1" fontFamily="sans-serif">Hệ thống tự động đọc bài, tìm lỗi và gợi ý nhận xét</text>
      </svg>
    ),
    result: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#fefce8" rx="12"/>
        <rect x="20" y="25" width="170" height="145" rx="8" fill="white" stroke="#fde68a" strokeWidth="2"/>
        <circle cx="65" cy="65" r="28" fill="#fef9c3" stroke="#fbbf24" strokeWidth="2"/>
        <text x="65" y="73" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#d97706" fontFamily="sans-serif">8.5</text>
        <text x="135" y="58" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#15803d" fontFamily="sans-serif">Tốt 🌟</text>
        <text x="135" y="75" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="sans-serif">Thang điểm 10</text>
        <line x1="35" y1="105" x2="175" y2="105" stroke="#e2e8f0" strokeWidth="1"/>
        <text x="35" y="122" fontSize="9" fill="#475569" fontFamily="sans-serif">✍️ Chữ viết &amp; Trình bày:</text>
        <circle cx="150" cy="120" r="4" fill="#3b82f6"/>
        <line x1="100" y1="120" x2="165" y2="120" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
        <text x="35" y="144" fontSize="9" fill="#2563eb" fontWeight="bold" fontFamily="sans-serif">💡 Kéo thanh trượt để chỉnh điểm</text>

        <rect x="205" y="25" width="175" height="145" rx="8" fill="white" stroke="#fde68a" strokeWidth="2"/>
        <rect x="215" y="38" width="155" height="34" rx="4" fill="#fee2e2"/>
        <text x="292" y="52" textAnchor="middle" fontSize="9" fill="#dc2626" fontWeight="bold" fontFamily="sans-serif">sai → đúng · lổi → lỗi</text>
        <text x="292" y="64" textAnchor="middle" fontSize="8" fill="#991b1b" fontFamily="sans-serif">Chỗ sai gạch đỏ, chữ đúng màu xanh</text>

        <rect x="215" y="78" width="155" height="52" rx="4" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1"/>
        <text x="225" y="93" fontSize="8.5" fill="#047857" fontWeight="bold" fontFamily="sans-serif">Lời nhận xét gợi ý:</text>
        <text x="225" y="107" fontSize="8" fill="#065f46" fontFamily="sans-serif">"Bài viết tốt, con chú ý dấu hỏi ngã nhé!"</text>
        <rect x="225" y="136" width="85" height="16" rx="3" fill="#d1fae5"/>
        <text x="267" y="148" textAnchor="middle" fontSize="8" fill="#065f46" fontFamily="sans-serif">Gợi ý mẫu</text>
        <text x="200" y="188" textAnchor="middle" fontSize="11" fill="#92400e" fontFamily="sans-serif">Cô có thể chỉnh lại điểm và lời nhận xét theo ý mình</text>
      </svg>
    ),
    save: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0fdf4" rx="12"/>
        <rect x="80" y="35" width="240" height="105" rx="8" fill="white" stroke="#86efac" strokeWidth="2"/>
        <text x="200" y="65" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#374151" fontFamily="sans-serif">Nguyễn Văn A — Lớp 3A</text>
        <text x="200" y="85" textAnchor="middle" fontSize="11" fill="#6b7280" fontFamily="sans-serif">Chính tả: Ai có lỗi — 8.5/10</text>
        <rect x="120" y="98" width="160" height="26" rx="6" fill="#16a34a"/>
        <text x="200" y="115" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold" fontFamily="sans-serif">💾 Lưu vào sổ điểm</text>
        <circle cx="200" cy="158" r="14" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <text x="200" y="163" textAnchor="middle" fontSize="14">✓</text>
        <text x="200" y="188" textAnchor="middle" fontSize="11" fill="#15803d" fontFamily="sans-serif">Lưu điểm vào sổ lớp để tiện theo dõi kết quả</text>
      </svg>
    ),
    report: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f8fafc" rx="12"/>
        <rect x="20" y="20" width="360" height="150" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="2"/>
        <text x="40" y="45" fontSize="12" fill="#374151" fontFamily="sans-serif">Báo cáo lớp 3A</text>
        {[["Nguyễn A", 85, "#22c55e"], ["Trần B", 70, "#3b82f6"], ["Lê C", 55, "#f59e0b"], ["Phạm D", 90, "#22c55e"]].map(([name, val, color], i) => (
          <g key={i}>
            <text x="40" y={75 + i * 28} fontSize="10" fill="#6b7280" fontFamily="sans-serif">{name as string}</text>
            <rect x="110" y={62 + i * 28} width={220} height="14" rx="4" fill="#f1f5f9"/>
            <rect x="110" y={62 + i * 28} width={(val as number) * 2.2} height="14" rx="4" fill={color as string} opacity="0.8"/>
            <text x={116 + (val as number) * 2.2} y={73 + i * 28} fontSize="9" fill="#374151" fontFamily="sans-serif">{val as number}/10</text>
          </g>
        ))}
        <text x="200" y="185" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="sans-serif">Thống kê điểm toàn lớp</text>
      </svg>
    ),
    student_view: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#fdf4ff" rx="12"/>
        <circle cx="200" cy="70" r="45" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2"/>
        <text x="200" y="60" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#7c3aed" fontFamily="sans-serif">8.5</text>
        <text x="200" y="78" textAnchor="middle" fontSize="11" fill="#9333ea" fontFamily="sans-serif">Tốt 🌟</text>
        <text x="200" y="95" textAnchor="middle" fontSize="10" fill="#a855f7" fontFamily="sans-serif">Bài viết gần nhất</text>
        <rect x="60" y="128" width="85" height="42" rx="8" fill="white" stroke="#e9d5ff" strokeWidth="1.5"/>
        <text x="102" y="148" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="sans-serif">TB</text>
        <text x="102" y="164" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#7c3aed" fontFamily="sans-serif">7.5</text>
        <rect x="157" y="128" width="85" height="42" rx="8" fill="white" stroke="#e9d5ff" strokeWidth="1.5"/>
        <text x="200" y="148" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="sans-serif">Bài nộp</text>
        <text x="200" y="164" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#7c3aed" fontFamily="sans-serif">5</text>
        <rect x="254" y="128" width="85" height="42" rx="8" fill="white" stroke="#e9d5ff" strokeWidth="1.5"/>
        <text x="297" y="148" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="sans-serif">Cao nhất</text>
        <text x="297" y="164" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#22c55e" fontFamily="sans-serif">9.0</text>
        <text x="200" y="192" textAnchor="middle" fontSize="11" fill="#7c3aed" fontFamily="sans-serif">Dashboard học sinh</text>
      </svg>
    ),
    history: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0f9ff" rx="12"/>
        {[{s:8.5,t:"Chính tả: Ai có lỗi",d:"17/5",c:"#22c55e"},{s:7.5,t:"Tập làm văn: Cây phượng",d:"14/5",c:"#3b82f6"},{s:6.5,t:"Chính tả: Mùa thu",d:"10/5",c:"#f59e0b"}].map((g, i) => (
          <g key={i}>
            <rect x="20" y={20 + i * 58} width="360" height="48" rx="8" fill="white" stroke="#e0f2fe" strokeWidth="1.5"/>
            <circle cx="52" cy={44 + i * 58} r="16" fill={g.c} opacity="0.15"/>
            <text x="52" y="49 + i * 58" textAnchor="middle" fontSize="13" fontWeight="bold" fill={g.c} fontFamily="sans-serif">{g.s}</text>
            <text x="80" y="39 + i * 58" fontSize="11" fontWeight="bold" fill="#374151" fontFamily="sans-serif">{g.t}</text>
            <text x="80" y="55 + i * 58" fontSize="10" fill="#6b7280" fontFamily="sans-serif">Ngày: {g.d}/2026</text>
            <text x="350" y="49 + i * 58" textAnchor="end" fontSize="10" fill="#3b82f6" fontFamily="sans-serif">Xem →</text>
          </g>
        ))}
        <text x="200" y="196" textAnchor="middle" fontSize="11" fill="#0369a1" fontFamily="sans-serif">Lịch sử tất cả bài đã chấm</text>
      </svg>
    ),
  }
  return (
    <div className="w-full h-48 md:h-56">
      {illustrations[stepId] ?? <div className="w-full h-full bg-muted/30 rounded-xl flex items-center justify-center text-muted-foreground">Minh họa</div>}
    </div>
  )
}

interface GuideStep {
  title: string
  description: string
  illustrationId: string
  icon: React.ReactNode
  tip?: string
}

const teacherGuideSteps: GuideStep[] = [
  {
    title: "1. Chọn môn học",
    description: "Chọn 'Chính tả' (chấm theo bài đọc mẫu trong sách) hoặc 'Tập làm văn' (chấm bài viết tự do của học sinh).",
    illustrationId: "mode",
    icon: <BookOpen className="w-5 h-5" />,
    tip: "💡 Với bài chính tả, cô chỉ cần bấm 'Chọn bài trong SGK' để hệ thống so sánh từng chữ với bài mẫu.",
  },
  {
    title: "2. Chụp hoặc tải ảnh trang vở",
    description: "Chụp ảnh trang vở của học sinh hoặc chọn ảnh có sẵn. Hệ thống sẽ tự động xoay thẳng và làm rõ nét chữ để đọc bài chuẩn xác nhất.",
    illustrationId: "capture",
    icon: <Camera className="w-5 h-5" />,
    tip: "💡 Nên chụp đủ sáng, chụp thẳng góc để trang vở rõ ràng nhất.",
  },
  {
    title: "3. Bấm Chấm bài ngay",
    description: "Chỉ cần bấm nút 'Chấm bài ngay', hệ thống sẽ tự động đọc chữ viết tay, gạch chân các từ viết sai và soạn sẵn lời nhận xét khích lệ học sinh.",
    illustrationId: "ai",
    icon: <Zap className="w-5 h-5" />,
    tip: "💡 Hệ thống chỉ mất vài giây để chấm xong toàn bộ bài viết.",
  },
  {
    title: "4. Xem lỗi & Điều chỉnh điểm",
    description: "Màn hình hiển thị rõ từ viết sai (gạch đỏ) và từ đúng (màu xanh). Cô có thể kéo thanh trượt để chỉnh lại điểm chữ viết hay sửa lời nhận xét theo ý mình.",
    illustrationId: "result",
    icon: <Sliders className="w-5 h-5" />,
    tip: "💡 Cô luôn là người quyết định điểm số và lời phê cuối cùng cho học sinh.",
  },
  {
    title: "5. Lưu vào sổ điểm",
    description: "Nhập tên học sinh rồi bấm 'Lưu bài'. Điểm số sẽ được ghi vào sổ điểm của lớp để cô và phụ huynh cùng theo dõi sự tiến bộ của con.",
    illustrationId: "save",
    icon: <Save className="w-5 h-5" />,
    tip: "💡 Có thể bấm vào mục 'Lịch sử chấm' hoặc 'Báo cáo lớp' để xem lại bài của tất cả học sinh.",
  },
]

const studentGuideSteps: GuideStep[] = [
  {
    title: "Xem điểm số & xếp loại bài viết",
    description: "Sau khi đăng nhập, con sẽ thấy điểm bài viết gần nhất, điểm trung bình và biểu đồ tiến bộ. Hệ thống xếp loại rõ ràng: Xuất sắc, Tốt, Hoàn thành hay Cần cố gắng.",
    illustrationId: "student_view",
    icon: <Star className="w-5 h-5" />,
    tip: "🌟 Mỗi bài viết được cô giáo chấm xong sẽ tự động cập nhật ngay trên trang của con!",
  },
  {
    title: "Xem lỗi chính tả & Lời phê của cô",
    description: "Ở từng bài làm, con có thể đối chiếu chữ viết sai và chữ viết đúng (được sửa chi tiết theo quy tắc chính tả) cùng lời nhận xét sư phạm ấm áp, khích lệ từ thầy cô và AI.",
    illustrationId: "result",
    icon: <BookOpen className="w-5 h-5" />,
    tip: "📝 Đọc kỹ lời phê và luyện viết lại các từ khó để bài sau viết đẹp và đúng hơn nhé!",
  },
  {
    title: "Theo dõi hành trình tiến bộ",
    description: "Vào mục 'Lịch sử điểm' để xem lại toàn bộ các bài viết đã nộp theo thời gian, theo dõi số lỗi chính tả giảm dần qua từng tuần học.",
    illustrationId: "history",
    icon: <History className="w-5 h-5" />,
    tip: "🎯 Cố gắng rèn chữ và giữ gìn vở sạch chữ đẹp qua từng bài viết con nhé!",
  },
]

interface HelpGuideProps {
  role: "teacher" | "student"
}

export function HelpGuideButton({ role }: HelpGuideProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const steps = role === "teacher" ? teacherGuideSteps : studentGuideSteps

  const handleOpen = () => { setCurrentStep(0); setOpen(true) }
  const nextStep = () => { if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1) }
  const prevStep = () => { if (currentStep > 0) setCurrentStep(currentStep - 1) }
  const step = steps[currentStep]

  return (
    <>
      <Button
        variant="ghost" size="icon" onClick={handleOpen}
        className="rounded-full w-9 h-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
        title="Hướng dẫn sử dụng" id="help-guide-button"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl p-0 overflow-hidden gap-0 border-border/50">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Hướng dẫn sử dụng</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {role === "teacher" ? "Dành cho giáo viên" : "Dành cho học sinh"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs px-2.5 py-1 bg-primary/5 text-primary border-primary/20">
                {currentStep + 1} / {steps.length}
              </Badge>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            <div className="flex items-center justify-center gap-2 mb-5">
              {steps.map((_, i) => (
                <button key={i} onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-2 bg-primary/40" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                {step.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bước {currentStep + 1}</p>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30 mb-4">
              <StepIllustration stepId={step.illustrationId} />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>

            {step.tip && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30">
                <p className="text-sm text-amber-800 dark:text-amber-200">{step.tip}</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevStep} disabled={currentStep === 0} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" />Trước
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button size="sm" onClick={() => setOpen(false)} className="gap-1.5 px-6">
                Hoàn tất <X className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={nextStep} className="gap-1.5 px-6">
                Tiếp theo <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
