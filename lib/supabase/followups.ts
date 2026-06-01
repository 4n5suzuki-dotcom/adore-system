import { supabase } from '../supabase'
import type { Interview } from './types'

// =====================================================================
// 再アプローチ（中途半端ステータス放置者の抽出 + 再連絡導線）
// 外部API連携なし・追加コストゼロ（mailto: / sms: / line.me ディープリンク）
// =====================================================================

/**
 * 「中途半端」とみなすステータス集合。
 * 終端ステータス（hired=採用済み / rejected=不採用）は除外する。
 * interviews.status の取りうる値に合わせている（lib/supabase/types.ts）。
 */
export const STALLED_STATUSES: Interview['status'][] = [
  'incomplete', // 未確認
  'pending', // 待機中
  'confirmed', // 確認済み
  'processing', // 進行中
  'on_trial', // 体験中（仮代入相当）
]

/** 経過日数の既定閾値（日）。これ以上放置されている応募者を抽出する。 */
export const FOLLOWUP_DEFAULT_DAYS = 30

/** UI で切り替え可能な閾値の選択肢（日）。 */
export const FOLLOWUP_THRESHOLDS = [30, 60, 90] as const

export type FollowupThreshold = (typeof FOLLOWUP_THRESHOLDS)[number]

/**
 * 再アプローチ対象の1行（応募者 + 経過日数）。
 * baselineAt は経過日数の起点に使った日付（= updated_at = 最終更新／最終接触の代理）。
 */
export interface StalledApplicant {
  interview: Interview
  baselineAt: string // ISO（起点日 = updated_at）
  elapsedDays: number // 起点日からの経過日数
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** ISO 日付から現在までの経過日数（切り捨て）。負値は 0 に丸める。 */
export function daysSince(iso: string | null | undefined, now: Date = new Date()): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (isNaN(t)) return 0
  const diff = Math.floor((now.getTime() - t) / MS_PER_DAY)
  return diff < 0 ? 0 : diff
}

/**
 * 中途半端ステータスかつ未連絡（last_followup_at IS NULL）の応募者を取得し、
 * 起点日（updated_at）からの経過日数が thresholdDays 以上の行だけ返す。
 *
 * - status ∈ STALLED_STATUSES
 * - last_followup_at IS NULL（まだ再連絡していない）
 * - now - updated_at >= thresholdDays
 *
 * 経過日数の計算・閾値での絞り込みはクライアント側で行う（閾値切替で再取得不要）。
 */
export async function getStalledApplicants(
  thresholdDays: number = FOLLOWUP_DEFAULT_DAYS
): Promise<StalledApplicant[]> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .in('status', STALLED_STATUSES)
    .is('last_followup_at', null)
    .order('updated_at', { ascending: true })

  if (error) {
    console.error('getStalledApplicants failed:', error.message)
    return []
  }

  const now = new Date()
  return (data ?? [])
    .map((row) => {
      const interview = row as Interview
      const baselineAt = interview.updated_at
      return {
        interview,
        baselineAt,
        elapsedDays: daysSince(baselineAt, now),
      }
    })
    .filter((r) => r.elapsedDays >= thresholdDays)
}

/**
 * 「再連絡した」記録を更新する。
 * last_followup_at を現在時刻に、followup_count を +1 する。
 * （col = col + 1 を直接書けないため、呼び出し側の現在値 + 1 を渡す）
 *
 * 注意: updated_at は意図的に触らない。起点日（最終接触の代理）を
 * 再連絡操作でリセットしないため。抽出からは last_followup_at で外れる。
 */
export async function recordFollowup(
  id: string,
  currentCount: number | null | undefined
): Promise<boolean> {
  const { error } = await supabase
    .from('interviews')
    .update({
      last_followup_at: new Date().toISOString(),
      followup_count: (currentCount ?? 0) + 1,
    })
    .eq('id', id)

  if (error) {
    console.error('recordFollowup failed:', error.message)
    return false
  }
  return true
}

// ---------------------------------------------------------------------
// 定型文テンプレート（{name} を差し込み）
// ---------------------------------------------------------------------

export interface FollowupTemplate {
  key: string
  label: string
  subject: string // メール件名にも使用
  body: string // {name} を氏名に置換
}

export const FOLLOWUP_TEMPLATES: FollowupTemplate[] = [
  {
    key: 'gentle',
    label: 'やわらか再連絡',
    subject: 'その後いかがお過ごしでしょうか',
    body:
      '{name}さん\n\nお世話になっております。先日はお問い合わせ・ご来店ありがとうございました。\nその後いかがお過ごしでしょうか。改めてご状況をうかがえればと思いご連絡いたしました。\n\nご都合のよいタイミングで、ぜひ一度ご返信いただけますと幸いです。',
  },
  {
    key: 'interview',
    label: '面接日程の再案内',
    subject: '面接日程の再ご案内',
    body:
      '{name}さん\n\nお世話になっております。面接の件で改めてご連絡いたしました。\nご都合のよい日時をいくつかお知らせいただけますでしょうか。\n\n調整のうえ、こちらから折り返しご案内いたします。ご返信お待ちしております。',
  },
  {
    key: 'trial',
    label: '体験入店のご案内',
    subject: '体験入店のご案内',
    body:
      '{name}さん\n\nお世話になっております。その後のご検討状況はいかがでしょうか。\nまずは体験からでもお気軽にお試しいただけます。ご希望があれば日程を調整いたします。\n\nご質問・ご不安な点があればこのままご返信ください。',
  },
]

/** テンプレート本文・件名の {name} を氏名に置換する。 */
export function fillTemplate(text: string, name: string): string {
  return text.replace(/\{name\}/g, name || 'お客様')
}

// ---------------------------------------------------------------------
// 連絡導線リンク生成（外部API不要）
// ---------------------------------------------------------------------

/** mailto: リンク（件名・本文を埋めた状態でメーラー起動） */
export function buildMailto(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`
}

/** sms: リンク（本文を埋めた状態でSMSアプリ起動） */
export function buildSms(phone: string, body: string): string {
  // 多くの端末で sms:<number>?body=... が解釈される
  const num = phone.replace(/[^0-9+]/g, '')
  return `sms:${num}?body=${encodeURIComponent(body)}`
}

/**
 * LINE 友だち追加／トークのディープリンク。
 * line_id（ベーシックID 等）を ~ プレフィックスで開く。
 * 本文は別途コピーボタンで対応（ディープリンクに本文は載せられない）。
 */
export function buildLineLink(lineId: string): string {
  const id = lineId.replace(/^@/, '')
  return `https://line.me/R/ti/p/~${encodeURIComponent(id)}`
}
