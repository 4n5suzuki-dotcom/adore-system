'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  getInterviewsForMonth,
  getLatestInterviews,
  getInterviewCountByStatus,
  getTodayInterviewCount,
  getMonthlyAdoptionRate,
  type InterviewStatusCount,
} from '@/lib/supabase/interviews'
import type { Interview } from '@/lib/supabase/types'
import StatLine from '@/components/admin/StatLine'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import '@/styles/adore-v3.css'

// 推移グラフ用ダミーデータ（直近6ヶ月）
// ※実データの月次履歴が未整備のため当面はダミー。取得元が決まり次第差し替え。
const SALES_TREND = [
  { month: '1月', sales: 2840 },
  { month: '2月', sales: 3120 },
  { month: '3月', sales: 2960 },
  { month: '4月', sales: 3380 },
  { month: '5月', sales: 3540 },
  { month: '6月', sales: 3820 },
]

const RATE_TREND = [
  { month: '1月', rate: 45 },
  { month: '2月', rate: 52 },
  { month: '3月', rate: 48 },
  { month: '4月', rate: 55 },
  { month: '5月', rate: 50 },
  { month: '6月', rate: 58 },
]

// 今月のKPIサマリー
interface DashboardStats {
  hirings: number
  activeCasts: number
  totalShiftsThisMonth: number
  totalRevenue: number
}

// ステータス → 表示ラベル + トーン（エディトリアルのドット表示）
const STATUS_META: Record<string, { label: string; tone: string }> = {
  incomplete: { label: '未確認', tone: 'pending' },
  pending: { label: '待機中', tone: 'waiting' },
  confirmed: { label: '確認済み', tone: 'neutral' },
  processing: { label: '進行中', tone: 'waiting' },
  hired: { label: '採用済み', tone: 'positive' },
  rejected: { label: '不採用', tone: 'negative' },
  on_trial: { label: '体験中', tone: 'pending' },
}

// ステータス別集計カードの並び順とラベル
const STATUS_SUMMARY: { key: keyof InterviewStatusCount; label: string }[] = [
  { key: 'incomplete', label: '未確認' },
  { key: 'pending', label: '待機中' },
  { key: 'confirmed', label: '確認済み' },
  { key: 'hired', label: '採用済み' },
  { key: 'rejected', label: '不採用' },
]

