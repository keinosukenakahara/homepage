'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Project { id: string; project_name: string; abbreviation?: string }
interface StaffMember { id: string; full_name: string }
interface ReportRow {
  id: string; work_date: string; status: string; total_amount?: number
  staff: { id: string; full_name: string }
  project: { id: string; project_name: string }
  items: { id: string; item_name: string; unit_price: number; quantity: number; amount: number }[]
}

export default function AcceptanceClient({
  projects, staffList, defaultYear, defaultMonth
}: { projects: Project[]; staffList: StaffMember[]; defaultYear: number; defaultMonth: number }) {
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState(defaultMonth)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingReport, setEditingReport] = useState<ReportRow | null>(null)
  const supabase = createClient()

  const loadReports = async () => {
    setLoading(true)
    let query = supabase
      .from('reports')
      .select('*, staff:staff_id(id, full_name), project:project_id(id, project_name), items:report_items(*)')
      .eq('status', 'reconciled')
      .gte('work_date', `${year}-${String(month).padStart(2,'0')}-01`)
      .lte('work_date', `${year}-${String(month).padStart(2,'0')}-31`)

    if (selectedProject) query = query.eq('project_id', selectedProject)
    if (selectedStaff) query = query.eq('staff_id', selectedStaff)

    const { data } = await query.order('work_date')
    setReports(data || [])
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [selectedProject, selectedStaff, year, month])

  // スタッフ×案件でグループ化
  const grouped: Record<string, { staff: StaffMember; project: Project; rows: ReportRow[]; total: number }> = {}
  reports.forEach(r => {
    const key = `${r.staff.id}-${r.project.id}`
    if (!grouped[key]) {
      grouped[key] = { staff: r.staff as any, project: r.project as any, rows: [], total: 0 }
    }
    grouped[key].rows.push(r)
    grouped[key].total += r.total_amount || 0
  })

  const grandTotal = Object.values(grouped).reduce((s, g) => s + g.total, 0)

  const handleBulkFinalize = async () => {
    if (!confirm(`${Object.keys(grouped).length}件を確定（仕入確定）しますか？`)) return
    setSaving(true)
    const ids = reports.map(r => r.id)
    await supabase.from('reports').update({ status: 'finalized', finalized_at: new Date().toISOString() }).in('id', ids)
    await loadReports()
    setSaving(false)
    alert('仕入確定しました。支払通知書を発行してください。')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">仕入確定（検収）</h2>
        <button onClick={handleBulkFinalize} disabled={reports.length === 0 || saving}
          className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-800 disabled:opacity-40">
          ✓ 全件 仕入確定
        </button>
      </div>

      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">案件</label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">すべて</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">スタッフ</label>
          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">すべて</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">対象年月</label>
          <div className="flex gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">読み込み中...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">
          突合済みのレポートがありません（「レポート管理」で突合確定してください）
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm text-blue-700 font-medium">当月合計仕入額</span>
            <span className="text-2xl font-bold text-blue-800">¥{grandTotal.toLocaleString()}</span>
          </div>

          <div className="space-y-3">
            {Object.entries(grouped).map(([key, group]) => (
              <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <div>
                    <span className="font-semibold text-gray-800">{group.staff.full_name}</span>
                    <span className="text-gray-400 mx-2">×</span>
                    <span className="text-gray-600">{group.project.project_name}</span>
                    <span className="ml-3 text-sm text-gray-500">{group.rows.length}日分</span>
                  </div>
                  <span className="font-bold text-blue-700">¥{group.total.toLocaleString()}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">日付</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(r => (
                      <tr key={r.id} className="border-t border-gray-50">
                        <td className="px-4 py-2 text-gray-600">
                          {format(new Date(r.work_date), 'M月d日（E）', { locale: ja })}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">¥{(r.total_amount||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
