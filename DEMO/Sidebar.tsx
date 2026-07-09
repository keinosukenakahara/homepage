'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin/dashboard',       label: 'ダッシュボード',   icon: '🏠' },
  { href: '/admin/arrangements',    label: '手配',             icon: '📋' },
  { href: '/admin/arrangements/confirm', label: '手配確認',   icon: '🔍' },
  { href: '/admin/reports',         label: 'レポート',         icon: '📊' },
  { href: '/admin/acceptance',      label: '仕入確定',         icon: '✅' },
  { href: '/admin/payment-notices', label: '支払通知書',       icon: '💴' },
  { href: '/admin/sales',           label: '売上明細',         icon: '💰' },
  { href: '/admin/profit-loss',     label: '収支確認',         icon: '📈' },
  { type: 'divider' },
  { href: '/admin/staff',           label: 'スタッフ管理',     icon: '👥' },
  { href: '/admin/employees',       label: '社員管理',         icon: '👔' },
  { href: '/admin/clients',         label: 'クライアント',     icon: '🏢' },
  { href: '/admin/projects',        label: '案件管理',         icon: '📁' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-blue-900 text-white flex flex-col">
      <div className="p-4 border-b border-blue-700">
        <h1 className="text-lg font-bold leading-tight">手配管理システム</h1>
        <p className="text-xs text-blue-300 mt-1">管理画面</p>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {navItems.map((item, i) => {
          if ('type' in item && item.type === 'divider') {
            return <hr key={i} className="border-blue-700 my-3" />
          }
          const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-blue-700">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-blue-800 rounded-md"
        >
          🚪 ログアウト
        </button>
      </div>
    </aside>
  )
}
