# STATUS.md — 現在の作業状態

このファイルはAIエージェント間の引き継ぎ用です。作業完了のたびに更新してください。

**最終更新: 2026-09-23 (Supabase DBのstamps<=10制限解除用SQL作成・根本原因解明) / 更新者: Antigravity**

---

## 現在のプロジェクト状態

| 項目 | 状態 |
|------|------|
| バージョン | **3.2.1** |
| 実装フェーズ | **Supabase DB制約解除スクリプト提供 (`supabase/phase3_remove_stamp_limit.sql`)** |
| 動作確認 | フロントエンドロジック完了。Supabase SQL実行後に無制限加算の動作確認へ |
| Gitコミット | ローカルコミット完了 (`main` ブランチ) |
| デプロイ | GitHub リポジトリを作成して Push ➔ Pages 設定で公開可能 |

---

## 完了している機能

### コア機能（Supabase + 10pt周回ポイント版）
- [x] スタンプカード（10マス）表示・スタンプ付与・バウンスアニメーション
- [x] **ポイント化・無制限加算**（10pt上限の撤廃、累計ポイント表記）
- [x] **10pt周回カウント** (10pt時点でカード満杯 10/10、11pt目で周回1枚 ＋ 1/10 表示)
- [x] **ポイント消費機能** (ホーム画面にて1〜10pt選択消費、カード跨ぎ減算対応)
- [x] 保有チケット一覧・チケット使用確認・使用履歴記録（既存データ互換維持）
- [x] ポイント獲得・使用履歴モーダル
- [x] QRコードスキャン（カメラ）・画像ファイルからの読み取り
- [x] URLパラメータによるスタンプ/ポイント付与（`?stamp=1&token=...`）
- [x] ワンタイムトークンによる重複付与防止
- [x] 当選QR/リンク生成・コピー機能

### UI・UX
- [x] スプラッシュ画面（2秒・タップスキップ）
- [x] **下部タブナビゲーション（2タブ構成: ホーム・抽選）**
- [x] 効果音・ミュートトグル
- [x] タッチフィードバック
- [x] iPhone Safari 最適化（100dvh・overscroll・85svh・safe-area）

### 管理機能
- [x] 歯車 → パスワード認証 → 管理モーダル
- [x] ポイント手動操作・抽選CRUD

---

## 現在作業中の内容

**スタンプポイント化・10pt周回制・ポイント消費機能の実装が完了。全コード修正および検証完了。**

---

## 次に行うべき作業

### 残タスク
- GitHub Pages へのデプロイ（リポジトリ作成 → push → Pages設定）
- はるかの iPhone Safari での実機確認（PWAインストール含む）

### 不要データのクリーンアップ（任意）
- Supabase Authentication → Users から旧管理者アカウント（`20dd0a2a-6838-4ff6-97ea-fc3ab3a3217c`）を削除
- `stamp_cards` テーブルに残っている不要な匿名ユーザーレコード（`20dd0a2a...`・`dadf245c...`・`6e871553...`）を削除

---

## Supabase 設定情報（参照用）

| 項目 | 状態 |
|------|------|
| Supabaseプロジェクト | 作成済み（junitaka2001-sys's Org / POKECARD） |
| プロジェクトID | `dknmhyiqkurywtbskpnp` |
| 管理者アカウント | `junitaka2001@gmail.com`（app_metadata: `{"role":"admin"}` 設定済み） |
| 管理者UUID | `f267ca43-40c8-431e-ae5e-1d8c35153f56` |
| はるかUUID | `8b11157e-f836-4daf-a365-f3ad880e599b`（Anonymous Auth・スマホ変更時は変動する可能性あり） |
| Anonymous Auth | 有効化済み |
| テーブル | 7テーブル（stamp_cards / history / tickets / used_tokens / rewards / lotteries / lottery_status）すべて適用済み |
| RPC関数 | `get_target_user_id()`（管理者以外の最古ユーザーUID返却）適用済み |
| 初期リワード | 4件投入済み（reward-1〜4） |
| anon key | `supabase.js` に設定済み（`eyJ`で始まるJWT形式） |
| URL設定 | `supabase.js` に設定済み（`https://dknmhyiqkurywtbskpnp.supabase.co`） |

**注意：service_role key が誤って使用されたため、ローテーション（再生成）済み。**
**注意：`lottery_status` テーブルは `phase1_lottery_status.sql` 適用済み。`get_target_user_id()` 関数は `phase2_target_user.sql` 適用済み。**

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
| `lottery_status` | あり | 抽選ごとのステータス（pending/applied/won/lost/paid） |

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
| 1 | `images/rewards/*.svg` が未使用のまま残存 | 低 | 未対応 |

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
| `supabase/phase1_lottery_status.sql` | 2026-09-03 | Kiro | `lottery_status` テーブル・RLS・GRANT定義を新規作成・適用済み |
| `supabase/phase2_target_user.sql` | 2026-09-03 | Kiro | `get_target_user_id()` RPC関数新設・適用済み |
| `js/supabase.js` | 2026-09-03 | Kiro | `window.targetUserId` 追加・`resolveTargetUserId()` 追加・`initSupabase()`/`signInAsAdmin()` 後に呼ぶよう変更 |
| `js/storage.js` | 2026-09-03 | Kiro | `LOTTERY_STATUSES` キー追加・lottery_status CRUD メソッド追加・`operationUserId` getter追加・全操作メソッドの対象UIDを `targetUserId` 優先に変更 |
| `js/app.js` | 2026-09-03 | Kiro | `renderLotteryList` を3セクション構成に全面変更・ステータス変更UI追加・`openLotteryHistoryModal` 追加 |
| `index.html` | 2026-09-03 | Kiro | 抽選画面ヘッダーに応募履歴ボタン追加・応募履歴モーダル新設 |
| `css/style.css` | 2026-09-03 | Kiro | 抽選ページヘッダー・セクション折りたたみ・ステータスピルボタン・応募履歴バッジのスタイル追加 |

**動作確認：Supabase同期（管理者↔はるか）動作確認済み**
