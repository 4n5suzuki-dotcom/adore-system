'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getInterviewsForMonth } from '@/lib/supabase/interviews'
import type { Interview } from '@/lib/supabase/types'

// ステータス → 表示ラベル + バッジ色（admin ダッシュボードと統一）
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  incomplete: { label: '未確認', className: 'bg-orange text-white' },
  pending: { label: '待機中', className: 'bg-gray-400 text-white' },
  confirmed: { label: '確認済み', className: 'bg-blue text-white' },
  processing: { label: '進行中', className: 'bg-gray-400 text-white' },
  hired: { label: '採用済み', className: 'bg-green text-white' },
  rejected: { label: '不採用', className: 'bg-red text-white' },
  on_trial: { label: '体験中', className: 'bg-gold text-gray-800' },
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'incomplete', label: '未確認' },
  { value: 'pending', label: '待機中' },
  { value: 'confirmed', label: '確認済み' },
  { value: 'hired', label: '採用済み' },
  { value: 'rejected', label: '不採用' },
]

type SortKey = 'latest' | 'name'

// ISO 文字列 → "YYYY-MM-DD"（ローカル日付）
function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
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

export default function AnalyticsInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('') // YYYY-MM-DD（空＝全日）
  const [sortKey, setSortKey] = useState<SortKey>('latest')

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date()
      const data = await getInterviewsForMonth(now.getFullYear(), now.getMonth() + 1)
      setInterviews(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  // フィルター（状態・日付）+ ソート（最新順・氏名順）を適用
  const visibleInterviews = useMemo(() => {
    let rows = interviews

    if (statusFilter !== 'all') {
      rows = rows.filter((i) => i.status === statusFilter)
    }
    if (dateFilter) {
      rows = rows.filter((i) => formatDate(i.created_at) === dateFilter)
    }

    const sorted = [...rows]
    if (sortKey === 'name') {
      sorted.sort((a, b) =>
        (a.furigana || a.genshi_name || '').localeCompare(
          b.furigana || b.genshi_name || '',
          'ja'
        )
      )
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return sorted
  }, [interviews, statusFilter, dateFilter, sortKey])

  if (loading) return <div className="p-8 text-muted">読み込み中...</div>

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-wine-red hover:underline mb-2 inline-block"
          >
            ◀ ダッシュボードへ戻る
          </Link>
          <h1 className="heading-2">今月の面接一覧</h1>
          <p className="text-muted mt-2">{visibleInterviews.length} 件</p>
        </div>

        {/* フィルター・ソート */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="form-label text-sm">状態</label>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label text-sm">面接日</label>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label text-sm">並び替え</label>
            <select
              className="form-input"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="latest">最新順</option>
              <option value="name">氏名順</option>
            </select>
          </div>
          {(statusFilter !== 'all' || dateFilter) && (
            <button
              className="btn-secondary"
              onClick={() => {
                setStatusFilter('all')
                setDateFilter('')
              }}
            >
              フィルター解除
            </button>
          )}
        </div>

        {/* テーブル */}
        <div className="card-wine-border overflow-x-auto">
          <table className="w-full text-left min-w-max">
            <thead>
              <tr className="border-b border-wine-red">
                <th className="p-2 md:p-4 text-xs md:text-sm font-bold text-wine-red">氏名</th>
                <th className="p-2 md:p-4 text-xs md:text-sm font-bold text-wine-red">面接日</th>
                <th className="p-2 md:p-4 text-xs md:text-sm font-bold text-wine-red">ステータス</th>
                <th className="p-2 md:p-4 text-xs md:text-sm font-bold text-wine-red text-right">アクション</th>
              </tr>
            </thead>
            <tbody>
              {visibleInterviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted">
                    該当する面接データがありません
                  </td>
                </tr>
              ) : (
                visibleInterviews.map((interview) => (
                  <tr
                    key={interview.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="p-2 md:p-4 text-xs md:text-sm font-semibold text-gray-800">
                      {interview.genshi_name || '-'}
                    </td>
                    <td className="p-2 md:p-4 text-xs md:text-sm text-gray-600">
                      {formatDate(interview.created_at)}
                    </td>
                    <td className="p-2 md:p-4 text-xs md:text-sm">
                      <StatusBadge status={interview.status} />
                    </td>
                    <td className="p-2 md:p-4 text-xs md:text-sm text-right">
                      <Link
                        href={`/admin/interviews/${interview.id}`}
                        className="text-wine-red font-semibold hover:underline"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
