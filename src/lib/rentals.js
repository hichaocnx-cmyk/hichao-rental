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
