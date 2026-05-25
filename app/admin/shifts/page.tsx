'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Cast, ShiftSchedule } from '@/lib/supabase/types'

export default function ShiftsPage() {
  const [casts, setCasts] = useState<Cast[]>([])
  const [shifts, setShifts] = useState<ShiftSchedule[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // キャスト一覧 + 当月シフト取得
  useEffect(() => {
    const fetchData = async () => {
      // キャスト取得
      const { data: castsData } = await supabase
        .from('casts')
        .select('*')
        .eq('status', 'active')
        .order('joined_date', { ascending: false })

      if (castsData) {
        setCasts(castsData)
      }

      // 当月シフト取得
      const monthStart = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`
      const monthEnd = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()}`

      const { data: shiftsData } = await supabase
        .from('shift_schedules')
        .select('*')
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd)

      if (shiftsData) {
        setShifts(shiftsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [currentMonth])

  // 本日の出勤者を抽出
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayShifts = shifts.filter((s) => s.shift_date === todayStr)
  const todayWorkers = casts.filter((cast) =>
    todayShifts.some((s) => s.cast_id === cast.id)
  )

  // 日付ごとの出勤者数を集計
  const shiftsCountByDate: Record<string, number> = {}
  shifts.forEach((shift) => {
    shiftsCountByDate[shift.shift_date] = (shiftsCountByDate[shift.shift_date] || 0) + 1
  })

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
          <p className="text-gray-600 mt-2">全キャストの出勤スケジュールを一覧表示します</p>
        </div>

        {/* 本日の出勤者 */}
        <div className="mb-8 p-6 bg-gold rounded border-2 border-wine-red">
          <h2 className="text-2xl font-bold text-wine-red mb-4">
            📅 本日（{today.toLocaleDateString('ja-JP')}）の出勤者
          </h2>
          {todayWorkers.length === 0 ? (
            <p className="text-gray-600">本日の出勤予定者はいません</p>
          ) : (
            <div className="space-y-2">
              {todayWorkers.map((cast) => {
                const shift = todayShifts.find((s) => s.cast_id === cast.id)
                return (
                  <div key={cast.id} className="p-3 bg-white rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-wine-red">{cast.genshi_name}</span>
                      {shift && (
                        <span className="text-sm bg-wine-red text-white px-3 py-1 rounded">
                          {shift.start_time.slice(0, 5)} ～ {shift.end_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 月別カレンダー */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-wine-red mb-4">📆 {monthString} の出勤状況</h2>

          {/* 月選択 */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded">
            <button
              onClick={handlePrevMonth}
              className="px-4 py-2 bg-wine-red text-white rounded hover:opacity-90"
            >
              ← 前月
            </button>
            <h3 className="text-xl font-bold text-wine-red">{monthString}</h3>
            <button
              onClick={handleNextMonth}
              className="px-4 py-2 bg-wine-red text-white rounded hover:opacity-90"
            >
              翌月 →
            </button>
          </div>

          {/* 1行リスト形式カレンダー */}
          <div className="space-y-2">
            {Array.from({
              length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
            }).map((_, i) => {
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              const workerCount = shiftsCountByDate[dateStr] || 0
              const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]

              return (
                <div
                  key={dateStr}
                  className={`flex items-center justify-between p-3 rounded border-l-4 transition ${
                    workerCount > 0
                      ? 'bg-gold border-l-wine-red'
                      : 'bg-gray-50 border-l-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20">
                      <p className="font-bold text-wine-red text-sm md:text-base">
                        {i + 1}日（{dayOfWeek}）
                      </p>
                    </div>
                    {workerCount > 0 && (
                      <div className="text-sm text-wine-red font-semibold">
                        👥 {workerCount}名出勤
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDate(dateStr)
                      setShowDetailsModal(true)
                    }}
                    className="px-3 py-1 md:px-4 md:py-2 bg-wine-red text-white rounded text-xs md:text-sm hover:opacity-90"
                  >
                    詳細
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* キャスト一覧（詳細へのリンク） */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-wine-red mb-4">👥 キャスト一覧</h2>
          <div className="space-y-3">
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

      {/* 日別出勤者 詳細モーダル */}
      {showDetailsModal && selectedDate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const dayShifts = shifts.filter((s) => s.shift_date === selectedDate)
              const dayWorkers = casts.filter((cast) =>
                dayShifts.some((s) => s.cast_id === cast.id)
              )
              const d = new Date(selectedDate)
              const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
              const title = `${d.getMonth() + 1}月${d.getDate()}日（${dayOfWeek}）の出勤者`

              return (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-wine-red">{title}</h3>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                      aria-label="閉じる"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4">
                    {dayWorkers.length === 0 ? (
                      <p className="text-gray-600">この日の出勤予定者はいません</p>
                    ) : (
                      <div className="space-y-2">
                        {dayWorkers.map((cast) => {
                          const shift = dayShifts.find((s) => s.cast_id === cast.id)
                          return (
                            <div
                              key={cast.id}
                              className="flex justify-between items-center p-3 bg-gray-50 rounded"
                            >
                              <span className="font-bold text-wine-red">{cast.genshi_name}</span>
                              {shift && (
                                <span className="text-sm bg-wine-red text-white px-3 py-1 rounded">
                                  {shift.start_time.slice(0, 5)} ～ {shift.end_time.slice(0, 5)}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
