import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // 今日の手配数
  const { count: todayArrangements } = await supabase
    .from('arrangements')
    .select('*', { count: 'exact', head: true })
    .eq('work_date', today)
    .neq('status', 'cancelled')

  // 未確定レポート数
  const { count: pendingReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .in('status', ['submitted'])

  // 今月の支払通知書（仮確定）
  const { count: provisionalNotices } = await supabase
    .from('payment_notices')
    .select('*', { count: 'exact', head: true })
    .eq('target_year', currentYear)
    .eq('target_month', currentMonth)
    .eq('status', 'provisional')

  // 今日の案件一覧
  const { data: todaySchedule } = await supabase
    .from('arrangements')
    .select(`
      *,
      staff(full_name),
      project:projects(project_name, abbreviation, client:clients(client_name))
    `)
    .eq('work_date', today)
    .neq('status', 'cancelled')
    .order('project_id')

  // プロジェクト別にグループ化
  const byProject: Record<string, { projectName: string; clientName: string; staff: string[] }> = {}
  todaySchedule?.forEach((a: any) => {
    const pid = a.project_id
    if (!byProject[pid]) {
      byProject[pid] = {
        projectName: a.project?.project_name || '',
        clientName: a.project?.client?.client_name || '',
        staff: [],
      }
    }
    byProject[pid].staff.push(a.staff?.full_name || '')
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">
        ダッシュボード
        <span className="ml-3 text-sm font-normal text-gray-500">
          {format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}
        </span>
      </h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">本日の手配数</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{todayArrangements ?? 0}
            <span className="text-sm font-normal text-gray-400 ml-1">件</span>
          </p>
          <Link href="/admin/arrangements" className="text-xs text-blue-600 mt-2 inline-block hover:underline">
            手配画面へ →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">承認待ちレポート</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{pendingReports ?? 0}
            <span className="text-sm font-normal text-gray-400 ml-1">件</span>
          </p>
          <Link href="/admin/reports" className="text-xs text-blue-600 mt-2 inline-block hover:underline">
            レポート確認へ →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">仮確定済み通知書</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{provisionalNotices ?? 0}
            <span className="text-sm font-normal text-gray-400 ml-1">件</span>
          </p>
          <Link href="/admin/payment-notices" className="text-xs text-blue-600 mt-2 inline-block hover:underline">
            支払通知書へ →
          </Link>
        </div>
      </div>

      {/* 本日の案件一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-4">本日の手配状況</h3>
        {Object.keys(byProject).length === 0 ? (
          <p className="text-sm text-gray-400">本日の手配はありません</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(byProject).map(([pid, info]) => (
              <div key={pid} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{info.projectName}</p>
                  <p className="text-xs text-gray-500">{info.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">{info.staff.join('、')}</p>
                  <p className="text-xs text-gray-400">{info.staff.length}名</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* クイックリンク */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-4">クイックアクセス</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { href: '/admin/arrangements', label: '手配入力', icon: '📋', color: 'blue' },
            { href: '/admin/reports', label: 'レポート確認', icon: '📊', color: 'orange' },
            { href: '/admin/acceptance', label: '仕入確定', icon: '✅', color: 'green' },
            { href: '/admin/payment-notices', label: '支払通知書', icon: '💴', color: 'purple' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs text-gray-700 font-medium text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
