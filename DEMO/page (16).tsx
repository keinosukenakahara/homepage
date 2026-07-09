import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function StaffPaymentNoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRecord } = await supabase.from('staff').select('id').eq('profile_id', user!.id).single()

  const { data: notices } = await supabase
    .from('payment_notices')
    .select('*')
    .eq('staff_id', staffRecord?.id)
    .order('target_year', { ascending: false })
    .order('target_month', { ascending: false })

  // 年別グループ化
  const byYear: Record<number, typeof notices> = {}
  notices?.forEach(n => {
    if (!byYear[n.target_year]) byYear[n.target_year] = []
    byYear[n.target_year]!.push(n)
  })

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">支払通知書</h2>
      {Object.keys(byYear).length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">支払通知書がありません</div>
      ) : Object.entries(byYear).sort(([a],[b]) => Number(b)-Number(a)).map(([year, yearNotices]) => (
        <div key={year} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
            <span className="font-semibold text-gray-700">{year}年</span>
          </div>
          <div className="divide-y divide-gray-50">
            {yearNotices?.map(n => (
              <div key={n.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.target_month}月分</p>
                  <p className="text-xs text-gray-400">
                    {n.status === 'finalized' ? '確定済み' : '仮確定'}
                    {n.issued_at && ` · 発行日：${format(new Date(n.issued_at), 'M/d')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800">¥{(n.total_amount||0).toLocaleString()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${n.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {n.status === 'finalized' ? '確定' : '仮'}
                  </span>
                  {n.pdf_url && (
                    <a href={n.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">PDF</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
