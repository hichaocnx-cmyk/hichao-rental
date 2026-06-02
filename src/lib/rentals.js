import { supabase } from './supabaseClient'

export async function getRentals() {
  const { data, error } = await supabase
    .from('rentals')
    .select(`*, camera:cameras(id,name,brand,image_url), customer:customers(id,name,phone)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRental(rental) {
  const { data, error } = await supabase
    .from('rentals')
    .insert([rental])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRental(id, updates) {
  const { data, error } = await supabase
    .from('rentals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRental(id) {
  const { error } = await supabase.from('rentals').delete().eq('id', id)
  if (error) throw error
}

export async function getRentalStats() {
  const today = new Date().toISOString().split('T')[0]
  const startOfMonth = today.slice(0, 7) + '-01'

  const { data, error } = await supabase
    .from('rentals')
    .select('start_date, end_date, total_price, status')
  if (error) throw error

  const todayRentals = data.filter(r =>
    r.status === 'active' && r.start_date <= today && r.end_date >= today
  ).length

  const monthRevenue = data
    .filter(r => r.status === 'returned' && r.start_date >= startOfMonth)
    .reduce((sum, r) => sum + Number(r.total_price), 0)

  return { todayRentals, monthRevenue }
}
