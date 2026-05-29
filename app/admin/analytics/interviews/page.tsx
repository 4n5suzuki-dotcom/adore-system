'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getInterviewsForMonth } from '@/lib/supabase/interviews'
import type { Interview } from '@/lib/supabase/types'
import StatLine from '@/components/admin/StatLine'
import '@/styles/adore-v3.css'

// ステータス → ラベル + トーン
const STATUS_META: Record<string, { label: string; tone: string }> = {
  incomplete: { label: '未確認', tone: 'pending' },
  pending: { label: '待機中', tone: 'waiting' },
  confirmed: { label: '確認済み', tone: 'neutral' },
  processing: { label: '進行中', tone: 'waiting' },
  hired: { label: '採用済み', tone: 'positive' },
  rejected: { label: '不採用', tone: 'negative' },
  on_trial: { label: '体験中', tone: 'pending' },
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

// ISO 文字列 → "YYYY-MM-DD"（ローカル日付、フィルター比較用）
function isoDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 表示用 "YYYY/MM/DD"
function showDate(iso: string | null): string {
  return isoDate(iso).replace(/-/g, '/')
}

function StatusDot({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' }
  return <StatLine tone={meta.tone} label={meta.label} />
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
      rows = rows.filter((i) => isoDate(i.created_at) === dateFilter)
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

  if (loading) {
    return (
      <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen flex items-center justify-center">
        <p className="pmeta">読み込み中…</p>
      </div>
    )
  }

  const now = new Date()
  const monthMeta = `${visibleInterviews.length} 件 — ${now.getFullYear()}年${now.getMonth() + 1}月`

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head">
          <Link href="/admin" className="crumb">
            ← DASHBOARD
          </Link>
          <h1 className="ptitle">面接一覧</h1>
          <p className="pmeta">{monthMeta}</p>
        </div>

        {/* 申告状況フィルタ（ピル） */}
        <div className="pills" style={{ marginBottom: 18 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={'pill' + (statusFilter === f.value ? ' on' : '')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 日付・並び替え */}
        <div className="flex flex-wrap items-end gap-4" style={{ marginBottom: 28 }}>
          <div className="field">
            <label className="fl">面接日</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="fl">並び替え</label>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="latest">最新順</option>
              <option value="name">氏名順</option>
            </select>
          </div>
          {(statusFilter !== 'all' || dateFilter) && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setStatusFilter('all')
                setDateFilter('')
              }}
            >
              フィルター解除
            </button>
          )}
        </div>

        {/* 一覧 */}
        {visibleInterviews.length === 0 ? (
          <div className="empty">該当する面接データがありません</div>
        ) : (
          <>
            {/* PC：テーブル */}
            <div className="hidden md:block">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>氏名</th>
                    <th>面接日</th>
                    <th className="ta-r">ステータス</th>
                    <th className="ta-r"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInterviews.map((interview, i) => (
                    <tr key={interview.id}>
                      <td className="num" style={{ color: 'var(--brass-deep)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="nm">
                        {interview.genshi_name || '-'}
                        {interview.furigana && <span className="kn">{interview.furigana}</span>}
                      </td>
                      <td className="dt">{showDate(interview.created_at)}</td>
                      <td className="ta-r">
                        <StatusDot status={interview.status} />
                      </td>
                      <td className="ta-r">
                        <Link href={`/admin/interviews/${interview.id}`} className="link-detail">
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル：カード */}
            <div className="md:hidden mcards">
              {visibleInterviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/admin/interviews/${interview.id}`}
                  className="mcard"
                >
                  <div className="mc-l">
                    <div className="nm">{interview.genshi_name || '-'}</div>
                    <div className="sub">面接日 {showDate(interview.created_at)}</div>
                  </div>
                  <div className="mc-r">
                    <StatusDot status={interview.status} />
                    <span className="link-detail">詳細 →</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
