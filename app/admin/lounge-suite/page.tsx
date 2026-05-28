'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts'

/* ============================================================
   Adore Suite — Dashboard
   恵比寿の会員制ラウンジ向け統合管理ツール
   Brand: 紫 #4B0082 / ゴールド #FFD700 / 黒 #1A1A1A / クリーム #F5F5DC
   ============================================================ */

/* ---------- Data (mock) ---------- */
type Kpi = {
  jp: string
  en: string
  value: string
  unit?: string
  delta: string
  positive: boolean
}

const KPIS: Kpi[] = [
  { jp: '本月売上', en: 'Monthly Revenue', value: '¥2,450,000', delta: '+12.4%', positive: true },
  { jp: '本月出勤キャスト', en: 'Active Cast', value: '12', unit: '名', delta: '+2', positive: true },
  { jp: '本日来店客数', en: 'Guests Today', value: '8', unit: '組', delta: '+3', positive: true },
  { jp: '本日予約数', en: 'Reservations', value: '5', unit: '件', delta: '−1', positive: false },
]

const WEEK_REVENUE = [
  { d: '月', v: 38 },
  { d: '火', v: 52 },
  { d: '水', v: 41 },
  { d: '木', v: 64 },
  { d: '金', v: 88 },
  { d: '土', v: 95 },
  { d: '日', v: 67 },
]

type CastRow = { name: string; kana: string; v: number; label: string }
const CAST_RANK: CastRow[] = [
  { name: 'Rin', kana: 'リン', v: 62, label: '¥620,000' },
  { name: 'Mei', kana: 'メイ', v: 54, label: '¥540,000' },
  { name: 'Aoi', kana: 'アオイ', v: 47, label: '¥470,000' },
  { name: 'Haruka', kana: 'ハルカ', v: 41, label: '¥410,000' },
  { name: 'Yui', kana: 'ユイ', v: 38, label: '¥380,000' },
  { name: 'Saki', kana: 'サキ', v: 32, label: '¥320,000' },
]

type Shift = {
  name: string
  kana: string
  inTime: string
  role: string
  status: 'confirmed' | 'pending'
}
const SCHEDULE: Shift[] = [
  { name: 'Rin', kana: 'リン', inTime: '19:00', role: 'Senior', status: 'confirmed' },
  { name: 'Mei', kana: 'メイ', inTime: '19:00', role: 'Senior', status: 'confirmed' },
  { name: 'Aoi', kana: 'アオイ', inTime: '20:00', role: 'Regular', status: 'confirmed' },
  { name: 'Haruka', kana: 'ハルカ', inTime: '20:30', role: 'Regular', status: 'confirmed' },
  { name: 'Yui', kana: 'ユイ', inTime: '21:00', role: 'Trainee', status: 'pending' },
  { name: 'Saki', kana: 'サキ', inTime: '21:30', role: 'Regular', status: 'confirmed' },
]

const TABS = [
  { icon: '◆', label: 'Dashboard' },
  { icon: '◇', label: 'Cast' },
  { icon: '◈', label: 'Reservations' },
]

/* ---------- Atoms ---------- */
function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="as-logo" style={{ fontSize: size, color: 'var(--as-purple)' }}>
      Adore<span className="amp"> · </span>Suite
    </span>
  )
}

function GoldHair({ width = '100%', style }: { width?: string; style?: React.CSSProperties }) {
  return <div className="hair-gold" style={{ width, ...style }} />
}

/* ---------- Recharts: 週別売上推移 (line / area) ---------- */
function WeeklyRevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload || !payload.length) return null
  return (
    <div
      style={{
        background: 'var(--as-black)',
        border: '1px solid var(--hair-gold)',
        borderRadius: 2,
        padding: '8px 12px',
        lineHeight: 1.4,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--as-gold)' }}>
        {label}曜日
      </div>
      <div className="serif" style={{ fontSize: 16, color: 'var(--as-cream)' }}>
        ¥{payload[0].value}0,000
      </div>
    </div>
  )
}

