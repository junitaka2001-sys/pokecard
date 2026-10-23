-- ============================================================
-- POKECARD Phase 4: メモ機能
-- Supabase SQL Editor で実行してください
-- ============================================================

-- notes テーブル作成
CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス（日付ソート用）
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes (created_at DESC);

-- ============================================================
-- RLS（Row Level Security）設定
-- はるか（Anonymous Auth）と管理者のみ読み書き可
-- ============================================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 許可ユーザーUUID（はるか・管理者）のみ SELECT 可
CREATE POLICY "notes_select_allowed_users" ON notes
  FOR SELECT
  USING (
    auth.uid() = 'f267ca43-40c8-431e-ae5e-1d8c35153f56'::uuid  -- 管理者（小室）
    OR auth.uid() = '8b11157e-f836-4daf-a365-f3ad880e599b'::uuid -- はるか
    -- ※ はるかがスマホ変更等でUIDが変わった場合はこのUUIDを更新してください
  );

-- 自分が書いたメモのみ INSERT 可（はるか・管理者）
CREATE POLICY "notes_insert_allowed_users" ON notes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      auth.uid() = 'f267ca43-40c8-431e-ae5e-1d8c35153f56'::uuid
      OR auth.uid() = '8b11157e-f836-4daf-a365-f3ad880e599b'::uuid
    )
  );

-- 自分が書いたメモのみ UPDATE 可
CREATE POLICY "notes_update_own" ON notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 自分が書いたメモのみ DELETE 可
CREATE POLICY "notes_delete_own" ON notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- アクセス権付与
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO anon;
