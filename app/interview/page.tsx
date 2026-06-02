'use client'

import { useEffect, useMemo, useState } from 'react'
import { createInterview } from '@/lib/supabase/interviews'
import {
  uploadInterviewPhotos,
  validatePhotoFile,
  MAX_INTERVIEW_PHOTOS,
  ALLOWED_PHOTO_MIME,
} from '@/lib/supabase/interviewPhotos'
import type { Interview } from '@/lib/supabase/types'
import '@/styles/adore-v3.css'

// 送信先テナント（公開フォームのため env から。未設定時はプレースホルダー）
const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000000'

const BACK_REGULATION_VERSION = 'v2.0'

// バック規定（勤務条件・料金システム・各種バック率）
const BACK_REGULATION_TEXT = `【勤務条件・バック規定】 ${BACK_REGULATION_VERSION}

【営業時間】
月曜～金曜：20:00～3:00
土曜・日曜・祝日・GW・お盆・正月（変更あり）：21:00～3:00
来店予定表21時から可能

【定休日】
記載なし

【お客様料金システム】
・ALL TIME（1セット 60分）：8000円
・延長（30分）：4000円
・VIPチャージ：5000円（1名1時間）

同伴：3000円
本指名：3000円
場内指名：3000円
サ20%・TAX10%

【給料システム】
・時給：出勤日数もしくは売上により変動

【勤意報酬】
月の指名本数0の場合、時給500円ダウン
（入店時から20回出勤以上のキャスト対象）
※当日欠勤の場合、以降4回出勤は自払い不可もしくは出勤調整の対象となります

※総売上げに対し支給額50%を保証（月の出勤数10日以上対象）
（ボトル原価とヘルプドリンクバック引き）

【ドリンクバック】
・ノーマルドリンク：500円
・指名テーブル含む テキーラ イェーガー：700円

【ボトルバック】
・小計20%

【指名バック】
・同伴（本指名バック含む）：4000円
・本指名：2000円
・場内指名：1000円

【売上バック】
・同伴：小計30%※セット料金、個室料金
・本指名：小計20%※体験入店は40%バック

※小計算方法
TOTALから他キャストのドリンクバック を引く

【キャスト紹介バック】
10日出勤でクリアとして1人入店につき3万円～
もしくは紹介ホステスさん入店初月の売上10%
どちらか良い方をバックいたします`

const STEPS = [
  '基本情報',
  '住所・本籍地',
  '出勤希望',
  'プロフィール・嗜好',
  '写真アップロード',
  'バック規定確認・同意',
  '振込先情報',
  '確認・送信',
]

// 出勤希望・嗜好など（Interview 型に列が無い項目はこちらで保持）
interface ExtraData {
  pref_days: string
  pref_hours: string
  min_days: string
  alcohol: string
  karaoke: string
  english: string
  chinese: string
  other_lang: string
  occupation: string
  self_pr: string
}

/* ---------- 細線アイコン（brass = currentColor） ---------- */
function ArrowRight() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
function ArrowLeft() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  )
}
function UploadIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V5M8 9l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="af-label">{label}</label>
      {children}
    </div>
  )
}

