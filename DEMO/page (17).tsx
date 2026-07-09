'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StaffProfilePage() {
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPass !== confirmPass) { setMsg('新しいパスワードが一致しません'); return }
    if (newPass.length < 8) { setMsg('パスワードは8文字以上にしてください'); return }
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) { setMsg('エラー: ' + error.message); return }
    setMsg('パスワードを変更しました')
    setCurrentPass(''); setNewPass(''); setConfirmPass('')
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">設定</h2>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-medium text-gray-700 mb-3">パスワード変更</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">新しいパスワード</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">確認（再入力）</label>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          {msg && <p className="text-sm text-blue-600">{msg}</p>}
          <button type="submit" className="w-full py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800">
            変更する
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <button onClick={async () => { await createClient().auth.signOut(); window.location.href = '/staff/login' }}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700">
          ログアウト
        </button>
      </div>
    </div>
  )
}