// ISO 文字列 → "YYYY/MM/DD HH:MM"（ローカル時刻）
function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function StatusDot({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' }
  return <StatLine tone={meta.tone} label={meta.label} />
}

export default function AdminPage() {
  const router = useRouter()

  const [todayCount, setTodayCount] = useState<number>(0)
  const [monthlyCount, setMonthlyCount] = useState<number>(0)
  const [monthlyAdoptedCount, setMonthlyAdoptedCount] = useState<number>(0)
  const [adoptionRate, setAdoptionRate] = useState<number>(0)
  const [latestInterviews, setLatestInterviews] = useState<Interview[]>([])
  const [statusCounts, setStatusCounts] = useState<InterviewStatusCount>({
    incomplete: 0,
    pending: 0,
    confirmed: 0,
    hired: 0,
    rejected: 0,
  })
  const [stats, setStats] = useState<DashboardStats>({
    hirings: 0,
    activeCasts: 0,
    totalShiftsThisMonth: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      try {
        const [today, monthInterviews, rate, latest, counts] =
          await Promise.all([
            getTodayInterviewCount(),
            getInterviewsForMonth(year, month),
            getMonthlyAdoptionRate(year, month),
            getLatestInterviews(5),
            getInterviewCountByStatus(),
          ])

        setTodayCount(today)
        setMonthlyCount(monthInterviews.length)
        setMonthlyAdoptedCount(
          monthInterviews.filter((i) => i.status === 'hired').length
        )
        setAdoptionRate(rate)
        setLatestInterviews(latest)
        setStatusCounts(counts)

        // 今月のKPI集計（採用数・アクティブキャスト・当月出勤数・概算売上）
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

        const { count: hiringsCount } = await supabase
          .from('casts')
          .select('id', { count: 'exact' })
          .gte('joined_date', monthStart)
          .lte('joined_date', monthEnd)

        const { count: activeCastsCount } = await supabase
          .from('casts')
          .select('id', { count: 'exact' })
          .eq('status', 'active')

        const { data: shiftsData } = await supabase
          .from('shift_schedules')
          .select('id')
          .gte('shift_date', monthStart)
          .lte('shift_date', monthEnd)

        const totalShifts = shiftsData?.length || 0
        setStats({
          hirings: hiringsCount || 0,
          activeCasts: activeCastsCount || 0,
          totalShiftsThisMonth: totalShifts,
          totalRevenue: totalShifts * 20000,
        })
      } catch (err) {
        // データ取得エラー：ログ出力のうえデフォルト値（0 / []）を維持
        console.error('admin dashboard load failed:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen flex items-center justify-center">
        <p className="pmeta">読み込み中…</p>
      </div>
    )
  }

  const now = new Date()
  const monthLabel = now
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()
  const revManYen = Math.round(stats.totalRevenue / 10000)

  // KPI（編集インデックス行）
  const kpis = [
    { label: '本月採用数', value: String(stats.hirings), unit: '名', sub: '今月入店ベース' },
    { label: '稼働キャスト', value: String(stats.activeCasts), unit: '名', sub: '在籍ステータス' },
    { label: '本月出勤日数', value: String(stats.totalShiftsThisMonth), unit: '日', sub: '全キャスト合計' },
    { label: '本月売上', value: revManYen.toLocaleString('ja-JP'), unit: '万', sub: '※出勤数 × ¥20,000' },
  ]

  // サマリー（実データのリンク指標）
  const summaries = [
    { label: '今日の面接', value: `${todayCount}`, unit: '件', href: '/admin/analytics/today' },
    { label: '今月面接', value: `${monthlyCount}`, unit: '件', href: '/admin/analytics/interviews' },
    { label: '今月採用', value: `${monthlyAdoptedCount}`, unit: '件', href: '/admin/analytics/hired' },
    { label: '採用率', value: adoptionRate.toFixed(1), unit: '%', href: '/admin/analytics/adoption-rate' },
  ]

  const quickMenu = [
    { no: '01', t: '面接管理', d: '応募者の面接を管理', href: '/admin/analytics/interviews' },
    { no: '02', t: 'キャスト管理', d: '在籍情報を管理', href: '/admin/casts' },
    { no: '03', t: '稼働カレンダー', d: 'シフトを管理・確認', href: '/admin/shifts' },
  ]

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head">
          <span className="crumb">DASHBOARD — {monthLabel}</span>
          <h1 className="ptitle">今月の概況</h1>
          <p className="pmeta">恵比寿ラウンジ 運営サマリー</p>
        </div>

        {/* KPI インデックス行 */}
        <div className="idx" style={{ marginBottom: 44 }}>
          {kpis.map((c) => (
            <div className="cell" key={c.label}>
              <div className="il">{c.label}</div>
              <div className="iv num">
                {c.value}
                <span className="u">{c.unit}</span>
              </div>
              <div className="is">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 01 推移 */}
        <section className="sec">
          <div className="sh">
            <span className="no num">01</span>
            <h2>推移</h2>
            <span className="right eyebrow">PAST 6 MONTHS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* 売上推移（AreaChart） */}
            <div>
              <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--serif-jp)', fontSize: 15, fontWeight: 600, letterSpacing: '0.08em' }}>
                  売上（万円）
                </span>
                <span className="num" style={{ color: 'var(--brass-deep)', fontSize: 20 }}>
                  {SALES_TREND[SALES_TREND.length - 1].sales.toLocaleString('ja-JP')}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={SALES_TREND} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brass)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--brass)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--hair)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--hair)' }}
                    tick={{ fontSize: 12, fill: 'var(--ink-50)', fontFamily: 'var(--serif-jp)' }}
                    dy={4}
                  />
                  <YAxis
                    width={46}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--ink-38)' }}
                    tickFormatter={(v: number) => v.toLocaleString('ja-JP')}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--charcoal)', border: '1px solid var(--hair)', borderRadius: 4, fontFamily: 'var(--serif-jp)' }}
                    labelStyle={{ color: 'var(--brass-soft)', fontSize: 11, letterSpacing: '0.06em' }}
                    itemStyle={{ color: 'var(--cream)' }}
                    cursor={{ stroke: 'var(--brass)', strokeOpacity: 0.4, strokeDasharray: '2 4' }}
                    formatter={(value) => [`${Number(value).toLocaleString('ja-JP')} 万円`, '売上']}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="var(--charcoal)"
                    strokeWidth={1.6}
                    fill="url(#salesFill)"
                    dot={{ r: 3, fill: 'var(--cream)', stroke: 'var(--brass-deep)', strokeWidth: 1.4 }}
                    activeDot={{ r: 5, fill: 'var(--brass)', stroke: 'var(--cream)', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 採用率トレンド（LineChart） */}
            <div>
              <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--serif-jp)', fontSize: 15, fontWeight: 600, letterSpacing: '0.08em' }}>
                  採用率（%）
                </span>
                <span className="num" style={{ color: 'var(--charcoal)', fontSize: 20 }}>
                  {RATE_TREND[RATE_TREND.length - 1].rate}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={RATE_TREND} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke="var(--hair)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--hair)' }}
                    tick={{ fontSize: 12, fill: 'var(--ink-50)', fontFamily: 'var(--serif-jp)' }}
                    dy={4}
                  />
                  <YAxis
                    width={46}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--ink-38)' }}
                    tickFormatter={(v: number) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--charcoal)', border: '1px solid var(--hair)', borderRadius: 4, fontFamily: 'var(--serif-jp)' }}
                    labelStyle={{ color: 'var(--brass-soft)', fontSize: 11, letterSpacing: '0.06em' }}
                    itemStyle={{ color: 'var(--cream)' }}
                    cursor={{ stroke: 'var(--brass)', strokeOpacity: 0.4, strokeDasharray: '2 4' }}
                    formatter={(value) => [`${value}%`, '採用率']}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--brass-deep)"
                    strokeWidth={1.6}
                    dot={{ r: 3.5, fill: 'var(--brass)', stroke: 'var(--brass-deep)', strokeWidth: 1.2 }}
                    activeDot={{ r: 5, fill: 'var(--brass)', stroke: 'var(--cream)', strokeWidth: 1.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 02 サマリー */}
        <section className="sec">
          <div className="sh">
            <span className="no num">02</span>
            <h2>サマリー</h2>
            <span className="right eyebrow">THIS MONTH</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {summaries.map((s) => (
              <Link key={s.label} href={s.href} className="quick">
                <div className="num" style={{ fontSize: 34, color: 'var(--charcoal)', lineHeight: 1 }}>
                  {s.value}
                  <span style={{ fontFamily: 'var(--serif-jp)', fontSize: 13, color: 'var(--ink-50)', marginLeft: 4 }}>
                    {s.unit}
                  </span>
                </div>
                <div className="qd">{s.label} →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* 03 クイックメニュー */}
        <section className="sec">
          <div className="sh">
            <span className="no num">03</span>
            <h2>クイックメニュー</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {quickMenu.map((q) => (
              <Link key={q.no} href={q.href} className="quick">
                <div className="qn num">{q.no}</div>
                <div className="qt">{q.t}</div>
                <div className="qd">{q.d} →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* 04 最新の面接 */}
        <section className="sec">
          <div className="sh">
            <span className="no num">04</span>
            <h2>最新の面接</h2>
            <Link href="/admin/analytics/interviews" className="right link-detail">
              面接一覧 →
            </Link>
          </div>

          {latestInterviews.length === 0 ? (
            <div className="empty">面接データがありません</div>
          ) : (
            <>
              {/* PC：テーブル */}
              <div className="hidden md:block">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>氏名</th>
                      <th>面接日時</th>
                      <th className="ta-r">ステータス</th>
                      <th className="ta-r"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestInterviews.map((interview) => (
                      <tr key={interview.id}>
                        <td className="nm">{interview.genshi_name || '-'}</td>
                        <td className="dt">{formatDateTime(interview.created_at)}</td>
                        <td className="ta-r">
                          <StatusDot status={interview.status} />
                        </td>
                        <td className="ta-r">
                          <button
                            onClick={() => router.push(`/admin/interviews/${interview.id}`)}
                            className="link-detail"
                          >
                            詳細
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* モバイル：カード */}
              <div className="md:hidden mcards">
                {latestInterviews.map((interview) => (
                  <Link
                    key={interview.id}
                    href={`/admin/interviews/${interview.id}`}
                    className="mcard"
                  >
                    <div className="mc-l">
                      <div className="nm">{interview.genshi_name || '-'}</div>
                      <div className="sub">{formatDateTime(interview.created_at)}</div>
                    </div>
                    <div className="mc-r">
                      <StatusDot status={interview.status} />
                      <span className="link-detail">詳細 →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 05 ステータス別集計 */}
        <section className="sec">
          <div className="sh">
            <span className="no num">05</span>
            <h2>ステータス別集計</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STATUS_SUMMARY.map(({ key, label }) => (
              <div
                key={key}
                style={{
                  padding: '18px 20px',
                  border: '1px solid var(--hair)',
                  borderRadius: 6,
                  background: 'var(--paper)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ fontFamily: 'var(--serif-jp)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--ink-50)' }}>
                  {label}
                </div>
                <div className="num" style={{ fontSize: 38, color: 'var(--charcoal)', lineHeight: 1, marginTop: 10 }}>
                  {statusCounts[key]}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* フッター */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: 12, color: 'var(--ink-38)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' }}
        >
          <span className="num">Adore System v3</span>
          <span className="num">Ebisu · Tokyo</span>
        </div>
      </div>
    </div>
  )
}
