export type UserRole = "teacher" | "student" | "admin"
export type SubmissionStatus = "pending" | "processing" | "graded" | "error"
export type ErrorTypeCode = "am_dau" | "van" | "thanh" | "viet_hoa" | "dau_cau"

export interface User {
  id: number; username: string; full_name: string; role: UserRole
  class_id?: number; is_active: boolean; created_at: string
}

export interface ClassInfo {
  id: number; name: string; grade_level: number; teacher_id: number
  school_year: string; teacher_name?: string; student_count?: number; avg_score?: number
}

export interface Assignment {
  id: number; title: string; template_text: string; class_id: number
  teacher_id: number; subject: string; max_score: number; deadline?: string
  instructions?: string; is_active: boolean; created_at: string
  class_name?: string; submission_count?: number; graded_count?: number
}

export interface SpellingError {
  position: number; original: string; expected: string
  error_type: ErrorTypeCode; error_name: string; deduction: number
  is_duplicate: boolean; context?: string
}

export interface ErrorCount {
  total: number; unique: number; am_dau: number; van: number
  thanh: number; viet_hoa: number; dau_cau: number
}

export interface Grade {
  id: number; submission_id: number; student_id: number; assignment_id: number
  ai_recognized_text?: string; ai_errors_json?: SpellingError[]
  ai_score?: number; ai_comment?: string
  final_score: number; teacher_comment?: string; is_ai_modified: boolean
  gemini_model: string; processing_time_ms?: number; token_count?: number
  graded_at: string; student_name?: string; assignment_title?: string
  error_count?: ErrorCount
}

export interface SystemStats {
  cpu_usage: number; ram_usage: number; ram_total_mb: number
  disk_usage: number; disk_total_gb: number; temperature: number
  uptime_hours: number; gemini_requests_today: number
  gemini_tokens_today: number; active_users: number
}

export function getScoreLevel(score: number) {
  if (score >= 9) return { label: "Hoàn thành tốt", color: "text-success", bg: "bg-success/10", emoji: "🌟" }
  if (score >= 7) return { label: "Hoàn thành", color: "text-info", bg: "bg-info/10", emoji: "👍" }
  if (score >= 5) return { label: "Cần cố gắng", color: "text-warning-foreground", bg: "bg-warning/10", emoji: "📝" }
  return { label: "Chưa hoàn thành", color: "text-destructive", bg: "bg-destructive/10", emoji: "💪" }
}

export function getErrorTypeInfo(code: ErrorTypeCode) {
  const map: Record<ErrorTypeCode, { label: string; color: string }> = {
    am_dau: { label: "Lỗi âm đầu", color: "bg-destructive/10 text-destructive" },
    van: { label: "Lỗi vần", color: "bg-warning/10 text-warning-foreground" },
    thanh: { label: "Lỗi thanh điệu", color: "bg-info/10 text-info" },
    viet_hoa: { label: "Lỗi viết hoa", color: "bg-accent text-accent-foreground" },
    dau_cau: { label: "Lỗi dấu câu", color: "bg-muted text-muted-foreground" },
  }
  return map[code]
}
