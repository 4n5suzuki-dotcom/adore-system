'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/constants'
import { validateAccessToken } from '@/lib/supabase/shifts'
import type { Cast, ShiftSchedule, ShiftAccessToken } from '@/lib/supabase/types'

function PublicShiftsContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [cast, setCast] = useState<Cast | null>(null)
  const [tokenData, setTokenData] = useState<ShiftAccessToken | null>(null)
  const [shifts, setShifts] = useState<ShiftSchedule[]>([])
  const [shiftMonth, setShiftMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // トークン検証 + キャスト情報取得
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('トークンが見つかりません')
        setLoading(false)
        return
      }

      const valid = await validateAccessToken(token)
      if (!valid) {
        setError('トークンが無効または期限切れです')
        setLoading(false)
        return
      }

      setTokenData(valid)

      // キャスト情報取得
      const { data: castData } = await supabase
        .from('casts')
        .select('*')
        .eq('id', valid.cast_id)
        .single()

      if (castData) {
        setCast(castData)
      }

      // 申告月のシフト取得
      const monthStart = `${shiftMonth.getFullYear()}-${String(shiftMonth.getMonth() + 1).padStart(2, '0')}-01`
      const monthEnd = `${shiftMonth.getFullYear()}-${String(shiftMonth.getMonth() + 1).padStart(2, '0')}-${new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() + 1, 0).getDate()}`

      const { data: shiftsData } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('cast_id', valid.cast_id)
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd)

      if (shiftsData) {
        setShifts(shiftsData)
      }

      setLoading(false)
    }

    validateToken()
  }, [token, shiftMonth])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-red to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-lg font-semibold text-gray-700">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-red to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-wine-red mb-4">❌ エラー</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            メールのリンクをもう一度確認するか、管理者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  if (!cast || !tokenData) {
    return null
  }

  // 時間帯選択時の shifts 記録
  const shiftsMap: Record<string, ShiftSchedule> = {}
  shifts.forEach((shift) => {
    shiftsMap[shift.shift_date] = shift
  })

  const handleSaveShift = async () => {
    if (!cast?.id || !selectedDate || !selectedTimeSlot) return

    const [startTime, endTime] = selectedTimeSlot.split('-')

    try {
      const { error: saveError } = await supabase
        .from('shift_schedules')
        .upsert(
          {
            cast_id: cast.id,
            shift_date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            tenant_id: DEFAULT_TENANT_ID
          },
          { onConflict: 'cast_id,shift_date' }
        )

      if (!saveError) {
        setShifts([
          ...shifts.filter((s) => s.shift_date !== selectedDate),
          {
            id: 'temp-' + Date.now(),
            cast_id: cast.id,
            shift_date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            tenant_id: DEFAULT_TENANT_ID,
            memo: null
          }
        ])

        alert('シフトを申告しました！')
        setShowTimeModal(false)
        setSelectedDate(null)
        setSelectedTimeSlot('')
      } else {
        alert('保存に失敗しました')
      }
    } catch (err) {
      alert('エラーが発生しました')
    }
  }

  const handlePrevMonth = () => {
    setShiftMonth(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setShiftMonth(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() + 1))
  }

  const monthString = shiftMonth.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long'
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-red to-red-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-wine-red mb-2">シフト申告フォーム</h1>
          <p className="text-gray-600">
            こんにちは、<span className="font-bold text-wine-red">{cast.genshi_name}</span>さん！
          </p>
          <p className="text-sm text-gray-500 mt-2">
            下記カレンダーから出勤予定日と時間を選択してください
          </p>
        </div>

        {/* 有効期限通知 */}
        <div className="bg-gold text-wine-red rounded-lg shadow-lg p-4 mb-6">
          <p className="text-sm font-semibold">
            ⏰ このリンクの有効期限：{new Date(tokenData.expires_at).toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* カレンダー */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
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

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
              <div key={day} className="text-center font-bold text-wine-red text-sm p-2">
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({
              length: new Date(shiftMonth.getFullYear(), shiftMonth.getMonth(), 1).getDay()
            }).map((_, i) => (
              <div key={`empty-${i}`} className="p-4"></div>
            ))}

            {Array.from({
              length: new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() + 1, 0).getDate()
            }).map((_, i) => {
              const date = new Date(shiftMonth.getFullYear(), shiftMonth.getMonth(), i + 1)
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              const hasShift = shiftsMap[dateStr]

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr)
                    if (hasShift) {
                      setSelectedTimeSlot(`${hasShift.start_time.slice(0, 5)}-${hasShift.end_time.slice(0, 5)}`)
                    } else {
                      setSelectedTimeSlot('20:00-03:00')
                    }
                    setShowTimeModal(true)
                  }}
                  className={`p-4 rounded border-2 transition text-sm h-20 flex flex-col items-center justify-center ${
                    hasShift
                      ? 'bg-gold text-wine-red border-wine-red font-bold hover:opacity-80'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gold hover:text-wine-red'
                  }`}
                >
                  <div className="font-bold">{i + 1}</div>
                  {hasShift && <div className="text-xs mt-1">✅ {hasShift.start_time.slice(0, 5)}</div>}
                </button>
              )
            })}
          </div>
        </div>

        {/* モーダル */}
        {showTimeModal && selectedDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-bold text-wine-red mb-4">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', {
                  month: 'long',
                  day: 'numeric'
                })}{' '}
                の出勤時間
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">開始時間</label>
                <select
                  value={selectedTimeSlot.split('-')[0] || '20:00'}
                  onChange={(e) => {
                    const endTime = selectedTimeSlot.split('-')[1] || '03:00'
                    setSelectedTimeSlot(`${e.target.value}-${endTime}`)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="20:00">20:00</option>
                  <option value="20:30">20:30</option>
                  <option value="21:00">21:00</option>
                  <option value="21:30">21:30</option>
                  <option value="22:00">22:00</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">終了時間</label>
                <select
                  value={selectedTimeSlot.split('-')[1] || '03:00'}
                  onChange={(e) => {
                    const startTime = selectedTimeSlot.split('-')[0] || '20:00'
                    setSelectedTimeSlot(`${startTime}-${e.target.value}`)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="00:00">00:00</option>
                  <option value="01:00">01:00</option>
                  <option value="02:00">02:00</option>
                  <option value="03:00">03:00</option>
                  <option value="04:00">04:00</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTimeModal(false)
                    setSelectedDate(null)
                    setSelectedTimeSlot('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:opacity-90"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveShift}
                  className="flex-1 px-4 py-2 bg-wine-red text-white rounded hover:opacity-90"
                >
                  申告する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PublicShiftsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-wine-red to-red-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-lg font-semibold text-gray-700">読み込み中...</p>
          </div>
        </div>
      }
    >
      <PublicShiftsContent />
    </Suspense>
  )
}
