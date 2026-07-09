import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '手配管理システム',
  description: 'スタッフ手配・支払管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
