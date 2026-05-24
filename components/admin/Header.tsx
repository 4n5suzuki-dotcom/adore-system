'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // ユーザー情報を取得（マウント時）
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    fetchUser()
  }, [])

  // ログアウト処理
  const handleLogout = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/auth/login')
    }
    setIsLoading(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4">
        {/* 左側：ページタイトル（将来：パンくず） */}
        <div>
          <h2 className="text-xl font-bold text-wine-red">管理画面</h2>
        </div>

        {/* 右側：ユーザー情報 + ログアウト */}
        <div className="flex items-center gap-6">
          {/* ユーザーメール */}
          <div className="text-right">
            <p className="text-sm text-gray-600">ログイン中</p>
            <p className="text-sm font-semibold text-wine-red">{userEmail || '—'}</p>
          </div>

          {/* ログアウトボタン */}
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="px-4 py-2 bg-wine-red text-white rounded font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? 'ログアウト中...' : 'ログアウト'}
          </button>
        </div>
      </div>
    </header>
  )
}
