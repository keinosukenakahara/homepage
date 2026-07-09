'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Notice {
  id: string; target_year: number; target_month: number; status: string
  total_amount?: number; pdf_url?: string; issued_at?: string; finalized_at?: string
  reconciliation_note?: string; notes?: string
  staff: { id: string; full_name: string }
}
interface StaffMember { id: string; full_name: string }

export default function PaymentNoticesClient({
  notices, staffList, defaultYear, defaultMonth
}: { notices: Notice[]; staffList: StaffMember[]; defaultYear: number; defaultMonth: number }) {
  const [list, setList] = useState(notices)
  const [filterYear, setFilterYear] = useState(defaultYear)
  const [filterMonth, setFilterMonth] = useState(defaultMonth)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  const filtered = list.filter(n => n.target_year === filterYear && n.target_month === filterMonth)

  const handleGenerate = async () => {
    if (!confirm(`${filterYear}年${filterMonth}月の支払通知書を一括生成しますか？`)) return
    setGenerating(true)
    const res = await fetch('/api/payment-notices/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: filterYear, month: filterMonth }),
    })
    const data = await res.json()
    const { data: updated } = await supabase
      .from('payment_notices')
      .select('*, staff:staff_id(id, full_name)')
      .order('target_year', { ascending: false })
      .order('target_month', { ascending: false })
      .limit(500)
    setList(updated || [])
    setGenerating(false)
    alert(`${data.created || 0}件の支払通知書を生成しました`)
  }

  const handleFinalize = async (id: string) => {
    await supabase.from('payment_notices').update({ status: 'finalized', finalized_at: new Date().toISOString() }).eq('id', id)
    setList(prev => prev.map(n => n.id === id ? { ...n, status: 'finalized', finalized_at: new Date().toISOString() } : n))
  }

  const handleBulkFinalize = async () => {
    const ids = filtered.filter(n => n.status === 'provisional').map(n => n.id)
    if (ids.length === 0) { alert('仮確定の通知書がありません'); return }
    if (!confirm(`${ids.length}件を確定しますか？`)) return
    await supabase.from('payment_notices').update({ status: 'finalized', finalized_at: new Date().toISOString() }).in('id', ids)
    setList(prev => prev.map(n => ids.includes(n.id) ? { ...n, status: 'finalized' } : n))
  }

  const provisionalCount = filtered.filter(n => n.status === 'provisional').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">支払通知書</h2>
        <div className="flex gap-2">
          <button onClick={handleGenerate} disabled={generating}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-40">
            {generating ? '生成中...' : '📄 一括生成'}
          </button>
          {provisionalCount > 0 && (
            <button onClick={handleBulkFinalize}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800">
              ✓ 全件確定（{provisionalCount}件）
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">スタッフ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">金額</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">突合備考</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(n => (
              <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{n.staff.full_name}</td>
                <td className="px-4 py-3 text-right font-medium">¥{(n.total_amount||0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${n.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {n.status === 'finalized' ? '確定' : '仮確定'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{n.reconciliation_note}</td>
                <td className="px-4 py-3 flex gap-2">
                  {n.pdf_url && <a href={n.pdf_url} target="_blank" className="text-blue-600 hover:underline text-xs">PDF</a>}
                  {n.status === 'provisional' && (
                    <button onClick={() => handleFinalize(n.id)} className="text-green-600 hover:underline text-xs">確定</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                この月の支払通知書がありません（「一括生成」で作成してください）
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
