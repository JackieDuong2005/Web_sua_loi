import { Grade, SpellingError, SystemStats } from "./types"

export const mockAIErrors: SpellingError[] = [
  { position: 3, original: "đam", expected: "đâm", error_type: "van", error_name: "Lỗi vần", deduction: 1.0, is_duplicate: false, context: "cây cối đam chồi nảy lộc" },
  { position: 8, original: "nơ", expected: "nở", error_type: "thanh", error_name: "Lỗi thanh điệu", deduction: 1.0, is_duplicate: false, context: "Hoa mai nơ vàng rực rỡ" },
  { position: 15, original: "hót", expected: "hót", error_type: "thanh", error_name: "Lỗi thanh điệu", deduction: 1.0, is_duplicate: true, context: "Tiếng chim hót líu lo" },
  { position: 20, original: "mua", expected: "mùa", error_type: "thanh", error_name: "Lỗi thanh điệu", deduction: 1.0, is_duplicate: false, context: "yêu mua xuân tươi đẹp" },
]

export const mockGrades: Grade[] = [
  { id: 1, submission_id: 1, student_id: 3, assignment_id: 1, ai_recognized_text: "Mùa xuân đến, cây cối đam chồi nảy lộc. Hoa mai nơ vàng rực rỡ khắp nơi. Trẻ em vui đùa trong nắng ấm. Tiếng chim hót líu lo trên cành cây xanh. Ai cũng yêu mua xuân tươi đẹp.", ai_errors_json: mockAIErrors, ai_score: 7, ai_comment: "Bài viết tương đối tốt, cần chú ý thanh điệu và vần.", final_score: 7, teacher_comment: "Con cần luyện thêm các từ có dấu hỏi/ngã nhé!", is_ai_modified: false, gemini_model: "gemini-1.5-flash", processing_time_ms: 2340, token_count: 512, graded_at: "2024-01-15", student_name: "Lê Văn C", assignment_title: "Bài chính tả số 1", error_count: { total: 4, unique: 3, am_dau: 0, van: 1, thanh: 2, viet_hoa: 0, dau_cau: 0 } },
  { id: 2, submission_id: 2, student_id: 4, assignment_id: 1, ai_recognized_text: "Mùa xuân đến, cây cối đâm chồi nảy lộc. Hoa mai nở vàng rực rỡ khắp nơi.", ai_score: 9, ai_comment: "Rất tốt!", final_score: 9, is_ai_modified: false, gemini_model: "gemini-1.5-flash", processing_time_ms: 1890, token_count: 420, graded_at: "2024-01-15", student_name: "Phạm Thị D", assignment_title: "Bài chính tả số 1", error_count: { total: 1, unique: 1, am_dau: 0, van: 0, thanh: 1, viet_hoa: 0, dau_cau: 0 } },
  { id: 3, submission_id: 3, student_id: 5, assignment_id: 1, ai_score: 6, final_score: 6, is_ai_modified: true, gemini_model: "gemini-1.5-flash", processing_time_ms: 3100, token_count: 580, graded_at: "2024-01-16", student_name: "Hoàng Văn E", assignment_title: "Bài chính tả số 1", teacher_comment: "Cần cố gắng hơn.", error_count: { total: 5, unique: 4, am_dau: 1, van: 1, thanh: 2, viet_hoa: 0, dau_cau: 0 } },
]

export const mockSystemStats: SystemStats = {
  cpu_usage: 34, ram_usage: 62, ram_total_mb: 4096,
  disk_usage: 24, disk_total_gb: 32, temperature: 52,
  uptime_hours: 168, gemini_requests_today: 47,
  gemini_tokens_today: 28500, active_users: 5,
}
