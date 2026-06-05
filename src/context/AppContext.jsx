import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getCameras } from '../lib/cameras'
import { getCustomers } from '../lib/customers'
import { getRentals } from '../lib/rentals'
import { getExpenses } from '../lib/expenses'
import { supabase } from '../lib/supabaseClient'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [cameras, setCameras] = useState([])
  const [customers, setCustomers] = useState([])
  const [rentals, setRentals] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('noti_read') || '[]')) }
    catch { return new Set() }
  })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [c, cu, r, ex] = await Promise.all([getCameras(), getCustomers(), getRentals(), getExpenses()])
      setCameras(c); setCustomers(cu); setRentals(r); setExpenses(ex)
    } catch (e) { console.error('AppContext load error:', e) }
    finally { setLoading(false) }
  }, [])

  const reloadCameras = useCallback(async () => { setCameras(await getCameras()) }, [])
  const reloadCustomers = useCallback(async () => { setCustomers(await getCustomers()) }, [])
  const reloadRentals = useCallback(async () => { setRentals(await getRentals()) }, [])
  const reloadExpenses = useCallback(async () => { setExpenses(await getExpenses()) }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Realtime subscriptions ─────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' },
        () => getRentals().then(setRentals).catch(console.error))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cameras' },
        () => getCameras().then(setCameras).catch(console.error))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' },
        () => getCustomers().then(setCustomers).catch(console.error))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' },
        () => getExpenses().then(setExpenses).catch(console.error))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Computed stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const startOfMonth = today.slice(0, 7) + '-01'
    const monthExpenses = expenses.filter(e => e.date >= startOfMonth)
    // รายได้แยกตามสถานะ
    const thisMonthRentals = rentals.filter(r => r.status !== 'cancelled' && r.start_date >= startOfMonth)
    const revenueBreakdown = {
      returned: thisMonthRentals.filter(r => r.status === 'returned')
        .reduce((s, r) => s + Number(r.total_price || 0) + Number(r.delivery_fee || 0), 0),
      activeRental: thisMonthRentals.filter(r => r.status === 'active')
        .reduce((s, r) => s + Number(r.total_price || 0), 0),
      heldInsurance: thisMonthRentals.filter(r => r.status === 'active')
        .reduce((s, r) => s + Number(r.insurance || 0), 0),
      deposits: thisMonthRentals.filter(r => r.status === 'booked')
        .reduce((s, r) => s + Number(r.deposit || 0), 0),
    }
    const monthRevenue = revenueBreakdown.returned + revenueBreakdown.activeRental + revenueBreakdown.heldInsurance + revenueBreakdown.deposits
        const monthExpenseTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)
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
      monthProfit: monthRevenue - monthExpenseTotal,
      expByCategory: Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5),
    }
  }, [cameras, rentals, expenses])

  // Computed notifications
  const notifications = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const items = []

    rentals.forEach(r => {
      if (r.status !== 'active' && r.status !== 'booked') return

      // Overdue
      if (r.end_date < todayStr) {
        const diffDays = Math.floor((today - new Date(r.end_date)) / 86400000)
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

    // เรียง urgent ก่อน
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
