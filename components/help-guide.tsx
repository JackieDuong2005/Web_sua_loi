"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle, Camera, Zap, Save, FileText, History,
  ChevronLeft, ChevronRight, X, Star, BookOpen
} from "lucide-react"

interface GuideStep {
  title: string
  description: string
  image: string
  icon: React.ReactNode
  tip?: string
}

const teacherGuideSteps: GuideStep[] = [
  {
    title: "Chụp ảnh hoặc tải bài viết",
    description: "Bước đầu tiên, hãy chụp ảnh bài viết tay của học sinh bằng camera hoặc tải ảnh từ thiết bị. Đảm bảo ảnh rõ nét, đủ ánh sáng và chữ viết nằm gọn trong khung hình.",
    image: "/guide/capture_image.png",
    icon: <Camera className="w-5 h-5" />,
    tip: "💡 Mẹo: Chụp từ trên xuống, vuông góc với giấy để AI nhận dạng chính xác hơn."
  },
  {
    title: "AI phân tích và chấm điểm",
    description: "Sau khi tải ảnh, nhấn nút \"Chấm điểm với Gemini AI\". Hệ thống sẽ tự động nhận dạng chữ viết, phát hiện lỗi chính tả, ngữ pháp và chấm điểm theo 4 tiêu chí: Chính tả, Hình thức, Nội dung và Sáng tạo.",
    image: "/guide/ai_analysis.png",
    icon: <Zap className="w-5 h-5" />,
    tip: "💡 Bạn cũng có thể nhập văn bản trực tiếp ở tab \"Nhập text\" nếu không có ảnh."
  },
  {
    title: "Xem kết quả chi tiết",
    description: "Kết quả hiển thị điểm tổng, bảng điểm chi tiết từng tiêu chí, danh sách lỗi được đánh dấu (gạch đỏ → sửa xanh), nhận xét tổng hợp của AI và văn bản đã sửa hoàn chỉnh.",
    image: "/guide/teacher_grading.png",
    icon: <BookOpen className="w-5 h-5" />,
    tip: "💡 Mỗi lỗi được phân loại: Phụ âm đầu, Vần, Dấu thanh, Viết hoa, Dấu câu..."
  },
  {
    title: "Lưu kết quả vào hệ thống",
    description: "Điền tên học sinh, chọn lớp và tên bài, sau đó nhấn \"Lưu\" để lưu kết quả vào cơ sở dữ liệu. Điểm sẽ được hiển thị trong phần Báo cáo lớp và tài khoản học sinh.",
    image: "/guide/save_results.png",
    icon: <Save className="w-5 h-5" />,
    tip: "💡 Hệ thống sẽ gợi ý tên học sinh từ danh sách lớp bạn quản lý."
  },
  {
    title: "Theo dõi báo cáo lớp",
    description: "Vào mục \"Báo cáo lớp\" trên menu để xem thống kê điểm số theo lớp, theo học sinh, và theo thời gian. Bạn có thể nắm bắt tình hình học tập tổng thể của cả lớp.",
    image: "/guide/student_history.png",
    icon: <FileText className="w-5 h-5" />,
    tip: "💡 Báo cáo giúp giáo viên phát hiện học sinh cần hỗ trợ thêm."
  },
]

const studentGuideSteps: GuideStep[] = [
  {
    title: "Xem điểm số của con",
    description: "Sau khi đăng nhập, con sẽ thấy điểm bài viết gần nhất, điểm trung bình và số bài đã nộp. Hệ thống sẽ cho con biết con đang ở mức nào: Xuất sắc, Khá, Đạt hay Cần cố gắng.",
    image: "/guide/student_view.png",
    icon: <Star className="w-5 h-5" />,
    tip: "🌟 Mỗi bài viết được cô giáo chấm xong sẽ tự động hiện ở đây!"
  },
  {
    title: "Xem nhận xét của AI",
    description: "Ở mỗi bài, con có thể xem nhận xét chi tiết: những lỗi cần sửa, điểm mạnh của bài viết và lời khuyên để viết tốt hơn. Hãy đọc kỹ nhận xét để cải thiện nhé!",
    image: "/guide/ai_analysis.png",
    icon: <BookOpen className="w-5 h-5" />,
    tip: "📝 Đọc nhận xét kỹ sẽ giúp con không mắc lại lỗi cũ!"
  },
  {
    title: "Xem lịch sử điểm",
    description: "Vào mục \"Lịch sử điểm\" trên menu bên trái để xem tất cả bài viết đã được chấm. Con có thể theo dõi sự tiến bộ của mình qua từng bài.",
    image: "/guide/student_history.png",
    icon: <History className="w-5 h-5" />,
    tip: "🎯 Cố gắng mỗi bài sau đạt điểm cao hơn bài trước nhé!"
  },
]

interface HelpGuideProps {
  role: "teacher" | "student"
}

export function HelpGuideButton({ role }: HelpGuideProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = role === "teacher" ? teacherGuideSteps : studentGuideSteps

  const handleOpen = () => {
    setCurrentStep(0)
    setOpen(true)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const step = steps[currentStep]

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="rounded-full w-9 h-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
        title="Hướng dẫn sử dụng"
        id="help-guide-button"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl p-0 overflow-hidden gap-0 border-border/50">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    Hướng dẫn sử dụng
                  </DialogTitle>
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

          {/* Content */}
          <div className="px-6 py-5">
            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-8 bg-primary"
                      : i < currentStep
                      ? "w-2 bg-primary/40"
                      : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>

            {/* Step icon + title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                {step.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Bước {currentStep + 1}
                </p>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
              </div>
            </div>

            {/* Image */}
            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30 mb-4">
              <img
                src={step.image}
                alt={step.title}
                className="w-full h-48 md:h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {step.description}
            </p>

            {/* Tip */}
            {step.tip && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30">
                <p className="text-sm text-amber-800 dark:text-amber-200">{step.tip}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button size="sm" onClick={() => setOpen(false)} className="gap-1.5 px-6">
                Hoàn tất
                <X className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={nextStep} className="gap-1.5 px-6">
                Tiếp theo
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
