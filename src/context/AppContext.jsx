import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getCameras } from '../lib/cameras'
import { getCustomers } from '../lib/customers'
import { getRentals } from '../lib/rentals'
import { getExpenses } from '../lib/expenses'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

// วันที่แบบ local time (เวลาไทย) — ห้ามใช้ toISOString() เพราะเป็น UTC
// (ช่วง 00:00–07:00 น. จะได้วันที่ของเมื่อวาน ทำให้แจ้งเตือน/สถิติเพี้ยน)
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ── cache ใน sessionStorage (stale-while-revalidate) ────────────
// เดิม refresh หน้าหรือเปิด PWA ใหม่ = ยิง 4 SELECT ใหม่ทุกครั้ง ต้องรอ skeleton
// ตอนนี้แสดงข้อมูลรอบก่อนทันที แล้วค่อยดึงของใหม่เงียบๆ ข้างหลัง
// sessionStorage = อยู่แค่แท็บนี้ ปิดแท็บก็หาย จึงไม่มีข้อมูลค้างข้ามวัน
const CACHE_KEY = 'hichao_cache_v1'

function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)) || null }
  catch { return null }
}

function writeCache(payload) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload)) }
  catch { /* เต็ม/โหมดส่วนตัว — ข้ามไป ไม่ critical */ }
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ไม่ critical */ }
}

