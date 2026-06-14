import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบ Email และ Password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface">

      {/* ── Left brand panel (desktop only) ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 bg-brand-500 flex-col items-center justify-between px-10 py-12 relative overflow-hidden">

        {/* Decorative circles */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute top-1/3 -right-20 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-brand-600/60" />
        <div className="absolute bottom-1/4 right-8 w-20 h-20 rounded-full bg-white/10" />

        {/* Logo */}
        <div className="relative z-10 self-start">
          <img src="/logo.png" alt="HICHAO Camera" className="h-10 w-auto drop-shadow" />
        </div>

        {/* Center text */}
        <div className="relative z-10 text-center">
          <img src="/logo.png" alt="HICHAO Camera" className="h-28 w-auto mx-auto mb-6 drop-shadow-lg" />
          <h2 className="text-3xl font-bold text-white leading-snug mb-3">
            จัดการการเช่ากล้อง<br />ให้ง่ายขึ้น
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs mx-auto">
            ระบบจัดการร้านเช่ากล้องครบวงจร<br />ติดตามการเช่า ลูกค้า และรายได้ในที่เดียว
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 flex flex-wrap gap-2 justify-center">
          {['📷 กล้อง & อุปกรณ์', '👥 จัดการลูกค้า', '💰 รายรับ-รายจ่าย', '🔔 แจ้งเตือน LINE'].map(f => (
            <span key={f} className="text-xs text-white/80 bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* Mobile logo (hidden on desktop) */}
        <div className="lg:hidden text-center mb-8">
          <img src="/logo.png" alt="HICHAO Camera" className="h-14 w-auto mx-auto mb-3" />
          <p className="text-gray-400 text-xs">Camera Rental Management</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
            <p className="text-sm text-gray-400 mt-1">ยินดีต้อนรับกลับมา 🌸</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1}
                >
                  {showPass
                    ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-gray-500 cursor-pointer select-none">
                จดจำฉันไว้
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm shadow-brand-200 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : 'เข้าสู่ระบบ'}
            </button>

          </form>

          <p className="text-center text-gray-300 text-xs mt-8">
            © 2026 HICHAO.CNX · Chiang Mai Camera Rental
          </p>
        </div>
      </div>

    </div>
  )
}
