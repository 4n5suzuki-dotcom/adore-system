'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Cast, ShiftSchedule } from '@/lib/supabase/types'
import '@/styles/adore-v3.css'

const WD = ['日', '月', '火', '水', '木', '金', '土']

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function dateStr(y: number, m0: number, day: number) {
  return `${y}-${pad(m0 + 1)}-${pad(day)}`
}

/* ---------- 月別カレンダー（出勤数） ---------- */
function MonthCalendar({
  year,
  month0,
  counts,
  todayDay,
  onPick,
}: {
  year: number
  month0: number
  counts: number[] // counts[day-1]
  todayDay: number | null
  onPick: (day: number) => void
}) {
  const daysInMonth = counts.length
  const firstWeekday = new Date(year, month0, 1).getDay()
  const max = Math.max(...counts, 1)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="cal">
      <div className="cal-head">
        {WD.map((w, i) => (
          <div key={i} className={'cal-wd' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>
            {w}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />
          const c = counts[d - 1]
          const wd = (firstWeekday + d - 1) % 7
          const intensity = c === 0 ? 0 : 0.08 + (c / max) * 0.42
          return (
            <button
              key={i}
              onClick={() => onPick(d)}
              className={'cal-cell' + (d === todayDay ? ' today' : '')}
              style={{
                background: c
                  ? `color-mix(in srgb, var(--brass) ${Math.round(intensity * 100)}%, var(--paper))`
                  : 'var(--paper)',
              }}
            >
              <span className={'cal-d' + (wd === 0 ? ' sun' : wd === 6 ? ' sat' : '')}>{d}</span>
              {c > 0 && (
                <span className="cal-c">
                  {c}
                  <i>名</i>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- 稼働ヒートマップ（曜日 × 週） ---------- */
function Heatmap({ year, month0, counts }: { year: number; month0: number; counts: number[] }) {
  const daysInMonth = counts.length
  const firstWeekday = new Date(year, month0, 1).getDay()
  const max = Math.max(...counts, 1)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = cells.length / 7
  const shade = (c: number | null) =>
    c == null
      ? 'transparent'
      : c === 0
        ? 'var(--cream-2)'
        : `color-mix(in srgb, var(--brass) ${Math.round((0.18 + (c / max) * 0.62) * 100)}%, var(--paper))`

  return (
    <div className="hm">
      <div className="hm-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {WD.map((_, r) => (
          <div key={r} style={{ display: 'contents' }}>
            {Array.from({ length: weeks }).map((_, c) => {
              const d = cells[c * 7 + r]
              return (
                <div
                  key={c}
                  className="hm-cell"
                  title={d ? `${d}日: ${counts[d - 1]}名` : ''}
                  style={{
                    background: shade(d ? counts[d - 1] : null),
                    border: d == null ? '1px solid transparent' : '1px solid var(--hair)',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="hm-legend">
        <span>少</span>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <i
            key={i}
            style={{
              background:
                i === 0
                  ? 'var(--cream-2)'
                  : `color-mix(in srgb, var(--brass) ${Math.round((0.18 + t * 0.62) * 100)}%, var(--paper))`,
            }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}

export default function ShiftsPage() {
  const [casts, setCasts] = useState<Cast[]>([])
  const [shifts, setShifts] = useState<ShiftSchedule[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // キャスト一覧 + 当月シフト取得（既存ロジックそのまま）
  useEffect(() => {
    const fetchData = async () => {
      const { data: castsData } = await supabase
        .from('casts')
        .select('*')
        .eq('status', 'active')
        .order('joined_date', { ascending: false })

      if (castsData) {
        setCasts(castsData)
      }

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
  const todayWorkers = casts.filter((cast) => todayShifts.some((s) => s.cast_id === cast.id))

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

  const monthString = currentMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen flex items-center justify-center">
        <p className="pmeta">読み込み中…</p>
      </div>
    )
  }

  // カレンダー集計
  const year = currentMonth.getFullYear()
  const month0 = currentMonth.getMonth()
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const counts = Array.from({ length: daysInMonth }, (_, i) => shiftsCountByDate[dateStr(year, month0, i + 1)] || 0)
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month0
  const todayDay = isThisMonth ? today.getDate() : null

  // 今月サマリー
  const monthTotal = counts.reduce((a, b) => a + b, 0)
  const activeCount = casts.length
  const avg = activeCount > 0 ? (monthTotal / activeCount).toFixed(1) : '0'
  const peakCount = Math.max(...counts, 0)
  const peakDay = counts.indexOf(peakCount) + 1

  const openDay = (day: number) => {
    setSelectedDate(dateStr(year, month0, day))
    setShowDetailsModal(true)
  }

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="crumb">
              ← DASHBOARD
            </Link>
            <h1 className="ptitle">稼働カレンダー</h1>
            <p className="pmeta">全キャストの出勤スケジュール</p>
          </div>
          <div className="month-nav">
            <button className="nav-btn" onClick={handlePrevMonth}>
              ← 前月
            </button>
            <span className="mlabel">{monthString}</span>
            <button className="nav-btn" onClick={handleNextMonth}>
              翌月 →
            </button>
          </div>
        </div>

        {/* 01 本日の出勤者 */}
        <section className="sec">
          <div className="sh">
            <span className="no num">01</span>
            <h2>本日の出勤者</h2>
            <span className="right statline t-positive">
              <i className="d" />
              {todayWorkers.length}名 出勤・{today.toLocaleDateString('ja-JP')}
            </span>
          </div>

          {todayWorkers.length === 0 ? (
            <div className="empty">本日の出勤予定者はいません</div>
          ) : (
            <>
              {/* PC：テーブル */}
              <div className="hidden md:block">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>氏名</th>
                      <th className="ta-r">時間帯</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayWorkers.map((cast) => {
                      const shift = todayShifts.find((s) => s.cast_id === cast.id)
                      return (
                        <tr key={cast.id}>
                          <td className="nm">{cast.genshi_name}</td>
                          <td className="ta-r dt">
                            {shift ? `${shift.start_time.slice(0, 5)} – ${shift.end_time.slice(0, 5)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* モバイル：カード */}
              <div className="md:hidden mcards">
                {todayWorkers.map((cast) => {
                  const shift = todayShifts.find((s) => s.cast_id === cast.id)
                  return (
                    <div key={cast.id} className="mcard">
                      <div className="mc-l">
                        <div className="nm">{cast.genshi_name}</div>
                      </div>
                      <div className="mc-r">
                        <span className="dt">
                          {shift ? `${shift.start_time.slice(0, 5)} – ${shift.end_time.slice(0, 5)}` : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* 02 月別カレンダー */}
        <section className="sec">
          <div className="sh">
            <span className="no num">02</span>
            <h2>月別カレンダー</h2>
            <span className="right eyebrow">日別出勤数</span>
          </div>
          {/* PC：7列グリッド */}
          <div className="hidden md:block">
            <MonthCalendar year={year} month0={month0} counts={counts} todayDay={todayDay} onPick={openDay} />
          </div>
          {/* モバイル：日別リスト */}
          <div className="md:hidden mcards">
            {counts.map((c, i) => {
              const day = i + 1
              const wd = new Date(year, month0, day).getDay()
              return (
                <button
                  key={day}
                  onClick={() => openDay(day)}
                  className="mcard"
                  style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer' }}
                >
                  <div className="mc-l">
                    <div
                      className="nm"
                      style={{ color: wd === 0 ? 'var(--no)' : wd === 6 ? 'var(--neu)' : 'var(--ink)' }}
                    >
                      {day}日（{WD[wd]}）
                      {day === todayDay && (
                        <span className="num" style={{ marginLeft: 8, fontSize: 10, color: 'var(--brass-deep)', letterSpacing: '0.12em' }}>
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mc-r" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {c > 0 ? (
                      <span
                        style={{
                          fontFamily: 'var(--serif-jp)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--charcoal)',
                          background: 'rgba(168,137,76,0.14)',
                          border: '1px solid var(--hair)',
                          borderRadius: 999,
                          padding: '3px 10px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c}名
                      </span>
                    ) : (
                      <span className="dt" style={{ color: 'var(--ink-38)' }}>
                        休
                      </span>
                    )}
                    <span className="link-detail">詳細 →</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* 03 稼働ヒートマップ + サマリー */}
        <section className="sec">
          <div className="sh">
            <span className="no num">03</span>
            <h2>稼働ヒートマップ</h2>
            <span className="right eyebrow">曜日 × 週</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:items-center">
            <Heatmap year={year} month0={month0} counts={counts} />
            <div className="ranklist">
              <div className="rankrow">
                <span className="rn">延べ出勤数</span>
                <span className="num" style={{ fontSize: 17, color: 'var(--charcoal)', fontWeight: 600 }}>{monthTotal} 日</span>
              </div>
              <div className="rankrow">
                <span className="rn">1キャスト平均</span>
                <span className="num" style={{ fontSize: 17, color: 'var(--charcoal)', fontWeight: 600 }}>{avg} 日</span>
              </div>
              <div className="rankrow">
                <span className="rn">最多出勤日</span>
                <span className="num" style={{ fontSize: 17, color: 'var(--charcoal)', fontWeight: 600 }}>
                  {peakCount > 0 ? `${peakDay}日 / ${peakCount}名` : '—'}
                </span>
              </div>
              <div className="rankrow">
                <span className="rn">稼働キャスト</span>
                <span className="num" style={{ fontSize: 17, color: 'var(--charcoal)', fontWeight: 600 }}>{activeCount} 名</span>
              </div>
            </div>
          </div>
        </section>

        {/* 04 在籍キャスト */}
        <section className="sec">
          <div className="sh">
            <span className="no num">04</span>
            <h2>在籍キャスト</h2>
            <Link href="/admin/casts" className="right link-detail">
              キャスト一覧 →
            </Link>
          </div>
          {casts.length === 0 ? (
            <div className="empty">在籍キャストがいません</div>
          ) : (
            <div className="mcards">
              {casts.map((cast) => (
                <Link key={cast.id} href={`/admin/casts/${cast.id}?tab=shifts`} className="mcard">
                  <div className="mc-l">
                    <div className="nm">{cast.genshi_name}</div>
                    <div className="sub">入店 {cast.joined_date ?? '—'}</div>
                  </div>
                  <div className="mc-r">
                    <span className="link-detail">稼働を見る →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 日別出勤者 詳細モーダル（ロジックそのまま・装飾のみ刷新） */}
      {showDetailsModal && selectedDate && (
        <div className="adore-v3-modal-mask" onClick={() => setShowDetailsModal(false)}>
          <div className="adore-v3-modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const dayShifts = shifts.filter((s) => s.shift_date === selectedDate)
              const dayWorkers = casts.filter((cast) => dayShifts.some((s) => s.cast_id === cast.id))
              const d = new Date(selectedDate)
              const dayOfWeek = WD[d.getDay()]
              const title = `${d.getMonth() + 1}月${d.getDate()}日（${dayOfWeek}）の出勤者`

              return (
                <>
                  <div
                    className="flex items-center justify-between"
                    style={{ padding: '16px 20px', borderBottom: '1px solid var(--hair)' }}
                  >
                    <h3 className="serif" style={{ fontFamily: 'var(--serif-jp)', fontSize: 16, fontWeight: 600, letterSpacing: '0.06em', margin: 0 }}>
                      {title}
                    </h3>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      aria-label="閉じる"
                      style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: 'var(--ink-50)' }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ padding: 20 }}>
                    {dayWorkers.length === 0 ? (
                      <p className="pmeta" style={{ margin: 0, fontSize: 14 }}>
                        この日の出勤予定者はいません
                      </p>
                    ) : (
                      <div className="mcards" style={{ borderTop: 0 }}>
                        {dayWorkers.map((cast) => {
                          const shift = dayShifts.find((s) => s.cast_id === cast.id)
                          return (
                            <div key={cast.id} className="mcard">
                              <div className="mc-l">
                                <div className="nm">{cast.genshi_name}</div>
                              </div>
                              <div className="mc-r">
                                <span className="dt">
                                  {shift ? `${shift.start_time.slice(0, 5)} – ${shift.end_time.slice(0, 5)}` : '—'}
                                </span>
                              </div>
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
