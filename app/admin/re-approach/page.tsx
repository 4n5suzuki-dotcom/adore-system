'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import StatLine from '@/components/admin/StatLine'
import {
  getStalledApplicants,
  recordFollowup,
  FOLLOWUP_DEFAULT_DAYS,
  FOLLOWUP_THRESHOLDS,
  FOLLOWUP_TEMPLATES,
  fillTemplate,
  buildMailto,
  buildSms,
  buildLineLink,
  type StalledApplicant,
} from '@/lib/supabase/followups'
import '@/styles/adore-v3.css'

// ステータス → ラベル + トーン（面接一覧と同じ対応）
const STATUS_META: Record<string, { label: string; tone: string }> = {
  incomplete: { label: '未確認', tone: 'pending' },
  pending: { label: '待機中', tone: 'waiting' },
  confirmed: { label: '確認済み', tone: 'neutral' },
  processing: { label: '進行中', tone: 'waiting' },
  on_trial: { label: '体験中', tone: 'pending' },
  hired: { label: '採用済み', tone: 'positive' },
  rejected: { label: '不採用', tone: 'negative' },
}

function showDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`
}

function StatusDot({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' }
  return <StatLine tone={meta.tone} label={meta.label} />
}

// 連絡先の有無バッジ（LINE / メール / SMS）
function ContactMarks({
  hasLine,
  hasMail,
  hasSms,
}: {
  hasLine: boolean
  hasMail: boolean
  hasSms: boolean
}) {
  const items: { ok: boolean; label: string }[] = [
    { ok: hasLine, label: 'LINE' },
    { ok: hasMail, label: 'メール' },
    { ok: hasSms, label: 'SMS' },
  ]
  return (
    <span className="ra-marks">
      {items.map((it) => (
        <span key={it.label} className={'ra-mark' + (it.ok ? ' on' : '')}>
          {it.label}
        </span>
      ))}
    </span>
  )
}

export default function ReApproachPage() {
  const [rows, setRows] = useState<StalledApplicant[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState<number>(FOLLOWUP_DEFAULT_DAYS)
  const [templateKey, setTemplateKey] = useState<string>(FOLLOWUP_TEMPLATES[0].key)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  // 閾値より広い 30日以上を一度だけ取得し、表示はクライアント側で閾値フィルタ
  useEffect(() => {
    const fetchData = async () => {
      const data = await getStalledApplicants(FOLLOWUP_THRESHOLDS[0])
      setRows(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const template = useMemo(
    () => FOLLOWUP_TEMPLATES.find((t) => t.key === templateKey) ?? FOLLOWUP_TEMPLATES[0],
    [templateKey]
  )

  // 閾値で絞り込み（経過日数の長い順）
  const visibleRows = useMemo(() => {
    return rows
      .filter((r) => r.elapsedDays >= threshold)
      .sort((a, b) => b.elapsedDays - a.elapsedDays)
  }, [rows, threshold])

  const copyBody = async (id: string, name: string) => {
    const text = fillTemplate(template.body, name)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800)
    } catch (e) {
      console.error('clipboard copy failed:', e)
    }
  }

  const markContacted = async (id: string, currentCount: number | null | undefined) => {
    setSavingId(id)
    const ok = await recordFollowup(id, currentCount)
    setSavingId(null)
    if (ok) {
      // 記録できたら抽出条件から外れるので一覧から除去
      setRows((prev) => prev.filter((r) => r.interview.id !== id))
    } else {
      alert('再連絡の記録に失敗しました。時間をおいて再度お試しください。')
    }
  }

  if (loading) {
    return (
      <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen flex items-center justify-center">
        <p className="pmeta">読み込み中…</p>
      </div>
    )
  }

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head">
          <Link href="/admin" className="crumb">
            ← DASHBOARD
          </Link>
          <h1 className="ptitle">再アプローチ</h1>
          <p className="pmeta">
            {visibleRows.length} 名 — {threshold}日以上 連絡が途絶えている応募者
          </p>
        </div>

        {/* 経過日数の閾値フィルタ */}
        <div className="pills" style={{ marginBottom: 18 }}>
          {FOLLOWUP_THRESHOLDS.map((d) => (
            <button
              key={d}
              onClick={() => setThreshold(d)}
              className={'pill' + (threshold === d ? ' on' : '')}
            >
              {d}日以上
            </button>
          ))}
        </div>

        {/* 定型文テンプレート選択 */}
        <div className="flex flex-wrap items-end gap-4" style={{ marginBottom: 28 }}>
          <div className="field">
            <label className="fl">定型文テンプレート</label>
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
              {FOLLOWUP_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <p className="pmeta" style={{ maxWidth: 420 }}>
            メール・SMS・コピーに「{template.label}」を使用（氏名は自動差し込み）
          </p>
        </div>

        {/* 一覧 */}
        {visibleRows.length === 0 ? (
          <div className="empty">該当する応募者はいません</div>
        ) : (
          <>
            {/* PC：テーブル */}
            <div className="hidden md:block">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>氏名</th>
                    <th className="ta-r">ステータス</th>
                    <th>起点日（最終更新）</th>
                    <th className="ta-r">経過</th>
                    <th>連絡先</th>
                    <th>アクション</th>
                    <th>最終再連絡</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ interview: iv, baselineAt, elapsedDays }) => {
                    const name = iv.genshi_name || '—'
                    const hasLine = !!iv.line_id
                    const hasMail = !!iv.email
                    const hasSms = !!iv.phone
                    const body = fillTemplate(template.body, iv.genshi_name)
                    return (
                      <tr key={iv.id}>
                        <td className="nm">
                          {name}
                          {iv.furigana && <span className="kn">{iv.furigana}</span>}
                        </td>
                        <td className="ta-r">
                          <StatusDot status={iv.status} />
                        </td>
                        <td className="dt">{showDate(baselineAt)}</td>
                        <td className="ta-r num" style={{ color: 'var(--brass-deep)' }}>
                          {elapsedDays}日
                        </td>
                        <td>
                          <ContactMarks hasLine={hasLine} hasMail={hasMail} hasSms={hasSms} />
                        </td>
                        <td>
                          <div className="ra-actions">
                            {hasLine && (
                              <a
                                className="ra-act"
                                href={buildLineLink(iv.line_id as string)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                LINE
                              </a>
                            )}
                            {hasMail && (
                              <a
                                className="ra-act"
                                href={buildMailto(iv.email, template.subject, body)}
                              >
                                メール
                              </a>
                            )}
                            {hasSms && (
                              <a className="ra-act" href={buildSms(iv.phone, body)}>
                                SMS
                              </a>
                            )}
                            <button
                              className="ra-act"
                              onClick={() => copyBody(iv.id, iv.genshi_name)}
                            >
                              {copiedId === iv.id ? 'コピー済' : '本文コピー'}
                            </button>
                            <button
                              className="ra-act ra-done"
                              disabled={savingId === iv.id}
                              onClick={() => markContacted(iv.id, iv.followup_count)}
                            >
                              {savingId === iv.id ? '記録中…' : '連絡した'}
                            </button>
                          </div>
                        </td>
                        <td className="dt">{showDate(iv.last_followup_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* モバイル：カード */}
            <div className="md:hidden mcards">
              {visibleRows.map(({ interview: iv, baselineAt, elapsedDays }) => {
                const name = iv.genshi_name || '—'
                const hasLine = !!iv.line_id
                const hasMail = !!iv.email
                const hasSms = !!iv.phone
                const body = fillTemplate(template.body, iv.genshi_name)
                return (
                  <div key={iv.id} className="mcard ra-mcard">
                    <div className="ra-mc-head">
                      <div className="mc-l">
                        <div className="nm">{name}</div>
                        <div className="sub">
                          起点 {showDate(baselineAt)}・経過 {elapsedDays}日
                        </div>
                      </div>
                      <div className="mc-r">
                        <StatusDot status={iv.status} />
                      </div>
                    </div>

                    <div className="ra-mc-row">
                      <ContactMarks hasLine={hasLine} hasMail={hasMail} hasSms={hasSms} />
                      <span className="sub">
                        最終再連絡 {showDate(iv.last_followup_at)}
                      </span>
                    </div>

                    <div className="ra-actions">
                      {hasLine && (
                        <a
                          className="ra-act"
                          href={buildLineLink(iv.line_id as string)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          LINE
                        </a>
                      )}
                      {hasMail && (
                        <a className="ra-act" href={buildMailto(iv.email, template.subject, body)}>
                          メール
                        </a>
                      )}
                      {hasSms && (
                        <a className="ra-act" href={buildSms(iv.phone, body)}>
                          SMS
                        </a>
                      )}
                      <button className="ra-act" onClick={() => copyBody(iv.id, iv.genshi_name)}>
                        {copiedId === iv.id ? 'コピー済' : '本文コピー'}
                      </button>
                      <button
                        className="ra-act ra-done"
                        disabled={savingId === iv.id}
                        onClick={() => markContacted(iv.id, iv.followup_count)}
                      >
                        {savingId === iv.id ? '記録中…' : '連絡した'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
