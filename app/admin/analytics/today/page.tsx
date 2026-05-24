'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Interview } from '@/lib/supabase/types'

export default function AnalyticsTodayPage() {
  const [todayInterviews, setTodayInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTodayInterviews(data as Interview[])
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
            <h1 className="text-3xl font-bold text-wine-red">本日の面接</h1>
            <p className="text-gray-600 mt-2">{todayInterviews.length} 件</p>
          </div>
        </div>

        {/* テーブル */}
        <div className="card-wine-border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-wine-red">
                <th className="text-left p-4 font-bold text-wine-red">氏名</th>
                <th className="text-left p-4 font-bold text-wine-red">時間</th>
                <th className="text-left p-4 font-bold text-wine-red">ステータス</th>
                <th className="text-left p-4 font-bold text-wine-red">アクション</th>
              </tr>
            </thead>
            <tbody>
              {todayInterviews.map((interview) => (
                <tr key={interview.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{interview.genshi_name}</td>
                  <td className="p-4">
                    {interview.created_at ? new Date(interview.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded text-sm font-bold text-white ${
                      interview.status === 'hired' ? 'bg-green' :
                      interview.status === 'rejected' ? 'bg-red' :
                      interview.status === 'confirmed' ? 'bg-blue' :
                      'bg-gray-400'
                    }`}>
                      {interview.status === 'hired' ? '採用済み' :
                       interview.status === 'rejected' ? '不採用' :
                       interview.status === 'confirmed' ? '確認済み' :
                       '未確認'}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/interviews/${interview.id}`}
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

        {todayInterviews.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            本日の面接予定はありません
          </div>
        )}
      </div>
    </div>
  )
}
