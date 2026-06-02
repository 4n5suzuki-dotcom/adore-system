import { supabase } from '../supabase'
import type { InterviewPhoto } from './types'

// =====================================================================
// 面接（応募）写真の保存・表示ロジック（顔写真＝機微情報）
//
// 設計（確定）:
//   - 保存先: Supabase Storage（private バケット）＋ interview_photos テーブル
//   - アップロード主体: 応募者本人（未ログイン anon ロール）＝ write-only
//   - 閲覧: 管理画面（authenticated）のみ。署名URL（TTL=300秒）を都度生成
//   - 枚数=3 / 1枚=5MB以下 / 形式= JPEG・PNG・WebP
//
// Option B（サーバー経由・service_role）への移行ポイント:
//   uploadInterviewPhotos() の中身（storage.upload + interview_photos INSERT）を
//   「サーバーの Route Handler を fetch する実装」に差し替えるだけでよい。
//   呼び出し側（app/interview/page.tsx）と戻り値の型は変更不要。
// =====================================================================

// バケット名（秘密情報ではない。env 未設定時は既定値にフォールバック）
export const INTERVIEW_PHOTO_BUCKET =
  process.env.NEXT_PUBLIC_INTERVIEW_PHOTO_BUCKET ?? 'interview-photos'

export const MAX_INTERVIEW_PHOTOS = 3
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5MB
export const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

const SIGNED_URL_TTL_SECONDS = 300

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** クライアント側バリデーション。問題なければ null、あればエラーメッセージを返す。 */
export function validatePhotoFile(file: File): string | null {
  if (!(ALLOWED_PHOTO_MIME as readonly string[]).includes(file.type)) {
    return `「${file.name}」は対応していない形式です（JPEG / PNG / WebP のみ）`
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `「${file.name}」は 5MB を超えています`
  }
  return null
}

export interface PhotoUploadResult {
  ok: boolean
  /** 今回アップロード＋メタ保存まで完了した photo_num の一覧（呼び出し側の冪等化に使う） */
  doneNums: number[]
  error?: string
}

// Storage の「既に存在する」エラーかどうか（再試行時に握る用）
function isAlreadyExistsError(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('already exists') || m.includes('duplicate') || m.includes('resource already')
}

/**
 * 写真を Storage へアップロードし、interview_photos にメタデータを保存する。
 * items は「まだ完了していない分」だけを渡す（冪等化は呼び出し側が担保）。
 * いずれかで失敗したら ok:false を返し、それまでに完了した分は doneNums で返す。
 *
 * ※ ここが Option B（サーバー経由）への差し替えポイント。
 */
export async function uploadInterviewPhotos(
  interviewId: string,
  items: { file: File; num: number }[]
): Promise<PhotoUploadResult> {
  const doneNums: number[] = []

  for (const { file, num } of items) {
    const validationError = validatePhotoFile(file)
    if (validationError) {
      return { ok: false, doneNums, error: validationError }
    }

    const ext = EXT_BY_MIME[file.type] ?? 'jpg'
    const path = `${interviewId}/${num}.${ext}`

    // 1) Storage へアップロード（上書き禁止。再試行で既存なら「成功扱い」で次へ）
    const { error: uploadError } = await supabase.storage
      .from(INTERVIEW_PHOTO_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type })

    if (uploadError && !isAlreadyExistsError(uploadError.message)) {
      return {
        ok: false,
        doneNums,
        error: `写真のアップロードに失敗しました（${num}枚目）。通信環境をご確認のうえ再度お試しください。`,
      }
    }

    // 2) interview_photos にメタデータ（photo_url にはパスを保存）
    const { error: metaError } = await supabase
      .from('interview_photos')
      .insert([{ interview_id: interviewId, photo_num: num, photo_url: path }])

    if (metaError) {
      return {
        ok: false,
        doneNums,
        error: `写真情報の保存に失敗しました（${num}枚目）。再度お試しください。`,
      }
    }

    doneNums.push(num)
  }

  return { ok: true, doneNums }
}

/**
 * 管理画面表示用：interview_photos の photo_url（Storage パス）を署名URLへ変換する。
 * - http(s) で始まる値（既存シードの外部URL）はそのままパススルー（後方互換）
 * - それ以外はパスとみなし、private バケットの署名URL（TTL=300秒）を生成
 * 戻り値: photo.id → 表示用URL のマップ（生成失敗分は欠落）
 */
export async function getSignedInterviewPhotoUrls(
  photos: InterviewPhoto[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}

  // 後方互換（外部URL）はそのまま採用
  const pathPhotos: InterviewPhoto[] = []
  for (const photo of photos) {
    const value = photo.photo_url ?? ''
    if (/^https?:\/\//i.test(value)) {
      result[photo.id] = value
    } else if (value) {
      pathPhotos.push(photo)
    }
  }

  if (pathPhotos.length > 0) {
    const paths = pathPhotos.map((p) => p.photo_url as string)
    const { data, error } = await supabase.storage
      .from(INTERVIEW_PHOTO_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

    if (!error && data) {
      data.forEach((entry, i) => {
        if (entry.signedUrl) {
          result[pathPhotos[i].id] = entry.signedUrl
        }
      })
    } else if (error) {
      console.error('createSignedUrls failed:', error.message)
    }
  }

  return result
}
