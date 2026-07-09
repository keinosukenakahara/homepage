import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function StaffDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const { data: staffRecord } = await supabase
    .from('staff').select('id, full_name').eq('profile_id', user!.id).single()

  if (!staffRecord) return <div className="p-4 text-gray-500">スタッフ情報が見つかりません</div>

  // 今日の案件
  const { data: todayArr } = await supabase
    .from('arrangements')
    .select('*, project:project_id(project_name, abbreviation, client:clients(client_name))')
    .eq('staff_id', staffRecord.id)
    .eq('work_date', today)
    .neq('status', 'cancelled')

  // 今月の稼働
  const startDate = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`
  const { data: monthArr } = await supabase
    .from('arrangements')
    .select('work_date, status, project:project_id(project_name, abbreviation)')
    .eq('staff_id', staffRecord.id)
    .gte('work_date', startDate)
    .neq('status', 'cancelled')
    .order('work_date')

  // 未読支払通知書
  const { count: newNotices } = await supabase
    .from('payment_notices')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', staffRecord.id)
    .eq('status', 'provisional')

  return (
    <div className="p-4 space-y-4 pt-4">
      <p className="text-gray-500 text-sm">{format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}</p>

      {/* 今日の案件 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-green-800 text-white px-4 py-3">
          <h2 className="font-semibold text-sm">本日の案件</h2>
        </div>
        <div className="p-4">
          {!todayArr || todayArr.length === 0 ? (
            <p className="text-gray-400 text-sm">本日の案件はありません</p>
          ) : todayArr.map((a: any) => (
            <div key={a.id} className="border border-gray-100 rounded-lg p-3 mb-2">
              <p className="font-semibold text-gray-800">{a.project?.project_name}</p>
              <p className="text-xs text-gray-500 mt-1">{a.project?.client?.client_name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${a.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {a.status === 'confirmed' ? '承諾済み' : '未承諾'}
                </span>
                {a.status === 'arranged' && (
                  <Link href={`/staff/reports?date=${today}&project=${a.project_id}`}
                    className="text-xs text-green-700 font-medium hover:underline">
                    レポート入力 →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* クイックリンク */}
      {(newNotices || 0) > 0 && (
        <Link href="/staff/payment-notices"
          className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <span className="text-sm font-medium text-yellow-800">💴 支払通知書が届いています</span>
          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">{newNotices}件</span>
        </Link>
      )}

      {/* 今月の稼働 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">今月の稼働（{currentMonth}月）</h3>
        {!monthArr || monthArr.length === 0 ? (
          <p className="text-gray-400 text-sm">今月の稼働はありません</p>
        ) : (
          <div className="space-y-1">
            {monthArr.map((a: any) => (
              <div key={a.work_date + a.project_id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                <span className="text-gray-600">{format(new Date(a.work_date), 'M/d（E）', { locale: ja })}</span>
                <span className="text-gray-700">{a.project?.project_name}</span>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-1">合計 {monthArr.length}日</p>
          </div>
        )}
      </div>
    </div>
  )
}
