import { createClient } from '@/lib/supabase/server'
import PaymentNoticesClient from './PaymentNoticesClient'

export default async function PaymentNoticesPage() {
  const supabase = await createClient()
  const now = new Date()
  const { data: staffList } = await supabase.from('staff').select('id, full_name').eq('is_active', true).order('full_name')
  const { data: notices } = await supabase
    .from('payment_notices')
    .select('*, staff:staff_id(id, full_name)')
    .order('target_year', { ascending: false })
    .order('target_month', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)
  return <PaymentNoticesClient notices={notices || []} staffList={staffList || []} defaultYear={now.getFullYear()} defaultMonth={now.getMonth()+1} />
}
