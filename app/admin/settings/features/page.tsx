'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getAllFeatureFlags,
  updateFeatureFlag,
} from '@/lib/supabase/feature-flags'
import type { FeatureFlag } from '@/lib/supabase/types'

type SaveStatus = 'saving' | 'saved' | 'error'

const PHASES = [1, 2]

export default function FeatureSettingsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activePhase, setActivePhase] = useState<number>(1)
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})

  const load = async () => {
    setError(null)
    const data = await getAllFeatureFlags()
    setFlags(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // ローカル状態のみ更新（保存はしない）
  const setFlagLocal = (key: string, patch: Partial<FeatureFlag>) =>
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...patch } : f))
    )

  const setStatus = (key: string, status: SaveStatus | null) =>
    setSaveStatus((prev) => {
      const next = { ...prev }
      if (status === null) delete next[key]
      else next[key] = status
      return next
    })

  // Supabase へ保存。失敗時はサーバー値で再同期。
  const persist = async (key: string, updates: Partial<FeatureFlag>) => {
    setError(null)
    setStatus(key, 'saving')
    const ok = await updateFeatureFlag(key, updates)
    if (ok) {
      setStatus(key, 'saved')
      setTimeout(() => setStatus(key, null), 1500)
    } else {
      setStatus(key, 'error')
      setError('保存に失敗しました')
      await load() // サーバーの真の状態へ戻す
    }
  }

  // トグル：enabled を反転（楽観的更新）
  const toggleFlag = (key: string) => {
    const flag = flags.find((f) => f.key === key)
    if (!flag) return
    const next = !flag.enabled
    setFlagLocal(key, { enabled: next })
    persist(key, { enabled: next })
  }

  const visibleFlags = flags.filter((f) => f.phase === activePhase)

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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="heading-2">機能管理</h1>
            <p className="text-muted text-sm mt-1">
              フェーズ2 の機能を ON/OFF・ロールアウト率で制御します
            </p>
          </div>
          <Link href="/admin" className="btn-secondary">
            ← 戻る
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red text-white rounded">{error}</div>
        )}

        {/* フェーズ別タブ */}
        <div className="flex gap-2 mb-6">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`px-4 py-2 rounded font-semibold transition ${
                activePhase === phase
                  ? 'bg-wine-red text-white'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}
            >
              フェーズ {phase}
            </button>
          ))}
        </div>

        {/* フラグカード一覧 */}
        {visibleFlags.length === 0 ? (
          <p className="text-muted">
            このフェーズの機能はありません（feature_flags テーブルが未作成の可能性があります）。
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleFlags.map((flag) => {
              const status = saveStatus[flag.key]
              return (
                <div
                  key={flag.key}
                  className="card-wine-border h-auto hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {flag.name}
                      </h2>
                      <p className="text-muted text-sm mt-1">
                        {flag.description || '—'}
                      </p>
                    </div>
                    {/* トグルスイッチ */}
                    <button
                      onClick={() => toggleFlag(flag.key)}
                      role="switch"
                      aria-checked={flag.enabled}
                      aria-label={`${flag.name} を切り替え`}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                        flag.enabled ? 'bg-green' : 'bg-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 保存ステータス */}
                  <div className="mt-3 h-5 text-xs">
                    {status === 'saving' && (
                      <span className="text-gray-600">保存中...</span>
                    )}
                    {status === 'saved' && (
                      <span className="text-green font-semibold">保存完了</span>
                    )}
                    {status === 'error' && (
                      <span className="text-error font-semibold">保存失敗</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
