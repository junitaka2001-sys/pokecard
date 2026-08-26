# STATUS.md — 現在の作業状態

このファイルはAIエージェント間の引き継ぎ用です。作業完了のたびに更新してください。

**最終更新: 2026-08-26 (Phase 4実装完了) / 更新者: Codex**

---

## 現在のプロジェクト状態

| 項目 | 状態 |
|------|------|
| バージョン | **2.1.0**（Supabase移行完了時に3.0.0へ） |
| 実装フェーズ | **Supabase移行 Phase 4実装完了・Phase 5待ち** |
| 動作確認 | 実機未確認 |
| デプロイ | 未デプロイ（ローカルファイルのみ） |

---

## 完了している機能

### コア機能（localStorage版・動作済み）
- [x] スタンプカード（10マス）表示・スタンプ付与・バウンスアニメーション
- [x] リワード一覧・交換確認モーダル・スタンプ消費・チケット発行
- [x] 保有チケット一覧・チケット使用確認・使用履歴記録
- [x] ポイント獲得・交換履歴モーダル
- [x] QRコードスキャン（カメラ）・画像ファイルからの読み取り
- [x] URLパラメータによるスタンプ付与（`?stamp=1&token=...`）
- [x] ワンタイムトークンによる重複付与防止
- [x] 当選QR/リンク生成・コピー機能

### UI・UX
- [x] スプラッシュ画面（2秒・タップスキップ）
- [x] 下部タブナビゲーション（ホーム・リワード・抽選）
- [x] 効果音・ミュートトグル
- [x] タッチフィードバック
- [x] iPhone Safari 最適化（100dvh・overscroll・85svh・safe-area）
- [x] リワードランク別アイコン（銅・銀・金・王冠）

### 管理機能（localStorage版）
- [x] 歯車 → パスワード認証 → 管理モーダル
- [x] スタンプ操作・リワード編集・抽選CRUD

### Supabase移行（進行中）
- [x] **Phase 0完了**：Supabaseプロジェクト作成・テーブル作成・RLS設定・Anonymous Auth有効化・管理者アカウント設定
- [x] **Phase 1完了**：`js/supabase.js` 新規作成・`index.html` CDN追加・`app.js` async化
- [x] **Phase 2完了**：`js/storage.js` 読み取り系Supabase移行・localStorageキャッシュ・`app.js`/`qr.js` 非同期対応
- [x] **Phase 3完了**：`js/storage.js` 書き込み系Supabase移行（setStamps/addHistoryItem/addTicket/useTicket/markTokenUsed）

---

## 現在作業中の内容

**Phase 4 のコード実装が完了。Phase 5（既存データ移行の確認）が次のタスク。**

管理モーダル内にSupabase管理者ログイン欄を追加。リワード編集・抽選CRUDは管理者セッションがある場合のみSupabaseへ反映し、失敗時はlocalStorageキャッシュを変更しない。初期化は利用者データのみをクラウドとローカルで初期化する。

---

## 次に行うべき作業

### Supabase移行フェーズ（Phase 4から再開）

#### Phase 3（storage.js 書き込み系）✅完了
- [x] `addStamp()` → 内部の `setStamps()` + `addHistoryItem()` 経由でSupabase反映
- [x] `consumeStamps()` → 内部の `setStamps()` + `addTicket()` + `addHistoryItem()` 経由でSupabase反映
- [x] `useTicket()` → Supabase DELETE(tickets) + `addHistoryItem()` 経由でINSERT(history)
- [x] `markTokenUsed()` → Supabase INSERT(used_tokens)
- [x] `setStamps()` → Supabase UPDATE(stamp_cards)
- [x] `addTicket()` → Supabase INSERT(tickets)
- [x] `addHistoryItem()` → Supabase INSERT(history)
- [x] `qr.js` の `handleScannedData()` / `checkUrlParamsOnLoad()` → Phase 2で async 化済み

#### Phase 4（管理者機能の移行）✅コード実装完了
- [x] 管理モードに「管理者ログイン」ボタン追加（`signInAsAdmin()` を呼ぶ）
- [x] `updateReward()` → Supabase UPDATE(rewards)
- [x] `addLottery()` / `updateLottery()` / `deleteLottery()` → Supabase CRUD
- [x] `resetAll()` のSupabase対応
- [x] `app.js` の管理系関数を async 化
- [ ] Supabase SQL Editorで `used_tokens_user_delete` ポリシーを本番プロジェクトへ適用

#### Phase 5（localStorage移行処理の確認）
- [ ] `migrateLegacyData()` の動作テスト（既にsupabase.jsに実装済み）
- [ ] Supabaseダッシュボードで移行後データ確認

#### Phase 6（sw.js 調整・仕上げ）
- [ ] `sw.js` に `supabase.js` 追加・`*.supabase.co` を Network Only 設定
- [ ] `CACHE_NAME` を `'pokecard-v3.0.0'` に更新
- [ ] オフライン時のエラー表示実装
- [ ] バージョンバッジを `Ver 3.0.0` に更新・`SPEC.md` 変更履歴追記

#### Phase 7（実機確認）
- [ ] はるかの iPhone Safari で全操作確認
- [ ] 小室の端末で管理者操作全確認
- [ ] QR発行 → はるかが読み取り → Supabase反映確認
- [ ] リワード編集 → はるかの画面に反映確認

