'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import Sidebar from '@/components/admin/Sidebar'
import Header from '@/components/admin/Header'
import BottomTabBar from '@/components/admin/BottomTabBar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setChecking(false)
    }
    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        読み込み中...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* サイドバー */}
      <Sidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <Header />

        {/* ページ内容 */}
        <main className="flex-1 p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* モバイル用ボトムタブバー */}
      <BottomTabBar />
    </div>
  )
}
