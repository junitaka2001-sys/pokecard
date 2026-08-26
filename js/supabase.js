/**
 * POKECARD - Supabase Client & Auth Module
 * Phase 1: 認証レイヤー・localStorage移行処理
 */

// ============================================================
// Supabase 設定
// anon key はクライアント公開を想定した公開キー（Supabase仕様）
// service_role key は絶対にここに書かない
// ============================================================
const SUPABASE_URL = 'https://dknmhyiqkurywtbskpnp.supabase.co';   // 例: https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrbm1oeWlxa3VyeXd0YnNrcG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNTI0MDQsImV4cCI6MjEwMjkyODQwNH0.gOJhU4XaquuYgKHga5HA7yUf71N3p3rpFUUKusgw-5o';  // Supabaseダッシュボード → Settings → API

const MIGRATION_FLAG_KEY = 'pokecard_migrated_to_supabase';

// グローバル公開：storage.js・app.js から参照する
window.supabaseClient = null;
window.currentUserId = null;
window.currentUserIsAdmin = false;

/**
 * Supabase初期化・認証エントリポイント
 * app.js の initApp() から await で呼ぶ
 */
async function initSupabase() {
  // Supabase JS Client が読み込まれていない場合はスキップ（オフライン等）
  if (typeof supabase === 'undefined') {
    console.warn('Supabase client not loaded. Running in localStorage-only mode.');
    return;
  }

  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 既存セッションの復元を試みる
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();

    if (error) {
      console.warn('Session restore error:', error.message);
    }

    if (session?.user) {
      // セッションあり → そのまま使用
      window.currentUserId = session.user.id;
      window.currentUserIsAdmin = session.user.app_metadata?.role === 'admin';
      console.log('Session restored:', window.currentUserId);
    } else {
      // セッションなし → Anonymous Auth でサインイン
      await signInAnonymously();
    }

    // localStorageデータの移行チェック（初回のみ）
    if (window.currentUserId) {
      await migrateLegacyDataIfNeeded();
    }

  } catch (err) {
    console.error('initSupabase error:', err);
    // 初期化失敗時はlocalStorageモードで続行
  }
}

/**
 * Anonymous Auth でサインイン
 */
async function signInAnonymously() {
  const { data, error } = await window.supabaseClient.auth.signInAnonymously();

  if (error) {
    console.error('Anonymous sign-in failed:', error.message);
    return;
  }

  window.currentUserId = data.user.id;
  window.currentUserIsAdmin = false;
  console.log('Anonymous user created:', window.currentUserId);

  // stamp_cards の初期レコードを作成
  await initStampCard(window.currentUserId);
}

/**
 * 初回ユーザー用のstamp_cards初期レコード作成
 */
async function initStampCard(userId) {
  // 既存レコードがあれば何もしない
  const { data: existing } = await window.supabaseClient
    .from('stamp_cards')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return;

  // スタンプ角度をランダム生成（storage.jsのinitAngles相当）
  const angles = Array.from({ length: 10 }, () =>
    parseFloat((Math.random() * 14 - 7).toFixed(1))
  );

  // localStorageの既存スタンプ数があれば引き継ぐ（移行前の初回対応）
  const localStamps = parseInt(localStorage.getItem('pokecard_stamps_v1') || '0', 10);
  const stamps = (localStamps > 0 && localStamps <= 10) ? localStamps : 3;

  const { error } = await window.supabaseClient
    .from('stamp_cards')
    .insert({
      user_id: userId,
      stamps: stamps,
      stamp_angles: angles,
    });

  if (error) {
    console.error('initStampCard error:', error.message);
  }
}

/**
 * 管理者としてメール+パスワードでサインイン
 * app.js の管理モードから呼ぶ
 * @param {string} email
 * @param {string} password
 * @returns {{ success: boolean, message: string }}
 */
async function signInAsAdmin(email, password) {
  if (!window.supabaseClient) {
    return { success: false, message: 'Supabaseに接続できません' };
  }

  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Admin sign-in failed:', error.message);
    return { success: false, message: 'メールアドレスまたはパスワードが違います' };
  }

  window.currentUserId = data.user.id;

  // app_metadata.role が admin か確認
  const role = data.user.app_metadata?.role;
  if (role !== 'admin') {
    // 管理者権限なし → サインアウトして拒否
    await window.supabaseClient.auth.signOut();
    window.currentUserId = null;
    window.currentUserIsAdmin = false;
    return { success: false, message: '管理者権限がありません' };
  }

  window.currentUserIsAdmin = true;
  return { success: true, message: '管理者としてログインしました' };
}

/**
 * 現在のユーザーが管理者かどうかを確認
 * @returns {boolean}
 */
function isAdminUser() {
  return window.currentUserIsAdmin === true;
}

window.signInAsAdmin = signInAsAdmin;
window.isAdminUser = isAdminUser;

// ============================================================
// Magic Link（メール登録・アカウント昇格）
// ============================================================

/**
 * はるかのMagic Link登録：匿名アカウントをメールアカウントに昇格
 * @param {string} email
 * @returns {{ success: boolean, message: string }}
 */
async function linkEmailToAnonymousUser(email) {
  if (!window.supabaseClient) {
    return { success: false, message: 'Supabaseに接続できません' };
  }

  const { error } = await window.supabaseClient.auth.updateUser({ email });

  if (error) {
    console.error('linkEmail error:', error.message);
    return { success: false, message: 'メールアドレスの登録に失敗しました' };
  }

  return { success: true, message: '確認メールを送りました。メール内のリンクをタップしてください。' };
}

