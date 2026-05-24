'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut, getCurrentUser } from '@/lib/supabase/auth'
import {
  getInterviewsForMonth,
  getLatestInterviews,
  getInterviewCountByStatus,
  getTodayInterviewCount,
  getMonthlyAdoptionRate,
  type InterviewStatusCount,
} from '@/lib/supabase/interviews'
import type { Interview, User } from '@/lib/supabase/types'

// ステータス → 表示ラベル + バッジ色（Tailwind が検出できるよう完全なクラス名で定義）
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  incomplete: { label: '未確認', className: 'bg-orange text-white' },
  pending: { label: '待機中', className: 'bg-gray-400 text-white' },
  confirmed: { label: '確認済み', className: 'bg-blue text-white' },
  hired: { label: '採用済み', className: 'bg-green text-white' },
  rejected: { label: '不採用', className: 'bg-red text-white' },
  processing: { label: '進行中', className: 'bg-gray-400 text-white' },
  on_trial: { label: '体験中', className: 'bg-gold text-gray-800' },
}

// ステータス別集計カードの並び順とラベル
const STATUS_SUMMARY: { key: keyof InterviewStatusCount; label: string }[] = [
  { key: 'incomplete', label: '未確認' },
  { key: 'pending', label: '待機中' },
  { key: 'confirmed', label: '確認済み' },
  { key: 'hired', label: '採用済み' },
  { key: 'rejected', label: '不採用' },
]

// ISO 文字列 → "YYYY-MM-DD HH:MM"（ローカル時刻）
function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    className: 'bg-gray-200 text-gray-800',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${style.className}`}>
      {style.label}
    </span>
  )
}

export default function AdminPage() {
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [todayCount, setTodayCount] = useState<number>(0)
  const [monthlyCount, setMonthlyCount] = useState<number>(0)
  const [monthlyAdoptedCount, setMonthlyAdoptedCount] = useState<number>(0)
  const [adoptionRate, setAdoptionRate] = useState<number>(0)
  const [latestInterviews, setLatestInterviews] = useState<Interview[]>([])
  const [statusCounts, setStatusCounts] = useState<InterviewStatusCount>({
    incomplete: 0,
    pending: 0,
    confirmed: 0,
    hired: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      try {
        const [user, today, monthInterviews, rate, latest, counts] =
          await Promise.all([
            getCurrentUser(),
            getTodayInterviewCount(),
            getInterviewsForMonth(year, month),
            getMonthlyAdoptionRate(year, month),
            getLatestInterviews(5),
            getInterviewCountByStatus(),
          ])

        // getCurrentUser は Supabase 認証ユーザーを返すため User 型へキャスト
        setCurrentUser((user as unknown as User) ?? null)
        setTodayCount(today)
        setMonthlyCount(monthInterviews.length)
        setMonthlyAdoptedCount(
          monthInterviews.filter((i) => i.status === 'hired').length
        )
        setAdoptionRate(rate)
        setLatestInterviews(latest)
        setStatusCounts(counts)
      } catch (err) {
        // データ取得エラー：ログ出力のうえデフォルト値（0 / []）を維持
        console.error('admin dashboard load failed:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-muted text-lg">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="heading-2">管理画面</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted text-sm">
              {currentUser?.email ?? 'ゲスト'}
            </span>
            <button onClick={handleLogout} className="btn-primary">
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* サマリーカード 4 個 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon="📋"
            label="今日の面接数"
            value={`${todayCount}件`}
            href="/admin/analytics/today"
          />
          <SummaryCard
            icon="📊"
            label="今月面接数"
            value={`${monthlyCount}件`}
            href="/admin/analytics/interviews"
          />
          <SummaryCard
            icon="✅"
            label="今月採用数"
            value={`${monthlyAdoptedCount}件`}
            href="/admin/analytics/hired"
          />
          <SummaryCard
            icon="📈"
            label="採用率"
            value={`${adoptionRate.toFixed(1)}%`}
            href="/admin/analytics/adoption-rate"
          />
        </section>

        {/* 最新面接一覧 */}
        <section>
          <h2 className="heading-2 mb-4">最新面接（5件）</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600 text-sm">
                  <th className="py-3 px-2 font-semibold">氏名</th>
                  <th className="py-3 px-2 font-semibold">面接日時</th>
                  <th className="py-3 px-2 font-semibold">ステータス</th>
                  <th className="py-3 px-2 font-semibold text-right">アクション</th>
                </tr>
              </thead>
              <tbody>
                {latestInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted">
                      面接データがありません
                    </td>
                  </tr>
                ) : (
                  latestInterviews.map((interview) => (
                    <tr
                      key={interview.id}
                      className="border-b border-gray-200 last:border-0"
                    >
                      <td className="py-3 px-2 text-gray-800 font-semibold">
                        {interview.genshi_name || '-'}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {formatDateTime(interview.created_at)}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={interview.status} />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() =>
                            router.push(`/admin/interviews/${interview.id}`)
                          }
                          className="text-wine-red font-semibold hover:underline"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ステータス別集計 */}
        <section>
          <h2 className="heading-2 mb-4">ステータス別集計</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STATUS_SUMMARY.map(({ key, label }) => (
              <div
                key={key}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center"
              >
                <p className="text-muted text-sm mb-1">{label}</p>
                <p className="text-3xl font-bold text-gray-800">
                  {statusCounts[key]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* キャスト管理セクション */}
        <div className="mt-12 pt-12 border-t border-gray-200">
          <h2 className="heading-2 text-2xl font-bold text-wine-red mb-6">キャスト管理</h2>

          <Link href="/admin/casts">
            <div className="card-wine-border p-6 cursor-pointer hover:shadow-xl transition hover:-translate-y-0.5">
              <p className="text-gray-600">在籍キャスト</p>
              <div className="text-4xl font-bold text-wine-red mt-2">管理</div>
              <p className="text-gray-600 mt-2 text-sm">一覧を見る →</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  href,
}: {
  icon: string
  label: string
  value: string
  href?: string
}) {
  const content = (
    <>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="heading-1">{value}</p>
      <p className="text-muted mt-1">{label}</p>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="card-wine-border block cursor-pointer transition hover:shadow-xl hover:-translate-y-0.5"
      >
        {content}
      </Link>
    )
  }

  return <div className="card-wine-border">{content}</div>
}
