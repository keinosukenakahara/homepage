import { createClient } from '@/lib/supabase/server'
import StaffReportClient from './StaffReportClient'

export default async function StaffReportsPage({ searchParams }: { searchParams: { date?: string; project?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRecord } = await supabase.from('staff').select('id').eq('profile_id', user!.id).single()

  // 担当案件一覧
  const { data: ps } = await supabase
    .from('project_staff')
    .select('project:project_id(id, project_name, unit_prices:project_unit_prices(*))')
    .eq('staff_id', staffRecord?.id)
    .eq('is_active', true)
  const projects = (ps || []).map((r: any) => r.project).filter(Boolean)

  return (
    <StaffReportClient
      staffId={staffRecord?.id || ''}
      projects={projects}
      defaultDate={searchParams.date}
      defaultProjectId={searchParams.project}
    />
  )
}
