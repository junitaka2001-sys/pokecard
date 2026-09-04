# STATUS.md — 現在の作業状態

このファイルはAIエージェント間の引き継ぎ用です。作業完了のたびに更新してください。

**最終更新: 2026-09-03 (抽選ステータス管理・セクション表示・応募履歴実装) / 更新者: Kiro**

---

## 現在のプロジェクト状態

| 項目 | 状態 |
|------|------|
| バージョン | **3.1.0** |
| 実装フェーズ | **抽選機能強化完了** |
| 動作確認 | PC Chrome で動作確認済み（iPhone実機確認は任意） |
| デプロイ | 未デプロイ（GitHub Pages へのデプロイで公開可能） |

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

### Supabase移行（完了）
- [x] **Phase 0完了**：Supabaseプロジェクト作成・テーブル作成・RLS設定・Anonymous Auth有効化・管理者アカウント設定
- [x] **Phase 1完了**：`js/supabase.js` 新規作成・`index.html` CDN追加・`app.js` async化
- [x] **Phase 2完了**：`js/storage.js` 読み取り系Supabase移行・localStorageキャッシュ・`app.js`/`qr.js` 非同期対応
- [x] **Phase 3完了**：`js/storage.js` 書き込み系Supabase移行（setStamps/addHistoryItem/addTicket/useTicket/markTokenUsed）

### 抽選機能強化（完了）
- [x] `lottery_status` テーブル新設（SQL: `supabase/phase1_lottery_status.sql`）
- [x] `storage.js`：`getLotteryStatuses` / `setLotteryStatus` / `getLotteriesWithStatus` メソッド追加・`LOTTERY_STATUSES` キー追加
- [x] 抽選画面を3セクション（当選 / 応募中 / 応募履歴）のプルダウン展開構成に全面変更
- [x] 各抽選カードにステータス変更ピルボタン（5種：未完了・応募済・当選・落選・支払済）追加
- [x] 管理モーダルの抽選リストにステータス変更セレクトを追加
- [x] 応募履歴モーダル新設（落選・支払済のみ表示）

---

## 現在作業中の内容

**抽選機能強化完了。**

> ⚠️ **Supabase側の作業が必要**: `supabase/phase1_lottery_status.sql` をSupabaseダッシュボードの SQL Editor で実行し、`lottery_status` テーブルを作成すること。

---

## 次に行うべき作業

### 要対応（Supabase）
- [ ] `supabase/phase1_lottery_status.sql` をSupabaseで実行（`lottery_status` テーブル作成・RLS設定）

### 残タスク
- GitHub Pages へのデプロイ（リポジトリ作成 → push → Pages設定）
- はるかの iPhone Safari での実機確認（PWAインストール含む）
- 要件定義書の残項目（スタンプポイント化・リワード廃止）の実装

---

## Supabase 設定情報（参照用）

| 項目 | 状態 |
|------|------|
| Supabaseプロジェクト | 作成済み（junitaka2001-sys's Org / POKECARD） |
| プロジェクトID | `dknmhyiqkurywtbskpnp` |
| 管理者アカウント | `junitaka2001@gmail.com`（app_metadata: `{"role":"admin"}` 設定済み） |
| Anonymous Auth | 有効化済み |
| テーブル | 7テーブル（stamp_cards / history / tickets / used_tokens / rewards / lotteries / **lottery_status**） |
| 初期リワード | 4件投入済み（reward-1〜4） |
| anon key | `supabase.js` に設定済み（`eyJ`で始まるJWT形式） |
| URL設定 | `supabase.js` に設定済み（`https://dknmhyiqkurywtbskpnp.supabase.co`） |

**注意：service_role key が誤って使用されたため、ローテーション（再生成）済み。**
**注意：`lottery_status` テーブルは `phase1_lottery_status.sql` を実行して作成する必要あり。**

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
| `supabase/phase1_lottery_status.sql` | 2026-09-03 | Kiro | `lottery_status` テーブル・RLS・GRANT定義を新規作成 |
| `js/storage.js` | 2026-09-03 | Kiro | `LOTTERY_STATUSES` キー追加、`getLotteryStatuses` / `setLotteryStatus` / `getLotteriesWithStatus` メソッド追加 |
| `js/app.js` | 2026-09-03 | Kiro | `renderLotteryList` を3セクション構成に全面変更、`LOTTERY_STATUS_CONFIG` / `STATUS_CYCLE` 定数追加、`buildLotteryCard` / `buildLotterySection` ヘルパー追加、`renderAdminLotteryList` にステータスselectを追加、`openLotteryHistoryModal` 追加 |
| `index.html` | 2026-09-03 | Kiro | 抽選画面ヘッダーに応募履歴ボタン追加、応募履歴モーダル（`lottery-history-modal`）新設 |
| `css/style.css` | 2026-09-03 | Kiro | 抽選ページヘッダー・セクション折りたたみ・ステータスピルボタン・応募履歴バッジのスタイル追加 |

**動作確認：Supabase `lottery_status` テーブル作成後に実機確認が必要（未確認）**
