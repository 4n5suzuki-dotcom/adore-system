# Adore 面接・給与管理システム

恵比寿の完全会員制ラウンジ「Adore」向けの面接・給与管理システム。
応募者向けの面接フォーム、管理者向けのダッシュボード、採用管理機能を一体化。

## 🎯 主な機能

### 応募者向け
- **7ステップ面接フォーム** (`/interview`)
  - 基本情報、住所、出勤希望、嗜好・スキル、写真アップロード、バック規定同意、確認・送信
  - Supabase に自動保存

### 管理者向け
- **ダッシュボード** (`/admin`)
  - 今月の面接数・採用数・採用率をサマリー表示
  - 最新面接一覧（テーブル表示）
  - ステータス別集計

- **面接詳細ページ** (`/admin/interviews/[id]`)
  - 応募者の詳細情報表示
  - ステータス変更（採用/不採用）
  - メモ編集機能

- **面接編集ページ** (`/admin/interviews/[id]/edit`)
  - 応募者情報の編集・更新

## 🛠️ 技術スタック

| 項目 | 技術 |
|---|---|
| フロントエンド | Next.js 16 + TypeScript + Tailwind CSS v4 |
| バックエンド | Supabase（PostgreSQL） |
| 認証 | Supabase Auth（メール + パスワード） |
| ホスティング | Vercel |
| データ管理 | Supabase（14テーブル） |

## 📋 テーブル設計

- tenants（店舗情報）
- users（管理者ユーザー）
- interviews（面接シート）
- casts（採用済みキャスト）
- back_regulations（バック規定バージョン管理）
- その他 9 テーブル

詳細は `/lib/supabase/schema.sql` を参照

## 🚀 セットアップ手順

### 前提条件
- Node.js 18+
- npm または yarn
- Supabase プロジェクト
- GitHub アカウント

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/4n5suzuki-dotcom/adore-system.git
cd adore-system

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# 以下を編集：
# NEXT_PUBLIC_SUPABASE_URL = Supabase プロジェクト URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY = Supabase anon キー
# NEXT_PUBLIC_TENANT_ID = 店舗 UUID

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開く

### Supabase セットアップ

1. Supabase プロジェクトを作成
2. SQL Editor で `/lib/supabase/schema.sql` を実行
3. Authentication → Policies で RLS ポリシーを設定
   （`CREATE POLICY "Allow anon insert" ON interviews FOR INSERT WITH CHECK (true);`）

## 📊 デモデータ

営業プレゼン用のサンプル面接データ（10件）が含まれています。

```sql
-- Supabase SQL Editor で実行
INSERT INTO interviews (...) VALUES (...);
```

詳細は `/lib/supabase/seed_interviews.sql` を参照

## 🔐 セキュリティに関する注意

- `.env.local` には機密情報（Supabase キー）を含みます。Git に追跡させないこと（`.gitignore` で除外済み）
- 本番環境では Supabase の RLS ポリシーを厳密に設定してください
- anon キーは読み取り専用にし、管理操作には認証ユーザーキーを使用

## 📱 主要ページ一覧

| ページ | 対象 | 説明 |
|---|---|---|
| `/` | 全員 | ホーム画面 |
| `/auth/login` | 全員 | ログイン/新規登録 |
| `/interview` | 応募者 | 7ステップ面接フォーム |
| `/admin` | 管理者 | ダッシュボード |
| `/admin/interviews/[id]` | 管理者 | 面接詳細・採用判定 |
| `/admin/interviews/[id]/edit` | 管理者 | 面接情報編集 |

## 📞 サポート

問題が発生した場合は、GitHub Issues で報告してください。

## 📄 ライセンス

プライベートプロジェクト。再利用・転用禁止。

---

## 開発者向け

### ファイル構成

```
adore-system/
├── app/（フロントエンド）
│   ├── auth/
│   ├── admin/
│   ├── interview/
│   └── page.tsx（ホーム）
├── lib/
│   └── supabase/
│       ├── schema.sql（DB定義）
│       ├── types.ts（型定義）
│       ├── auth.ts（認証関数）
│       └── interviews.ts（面接関数）
├── styles/（Tailwind設定）
├── package.json
└── .env.local（環境変数）
```

### 主要関数

`lib/supabase/interviews.ts` を参照：
- `getInterviewsForMonth()` - 月別面接取得
- `getLatestInterviews()` - 最新面接取得
- `getInterviewCountByStatus()` - ステータス別集計
- `createInterview()` - 新規面接作成
- `updateInterview()` - 面接情報更新

---

**作成者**: Shingo（Web エンジニア）
**作成日**: 2026年5月
