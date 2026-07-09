import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffNav from './StaffNav'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'staff') redirect('/admin/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold">スタッフポータル</h1>
        <span className="text-sm text-green-200">{profile?.full_name}</span>
      </header>
      <div className="max-w-2xl mx-auto pb-20">
        {children}
      </div>
      <StaffNav />
    </div>
  )
}
