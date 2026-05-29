'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Cast } from '@/lib/supabase/types'
import StatLine from '@/components/admin/StatLine'
import '@/styles/adore-v3.css'

// ステータス → ラベル + トーン
const STATUS_META: Record<string, { label: string; tone: string }> = {
  active: { label: '在籍中', tone: 'positive' },
  trial: { label: '体験中', tone: 'pending' },
  retired: { label: '退店済み', tone: 'neutral' },
}

const FILTERS: { key: 'all' | 'active' | 'trial' | 'retired'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'active', label: '在籍中' },
  { key: 'trial', label: '体験中' },
  { key: 'retired', label: '退店済み' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`
}

export default function CastsPage() {
  const [casts, setCasts] = useState<Cast[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'retired'>('active')

  useEffect(() => {
    const fetchCasts = async () => {
      let query = supabase.from('casts').select('*')

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query.order('joined_date', { ascending: false })

      // 診断用ログ（ブラウザの開発者ツール > Console で確認）
      console.log('[casts] filter =', filter, '| rows =', data?.length ?? 0, '| data =', data)
      if (error) console.error('[casts] fetch error:', error)

      if (!error && data) {
        setCasts(data as Cast[])
      }
      setLoading(false)
    }

    fetchCasts()
  }, [filter])

  if (loading) {
    return (
      <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen flex items-center justify-center">
        <p className="pmeta">読み込み中…</p>
      </div>
    )
  }

  const meta = (s: string) => STATUS_META[s] ?? { label: s, tone: 'neutral' }

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head">
          <Link href="/admin" className="crumb">
            ← DASHBOARD
          </Link>
          <h1 className="ptitle">在籍キャスト</h1>
          <p className="pmeta">{casts.length} 名</p>
        </div>

        {/* フィルタ */}
        <div className="pills" style={{ marginBottom: 26 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={'pill' + (filter === f.key ? ' on' : '')}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 一覧 */}
        {casts.length === 0 ? (
          <div className="empty">キャストが見つかりません</div>
        ) : (
          <>
            {/* PC：テーブル */}
            <div className="hidden md:block">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>源氏名</th>
                    <th>入店日</th>
                    <th className="ta-r">ステータス</th>
                    <th className="ta-r"></th>
                  </tr>
                </thead>
                <tbody>
                  {casts.map((cast) => {
                    const m = meta(cast.status)
                    return (
                      <tr key={cast.id}>
                        <td className="nm">{cast.genshi_name}</td>
                        <td className="dt">{formatDate(cast.joined_date)}</td>
                        <td className="ta-r">
                          <StatLine tone={m.tone} label={m.label} />
                        </td>
                        <td className="ta-r">
                          <Link href={`/admin/casts/${cast.id}`} className="link-detail">
                            詳細
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* モバイル：カード */}
            <div className="md:hidden mcards">
              {casts.map((cast) => {
                const m = meta(cast.status)
                return (
                  <Link key={cast.id} href={`/admin/casts/${cast.id}`} className="mcard">
                    <div className="mc-l">
                      <div className="nm">{cast.genshi_name}</div>
                      <div className="sub">入店 {formatDate(cast.joined_date)}</div>
                    </div>
                    <div className="mc-r">
                      <StatLine tone={m.tone} label={m.label} />
                      <span className="link-detail">詳細 →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
