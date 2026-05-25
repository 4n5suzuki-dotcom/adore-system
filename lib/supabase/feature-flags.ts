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

/** 特定のフラグが有効か確認（feature_flags を直接1件取得） */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', flagKey)
    .single()

  if (error || !data) {
    console.warn(`Feature flag "${flagKey}" not found`)
    return false
  }

  return data.enabled
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
