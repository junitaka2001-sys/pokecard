/**
 * POKECARD - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let currentTab = 'home';
let selectedRewardForExchange = null;
let selectedTicketForUse = null;

function initApp() {
  setupEventListeners();
  renderApp();
  
  // URLパラメータチェック（QR読み取りからの起動）
  if (window.qrManager) {
    window.qrManager.checkUrlParamsOnLoad();
  }

  // PWA Service Worker 登録 & 強制更新チェック
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        // 起動時に毎回バックグラウンド更新をチェック
        reg.update().catch(() => {});
      }).catch(err => {
        console.log('SW registration error:', err);
      });

      // 新しいバージョンが適用されたら自動で画面をリフレッシュ
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  // ナビゲーションタブ
  const navTabs = document.querySelectorAll('.nav-tab-btn');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      switchTab(target);
    });
  });

  // 次のリワードカードタップ -> リワードタブへ
  const nextRewardCard = document.getElementById('next-reward-card');
  if (nextRewardCard) {
    nextRewardCard.addEventListener('click', () => {
      switchTab('rewards');
    });
  }

  // QRバナー -> スキャナーモーダル
  const qrBanner = document.getElementById('qr-banner-btn');
  if (qrBanner) {
    qrBanner.addEventListener('click', () => {
      if (window.qrManager) {
        window.qrManager.startCameraScanner();
      }
    });
  }

  // QR画像ファイル入力からの読み取り
  const qrFileInput = document.getElementById('qr-file-input');
  if (qrFileInput) {
    qrFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0] && window.qrManager) {
        window.qrManager.scanImageFile(e.target.files[0]);
      }
    });
  }

  // ポイント履歴リンク
  const historyLink = document.getElementById('history-link-btn');
  if (historyLink) {
    historyLink.addEventListener('click', () => {
      openHistoryModal();
    });
  }

  // モーダル閉じるボタン
  document.querySelectorAll('.modal-close-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('show');
        if (modal.id === 'qr-scan-modal' && window.qrManager) {
          window.qrManager.stopCameraScanner();
        }
      }
    });
  });

  // モーダル背景タップで閉じる
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
        if (modal.id === 'qr-scan-modal' && window.qrManager) {
          window.qrManager.stopCameraScanner();
        }
      }
    });
  });

  // 交換確認モーダルの「交換する」実行ボタン
  const confirmExchangeBtn = document.getElementById('confirm-exchange-btn');
  if (confirmExchangeBtn) {
    confirmExchangeBtn.addEventListener('click', () => {
      executeRewardExchange();
    });
  }

  // チケット使用確認モーダルの「使用する」実行ボタン
  const confirmUseTicketBtn = document.getElementById('confirm-use-ticket-btn');
  if (confirmUseTicketBtn) {
    confirmUseTicketBtn.addEventListener('click', () => {
      executeTicketUse();
    });
  }

  // 音声トグル
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      window.soundEffects.muted = !window.soundEffects.muted;
      soundBtn.style.opacity = window.soundEffects.muted ? '0.4' : '1';
    });
  }

  // テスト用・管理者メニュー機能
  setupAdminControls();
}

/**
 * タブ切り替え
 */
function switchTab(tabName) {
  currentTab = tabName;
  
  // タブボタンのアクティブ表示
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // ページの表示切り替え
  document.querySelectorAll('.view-page').forEach(page => {
    page.classList.toggle('active', page.id === `view-${tabName}`);
  });

  renderApp();
}

/**
 * 全体の描画
 */
function renderApp(justStamped = false) {
  renderStampCard(justStamped);
  renderNextReward();
  renderActiveTickets();
  renderRewardList();
}

window.renderApp = renderApp;

/**
 * 1. スタンプカードの描画
 */
function renderStampCard(justStamped = false) {
  const currentStamps = window.storageManager.getStamps();
  const angles = window.storageManager.getStampAngles();
  const grid = document.getElementById('stamp-grid');
  if (!grid) return;

  grid.innerHTML = '';

  for (let i = 0; i < 10; i++) {
    const isStamped = i < currentStamps;
    const isLatest = justStamped && i === currentStamps - 1;
    const angle = angles[i] || 0;

    const slot = document.createElement('div');
    slot.className = `stamp-slot ${isStamped ? 'stamped' : ''} ${isLatest ? 'just-stamped' : ''}`;
    slot.style.setProperty('--stamp-angle', `${angle}deg`);

    const circle = document.createElement('div');
    circle.className = 'stamp-slot-circle';

    if (isStamped) {
      const img = document.createElement('img');
      img.src = 'images/icons/stamp-red.svg';
      img.alt = 'スタンプ';
      img.className = 'stamp-img';
      circle.appendChild(img);
    }

    slot.appendChild(circle);
    grid.appendChild(slot);
  }

  // スタンプ数表示
  const currentCountEl = document.getElementById('stamp-current-count');
  if (currentCountEl) {
    currentCountEl.textContent = currentStamps;
  }
}

