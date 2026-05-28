"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { Shield, ArrowLeft, User, Lock, Eye, EyeOff, CheckCircle, KeyRound, AlertTriangle } from "lucide-react"

export default function AdminRegisterPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [secretKey, setSecretKey] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)



  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!secretKey.trim()) {
      setError("Vui lòng nhập mã bí mật quản trị viên")
      return
    }
    if (!name.trim()) {
      setError("Vui lòng nhập họ và tên")
      return
    }
    if (!username.trim() || username.length < 3) {
      setError("Tên đăng nhập phải có ít nhất 3 ký tự")
      return
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      return
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/admin-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          confirmPassword,
          secretKey: secretKey.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Đăng ký thất bại")
        setIsLoading(false)
        return
      }

      setSuccess(data.message || "Đăng ký tài khoản Admin thành công!")
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch {
      setError("Không thể kết nối server. Vui lòng thử lại.")
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .ar-page {
          min-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: transparent;
          position: relative;
          font-family: 'Inter', 'Roboto', system-ui, sans-serif;
        }
        .ar-bg-radial {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 700px 500px at 20% 15%, rgba(124, 58, 237, 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 500px 350px at 80% 85%, rgba(245, 158, 11, 0.08) 0%, transparent 70%),
            radial-gradient(ellipse 900px 700px at 50% 50%, rgba(15, 23, 42, 0.9) 0%, transparent 100%);
          pointer-events: none;
        }
        .ar-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }
        .ar-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          animation: arFloat 10s ease-in-out infinite;
        }
        .ar-orb-1 {
          width: 300px; height: 300px;
          background: rgba(124, 58, 237, 0.08);
          top: -50px; left: -50px;
          animation-delay: 0s;
        }
        .ar-orb-2 {
          width: 250px; height: 250px;
          background: rgba(245, 158, 11, 0.06);
          bottom: -30px; right: -30px;
          animation-delay: -4s;
        }
        .ar-orb-3 {
          width: 200px; height: 200px;
          background: rgba(59, 130, 246, 0.05);
          top: 50%; left: 60%;
          animation-delay: -7s;
        }
        @keyframes arFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -15px) scale(1.05); }
          66% { transform: translate(-15px, 10px) scale(0.95); }
        }
        .ar-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
        }
        .ar-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
          animation: arSlideUp 0.5s ease-out both;
        }
        @keyframes arSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ar-icon-wrap {
          width: 64px; height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(245, 158, 11, 0.2));
          border: 1px solid rgba(124, 58, 237, 0.3);
          box-shadow: 0 0 40px rgba(124, 58, 237, 0.2), 0 0 80px rgba(124, 58, 237, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }
        .ar-title {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #c084fc 0%, #fbbf24 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.25rem 0;
          text-align: center;
          letter-spacing: -0.02em;
        }
        .ar-subtitle {
          font-size: 0.8125rem;
          color: #64748b;
          text-align: center;
          margin: 0;
        }
        .ar-banner {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          margin-bottom: 1rem;
          animation: arSlideUp 0.5s 0.1s ease-out both;
          font-size: 0.8125rem;
          color: #fbbf24;
        }
        .ar-card {
          background: rgba(15, 20, 35, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          padding: 2rem;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(255, 255, 255, 0.03) inset;
          animation: arScaleIn 0.4s 0.15s ease-out both;
        }
        @keyframes arScaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .ar-card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #f1f5f9;
          text-align: center;
          margin: 0 0 0.25rem 0;
        }
        .ar-card-desc {
          font-size: 0.8125rem;
          color: #64748b;
          text-align: center;
          margin: 0 0 1.5rem 0;
        }
        .ar-form { display: flex; flex-direction: column; gap: 1rem; }
        .ar-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .ar-label {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #cbd5e1;
        }
        .ar-label-req { color: #f87171; }
        .ar-input-wrap { position: relative; }
        .ar-input {
          width: 100%;
          height: 38px;
          padding: 0 2.5rem 0 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #f1f5f9;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .ar-input::placeholder { color: #475569; }
        .ar-input:focus {
          border-color: rgba(124, 58, 237, 0.5);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }
        .ar-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .ar-eye-btn {
          position: absolute;
          right: 0.625rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #475569;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .ar-eye-btn:hover { color: #94a3b8; }
        .ar-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.25rem 0;
        }
        .ar-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.07);
        }
        .ar-divider-text {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #334155;
          letter-spacing: 0.08em;
        }
        .ar-match {
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
        .ar-match-ok { color: #34d399; }
        .ar-match-err { color: #f87171; }
        .ar-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          font-size: 0.8125rem;
          margin-bottom: 1rem;
        }
        .ar-error {
          padding: 0.625rem 1rem;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 0.8125rem;
          text-align: center;
        }
        .ar-btn {
          width: 100%;
          height: 42px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: #fff;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.25s ease;
          font-family: inherit;
          letter-spacing: 0.01em;
        }
        .ar-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #6d28d9 0%, #9333ea 100%);
          box-shadow: 0 6px 24px rgba(124, 58, 237, 0.4);
          transform: translateY(-1px);
        }
        .ar-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }
        .ar-footer {
          text-align: center;
          margin-top: 1.25rem;
        }
        .ar-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          color: #475569;
          text-decoration: none;
          transition: color 0.2s;
        }
        .ar-back-link:hover { color: #94a3b8; }
      `}</style>

      <div className="ar-page">
        <div className="ar-bg-radial" />
        <div className="ar-grid" />
        <div className="ar-orb ar-orb-1" />
        <div className="ar-orb ar-orb-2" />
        <div className="ar-orb ar-orb-3" />

        <div className="ar-content">
          {/* Header */}
          <div className="ar-header">
            <div className="ar-icon-wrap">
              <Shield style={{ width: 28, height: 28, color: '#fbbf24' }} />
            </div>
            <h1 className="ar-title">Đăng ký Quản trị viên</h1>
            <p className="ar-subtitle">Trang đăng ký dành riêng cho quản trị viên hệ thống</p>
          </div>

          {/* Warning Banner */}
          <div className="ar-banner">
            <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>Khu vực bảo mật – Cần mã bí mật để đăng ký</span>
          </div>

          {/* Card */}
          <div className="ar-card">
            <h2 className="ar-card-title">Tạo tài khoản Admin</h2>
            <p className="ar-card-desc">Nhập mã bí mật và thông tin tài khoản</p>

            {/* Success message */}
            {success && (
              <div className="ar-success">
                <CheckCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="ar-form">
              {/* Secret Key */}
              <div className="ar-field">
                <label htmlFor="secret-key" className="ar-label">
                  <KeyRound style={{ width: 14, height: 14, color: '#fbbf24' }} />
                  Mã bí mật <span className="ar-label-req">*</span>
                </label>
                <div className="ar-input-wrap">
                  <input
                    id="secret-key"
                    type={showSecretKey ? "text" : "password"}
                    placeholder="Nhập mã bí mật quản trị viên"
                    value={secretKey}
                    onChange={(e) => { setSecretKey(e.target.value); setError("") }}
                    className="ar-input"
                    autoFocus
                    disabled={!!success}
                  />
                  <button type="button" className="ar-eye-btn" tabIndex={-1}
                    onClick={() => setShowSecretKey(!showSecretKey)}>
                    {showSecretKey ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="ar-divider">
                <div className="ar-divider-line" />
                <span className="ar-divider-text">THÔNG TIN TÀI KHOẢN</span>
                <div className="ar-divider-line" />
              </div>

              {/* Full Name */}
              <div className="ar-field">
                <label htmlFor="admin-name" className="ar-label">
                  <User style={{ width: 14, height: 14 }} />
                  Họ và tên <span className="ar-label-req">*</span>
                </label>
                <input
                  id="admin-name"
                  type="text"
                  placeholder="Nhập họ và tên đầy đủ"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError("") }}
                  className="ar-input"
                  style={{ paddingRight: '0.75rem' }}
                  disabled={!!success}
                />
              </div>

              {/* Username */}
              <div className="ar-field">
                <label htmlFor="admin-username" className="ar-label">
                  <User style={{ width: 14, height: 14 }} />
                  Tên đăng nhập <span className="ar-label-req">*</span>
                </label>
                <input
                  id="admin-username"
                  type="text"
                  placeholder="Ít nhất 3 ký tự, không dấu, không khoảng trắng"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.replace(/\s/g, "")); setError("") }}
                  className="ar-input"
                  style={{ paddingRight: '0.75rem' }}
                  disabled={!!success}
                />
              </div>

              {/* Password */}
              <div className="ar-field">
                <label htmlFor="admin-password" className="ar-label">
                  <Lock style={{ width: 14, height: 14 }} />
                  Mật khẩu <span className="ar-label-req">*</span>
                </label>
                <div className="ar-input-wrap">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ít nhất 6 ký tự"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError("") }}
                    className="ar-input"
                    disabled={!!success}
                  />
                  <button type="button" className="ar-eye-btn" tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="ar-field">
                <label htmlFor="admin-confirm-password" className="ar-label">
                  <Lock style={{ width: 14, height: 14 }} />
                  Xác nhận mật khẩu <span className="ar-label-req">*</span>
                </label>
                <div className="ar-input-wrap">
                  <input
                    id="admin-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError("") }}
                    className="ar-input"
                    disabled={!!success}
                  />
                  <button type="button" className="ar-eye-btn" tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`ar-match ${password === confirmPassword ? "ar-match-ok" : "ar-match-err"}`}>
                    {password === confirmPassword ? "✓ Mật khẩu khớp" : "✗ Mật khẩu không khớp"}
                  </p>
                )}
              </div>

              {/* Error */}
              {error && <p className="ar-error">{error}</p>}

              {/* Submit */}
              <button type="submit" className="ar-btn" disabled={isLoading || !!success}>
                {isLoading ? (
                  <>
                    <Spinner />
                    <span>Đang xử lý...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle style={{ width: 18, height: 18 }} />
                    <span>Đã đăng ký thành công</span>
                  </>
                ) : (
                  <>
                    <Shield style={{ width: 18, height: 18 }} />
                    <span>Tạo tài khoản Admin</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="ar-footer">
            <Link href="/" className="ar-back-link">
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Quay lại trang đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
