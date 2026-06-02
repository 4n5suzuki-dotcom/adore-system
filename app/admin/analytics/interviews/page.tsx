'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  getInterviewsForMonth,
  getAllInterviews,
  deleteInterviews,
  type DeleteInterviewsResult,
} from '@/lib/supabase/interviews'
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
type Scope = 'month' | 'all'

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

function nameOf(i: Interview): string {
  return i.genshi_name || i.furigana || '（無名）'
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
  const [scope, setScope] = useState<Scope>('month') // 取得範囲：当月 / 全期間

  // 削除関連
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingTargets, setPendingTargets] = useState<{ id: string; name: string }[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [resultDetail, setResultDetail] = useState<string[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const data =
      scope === 'all'
        ? await getAllInterviews()
        : await getInterviewsForMonth(now.getFullYear(), now.getMonth() + 1)
    setInterviews(data)
    setSelectedIds(new Set()) // 取得し直したら選択はクリア
    setLoading(false)
  }, [scope])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  // 表示中の行のうち選択されている数
  const visibleIds = useMemo(() => visibleInterviews.map((i) => i.id), [visibleInterviews])
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  // 削除モーダルを開く（1件 or 複数）
  const openConfirm = (targets: { id: string; name: string }[]) => {
    if (targets.length === 0) return
    setResultMsg(null)
    setResultDetail([])
    setPendingTargets(targets)
    setConfirmOpen(true)
  }

  const openConfirmForSelected = () => {
    const targets = visibleInterviews
      .filter((i) => selectedIds.has(i.id))
      .map((i) => ({ id: i.id, name: nameOf(i) }))
    openConfirm(targets)
  }

  const closeConfirm = () => {
    if (deleting) return
    setConfirmOpen(false)
    setPendingTargets([])
  }

  // Esc でモーダルを閉じる
  useEffect(() => {
    if (!confirmOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) closeConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen, deleting])

  const runDelete = async () => {
    setDeleting(true)
    const res: DeleteInterviewsResult = await deleteInterviews(pendingTargets)
    setDeleting(false)
    setConfirmOpen(false)
    setPendingTargets([])

    // 結果サマリ
    setResultMsg(
      `${res.deleted.length}件削除` +
        `／${res.skippedCastLinked.length}件スキップ（キャスト紐付）` +
        `／${res.failed.length}件失敗`
    )
    const detail: string[] = []
    res.skippedCastLinked.forEach((s) =>
      detail.push(`スキップ：${s.name}（採用済みでキャストに紐付いているため削除不可）`)
    )
    res.failed.forEach((f) => detail.push(`失敗：${f.name} … ${f.reason}`))
    setResultDetail(detail)

    await fetchData() // 一覧を取り直し（選択もクリア）
  }

  if (loading) {
    return (
      <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen flex items-center justify-center">
        <p className="pmeta">読み込み中…</p>
      </div>
    )
  }

  const now = new Date()
  const scopeMeta =
    scope === 'all'
      ? `${visibleInterviews.length} 件 — 全期間`
      : `${visibleInterviews.length} 件 — ${now.getFullYear()}年${now.getMonth() + 1}月`

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head">
          <Link href="/admin" className="crumb">
            ← DASHBOARD
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="ptitle">面接一覧</h1>
              <p className="pmeta">{scopeMeta}</p>
            </div>
            {/* 再アプローチへの動線（モバイルはボトムタブが無いためここが主要導線） */}
            <Link
              href="/admin/re-approach"
              className="btn w-full sm:w-auto"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <svg
                width={17}
                height={17}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              再アプローチ
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h13M12 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 取得範囲（当月 / 全期間） */}
        <div className="pills" style={{ marginBottom: 12 }}>
          <button
            onClick={() => setScope('month')}
            className={'pill' + (scope === 'month' ? ' on' : '')}
          >
            当月
          </button>
          <button
            onClick={() => setScope('all')}
            className={'pill' + (scope === 'all' ? ' on' : '')}
          >
            全期間
          </button>
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
        <div className="flex flex-wrap items-end gap-4" style={{ marginBottom: 16 }}>
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

        {/* 削除結果サマリ */}
        {resultMsg && (
          <div
            style={{
              border: '1px solid var(--hair)',
              background: 'var(--cream-2)',
              borderRadius: 4,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--charcoal)' }}>{resultMsg}</p>
            {resultDetail.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--ink-70)', fontSize: 13 }}>
                {resultDetail.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 一括削除バー（選択時のみ） */}
        {selectedVisibleCount > 0 && (
          <div
            className="flex items-center justify-between"
            style={{
              border: '1px solid var(--hair-strong)',
              background: 'var(--paper)',
              borderRadius: 4,
              boxShadow: 'var(--shadow-sm)',
              padding: '10px 14px',
              marginBottom: 16,
            }}
          >
            <span style={{ color: 'var(--charcoal)', fontWeight: 700 }}>
              {selectedVisibleCount} 件を選択中
            </span>
            <div className="flex items-center gap-3">
              <button className="btn btn-ghost" onClick={() => setSelectedIds(new Set())}>
                選択解除
              </button>
              <button
                className="btn"
                style={{ background: 'var(--no)', borderColor: 'var(--no)', color: 'var(--cream)' }}
                onClick={openConfirmForSelected}
              >
                選択した面接を削除
              </button>
            </div>
          </div>
        )}

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
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="表示中をすべて選択"
                      />
                    </th>
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
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(interview.id)}
                          onChange={() => toggleOne(interview.id)}
                          aria-label={`${nameOf(interview)} を選択`}
                        />
                      </td>
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
                        <div className="flex items-center justify-end gap-4">
                          <Link href={`/admin/interviews/${interview.id}`} className="link-detail">
                            詳細
                          </Link>
                          <button
                            className="link-detail"
                            style={{ color: 'var(--no)' }}
                            onClick={() =>
                              openConfirm([{ id: interview.id, name: nameOf(interview) }])
                            }
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル：カード */}
            <div className="md:hidden mcards">
              {visibleInterviews.map((interview) => (
                <div key={interview.id} className="mcard" style={{ gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(interview.id)}
                    onChange={() => toggleOne(interview.id)}
                    aria-label={`${nameOf(interview)} を選択`}
                    style={{ alignSelf: 'center' }}
                  />
                  <div className="mc-l" style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">{interview.genshi_name || '-'}</div>
                    <div className="sub">面接日 {showDate(interview.created_at)}</div>
                  </div>
                  <div className="mc-r">
                    <StatusDot status={interview.status} />
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/interviews/${interview.id}`} className="link-detail">
                        詳細 →
                      </Link>
                      <button
                        className="link-detail"
                        style={{ color: 'var(--no)' }}
                        onClick={() =>
                          openConfirm([{ id: interview.id, name: nameOf(interview) }])
                        }
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 確認モーダル（物理削除・不可逆） */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeConfirm}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,22,20,0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--hair)',
              borderRadius: 6,
              boxShadow: 'var(--shadow-md)',
              maxWidth: 460,
              width: '100%',
              padding: '24px 22px',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--serif-jp)',
                fontSize: 20,
                fontWeight: 700,
                margin: '0 0 12px',
                color: 'var(--charcoal)',
              }}
            >
              面接データを完全に削除します
            </h2>
            <p style={{ margin: '0 0 12px', color: 'var(--ink-70)', lineHeight: 1.8, fontSize: 14 }}>
              <strong style={{ color: 'var(--no)' }}>{pendingTargets.length}件</strong>
              を完全に削除します。写真も含め<strong>元に戻せません。</strong>
            </p>
            <ul
              style={{
                margin: '0 0 18px',
                paddingLeft: 18,
                color: 'var(--ink-70)',
                fontSize: 13,
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              {pendingTargets.slice(0, 8).map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
              {pendingTargets.length > 8 && <li>ほか {pendingTargets.length - 8} 件</li>}
            </ul>
            <p style={{ margin: '0 0 18px', color: 'var(--ink-50)', fontSize: 12.5 }}>
              ※ 採用済みでキャストに紐付く面接はスキップされます。
            </p>
            <div className="flex items-center justify-end gap-3">
              <button className="btn btn-ghost" onClick={closeConfirm} disabled={deleting} autoFocus>
                キャンセル
              </button>
              <button
                className="btn"
                style={{ background: 'var(--no)', borderColor: 'var(--no)', color: 'var(--cream)' }}
                onClick={runDelete}
                disabled={deleting}
              >
                {deleting ? '削除中…' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
