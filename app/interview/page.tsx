'use client'

import { useEffect, useMemo, useState } from 'react'
import { createInterview } from '@/lib/supabase/interviews'
import type { Interview } from '@/lib/supabase/types'

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}</label>
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
    setPhotos((prev) => [...prev, ...Array.from(files)].slice(0, 6))
  }
  const removePhoto = (index: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    // Interview の列に対応するデータ + 同意情報のみ送信（extra/photos は未永続化）
    const payload: Partial<Interview> = {
      ...formData,
      agreed_back_regulation_version: BACK_REGULATION_VERSION,
      agreed_at: agreedAt,
    }
    const result = await createInterview(TENANT_ID, payload)
    if (result) {
      setSuccess(true)
    } else {
      setError('送信に失敗しました。時間をおいて再度お試しください。')
    }
    setLoading(false)
  }

  // 送信完了画面
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="card-wine-border max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="heading-2 mb-3">送信が完了しました</h1>
          <p className="text-muted">
            ご応募ありがとうございます。担当者より追ってご連絡いたします。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="mb-6 text-center">
          <h1 className="heading-1 mb-3">Adore 面接エントリー</h1>
          <p className="text-muted text-sm">
            Step {currentStep + 1}/{STEPS.length}：{STEPS[currentStep]}
          </p>
          {/* 進捗バー */}
          <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-wine-red transition-all"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red text-white rounded">{error}</div>
        )}

        {/* ステップ本体 */}
        <section className="card-wine-border">
          {/* Step 1: 基本情報 */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="heading-2 text-2xl">基本情報</h2>
                <p className="text-muted text-sm mt-1">
                  氏名、年齢、連絡先をお願いします
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="氏名（源氏名）">
                  <input
                    type="text"
                    required
                    value={formData.genshi_name || ''}
                    onChange={(e) => setField('genshi_name', e.target.value)}
                    className="form-input"
                  />
                </Field>
                <Field label="ふりがな">
                  <input
                    type="text"
                    required
                    value={formData.furigana || ''}
                    onChange={(e) => setField('furigana', e.target.value)}
                    className="form-input"
                  />
                </Field>
                <Field label="性別">
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setField('gender', e.target.value)}
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
                    min={18}
                    max={65}
                    value={formData.age ?? ''}
                    onChange={(e) =>
                      setField(
                        'age',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className="form-input"
                  />
                </Field>
                <Field label="生年月日">
                  <input
                    type="date"
                    value={formData.birthdate || ''}
                    onChange={(e) =>
                      setField('birthdate', e.target.value || null)
                    }
                    className="form-input"
                  />
                </Field>
                <Field label="メール">
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setField('email', e.target.value)}
                    className="form-input"
                  />
                </Field>
                <Field label="電話">
                  <input
                    type="tel"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setField('phone', e.target.value)}
                    className="form-input"
                  />
                </Field>
                <Field label="LINE ID">
                  <input
                    type="text"
                    value={formData.line_id || ''}
                    onChange={(e) => setField('line_id', e.target.value)}
                    className="form-input"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2: 住所・本籍地 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="heading-2 text-2xl">住所・本籍地</h2>
              <Field label="現住所">
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setField('address', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="詳細">
                <input
                  type="text"
                  value={formData.address_detail || ''}
                  onChange={(e) => setField('address_detail', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="一人暮らし">
                <select
                  value={formData.live_alone ? 'yes' : 'no'}
                  onChange={(e) =>
                    setField('live_alone', e.target.value === 'yes')
                  }
                  className="form-input"
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
                  className="form-input"
                />
              </Field>
            </div>
          )}

          {/* Step 3: 出勤希望 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="heading-2 text-2xl">出勤希望</h2>
              <Field label="希望曜日">
                <input
                  type="text"
                  placeholder="例：月・水・金"
                  value={extra.pref_days}
                  onChange={(e) => setExtraField('pref_days', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="希望時間帯">
                <input
                  type="text"
                  placeholder="例：20:00-3:00"
                  value={extra.pref_hours}
                  onChange={(e) => setExtraField('pref_hours', e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="最低出勤日数（日/月）">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={extra.min_days}
                  onChange={(e) => setExtraField('min_days', e.target.value)}
                  className="form-input"
                />
              </Field>
            </div>
          )}

          {/* Step 4: プロフィール・嗜好 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="heading-2 text-2xl">プロフィール・嗜好</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="お酒">
                  <select
                    value={extra.alcohol}
                    onChange={(e) => setExtraField('alcohol', e.target.value)}
                    className="form-input"
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
                    className="form-input"
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
                    className="form-input"
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
                    className="form-input"
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
                    className="form-input"
                  />
                </Field>
                <Field label="職業">
                  <input
                    type="text"
                    value={extra.occupation}
                    onChange={(e) => setExtraField('occupation', e.target.value)}
                    className="form-input"
                  />
                </Field>
              </div>
              <Field label="自己アピール文（500文字まで）">
                <textarea
                  maxLength={500}
                  rows={5}
                  value={extra.self_pr}
                  onChange={(e) => setExtraField('self_pr', e.target.value)}
                  className="form-input"
                />
              </Field>
            </div>
          )}

          {/* Step 5: 写真アップロード */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="heading-2 text-2xl">写真アップロード</h2>
              <p className="text-muted text-sm">最大6枚までアップロードできます。</p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  addPhotos(e.dataTransfer.files)
                }}
                className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center"
              >
                <p className="text-muted mb-3">
                  ここにドラッグ&ドロップ、または
                </p>
                <label className="btn-secondary cursor-pointer inline-block">
                  ファイルを選択
                  <input
                    type="file"
                    accept="image/*"
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
                        className="w-full h-32 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-red text-white rounded-full w-6 h-6 text-sm leading-none"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 6: バック規定確認・同意 */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="heading-2 text-2xl">バック規定確認・同意</h2>
              <div className="h-64 overflow-y-auto border border-gray-200 rounded p-4 bg-gray-50 whitespace-pre-wrap text-gray-800 text-sm">
                {BACK_REGULATION_TEXT}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeBackRegulation}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAgreeBackRegulation(checked)
                    setAgreedAt(checked ? new Date().toISOString() : null)
                  }}
                />
                <span className="text-gray-800 font-semibold">
                  バック規定（{BACK_REGULATION_VERSION}）に同意する
                </span>
              </label>
            </div>
          )}

          {/* Step 7: 振込先情報 */}
          {currentStep === 6 && (
            <div className="mb-8">
              <h2 className="heading-2 text-2xl mb-4">振込先情報</h2>

              {/* 銀行名 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  銀行名 <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="例：○○銀行"
                  className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-wine-red"
                />
              </div>

              {/* 支店名 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  支店名 <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.branch_name || ''}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  placeholder="例：○○支店"
                  className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-wine-red"
                />
              </div>

              {/* 口座種別 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  口座種別 <span className="text-red">*</span>
                </label>
                <select
                  value={formData.account_type || ''}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-wine-red"
                >
                  <option value="">選択してください</option>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>

              {/* 口座番号 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  口座番号 <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_number || ''}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="例：1234567"
                  className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-wine-red"
                />
              </div>

              {/* 口座名義 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  口座名義（カナ） <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_name || ''}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="例：ヤマダ タロウ"
                  className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-wine-red"
                />
              </div>
            </div>
          )}

          {/* Step 8: 確認・送信 */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h2 className="heading-2 text-2xl">確認・送信</h2>
              <p className="text-muted text-sm">
                入力内容をご確認のうえ、送信してください。
              </p>
              <dl className="divide-y divide-gray-200 text-sm">
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
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← 戻る
          </button>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !agreedAt}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '送信中...' : '送信する'}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={currentStep === 5 && !agreeBackRegulation}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              次へ →
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
    <div className="flex py-2">
      <dt className="text-muted w-32 shrink-0">{label}</dt>
      <dd className="text-gray-800 break-words">{value || '未入力'}</dd>
    </div>
  )
}
