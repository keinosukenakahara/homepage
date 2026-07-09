import { createClient } from '@/lib/supabase/server'
import SalesClient from './SalesClient'

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from('projects').select('id, project_name, abbreviation').eq('is_active', true).order('project_name')
  const { data: clients } = await supabase.from('clients').select('id, client_name').eq('is_active', true).order('client_name')
  return <SalesClient projects={projects || []} clients={clients || []} />
}
