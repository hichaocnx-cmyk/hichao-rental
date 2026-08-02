import { Component } from 'react'

// ══════════════════════════════════════════════════════════════
// ErrorBoundary — กัน "จอขาว"
//
// เดิม: JavaScript error จุดเดียวที่ไหนก็ได้ React จะถอด component tree
// ทิ้งทั้งหมด เหลือหน้าเปล่าๆ ไม่มีข้อความ ไม่มีปุ่ม ผู้ใช้ต้องเดาเองว่า
// ต้อง refresh — ถ้าเกิดตอนอยู่หน้าเคาน์เตอร์คือทำงานต่อไม่ได้ทันที
//
// ต้องเป็น class component เท่านั้น React ยังไม่มี hook สำหรับดักตรงนี้
// ══════════════════════════════════════════════════════════════
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // log ไว้ให้เปิด console ดูได้ว่าพังที่ component ไหน
    console.error('[ErrorBoundary]', error?.message || error)
    console.error(info?.componentStack)
  }

  // ลองประกอบหน้าใหม่โดยไม่ reload ทั้งแอป (state อื่นๆ ยังอยู่)
  handleRetry = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const compact = this.props.compact   // true = ใช้ในพื้นที่เนื้อหา ไม่ใช่เต็มจอ

    return (
      <div className={compact
        ? 'flex items-center justify-center py-16 px-4'
        : 'min-h-screen flex items-center justify-center px-4 bg-surface'}>
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">

          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">หน้านี้มีบางอย่างผิดพลาด</h2>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            ข้อมูลของคุณยังอยู่ครบ ไม่ได้หายไปไหน<br />
            ลองกดปุ่มด้านล่างดูก่อนได้เลย
          </p>

          {/* ข้อความ error จริง — ไว้ส่งต่อให้คนแก้ */}
          <p className="mt-4 text-[11px] font-mono text-gray-400 bg-gray-50 rounded-lg px-3 py-2 break-words">
            {String(error?.message || error).slice(0, 200)}
          </p>

          <div className="flex gap-2 mt-5">
            <button onClick={this.handleRetry}
              className="flex-1 h-10 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors">
              ลองใหม่
            </button>
            <button onClick={() => window.location.reload()}
              className="flex-1 h-10 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors">
              โหลดหน้าใหม่
            </button>
          </div>

          {!compact && (
            <button onClick={() => { window.location.href = '/dashboard' }}
              className="mt-2 w-full h-10 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              กลับหน้าหลัก
            </button>
          )}
        </div>
      </div>
    )
  }
}
