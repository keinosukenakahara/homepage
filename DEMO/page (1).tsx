import { createClient } from '@/lib/supabase/server'
import ArrangementConfirmClient from './ArrangementConfirmClient'
export default async function ArrangementConfirmPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, project_name, abbreviation').eq('is_active', true).order('project_name')
  const { data: staff } = await supabase.from('staff').select('id, full_name').eq('is_active', true).order('full_name')
  return <ArrangementConfirmClient projects={projects || []} staffList={staff || []} />
}
