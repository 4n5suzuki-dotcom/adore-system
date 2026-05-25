'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

interface SalesData {
  castName: string
  shifts: number
  revenue: number
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  useEffect(() => {
    const fetchSalesData = async () => {
      const monthStart = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`
      const monthEnd = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()}`

      // 当月のシフト + キャスト情報を取得
      const { data: shiftsData } = await supabase
        .from('shift_schedules')
        .select('cast_id')
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd)

      // キャスト一覧取得
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

          return {
            castName: cast.genshi_name,
            shifts,
            revenue
          }
        })
        .filter((s) => s.shifts > 0)
        .sort((a, b) => b.revenue - a.revenue)

      const total = sales.reduce((sum, s) => sum + s.revenue, 0)

      setSalesData(sales)
      setTotalRevenue(total)
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

  const monthString = selectedMonth.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long'
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="text-center text-lg font-semibold text-gray-600">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/admin" className="text-wine-red hover:underline mb-2 inline-block">
            ← ダッシュボードへ戻る
          </Link>
          <h1 className="text-3xl font-bold text-wine-red mt-2">売上分析</h1>
          <p className="text-gray-600 mt-2">キャスト別の売上状況を確認できます</p>
        </div>

        {/* 月選択 */}
        <div className="flex items-center justify-between mb-8 p-2 md:p-4 bg-gray-50 rounded gap-2">
          <button
            onClick={handlePrevMonth}
            className="px-2 md:px-4 py-1 md:py-2 bg-wine-red text-white rounded hover:opacity-90 text-xs md:text-sm"
          >
            ← 前月
          </button>
          <h2 className="text-lg md:text-2xl font-bold text-wine-red">{monthString}</h2>
          <button
            onClick={handleNextMonth}
            className="px-2 md:px-4 py-1 md:py-2 bg-wine-red text-white rounded hover:opacity-90 text-xs md:text-sm"
          >
            翌月 →
          </button>
        </div>

        {/* 合計売上 */}
        <div className="bg-gradient-to-br from-wine-red to-red-900 rounded-lg shadow-lg p-8 text-white mb-8">
          <p className="text-sm opacity-90 mb-2">{monthString} の合計売上</p>
          <p className="text-5xl font-bold">¥{totalRevenue.toLocaleString('ja-JP')}</p>
          <p className="text-sm opacity-75 mt-2">※出勤数 × ¥20,000（仮計算）</p>
        </div>

        {/* グラフ */}
        {salesData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 mb-8 overflow-x-auto">
            <h3 className="text-lg md:text-xl font-bold text-wine-red mb-6">キャスト別売上ランキング</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="castName" />
                <YAxis />
                <Tooltip formatter={(value) => `¥${Number(value).toLocaleString('ja-JP')}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#6B1F2A" name="売上（円）" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center mb-8">
            <p className="text-gray-600">この月のシフト実績がありません</p>
          </div>
        )}

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
          <div className="p-6 bg-wine-red text-white">
            <h3 className="text-xl font-bold">売上詳細</h3>
          </div>
          <table className="w-full min-w-max">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-2 md:px-6 py-2 md:py-4 text-left text-xs md:text-sm font-bold text-gray-700">順位</th>
                <th className="px-2 md:px-6 py-2 md:py-4 text-left text-xs md:text-sm font-bold text-gray-700">キャスト名</th>
                <th className="px-2 md:px-6 py-2 md:py-4 text-left text-xs md:text-sm font-bold text-gray-700">出勤日数</th>
                <th className="px-2 md:px-6 py-2 md:py-4 text-left text-xs md:text-sm font-bold text-gray-700">売上</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((sale, index) => (
                <tr key={sale.castName} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-2 md:px-6 py-2 md:py-4 font-bold text-wine-red text-sm md:text-lg">{index + 1}</td>
                  <td className="px-2 md:px-6 py-2 md:py-4 font-semibold text-gray-800 text-xs md:text-sm">{sale.castName}</td>
                  <td className="px-2 md:px-6 py-2 md:py-4 text-gray-700 text-xs md:text-sm">{sale.shifts}日</td>
                  <td className="px-2 md:px-6 py-2 md:py-4 font-bold text-wine-red text-xs md:text-sm">¥{sale.revenue.toLocaleString('ja-JP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
