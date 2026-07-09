import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { year, month } = await req.json()
  const supabase = await createAdminClient()

  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end = `${year}-${String(month).padStart(2,'0')}-31`

  // 対象月の確定済みレポートをスタッフごとに集計
  const { data: reports } = await supabase
    .from('reports')
    .select('*, staff:staff_id(id, full_name, invoice_number), project:project_id(id, project_name), items:report_items(*)')
    .gte('work_date', start).lte('work_date', end)
    .eq('status', 'finalized')

  if (!reports || reports.length === 0) {
    return NextResponse.json({ created: 0, message: '対象レポートがありません' })
  }

  // スタッフごとに集計
  const byStaff: Record<string, { staff: any; reports: any[] }> = {}
  reports.forEach(r => {
    const sid = r.staff_id
    if (!byStaff[sid]) byStaff[sid] = { staff: r.staff, reports: [] }
    byStaff[sid].reports.push(r)
  })

  let created = 0
  for (const [staffId, data] of Object.entries(byStaff)) {
    // 既存チェック
    const { data: existing } = await supabase
      .from('payment_notices')
      .select('id')
      .eq('staff_id', staffId)
      .eq('target_year', year)
      .eq('target_month', month)
      .single()

    if (existing) continue // 既に生成済み

    const totalAmount = data.reports.reduce((s, r) => s + (r.total_amount || 0), 0)

    const { data: notice } = await supabase
      .from('payment_notices')
      .insert({
        staff_id: staffId,
        target_year: year, target_month: month,
        notice_type: 'combined',
        status: 'provisional',
        subtotal_amount: totalAmount,
        total_amount: totalAmount,
        issued_at: new Date().toISOString(),
      })
      .select().single()

    if (!notice) continue

    // 明細生成
    const items: any[] = []
    data.reports.forEach(r => {
      r.items?.forEach((item: any) => {
        if (item.quantity > 0) {
          items.push({
            payment_notice_id: notice.id,
            project_id: r.project_id,
            project_name: r.project?.project_name || '',
            work_date: r.work_date,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
            sort_order: items.length,
          })
        }
      })
    })

    if (items.length > 0) await supabase.from('payment_notice_items').insert(items)
    created++
  }

  return NextResponse.json({ created })
}
