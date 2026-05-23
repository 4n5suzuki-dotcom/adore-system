'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // ログイン処理は後で実装
    console.log('Login attempt:', { email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-wine-red">
          <h1 className="text-3xl font-bold text-wine-red mb-6 text-center">
            ログイン
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red text-white rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-800 font-semibold mb-2">
                メール
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-wine-red"
                placeholder="your@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-gray-800 font-semibold mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-wine-red"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-wine-red text-white font-bold py-2 px-4 rounded hover:bg-opacity-90 transition"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
