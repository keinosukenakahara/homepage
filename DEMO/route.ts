import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { projectId, arrangements } = await req.json()
  const supabase = await createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(client_name)')
    .eq('id', projectId)
    .single()

  const staffIds = [...new Set(arrangements.map((a: any) => a.staff_id))]
  const { data: staffList } = await supabase
    .from('staff').select('id, full_name, email').in('id', staffIds)

  if (!staffList || !project) {
    return NextResponse.json({ error: 'データ取得エラー' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  })

  const staffArrangements: Record<string, string[]> = {}
  arrangements.forEach((a: any) => {
    if (!staffArrangements[a.staff_id]) staffArrangements[a.staff_id] = []
    staffArrangements[a.staff_id].push(a.work_date)
  })

  const results = []
  for (const staff of staffList) {
    const dates = (staffArrangements[staff.id] || []).sort()
    const dateStr = dates.map((d: string) => {
      const dt = new Date(d)
      return `${dt.getMonth() + 1}/${dt.getDate()}（${'日月火水木金土'[dt.getDay()]}）`
    }).join('\n')

    const mailBody = `${staff.full_name} 様\n\n以下の日程でお仕事の手配が確定しました。\n\n【案件名】${project.project_name}\n【稼働日】\n${dateStr}\n\nスタッフポータルにてご承諾をお願いいたします。\n${process.env.NEXT_PUBLIC_APP_URL}/staff/login`.trim()

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM, to: staff.email,
        subject: `【手配確定】${project.project_name} - ${dates.length}件`,
        text: mailBody,
      })
      results.push({ staffId: staff.id, status: 'sent' })
      await supabase.from('notification_logs').insert({
        recipient_type: 'staff', recipient_id: staff.id,
        notification_type: 'arrangement', channel: 'email', status: 'sent',
      })
    } catch (e) {
      results.push({ staffId: staff.id, status: 'failed' })
    }
  }

  return NextResponse.json({ results })
}
