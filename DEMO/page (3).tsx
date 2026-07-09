import { createClient } from '@/lib/supabase/server'
import ClientsListClient from './ClientsListClient'
export default async function ClientsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('clients').select('*').order('client_name')
  return <ClientsListClient clients={data || []} />
}
