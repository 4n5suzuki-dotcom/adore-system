'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import '@/styles/adore-v3.css'

interface SalesData {
  castName: string
  shifts: number
  revenue: number
}

// 当月の合計売上（円）を取得：shift_schedules 件数 × ¥20,000（既存ロジックと同一の計算）
async function fetchMonthTotal(month: Date): Promise<number> {
  const start = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
  const end = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()}`
  const { data } = await supabase
    .from('shift_schedules')
    .select('id')
    .gte('shift_date', start)
    .lte('shift_date', end)
  return (data?.length || 0) * 20000
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [prevRevenue, setPrevRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    const fetchSalesData = async () => {
      const monthStart = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`
      const monthEnd = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()}`

      // 当月のシフト + キャスト情報を取得（既存ロジックそのまま）
      const { data: shiftsData } = await supabase
        .from('shift_schedules')
        .select('cast_id')
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd)

      const { data: castsData } = await supabase
        .from('casts')
        .select('id, genshi_name')
        .eq('status', 'active')

      if (!shiftsData || !castsData) {
        setLoading(false)
        return
      }

      // キャスト別にシフト数を集計
      const shiftsCountBycast: Record<string, number> = {}
      shiftsData.forEach((shift) => {
        shiftsCountBycast[shift.cast_id] = (shiftsCountBycast[shift.cast_id] || 0) + 1
      })

      // キャスト別売上を計算
      const sales = castsData
        .map((cast) => {
          const shifts = shiftsCountBycast[cast.id] || 0
          const revenue = shifts * 20000 // 仮：1出勤 = ¥20,000
          return { castName: cast.genshi_name, shifts, revenue }
        })
        .filter((s) => s.shifts > 0)
        .sort((a, b) => b.revenue - a.revenue)

      const total = sales.reduce((sum, s) => sum + s.revenue, 0)

      // 前月比用：前月合計（同一計算式の追加取得）
      const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1)
      const prevTotal = await fetchMonthTotal(prevMonth)

      setSalesData(sales)
      setTotalRevenue(total)
      setPrevRevenue(prevTotal)
      setLoading(false)
    }

    fetchSalesData()
  }, [selectedMonth])

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))
  }
  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))
  }

  const monthString = selectedMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen flex items-center justify-center">
        <p className="pmeta">読み込み中…</p>
      </div>
    )
  }

  // 集計値
  const totalShifts = salesData.reduce((sum, s) => sum + s.shifts, 0)
  const avgDaily = totalShifts > 0 ? totalRevenue / totalShifts : 0
  const momPct = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null

  const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`
  const man = (n: number) => (n / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })

  const idx = [
    { label: '合計売上', value: man(totalRevenue), unit: '万', sub: yen(totalRevenue) },
    {
      label: '前月比',
      value: momPct === null ? '—' : `${momPct >= 0 ? '+' : ''}${momPct.toFixed(1)}`,
      unit: momPct === null ? '' : '%',
      sub: prevRevenue > 0 ? `前月 ${yen(prevRevenue)}` : '前月実績なし',
    },
    { label: '平均日商', value: man(avgDaily), unit: '万', sub: `延べ ${totalShifts}日` },
    { label: '稼働キャスト', value: String(salesData.length), unit: '名', sub: '売上計上ベース' },
  ]

  // グラフ用データ（万ラベルを事前計算）
  const chartData = salesData.map((s) => ({
    name: s.castName,
    revenue: s.revenue,
    days: s.shifts,
    manLabel: s.revenue >= 10000 ? `${Math.round(s.revenue / 10000)}万` : `${s.revenue}`,
  }))

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="crumb">
              ← DASHBOARD
            </Link>
            <h1 className="ptitle">売上分析</h1>
            <p className="pmeta">{monthString} — キャスト別売上</p>
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

        {/* KPI インデックス行 */}
        <div className="idx" style={{ marginBottom: 44 }}>
          {idx.map((c) => (
            <div className="cell" key={c.label}>
              <div className="il">{c.label}</div>
              <div className="iv num">
                {c.value}
                {c.unit && <span className="u">{c.unit}</span>}
              </div>
              <div className="is">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 01 売上ランキング */}
        <section className="sec">
          <div className="sh">
            <span className="no num">01</span>
            <h2>キャスト別売上ランキング</h2>
            <span className="right eyebrow">単位：円</span>
          </div>
          {chartData.length === 0 ? (
            <div className="empty">この月のシフト実績がありません</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 24, right: 12, left: -6, bottom: 4 }}>
                <defs>
                  <linearGradient id="salesBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--charcoal)" />
                    <stop offset="100%" stopColor="var(--brass-deep)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--hair)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--hair)' }}
                  tick={{ fontSize: 11, fill: 'var(--ink-50)', fontFamily: 'var(--serif-jp)' }}
                  interval={0}
                  dy={4}
                />
                <YAxis
                  width={52}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--ink-38)' }}
                  tickFormatter={(v: number) => (v >= 10000 ? `${v / 10000}万` : `${v}`)}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--charcoal)', border: '1px solid var(--hair)', borderRadius: 4, fontFamily: 'var(--serif-jp)' }}
                  labelStyle={{ color: 'var(--brass-soft)', fontSize: 11, letterSpacing: '0.06em' }}
                  itemStyle={{ color: 'var(--cream)' }}
                  cursor={{ fill: 'rgba(168,137,76,0.08)' }}
                  formatter={(value) => [`¥${Number(value).toLocaleString('ja-JP')}`, '売上']}
                />
                <Bar dataKey="revenue" fill="url(#salesBar)" radius={[2, 2, 0, 0]} maxBarSize={54}>
                  <LabelList
                    dataKey="manLabel"
                    position="top"
                    style={{ fontFamily: 'var(--serif-lt)', fontSize: 12, fill: 'var(--brass-deep)', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* 02 キャスト別 詳細 */}
        <section className="sec">
          <div className="sh">
            <span className="no num">02</span>
            <h2>キャスト別 詳細</h2>
          </div>
          {salesData.length === 0 ? (
            <div className="empty">この月のシフト実績がありません</div>
          ) : (
            <>
              {/* PC：テーブル */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>順位</th>
                      <th>キャスト</th>
                      <th className="ta-c">出勤</th>
                      <th className="ta-r">売上</th>
                      <th style={{ width: 160 }}>構成比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((s, i) => {
                      const share = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0
                      return (
                        <tr key={s.castName}>
                          <td className="num" style={{ fontSize: 18, color: 'var(--brass-deep)', fontWeight: 600 }}>
                            {String(i + 1).padStart(2, '0')}
                          </td>
                          <td className="nm">{s.castName}</td>
                          <td className="ta-c dt">{s.shifts}日</td>
                          <td className="ta-r num" style={{ fontSize: 15, color: 'var(--charcoal)', fontWeight: 600 }}>
                            {yen(s.revenue)}
                          </td>
                          <td>
                            <div className="share">
                              <div className="sb">
                                <i style={{ width: `${share}%` }} />
                              </div>
                              <span className="sv">{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* モバイル：カード */}
              <div className="md:hidden mcards">
                {salesData.map((s, i) => {
                  const share = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0
                  return (
                    <div key={s.castName} className="mcard">
                      <div className="mc-l">
                        <div className="nm">
                          <span className="num" style={{ color: 'var(--brass-deep)', marginRight: 8 }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          {s.castName}
                        </div>
                        <div className="sub">
                          {s.shifts}日・構成比 {share.toFixed(1)}%
                        </div>
                      </div>
                      <div className="mc-r">
                        <span className="num" style={{ fontSize: 15, color: 'var(--charcoal)', fontWeight: 600 }}>
                          {yen(s.revenue)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
