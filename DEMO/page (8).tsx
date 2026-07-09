import { createClient } from '@/lib/supabase/server'
import ProfitLossClient from './ProfitLossClient'

export default async function ProfitLossPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, client_name').eq('is_active', true).order('client_name')
  return <ProfitLossClient clients={clients || []} />
}
