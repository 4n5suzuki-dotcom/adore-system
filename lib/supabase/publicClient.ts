import { createClient } from '@supabase/supabase-js'

// =====================================================================
// 公開フォーム(/interview)専用の Supabase クライアント（anon 固定）
//
// 目的:
//   管理画面とアプリ全体で共有しているシングルトン supabase クライアントは
//   セッションを localStorage に永続化する。管理者がログイン済みのブラウザで
//   公開フォームから送信すると、その authenticated セッションが引き継がれ、
//   Storage の anon INSERT ポリシーにマッチせず RLS 違反（403）になる。
//
//   このクライアントは persistSession:false / autoRefreshToken:false とし、
//   既存の管理者セッションを一切読み込まず、常に anon ロールで送信する。
//   → 応募者の書き込み（写真アップロード・interviews/interview_photos の INSERT）
//     を確実に anon で行い、anon write-only ポリシーに正しく一致させる。
//
// 注意:
//   管理画面側の認証・署名URL生成は従来どおり共有 supabase クライアントを使う
//   （こちらは authenticated セッションが必要）。本クライアントは公開フォームの
//   書き込み専用。
// =====================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
