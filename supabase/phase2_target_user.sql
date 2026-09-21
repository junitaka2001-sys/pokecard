-- ============================================================
-- POKECARD Supabase Phase 2 - 管理者操作対象ユーザー取得関数
-- Supabaseダッシュボード → SQL Editor で実行する
-- ============================================================
-- 目的:
--   管理者（app_metadata->>'role' = 'admin'）が操作する際、
--   「管理者以外のユーザー」のIDを取得するRPC関数。
--   これにより管理者がスタンプ操作・リセット等を行うと
--   はるか（匿名ユーザー）のデータが更新される。
--
--   スマホが変わってもUUID変わっても自動追従する。
-- ============================================================

-- ============================================================
-- 1. get_target_user_id() 関数
--    管理者以外で最も古い stamp_cards のユーザーIDを返す。
--    対象ユーザーがいない場合は NULL を返す。
--    SECURITY DEFINER で auth.users を参照可能にする。
-- ============================================================

CREATE OR REPLACE FUNCTION get_target_user_id()
RETURNS UUID AS $$
DECLARE
  target_uid UUID;
BEGIN
  -- auth.users の app_metadata に role=admin が設定されていない
  -- ユーザーの中で、stamp_cards に存在する最古のユーザーを返す。
  -- （新規匿名ユーザーが複数できた場合も最古を優先する）
  SELECT sc.user_id
  INTO target_uid
  FROM public.stamp_cards sc
  INNER JOIN auth.users u ON u.id = sc.user_id
  WHERE COALESCE(u.raw_app_meta_data->>'role', '') != 'admin'
  ORDER BY sc.updated_at ASC
  LIMIT 1;

  RETURN target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 管理者のみ呼び出し可能にする
REVOKE ALL ON FUNCTION get_target_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_target_user_id() FROM anon;
GRANT EXECUTE ON FUNCTION get_target_user_id() TO authenticated;

-- ============================================================
-- 2. 動作確認クエリ
-- ============================================================

-- 関数が存在するか確認
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_target_user_id';

-- 現在の stamp_cards の状態確認（管理者以外のレコードが返るか）
SELECT sc.user_id, sc.stamps,
       COALESCE(u.raw_app_meta_data->>'role', '(none)') AS role
FROM public.stamp_cards sc
INNER JOIN auth.users u ON u.id = sc.user_id
ORDER BY sc.updated_at ASC;
