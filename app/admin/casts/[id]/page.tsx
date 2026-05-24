'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Cast, CastPerformance } from '@/lib/supabase/types'

export default function CastDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [cast, setCast] = useState<Cast | null>(null)
  const [performances, setPerformances] = useState<CastPerformance[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="p-8">読み込み中...</div>
  if (!cast) return <div className="p-8">キャストが見つかりません</div>

  const statusLabel = {
    active: '在籍中',
    trial: '体験中',
    retired: '退店済み'
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

        {/* 基本情報 */}
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

        {/* 月別実績 */}
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
      </div>
    </div>
  )
}
