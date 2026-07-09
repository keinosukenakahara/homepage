'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Project { id: string; project_name: string; abbreviation?: string }
interface StaffRow { id: string; full_name: string }
interface ArrangementCell {
  id: string; status: string; arrangement_id?: string
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const STATUS_COLOR: Record<string, string> = {
  arranged: 'bg-blue-200 text-blue-800',
  confirmed: 'bg-green-200 text-green-800',
  completed: 'bg-gray-200 text-gray-600',
  cancelled: 'bg-red-100 text-red-400 line-through',
}

export default function ArrangementGridClient({
  projects, currentEmployeeId
}: { projects: Project[]; currentEmployeeId: string | null }) {
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || '')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [staffList, setStaffList] = useState<StaffRow[]>([])
  const [grid, setGrid] = useState<Record<string, Record<string, ArrangementCell | null>>>({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1
  const daysInMonth = getDaysInMonth(currentMonth)
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const loadData = useCallback(async () => {
    if (!selectedProject) return
    setLoading(true)

    // 案件に紐づくスタッフを取得
    const { data: ps } = await supabase
      .from('project_staff')
      .select('staff:staff_id(id, full_name)')
      .eq('project_id', selectedProject)
      .eq('is_active', true)

    const staff: StaffRow[] = (ps || []).map((r: any) => r.staff).filter(Boolean)
    staff.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ja'))
    setStaffList(staff)

    // 対象月の手配データを取得
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    const { data: arrangements } = await supabase
      .from('arrangements')
      .select('id, staff_id, work_date, status')
      .eq('project_id', selectedProject)
      .gte('work_date', startDate)
      .lte('work_date', endDate)

    // グリッドデータ構築
    const newGrid: Record<string, Record<string, ArrangementCell | null>> = {}
    staff.forEach(s => { newGrid[s.id] = {} })
    arrangements?.forEach((a: any) => {
      const day = parseInt(a.work_date.split('-')[2])
      if (newGrid[a.staff_id]) {
        newGrid[a.staff_id][day] = { id: a.id, status: a.status }
      }
    })

    setGrid(newGrid)
    setChangedCells(new Set())
    setLoading(false)
  }, [selectedProject, year, month, daysInMonth])

  useEffect(() => { loadData() }, [loadData])

  const toggleCell = (staffId: string, day: number) => {
    const key = `${staffId}-${day}`
    const current = grid[staffId]?.[day]

    setGrid(prev => {
      const next = { ...prev }
      next[staffId] = { ...next[staffId] }

      if (current && current.status !== 'cancelled') {
        // 手配済み → キャンセル
        next[staffId][day] = { ...current, status: 'cancelled' }
      } else if (current && current.status === 'cancelled') {
        // キャンセル済み → 手配
        next[staffId][day] = { ...current, status: 'arranged' }
      } else {
        // 未手配 → 手配
        next[staffId][day] = { id: 'new', status: 'arranged' }
      }
      return next
    })

    setChangedCells(prev => new Set([...prev, key]))
  }

  const handleConfirm = async () => {
    setSending(true)
    const inserts: any[] = []
    const updates: { id: string; status: string }[] = []
    const deletes: string[] = []

    for (const [staffId, days] of Object.entries(grid)) {
      for (const [dayStr, cell] of Object.entries(days)) {
        const key = `${staffId}-${dayStr}`
        if (!changedCells.has(key)) continue

        const day = parseInt(dayStr)
        const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        if (!cell) continue

        if (cell.id === 'new' && cell.status === 'arranged') {
          inserts.push({
            project_id: selectedProject, staff_id: staffId,
            work_date: workDate, status: 'arranged',
            arranged_by: currentEmployeeId,
          })
        } else if (cell.id !== 'new') {
          if (cell.status === 'cancelled') {
            deletes.push(cell.id)
          } else {
            updates.push({ id: cell.id, status: cell.status })
          }
        }
      }
    }

    // DB更新
    if (inserts.length > 0) await supabase.from('arrangements').insert(inserts)
    for (const u of updates) {
      await supabase.from('arrangements').update({ status: u.status }).eq('id', u.id)
    }
    for (const id of deletes) {
      await supabase.from('arrangements').delete().eq('id', id)
    }

    // メール送信API呼び出し
    if (inserts.length > 0) {
      await fetch('/api/arrangements/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject, arrangements: inserts }),
      })
    }

    await loadData()
    setSending(false)
    alert(`手配を確定しました。${inserts.length > 0 ? `\n手配確定メールを${inserts.length}件送信しました。` : ''}`)
  }

  const getDayOfWeek = (day: number) => {
    const d = new Date(year, month - 1, day)
    return d.getDay()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">手配</h2>
        <div className="flex items-center gap-3">
          {changedCells.size > 0 && (
            <span className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              {changedCells.size}件の変更あり
            </span>
          )}
          <button
            onClick={handleConfirm}
            disabled={changedCells.size === 0 || sending}
            className="bg-blue-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-40"
          >
            {sending ? '送信中...' : '✓ 確定・メール送信'}
          </button>
        </div>
      </div>

      {/* 絞り込み */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">案件</label>
          <select
            value={selectedProject}
            onChange={e => { setSelectedProject(e.target.value); setChangedCells(new Set()) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[200px]"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.project_name}{p.abbreviation ? ` (${p.abbreviation})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">対象月</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="px-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">◀</button>
            <span className="text-sm font-medium w-24 text-center">
              {format(currentMonth, 'yyyy年M月')}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="px-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">▶</button>
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-blue-200 inline-block"></span>手配済み</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-200 inline-block"></span>承諾済み</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gray-200 inline-block"></span>完了</span>
        <span className="text-gray-400">※ クリックで手配ON/OFF</span>
      </div>

      {/* グリッド */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">読み込み中...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 arrangement-grid overflow-x-auto">
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{
                  background: '#1e40af', color: 'white', padding: '6px 8px',
                  fontSize: '12px', position: 'sticky', top: 0, left: 0, zIndex: 20,
                  minWidth: '120px', textAlign: 'left', borderRight: '2px solid #475569'
                }}>
                  スタッフ名
                </th>
                {dates.map(d => {
                  const dow = getDayOfWeek(d)
                  const isSun = dow === 0, isSat = dow === 6
                  return (
                    <th key={d} style={{
                      background: isSun ? '#dc2626' : isSat ? '#2563eb' : '#1e40af',
                      color: 'white', padding: '4px 2px', fontSize: '11px',
                      position: 'sticky', top: 0, zIndex: 10, minWidth: '32px',
                    }}>
                      <div>{d}</div>
                      <div style={{ fontSize: '9px', opacity: 0.8 }}>{DAY_LABELS[dow]}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    担当スタッフがいません。スタッフ管理で案件を割り当ててください。
                  </td>
                </tr>
              ) : staffList.map(s => (
                <tr key={s.id}>
                  <td style={{
                    padding: '4px 8px', fontSize: '12px', fontWeight: 500,
                    position: 'sticky', left: 0, zIndex: 5,
                    background: '#f8fafc', borderRight: '2px solid #94a3b8',
                    minWidth: '120px', whiteSpace: 'nowrap',
                    border: '1px solid #e2e8f0'
                  }}>
                    {s.full_name}
                  </td>
                  {dates.map(d => {
                    const cell = grid[s.id]?.[d]
                    const dow = getDayOfWeek(d)
                    const isSun = dow === 0, isSat = dow === 6
                    const hasArrangement = cell && cell.status !== 'cancelled'

                    return (
                      <td
                        key={d}
                        onClick={() => toggleCell(s.id, d)}
                        style={{
                          border: '1px solid #e2e8f0',
                          padding: '2px',
                          width: '32px',
                          height: '32px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          fontSize: '10px',
                          background: hasArrangement
                            ? (cell.status === 'confirmed' ? '#bbf7d0' : cell.status === 'completed' ? '#e5e7eb' : '#bfdbfe')
                            : isSun ? '#fff1f2' : isSat ? '#eff6ff' : 'white',
                        }}
                        title={hasArrangement ? `${s.full_name} - ${cell.status}` : `${s.full_name} - クリックで手配`}
                      >
                        {hasArrangement ? (
                          <span style={{ color: cell.status === 'confirmed' ? '#15803d' : '#1d4ed8' }}>●</span>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
