import Link from 'next/link'

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
      }}
    >
      <div className="text-center max-w-2xl px-4">
        {/* ヘッダー */}
        <h1 className="text-5xl font-bold text-wine-red mb-4">
          Adore 面接・給与管理システム
        </h1>

        {/* サブタイトル */}
        <p className="text-gray-600 text-lg mb-10">
          恵比寿の完全会員制ラウンジ Adore 向け
          <br />
          面接情報と給与を一元管理
        </p>

        {/* ボタンエリア */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
          {/* 応募フォーム */}
          <Link href="/interview" className="flex-1">
            <div className="card-wine-border h-full hover:shadow-xl transition">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-wine-red mb-2">
                応募フォームへ
              </h2>
              <p className="text-gray-600 text-sm">面接シートを入力・応募する</p>
            </div>
          </Link>

          {/* 管理画面 */}
          <Link href="/admin" className="flex-1">
            <div className="card border-2 border-gold h-full hover:shadow-xl transition">
              <div className="text-4xl mb-4">👔</div>
              <h2 className="text-2xl font-bold text-gold mb-2">管理画面へ</h2>
              <p className="text-gray-600 text-sm">
                採用・給与管理のダッシュボード
              </p>
            </div>
          </Link>
        </div>

        {/* フッター */}
        <footer className="text-gray-400 text-sm">
          © 2026 Adore. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
