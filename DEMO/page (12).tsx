import { createClient } from '@/lib/supabase/server'
import StaffListClient from './StaffListClient'

export default async function StaffPage() {
  const supabase = await createClient()

  const { data: staffList } = await supabase
    .from('staff')
    .select(`
      *,
      projects:project_staff(
        project:projects(id, project_name, abbreviation)
      )
    `)
    .order('full_name')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name, abbreviation')
    .eq('is_active', true)
    .order('project_name')

  return <StaffListClient staffList={staffList || []} allProjects={projects || []} />
}
