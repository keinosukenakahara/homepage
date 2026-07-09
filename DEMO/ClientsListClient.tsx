'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
interface Client { id: string; client_name: string; contact_name?: string; contact_email?: string; contact_phone?: string; address?: string; notes?: string; is_active: boolean }
export default function ClientsListClient({ clients: initialClients }: { clients: Client[] }) {
  const [clients, setClients] = useState(initialClients)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ client_name:'', contact_name:'', contact_email:'', contact_phone:'', address:'', notes:'', is_active:true })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const openNew = () => { setEditing(null); setForm({ client_name:'', contact_name:'', contact_email:'', contact_phone:'', address:'', notes:'', is_active:true }); setShowModal(true) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ client_name:c.client_name, contact_name:c.contact_name||'', contact_email:c.contact_email||'', contact_phone:c.contact_phone||'', address:c.address||'', notes:c.notes||'', is_active:c.is_active }); setShowModal(true) }
  const handleSave = async () => {
    setSaving(true)
    if (editing) await supabase.from('clients').update(form).eq('id', editing.id)
    else await supabase.from('clients').insert(form)
    const { data } = await supabase.from('clients').select('*').order('client_name')
    setClients(data || []); setShowModal(false); setSaving(false)
  }
  const fields: [string, string][] = [['client_name','クライアント名 *'],['contact_name','担当者名'],['contact_email','メール'],['contact_phone','電話'],['address','住所'],['notes','備考']]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">クライアント管理</h2>
        <button onClick={openNew} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">＋ 新規登録</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">クライアント名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">担当者</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">メール</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.client_name}</td>
                <td className="px-4 py-3 text-gray-600">{c.contact_name}</td>
                <td className="px-4 py-3 text-gray-600">{c.contact_email}</td>
                <td className="px-4 py-3"><button onClick={() => openEdit(c)} className="text-blue-600 hover:underline text-xs">編集</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing?'編集':'新規登録'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-6 space-y-3">
              {fields.map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm({...form,[key]:e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">キャンセル</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">{saving?'保存中...':'保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
