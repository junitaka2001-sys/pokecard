# POKECARD システム仕様書
**Ver 3.1.0** — 最終更新: 2026-09-03

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ名 | POKECARD |
| 対象 | はるか専用デジタルポイントカード |
| 動作環境 | iPhone Safari 専用（PWA対応） |
| ホスティング | 静的ファイル（サーバー不要） |

---

## 2. ファイル構成

```
pokecard/
├── index.html          メインHTML・全画面・全モーダル定義
├── manifest.json       PWAマニフェスト
├── sw.js               Service Worker（キャッシュ管理）
├── css/
│   └── style.css       全スタイル定義
├── js/
│   ├── app.js          メインロジック・画面描画・イベント
│   ├── storage.js      localStorageラッパー・全データ管理
│   ├── supabase.js     Supabase接続・認証・既存データ移行
│   ├── stamp.js        スタンプ演出・サウンド・紙吹雪エンジン
│   ├── qr.js           QRスキャン・URLパラメータ処理
│   └── jsQR.min.js     QR解析ライブラリ（ローカルバンドル）
└── images/
    ├── icons/          ロゴ・スタンプ・透かし画像
    └── rewards/        リワード画像（現在未使用・SVGアイコンに移行済み）
```

---

## 3. localStorage キー一覧

| キー | 型 | 内容 |
|------|----|------|
| `pokecard_stamps_v1` | number | 現在のスタンプ数（0〜10） |
| `pokecard_history_v1` | JSON array | ポイント獲得・交換履歴 |
| `pokecard_rewards_v1` | JSON array | リワード定義（編集可能） |
| `pokecard_active_tickets_v1` | JSON array | 保有中の特典チケット |
| `pokecard_used_tokens_v1` | JSON array | 使用済みQRトークン |
| `pokecard_stamp_angles_v1` | JSON array | スタンプマスの傾き角度 |
| `pokecard_lotteries_v1` | JSON array | 抽選情報リスト |
| `pokecard_lottery_statuses_v1` | JSON object | 抽選ステータスキャッシュ `{ [lottery_id]: status }` |

---

## 4. 画面構成

### タブナビゲーション（下部固定）
| タブ | ID | 内容 |
|------|----|------|
| ホーム | `view-home` | スタンプカード・次のリワード・チケット・QRバナー |
| リワード | `view-rewards` | リワード一覧・交換ボタン |
| 抽選 | `view-lottery` | 抽選カード一覧・応募リンク |

### モーダル一覧
| ID | 用途 |
|----|------|
| `history-modal` | ポイント履歴（履歴リンクから開く） |
| `exchange-confirm-modal` | リワード交換確認 |
| `use-ticket-modal` | チケット使用確認 |
| `qr-scan-modal` | カメラQRスキャン |
| `partner-qr-modal` | 当選QR表示（管理者用） |
| `admin-password-modal` | 管理者パスワード入力 |
| `admin-modal` | 管理＆テストモード（認証後のみ） |
| `lottery-history-modal` | 応募履歴（落選・支払済の抽選一覧） |
| `lottery-edit-modal` | 抽選追加・編集 |

---

## 5. 管理＆テストモード

### アクセス方法
1. ホーム画面の**左上歯車アイコン**をタップ
2. 端末内の管理モード認証を通過して管理モーダルを開く
3. リワード・抽選を編集する場合は、モーダル内でSupabase管理者としてログインする

### 管理モーダルの機能

#### スタンプ操作
| ボタン | 処理 |
|--------|------|
| ＋1 スタンプ付与 | スタンプ+1・演出表示 |
| 満杯（10個）設定 | スタンプを10に強制設定 |
| 当選QR発行 | ワンタイムトークン付きQR/リンク生成 |
| アプリ最新版に更新 | Service Workerキャッシュ削除+再読み込み |
| 初期化リセット | 利用者データ（スタンプ・履歴・チケット・使用済みトークン）を初期化 |

#### リワード編集
- 各リワードのタイトルと必要スタンプ数を直接編集可能
- 「保存」ボタンで `storage.js` の `updateReward()` を経由してSupabaseに反映

#### 抽選管理
- タイトル・URL・締切日の追加・編集・削除
- データはSupabaseに保存し、`pokecard_lotteries_v1` はオフライン閲覧用キャッシュとして維持
- 締切日を過ぎた抽選は「終了」表示・リンク無効化

---

## 6. スタンプ獲得フロー

```
QRコードスキャン / URLパラメータ
    ↓ qr.js: handleScannedData() / checkUrlParamsOnLoad()
storage.js: addStamp()
    ↓
stamp.js: showCelebration()  ← 簡素版（紙吹雪30枚・1.5秒）
    ↓
app.js: renderApp(true)      ← justStamped=true でバウンスアニメーション
```

---

## 7. リワード交換フロー

```
「交換する」ボタンタップ
    ↓ openExchangeModal()
交換確認モーダル表示
    ↓ confirmExchangeBtn
executeRewardExchange()
    ↓ storage.js: consumeStamps()  ← スタンプ消費・チケット発行・履歴記録
stamp.js: showRewardCelebration()  ← 豪華版（紙吹雪200枚・3秒・タップスキップ）
    ↓
renderApp() + switchTab('home')
```

---

## 8. 抽選ページ

