'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ─────────────────────────────────────────────────────────────
//  サイドバー導線の表示制御（1箇所集中管理）
//
//  方針：このシステムは将来 他店舗へ汎用展開する想定のため、機能は削除しない。
//        hidden: true は「サイドバーの導線から外すだけ」。
//        ページ本体・ルート・DB はすべて残しており、直接 URL では到達可能。
//        将来 復活させるときは hidden を外す（または false にする）だけでよい。
//
//  ▼ 今回 非表示にしたもの（売上・顧客関連のみ）
//     - セクション「💎 Adore Suite」（/admin/lounge-suite ＝営業・売上・顧客管理）
//     - 「📈 分析」（/admin/analytics/sales ＝売上分析）
//  ▼ 表示のまま残すもの（面接管理特化の中核）
//     - ダッシュボード / 面接管理 / 再アプローチ / 面接フォーム案内 / キャスト管理 / 稼働カレンダー
// ─────────────────────────────────────────────────────────────

type NavItem = {
  href: string
  label: string
  hidden?: boolean
}

type NavSection = {
  key: string
  title: string
  subtitle: string
  hidden?: boolean
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'suite',
    title: '💎 Adore Suite',
    subtitle: '営業・売上・顧客管理',
    hidden: true, // 売上・顧客系ダッシュボード。導線から非表示（ページ/ルートは保持）
    items: [
      { href: '/admin/lounge-suite', label: '📊 ダッシュボード' },
    ],
  },
  {
    key: 'system',
    title: '📋 Adore System',
    subtitle: '採用・シフト・給与管理',
    items: [
      { href: '/admin', label: '📊 ダッシュボード' },
      { href: '/admin/analytics/interviews', label: '📋 面接管理' },
      { href: '/admin/re-approach', label: '🔔 再アプローチ' },
      { href: '/admin/interview-form', label: '📱 面接フォーム案内' },
      { href: '/admin/casts', label: '👥 キャスト管理' },
      { href: '/admin/shifts', label: '📅 稼働カレンダー' },
      // 売上分析。導線から非表示（ページ/ルートは保持。直接 URL で到達可）
      { href: '/admin/analytics/sales', label: '📈 分析', hidden: true },
    ],
  },
]

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

  // hidden セクションを除外（残ったものだけ描画）
  const sections = NAV_SECTIONS.filter((s) => !s.hidden)

  return (
    <aside className="hidden md:block md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:overflow-y-auto bg-charcoal text-cream p-6 border-r-4 border-brass">
      {/* ロゴ */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Adore System</h1>
      </div>

      {/* メニュー */}
      <nav>
        {sections.map((section, idx) => {
          const isLast = idx === sections.length - 1
          return (
            <div
              key={section.key}
              className={
                isLast
                  ? 'mb-6 pb-4'
                  : 'mb-6 border-b border-brass border-opacity-30 pb-4'
              }
            >
              <div className="px-4 mb-3">
                <p className="text-xs text-brass font-bold uppercase tracking-widest">{section.title}</p>
                <p className="text-xs text-cream text-opacity-70 mt-1">{section.subtitle}</p>
              </div>
              {section.items
                .filter((item) => !item.hidden)
                .map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={pathname === item.href}
                  />
                ))}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
