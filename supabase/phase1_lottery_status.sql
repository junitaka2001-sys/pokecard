-- ============================================================
-- POKECARD Supabase Phase 1 - lottery_status テーブル追加
-- Supabaseダッシュボード → SQL Editor で実行する
-- ============================================================
-- 変更概要:
--   抽選ごとのステータス管理テーブルを追加。
--   ユーザーは1人（はるか）のみを想定するが、
--   将来の拡張性のため user_id カラムは保持する。
--   ステータスは全ログインユーザーが読み書き可能。
-- ============================================================

-- ============================================================
-- 1. lottery_status テーブル作成
-- ============================================================

-- ステータス値:
--   pending  = 未完了（応募前・デフォルト）
--   applied  = 完了（応募済み）
--   won      = 当選
--   lost     = 落選
--   paid     = 支払済

CREATE TABLE IF NOT EXISTS lottery_status (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id  TEXT NOT NULL REFERENCES lotteries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'applied', 'won', 'lost', 'paid')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lottery_id, user_id)
);

CREATE INDEX IF NOT EXISTS lottery_status_user_idx ON lottery_status(user_id);
CREATE INDEX IF NOT EXISTS lottery_status_lottery_idx ON lottery_status(lottery_id);

-- ============================================================
-- 2. RLS 有効化
-- ============================================================

ALTER TABLE lottery_status ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS ポリシー
-- ステータスは全ログインユーザーが読み書き可能。
-- 管理者も通常ポリシーで操作可能（別途 admin ポリシー不要）。
-- ============================================================

-- 全ログインユーザーが読み取り可
CREATE POLICY "lottery_status_authed_select" ON lottery_status
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 自分のレコードのみ INSERT 可
CREATE POLICY "lottery_status_authed_insert" ON lottery_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自分のレコードのみ UPDATE 可
CREATE POLICY "lottery_status_authed_update" ON lottery_status
  FOR UPDATE USING (auth.uid() = user_id);

-- 自分のレコードのみ DELETE 可（抽選マスタ削除時のCASCADE対策）
CREATE POLICY "lottery_status_authed_delete" ON lottery_status
  FOR DELETE USING (auth.uid() = user_id);

-- 管理者は全レコードを操作可能
CREATE POLICY "lottery_status_admin_all" ON lottery_status
  FOR ALL USING (is_admin());

-- ============================================================
-- 4. GRANT（anonymousロールとauthenticatedロールへの権限付与）
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON lottery_status TO authenticated;
GRANT SELECT ON lottery_status TO anon;

-- ============================================================
-- 完了確認クエリ
-- ============================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'lottery_status';

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'lottery_status'
ORDER BY policyname;
