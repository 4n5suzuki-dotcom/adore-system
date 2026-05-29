import Link from 'next/link'
import '@/styles/adore-v3.css'

// 細線アイコン（brass = currentColor）
function ClipboardIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a3 3 0 0 1 6 0" />
      <rect x="9" y="2.4" width="6" height="3.2" rx="1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </svg>
  )
}
function DashboardIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.4" />
      <rect x="3.5" y="15" width="7" height="5.5" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="5.5" rx="1.4" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.4" />
    </svg>
  )
}
function ArrowGo() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M12 6l6 6-6 6" />
    </svg>
  )
}

export default function Home() {
  return (
    <div className="adore-v3 af-page flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        {/* eyebrow */}
        <div className="af-eyebrow" style={{ marginBottom: 22 }}>
          EBISU&nbsp;·&nbsp;MEMBERS LOUNGE
        </div>

        {/* title */}
        <h1
          className="af-h1 text-center"
          style={{ lineHeight: 1.25, fontSize: 'clamp(30px, 6vw, 52px)' }}
        >
          <span className="en" style={{ fontStyle: 'italic', marginRight: '0.18em' }}>
            Adore
          </span>
          <span className="jp">面接・給与管理システム</span>
        </h1>

        {/* hairline accent */}
        <div style={{ width: 64, height: 1, background: 'var(--brass)', margin: '26px 0 22px', opacity: 0.7 }} />

        {/* subtitle */}
        <p
          className="text-center"
          style={{ maxWidth: 520, color: 'var(--ink-70)', fontSize: 16.5, lineHeight: 1.9, margin: 0 }}
        >
          恵比寿の完全会員制ラウンジ{' '}
          <span className="en" style={{ fontStyle: 'italic' }}>
            Adore
          </span>{' '}
          向け。
          <br />
          面接情報と給与を、ひとつの場所で上品に。
        </p>

        {/* cards */}
        <div
          className="grid w-full grid-cols-1 sm:grid-cols-2"
          style={{ maxWidth: 720, gap: 24, marginTop: 52 }}
        >
          <Link href="/interview" className="af-home-card">
            <span className="af-home-ic">
              <ClipboardIcon />
            </span>
            <span className="af-home-title">応募フォームへ</span>
            <span className="af-home-sub">面接シートを入力・応募する</span>
            <span className="af-home-enter">
              Enter <ArrowGo />
            </span>
          </Link>

          <Link href="/admin" className="af-home-card">
            <span className="af-home-ic">
              <DashboardIcon />
            </span>
            <span className="af-home-title">管理画面へ</span>
            <span className="af-home-sub">採用・給与管理のダッシュボード</span>
            <span className="af-home-enter">
              Enter <ArrowGo />
            </span>
          </Link>
        </div>
      </main>

      {/* footer */}
      <footer style={{ textAlign: 'center', padding: '26px 24px 34px', color: 'var(--ink-50)', fontSize: 13, letterSpacing: '0.04em' }}>
        <hr className="af-hairline" style={{ maxWidth: 720, margin: '0 auto 22px', opacity: 0.5 }} />
        <span className="en">© 2026 Adore. All rights reserved.</span>
      </footer>
    </div>
  )
}