- `storage.js` の `getLotteriesWithStatus()` からデータを取得して描画
- 抽選一覧は3セクションのプルダウン展開構成（デフォルト: 当選・応募中は展開、履歴は折りたたみ）

### セクション構成

| セクション | 対象ステータス | デフォルト |
|-----------|--------------|---------|
| 🏆 当選した抽選 | `won` | 展開 |
| 📋 応募中の抽選 | `pending` / `applied` | 展開 |
| 📜 応募履歴 | `lost` / `paid` | 折りたたみ |

### ステータス値

| 値 | 表示 | 説明 |
|----|------|------|
| `pending` | ○ 未完了 | 応募前（デフォルト） |
| `applied` | ✓ 応募済 | 応募済み |
| `won` | ★ 当選！ | 当選 |
| `lost` | ✕ 落選 | 落選 |
| `paid` | 💰 支払済 | 当選後の支払完了 |

- ステータスは各カードのピルボタンをタップして変更（全ユーザー変更可）
- 管理モーダル内の抽選リストでもセレクトボックスからステータス変更可
- 「応募する」ボタンは外部URLを別タブで開くのみ（ステータスは自動変更しない）
- 締切日 (`deadline`) が今日より前の場合: 締切に「（終了）」表示
- URLは `<a target="_blank" rel="noopener">` で外部ブラウザで開く
- 管理モーダルの「抽選管理」セクションで CRUD 操作（管理者のみ追加・編集・削除可）
- 「応募履歴」ボタンタップで `lottery-history-modal` を開く（落選・支払済の抽選のみ表示）

### 抽選データ構造
```json
{
  "id": "lot_1234567890",
  "title": "ポケカ151 抽選",
  "url": "https://example.com/lottery",
  "deadline": "2026-09-30",
  "status": "pending"
}
```

### lottery_status テーブル構成（Supabase）
```
lottery_status (
  id          UUID PRIMARY KEY,
  lottery_id  TEXT NOT NULL REFERENCES lotteries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  status      TEXT CHECK (status IN ('pending','applied','won','lost','paid')),
  updated_at  TIMESTAMPTZ,
  UNIQUE (lottery_id, user_id)
)
```
- RLS: 全認証ユーザーが読み書き可・管理者も操作可
- `getLotteriesWithStatus()` が抽選マスタとステータスを結合して返す
- ステータスが存在しない場合は `pending` として扱う

---

## 9. エフェクト仕様

| 種類 | 関数 | 紙吹雪 | 表示時間 |
|------|------|--------|----------|
| スタンプ獲得 | `showCelebration(onComplete)` | 30枚 | 1.5秒（自動） |
| リワード交換 | `showRewardCelebration(title, onComplete)` | 120+80枚 | 3秒（タップスキップ可） |

---

## 10. QRコード仕様

### スタンプ付与URLの形式
```
https://[ドメイン]/index.html?stamp=1&token=pk_[base36timestamp]
```

### 検知方法（優先順）
1. `BarcodeDetector` API（iOS 17+ / Chrome）
2. `jsQR` ライブラリ（フォールバック）
3. 画像ファイルアップロードからの読み取り

### トークンの再利用防止
- 使用済みトークンを `pokecard_used_tokens_v1` に保存
- 同一トークンの再利用はブロック・アラート表示

---

## 11. PWA設定

| 項目 | 設定 |
|------|------|
| `apple-mobile-web-app-capable` | `yes` |
| `apple-mobile-web-app-status-bar-style` | `default` |
| `theme-color` | `#F7F5EE` |
| Service Worker | `sw.js`（起動時に自動更新チェック） |

---

## 12. iPhone Safari 最適化メモ

| 対処 | 内容 |
|------|------|
| 100vh問題 | `height: 100dvh` を使用（html/body/#app-container） |
| rubber-banding | `overscroll-behavior: none` (body) + `contain` (.view-container) |
| モーダル高さ | `max-height: 85svh` |
| safe-area | `env(safe-area-inset-bottom)` を bottom-nav・modal-sheet・splash-skip-hint に適用 |
| テキスト拡大防止 | `-webkit-text-size-adjust: 100%` |
| タップ遅延 | `touch-action: manipulation` |

---

## 13. 変更履歴

| バージョン | 内容 |
|-----------|------|
| 1.0.0 | 初期リリース |
| 1.1.2 | タッチハプティクス・スムーズFX追加 |
| 1.2.0 | スプラッシュ画面・管理パスワード認証追加 |
| 1.2.1 | iPhone Safari 最適化（dvh・overscroll・svh） |
| 2.0.0 | 管理モード独立・リワード編集・抽選ページ・豪華リワードFX追加 |
| 2.1.0 | Supabase管理者ログイン、リワード・抽選CRUD・利用者データ初期化のクラウド連携 |
| 2.1.1 | 既存localStorageデータのSupabase移行時に、初期スタンプカード作成で移行がスキップされる問題を修正 |
| 3.0.0 | Supabase移行完了。Service WorkerでSupabase通信をNetwork Onlyとし、オフライン時はキャッシュ閲覧中であることを表示 |
| 3.1.0 | 抽選機能強化：`lottery_status` テーブル追加、抽選画面を3セクション構成（当選/応募中/履歴）に変更、ステータス管理UI追加、応募履歴モーダル追加 |
