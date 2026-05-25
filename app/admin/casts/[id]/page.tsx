'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/constants'
import type { Cast, CastPerformance, ShiftSchedule } from '@/lib/supabase/types'

// JST でずれないようローカル日付から YYYY-MM-DD を組み立てる（toISOString は UTC 変換で1日ずれる）
function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function CastDetailContent() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') || 'info'
  const [activeTab, setActiveTab] = useState(tabParam)
  const [cast, setCast] = useState<Cast | null>(null)
  const [performances, setPerformances] = useState<CastPerformance[]>([])
  const [loading, setLoading] = useState(true)

  // 出勤スケジュール用 state
  const [shiftMonth, setShiftMonth] = useState(new Date())
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [shifts, setShifts] = useState<Record<string, ShiftSchedule>>({})

  useEffect(() => {
    const fetchData = async () => {
      // キャスト基本情報
      const { data: castData } = await supabase
        .from('casts')
        .select('*')
        .eq('id', id)
        .single()

      if (castData) {
        setCast(castData as Cast)
      }

      // 月別実績
      const { data: perfData } = await supabase
        .from('cast_performance')
        .select('*')
        .eq('cast_id', id)
        .order('month', { ascending: false })

      if (perfData) {
        setPerformances(perfData as CastPerformance[])
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  // 既存シフトを取得（月変更時に再取得）
  useEffect(() => {
    const fetchShifts = async () => {
      if (!cast?.id) return

      const monthStart = toLocalDateStr(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth(), 1))
      const monthEnd = toLocalDateStr(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() + 1, 0))

      const { data } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('cast_id', cast.id)
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd)

      if (data) {
        const shiftMap = data.reduce((acc, shift) => {
          // PostgreSQL の TIME は HH:MM:SS で返るため HH:MM に正規化（ラジオ値と一致させる）
          acc[shift.shift_date] = {
            ...shift,
            start_time: shift.start_time.slice(0, 5),
            end_time: shift.end_time.slice(0, 5)
          }
          return acc
        }, {} as Record<string, ShiftSchedule>)
        setShifts(shiftMap)
      }
    }

    fetchShifts()
  }, [cast?.id, shiftMonth])

  if (loading) return <div className="p-8">読み込み中...</div>
  if (!cast) return <div className="p-8">キャストが見つかりません</div>

  const statusLabel = {
    active: '在籍中',
    trial: '体験中',
    retired: '退店済み'
  }

  // 出勤シフトを保存（同日重複は UNIQUE(cast_id, shift_date) で上書き）
  const handleSaveShift = async () => {
    if (!cast?.id || !selectedDate || !selectedTimeSlot) return

    const [startTime, endTime] = selectedTimeSlot.split('-')

    try {
      const { error } = await supabase
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

      if (!error) {
        // 楽観的更新：DB結果を待たずにローカルの shifts を更新（即座にハイライト）
        setShifts({
          ...shifts,
          [selectedDate]: {
            id: 'temp-' + Date.now(), // 一時ID
            cast_id: cast.id,
            shift_date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            tenant_id: DEFAULT_TENANT_ID,
            memo: null
          }
        })

        alert('シフトを保存しました')
        setShowTimeModal(false)
        setSelectedDate(null)
        setSelectedTimeSlot('')
      } else {
        alert('保存に失敗しました：' + error.message)
      }
    } catch (err) {
      alert('エラーが発生しました')
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/admin/casts" className="text-wine-red hover:underline mb-2 inline-block">
            ← キャスト一覧へ戻る
          </Link>
          <h1 className="text-3xl font-bold text-wine-red mt-2">{cast.genshi_name}</h1>
          <p className="text-gray-600 mt-2">{cast.furigana}</p>
        </div>

        {/* タブメニュー */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'info'
                ? 'border-b-2 border-wine-red text-wine-red'
                : 'text-gray-600'
            }`}
          >
            基本情報
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'performance'
                ? 'border-b-2 border-wine-red text-wine-red'
                : 'text-gray-600'
            }`}
          >
            月別実績
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'shifts'
                ? 'border-b-2 border-wine-red text-wine-red'
                : 'text-gray-600'
            }`}
          >
            出勤スケジュール
          </button>
        </div>

        {/* 基本情報タブ */}
        {activeTab === 'info' && (
          <div className="card-wine-border p-6 mb-8">
            <h2 className="heading-2 text-2xl font-bold text-wine-red mb-4">基本情報</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">年齢</p>
                <p className="text-lg font-semibold">{cast.age} 歳</p>
              </div>
              <div>
                <p className="text-gray-600">入店日</p>
                <p className="text-lg font-semibold">
                  {cast.joined_date ? new Date(cast.joined_date).toLocaleDateString('ja-JP') : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">ステータス</p>
                <p className="text-lg font-semibold">{statusLabel[cast.status as keyof typeof statusLabel]}</p>
              </div>
              <div>
                <p className="text-gray-600">連絡先</p>
                <p className="text-lg font-semibold">{cast.contact_info || '—'}</p>
              </div>
            </div>
            {cast.memo && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-600 mb-2">メモ</p>
                <p className="text-gray-800">{cast.memo}</p>
              </div>
            )}
          </div>
        )}

        {/* 月別実績タブ */}
        {activeTab === 'performance' && (
          <div className="card-wine-border p-6">
            <h2 className="heading-2 text-2xl font-bold text-wine-red mb-4">月別実績</h2>

            {performances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-wine-red">
                      <th className="text-left p-4 font-bold text-wine-red">月</th>
                      <th className="text-left p-4 font-bold text-wine-red">出勤日数</th>
                      <th className="text-left p-4 font-bold text-wine-red">売上</th>
                      <th className="text-left p-4 font-bold text-wine-red">バック</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performances.map((perf) => (
                      <tr key={perf.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-semibold">{perf.month}</td>
                        <td className="p-4">{perf.attendance_days} 日</td>
                        <td className="p-4">¥{perf.sales_total?.toLocaleString() || '0'}</td>
                        <td className="p-4 font-bold text-wine-red">¥{perf.back_earned?.toLocaleString() || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">実績がまだ登録されていません</p>
            )}
          </div>
        )}

        {/* 出勤スケジュールタブ */}
        {activeTab === 'shifts' && (
          <div className="p-6 bg-gray-50 rounded">
            <h3 className="text-lg font-bold text-wine-red mb-6">出勤スケジュール</h3>

            {/* 月選択 */}
            <div className="flex items-center justify-between mb-6 p-4 bg-white rounded border border-gray-200">
              <button
                onClick={() => setShiftMonth(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() - 1))}
                className="px-3 py-1 bg-wine-red text-white rounded text-sm hover:opacity-90"
              >
                ← 前月
              </button>
              <h4 className="text-lg font-bold text-wine-red">
                {shiftMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
              </h4>
              <button
                onClick={() => setShiftMonth(new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() + 1))}
                className="px-3 py-1 bg-wine-red text-white rounded text-sm hover:opacity-90"
              >
                翌月 →
              </button>
            </div>

            {/* カレンダーグリッド */}
            <div className="bg-white rounded border border-gray-200 overflow-hidden">
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 gap-0 border-b border-gray-200">
                {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                  <div key={day} className="p-3 text-center font-bold bg-wine-red text-white text-sm">
                    {day}
                  </div>
                ))}
              </div>

              {/* 日付セル */}
              <div className="grid grid-cols-7 gap-0">
                {Array.from({
                  length: new Date(shiftMonth.getFullYear(), shiftMonth.getMonth(), 1).getDay()
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-4 bg-gray-100 border-r border-b border-gray-200"></div>
                ))}

                {Array.from({
                  length: new Date(shiftMonth.getFullYear(), shiftMonth.getMonth() + 1, 0).getDate()
                }).map((_, i) => {
                  const date = new Date(shiftMonth.getFullYear(), shiftMonth.getMonth(), i + 1)
                  const dateStr = toLocalDateStr(date)
                  const hasShift = shifts[dateStr]

                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        setSelectedDate(dateStr)
                        if (hasShift) {
                          const normalizedTime = `${hasShift.start_time.slice(0, 5)}-${hasShift.end_time.slice(0, 5)}`
                          setSelectedTimeSlot(normalizedTime)
                        } else {
                          // 新規日付は select の表示既定値と state を一致させる（未操作のまま保存しても登録される）
                          setSelectedTimeSlot('20:00-03:00')
                        }
                        setShowTimeModal(true)
                      }}
                      className={`p-4 border-r border-b border-gray-200 transition text-sm h-20 flex flex-col items-center justify-center ${
                        hasShift
                          ? 'bg-gold text-wine-red font-bold hover:opacity-80'
                          : 'hover:bg-gold hover:text-wine-red'
                      }`}
                    >
                      <div className="font-bold">{i + 1}</div>
                      {hasShift && (
                        <div className="text-xs mt-1">
                          ✅ {hasShift.start_time.slice(0, 5)}
                        </div>
                      )}
                      {!hasShift && <div className="text-xs mt-1">クリック</div>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 時間帯選択モーダル */}
            {showTimeModal && selectedDate && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded p-6 w-96 shadow-lg">
                  <h4 className="text-lg font-bold text-wine-red mb-4">
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} の出勤時間
                  </h4>

                  {/* 開始時間 */}
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

                  {/* 終了時間 */}
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

                  {/* ボタン */}
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
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CastDetailPage() {
  return (
    <Suspense fallback={<div className="p-8">読み込み中...</div>}>
      <CastDetailContent />
    </Suspense>
  )
}
