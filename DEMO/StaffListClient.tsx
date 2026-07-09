'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project { id: string; project_name: string; abbreviation?: string }
interface StaffRecord {
  id: string; full_name: string; email: string; phone?: string
  postal_code?: string; address?: string; invoice_number?: string
  bank_name?: string; bank_branch?: string; bank_account_type?: string
  bank_account_number?: string; bank_account_holder?: string
  is_active: boolean; notes?: string
  projects?: { project: Project }[]
}

export default function StaffListClient({
  staffList, allProjects
}: { staffList: StaffRecord[]; allProjects: Project[] }) {
  const [staff, setStaff] = useState(staffList)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StaffRecord | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', postal_code: '', address: '',
    invoice_number: '', bank_name: '', bank_branch: '',
    bank_account_type: '普通', bank_account_number: '', bank_account_holder: '',
    notes: '', is_active: true,
    project_ids: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const openNew = () => {
    setEditing(null)
    setForm({
      full_name: '', email: '', phone: '', postal_code: '', address: '',
      invoice_number: '', bank_name: '', bank_branch: '',
      bank_account_type: '普通', bank_account_number: '', bank_account_holder: '',
      notes: '', is_active: true, project_ids: [],
    })
    setShowModal(true)
  }

  const openEdit = (s: StaffRecord) => {
    setEditing(s)
    setForm({
      full_name: s.full_name, email: s.email, phone: s.phone || '',
      postal_code: s.postal_code || '', address: s.address || '',
      invoice_number: s.invoice_number || '', bank_name: s.bank_name || '',
      bank_branch: s.bank_branch || '', bank_account_type: s.bank_account_type || '普通',
      bank_account_number: s.bank_account_number || '',
      bank_account_holder: s.bank_account_holder || '',
      notes: s.notes || '', is_active: s.is_active,
      project_ids: s.projects?.map(p => p.project.id) || [],
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const { project_ids, ...staffData } = form

    let staffId: string
    if (editing) {
      const { error } = await supabase.from('staff').update(staffData).eq('id', editing.id)
      if (error) { alert('保存エラー: ' + error.message); setSaving(false); return }
      staffId = editing.id
    } else {
      const { data, error } = await supabase.from('staff').insert(staffData).select().single()
      if (error || !data) { alert('保存エラー: ' + error?.message); setSaving(false); return }
      staffId = data.id
    }

    // 担当案件の更新
    await supabase.from('project_staff').delete().eq('staff_id', staffId)
    if (project_ids.length > 0) {
      await supabase.from('project_staff').insert(
        project_ids.map(pid => ({ project_id: pid, staff_id: staffId }))
      )
    }

    // リスト更新
    const { data: updated } = await supabase
      .from('staff')
      .select('*, projects:project_staff(project:projects(id, project_name, abbreviation))')
      .order('full_name')
    setStaff(updated || [])
    setShowModal(false)
    setSaving(false)
  }

  const handlePasswordReset = async (email: string) => {
    const supabaseAdmin = createClient()
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/staff/reset-password`
    })
    alert(`パスワードリセットメールを ${email} に送信しました`)
  }

  const filtered = staff.filter(s =>
    s.full_name.includes(search) || s.email.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">スタッフ管理</h2>
        <button onClick={openNew} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
          ＋ 新規登録
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="text" placeholder="氏名・メールで検索..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">氏名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">メール</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">電話</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">担当案件</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{s.email}</td>
                <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.projects?.map(p => (
                      <span key={p.project.id} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        {p.project.abbreviation || p.project.project_name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs mr-3">編集</button>
                  <button onClick={() => handlePasswordReset(s.email)} className="text-gray-500 hover:underline text-xs">PW初期化</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">スタッフが登録されていません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 登録・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing ? 'スタッフ編集' : 'スタッフ新規登録'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">氏名 *</label>
                  <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">インボイス番号</label>
                  <input value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})}
                    placeholder="T1234567890123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                <div className="flex gap-2 mb-2">
                  <input value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})}
                    placeholder="〒000-0000"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  placeholder="都道府県・市区町村・番地"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-sm text-gray-700 mb-3">振込口座</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">銀行名</label>
                    <input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">支店名</label>
                    <input value={form.bank_branch} onChange={e => setForm({...form, bank_branch: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">科目</label>
                    <select value={form.bank_account_type} onChange={e => setForm({...form, bank_account_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option>普通</option><option>当座</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">口座番号</label>
                    <input value={form.bank_account_number} onChange={e => setForm({...form, bank_account_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">口座名義</label>
                    <input value={form.bank_account_holder} onChange={e => setForm({...form, bank_account_holder: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">担当案件</label>
                <div className="grid grid-cols-2 gap-2 p-3 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {allProjects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.project_ids.includes(p.id)}
                        onChange={e => {
                          setForm({...form, project_ids: e.target.checked
                            ? [...form.project_ids, p.id]
                            : form.project_ids.filter(id => id !== p.id)
                          })
                        }}
                        className="rounded"
                      />
                      {p.project_name}
                      {p.abbreviation && <span className="text-gray-400">({p.abbreviation})</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={e => setForm({...form, is_active: e.target.checked})} className="rounded" />
                <label htmlFor="is_active" className="text-sm text-gray-700">有効</label>
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
