'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

interface MonthData {
  month: string
  adoption_rate: number
  hired: number
  total: number
}

export default function AnalyticsAdoptionRatePage() {
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // 過去 6ヶ月のデータを取得
      const months: MonthData[] = []
      const today = new Date()

      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1

        const monthStart = new Date(year, month - 1, 1).toISOString()
        const monthEnd = new Date(year, month, 1).toISOString()

        // その月の面接総数と採用数を取得
        const { data: allData } = await supabase
          .from('interviews')
          .select('status')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd)

        const total = allData?.length || 0
        const hired = allData?.filter((d: any) => d.status === 'hired').length || 0
        const rate = total > 0 ? Math.round((hired / total) * 100) : 0

        months.push({
          month: `${year}年${month}月`,
          adoption_rate: rate,
          hired,
          total
        })
      }

      setData(months)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-8">読み込み中...</div>

  const currentRate = data.length > 0 ? data[data.length - 1].adoption_rate : 0

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-wine-red hover:underline mb-2 inline-block">
              ← ダッシュボードへ戻る
            </Link>
            <h1 className="text-3xl font-bold text-wine-red">採用率分析</h1>
          </div>
        </div>

        {/* 現在の採用率 */}
        <div className="card-wine-border mb-8 p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">当月の採用率</p>
            <div className="text-5xl font-bold text-wine-red">{currentRate}%</div>
            {data.length > 0 && (
              <p className="text-gray-600 mt-4">
                {data[data.length - 1].hired} 名 / {data[data.length - 1].total} 件
              </p>
            )}
          </div>
        </div>

        {/* グラフ */}
        <div className="card-wine-border p-6">
          <h2 className="text-xl font-bold text-wine-red mb-6">過去 6ヶ月の推移</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="adoption_rate"
                stroke="#8B3A3A"
                name="採用率"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 詳細テーブル */}
        <div className="card-wine-border mt-8 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-wine-red">
                <th className="text-left p-4 font-bold text-wine-red">月</th>
                <th className="text-left p-4 font-bold text-wine-red">採用数</th>
                <th className="text-left p-4 font-bold text-wine-red">面接数</th>
                <th className="text-left p-4 font-bold text-wine-red">採用率</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-semibold">{row.month}</td>
                  <td className="p-4">{row.hired}</td>
                  <td className="p-4">{row.total}</td>
                  <td className="p-4 font-bold text-wine-red">{row.adoption_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
