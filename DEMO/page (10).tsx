import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects').select('id, project_name, abbreviation')
    .eq('is_active', true).order('project_name')

  const { data: reports } = await supabase
    .from('reports')
    .select(`*, staff:staff_id(id, full_name), project:project_id(id, project_name, abbreviation), items:report_items(*, unit_price:unit_price_id(item_name))`)
    .in('status', ['submitted', 'approved', 'reconciled'])
    .order('work_date', { ascending: false })
    .limit(200)

  return <ReportsClient initialReports={reports || []} projects={projects || []} />
}
