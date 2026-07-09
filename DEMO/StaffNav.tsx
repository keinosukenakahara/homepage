'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/staff/dashboard', label: 'ホーム', icon: '🏠' },
  { href: '/staff/reports', label: 'レポート', icon: '📊' },
  { href: '/staff/schedule', label: '稼働実績', icon: '📅' },
  { href: '/staff/payment-notices', label: '支払通知書', icon: '💴' },
  { href: '/staff/profile', label: '設定', icon: '⚙️' },
]

export default function StaffNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
      {navItems.map(item => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
              isActive ? 'text-green-700 font-semibold' : 'text-gray-500'
            }`}>
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
