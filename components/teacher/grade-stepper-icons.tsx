import React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/**
 * Component hiển thị icon Google Material Symbols Rounded thông qua font
 */
export function GoogleMaterialIcon({
  name,
  size = 20,
  className = "",
  filled = false,
}: {
  name: string
  size?: number | string
  className?: string
  filled?: boolean
}) {
  return (
    <span
      className={`material-symbols-rounded select-none inline-flex items-center justify-center leading-none ${className}`}
      style={{
        fontSize: typeof size === "number" ? `${size}px` : size,
        fontVariationSettings: filled ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 500",
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

/**
 * 1. Google Material Symbol: photo_camera
 * Bước 1: Chụp hoặc tải ảnh vở
 */
export function IconGoogleCamera({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M12 17.5q1.875 0 3.188-1.312Q16.5 14.875 16.5 13q0-1.875-1.312-3.188Q13.875 8.5 12 8.5q-1.875 0-3.188 1.312Q7.5 11.125 7.5 13q0 1.875 1.312 3.188Q10.125 17.5 12 17.5Zm0-2q-1.05 0-1.775-.725Q9.5 14.05 9.5 13q0-1.05.725-1.775Q10.95 10.5 12 10.5q1.05 0 1.775.725.725.725.725 1.775 0 1.05-.725 1.775Q13.05 15.5 12 15.5ZM4 21q-.825 0-1.412-.587Q2 19.825 2 19V7q0-.825.588-1.412Q3.175 5 4 5h3.15L8.7 3.325q.275-.3.65-.463Q9.725 2.7 10.15 2.7h3.7q.425 0 .8.162.375.163.65.463L16.85 5H20q.825 0 1.413.588Q22 6.175 22 7v12q0 .825-.587 1.413Q20.825 21 20 21Z" />
    </svg>
  )
}

/**
 * 2. Google Material Symbol: tune / auto_fix_high
 * Bước 2: Căn chỉnh & làm rõ ảnh
 */
export function IconGoogleEnhance({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M3 18q-.425 0-.712-.288Q2 17.425 2 17t.288-.712Q2.575 16 3 16h6q.425 0 .713.288Q10 16.575 10 17t-.287.712Q9.425 18 9 18Zm0-5q-.425 0-.712-.288Q2 12.425 2 12t.288-.712Q2.575 11 3 11h10q.425 0 .713.288Q14 11.575 14 12t-.287.712Q13.425 13 13 13Zm0-5q-.425 0-.712-.288Q2 7.425 2 7t.288-.712Q2.575 6 3 6h14q.425 0 .713.288Q18 6.575 18 7t-.287.712Q17.425 8 17 8Zm9 13q-.425 0-.712-.288Q11 20.425 11 20v-5q0-.425.288-.712Q11.575 14 12 14h2v-2q0-.425.288-.712Q14.575 11 15 11h1q.425 0 .713.288Q17 11.575 17 12v7q0 .425-.287.712Q16.425 20 16 20h-1v1q0 .425-.288.712Q14.425 22 14 22t-.712-.288Q13 21.425 13 21h-1Zm5-7q-.425 0-.712-.288Q16 13.425 16 13V6q0-.425.288-.712Q16.575 5 17 5h1v-1q0-.425.288-.712Q18.575 3 19 3t.713.288Q20 3.575 20 4v1h1q.425 0 .713.288Q22 5.575 22 6v7q0 .425-.287.712Q21.425 14 21 14h-1v1q0 .425-.288.712Q19.425 16 19 16t-.712-.288Q18 15.425 18 15v-1Z" />
    </svg>
  )
}

/**
 * 3. Google Material Symbol: document_scanner
 * Bước 3: Đọc chữ viết tay bằng AI (OCR)
 */
export function IconGoogleScanOcr({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M7 17h10q.425 0 .713-.288Q18 16.425 18 16V8q0-.425-.287-.712Q17.425 7 17 7H7q-.425 0-.712.288Q6 7.575 6 8v8q0 .425.288.712Q6.575 17 7 17Zm1-2V9h8v6ZM3 21q-.825 0-1.412-.587Q2 19.825 2 19v-4q0-.425.288-.712Q2.575 14 3 14t.713.288Q4 14.575 4 15v4h4q.425 0 .713.288Q9 19.575 9 20t-.287.713Q8.425 21 8 21Zm18 0h-4q-.425 0-.712-.287Q16 20.425 16 20t.288-.712Q16.575 19 17 19h4v-4q0-.425.288-.712Q21.575 14 22 14t.713.288Q23 14.575 23 15v4q0 .825-.587 1.413Q21.825 21 21 21ZM3 9q-.425 0-.712-.288Q2 8.425 2 8V4q0-.825.588-1.412Q3.175 2 4 2h4q.425 0 .713.288Q9 2.575 9 3t-.287.712Q8.425 4 8 4H4v4q0 .425-.288.712Q3.425 9 3 9Zm18 0q-.425 0-.712-.288Q20 8.425 20 8V4h-4q-.425 0-.712-.288Q15 3.425 15 3t.288-.712Q15.575 2 16 2h4q.825 0 1.413.588Q22 3.175 22 4v4q0 .425-.287.712Q21.425 9 21 9Z" />
    </svg>
  )
}

/**
 * 4. Google Material Symbol: edit_note
 * Bước 4: Tìm lỗi sai & cách diễn đạt
 */
export function IconGoogleProofread({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M5 19q-.425 0-.713-.288Q4 18.425 4 18t.287-.712Q4.575 17 5 17h6q.425 0 .713.288Q12 17.575 12 18t-.287.712Q11.425 19 11 19Zm0-4q-.425 0-.713-.288Q4 14.425 4 14t.287-.712Q4.575 13 5 13h6q.425 0 .713.288Q12 13.575 12 14t-.287.712Q11.425 15 11 15Zm0-4q-.425 0-.713-.288Q4 10.425 4 10t.287-.712Q4.575 9 5 9h14q.425 0 .713.288Q20 9.575 20 10t-.287.712Q19.425 11 19 11Zm9 9v-3.075l6.575-6.575q.2-.2.438-.287.237-.088.512-.088.275 0 .525.088.25.087.45.287l1.375 1.375q.2.2.288.45.087.25.087.513 0 .275-.087.5-.088.225-.288.425L17.075 20Zm1.5-1.5h1.05l4.525-4.525-.525-.525-.525-.525-4.525 4.525Z" />
    </svg>
  )
}

/**
 * 5. Google Material Symbol: fact_check
 * Bước 5: Cho điểm & nhận xét
 */
export function IconGoogleScore({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21Zm0-2h14V5H5v14Zm2.5-4.4 2.85 2.85q.3.3.7.3t.7-.3l5.65-5.65q.3-.3.3-.7t-.3-.7q-.3-.3-.7-.3t-.7.3L11.75 15.3l-2.15-2.15q-.3-.3-.7-.3t-.7.3q-.3.3-.3.7t.3.7ZM5 5v14V5Z" />
    </svg>
  )
}

/**
 * Google Material Symbol: account_tree
 * Tiêu đề: Quy trình chấm bài
 */
export function IconGoogleWorkflow({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19v-4q0-.825.587-1.413Q4.175 13 5 13h4q.825 0 1.413.587Q11 14.175 11 15v1h2v-5H9q-.825 0-1.413-.587Q7 9.825 7 9V5q0-.825.587-1.413Q8.175 3 9 3h6q.825 0 1.413.587Q17 4.175 17 5v4q0 .825-.587 1.413Q15.825 11 15 11h-2v5h2v-1q0-.825.587-1.413Q16.175 13 17 13h4q.825 0 1.413.587Q23 14.175 23 15v4q0 .825-.587 1.413Q21.825 21 21 21Zm0-2h4v-4H5v4Zm12 0h4v-4h-4v4ZM9 9h6V5H9v4Z" />
    </svg>
  )
}

/**
 * Google Material Symbol: menu_book
 * Tiêu đề: Hướng dẫn nhanh
 */
export function IconGoogleBook({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M12 19.5q-1.575-1.125-3.375-1.688Q6.825 17.25 5 17.25q-1.075 0-2.075.25Q1.925 17.75 1 18.25V5.5q.925-.525 1.95-.762Q3.975 4.5 5 4.5q1.825 0 3.625.562Q10.425 5.625 12 6.75q1.575-1.125 3.375-1.688Q17.175 4.5 19 4.5q1.025 0 2.05.238.3.062.588.162Q22 5.062 22 5.5v12.75q-.925-.5-1.925-.75Q19.075 17.25 18 17.25q-1.825 0-3.625.562Q12.575 18.375 12 19.5Zm-1-2.2V7.75q-1.375-.85-2.875-1.3Q6.625 6 5 6q-1 0-1.963.225-.962.225-1.037.325v9.8q.675-.225 1.463-.375Q4.25 15.825 5 15.825q1.775 0 3.238.475 1.462.475 2.762 1ZM13 7.75V17.3q1.3-.525 2.763-1 1.462-.475 3.237-.475.75 0 1.538.15.787.15 1.462.375V6.55q-.075-.1-1.038-.325Q20 6 19 6q-1.625 0-3.125.45-1.5.45-2.875 1.3Z" />
    </svg>
  )
}

/**
 * Google Material Symbol: lightbulb
 * Tiêu đề: Mẹo nhỏ cho cô
 */
export function IconGoogleLightbulb({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M12 22q-.825 0-1.412-.587Q10 20.825 10 20h4q0 .825-.587 1.413Q12.825 22 12 22Zm-4-3q-.425 0-.712-.288Q7 18.425 7 18t.288-.712Q7.575 17 8 17h8q.425 0 .713.288Q17 17.575 17 18t-.287.712Q16.425 19 16 19Zm.3-4q-1.625-1.15-2.463-2.775Q5 10.6 5 8.75q0-2.9 2.05-4.825Q9.1 2 12 2q2.9 0 4.95 1.925Q19 5.85 19 8.75q0 1.85-.837 3.475Q17.325 13.85 15.7 15Zm1.1-2h5.2q1.075-.95 1.638-2.175Q16.8 10.6 16.8 9.25q0-2-.95-3.375Q14.9 4.5 13 4.1V6q0 .425-.288.713Q12.425 7 12 7t-.712-.287Q11 6.425 11 6V4.1q-1.9.4-2.85 1.775Q7.2 7.25 7.2 9.25q0 1.35.563 2.575Q8.325 13.05 9.4 14Z" />
    </svg>
  )
}

/**
 * Google Material Symbol: emoji_events
 * Tiêu đề: Thang điểm chuẩn
 */
export function IconGoogleTrophy({ size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M5 20q-.425 0-.712-.288Q4 19.425 4 19t.288-.712Q4.575 18 5 18h14q.425 0 .713.288Q20 18.575 20 19t-.287.712Q19.425 20 19 20Zm7-4q-2.5 0-4.25-1.75T6 10V4q0-.425.288-.712Q6.575 3 7 3h10q.425 0 .713.288Q18 3.575 18 4v6q0 2.5-1.75 4.25T12 16Zm-1 2h2v-2h-2ZM7 8H3q-.425 0-.712-.288Q2 7.425 2 7V5q0-.425.288-.712Q2.575 4 3 4h4Zm10 0h4q.425 0 .713-.288Q22 7.425 22 7V5q0-.425-.287-.712Q21.425 4 21 4h-4Z" />
    </svg>
  )
}
