'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type SubMenuItem = { label: string; href: string }
type MenuItem = {
  label: string
  href?: string
  icon?: string
  children?: SubMenuItem[]
}

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems: MenuItem[] = [
    {
      label: '管理画面',
      href: '/admin',
      icon: '📊'
    },
    {
      label: '面接管理',
      children: [
        { label: '最新面接', href: '/admin' },
        { label: '今月の面接', href: '/admin/analytics/interviews' },
        { label: '採用者', href: '/admin/analytics/hired' },
        { label: '採用率分析', href: '/admin/analytics/adoption-rate' }
      ]
    },
    {
      label: 'キャスト管理',
      children: [
        { label: 'キャスト一覧', href: '/admin/casts' }
      ]
    }
  ]

  return (
    <aside className="w-64 bg-wine-red text-white min-h-screen p-6 shadow-lg">
      {/* ロゴ */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Adore System</h1>
        <p className="text-sm text-gray-200 mt-1">管理画面</p>
      </div>

      {/* メニュー */}
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <div key={item.label}>
            {/* 親メニュー */}
            {!item.children ? (
              <Link
                href={item.href ?? '#'}
                className={`block px-4 py-3 rounded transition ${
                  pathname === item.href
                    ? 'bg-gold text-wine-red font-bold'
                    : 'hover:bg-gold/80 hover:text-wine-red'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <div>
                <p className="px-4 py-2 text-sm font-bold text-gold mt-4 mb-2">
                  {item.label}
                </p>
                {/* サブメニュー */}
                <div className="space-y-1 pl-2">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-4 py-2 text-sm rounded transition ${
                        pathname === child.href
                          ? 'bg-gold text-wine-red font-bold'
                          : 'hover:bg-gold/80 hover:text-wine-red'
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
