import { createClient } from '@/lib/supabase/server'
import ProjectListClient from './ProjectListClient'

export default async function ProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select(`*, client:clients(id, client_name), unit_prices:project_unit_prices(*)`)
    .order('project_name')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, client_name')
    .eq('is_active', true)
    .order('client_name')

  return <ProjectListClient projects={projects || []} clients={clients || []} />
}
