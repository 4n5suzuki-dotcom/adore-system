'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getInterviewById, updateInterview } from '@/lib/supabase/interviews'
import type { Interview } from '@/lib/supabase/types'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

export default function InterviewEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [interview, setInterview] = useState<Interview | null>(null)
  const [formData, setFormData] = useState<Partial<Interview>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getInterviewById(id)
        setInterview(data)
        if (data) {
          // 編集対象（編集可能な項目のみ）で formData を初期化
          setFormData({
            genshi_name: data.genshi_name,
            furigana: data.furigana,
            gender: data.gender,
            birthdate: data.birthdate,
            age: data.age,
            email: data.email,
            phone: data.phone,
            line_id: data.line_id,
            address: data.address,
            address_detail: data.address_detail,
            live_alone: data.live_alone,
            roommate_info: data.roommate_info,
          })
        }
      } catch (err) {
        console.error('interview edit load failed:', err)
        setError(err instanceof Error ? err.message : '読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const ok = await updateInterview(id, formData)
    if (ok) {
      setSuccess(true)
      // 2秒後に詳細ページへ
      setTimeout(() => router.push(`/admin/interviews/${id}`), 2000)
    } else {
      setError('保存に失敗しました')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/admin/interviews/${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-muted text-lg">読み込み中...</p>
      </div>
    )
  }

  if (error && !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-error text-lg">エラー: {error}</p>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-muted text-lg">面接データが見つかりません</p>
        <button onClick={() => router.push('/admin')} className="btn-primary">
          ← 戻る
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="heading-2">面接情報を編集</h1>
          <button onClick={handleCancel} className="btn-secondary">
            ← キャンセル
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 通知バナー */}
        {error && <div className="p-3 bg-red text-white rounded">{error}</div>}
        {success && (
          <div className="p-3 bg-green text-white rounded">保存しました</div>
        )}

        {/* セクション 1: 基本情報 */}
        <section className="card-wine-border">
          <h2 className="heading-2 text-2xl mb-4">基本情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="氏名（源氏名）">
              <input
                type="text"
                value={formData.genshi_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, genshi_name: e.target.value })
                }
                className="form-input"
              />
            </Field>

            <Field label="ふりがな">
              <input
                type="text"
                value={formData.furigana || ''}
                onChange={(e) =>
                  setFormData({ ...formData, furigana: e.target.value })
                }
                className="form-input"
              />
            </Field>

            <Field label="性別">
              <select
                value={formData.gender || ''}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="form-input"
              >
                <option value="">未選択</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
            </Field>

            <Field label="年齢">
              <input
                type="number"
                value={formData.age ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    age: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="form-input"
              />
            </Field>

            <Field label="生年月日">
              <input
                type="date"
                value={formData.birthdate || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    birthdate: e.target.value || null,
                  })
                }
                className="form-input"
              />
            </Field>

            <Field label="メール">
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="form-input"
              />
            </Field>

            <Field label="電話">
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="form-input"
              />
            </Field>

            <Field label="LINE ID">
              <input
                type="text"
                value={formData.line_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, line_id: e.target.value })
                }
                className="form-input"
              />
            </Field>
          </div>
        </section>

        {/* セクション 2: 現住所・本籍地 */}
        <section className="card-wine-border">
          <h2 className="heading-2 text-2xl mb-4">現住所・本籍地</h2>
          <div className="space-y-4">
            <Field label="現住所">
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="form-input"
              />
            </Field>

            <Field label="詳細">
              <input
                type="text"
                value={formData.address_detail || ''}
                onChange={(e) =>
                  setFormData({ ...formData, address_detail: e.target.value })
                }
                className="form-input"
              />
            </Field>

            <Field label="一人暮らし">
              <select
                value={formData.live_alone ? 'yes' : 'no'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    live_alone: e.target.value === 'yes',
                  })
                }
                className="form-input"
              >
                <option value="no">いいえ / 不明</option>
                <option value="yes">はい</option>
              </select>
            </Field>

            <Field label="同居者情報">
              <textarea
                value={formData.roommate_info || ''}
                onChange={(e) =>
                  setFormData({ ...formData, roommate_info: e.target.value })
                }
                rows={3}
                className="form-input"
              />
            </Field>
          </div>
        </section>

        {/* セクション 3: その他情報 */}
        <section className="card-wine-border">
          <h2 className="heading-2 text-2xl mb-4">その他情報</h2>
          <p className="text-muted text-sm">
            現在のデータモデルに編集可能な追加項目はありません（出勤希望などの項目を追加した場合はここに表示します）。
          </p>
        </section>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '💾 保存'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving || success}
            className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            🚫 キャンセル
          </button>
        </div>
      </main>
    </div>
  )
}
