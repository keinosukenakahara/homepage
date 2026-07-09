'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ReportItem { id: string; item_name: string; unit_price: number; quantity: number; amount: number }
interface Report {
  id: string; work_date: string; status: string; total_amount?: number
  submitted_by?: string; reconciliation_note?: string; notes?: string
  staff: { id: string; full_name: string }
  project: { id: string; project_name: string; abbreviation?: string }
  items: ReportItem[]
}
interface Project { id: string; project_name: string; abbreviation?: string }

const STATUS_LABELS: Record<string, string> = {
  submitted: '提出済み', approved: '承認済み(仮確定)', reconciled: '突合済み', finalized: '確定'
}
const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  reconciled: 'bg-purple-100 text-purple-700',
  finalized: 'bg-green-100 text-green-700',
}

export default function ReportsClient({ initialReports, projects }: { initialReports: Report[]; projects: Project[] }) {
  const [reports, setReports] = useState(initialReports)
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [detail, setDetail] = useState<Report | null>(null)
  const [reconciliationNote, setReconciliationNote] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const filtered = reports.filter(r => {
    const matchProject = !selectedProject || r.project.id === selectedProject
    const matchMonth = !selectedMonth || r.work_date.startsWith(selectedMonth)
    return matchProject && matchMonth
  })

  // 案件×日付でグループ化
  const grouped: Record<string, { projectName: string; date: string; rows: Report[] }> = {}
  filtered.forEach(r => {
    const key = `${r.project.id}-${r.work_date}`
    if (!grouped[key]) {
      grouped[key] = { projectName: r.project.project_name, date: r.work_date, rows: [] }
    }
    grouped[key].rows.push(r)
  })

  const handleApprove = async (reportId: string) => {
    setSaving(true)
    await supabase.from('reports').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', reportId)
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'approved' } : r))
    if (detail?.id === reportId) setDetail(prev => prev ? { ...prev, status: 'approved' } : null)
    setSaving(false)
  }

  const handleFinalize = async (reportId: string) => {
    setSaving(true)
    const updates: any = { status: 'reconciled', finalized_at: new Date().toISOString() }
    if (reconciliationNote) updates.reconciliation_note = reconciliationNote
    await supabase.from('reports').update(updates).eq('id', reportId)
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'reconciled', ...updates } : r))
    if (detail?.id === reportId) setDetail(prev => prev ? { ...prev, ...updates } : null)
    setReconciliationNote('')
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">レポート管理</h2>

      <div className="flex gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">案件</label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">すべて</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">対象年月</label>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">日付</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">案件</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">スタッフ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">提出方法</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">金額</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {format(new Date(r.work_date), 'M/d（E）', { locale: ja })}
                </td>
                <td className="px-4 py-3 font-medium">{r.project.project_name}</td>
                <td className="px-4 py-3">{r.staff.full_name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {r.submitted_by === 'staff' ? 'スタッフ報告' : '管理者入力'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  ¥{(r.total_amount || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status] || ''}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { setDetail(r); setReconciliationNote(r.reconciliation_note || '') }}
                    className="text-blue-600 hover:underline text-xs">詳細</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">レポートがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 詳細モーダル */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">レポート詳細</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">スタッフ：</span><strong>{detail.staff.full_name}</strong></div>
                <div><span className="text-gray-500">日付：</span><strong>{format(new Date(detail.work_date), 'M月d日（E）', { locale: ja })}</strong></div>
                <div><span className="text-gray-500">案件：</span><strong>{detail.project.project_name}</strong></div>
                <div><span className="text-gray-500">状態：</span><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[detail.status]}`}>{STATUS_LABELS[detail.status]}</span></div>
              </div>

              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">項目</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">単価</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">件数</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map(item => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{item.item_name}</td>
                      <td className="px-3 py-2 text-right">¥{item.unit_price.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium">¥{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={3} className="px-3 py-2 font-bold text-right">合計</td>
                    <td className="px-3 py-2 font-bold text-right text-blue-700">¥{(detail.total_amount || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {detail.notes && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium">備考：</span>{detail.notes}
                </div>
              )}

              {/* 突合備考 */}
              {['approved', 'submitted'].includes(detail.status) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">突合備考（修正時に記入）</label>
                  <textarea value={reconciliationNote} onChange={e => setReconciliationNote(e.target.value)}
                    rows={2} placeholder="局NC突合で件数修正があった場合など"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              )}

              {detail.reconciliation_note && (
                <div className="text-sm bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <span className="font-medium text-orange-700">突合備考：</span>{detail.reconciliation_note}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDetail(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                閉じる
              </button>
              {detail.status === 'submitted' && (
                <button onClick={() => handleApprove(detail.id)} disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  仮確定（承認）
                </button>
              )}
              {detail.status === 'approved' && (
                <button onClick={() => handleFinalize(detail.id)} disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  突合確定
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
