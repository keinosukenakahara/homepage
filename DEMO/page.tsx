import { createClient } from '@/lib/supabase/server'
import AcceptanceClient from './AcceptanceClient'

export default async function AcceptancePage() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: projects } = await supabase
    .from('projects').select('id, project_name, abbreviation')
    .eq('is_active', true).order('project_name')

  const { data: staff } = await supabase
    .from('staff').select('id, full_name').eq('is_active', true).order('full_name')

  return <AcceptanceClient projects={projects || []} staffList={staff || []} defaultYear={year} defaultMonth={month} />
}