/**
 * 2. 「次のリワード」の描画
 */
function renderNextReward() {
  const nextInfo = window.storageManager.getNextReward();
  const titleEl = document.getElementById('next-reward-title');
  const remainEl = document.getElementById('next-reward-remain-text');
  const avatarEl = document.getElementById('next-reward-avatar-img');

  if (!nextInfo || !nextInfo.reward) return;

  if (titleEl) titleEl.textContent = nextInfo.reward.title;
  if (avatarEl) avatarEl.src = nextInfo.reward.image || 'images/icons/eevee.svg';

  if (remainEl) {
    if (nextInfo.isCompleted) {
      remainEl.innerHTML = '<span style="color: #BA9244; font-weight: 700;">すべてのリワードを交換可能です！✨</span>';
    } else {
      remainEl.innerHTML = `あと <strong>${nextInfo.remaining}</strong> スタンプで交換できます！`;
    }
  }
}

/**
 * 2.5 保有中の特典チケットの描画
 */
function renderActiveTickets() {
  const section = document.getElementById('active-tickets-section');
  const listEl = document.getElementById('active-tickets-list');
  if (!section || !listEl) return;

  const tickets = window.storageManager.getTickets();
  if (tickets.length === 0) {
    section.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  listEl.innerHTML = '';

  tickets.forEach(ticket => {
    const card = document.createElement('div');
    card.className = 'ticket-card';

    const date = new Date(ticket.exchangedDate);
    const dateStr = `${date.getMonth()+1}/${date.getDate()} 交換済み`;

    card.innerHTML = `
      <div class="ticket-thumb">
        <img src="${ticket.image}" alt="${ticket.title}">
      </div>
      <div class="ticket-body">
        <div class="ticket-title">${ticket.title}</div>
        <div class="ticket-date">${dateStr}</div>
      </div>
      <button class="ticket-use-btn" type="button">使用する</button>
    `;

    // 使用ボタン
    const useBtn = card.querySelector('.ticket-use-btn');
    useBtn.addEventListener('click', () => {
      openUseTicketModal(ticket);
    });

    listEl.appendChild(card);
  });
}

/**
 * 3. リワード一覧画面の描画
 */
function renderRewardList() {
  const listEl = document.getElementById('reward-card-list');
  if (!listEl) return;

  const currentStamps = window.storageManager.getStamps();
  const rewards = window.storageManager.getRewards();

  listEl.innerHTML = '';

  rewards.forEach(reward => {
    const card = document.createElement('div');
    card.className = 'reward-card';

    const canExchange = currentStamps >= reward.requiredStamps;

    // スタンプ進捗ドット生成
    let stampDotsHtml = '';
    for (let i = 0; i < reward.requiredStamps; i++) {
      const isFilled = i < currentStamps;
      stampDotsHtml += `<div class="reward-stamp-dot ${isFilled ? 'active' : 'inactive'}"></div>`;
    }

    card.innerHTML = `
      <div class="reward-card-thumb">
        <img src="${reward.image}" alt="${reward.title}">
      </div>
      <div class="reward-card-body">
        <div class="reward-item-title">${reward.title}</div>
        <div class="reward-stamp-progress">
          ${stampDotsHtml}
        </div>
        <div class="reward-req-text">必要スタンプ: ${reward.requiredStamps}個</div>
      </div>
      <button class="reward-exchange-btn ${canExchange ? 'can-exchange' : 'locked'}" data-reward-id="${reward.id}">
        交換する
      </button>
    `;

    // 交換ボタンクリック
    const btn = card.querySelector('.reward-exchange-btn');
    btn.addEventListener('click', () => {
      openExchangeModal(reward.id);
    });

    listEl.appendChild(card);
  });
}

/**
 * リワード交換モーダルを開く
 */
function openExchangeModal(rewardId) {
  const reward = window.storageManager.getRewardById(rewardId);
  if (!reward) return;

  const currentStamps = window.storageManager.getStamps();
  if (currentStamps < reward.requiredStamps) {
    alert(`スタンプが足りません（必要: ${reward.requiredStamps}個 / 現在: ${currentStamps}個）\nスタンプを貯めて交換しよう！`);
    return;
  }

  selectedRewardForExchange = reward;

  const modal = document.getElementById('exchange-confirm-modal');
  const imgEl = document.getElementById('exchange-preview-img');
  const titleEl = document.getElementById('exchange-reward-title');
  const descEl = document.getElementById('exchange-reward-desc');

  if (imgEl) imgEl.src = reward.image;
  if (titleEl) titleEl.textContent = `「${reward.title}」と交換しますか？`;
  if (descEl) {
    descEl.innerHTML = `スタンプを <strong>${reward.requiredStamps}個</strong> 消費して特典と交換します。<br>交換後は履歴に保存されます。`;
  }

  if (modal) modal.classList.add('show');
}

/**
 * リワード交換の実行
 */
function executeRewardExchange() {
  if (!selectedRewardForExchange) return;

  const modal = document.getElementById('exchange-confirm-modal');
  if (modal) modal.classList.remove('show');

  const res = window.storageManager.consumeStamps(selectedRewardForExchange.id);
  if (res.success) {
    window.soundEffects.playSuccessChime();
    alert(`🎉「${selectedRewardForExchange.title}」の特典チケットを獲得しました！\nホーム画面の「獲得した特典チケット」からいつでも使用できます！✨`);
    renderApp();
    switchTab('home');
  } else {
    alert(res.message);
  }

  selectedRewardForExchange = null;
}

/**
 * ポイント履歴モーダルを開く
 */
function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  const listEl = document.getElementById('history-items-list');
  if (!modal || !listEl) return;

  const history = window.storageManager.getHistory();
  listEl.innerHTML = '';

  if (history.length === 0) {
    listEl.innerHTML = '<div class="history-empty">まだ履歴がありません</div>';
  } else {
    history.forEach(item => {
      const date = new Date(item.date);
      const dateStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
      
      let badgeHtml = '';
      if (item.type === 'reward_use') {
        badgeHtml = '<div class="history-item-badge used">使用済</div>';
      } else if (item.amount > 0) {
        badgeHtml = `<div class="history-item-badge plus">+${item.amount}</div>`;
      } else {
        badgeHtml = `<div class="history-item-badge minus">${item.amount}</div>`;
      }

      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="history-item-left">
          <div class="history-item-label">${item.title}</div>
          <div class="history-item-date">${dateStr}</div>
        </div>
        ${badgeHtml}
      `;
      listEl.appendChild(div);
    });
  }

  modal.classList.add('show');
}

/**
 * 管理・テスト機能（開発・検証・配布用）
 */
function setupAdminControls() {
  // +1 スタンプ追加テストボタン
  const addBtn = document.getElementById('admin-add-stamp-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const res = window.storageManager.addStamp('テストスタンプ付与');
      if (res.success) {
        window.showCelebration(() => {
          renderApp(true);
        });
      } else {
        alert(res.message);
      }
    });
  }

  // スタンプ満杯（10個）テスト
  const fullBtn = document.getElementById('admin-full-stamp-btn');
  if (fullBtn) {
    fullBtn.addEventListener('click', () => {
      window.storageManager.setStamps(10);
      window.storageManager.addHistoryItem({
        id: 'hist-' + Date.now(),
        type: 'stamp_add',
        title: 'テスト（10個満杯設定）',
        amount: 10,
        date: new Date().toISOString()
      });
      renderApp();
      alert('スタンプを10個に設定しました！');
    });
  }

  // アプリ手動更新（キャッシュパージ & 再読み込み）
  const updateAppBtn = document.getElementById('admin-update-app-btn');
  if (updateAppBtn) {
    updateAppBtn.addEventListener('click', async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) { await r.update(); }
      }
      window.location.reload(true);
    });
  }

  // QRコード表示（パートナー用）
  const showQrBtn = document.getElementById('admin-generate-qr-btn');
  if (showQrBtn) {
    showQrBtn.addEventListener('click', () => {
      const qrUrl = window.qrManager.getDistributionUrl();
      const qrModal = document.getElementById('partner-qr-modal');
      const qrImg = document.getElementById('partner-qr-img');
      const qrLink = document.getElementById('partner-qr-link');
      
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;
      }
      if (qrLink) {
        qrLink.value = qrUrl;
      }
      if (qrModal) {
        qrModal.classList.add('show');
      }
    });
  }

  // QRリンクコピー
  const copyBtn = document.getElementById('copy-qr-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const qrLink = document.getElementById('partner-qr-link');
      if (qrLink) {
        qrLink.select();
        navigator.clipboard.writeText(qrLink.value);
        alert('当選付与リンクをコピーしました！\nLINEなどで送信できます。');
      }
    });
  }

  // データ初期化
  const resetBtn = document.getElementById('admin-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('すべてのスタンプ・履歴データを初期状態にリセットしますか？')) {
        window.storageManager.resetAll();
        renderApp();
        alert('データを初期化しました。');
      }
    });
  }
}
