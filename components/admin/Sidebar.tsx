'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded transition block ${
        active
          ? 'bg-brass bg-opacity-20 text-cream font-bold'
          : 'text-cream hover:bg-brass hover:bg-opacity-20'
      }`}
    >
      {label}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:block md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:overflow-y-auto bg-charcoal text-cream p-6 border-r-4 border-brass">
      {/* ロゴ */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Adore System</h1>
      </div>

      {/* メニュー */}
      <nav>
        {/* ━━━━━━━━━━━━━━━━━━━ */}
        {/* Adore Suite セクション */}
        {/* ━━━━━━━━━━━━━━━━━━━ */}
        <div className="mb-6 border-b border-brass border-opacity-30 pb-4">
          <div className="px-4 mb-3">
            <p className="text-xs text-brass font-bold uppercase tracking-widest">💎 Adore Suite</p>
            <p className="text-xs text-cream text-opacity-70 mt-1">営業・売上・顧客管理</p>
          </div>
          <NavLink href="/admin/lounge-suite" label="📊 ダッシュボード" active={pathname === '/admin/lounge-suite'} />
          {/* Cast / Reservations は Suite 内タブで管理 */}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━ */}
        {/* Adore System セクション */}
        {/* ━━━━━━━━━━━━━━━━━━━ */}
        <div className="mb-6 pb-4">
          <div className="px-4 mb-3">
            <p className="text-xs text-brass font-bold uppercase tracking-widest">📋 Adore System</p>
            <p className="text-xs text-cream text-opacity-70 mt-1">採用・シフト・給与管理</p>
          </div>
          <NavLink href="/admin" label="📊 ダッシュボード" active={pathname === '/admin'} />
          <NavLink href="/admin/analytics/interviews" label="📋 面接管理" active={pathname === '/admin/analytics/interviews'} />
          <NavLink href="/admin/casts" label="👥 キャスト管理" active={pathname === '/admin/casts'} />
          <NavLink href="/admin/shifts" label="📅 稼働カレンダー" active={pathname === '/admin/shifts'} />
          <NavLink href="/admin/analytics/sales" label="📈 分析" active={pathname === '/admin/analytics/sales'} />
        </div>
      </nav>
    </aside>
  )
}