export function AppProvider({ children }) {
  // ⚠️ ต้องรอ auth ให้เสร็จก่อนโหลดข้อมูล — ห้ามลบ
  // AppProvider ถูกวางไว้เหนือ <Routes> จึง mount ตั้งแต่ยังไม่ล็อกอิน
  // ถ้ายิง query ตอน session ยังกู้ไม่เสร็จ Supabase จะมองเป็น anon
  // แล้ว RLS (auth.role() = 'authenticated') คืน 200 [] "เงียบๆ" ไม่ error
  // → ทุกหน้าว่างเปล่าโดยไม่มีอะไรฟ้อง และไม่มีการโหลดซ้ำ
  // บนเดสก์ท็อปมักชนะ race เลยดูปกติ แต่มือถือ (เย็นกว่า/เน็ตช้ากว่า) แพ้ประจำ
  const { user, loading: authLoading } = useAuth()
  const cached = readCache()

  const [cameras, setCameras] = useState(cached?.cameras || [])
  const [customers, setCustomers] = useState(cached?.customers || [])
  const [rentals, setRentals] = useState(cached?.rentals || [])
  const [expenses, setExpenses] = useState(cached?.expenses || [])
  // มี cache แล้วไม่ต้องโชว์ skeleton — เห็นข้อมูลทันที
  const [loading, setLoading] = useState(!cached)
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('noti_read') || '[]')) }
    catch { return new Set() }
  })

  // ⚠️ ใช้ allSettled ไม่ใช่ all — ห้ามเปลี่ยนกลับ
  // เดิมใช้ Promise.all: ถ้าตารางใดตารางหนึ่งพัง (เช่นพิมพ์ชื่อคอลัมน์ผิด
  // แล้ว PostgREST ตอบ 400) ทั้งก้อนจะ reject → ไม่มี setState สักตัว
  // → ทุกหน้าว่างเปล่าพร้อมกัน ทั้งที่อีก 3 ตารางดึงมาได้ปกติ
  // allSettled ทำให้ความพังจำกัดอยู่แค่ตารางนั้น หน้าอื่นยังใช้งานได้
  const loadAll = useCallback(async () => {
    if (!readCache()) setLoading(true)

    const jobs = [
      ['cameras',   getCameras,   setCameras],
      ['customers', getCustomers, setCustomers],
      ['rentals',   getRentals,   setRentals],
      ['expenses',  getExpenses,  setExpenses],
    ]
    const results = await Promise.allSettled(jobs.map(([, fetcher]) => fetcher()))

    const fresh = {}
    const failed = []
    results.forEach((res, i) => {
      const [key, , setter] = jobs[i]
      if (res.status === 'fulfilled') { setter(res.value); fresh[key] = res.value }
      else { failed.push(`${key}: ${res.reason?.message || res.reason}`) }
    })

    if (failed.length) console.error('AppContext load error →', failed.join(' | '))
    // เขียน cache เฉพาะตอนได้ครบทุกตาราง กันไม่ให้ cache ที่ใช้ได้ถูกทับด้วยของไม่ครบ
    if (!failed.length) writeCache(fresh)

    setLoading(false)
  }, [])

  const reloadCameras = useCallback(async () => { setCameras(await getCameras()) }, [])
  const reloadCustomers = useCallback(async () => { setCustomers(await getCustomers()) }, [])
  const reloadRentals = useCallback(async () => { setRentals(await getRentals()) }, [])
  const reloadExpenses = useCallback(async () => { setExpenses(await getExpenses()) }, [])

  useEffect(() => {
    if (authLoading) return            // ยังไม่รู้ว่ามี session ไหม — รอก่อน
    if (!user) {                       // ยังไม่ล็อกอิน / เพิ่งออกจากระบบ
      setCameras([]); setCustomers([]); setRentals([]); setExpenses([])
      clearCache()                     // กันข้อมูลค้างข้ามบัญชี
      setLoading(false)
      return
    }
    loadAll()
  }, [authLoading, user?.id, loadAll])

  // อัปเดต cache ทุกครั้งที่ข้อมูลเปลี่ยน (รวมที่มาจาก realtime)
  useEffect(() => {
    if (loading || !user) return
    writeCache({ cameras, customers, rentals, expenses })
  }, [cameras, customers, rentals, expenses, loading, user])

  // ── Realtime subscriptions ─────────────────────────────────────
  // subscribe แค่ 2 ตารางที่เปลี่ยนจากฝั่ง server จริงๆ:
  //   rentals / cameras — pg_cron เปลี่ยนสถานะเองตลอด 24 ชม.
  // ตัด customers / expenses ออก เพราะเปลี่ยนจากในแอปเท่านั้น
  // (แก้เสร็จเรียก reloadCustomers/reloadExpenses ตรงๆ อยู่แล้ว)
  // → ลดโควตา Realtime message (แผนฟรี 2M/เดือน) และ refetch ที่ไม่จำเป็น
  //
  // debounce 800ms: cron อัปเดตหลายแถวรวดเดียว เดิมยิง refetch ทั้งตารางต่อ 1 event
  // → ดึงข้อมูลซ้ำสิบๆ ครั้งใน 1 วินาที ตอนนี้รวมเป็นครั้งเดียว
  useEffect(() => {
    if (!user) return                  // ยังไม่ล็อกอิน ไม่ต้องเปิด websocket
    const timers = {}
    const debouncedReload = (key, fetcher, setter) => () => {
      clearTimeout(timers[key])
      timers[key] = setTimeout(() => {
        fetcher().then(setter).catch(console.error)
      }, 800)
    }

    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' },
        debouncedReload('rentals', getRentals, setRentals))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cameras' },
        debouncedReload('cameras', getCameras, setCameras))
      .subscribe()

    return () => {
      Object.values(timers).forEach(clearTimeout)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Computed stats
  const stats = useMemo(() => {
    const today = localDateStr()
    // นับเฉพาะเดือนปัจจุบันเท่านั้น (เทียบ YYYY-MM ตรงๆ) — ไม่รวมคิวจอง/รายจ่ายของเดือนหน้า
    const monthKey = today.slice(0, 7)
    const monthExpenses = expenses.filter(e => (e.date || '').slice(0, 7) === monthKey)
    // รายได้แยกตามสถานะ
    const thisMonthRentals = rentals.filter(r => r.status !== 'cancelled' && (r.start_date || '').slice(0, 7) === monthKey)
    const returned     = thisMonthRentals.filter(r => r.status === 'returned')
    const active       = thisMonthRentals.filter(r => r.status === 'active')
    const booked       = thisMonthRentals.filter(r => r.status === 'booked')
    const revenueBreakdown = {
      rentalIncome:  returned.reduce((s,r) => s + Number(r.total_price||0) + Number(r.delivery_fee||0), 0)
                    + active.reduce((s,r) => s + Number(r.total_price||0) + Number(r.delivery_fee||0), 0)
                    + booked.reduce((s,r) => s + Number(r.deposit||0), 0),
      heldInsurance: active.reduce((s,r) => s + Number(r.insurance||0), 0),
      deposits:      booked.reduce((s,r) => s + Number(r.deposit||0), 0),
    }
    const monthRevenue = revenueBreakdown.rentalIncome + revenueBreakdown.heldInsurance
    const monthExpenseTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)
    // กำไรสุทธิไม่รวมประกัน (รับมาแล้วคืนให้ลูกค้าในวันคืนกล้อง)
    const monthProfitBase = revenueBreakdown.rentalIncome
    // category breakdown this month
    const expByCategory = {}
    monthExpenses.forEach(e => { expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount) })
    return {
      totalCameras: cameras.length,
      availableCameras: cameras.filter(c => c.status === 'available' || c.status === 'returned').length,
      rentedCameras: cameras.filter(c => c.status === 'rented').length,
      todayRentals: rentals.filter(r => r.status === 'active' && r.start_date <= today && r.end_date >= today).length,
      monthRevenue,
      revenueBreakdown,
      monthExpenseTotal,
      monthProfit: monthProfitBase - monthExpenseTotal,
      // จำนวนการเช่า/ลูกค้า เฉพาะเดือนนี้ (ลูกค้านับไม่ซ้ำคน)
      monthRentalCount: thisMonthRentals.length,
      monthCustomerCount: new Set(thisMonthRentals.map(r => r.customer_id).filter(Boolean)).size,
      expByCategory: Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5),
    }
  }, [cameras, rentals, expenses])

  // Computed notifications
  const notifications = useMemo(() => {
    const today = new Date()
    const todayStr = localDateStr(today)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = localDateStr(tomorrow)

    const items = []

    rentals.forEach(r => {
      if (r.status !== 'active' && r.status !== 'booked') return

      // Overdue
      if (r.end_date < todayStr) {
        // เทียบวันแบบ date-string (UTC midnight ทั้งคู่) ได้จำนวนวันเป็น integer เป๊ะ
        const diffDays = Math.round((new Date(todayStr) - new Date(r.end_date)) / 86400000)
        items.push({
          id: `overdue-${r.id}`,
          type: 'overdue',
          rental: r,
          title: `เกินกำหนดคืน ${diffDays} วัน`,
          body: `${r.camera?.name || 'กล้อง'} · ${r.customer?.name || '—'}`,
          date: r.end_date,
          urgent: true,
        })
      }
      // Due today
      else if (r.end_date === todayStr) {
        items.push({
          id: `today-${r.id}`,
          type: 'due_today',
          rental: r,
          title: 'ครบกำหนดคืนวันนี้',
          body: `${r.camera?.name || 'กล้อง'} · ${r.customer?.name || '—'}`,
          date: r.end_date,
          urgent: true,
        })
      }
      // Due tomorrow
      else if (r.end_date === tomorrowStr) {
        items.push({
          id: `tomorrow-${r.id}`,
          type: 'due_tomorrow',
          rental: r,
          title: 'ครบกำหนดคืนพรุ่งนี้',
          body: `${r.camera?.name || 'กล้อง'} · ${r.customer?.name || '—'}`,
          date: r.end_date,
          urgent: false,
        })
      }
    })

    // เคียง urgent ก่อน
    return items.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.date.localeCompare(b.date))
  }, [rentals])

  const unreadCount = useMemo(
    () => notifications.filter(n => !readIds.has(n.id)).length,
    [notifications, readIds]
  )

  const markRead = useCallback((id) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('noti_read', JSON.stringify([...next]))
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    const ids = notifications.map(n => n.id)
    setReadIds(prev => {
      const next = new Set([...prev, ...ids])
      localStorage.setItem('noti_read', JSON.stringify([...next]))
      return next
    })
  }, [notifications])

  return (
    <AppContext.Provider value={{
      cameras, customers, rentals, expenses, loading, stats,
      notifications, unreadCount, readIds, markRead, markAllRead,
      reload: loadAll, reloadCameras, reloadCustomers, reloadRentals, reloadExpenses,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
