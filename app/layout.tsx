import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Adore 面接・給与管理システム',
  description: 'ラウンジ向け採用・給与管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-white">{children}</body>
    </html>
  )
}
