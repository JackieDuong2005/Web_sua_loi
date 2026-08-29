"use client"

import type { JSX } from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle, Camera, Zap, Save, FileText, History,
  ChevronLeft, ChevronRight, X, Star, BookOpen
} from "lucide-react"

// Inline SVG illustrations — no external files needed
const StepIllustration = ({ stepId }: { stepId: string }) => {
  const illustrations: Record<string, JSX.Element> = {
    capture: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0f9ff" rx="12"/>
        <rect x="120" y="30" width="160" height="120" rx="8" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2"/>
        <rect x="135" y="45" width="130" height="90" rx="4" fill="white" stroke="#bae6fd" strokeWidth="1"/>
        <line x1="145" y1="65" x2="255" y2="65" stroke="#94a3b8" strokeWidth="1.5"/>
        <line x1="145" y1="78" x2="235" y2="78" stroke="#94a3b8" strokeWidth="1.5"/>
        <line x1="145" y1="91" x2="245" y2="91" stroke="#94a3b8" strokeWidth="1.5"/>
        <line x1="145" y1="104" x2="220" y2="104" stroke="#94a3b8" strokeWidth="1.5"/>
        <circle cx="200" cy="160" r="18" fill="#0ea5e9"/>
        <circle cx="200" cy="160" r="12" fill="white" opacity="0.3"/>
        <text x="200" y="165" textAnchor="middle" fontSize="14" fill="white">📷</text>
        <text x="200" y="192" textAnchor="middle" fontSize="11" fill="#0369a1" fontFamily="sans-serif">Chụp ảnh bài viết</text>
      </svg>
    ),
    ai: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0fdf4" rx="12"/>
        <rect x="30" y="50" width="130" height="100" rx="8" fill="white" stroke="#86efac" strokeWidth="2"/>
        <line x1="45" y1="75" x2="145" y2="75" stroke="#fca5a5" strokeWidth="2"/>
        <line x1="45" y1="90" x2="120" y2="90" stroke="#94a3b8" strokeWidth="1.5"/>
        <line x1="45" y1="105" x2="135" y2="105" stroke="#fca5a5" strokeWidth="2"/>
        <line x1="45" y1="120" x2="110" y2="120" stroke="#94a3b8" strokeWidth="1.5"/>
        <circle cx="200" cy="100" r="28" fill="#22c55e" opacity="0.15"/>
        <text x="200" y="107" textAnchor="middle" fontSize="26">⚡</text>
        <path d="M170 100 L228 100" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2" markerEnd="url(#arr)"/>
        <rect x="240" y="50" width="130" height="100" rx="8" fill="white" stroke="#86efac" strokeWidth="2"/>
        <rect x="255" y="68" width="100" height="16" rx="4" fill="#dcfce7"/>
        <text x="305" y="80" textAnchor="middle" fontSize="10" fill="#16a34a" fontFamily="sans-serif">8.5/10 ✓</text>
        <line x1="255" y1="97" x2="345" y2="97" stroke="#86efac" strokeWidth="1.5"/>
        <line x1="255" y1="110" x2="330" y2="110" stroke="#86efac" strokeWidth="1.5"/>
        <line x1="255" y1="123" x2="340" y2="123" stroke="#86efac" strokeWidth="1.5"/>
        <text x="200" y="185" textAnchor="middle" fontSize="11" fill="#15803d" fontFamily="sans-serif">AI phân tích &amp; chấm điểm tự động</text>
      </svg>
    ),
    result: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#fefce8" rx="12"/>
        <rect x="20" y="30" width="170" height="140" rx="8" fill="white" stroke="#fde68a" strokeWidth="2"/>
        <circle cx="75" cy="75" r="35" fill="#fef9c3" stroke="#fbbf24" strokeWidth="2"/>
        <text x="75" y="83" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#d97706" fontFamily="sans-serif">8.5</text>
        <rect x="35" y="120" width="140" height="8" rx="4" fill="#fde68a"/>
        <rect x="35" y="120" width="119" height="8" rx="4" fill="#f59e0b"/>
        <text x="105" y="145" textAnchor="middle" fontSize="10" fill="#92400e" fontFamily="sans-serif">Tốt 🌟</text>
        <rect x="210" y="30" width="170" height="140" rx="8" fill="white" stroke="#fde68a" strokeWidth="2"/>
        <text x="295" y="55" textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="sans-serif">Lỗi chính tả</text>
        <rect x="225" y="62" width="140" height="22" rx="4" fill="#fee2e2"/>
        <text x="285" y="77" textAnchor="middle" fontSize="10" fill="#dc2626" fontFamily="sans-serif">sai → đúng ✓</text>
        <rect x="225" y="90" width="140" height="22" rx="4" fill="#fee2e2"/>
        <text x="285" y="105" textAnchor="middle" fontSize="10" fill="#dc2626" fontFamily="sans-serif">lổi → lỗi ✓</text>
        <rect x="225" y="118" width="140" height="32" rx="4" fill="#dcfce7"/>
        <text x="295" y="132" textAnchor="middle" fontSize="9" fill="#16a34a" fontFamily="sans-serif">Nhận xét: Bài viết tốt,</text>
        <text x="295" y="144" textAnchor="middle" fontSize="9" fill="#16a34a" fontFamily="sans-serif">cần luyện thêm dấu!</text>
        <text x="200" y="185" textAnchor="middle" fontSize="11" fill="#92400e" fontFamily="sans-serif">Kết quả chi tiết theo 4 tiêu chí</text>
      </svg>
    ),
    save: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0fdf4" rx="12"/>
        <rect x="80" y="40" width="240" height="100" rx="8" fill="white" stroke="#86efac" strokeWidth="2"/>
        <text x="200" y="75" textAnchor="middle" fontSize="13" fill="#374151" fontFamily="sans-serif">Nguyễn Văn A — Lớp 3A</text>
        <text x="200" y="95" textAnchor="middle" fontSize="12" fill="#6b7280" fontFamily="sans-serif">Bài viết số 1 — 8.5/10</text>
        <rect x="130" y="108" width="140" height="24" rx="6" fill="#22c55e"/>
        <text x="200" y="124" textAnchor="middle" fontSize="12" fill="white" fontFamily="sans-serif">💾 Lưu vào Database</text>
        <circle cx="200" cy="160" r="16" fill="#dcfce7" stroke="#22c55e" strokeWidth="2"/>
        <text x="200" y="165" textAnchor="middle" fontSize="16">✓</text>
        <text x="200" y="190" textAnchor="middle" fontSize="11" fill="#15803d" fontFamily="sans-serif">Lưu thành công!</text>
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
        <text x="200" y="60" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#7c3aed" fontFamily="sans-serif">8</text>
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
        <text x="297" y="164" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#22c55e" fontFamily="sans-serif">9</text>
        <text x="200" y="192" textAnchor="middle" fontSize="11" fill="#7c3aed" fontFamily="sans-serif">Dashboard học sinh</text>
      </svg>
    ),
    history: (
      <svg viewBox="0 0 400 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#f0f9ff" rx="12"/>
        {[{s:8.5,t:"Bài viết số 3",d:"17/5",c:"#22c55e"},{s:7,t:"Bài viết số 2",d:"14/5",c:"#3b82f6"},{s:6,t:"Bài viết số 1",d:"10/5",c:"#f59e0b"}].map((g, i) => (
          <g key={i}>
            <rect x="20" y={20 + i * 58} width="360" height="48" rx="8" fill="white" stroke="#e0f2fe" strokeWidth="1.5"/>
            <circle cx="52" cy={44 + i * 58} r="16" fill={g.c} opacity="0.15"/>
            <text x="52" y={49 + i * 58} textAnchor="middle" fontSize="13" fontWeight="bold" fill={g.c} fontFamily="sans-serif">{g.s}</text>
            <text x="80" y={39 + i * 58} fontSize="11" fontWeight="bold" fill="#374151" fontFamily="sans-serif">{g.t}</text>
            <text x="80" y={55 + i * 58} fontSize="10" fill="#6b7280" fontFamily="sans-serif">Ngày: {g.d}/2026</text>
            <text x="350" y={49 + i * 58} textAnchor="end" fontSize="10" fill="#3b82f6" fontFamily="sans-serif">Xem →</text>
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
    title: "Chụp ảnh hoặc tải bài viết",
    description: "Chụp ảnh bài viết tay của học sinh bằng camera hoặc tải ảnh từ thiết bị. Đảm bảo ảnh rõ nét, đủ ánh sáng và chữ viết nằm gọn trong khung hình.",
    illustrationId: "capture",
    icon: <Camera className="w-5 h-5" />,
    tip: "💡 Chụp từ trên xuống, vuông góc với giấy để AI nhận dạng chính xác hơn.",
  },
  {
    title: "AI phân tích và chấm điểm",
    description: "Nhấn nút \"Chấm điểm với Gemini AI\". Hệ thống tự động nhận dạng chữ viết, phát hiện lỗi chính tả và chấm điểm theo 4 tiêu chí: Chính tả, Hình thức, Nội dung và Sáng tạo.",
    illustrationId: "ai",
    icon: <Zap className="w-5 h-5" />,
    tip: "💡 Bạn cũng có thể nhập văn bản trực tiếp ở tab \"Nhập text\" nếu không có ảnh.",
  },
  {
    title: "Xem kết quả chi tiết",
    description: "Kết quả hiển thị điểm tổng, bảng điểm chi tiết từng tiêu chí, danh sách lỗi (gạch đỏ → sửa xanh), nhận xét của AI và văn bản đã sửa hoàn chỉnh.",
    illustrationId: "result",
    icon: <BookOpen className="w-5 h-5" />,
    tip: "💡 Mỗi lỗi được phân loại: Phụ âm đầu, Vần, Dấu thanh, Viết hoa, Dấu câu...",
  },
  {
    title: "Lưu kết quả vào hệ thống",
    description: "Điền tên học sinh, chọn lớp và tên bài, sau đó nhấn \"Lưu\" để lưu vào cơ sở dữ liệu. Điểm sẽ hiển thị trong Báo cáo lớp và tài khoản học sinh.",
    illustrationId: "save",
    icon: <Save className="w-5 h-5" />,
    tip: "💡 Hệ thống gợi ý tên học sinh từ danh sách lớp bạn quản lý.",
  },
  {
    title: "Theo dõi báo cáo lớp",
    description: "Vào mục \"Báo cáo lớp\" để xem thống kê điểm số theo lớp, theo học sinh và theo thời gian. Nắm bắt tình hình học tập tổng thể của cả lớp.",
    illustrationId: "report",
    icon: <FileText className="w-5 h-5" />,
    tip: "💡 Báo cáo giúp giáo viên phát hiện học sinh cần hỗ trợ thêm.",
  },
]

const studentGuideSteps: GuideStep[] = [
  {
    title: "Xem điểm số của con",
    description: "Sau khi đăng nhập, con sẽ thấy điểm bài viết gần nhất, điểm trung bình và số bài đã nộp. Hệ thống cho con biết mức: Xuất sắc, Tốt, Khá hay Cần cố gắng.",
    illustrationId: "student_view",
    icon: <Star className="w-5 h-5" />,
    tip: "🌟 Mỗi bài viết được cô giáo chấm xong sẽ tự động hiện ở đây!",
  },
  {
    title: "Xem nhận xét của AI",
    description: "Ở mỗi bài, con xem được nhận xét chi tiết: lỗi cần sửa, điểm mạnh và lời khuyên để viết tốt hơn. Hãy đọc kỹ nhận xét để cải thiện nhé!",
    illustrationId: "ai",
    icon: <BookOpen className="w-5 h-5" />,
    tip: "📝 Đọc nhận xét kỹ sẽ giúp con không mắc lại lỗi cũ!",
  },
  {
    title: "Xem lịch sử điểm",
    description: "Vào mục \"Lịch sử điểm\" trên menu bên trái để xem tất cả bài viết đã được chấm. Con có thể theo dõi sự tiến bộ của mình qua từng bài.",
    illustrationId: "history",
    icon: <History className="w-5 h-5" />,
    tip: "🎯 Cố gắng mỗi bài sau đạt điểm cao hơn bài trước nhé!",
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
