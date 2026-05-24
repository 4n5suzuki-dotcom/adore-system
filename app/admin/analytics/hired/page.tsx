'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Interview } from '@/lib/supabase/types'

export default function AnalyticsHiredPage() {
  const [hiredCandidates, setHiredCandidates] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('status', 'hired')
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setHiredCandidates(data as Interview[])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-8">読み込み中...</div>

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-wine-red hover:underline mb-2 inline-block">
              ← ダッシュボードへ戻る
            </Link>
            <h1 className="text-3xl font-bold text-wine-red">採用者一覧</h1>
            <p className="text-gray-600 mt-2">{hiredCandidates.length} 名</p>
          </div>
        </div>

        {/* テーブル */}
        <div className="card-wine-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-wine-red">
                <th className="text-left p-4 font-bold text-wine-red">氏名</th>
                <th className="text-left p-4 font-bold text-wine-red">採用日</th>
                <th className="text-left p-4 font-bold text-wine-red">アクション</th>
              </tr>
            </thead>
            <tbody>
              {hiredCandidates.map((candidate) => (
                <tr key={candidate.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{candidate.genshi_name}</td>
                  <td className="p-4">
                    {candidate.updated_at ? new Date(candidate.updated_at).toLocaleDateString('ja-JP') : '—'}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/interviews/${candidate.id}`}
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
    </div>
  )
}