window.linkEmailToAnonymousUser = linkEmailToAnonymousUser;

// ============================================================
// localStorage → Supabase 移行処理
// ============================================================

/**
 * 既存localStorageデータをSupabaseへ移行する（初回のみ）
 * - 移行済みフラグがあればスキップ
 * - 失敗時はフラグを保存せず次回再試行
 * - localStorageは移行後も削除しない（キャッシュとして残す）
 */
async function migrateLegacyDataIfNeeded() {
  // 移行済みチェック
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;

  // localStorageにデータが存在するかチェック
  const localStamps = localStorage.getItem('pokecard_stamps_v1');
  if (localStamps === null) {
    // 新規ユーザー：移行不要なのでフラグだけ立てる
    localStorage.setItem(MIGRATION_FLAG_KEY, 'v1');
    return;
  }

  console.log('Starting legacy data migration...');

  try {
    // stamp_cards に既にデータがあるかチェック（Supabaseが正の場合はスキップ）
    const { data: existing } = await window.supabaseClient
      .from('stamp_cards')
      .select('id')
      .eq('user_id', window.currentUserId)
      .maybeSingle();

    // stamp_cardsが既に存在する場合、Supabaseにデータがあるので移行スキップ
    if (existing) {
      console.log('Supabase data already exists. Skipping migration.');
      localStorage.setItem(MIGRATION_FLAG_KEY, 'v1');
      return;
    }

    // ---- a. stamp_cards ----
    const stamps = parseInt(localStamps, 10) || 3;
    let angles = [0,0,0,0,0,0,0,0,0,0];
    try {
      const raw = localStorage.getItem('pokecard_stamp_angles_v1');
      if (raw) angles = JSON.parse(raw);
    } catch {}

    const { error: stampErr } = await window.supabaseClient
      .from('stamp_cards')
      .upsert({
        user_id: window.currentUserId,
        stamps,
        stamp_angles: angles,
      }, { onConflict: 'user_id' });

    if (stampErr) throw new Error('stamp_cards: ' + stampErr.message);

    // ---- b. rewards（DEFAULT_REWARDSと違う場合のみ）----
    try {
      const localRewards = JSON.parse(localStorage.getItem('pokecard_rewards_v1') || '[]');
      if (localRewards.length > 0) {
        const rewardRows = localRewards.map((r, i) => ({
          id: r.id,
          title: r.title,
          required_stamps: r.requiredStamps,
          description: r.description || null,
          sort_order: i + 1,
        }));
        await window.supabaseClient
          .from('rewards')
          .upsert(rewardRows, { onConflict: 'id' });
        // rewards はRLSで管理者のみINSERT可だが、
        // 移行時は既にPhase0でデータが入っているためupsertは実質UPDATE
        // エラーが出ても移行全体は止めない（マスタデータなので）
      }
    } catch (e) {
      console.warn('rewards migration skipped:', e.message);
    }

    // ---- c. lotteries ----
    try {
      const localLotteries = JSON.parse(localStorage.getItem('pokecard_lotteries_v1') || '[]');
      if (localLotteries.length > 0) {
        const lotteryRows = localLotteries.map(l => ({
          id: l.id,
          title: l.title,
          url: l.url,
          deadline: l.deadline || null,
        }));
        await window.supabaseClient
          .from('lotteries')
          .upsert(lotteryRows, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('lotteries migration skipped:', e.message);
    }

    // ---- d. history ----
    try {
      const localHistory = JSON.parse(localStorage.getItem('pokecard_history_v1') || '[]');
      if (localHistory.length > 0) {
        const histRows = localHistory.map(h => ({
          id: h.id,
          user_id: window.currentUserId,
          type: h.type,
          title: h.title,
          amount: h.amount || 0,
          reward_id: h.rewardId || null,
          ticket_id: h.ticketId || null,
          created_at: h.date,
        }));
        await window.supabaseClient
          .from('history')
          .upsert(histRows, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('history migration skipped:', e.message);
    }

    // ---- e. tickets ----
    try {
      const localTickets = JSON.parse(localStorage.getItem('pokecard_active_tickets_v1') || '[]');
      if (localTickets.length > 0) {
        const ticketRows = localTickets.map(t => ({
          id: t.id,
          user_id: window.currentUserId,
          reward_id: t.rewardId,
          title: t.title,
          description: t.description || null,
          exchanged_at: t.exchangedDate,
        }));
        await window.supabaseClient
          .from('tickets')
          .upsert(ticketRows, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('tickets migration skipped:', e.message);
    }

    // ---- f. used_tokens ----
    try {
      const localTokens = JSON.parse(localStorage.getItem('pokecard_used_tokens_v1') || '[]');
      if (localTokens.length > 0) {
        const tokenRows = localTokens.map(token => ({
          user_id: window.currentUserId,
          token,
        }));
        await window.supabaseClient
          .from('used_tokens')
          .upsert(tokenRows, { onConflict: 'user_id, token' });
      }
    } catch (e) {
      console.warn('used_tokens migration skipped:', e.message);
    }

    // 全て成功 → 移行済みフラグを保存
    localStorage.setItem(MIGRATION_FLAG_KEY, 'v1');
    console.log('Legacy data migration completed.');

  } catch (err) {
    // 移行失敗：フラグを保存しない・localStorageは削除しない
    console.error('Migration failed. Will retry next launch.', err.message);
  }
}