export default function InterviewEntryPage() {
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [formData, setFormData] = useState<Partial<Interview>>({})
  const [extra, setExtra] = useState<ExtraData>({
    pref_days: '',
    pref_hours: '',
    min_days: '',
    alcohol: '',
    karaoke: '',
    english: '',
    chinese: '',
    other_lang: '',
    occupation: '',
    self_pr: '',
  })
  const [agreeBackRegulation, setAgreeBackRegulation] = useState<boolean>(false)
  const [agreedAt, setAgreedAt] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  // 二重応募防止：一度作成した interview の id を保持し、再試行時は再作成しない
  const [createdInterviewId, setCreatedInterviewId] = useState<string | null>(null)
  // 既にアップロード＋メタ保存まで完了した写真の番号（再試行時は未完分のみ処理）
  const [uploadedNums, setUploadedNums] = useState<number[]>([])

  // 写真プレビュー URL（photos 変更時に再生成し、クリーンアップで解放）
  const photoUrls = useMemo(
    () => photos.map((f) => URL.createObjectURL(f)),
    [photos]
  )
  useEffect(() => {
    return () => photoUrls.forEach((u) => URL.revokeObjectURL(u))
  }, [photoUrls])

  const setField = (key: keyof Interview, value: unknown) =>
    setFormData((prev) => ({ ...prev, [key]: value }))
  const setExtraField = (key: keyof ExtraData, value: string) =>
    setExtra((prev) => ({ ...prev, [key]: value }))

  const isLastStep = currentStep === STEPS.length - 1

  const goNext = () => {
    setError(null)
    if (currentStep === 0) {
      if (
        !formData.genshi_name ||
        !formData.furigana ||
        !formData.email ||
        !formData.phone
      ) {
        setError('必須項目（氏名・ふりがな・メール・電話）を入力してください')
        return
      }
    }
    if (currentStep === 5 && !agreeBackRegulation) return
    if (currentStep === 6) {
      if (
        !formData.bank_name ||
        !formData.branch_name ||
        !formData.account_type ||
        !formData.account_number ||
        !formData.account_name
      ) {
        setError(
          '振込先情報（銀行名・支店名・口座種別・口座番号・口座名義）をすべて入力してください'
        )
        return
      }
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setError(null)
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    setError(null)
    const incoming = Array.from(files)
    // 形式・サイズを検証。不正なファイルは弾いてメッセージを表示
    const valid: File[] = []
    for (const file of incoming) {
      const validationError = validatePhotoFile(file)
      if (validationError) {
        setError(validationError)
        continue
      }
      valid.push(file)
    }
    setPhotos((prev) => [...prev, ...valid].slice(0, MAX_INTERVIEW_PHOTOS))
  }
  const removePhoto = (index: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    // 1) interview 本体を作成（再試行時は再作成せず既存 id を使う＝二重応募防止）
    let interviewId = createdInterviewId
    if (!interviewId) {
      const payload: Partial<Interview> = {
        ...formData,
        agreed_back_regulation_version: BACK_REGULATION_VERSION,
        agreed_at: agreedAt,
      }
      const result = await createInterview(TENANT_ID, payload)
      if (!result) {
        setError('送信に失敗しました。時間をおいて再度お試しください。')
        setLoading(false)
        return
      }
      interviewId = result.id
      setCreatedInterviewId(interviewId)
    }

    // 2) 写真をアップロード（未完分のみ。失敗したら成功扱いにせずエラー表示＋再試行可）
    if (photos.length > 0) {
      const pending = photos
        .map((file, i) => ({ file, num: i + 1 }))
        .filter((p) => !uploadedNums.includes(p.num))

      if (pending.length > 0) {
        const res = await uploadInterviewPhotos(interviewId, pending)
        if (res.doneNums.length > 0) {
          setUploadedNums((prev) =>
            Array.from(new Set([...prev, ...res.doneNums]))
          )
        }
        if (!res.ok) {
          setError(
            res.error ??
              '写真のアップロードに失敗しました。「送信する」を再度押してお試しください（応募情報は保存済みのため二重登録にはなりません）。'
          )
          setLoading(false)
          return
        }
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  // 送信完了画面
  if (success) {
    return (
      <div className="adore-v3 af-page flex min-h-screen items-center justify-center px-4">
        <div className="af-card max-w-md p-8 text-center">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '1px solid var(--hair)',
                background: 'rgba(168,137,76,0.08)',
                color: 'var(--brass)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </span>
          </div>
          <h1 className="af-h2" style={{ marginBottom: 12 }}>
            送信が完了しました
          </h1>
          <p className="af-muted" style={{ margin: 0 }}>
            ご応募ありがとうございます。担当者より追ってご連絡いたします。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="adore-v3 af-page min-h-screen">
      <main className="mx-auto max-w-2xl px-4 py-10 md:py-12">
        {/* ヘッダー */}
        <header className="mb-7 text-center">
          <div className="af-eyebrow" style={{ marginBottom: 10 }}>
            ENTRY
          </div>
          <h1 className="af-h1" style={{ fontSize: 30 }}>
            <span className="en" style={{ fontStyle: 'italic', marginRight: '0.18em' }}>
              Adore
            </span>
            <span className="jp">面接エントリー</span>
          </h1>
          <p className="af-muted" style={{ fontSize: 13.5, marginTop: 12 }}>
            Step {currentStep + 1}/{STEPS.length}：{STEPS[currentStep]}
          </p>
          {/* 進捗バー */}
          <div className="af-track" style={{ marginTop: 14 }}>
            <div
              className="af-fill"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </header>

        {error && (
          <div className="af-alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ステップ本体 */}
        <section className="af-card p-6 md:p-8">
          {/* Step 1: 基本情報 */}
          {currentStep === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="af-h2">基本情報</h2>
                <p className="af-muted" style={{ fontSize: 13.5, marginTop: 6 }}>
                  氏名、年齢、連絡先をお願いします
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="氏名（源氏名）">
                  <input
                    type="text"
                    required
                    value={formData.genshi_name || ''}
                    onChange={(e) => setField('genshi_name', e.target.value)}
                    className="af-input"
                  />
                </Field>
                <Field label="ふりがな">
                  <input
                    type="text"
                    required
                    value={formData.furigana || ''}
                    onChange={(e) => setField('furigana', e.target.value)}
                    className="af-input"
                  />
                </Field>
                <Field label="性別">
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setField('gender', e.target.value)}
                    className="af-select"
                  >
                    <option value="">未選択</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                  </select>
                </Field>
                <Field label="年齢">
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={formData.age ?? ''}
                    onChange={(e) =>
                      setField(
                        'age',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className="af-input"
                  />
                </Field>
                <Field label="生年月日">
                  <input
                    type="date"
                    value={formData.birthdate || ''}
                    onChange={(e) =>
                      setField('birthdate', e.target.value || null)
                    }
                    className="af-input"
                  />
                </Field>
                <Field label="メール">
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setField('email', e.target.value)}
                    className="af-input"
                  />
                </Field>
                <Field label="電話">
                  <input
                    type="tel"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setField('phone', e.target.value)}
                    className="af-input"
                  />
                </Field>
                <Field label="LINE ID">
                  <input
                    type="text"
                    value={formData.line_id || ''}
                    onChange={(e) => setField('line_id', e.target.value)}
                    className="af-input"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2: 住所・本籍地 */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="af-h2">住所・本籍地</h2>
              <Field label="現住所">
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setField('address', e.target.value)}
                  className="af-input"
                />
              </Field>
              <Field label="詳細">
                <input
                  type="text"
                  value={formData.address_detail || ''}
                  onChange={(e) => setField('address_detail', e.target.value)}
                  className="af-input"
                />
              </Field>
              <Field label="一人暮らし">
                <select
                  value={formData.live_alone ? 'yes' : 'no'}
                  onChange={(e) =>
                    setField('live_alone', e.target.value === 'yes')
                  }
                  className="af-select"
                >
                  <option value="no">いいえ</option>
                  <option value="yes">はい</option>
                </select>
              </Field>
              <Field label="同居者情報">
                <textarea
                  value={formData.roommate_info || ''}
                  onChange={(e) => setField('roommate_info', e.target.value)}
                  rows={3}
                  className="af-textarea"
                />
              </Field>
            </div>
          )}

          {/* Step 3: 出勤希望 */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="af-h2">出勤希望</h2>
              <Field label="希望曜日">
                <input
                  type="text"
                  placeholder="例：月・水・金"
                  value={extra.pref_days}
                  onChange={(e) => setExtraField('pref_days', e.target.value)}
                  className="af-input"
                />
              </Field>
              <Field label="希望時間帯">
                <input
                  type="text"
                  placeholder="例：20:00-3:00"
                  value={extra.pref_hours}
                  onChange={(e) => setExtraField('pref_hours', e.target.value)}
                  className="af-input"
                />
              </Field>
              <Field label="最低出勤日数（日/月）">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={extra.min_days}
                  onChange={(e) => setExtraField('min_days', e.target.value)}
                  className="af-input"
                />
              </Field>
            </div>
          )}

          {/* Step 4: プロフィール・嗜好 */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="af-h2">プロフィール・嗜好</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="お酒">
                  <select
                    value={extra.alcohol}
                    onChange={(e) => setExtraField('alcohol', e.target.value)}
                    className="af-select"
                  >
                    <option value="">未選択</option>
                    <option value="1">弱い</option>
                    <option value="2">普通</option>
                    <option value="3">強い</option>
                  </select>
                </Field>
                <Field label="カラオケ">
                  <select
                    value={extra.karaoke}
                    onChange={(e) => setExtraField('karaoke', e.target.value)}
                    className="af-select"
                  >
                    <option value="">未選択</option>
                    <option value="1">弱い</option>
                    <option value="2">普通</option>
                    <option value="3">強い</option>
                  </select>
                </Field>
                <Field label="英語">
                  <select
                    value={extra.english}
                    onChange={(e) => setExtraField('english', e.target.value)}
                    className="af-select"
                  >
                    <option value="">未選択</option>
                    <option value="0">不可</option>
                    <option value="1">簡単</option>
                    <option value="2">流暢</option>
                  </select>
                </Field>
                <Field label="中国語">
                  <select
                    value={extra.chinese}
                    onChange={(e) => setExtraField('chinese', e.target.value)}
                    className="af-select"
                  >
                    <option value="">未選択</option>
                    <option value="0">不可</option>
                    <option value="1">簡単</option>
                    <option value="2">流暢</option>
                  </select>
                </Field>
                <Field label="その他言語">
                  <input
                    type="text"
                    value={extra.other_lang}
                    onChange={(e) => setExtraField('other_lang', e.target.value)}
                    className="af-input"
                  />
                </Field>
                <Field label="職業">
                  <input
                    type="text"
                    value={extra.occupation}
                    onChange={(e) => setExtraField('occupation', e.target.value)}
                    className="af-input"
                  />
                </Field>
              </div>
              <Field label="自己アピール文（500文字まで）">
                <textarea
                  maxLength={500}
                  rows={5}
                  value={extra.self_pr}
                  onChange={(e) => setExtraField('self_pr', e.target.value)}
                  className="af-textarea"
                />
              </Field>
            </div>
          )}

          {/* Step 5: 写真アップロード */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <h2 className="af-h2">写真アップロード</h2>
              <p className="af-muted" style={{ fontSize: 13.5 }}>
                最大{MAX_INTERVIEW_PHOTOS}枚までアップロードできます（JPEG / PNG / WebP・1枚 5MB まで）。
              </p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  addPhotos(e.dataTransfer.files)
                }}
                className="af-dropzone"
              >
                <p className="af-muted" style={{ marginBottom: 14 }}>
                  ここにドラッグ&ドロップ、または
                </p>
                <label className="af-btn af-btn-ghost cursor-pointer inline-flex">
                  <UploadIcon />
                  ファイルを選択
                  <input
                    type="file"
                    accept={ALLOWED_PHOTO_MIME.join(',')}
                    multiple
                    className="hidden"
                    onChange={(e) => addPhotos(e.target.files)}
                  />
                </label>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((_file, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrls[i]}
                        alt={`photo-${i + 1}`}
                        className="af-thumb"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="af-thumb-del"
                        aria-label="削除"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 6: バック規定確認・同意 */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <h2 className="af-h2">バック規定確認・同意</h2>
              <div className="af-reg">{BACK_REGULATION_TEXT}</div>
              <label className="af-check-row">
                <input
                  type="checkbox"
                  checked={agreeBackRegulation}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAgreeBackRegulation(checked)
                    setAgreedAt(checked ? new Date().toISOString() : null)
                  }}
                />
                <span className="af-check-box">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                </span>
                <span className="af-check-label">
                  バック規定（{BACK_REGULATION_VERSION}）に同意する
                </span>
              </label>
            </div>
          )}

          {/* Step 7: 振込先情報 */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <h2 className="af-h2">振込先情報</h2>

              {/* 銀行名 */}
              <div>
                <label className="af-label">
                  銀行名 <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="例：○○銀行"
                  className="af-input"
                />
              </div>

              {/* 支店名 */}
              <div>
                <label className="af-label">
                  支店名 <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={formData.branch_name || ''}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  placeholder="例：○○支店"
                  className="af-input"
                />
              </div>

              {/* 口座種別 */}
              <div>
                <label className="af-label">
                  口座種別 <span className="req">*</span>
                </label>
                <select
                  value={formData.account_type || ''}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="af-select"
                >
                  <option value="">選択してください</option>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>

              {/* 口座番号 */}
              <div>
                <label className="af-label">
                  口座番号 <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_number || ''}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="例：1234567"
                  className="af-input"
                />
              </div>

              {/* 口座名義 */}
              <div>
                <label className="af-label">
                  口座名義（カナ） <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_name || ''}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="例：ヤマダ タロウ"
                  className="af-input"
                />
              </div>
            </div>
          )}

          {/* Step 8: 確認・送信 */}
          {currentStep === 7 && (
            <div className="space-y-5">
              <h2 className="af-h2">確認・送信</h2>
              <p className="af-muted" style={{ fontSize: 13.5 }}>
                入力内容をご確認のうえ、送信してください。
              </p>
              <dl className="af-summary">
                <SummaryRow label="氏名" value={formData.genshi_name} />
                <SummaryRow label="ふりがな" value={formData.furigana} />
                <SummaryRow label="メール" value={formData.email} />
                <SummaryRow label="電話" value={formData.phone} />
                <SummaryRow label="希望曜日" value={extra.pref_days} />
                <SummaryRow label="希望時間帯" value={extra.pref_hours} />
                <SummaryRow label="写真" value={`${photos.length} 枚`} />
                <SummaryRow
                  label="バック規定同意"
                  value={
                    agreedAt
                      ? `同意（${BACK_REGULATION_VERSION}）`
                      : '未同意'
                  }
                />
                <SummaryRow label="銀行名" value={formData.bank_name} />
                <SummaryRow label="支店名" value={formData.branch_name} />
                <SummaryRow label="口座種別" value={formData.account_type} />
                <SummaryRow label="口座番号" value={formData.account_number} />
                <SummaryRow label="口座名義" value={formData.account_name} />
              </dl>
            </div>
          )}
        </section>

        {/* ナビゲーション */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={currentStep === 0 || loading}
            className="af-btn af-btn-ghost"
          >
            <ArrowLeft />
            戻る
          </button>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !agreedAt}
              className="af-btn af-btn-primary"
            >
              {loading ? '送信中...' : '送信する'}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={currentStep === 5 && !agreeBackRegulation}
              className="af-btn af-btn-primary"
            >
              次へ
              <ArrowRight />
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="af-sum-row">
      <dt className="af-sum-label">{label}</dt>
      <dd className="af-sum-value">{value || '未入力'}</dd>
    </div>
  )
}