---

## Supabase 設定情報（参照用）

| 項目 | 状態 |
|------|------|
| Supabaseプロジェクト | 作成済み（junitaka2001-sys's Org / POKECARD） |
| プロジェクトID | `dknmhyiqkurywtbskpnp` |
| 管理者アカウント | `junitaka2001@gmail.com`（app_metadata: `{"role":"admin"}` 設定済み） |
| Anonymous Auth | 有効化済み |
| テーブル | 6テーブル作成済み（stamp_cards / history / tickets / used_tokens / rewards / lotteries） |
| 初期リワード | 4件投入済み（reward-1〜4） |
| anon key | `supabase.js` に設定済み（`eyJ`で始まるJWT形式） |
| URL設定 | `supabase.js` に設定済み（`https://dknmhyiqkurywtbskpnp.supabase.co`） |

**注意：service_role key が誤って使用されたため、ローテーション（再生成）済み。**

---

## Supabase移行 設計（確定版）

### ユーザー構成

| ユーザー | 役割 | 認証方式 |
|---------|------|---------|
| はるか | 利用者 | Anonymous Auth（操作不要） + 初回1回Magic Linkでメール登録 |
| 小室 | 管理者 | メール＋パスワードでSupabase Auth サインイン（初回1回のみ） |

### アーキテクチャ

```
GitHub Pages（静的配信・変化なし）
    ↓
POKECARD (Vanilla JS + HTML/CSS)
    ├─ window.storageManager.*()  ← APIシグネチャ維持
    │       ├─ オンライン：Supabase API（正）
    │       │     └─ 成功後 localStorage にもキャッシュ
    │       └─ オフライン：localStorage 読み取り専用
    └─ Supabase JS Client (CDN)
            └─ Supabase（クラウド）
                    ├─ Auth（Anonymous Auth + Magic Link）
                    └─ PostgreSQL（RLS有効）
```

### テーブル構成

| テーブル | user_id | 用途 |
|---------|---------|------|
| `stamp_cards` | あり | スタンプ数・角度 |
| `history` | あり | 獲得・交換・使用履歴 |
| `tickets` | あり | 保有チケット |
| `used_tokens` | あり | 使用済みQRトークン（ユーザー単位） |
| `rewards` | なし（マスタ） | 小室が編集→はるかに反映 |
| `lotteries` | なし（マスタ） | 小室が編集→はるかに反映 |

### 管理者権限

- `app_metadata: {"role": "admin"}` で管理者判定（`is_admin()` 関数）
- `user_metadata` は**不使用**（ユーザー自身が変更可能なため認可情報に不適切）
- `rewards` / `lotteries` の書き込みは `is_admin()=true` のみ許可

### UID消滅対策（Magic Link昇格）

```
初回起動: Anonymous Auth → メールアドレス登録促す → linkIdentity()で昇格
UID消滅時: 新規匿名UID → 「以前のデータを復元」→ メール入力 → Magic Linkで復元
```

---

## 未解決の問題・既知の不具合

| # | 問題 | 影響度 | 状態 |
|---|------|--------|------|
| 1 | `sw.js` の `CACHE_NAME` が `'pokecard-v1.1.2'` のまま | 中 | Phase 6で対応 |
| 2 | 実機動作未確認（Ver 2.0.0 + Supabase移行中） | 高 | Phase 7で確認 |
| 3 | `images/rewards/*.svg` が未使用のまま残存 | 低 | 未対応 |
| 4 | `used_tokens` のDELETEポリシーを本番Supabaseへ適用する必要がある | 中 | `supabase/phase0_setup.sql` に追記済み |

---

## 今後注意すべき事項

### Supabaseキー管理
- `js/supabase.js` に anon key を直書き（GitHub公開リポジトリの場合は許容範囲）
- **service_role key は絶対にクライアントに置かない**（今回誤って設定したためローテーション済み）
- anon key はSupabase仕様上クライアント公開を想定。RLSで保護

### storage.jsの移行方針
- `window.storageManager` の公開APIシグネチャは維持（app.js・qr.jsへの変更を最小化）
- 全メソッドが async になるため、呼び出し側も async/await が必要
- オフライン時は localStorage キャッシュから読み取り（書き込みはエラー表示）
- Realtime・オフライン書き込みキューは実装しない

### ランクアイコンの仕様
- ランクは `requiredStamps` の値で動的に決定（`getRewardRank()` 関数、`app.js` 内）
- ランク境界値：3以下=銅、5〜6=銀、7〜9=金、10=王冠

---

## ファイル変更履歴（直近セッション）

| ファイル | 変更日 | 変更者 | 概要 |
|----------|--------|--------|------|
| `js/supabase.js` | 2026-08-26 | Codex | 管理者ロールをセッション復元時・ログイン時に明示的に保持するよう修正。 |
| `js/storage.js` | 2026-08-26 | Codex | リワード・抽選CRUDと利用者データ初期化にSupabase連携を追加。 |
| `index.html` / `css/style.css` / `js/app.js` | 2026-08-26 | Codex | 管理者ログインUI、保存失敗表示、非同期初期化を追加。 |
| `supabase/phase0_setup.sql` | 2026-08-26 | Codex | 使用済みトークンの利用者DELETEポリシーを追加。 |

**実機確認：未実施（Phase 7で実施予定）**
