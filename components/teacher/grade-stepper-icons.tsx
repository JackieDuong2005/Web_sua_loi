import React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/**
 * 1. Icon Chụp hoặc tải ảnh vở viết tay
 * Thiết kế: Máy ảnh cảm biến kết hợp góc chụp trang vở và ống kính hội tụ
 */
export function IconStepCamera({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5L14.5 4z" />
      <circle cx="12" cy="14" r="4" />
      <path d="M12 12a2 2 0 0 1 2 2" strokeWidth="1.5" />
      <circle cx="18.5" cy="10.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

/**
 * 2. Icon Căn chỉnh & làm rõ ảnh (Deskew, Grayscale, Contrast, khử lưới ô ly)
 * Thiết kế: Khung căn lề góc chụp ảnh kết hợp đũa phép/thanh trượt tinh chỉnh thông minh
 */
export function IconStepEnhance({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Khung góc căn chỉnh ảnh Crop/Deskew */}
      <path d="M6 3H3v3" />
      <path d="M18 3h3v3" />
      <path d="M3 18v3h3" />
      <path d="M21 18v3h-3" />
      {/* Thanh trượt căn sáng / độ tương phản */}
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      {/* Ngôi sao làm nét ảnh */}
      <path d="m18 8 1 1-1 1-1-1z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * 3. Icon Đọc chữ viết tay bằng AI (OCR TrOCR / Gemini Vision)
 * Thiết kế: Trang giấy với các dòng chữ viết và tia quét quang học thông minh
 */
export function IconStepScanOcr({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Khung trang vở */}
      <path d="M4 4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
      <path d="M14 2v6h6" />
      {/* Các nét chữ viết tay */}
      <path d="M8 12h5" strokeDasharray="1 1" />
      <path d="M8 16h8" strokeDasharray="1 1" />
      {/* Tia laser quét quang học OCR */}
      <line x1="2" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="3" cy="13" r="1" fill="currentColor" />
      <circle cx="21" cy="13" r="1" fill="currentColor" />
    </svg>
  )
}

/**
 * 4. Icon Tìm lỗi sai & Cách diễn đạt / So sánh SGK (ViT5 + YOLOv8)
 * Thiết kế: Cây bút chấm bài rèn chữ với đường lượn sóng sửa lỗi chính tả
 */
export function IconStepProofread({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Cây bút mực chấm chữ */}
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <path d="m15 5 4 4" />
      {/* Đường gạch lượn sóng kiểm tra chính tả */}
      <path d="M3 17c.7 0 1.3-.4 2-.4s1.3.4 2 .4 1.3-.4 2-.4 1.3.4 2 .4" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * 5. Icon Cho điểm & Nhận xét sư phạm (Thang điểm 10 TT27)
 * Thiết kế: Bảng kẹp điểm đánh giá với huy hiệu ngôi sao và các cột điểm
 */
export function IconStepScore({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Bảng kẹp điểm */}
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M9 4V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      {/* Các cột điểm số */}
      <line x1="7" y1="17" x2="7" y2="13" strokeWidth="2.5" />
      <line x1="11" y1="17" x2="11" y2="10" strokeWidth="2.5" />
      <line x1="15" y1="17" x2="15" y2="8" strokeWidth="2.5" />
      {/* Ngôi sao đánh giá trên đầu */}
      <circle cx="17" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * Icon Tiêu đề Quy trình chấm bài (Workflow)
 */
export function IconStepWorkflow({ size = 16, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="15" width="6" height="6" rx="1.5" />
      <path d="M6 9v3a3 3 0 0 0 3 3h6" />
      <circle cx="15" cy="6" r="2.5" />
      <line x1="15" y1="8.5" x2="15" y2="15" />
    </svg>
  )
}
