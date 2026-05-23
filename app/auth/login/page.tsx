'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/supabase/auth'

type Mode = 'login' | 'signup'

// Supabase のエラーメッセージを日本語に変換
function translateError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'メールまたはパスワードが正しくありません'
  }
  if (message.includes('User already registered')) {
    return 'このメールアドレスは既に登録済みです'
  }
  return message
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(translateError(error.message))
          return
        }
        // 成功時：管理画面へリダイレクト
        router.push('/admin')
      } else {
        const { error } = await signUp(email, password)
        if (error) {
          setError(translateError(error.message))
          return
        }
        setSuccess('登録完了。メール確認をしてください')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md">
        <div className="card-wine-border">
          <h1 className="heading-2 mb-6 text-center">
            {mode === 'login' ? 'ログイン' : '新規登録'}
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red text-white rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green text-white rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">
                メール
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="your@example.com"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="form-label">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading
                ? '処理中...'
                : mode === 'login'
                  ? 'ログイン'
                  : '新規登録'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="text-wine-red font-semibold hover:underline disabled:opacity-60"
            >
              {mode === 'login'
                ? 'アカウントをお持ちでない方は 新規登録'
                : '既にアカウントをお持ちの方は ログイン'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
