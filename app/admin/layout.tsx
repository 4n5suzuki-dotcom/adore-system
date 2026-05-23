'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'

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
        // ログインしていなければ /auth/login へリダイレクト
        router.push('/auth/login')
        return
      }
      // ログイン済みなら認証チェック完了
      setChecking(false)
    }
    checkAuth()
  }, [router])

  // 認証チェック中・未ログイン時は管理画面の内容を表示しない
  if (checking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        読み込み中...
      </div>
    )
  }

  return <>{children}</>
}
