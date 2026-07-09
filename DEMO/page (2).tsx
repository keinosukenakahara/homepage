import { createClient } from '@/lib/supabase/server'
import ArrangementGridClient from './ArrangementGridClient'

export default async function ArrangementsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name, abbreviation')
    .eq('is_active', true)
    .order('project_name')

  const { data: employee } = await supabase.auth.getUser()
  const { data: empRecord } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', employee.user?.id)
    .single()

  return (
    <ArrangementGridClient
      projects={projects || []}
      currentEmployeeId={empRecord?.id || null}
    />
  )
}
