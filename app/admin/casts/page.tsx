'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Cast } from '@/lib/supabase/types'

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

  if (loading) return <div className="p-8">読み込み中...</div>

  const statusLabel = {
    active: '在籍中',
    trial: '体験中',
    retired: '退店済み'
  }

  const statusColor = {
    active: 'bg-green text-white',
    trial: 'bg-blue text-white',
    retired: 'bg-gray-400 text-white'
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/admin" className="text-wine-red hover:underline mb-2 inline-block">
            ← ダッシュボードへ戻る
          </Link>
          <h1 className="text-3xl font-bold text-wine-red mt-2">キャスト一覧</h1>
          <p className="text-gray-600 mt-2">{casts.length} 名</p>
        </div>

        {/* フィルタボタン */}
        <div className="flex gap-4 mb-8">
          {(['all', 'active', 'trial', 'retired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded font-bold transition ${
                filter === status
                  ? 'bg-wine-red text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-400'
              }`}
            >
              {status === 'all'
                ? 'すべて'
                : statusLabel[status as 'active' | 'trial' | 'retired']}
            </button>
          ))}
        </div>

        {/* 一覧（モバイル：カード / PC：テーブル） */}
        {casts.length === 0 ? (
          <div className="card-wine-border text-center py-8 text-gray-600">
            キャストが見つかりません
          </div>
        ) : (
          <>
            {/* モバイル：カード表示 */}
            <div className="block md:hidden space-y-3">
              {casts.map((cast) => (
                <Link
                  key={cast.id}
                  href={`/admin/casts/${cast.id}`}
                  className="card-wine-border block p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold">{cast.genshi_name}</span>
                    <span className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${statusColor[cast.status as keyof typeof statusColor]}`}>
                      {statusLabel[cast.status as keyof typeof statusLabel]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    入店日：{cast.joined_date ? new Date(cast.joined_date).toLocaleDateString('ja-JP') : '—'}
                  </p>
                </Link>
              ))}
            </div>

            {/* PC：テーブル表示 */}
            <div className="hidden md:block">
              <div className="card-wine-border overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-wine-red">
                      <th className="text-left p-2 md:p-4 text-sm md:text-base font-bold text-wine-red whitespace-nowrap">氏名</th>
                      <th className="text-left p-2 md:p-4 text-sm md:text-base font-bold text-wine-red whitespace-nowrap">入店日</th>
                      <th className="text-left p-2 md:p-4 text-sm md:text-base font-bold text-wine-red whitespace-nowrap">ステータス</th>
                      <th className="text-left p-2 md:p-4 text-sm md:text-base font-bold text-wine-red whitespace-nowrap">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casts.map((cast) => (
                      <tr key={cast.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 md:p-4 text-sm md:text-base font-semibold whitespace-nowrap">{cast.genshi_name}</td>
                        <td className="p-2 md:p-4 text-sm md:text-base">
                          {cast.joined_date ? new Date(cast.joined_date).toLocaleDateString('ja-JP') : '—'}
                        </td>
                        <td className="p-2 md:p-4 text-sm md:text-base">
                          <span className={`px-3 py-1 rounded text-sm font-bold ${statusColor[cast.status as keyof typeof statusColor]}`}>
                            {statusLabel[cast.status as keyof typeof statusLabel]}
                          </span>
                        </td>
                        <td className="p-2 md:p-4 text-sm md:text-base">
                          <Link
                            href={`/admin/casts/${cast.id}`}
                            className="text-wine-red hover:underline"
                          >
                            詳細
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
