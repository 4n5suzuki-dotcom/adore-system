import { supabase } from '../supabase'
import type { ShiftAccessToken } from './types'

// トークン生成関数（32文字ランダム）
export function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// シフト申告URL生成（管理側）
export async function generateShiftAccessToken(
  castId: string,
  expiresInDays: number = 7
): Promise<ShiftAccessToken | null> {
  const token = generateAccessToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  try {
    const { data, error } = await supabase
      .from('shift_access_tokens')
      .insert({
        cast_id: castId,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) {
      // 握り潰さず Supabase の実エラーを表示（テーブル不在・RLS・外部キー違反などの特定用）
      console.error('[generateShiftAccessToken] insert failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        castId,
      })
      return null
    }

    return data
  } catch (e) {
    console.error('[generateShiftAccessToken] unexpected error:', e, { castId })
    return null
  }
}

// トークン検証（キャスト側）
export async function validateAccessToken(token: string): Promise<ShiftAccessToken | null> {
  const { data, error } = await supabase
    .from('shift_access_tokens')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .eq('is_used', false)
    .single()

  return error ? null : data
}

// トークンを使用済みに変更
export async function markTokenAsUsed(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('shift_access_tokens')
    .update({ is_used: true })
    .eq('token', token)

  return !error
}

// ============================================================
// shift_submissions：キャスト申告 → 管理側が確定版に調整するフロー
// 前提：shift_submissions テーブル（UNIQUE(cast_id, shift_date)）が必要
// ============================================================

// キャストがシフトを申告（既存の shift_schedules と並行保存）
// 同一キャスト・同一日の再申告は UNIQUE(cast_id, shift_date) で上書き
export async function submitShiftApplication(
  castId: string,
  shiftDate: string,
  startTime: string | null,
  endTime: string | null
) {
  const { data, error } = await supabase
    .from('shift_submissions')
    .upsert(
      [
        {
          cast_id: castId,
          shift_date: shiftDate,
          start_time: startTime,
          end_time: endTime,
          status: 'submitted'
        }
      ],
      { onConflict: 'cast_id,shift_date' }
    )
    .select()

  if (error) {
    console.error('[submitShiftApplication] upsert failed:', error)
    throw error
  }

  return data?.[0]
}

// 管理側：申告されたシフト一覧を取得
export async function getSubmittedShifts(startDate?: string, endDate?: string) {
  let query = supabase
    .from('shift_submissions')
    .select('*, casts(id, genshi_name, furigana)')
    .eq('status', 'submitted')
    .order('shift_date', { ascending: true })

  if (startDate) {
    query = query.gte('shift_date', startDate)
  }
  if (endDate) {
    query = query.lte('shift_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getSubmittedShifts] fetch failed:', error)
    throw error
  }

  return data
}

// 管理側：シフトを確定版に調整
export async function confirmShift(
  submissionId: string,
  confirmedStartTime: string | null,
  confirmedEndTime: string | null,
  userId: string
) {
  const { data, error } = await supabase
    .from('shift_submissions')
    .update({
      status: 'confirmed',
      confirmed_start_time: confirmedStartTime,
      confirmed_end_time: confirmedEndTime,
      confirmed_at: new Date().toISOString(),
      confirmed_by: userId
    })
    .eq('id', submissionId)
    .select()

  if (error) {
    console.error('[confirmShift] update failed:', error)
    throw error
  }

  return data?.[0]
}

// 管理側：確定版シフトを取得（女の子に通知用）
export async function getConfirmedShiftsByCastId(castId: string) {
  const { data, error } = await supabase
    .from('shift_submissions')
    .select('*')
    .eq('cast_id', castId)
    .eq('status', 'confirmed')
    .order('shift_date', { ascending: true })

  if (error) {
    console.error('[getConfirmedShiftsByCastId] fetch failed:', error)
    throw error
  }

  return data
}

// 確定版シフトを「コピー用テキスト」として生成（LINE 送付用）
export async function generateConfirmedShiftText(castId: string) {
  const shifts = await getConfirmedShiftsByCastId(castId)

  if (!shifts || shifts.length === 0) {
    return 'シフトがありません'
  }

  const cast = await supabase
    .from('casts')
    .select('genshi_name')
    .eq('id', castId)
    .single()

  let text = `\n${cast.data?.genshi_name}さんのシフト確定版\n`
  text += `${'='.repeat(40)}\n`

  shifts.forEach((shift) => {
    text += `${shift.shift_date}：`
    if (shift.confirmed_start_time && shift.confirmed_end_time) {
      // TIME は HH:MM:SS で返るため HH:MM に整形
      text += `${shift.confirmed_start_time.slice(0, 5)} ~ ${shift.confirmed_end_time.slice(0, 5)}`
    } else {
      text += 'なし'
    }
    text += '\n'
  })

  text += `${'='.repeat(40)}\n`

  return text
}