function WeeklyRevenueChart({ height = 220 }: { height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={WEEK_REVENUE} margin={{ top: 24, right: 12, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--as-purple)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--as-purple)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--hair-gold)" strokeOpacity={0.4} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="d"
          tickLine={false}
          axisLine={false}
          tick={{ fontFamily: 'var(--jp-serif)', fontSize: 12, fill: 'var(--ink-soft)' }}
          dy={6}
        />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9, fill: 'var(--ink-mute)' }}
          tickCount={5}
          domain={[0, 'dataMax + 12']}
        />
        <Tooltip
          content={<WeeklyRevenueTooltip />}
          cursor={{ stroke: 'var(--as-gold)', strokeOpacity: 0.4, strokeDasharray: '2 4' }}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke="var(--as-purple)"
          strokeWidth={1.5}
          fill="url(#lcFill)"
          dot={{ r: 3.5, fill: 'var(--surface)', stroke: 'var(--as-gold)', strokeWidth: 1.2 }}
          activeDot={{ r: 5, fill: 'var(--as-gold)', stroke: 'var(--surface)', strokeWidth: 1.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ---------- Recharts: キャスト別売上ランキング (horizontal bars) ---------- */
function RankTick(props: { x?: number; y?: number; index?: number; payload?: { value: string } }) {
  const { x = 0, y = 0, index = 0, payload } = props
  const top = index < 3
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={-4}
        textAnchor="start"
        className="serif"
        style={{ fontSize: 13, letterSpacing: '0.06em', fill: top ? 'var(--as-gold)' : 'var(--ink-mute)' }}
      >
        {String(index + 1).padStart(2, '0')}
      </text>
      <text x={26} y={-4} textAnchor="start" className="serif" style={{ fontSize: 14, fill: 'var(--ink)' }}>
        {payload?.value}
      </text>
    </g>
  )
}

function CastRankChart() {
  return (
    <ResponsiveContainer width="100%" height={CAST_RANK.length * 46}>
      <BarChart
        layout="vertical"
        data={CAST_RANK}
        margin={{ top: 8, right: 86, left: 6, bottom: 0 }}
        barCategoryGap="42%"
      >
        <defs>
          <linearGradient id="barTop" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--as-purple)" />
            <stop offset="100%" stopColor="var(--as-gold)" />
          </linearGradient>
          <linearGradient id="barRest" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--as-purple-soft)" />
            <stop offset="100%" stopColor="var(--as-purple)" />
          </linearGradient>
        </defs>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={<RankTick />}
        />
        <Bar dataKey="v" radius={[1, 1, 1, 1]} background={{ fill: 'rgba(75,0,130,0.06)', radius: 1 }} barSize={6}>
          {CAST_RANK.map((_, i) => (
            <Cell key={i} fill={i === 0 ? 'url(#barTop)' : 'url(#barRest)'} />
          ))}
          <LabelList
            dataKey="label"
            position="right"
            offset={12}
            className="mono"
            style={{ fontSize: 11, fill: 'var(--ink-soft)', letterSpacing: '0.02em' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ---------- KPI card ---------- */
function KpiCard({ k, idx }: { k: Kpi; idx: number }) {
  return (
    <div className="as-card relative overflow-hidden flex flex-col gap-3 p-4 md:p-[22px]">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="kpi-label hidden md:block">{k.en}</span>
          <span className="kpi-jp">{k.jp}</span>
        </div>
        <span className="serif" style={{ fontSize: 11, color: 'var(--as-gold)', letterSpacing: '0.18em' }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="kpi-num text-[26px] md:text-[44px]">{k.value}</span>
        {k.unit && (
          <span className="jp-serif" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
            {k.unit}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 500,
            color: k.positive ? 'var(--as-purple)' : '#8a3a3a',
          }}
        >
          {k.delta}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          vs last
        </span>
      </div>
      <div
        className="absolute left-4 right-4 md:left-[22px] md:right-[22px] bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, var(--as-gold), transparent)' }}
      />
    </div>
  )
}

/* ---------- Chart header ---------- */
function ChartHeader({ eyebrow, titleEn, titleJp }: { eyebrow: string; titleEn: string; titleJp: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--as-gold)', marginBottom: 6 }}>
          {eyebrow}
        </div>
        <div className="serif" style={{ fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>
          {titleEn}
        </div>
        <div className="jp-serif" style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>
          {titleJp}
        </div>
      </div>
      <span
        className="gold-pill"
        style={{ color: 'var(--as-purple)', borderColor: 'var(--border-strong)', background: 'rgba(75,0,130,0.04)' }}
      >
        This week
      </span>
    </div>
  )
}

function Stat({ label, value, gold, dark }: { label: string; value: string; gold?: boolean; dark?: boolean }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: dark ? 'rgba(245,245,220,0.55)' : 'var(--ink-mute)',
        }}
      >
        {label}
      </span>
      <span
        className="serif"
        style={{
          fontSize: dark ? 22 : 18,
          letterSpacing: '0.01em',
          color: gold ? 'var(--as-gold)' : dark ? 'var(--as-cream)' : 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

/* ---------- Schedule list (dark) ---------- */
function ScheduleListDark({ items }: { items: Shift[] }) {
  return (
    <div className="flex flex-col">
      {items.map((s, i) => (
        <div
          key={s.name}
          className="grid items-center gap-3 md:gap-4 py-3 md:py-3.5"
          style={{
            gridTemplateColumns: 'minmax(56px,70px) 1fr auto',
            borderTop: i === 0 ? 'none' : '1px solid rgba(255,215,0,0.14)',
          }}
        >
          <span className="serif" style={{ fontSize: 17, color: 'var(--as-gold)' }}>
            {s.inTime}
          </span>
          <div className="flex flex-col" style={{ lineHeight: 1.25 }}>
            <span className="serif" style={{ fontSize: 15, color: 'var(--as-cream)' }}>
              {s.name}
              <span className="jp-serif" style={{ fontSize: 11, color: 'rgba(245,245,220,0.6)', marginLeft: 8 }}>
                {s.kana}
              </span>
            </span>
            <span style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(245,245,220,0.5)' }}>
              {s.role}
            </span>
          </div>
          <span
            style={{
              justifySelf: 'end',
              fontSize: 9,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 999,
              color: s.status === 'confirmed' ? 'var(--as-cream)' : 'var(--as-gold)',
              border: '1px solid ' + (s.status === 'confirmed' ? 'rgba(245,245,220,0.25)' : 'var(--as-gold)'),
              background: s.status === 'confirmed' ? 'rgba(245,245,220,0.04)' : 'rgba(255,215,0,0.08)',
            }}
          >
            {s.status}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------- Tabs ---------- */
function Tabs({ active, onTab }: { active: number; onTab: (i: number) => void }) {
  return (
    <div className="flex justify-between md:justify-start md:gap-9">
      {TABS.map((t, i) => (
        <div key={t.label} className={'as-tab' + (active === i ? ' active' : '')} onClick={() => onTab(i)}>
          <span className="glyph">{t.icon}</span>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   Page
   ============================================================ */
export default function LoungeSuiteDashboardPage() {
  const [tab, setTab] = useState(0)

  return (
    <>
      {/* Fonts — Cormorant Garamond / Shippori Mincho (graceful serif fallback if offline) */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Shippori+Mincho:wght@400;500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <style>{TOKENS}</style>

      <div className="lounge-suite-root -mx-4 -my-6 md:-mx-8 md:-my-8" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        {/* ---------- Header ---------- */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="px-5 pt-4 md:px-12 md:pt-[22px]">
            <div className="flex items-center justify-between">
              <Logo size={20} />
              <div className="flex items-center gap-4 md:gap-6">
                <div className="hidden md:block text-right" style={{ lineHeight: 1.3 }}>
                  <div className="jp-serif" style={{ fontSize: 13, color: 'var(--ink)' }}>
                    2026年5月28日（木）
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                    Thursday · Ebisu
                  </div>
                </div>
                <div className="divider-v hidden md:block" style={{ height: 32 }} />
                <div className="hidden md:block text-right" style={{ lineHeight: 1.2 }}>
                  <div className="serif" style={{ fontSize: 14 }}>
                    Naomi Sato
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
                    Floor Manager
                  </div>
                </div>
                <div className="avatar">N</div>
              </div>
            </div>
            <GoldHair style={{ margin: '16px 0 0' }} />
            <Tabs active={tab} onTab={setTab} />
          </div>
        </header>

        {/* ---------- Main ---------- */}
        <main className="px-5 py-6 md:px-12 md:py-8">
          {/* Greeting hero */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-7">
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--as-gold)', marginBottom: 8 }}>
                May · MMXXVI
              </div>
              <h1 className="serif m-0 text-[26px] md:text-[38px]" style={{ lineHeight: 1.1, color: 'var(--ink)', fontWeight: 500 }}>
                Good evening, <em style={{ color: 'var(--as-purple)' }}>Naomi</em>.
              </h1>
              <div className="jp-serif mt-2" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                本日の営業概況をご確認ください。
              </div>
            </div>
            <div className="hidden md:flex gap-2.5">
              <button className="as-btn as-btn-ghost">Export</button>
              <button className="as-btn">New Reservation</button>
            </div>
          </div>

          {/* KPIs — 2x2 mobile / 4-up desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {KPIS.map((k, i) => (
              <KpiCard key={k.en} k={k} idx={i} />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:[grid-template-columns:1.55fr_1fr] gap-4 md:gap-5 mt-5 md:mt-6">
            <div className="as-card p-5 md:p-6">
              <ChartHeader eyebrow="Weekly trend" titleEn="Revenue this week" titleJp="週別売上推移" />
              <div className="mt-4">
                <WeeklyRevenueChart />
              </div>
              <div className="flex gap-6 mt-3.5 pt-3.5" style={{ borderTop: '1px solid var(--border)' }}>
                <Stat label="Total" value="¥4,450,000" />
                <Stat label="Daily avg" value="¥635,700" />
                <Stat label="Peak" value="Sat · ¥950k" gold />
              </div>
            </div>

            <div className="as-card p-5 md:p-6">
              <ChartHeader eyebrow="Top performers" titleEn="Cast ranking" titleJp="キャスト別売上ランキング" />
              <div className="mt-4">
                <CastRankChart />
              </div>
            </div>
          </div>

          {/* Schedule — dark */}
          <div className="as-card-dark mt-5 md:mt-6 p-5 md:p-7 grid grid-cols-1 md:[grid-template-columns:260px_1fr] gap-6 md:gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="gold-pill">Tonight</span>
                <span className="gold-pill md:hidden">6 on shift</span>
              </div>
              <div>
                <h2 className="serif m-0 text-[24px] md:text-[30px]" style={{ color: 'var(--as-cream)', fontWeight: 400, lineHeight: 1.15 }}>
                  Tonight&apos;s <em style={{ color: 'var(--as-gold)' }}>roster</em>
                </h2>
                <div className="jp-serif mt-2" style={{ fontSize: 13, color: 'rgba(245,245,220,0.7)' }}>
                  本日のスケジュール
                </div>
              </div>
              <GoldHair width="80px" style={{ background: 'linear-gradient(90deg, var(--as-gold), transparent)' }} />
              <div className="hidden md:flex md:flex-col gap-1.5">
                <Stat dark label="On shift" value="6" />
                <Stat dark label="First call" value="19:00" gold />
                <Stat dark label="Last call" value="21:30" />
              </div>
            </div>
            <div
              style={{
                background: 'rgba(245,245,220,0.04)',
                border: '1px solid rgba(255,215,0,0.18)',
                borderRadius: 2,
              }}
              className="px-4 md:px-[22px] py-1 md:py-2"
            >
              <ScheduleListDark items={SCHEDULE} />
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="flex flex-col gap-2.5 mt-5 md:hidden">
            <button className="as-btn w-full" style={{ padding: 14 }}>
              New Reservation
            </button>
            <button className="as-btn as-btn-ghost w-full" style={{ padding: 14 }}>
              Export Report
            </button>
          </div>

          {/* Footer hairline */}
          <div
            className="mt-9 flex items-center justify-between"
            style={{ color: 'var(--ink-mute)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' }}
          >
            <span>Adore Suite · v1.0</span>
            <span>Ebisu · Tokyo</span>
          </div>
        </main>
      </div>
    </>
  )
}

/* ============================================================
   Design tokens + reusable classes (scoped to .lounge-suite-root)
   ============================================================ */
const TOKENS = `
.lounge-suite-root {
  /* Brand */
  --as-purple: #4B0082;
  --as-purple-deep: #2E0052;
  --as-purple-soft: #6B2BA8;
  --as-gold: #FFD700;
  --as-black: #1A1A1A;
  --as-cream: #F5F5DC;

  /* Surfaces */
  --bg: #FBFAF7;
  --surface: #FFFFFF;
  --border: rgba(26, 26, 26, 0.08);
  --border-strong: rgba(75, 0, 130, 0.18);
  --hair-gold: rgba(255, 215, 0, 0.5);

  /* Ink */
  --ink: #1A1A1A;
  --ink-soft: #4A4452;
  --ink-mute: #8C8497;

  /* Type stacks */
  --serif: "Cormorant Garamond", "Shippori Mincho", "游明朝", "Yu Mincho", serif;
  --jp-serif: "Shippori Mincho", "游明朝", "Yu Mincho", serif;
  --sans: "Inter", "Helvetica Neue", "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif;
  --mono: "JetBrains Mono", "SF Mono", ui-monospace, monospace;

  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}
.lounge-suite-root .serif { font-family: var(--serif); font-weight: 500; letter-spacing: 0.01em; }
.lounge-suite-root .jp-serif { font-family: var(--jp-serif); font-weight: 500; }
.lounge-suite-root .mono { font-family: var(--mono); }

.lounge-suite-root .hair-gold {
  background: linear-gradient(90deg, transparent, var(--hair-gold) 20%, var(--hair-gold) 80%, transparent);
  height: 1px;
}
.lounge-suite-root .divider-v { width: 1px; background: var(--hair-gold); }

.lounge-suite-root .as-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 2px;
  box-shadow: 0 1px 0 rgba(75, 0, 130, 0.02), 0 8px 24px -16px rgba(75, 0, 130, 0.10);
}
.lounge-suite-root .as-card-dark {
  background: var(--as-black);
  color: var(--as-cream);
  border: 1px solid rgba(255, 215, 0, 0.20);
  border-radius: 2px;
}

.lounge-suite-root .as-btn {
  font-family: var(--sans);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: var(--as-purple);
  color: var(--as-cream);
  border: 1px solid var(--as-purple);
  padding: 10px 20px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 200ms ease;
}
.lounge-suite-root .as-btn:hover { background: var(--as-black); border-color: var(--as-gold); color: var(--as-gold); }
.lounge-suite-root .as-btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--hair-gold); }
.lounge-suite-root .as-btn-ghost:hover { color: var(--as-purple); border-color: var(--as-purple); background: transparent; }

.lounge-suite-root .as-tab {
  font-family: var(--sans);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-mute);
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: color 200ms ease, border-color 200ms ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.lounge-suite-root .as-tab:hover { color: var(--as-purple); }
.lounge-suite-root .as-tab.active { color: var(--as-purple); border-bottom-color: var(--as-gold); }
.lounge-suite-root .as-tab .glyph { color: var(--as-gold); font-size: 14px; line-height: 1; }

.lounge-suite-root .kpi-num {
  font-family: var(--serif);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--as-purple);
}
.lounge-suite-root .kpi-label { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute); }
.lounge-suite-root .kpi-jp { font-family: var(--jp-serif); font-size: 12px; color: var(--ink-soft); }

.lounge-suite-root .avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, var(--as-purple) 0%, var(--as-purple-deep) 100%);
  color: var(--as-gold);
  font-family: var(--serif);
  font-size: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--hair-gold);
  flex: none;
}

.lounge-suite-root .gold-pill {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--as-gold);
  border: 1px solid var(--hair-gold);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 215, 0, 0.06);
  white-space: nowrap;
}

.lounge-suite-root .as-logo {
  font-family: var(--serif);
  font-weight: 400;
  font-style: italic;
  letter-spacing: 0.02em;
}
.lounge-suite-root .as-logo .amp { color: var(--as-gold); font-style: italic; }
`
