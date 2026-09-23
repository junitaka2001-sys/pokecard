-- ============================================================
-- POKECARD Supabase Migration: スタンプ上限 (stamps <= 10) 解除SQL
-- Supabaseダッシュボード → SQL Editor で実行してください
-- ============================================================

-- 既存の CHECK (stamps >= 0 AND stamps <= 10) 制約を解除
ALTER TABLE stamp_cards DROP CONSTRAINT IF EXISTS stamp_cards_stamps_check;

-- 新しく 0 以上のみを許可する CHECK 制約を追加
ALTER TABLE stamp_cards ADD CONSTRAINT stamp_cards_stamps_check CHECK (stamps >= 0);
