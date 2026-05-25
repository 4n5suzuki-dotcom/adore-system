// @ts-nocheck

import { supabase } from '../supabase'
import type { FeatureFlag } from './types'

// フィーチャーフラグキャッシュ（メモリキャッシュ）
let flagCache: Map<string, FeatureFlag> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60000 // 60秒

/** すべてのフィーチャーフラグを取得 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase.from('feature_flags').select('*')
  if (error) {
    console.error('getAllFeatureFlags failed:', error.message)
    return []
  }
  return (data as FeatureFlag[]) || []
}

/** 特定のフラグが有効か確認 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFeatureFlags()
  const flag = flags.find((f) => f.key === key)
  if (!flag) return false

  // enabled = false なら即座に false
  if (!flag.enabled) return false

  // ロールアウト率で制御（0-100%）
  const random = Math.random() * 100
  return random <= flag.rollout_percentage
}

/** フラグを更新 */
export async function updateFeatureFlag(
  key: string,
  updates: Partial<FeatureFlag>
): Promise<boolean> {
  const { error } = await supabase
    .from('feature_flags')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (error) {
    console.error('updateFeatureFlag failed:', error.message)
    return false
  }

  // キャッシュをクリア
  flagCache = null
  return true
}

/** フェーズ別にフラグを取得 */
export async function getFlagsByPhase(phase: number): Promise<FeatureFlag[]> {
  const flags = await getAllFeatureFlags()
  return flags.filter((f) => f.phase === phase)
}
