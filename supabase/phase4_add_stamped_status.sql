-- ============================================================
-- POKECARD Supabase Phase 4 - lottery_status に 'stamped' ステータスを追加
-- Supabaseダッシュボード → SQL Editor で実行する
-- ============================================================

-- 既存の CHECK 制約を削除
ALTER TABLE lottery_status DROP CONSTRAINT IF EXISTS lottery_status_status_check;

-- 新しい CHECK 制約を追加 ('stamped' を追加)
ALTER TABLE lottery_status ADD CONSTRAINT lottery_status_status_check
  CHECK (status IN ('pending', 'applied', 'stamped', 'won', 'lost', 'paid'));

-- 完了確認
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'lottery_status' AND c.contype = 'c';
