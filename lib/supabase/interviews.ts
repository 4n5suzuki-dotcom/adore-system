import { supabase } from '../supabase'
import { supabasePublic } from './publicClient'
import type { Interview, InterviewPhoto } from './types'

// 指定した「年・月」の UTC 範囲 [start, end) を返すヘルパー
function monthRange(year: number, month: number): { start: string; end: string } {
  // month は 1-12 で受け取る
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

/**
 * 指定年月の全面接データを取得（created_at の新しい順）
 */
export async function getInterviewsForMonth(
  year: number,
  month: number
): Promise<Interview[]> {
  const { start, end } = monthRange(year, month)

  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getInterviewsForMonth failed:', error.message)
    return []
  }
  return (data ?? []) as Interview[]
}

/**
 * 最新 N 件の面接データを取得（created_at の新しい順）
 */
export async function getLatestInterviews(limit: number = 5): Promise<Interview[]> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getLatestInterviews failed:', error.message)
    return []
  }
  return (data ?? []) as Interview[]
}

export interface InterviewStatusCount {
  incomplete: number
  pending: number
  confirmed: number
  hired: number
  rejected: number
}

/**
 * ステータス別の件数を取得
 */
export async function getInterviewCountByStatus(): Promise<InterviewStatusCount> {
  const statuses: (keyof InterviewStatusCount)[] = [
    'incomplete',
    'pending',
    'confirmed',
    'hired',
    'rejected',
  ]

  // 各ステータスを head:true の count クエリで並列取得
  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from('interviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)

      if (error) {
        console.error(`getInterviewCountByStatus (${status}) failed:`, error.message)
        return [status, 0] as const
      }
      return [status, count ?? 0] as const
    })
  )

  return Object.fromEntries(results) as unknown as InterviewStatusCount
}

/**
 * 今日（ローカル日付）の面接数を取得
 */
export async function getTodayInterviewCount(): Promise<number> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(start.getDate() + 1)

  const { count, error } = await supabase
    .from('interviews')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())

  if (error) {
    console.error('getTodayInterviewCount failed:', error.message)
    return 0
  }
  return count ?? 0
}

/**
 * 指定年月の採用率（採用数 / 全面接数）をパーセンテージで取得
 * 戻り値：0-100（小数第1位まで）。母数が 0 の場合は 0。
 */
export async function getMonthlyAdoptionRate(
  year: number,
  month: number
): Promise<number> {
  const { start, end } = monthRange(year, month)

  // 全面接数
  const totalQuery = supabase
    .from('interviews')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end)

  // 採用（hired）数
  const hiredQuery = supabase
    .from('interviews')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'hired')
    .gte('created_at', start)
    .lt('created_at', end)

  const [totalRes, hiredRes] = await Promise.all([totalQuery, hiredQuery])

  if (totalRes.error || hiredRes.error) {
    console.error(
      'getMonthlyAdoptionRate failed:',
      totalRes.error?.message ?? hiredRes.error?.message
    )
    return 0
  }

  const total = totalRes.count ?? 0
  const hired = hiredRes.count ?? 0
  if (total === 0) return 0

  return Math.round((hired / total) * 1000) / 10
}

/** 指定 ID の面接データを取得 */
export async function getInterviewById(id: string): Promise<Interview | null> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('getInterviewById failed:', error.message)
    return null
  }
  return data as Interview
}

// 面接の写真を取得
export async function getInterviewPhotos(interviewId: string) {
  const { data, error } = await supabase
    .from('interview_photos')
    .select('*')
    .eq('interview_id', interviewId)
    .order('photo_num', { ascending: true })

  if (error) {
    console.error('Failed to fetch interview photos:', error)
    return []
  }

  return (data || []) as InterviewPhoto[]
}

/** 面接ステータスを更新 */
export async function updateInterviewStatus(
  id: string,
  status: Interview['status']
): Promise<boolean> {
  const { error } = await supabase
    .from('interviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('updateInterviewStatus failed:', error.message)
    return false
  }
  return true
}

/** メモを更新 */
export async function updateInterviewMemo(
  id: string,
  memo: string
): Promise<boolean> {
  const { error } = await supabase
    .from('interviews')
    .update({ memo, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('updateInterviewMemo failed:', error.message)
    return false
  }
  return true
}

/** 面接情報を更新（複数項目対応） */
export async function updateInterview(
  id: string,
  updates: Partial<Interview>
): Promise<boolean> {
  const { error } = await supabase
    .from('interviews')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    console.error('updateInterview failed:', error.message)
    return false
  }
  return true
}

/** 新規面接を作成（応募者からの送信） */
export async function createInterview(
  tenantId: string,
  data: Partial<Interview>
): Promise<{ id: string } | null> {
  // 公開フォームからの送信は anon 固定クライアント経由（管理者セッションを引き継がない）。
  // 将来 interviews に RLS を有効化しても authenticated 送信で壊れないよう anon に統一。
  const { data: result, error } = await supabasePublic
    .from('interviews')
    .insert([
      {
        tenant_id: tenantId,
        status: 'incomplete',
        ...data,
      },
    ])
    .select('id')
    .single()
  if (error) {
    console.error('createInterview failed:', error.message)
    return null
  }
  return result as { id: string }
}
