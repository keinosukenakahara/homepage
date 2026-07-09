import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function StaffSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffRecord } = await supabase.from('staff').select('id').eq('profile_id', user!.id).single()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`

  const { data: arrangements } = await supabase
    .from('arrangements')
    .select('*, project:project_id(project_name)')
    .eq('staff_id', staffRecord?.id)
    .gte('work_date', startDate)
    .neq('status', 'cancelled')
    .order('work_date')

  const { data: reports } = await supabase
    .from('reports')
    .select('work_date, project_id, total_amount, status')
    .eq('staff_id', staffRecord?.id)
    .gte('work_date', startDate)

  const reportMap: Record<string, number> = {}
  reports?.forEach(r => { reportMap[r.work_date + r.project_id] = r.total_amount || 0 })

  const totalAmount = Object.values(reportMap).reduce((s, v) => s + v, 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">稼働実績</h2>
        <span className="text-sm text-gray-500">{year}年{month}月</span>
      </div>

      {totalAmount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex justify-between items-center">
          <span className="text-sm text-green-700">今月の売上合計</span>
          <span className="text-xl font-bold text-green-800">¥{totalAmount.toLocaleString()}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {!arrangements || arrangements.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">今月の稼働はありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">日付</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">案件</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">売上</th>
              </tr>
            </thead>
            <tbody>
              {arrangements.map((a: any) => {
                const amt = reportMap[a.work_date + a.project_id]
                return (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-600">
                      {format(new Date(a.work_date), 'M/d（E）', { locale: ja })}
                    </td>
                    <td className="px-4 py-2">{a.project?.project_name}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {amt ? `¥${amt.toLocaleString()}` : <span className="text-gray-300">未入力</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
