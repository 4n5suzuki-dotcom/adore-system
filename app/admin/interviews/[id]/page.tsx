'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/constants'
import {
  getInterviewById,
  getInterviewPhotos,
  updateInterviewStatus,
  updateInterviewMemo,
} from '@/lib/supabase/interviews'
import type { Interview, InterviewPhoto } from '@/lib/supabase/types'

// ステータス → ラベル + バッジ色（Tailwind が検出できるよう完全なクラス名で定義）
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  incomplete: { label: '未確認', className: 'bg-orange text-white' },
  pending: { label: '待機中', className: 'bg-gray-400 text-white' },
  confirmed: { label: '確認済み', className: 'bg-blue text-white' },
  hired: { label: '採用済み', className: 'bg-green text-white' },
  rejected: { label: '不採用', className: 'bg-red text-white' },
  processing: { label: '進行中', className: 'bg-gray-400 text-white' },
  on_trial: { label: '体験中', className: 'bg-gold text-gray-800' },
}

// ISO 文字列 → "YYYY-MM-DD HH:MM"（ローカル時刻）
function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 値が空なら「未入力」を返す
function orEmpty(value: unknown): string {
  if (value === null || value === undefined || value === '') return '未入力'
  return String(value)
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    className: 'bg-gray-200 text-gray-800',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${style.className}`}>
      {style.label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline py-2 border-b border-gray-200 last:border-0">
      <span className="text-muted text-sm w-40 shrink-0">{label}</span>
      <span className="text-gray-800 break-words">{value}</span>
    </div>
  )
}

export default function InterviewDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [interview, setInterview] = useState<Interview | null>(null)
  const [photos, setPhotos] = useState<InterviewPhoto[]>([])
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingMemo, setEditingMemo] = useState<boolean>(false)
  const [memoText, setMemoText] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [data, photoData] = await Promise.all([
          getInterviewById(id),
          getInterviewPhotos(id),
        ])
        setInterview(data)
        setPhotos(photoData)
        // 成功時に memoText を初期化
        if (data) setMemoText(data.memo ?? '')
      } catch (err) {
        console.error('interview detail load failed:', err)
        setError(err instanceof Error ? err.message : '読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // 拡大表示中は Esc キーで閉じる
  useEffect(() => {
    if (!zoomPhoto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomPhoto(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomPhoto])

  // ステータス更新（採用 / 不採用）
  const handleStatusChange = async (newStatus: Interview['status']) => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)
    const ok = await updateInterviewStatus(id, newStatus)
    if (ok) {
      setInterview((prev) => (prev ? { ...prev, status: newStatus } : prev))
      setSuccess('ステータスを更新しました')
    } else {
      setError('保存に失敗しました')
    }
    setIsSaving(false)
  }

  // 採用 → ステータスを hired に更新し、面接データからキャストを自動作成
  const handleApprove = async () => {
    if (!interview) return

    setIsSaving(true)

    try {
      // 1. ステータスを 'hired' に更新
      const { error: updateError } = await supabase
        .from('interviews')
        .update({ status: 'hired' })
        .eq('id', interview.id)

      if (updateError) {
        alert('ステータス更新に失敗しました')
        setIsSaving(false)
        return
      }

      // 2. キャストを自動作成
      const { data, error: castError } = await supabase
        .from('casts')
        .insert({
          tenant_id: DEFAULT_TENANT_ID,
          interview_id: interview.id,
          genshi_name: interview.genshi_name || '',
          furigana: interview.furigana || '',
          age: interview.age || null,
          contact_info: interview.phone || '',
          joined_date: new Date().toISOString().split('T')[0],
          status: 'active',
          memo: `採用面接日：${interview.created_at ? new Date(interview.created_at).toLocaleDateString('ja-JP') : ''}`,
        })
        .select()

      if (!castError && data && data[0]) {
        alert('採用決定してキャスト情報を作成しました')
        setInterview({ ...interview, status: 'hired' })
      } else {
        alert('キャスト作成に失敗しました：' + castError?.message)
      }
    } catch (err) {
      alert('エラーが発生しました')
    }

    setIsSaving(false)
  }

  // メモ保存
  const handleMemoSave = async () => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)
    const ok = await updateInterviewMemo(id, memoText)
    if (ok) {
      setInterview((prev) => (prev ? { ...prev, memo: memoText } : prev))
      setEditingMemo(false)
      setSuccess('メモを保存しました')
    } else {
      setError('保存に失敗しました')
    }
    setIsSaving(false)
  }

  // メモ編集キャンセル
  const handleMemoCancel = () => {
    setEditingMemo(false)
    setMemoText(interview?.memo ?? '')
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
          <h1 className="heading-2">面接詳細</h1>
          <button onClick={() => router.push('/admin')} className="btn-secondary">
            ← 戻る
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 通知バナー */}
        {error && (
          <div className="p-3 bg-red text-white rounded">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green text-white rounded">{success}</div>
        )}

        {/* セクション 1: 基本情報 */}
        <section className="card-wine-border">
          <h2 className="heading-2 text-2xl mb-4">基本情報</h2>
          <InfoRow label="氏名（源氏名）" value={orEmpty(interview.genshi_name)} />
          <InfoRow label="ふりがな" value={orEmpty(interview.furigana)} />
          <InfoRow label="性別" value={orEmpty(interview.gender)} />
          <InfoRow label="年齢" value={orEmpty(interview.age)} />
          <InfoRow label="生年月日" value={orEmpty(interview.birthdate)} />
          <InfoRow label="メール" value={orEmpty(interview.email)} />
          <InfoRow label="電話" value={orEmpty(interview.phone)} />
          <InfoRow label="LINE ID" value={orEmpty(interview.line_id)} />
        </section>

        {/* セクション 1.5: 応募者写真 */}
        <div className="card-wine-border p-6 mb-6">
          <h2 className="heading-2 text-2xl font-bold text-wine-red mb-4">応募者写真</h2>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded border border-gray-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photo_url}
                    alt={`写真 ${photo.photo_num}`}
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition"
                    onClick={() => setZoomPhoto(photo.photo_url)}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23999"%3E画像がありません%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">写真がまだ登録されていません</p>
          )}
        </div>

        {/* セクション 2: 現住所・本籍地 */}
        <section className="card-wine-border">
          <h2 className="heading-2 text-2xl mb-4">現住所・本籍地</h2>
          <InfoRow label="現住所" value={orEmpty(interview.address)} />
          <InfoRow label="詳細" value={orEmpty(interview.address_detail)} />
          <InfoRow
            label="一人暮らし"
            value={interview.live_alone ? 'はい' : 'いいえ / 不明'}
          />
          <InfoRow label="同居者情報" value={orEmpty(interview.roommate_info)} />
        </section>

        {/* セクション 3: 出勤希望 */}
        <section className="card-wine-border">
          <h2 className="heading-2 text-2xl mb-4">出勤希望</h2>
          {/* 現状のデータモデルには出勤希望の項目が無いため、すべて未入力表示 */}
          <InfoRow label="希望出勤日数" value="未入力" />
          <InfoRow label="希望時間帯" value="未入力" />
          <InfoRow label="備考" value="未入力" />
        </section>

        {/* セクション 4: 採用判定 */}
        <section className="card-wine-border">
          <h2 className="heading-2 text-2xl mb-4">採用判定</h2>

          <div className="flex items-center gap-3 py-2 border-b border-gray-200">
            <span className="text-muted text-sm w-40 shrink-0">現在のステータス</span>
            <StatusBadge status={interview.status} />
          </div>

          <InfoRow
            label="バック規定同意"
            value={
              interview.agreed_back_regulation_version && interview.agreed_at
                ? `バージョン ${interview.agreed_back_regulation_version} に ${formatDateTime(
                    interview.agreed_at
                  )} に同意`
                : '未同意'
            }
          />

          {/* メモ */}
          <div className="pt-4">
            <p className="form-label">メモ</p>
            {editingMemo ? (
              <div>
                <textarea
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded bg-yellow-50 focus:outline-none focus:border-wine-red"
                  placeholder="メモを入力..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleMemoSave}
                    disabled={isSaving}
                    className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    💾 保存
                  </button>
                  <button
                    onClick={handleMemoCancel}
                    disabled={isSaving}
                    className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    🚫 キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {interview.memo || '（メモなし）'}
                </p>
                <button
                  onClick={() => {
                    setMemoText(interview.memo ?? '')
                    setEditingMemo(true)
                  }}
                  className="text-wine-red font-semibold hover:underline mt-2"
                >
                  ✏️ 編集
                </button>
              </div>
            )}
          </div>
        </section>

        {/* セクション 5: アクション */}
        <section className="card">
          <h2 className="heading-2 text-2xl mb-4">アクション</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push(`/admin/interviews/${id}/edit`)}
              className="btn-secondary"
            >
              ✏️ 編集
            </button>
            <button
              onClick={handleApprove}
              disabled={isSaving || interview.status === 'hired'}
              className="bg-green text-white font-bold py-2 px-4 rounded hover:bg-green/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? '処理中...' : '✅ 採用'}
            </button>
            <button
              onClick={() => handleStatusChange('rejected')}
              disabled={isSaving}
              className="bg-red text-white font-bold py-2 px-4 rounded hover:bg-red/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              ❌ 不採用
            </button>
          </div>

        </section>
      </main>

      {/* 写真拡大モーダル */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/90 p-4"
          onClick={() => setZoomPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomPhoto}
            alt="拡大写真"
            className="max-h-full max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomPhoto(null)}
            aria-label="閉じる"
            className="absolute top-4 right-6 text-white text-4xl font-bold leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
