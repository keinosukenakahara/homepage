# 手配管理システム デプロイ手順

## 概要
- フロントエンド＋バックエンド：Next.js（Vercel）
- データベース＋認証：Supabase（無料プランで運用可能）
- メール通知：Gmail（Gmailアプリパスワード使用）

---

## STEP 1: Supabase設定

1. https://supabase.com にアクセスし、無料アカウント作成
2. 「New project」でプロジェクト作成
   - Name: hanpai-system（任意）
   - Database password: 安全なパスワードを設定
   - Region: Northeast Asia (Tokyo)
3. プロジェクト作成後、「SQL Editor」を開く
4. `supabase/schema.sql` の内容をすべてコピーして実行

### 認証設定
1. Supabase管理画面 > Authentication > Settings
2. 「Site URL」に後で作成するVercelのURL（例: https://hanpai-xxx.vercel.app）を設定

### APIキーを控える
- Project Settings > API にある以下を控える：
  - `Project URL`（NEXT_PUBLIC_SUPABASE_URL）
  - `anon/public key`（NEXT_PUBLIC_SUPABASE_ANON_KEY）
  - `service_role key`（SUPABASE_SERVICE_ROLE_KEY）⚠️絶対に公開しない

---

## STEP 2: Vercelデプロイ

1. https://github.com に無料アカウント作成（既にある場合はスキップ）
2. 「hanpai-system」フォルダをGitHubリポジトリにアップロード
   - GitHub.com > 「New repository」> リポジトリ作成
   - 「Upload files」でhanpai-systemフォルダの中身をすべてアップロード
3. https://vercel.com にGitHubアカウントでログイン
4. 「New Project」> GitHubリポジトリを選択
5. 「Environment Variables」に以下を設定：

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...（Supabaseのanon key）
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...（Supabaseのservice role key）
EMAIL_FROM = noreply@gmail.com
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = your-gmail@gmail.com
EMAIL_PASS = xxxx xxxx xxxx xxxx（Gmailアプリパスワード）
NEXT_PUBLIC_APP_URL = https://hanpai-xxx.vercel.app（デプロイ後に設定）
```

6. 「Deploy」をクリック
7. デプロイ完了後、表示されるURLをコピーしてSupabaseのSite URLに設定

---

## STEP 3: Gmailアプリパスワード設定

1. Googleアカウント管理 > セキュリティ > 2段階認証をON
2. 「アプリパスワード」でアプリ名（例: 手配システム）を入力し生成
3. 生成された16文字のパスワードをVERCELの EMAIL_PASS に設定

---

## STEP 4: 初期ユーザー登録

1. Supabase管理画面 > Authentication > Users > 「Add user」
2. スーパー管理者のメール・パスワードを設定
3. SQL Editorで以下を実行（UIDはUsersページに表示されるID）：

```sql
INSERT INTO profiles (id, role, full_name, email)
VALUES ('【ユーザーUUID】', 'super_admin', '管理者氏名', 'admin@example.com');

INSERT INTO employees (profile_id, full_name, email, role)
VALUES ('【ユーザーUUID】', '管理者氏名', 'admin@example.com', 'admin');
```

4. 以降のスタッフ・社員はシステム管理画面から登録可能

---

## STEP 5: スタッフアカウント作成（管理画面から）

1. 管理画面でスタッフ情報を登録
2. Supabase管理画面 > Authentication > Users > 「Add user」でアカウント作成
3. SQL Editorで profiles と staff の紐付け：

```sql
UPDATE staff SET profile_id = '【スタッフのUUID】'
WHERE email = 'staff@example.com';

INSERT INTO profiles (id, role, full_name, email)
VALUES ('【スタッフのUUID】', 'staff', 'スタッフ氏名', 'staff@example.com');
```

> ※ 将来的にはスタッフ招待機能を実装予定

---

## システム構成

```
管理者・社員  → https://your-app.vercel.app/admin/login
スタッフ      → https://your-app.vercel.app/staff/login
```

## 注意事項

- Supabase無料プランは500MB DBまで（通常の業務では十分）
- Vercel無料プランは月100GB帯域まで（十分）
- PDFはSupabase Storageに保存（設定は別途）
- LINEとの連携はLINE Developerコンソールで設定が必要（オプション）
