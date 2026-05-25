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

  const { data, error } = await supabase
    .from('shift_access_tokens')
    .insert({
      cast_id: castId,
      token,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  return error ? null : data
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
