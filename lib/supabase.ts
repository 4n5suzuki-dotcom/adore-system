import { createClient } from '@supabase/supabase-js'

// NEXT_PUBLIC_* はビルド時にインライン展開される。strict 下では string | undefined のため非null表明する
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
