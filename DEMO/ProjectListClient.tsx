'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Client { id: string; client_name: string }
interface UnitPrice { id?: string; item_name: string; unit_price: number; unit: string; sort_order: number }
interface Project {
  id: string; project_name: string; project_code?: string; abbreviation?: string
  work_description?: string; work_description_notes?: string
  project_type: string; is_active: boolean; client_id: string
  client?: Client; unit_prices?: UnitPrice[]
}

const emptyPrice = (): UnitPrice => ({ item_name: '', unit_price: 0, unit: '件', sort_order: 0 })

export default function ProjectListClient({
  projects, clients
}: { projects: Project[]; clients: Client[] }) {
  const [list, setList] = useState(projects)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState({
    project_name: '', project_code: '', abbreviation: '', client_id: '',
    work_description: '', work_description_notes: '',
    project_type: 'general', is_active: true,
  })
  const [prices, setPrices] = useState<UnitPrice[]>([emptyPrice()])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const openNew = () => {
    setEditing(null)
    setForm({ project_name: '', project_code: '', abbreviation: '', client_id: clients[0]?.id || '',
      work_description: '', work_description_notes: '', project_type: 'general', is_active: true })
    setPrices([emptyPrice(), emptyPrice(), emptyPrice(), emptyPrice(), emptyPrice()])
    setShowModal(true)
  }

  const openEdit = (p: Project) => {
    setEditing(p)
    setForm({ project_name: p.project_name, project_code: p.project_code || '',
      abbreviation: p.abbreviation || '', client_id: p.client_id,
      work_description: p.work_description || '', work_description_notes: p.work_description_notes || '',
      project_type: p.project_type, is_active: p.is_active })
    const existingPrices = p.unit_prices || []
    setPrices(existingPrices.length > 0 ? existingPrices : [emptyPrice(), emptyPrice(), emptyPrice()])
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    let projectId: string

    if (editing) {
      const { error } = await supabase.from('projects').update(form).eq('id', editing.id)
      if (error) { alert('保存エラー: ' + error.message); setSaving(false); return }
      projectId = editing.id
      // 既存単価削除
      await supabase.from('project_unit_prices').delete().eq('project_id', projectId)
    } else {
      const { data, error } = await supabase.from('projects').insert(form).select().single()
      if (error || !data) { alert('保存エラー: ' + error?.message); setSaving(false); return }
      projectId = data.id
    }

    // 単価一括登録（空行スキップ）
    const validPrices = prices
      .filter(p => p.item_name.trim())
      .map((p, i) => ({ ...p, project_id: projectId, sort_order: i }))

    if (validPrices.length > 0) {
      await supabase.from('project_unit_prices').insert(validPrices)
    }

    const { data: updated } = await supabase
      .from('projects')
      .select('*, client:clients(id, client_name), unit_prices:project_unit_prices(*)')
      .order('project_name')
    setList(updated || [])
    setShowModal(false)
    setSaving(false)
  }

  const addPriceRow = () => setPrices([...prices, emptyPrice()])
  const updatePrice = (i: number, key: keyof UnitPrice, value: string | number) => {
    const next = [...prices]
    next[i] = { ...next[i], [key]: value }
    setPrices(next)
  }
  const removePrice = (i: number) => setPrices(prices.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">案件管理</h2>
        <button onClick={openNew} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
          ＋ 新規案件
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">案件名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">略称</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">クライアント</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">区分</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">単価</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.project_name}</td>
                <td className="px-4 py-3 text-gray-500">{p.abbreviation}</td>
                <td className="px-4 py-3 text-gray-600">{p.client?.client_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${p.project_type === 'delivery' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.project_type === 'delivery' ? '宅配' : '一般'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {p.unit_prices?.filter(u => u.item_name).map(u =>
                    `${u.item_name}:¥${u.unit_price.toLocaleString()}`
                  ).join(' / ')}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.is_active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">編集</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">案件が登録されていません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing ? '案件編集' : '案件新規登録'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">案件名 *</label>
                  <input value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">略称</label>
                  <input value={form.abbreviation} onChange={e => setForm({...form, abbreviation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">クライアント *</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">区分</label>
                  <select value={form.project_type} onChange={e => setForm({...form, project_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="general">一般</option>
                    <option value="delivery">宅配</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作業内容</label>
                <textarea value={form.work_description} onChange={e => setForm({...form, work_description: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作業内容補足</label>
                <textarea value={form.work_description_notes} onChange={e => setForm({...form, work_description_notes: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* 単価一覧 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">単価一覧</label>
                  <button onClick={addPriceRow} className="text-xs text-blue-600 hover:underline">＋ 行追加</button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">商品名・項目名</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-28">単価（円）</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-20">単位</th>
                        <th className="w-8 px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {prices.map((p, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-2 py-1">
                            <input value={p.item_name} onChange={e => updatePrice(i, 'item_name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </td>
                          <td className="px-2 py-1">
                            <input type="number" value={p.unit_price || ''} onChange={e => updatePrice(i, 'unit_price', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 text-right" />
                          </td>
                          <td className="px-2 py-1">
                            <input value={p.unit} onChange={e => updatePrice(i, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </td>
                          <td className="px-1 py-1">
                            <button onClick={() => removePrice(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="proj_active" checked={form.is_active}
                  onChange={e => setForm({...form, is_active: e.target.checked})} className="rounded" />
                <label htmlFor="proj_active" className="text-sm text-gray-700">有効</label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800 disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
