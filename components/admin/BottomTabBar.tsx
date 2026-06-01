'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// モバイル用ボトムタブ。売上系（/admin/analytics/sales）は導線から外し、
// 面接運用で使う「面接フォーム案内（QR）」を常設。ページ/ルートは保持。
const tabs = [
  { label: '📊 ダッシュ', href: '/admin', icon: '📊' },
  { label: '📋 面接', href: '/admin/analytics/interviews', icon: '📋' },
  { label: '👥 キャスト', href: '/admin/casts', icon: '👥' },
  { label: '📅 稼働', href: '/admin/shifts', icon: '📅' },
  { label: '📱 案内', href: '/admin/interview-form', icon: '📱' }
]

export default function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-wine-red border-t border-red-900 md:hidden">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href) ||
            (tab.href === '/admin' && pathname === '/admin')

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-full h-full transition ${
                isActive
                  ? 'bg-gold text-wine-red font-bold'
                  : 'text-white hover:bg-red-800'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-1">{tab.label.split(' ')[1]}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
