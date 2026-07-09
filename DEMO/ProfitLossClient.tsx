'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfitLossClient({ clients }: { clients: any[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const start = `${year}-${String(month).padStart(2,'0')}-01`
      const end = `${year}-${String(month).padStart(2,'0')}-31`
      const { data: reports } = await supabase.from('reports')
        .select('total_amount, project:project_id(project_name, client:clients(id, client_name))')
        .gte('work_date', start).lte('work_date', end)
        .in('status', ['approved','reconciled','finalized'])
      // クライアント→案件でグループ化
      const grouped: Record<string, { clientName: string; projects: Record<string, { name: string; cost: number }> }> = {}
      reports?.forEach((r: any) => {
        const clientId = r.project?.client?.id || 'unknown'
        const clientName = r.project?.client?.client_name || '不明'
        const projName = r.project?.project_name || '不明'
        if (!grouped[clientId]) grouped[clientId] = { clientName, projects: {} }
        if (!grouped[clientId].projects[projName]) grouped[clientId].projects[projName] = { name: projName, cost: 0 }
        grouped[clientId].projects[projName].cost += r.total_amount || 0
      })
      setData(Object.values(grouped))
      setLoading(false)
    }
    load()
  }, [year, month])

  const grandTotal = data.reduce((s, c) => s + Object.values(c.projects as any).reduce((s2: number, p: any) => s2 + p.cost, 0), 0)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">収支確認</h2>
      <div className="flex gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
      </div>
      {grandTotal > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between">
          <span className="text-blue-700 font-medium">当月仕入合計</span>
          <span className="text-xl font-bold text-blue-800">¥{grandTotal.toLocaleString()}</span>
        </div>
      )}
      {loading ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">読み込み中...</div> :
        data.length === 0 ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">データがありません</div> :
        data.map(client => {
          const clientTotal = Object.values(client.projects as any).reduce((s: number, p: any) => s + p.cost, 0)
          return (
            <div key={client.clientName} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex justify-between border-b border-gray-100">
                <span className="font-semibold text-gray-800">{client.clientName}</span>
                <span className="font-bold text-blue-700">¥{(clientTotal as number).toLocaleString()}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {Object.values(client.projects as any).map((p: any) => (
                    <tr key={p.name} className="border-t border-gray-50">
                      <td className="px-4 py-2 text-gray-600">{p.name}</td>
                      <td className="px-4 py-2 text-right font-medium">¥{p.cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      }
    </div>
  )
}
