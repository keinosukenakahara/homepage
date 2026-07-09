'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
interface Employee { id: string; full_name: string; email: string; phone?: string; role: string; department?: string; is_active: boolean }
export default function EmployeesClient({ employees }: { employees: Employee[] }) {
  const [list, setList] = useState(employees)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', role:'arranger', department:'', is_active:true })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const openNew = () => { setEditing(null); setForm({ full_name:'', email:'', phone:'', role:'arranger', department:'', is_active:true }); setShowModal(true) }
  const openEdit = (e: Employee) => { setEditing(e); setForm({ full_name:e.full_name, email:e.email, phone:e.phone||'', role:e.role, department:e.department||'', is_active:e.is_active }); setShowModal(true) }
  const handleSave = async () => {
    setSaving(true)
    if (editing) {
      await supabase.from('employees').update(form).eq('id', editing.id)
    } else {
      await supabase.from('employees').insert(form)
    }
    const { data } = await supabase.from('employees').select('*').order('full_name')
    setList(data || [])
    setShowModal(false); setSaving(false)
  }
  const handlePasswordReset = async (email: string) => {
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/reset-password` })
    alert(`パスワードリセットメールを ${email} に送信しました`)
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">社員管理</h2>
        <button onClick={openNew} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">＋ 社員追加</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">氏名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">メール</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">権限</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">部署</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(e => (
              <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{e.email}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${e.role==='admin'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{e.role==='admin'?'管理者':'手配者'}</span></td>
                <td className="px-4 py-3 text-gray-500">{e.department}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(e)} className="text-blue-600 hover:underline text-xs">編集</button>
                  <button onClick={() => handlePasswordReset(e.email)} className="text-gray-500 hover:underline text-xs">PW初期化</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing?'社員編集':'社員追加'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-3">
              {[['full_name','氏名'],['email','メール'],['phone','電話'],['department','部署']].map(([key,label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm({...form,[key]:e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">権限</label>
                <select value={form.role} onChange={e => setForm({...form,role:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="arranger">手配者</option><option value="admin">管理者</option>
                </select>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">キャンセル</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-800 disabled:opacity-50">{saving?'保存中...':'保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
