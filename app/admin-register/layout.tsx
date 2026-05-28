export default function AdminRegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /*
     * Wrapper này có position: fixed + inset: 0 để phủ TOÀN BỘ viewport,
     * kể cả vùng html/body đang có màu sáng từ theme mặc định.
     * overflow-y: auto cho phép scroll khi nội dung dài hơn màn hình.
     * background: #080b14 là màu nền tối chủ đạo của trang admin register.
     */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: '#080b14',
        zIndex: 9998,
      }}
    >
      {children}
    </div>
  )
}
