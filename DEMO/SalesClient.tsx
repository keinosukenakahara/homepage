'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function SalesClient({ projects, clients }: { projects: any[]; clients: any[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)
  const [selectedProject, setSelectedProject] = useState('')
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const start = `${year}-${String(month).padStart(2,'0')}-01`
      const end = `${year}-${String(month).padStart(2,'0')}-31`
      let q = supabase.from('reports')
        .select('*, staff:staff_id(full_name), project:project_id(project_name, abbreviation, client:clients(client_name)), items:report_items(*)')
        .gte('work_date', start).lte('work_date', end)
        .in('status', ['approved','reconciled','finalized'])
        .order('work_date')
      if (selectedProject) q = q.eq('project_id', selectedProject)
      const { data } = await q
      setReports(data || [])
      setLoading(false)
    }
    load()
  }, [year, month, selectedProject])

  const total = reports.reduce((s, r) => s + (r.total_amount || 0), 0)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">売上明細</h2>
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">すべての案件</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
        </select>
      </div>

      {total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between">
          <span className="text-blue-700 font-medium">合計仕入額</span>
          <span className="text-xl font-bold text-blue-800">¥{total.toLocaleString()}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">日付</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">案件</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">スタッフ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">金額</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
            ) : reports.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{format(new Date(r.work_date), 'M/d（E）', { locale: ja })}</td>
                <td className="px-4 py-3">{r.project?.project_name}</td>
                <td className="px-4 py-3">{r.staff?.full_name}</td>
                <td className="px-4 py-3 text-right font-medium">¥{(r.total_amount||0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${r.status==='finalized'?'bg-green-100 text-green-700':r.status==='reconciled'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>
                    {r.status==='finalized'?'確定':r.status==='reconciled'?'突合済':'承認済'}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && reports.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">データがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
