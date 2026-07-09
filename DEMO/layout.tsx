import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'staff') {
    redirect('/staff/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div />
          <div className="text-sm text-gray-600">
            {profile?.full_name} <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {profile?.role === 'admin' ? '管理者' : profile?.role === 'arranger' ? '手配者' : 'スーパー管理者'}
            </span>
          </div>
        </header>
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
