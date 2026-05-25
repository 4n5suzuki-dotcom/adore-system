'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Cast } from '@/lib/supabase/types'

export default function ShiftsPage() {
  const [casts, setCasts] = useState<Cast[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // キャスト一覧取得
  useEffect(() => {
    const fetchCasts = async () => {
      const { data, error } = await supabase
        .from('casts')
        .select('*')
        .eq('status', 'active')
        .order('joined_date', { ascending: false })

      if (!error && data) {
        setCasts(data)
      }
      setLoading(false)
    }

    fetchCasts()
  }, [])

  // 月移動
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthString = currentMonth.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long'
  })

  if (loading) {
    return <div className="p-8">読み込み中...</div>
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/admin" className="text-wine-red hover:underline mb-2 inline-block">
            ← 管理画面へ戻る
          </Link>
          <h1 className="text-3xl font-bold text-wine-red mt-2">稼働カレンダー</h1>
          <p className="text-gray-600 mt-2">キャストの出勤スケジュールを管理します</p>
        </div>

        {/* 月選択 */}
        <div className="flex items-center justify-between mb-8 p-4 bg-gray-50 rounded">
          <button
            onClick={handlePrevMonth}
            className="px-4 py-2 bg-wine-red text-white rounded hover:opacity-90"
          >
            ← 前月
          </button>
          <h2 className="text-2xl font-bold text-wine-red">{monthString}</h2>
          <button
            onClick={handleNextMonth}
            className="px-4 py-2 bg-wine-red text-white rounded hover:opacity-90"
          >
            翌月 →
          </button>
        </div>

        {/* キャスト一覧 */}
        <div className="space-y-4">
          {casts.length === 0 ? (
            <p className="text-gray-600">在籍キャストがいません</p>
          ) : (
            casts.map((cast) => (
              <Link
                key={cast.id}
                href={`/admin/casts/${cast.id}?tab=shifts`}
                className="block p-4 bg-gray-50 rounded border border-gray-200 hover:bg-gold hover:text-wine-red transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{cast.genshi_name}</p>
                    <p className="text-sm text-gray-600">入店日：{cast.joined_date}</p>
                  </div>
                  <span className="text-sm bg-wine-red text-white px-3 py-1 rounded">
                    詳細を見る →
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
