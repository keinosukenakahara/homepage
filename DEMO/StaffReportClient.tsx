'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface UnitPrice { id: string; item_name: string; unit_price: number; unit: string }
interface Project { id: string; project_name: string; unit_prices: UnitPrice[] }

export default function StaffReportClient({
  staffId, projects, defaultDate, defaultProjectId
}: { staffId: string; projects: Project[]; defaultDate?: string; defaultProjectId?: string }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(defaultDate || today)
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'input' | 'confirm' | 'done'>('input')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const selectedProject = projects.find(p => p.id === projectId)
  const unitPrices = selectedProject?.unit_prices || []

  const total = unitPrices.reduce((sum, up) => sum + (quantities[up.id] || 0) * up.unit_price, 0)

  const handleSubmit = async () => {
    setSaving(true)
    // レポート本体
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        project_id: projectId, staff_id: staffId, work_date: date,
        status: 'submitted', total_amount: total,
        submitted_by: 'staff', submitted_at: new Date().toISOString(),
      })
      .select().single()

    if (error || !report) { alert('送信エラー: ' + error?.message); setSaving(false); return }

    // 明細
    const items = unitPrices
      .filter(up => (quantities[up.id] || 0) > 0)
      .map(up => ({
        report_id: report.id, unit_price_id: up.id,
        item_name: up.item_name, unit_price: up.unit_price,
        quantity: quantities[up.id] || 0,
      }))

    if (items.length > 0) await supabase.from('report_items').insert(items)

    // レポート更新
    await supabase.from('reports').update({ total_amount: total }).eq('id', report.id)

    setStep('done')
    setSaving(false)
  }

  if (step === 'done') {
    return (
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h2 className="text-lg font-bold text-gray-800">レポートを送信しました</h2>
          <p className="text-sm text-gray-500">管理者が確認後、支払通知書に反映されます</p>
          <div className="pt-2">
            <button onClick={() => { setStep('input'); setQuantities({}); setNotes('') }}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm">
              別の日を入力
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">確認</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="text-sm grid grid-cols-2 gap-2">
            <span className="text-gray-500">日付</span><span className="font-medium">{format(new Date(date), 'M月d日（E）', { locale: ja })}</span>
            <span className="text-gray-500">案件</span><span className="font-medium">{selectedProject?.project_name}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-gray-500">項目</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500">件数</th>
                <th className="text-right px-3 py-2 text-xs text-gray-500">金額</th>
              </tr>
            </thead>
            <tbody>
              {unitPrices.filter(up => (quantities[up.id] || 0) > 0).map(up => (
                <tr key={up.id} className="border-t border-gray-50">
                  <td className="px-3 py-2">{up.item_name}</td>
                  <td className="px-3 py-2 text-right">{quantities[up.id]}</td>
                  <td className="px-3 py-2 text-right">¥{((quantities[up.id]||0)*up.unit_price).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-bold">
                <td colSpan={2} className="px-3 py-2 text-right">合計</td>
                <td className="px-3 py-2 text-right text-green-700">¥{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          {notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">備考：{notes}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep('input')} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm">
            修正する
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-3 bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? '送信中...' : '送信する'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">レポート入力</h2>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">日付</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">案件</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-green-800 text-white px-4 py-3 text-sm font-medium">件数入力</div>
        <div className="p-4 space-y-3">
          {unitPrices.map(up => (
            <div key={up.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{up.item_name}</p>
                <p className="text-xs text-gray-400">¥{up.unit_price.toLocaleString()} / {up.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantities(q => ({...q, [up.id]: Math.max(0, (q[up.id]||0)-1)}))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">－</button>
                <input
                  type="number" min="0" value={quantities[up.id] || ''}
                  onChange={e => setQuantities(q => ({...q, [up.id]: parseInt(e.target.value) || 0}))}
                  className="w-16 text-center border border-gray-300 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button onClick={() => setQuantities(q => ({...q, [up.id]: (q[up.id]||0)+1}))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">＋</button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">合計金額</span>
          <span className="text-lg font-bold text-green-700">¥{total.toLocaleString()}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">備考</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="特記事項があれば入力"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
      </div>

      <button onClick={() => setStep('confirm')} disabled={total === 0}
        className="w-full py-3 bg-green-700 text-white rounded-xl font-medium text-sm hover:bg-green-800 disabled:opacity-40">
        確認画面へ
      </button>
    </div>
  )
}
