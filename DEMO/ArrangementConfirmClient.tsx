'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, getDaysInMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
const DAY_LABELS = ['日','月','火','水','木','金','土']
export default function ArrangementConfirmClient({ projects, staffList }: { projects: any[]; staffList: any[] }) {
  const now = new Date()
  const [mode, setMode] = useState<'project'|'staff'>('project')
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id||'')
  const [selectedStaff, setSelectedStaff] = useState('')
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
      let q = supabase.from('arrangements')
        .select('*, staff:staff_id(id, full_name), project:project_id(id, project_name, abbreviation)')
        .gte('work_date', start).lte('work_date', end).neq('status','cancelled')
      if (mode==='project' && selectedProject) q = q.eq('project_id', selectedProject)
      if (mode==='staff' && selectedStaff) q = q.eq('staff_id', selectedStaff)
      const { data: arr } = await q.order('work_date')
      setData(arr || [])
      setLoading(false)
    }
    load()
  }, [mode, selectedProject, selectedStaff, year, month])
  const daysInMonth = getDaysInMonth(new Date(year, month-1))
  const dates = Array.from({length: daysInMonth}, (_,i) => i+1)
  // グリッド構築
  const rowKeys = mode==='project'
    ? [...new Set(data.map(a => a.staff?.id))].filter(Boolean)
    : [...new Set(data.map(a => a.project?.id))].filter(Boolean)
  const rowLabels: Record<string, string> = {}
  data.forEach(a => {
    if (mode==='project') rowLabels[a.staff?.id] = a.staff?.full_name
    else rowLabels[a.project?.id] = a.project?.project_name
  })
  const cellMap: Record<string, Record<number, string>> = {}
  data.forEach(a => {
    const rk = mode==='project' ? a.staff?.id : a.project?.id
    const d = parseInt(a.work_date.split('-')[2])
    if (!cellMap[rk]) cellMap[rk] = {}
    cellMap[rk][d] = a.status
  })
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">手配確認</h2>
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
          <button onClick={() => setMode('project')} className={`px-4 py-2 rounded-lg text-sm ${mode==='project'?'bg-blue-700 text-white':'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>案件軸</button>
          <button onClick={() => setMode('staff')} className={`px-4 py-2 rounded-lg text-sm ${mode==='staff'?'bg-blue-700 text-white':'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>スタッフ軸</button>
        </div>
        {mode==='project' ? (
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        ) : (
          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">スタッフ選択...</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
      </div>
      {loading ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">読み込み中...</div> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table style={{borderCollapse:'collapse', minWidth:'100%'}}>
            <thead>
              <tr>
                <th style={{background:'#1e40af',color:'white',padding:'6px 8px',fontSize:'12px',position:'sticky',left:0,zIndex:20,minWidth:'120px',textAlign:'left',borderRight:'2px solid #475569'}}>
                  {mode==='project'?'スタッフ':'案件'}
                </th>
                {dates.map(d => {
                  const dow = new Date(year, month-1, d).getDay()
                  return (
                    <th key={d} style={{background:dow===0?'#dc2626':dow===6?'#2563eb':'#1e40af',color:'white',padding:'3px 2px',fontSize:'10px',position:'sticky',top:0,zIndex:10,minWidth:'30px'}}>
                      <div>{d}</div><div style={{fontSize:'8px',opacity:0.8}}>{DAY_LABELS[dow]}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rowKeys.length === 0 ? (
                <tr><td colSpan={daysInMonth+1} style={{padding:'24px',textAlign:'center',color:'#9ca3af',fontSize:'14px'}}>データがありません</td></tr>
              ) : rowKeys.map(rk => (
                <tr key={rk}>
                  <td style={{padding:'4px 8px',fontSize:'12px',fontWeight:500,position:'sticky',left:0,zIndex:5,background:'#f8fafc',borderRight:'2px solid #94a3b8',minWidth:'120px',whiteSpace:'nowrap',border:'1px solid #e2e8f0'}}>
                    {rowLabels[rk]}
                  </td>
                  {dates.map(d => {
                    const status = cellMap[rk]?.[d]
                    return (
                      <td key={d} style={{border:'1px solid #e2e8f0',width:'30px',height:'28px',textAlign:'center',fontSize:'10px',background:status==='confirmed'?'#bbf7d0':status==='completed'?'#e5e7eb':status?'#bfdbfe':'white'}}>
                        {status ? '●' : ''}
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
