-- ============================================================
-- POKECARD Supabase Phase 0 セットアップSQL
-- Supabaseダッシュボード → SQL Editor で実行する
-- ============================================================

-- ============================================================
-- 1. テーブル作成
-- ============================================================

-- スタンプカード（はるかのスタンプ数・角度）
CREATE TABLE IF NOT EXISTS stamp_cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stamps       SMALLINT NOT NULL DEFAULT 0 CHECK (stamps >= 0 AND stamps <= 10),
  stamp_angles JSONB NOT NULL DEFAULT '[]',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 履歴（スタンプ獲得・リワード交換・チケット使用）
CREATE TABLE IF NOT EXISTS history (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('stamp_add', 'reward_exchange', 'reward_use')),
  title      TEXT NOT NULL,
  amount     SMALLINT NOT NULL DEFAULT 0,
  reward_id  TEXT,
  ticket_id  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS history_user_created_idx ON history(user_id, created_at DESC);

-- 保有チケット
CREATE TABLE IF NOT EXISTS tickets (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  exchanged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 使用済みQRトークン（ユーザー単位の重複防止）
CREATE TABLE IF NOT EXISTS used_tokens (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token    TEXT NOT NULL,
  used_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

-- リワードマスタ（小室が管理・はるかに反映）
CREATE TABLE IF NOT EXISTS rewards (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  required_stamps SMALLINT NOT NULL CHECK (required_stamps >= 1 AND required_stamps <= 10),
  description     TEXT,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 抽選マスタ（小室が管理・はるかに反映）
CREATE TABLE IF NOT EXISTS lotteries (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  url        TEXT NOT NULL,
  deadline   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. 管理者判定関数
--
-- app_metadata を使用する理由：
--   user_metadata はユーザー自身が変更可能であるため、
--   認可情報（管理者権限）の格納場所として不適切。
--   app_metadata はサービスロールキーまたはダッシュボードからのみ
--   変更可能なため、管理者フラグの格納に適している。
--   （Supabase公式ドキュメント推奨）
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 3. RLS 有効化
-- ============================================================

ALTER TABLE stamp_cards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS ポリシー
-- ============================================================

-- ---- stamp_cards ----
CREATE POLICY "stamp_cards_user_select" ON stamp_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stamp_cards_user_insert" ON stamp_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stamp_cards_user_update" ON stamp_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理者は全ユーザーのスタンプを操作可能
CREATE POLICY "stamp_cards_admin_all" ON stamp_cards
  FOR ALL USING (is_admin());

-- ---- history ----
CREATE POLICY "history_user_select" ON history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "history_user_insert" ON history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理者は全ユーザーの履歴を参照・追加可能
CREATE POLICY "history_admin_all" ON history
  FOR ALL USING (is_admin());

-- ---- tickets ----
CREATE POLICY "tickets_user_select" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tickets_user_insert" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets_user_delete" ON tickets
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "tickets_admin_all" ON tickets
  FOR ALL USING (is_admin());

-- ---- used_tokens ----
CREATE POLICY "used_tokens_user_select" ON used_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "used_tokens_user_insert" ON used_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- rewards（マスタ：全員読み取り可・管理者のみ書き込み可）----
CREATE POLICY "rewards_all_select" ON rewards
  FOR SELECT USING (true);

CREATE POLICY "rewards_admin_insert" ON rewards
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "rewards_admin_update" ON rewards
  FOR UPDATE USING (is_admin());

-- DELETE は不可（チケットの reward_id が残るため意図的に未定義）

-- ---- lotteries（マスタ：全員読み取り可・管理者のみ書き込み可）----
CREATE POLICY "lotteries_all_select" ON lotteries
  FOR SELECT USING (true);

CREATE POLICY "lotteries_admin_insert" ON lotteries
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "lotteries_admin_update" ON lotteries
  FOR UPDATE USING (is_admin());

CREATE POLICY "lotteries_admin_delete" ON lotteries
  FOR DELETE USING (is_admin());

-- ============================================================
-- 5. 初期リワードデータ投入
-- （localStorageの DEFAULT_REWARDS と同じ内容）
-- ============================================================

INSERT INTO rewards (id, title, required_stamps, description, sort_order)
VALUES
  ('reward-1', '映画デート',     3,  'お好きな映画＆ポップコーンセット', 1),
  ('reward-2', '焼肉デート',     5,  '美味しいお肉をたっぷり堪能',       2),
  ('reward-3', '水族館デート',   7,  '癒やしの水族館で素敵なひととき',   3),
  ('reward-4', 'ディズニーシー', 10, '夢と魔法の冒険へご招待',           4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 完了確認クエリ（実行後に結果を確認する）
-- ============================================================

-- テーブル一覧確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- RLS有効確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ポリシー一覧確認
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 初期リワード確認
SELECT id, title, required_stamps FROM rewards ORDER BY sort_order;
