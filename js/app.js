/**
 * POKECARD - Main Application Logic
 * Ver 2.0.0 (Admin Panel, Reward Edit, Lottery Page, Reward FX)
 */

document.addEventListener('DOMContentLoaded', () => {
  // iOS Safari で :active 擬似クラスを有効化する必須トリガー
  document.addEventListener('touchstart', () => {}, { passive: true });
  initSplash();
});

/**
 * オープニングスプラッシュ演出（約2秒後にホームへ移行）
 */
function initSplash() {
  const splash = document.getElementById('app-splash-screen');
  if (!splash) {
    initApp();
    return;
  }

  const SPLASH_DURATION = 2000;

  const skipHandler = () => dismissSplash(splash);
  splash.addEventListener('touchstart', skipHandler, { passive: true });
  splash.addEventListener('click', skipHandler);

  setTimeout(() => dismissSplash(splash), SPLASH_DURATION);
}

function dismissSplash(splash) {
  if (splash.classList.contains('fade-out') || splash.classList.contains('hidden')) return;
  splash.classList.add('fade-out');
  setTimeout(() => {
    splash.classList.add('hidden');
    initApp();
  }, 500);
}

let currentTab = 'home';
let selectedRewardForExchange = null;
let selectedTicketForUse = null;

function initApp() {
  setupEventListeners();
  renderApp();

  if (window.qrManager) {
    window.qrManager.checkUrlParamsOnLoad();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        reg.update().catch(() => {});
      }).catch(err => {
        console.log('SW registration error:', err);
      });

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
  document.querySelectorAll('.nav-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // 次のリワードカードタップ -> リワードタブへ
  const nextRewardCard = document.getElementById('next-reward-card');
  if (nextRewardCard) {
    nextRewardCard.addEventListener('click', () => switchTab('rewards'));
  }

  // QRバナー -> スキャナーモーダル
  const qrBanner = document.getElementById('qr-banner-btn');
  if (qrBanner) {
    qrBanner.addEventListener('click', () => {
      if (window.qrManager) window.qrManager.startCameraScanner();
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
    historyLink.addEventListener('click', () => openHistoryModal());
  }

  // モーダル閉じるボタン（.modal-close-trigger）
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

  // 交換確認モーダルの「交換する」
  const confirmExchangeBtn = document.getElementById('confirm-exchange-btn');
  if (confirmExchangeBtn) {
    confirmExchangeBtn.addEventListener('click', () => executeRewardExchange());
  }

  // チケット使用確認モーダルの「使用する」
  const confirmUseTicketBtn = document.getElementById('confirm-use-ticket-btn');
  if (confirmUseTicketBtn) {
    confirmUseTicketBtn.addEventListener('click', () => executeTicketUse());
  }

  // 音声トグル
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      window.soundEffects.muted = !window.soundEffects.muted;
      soundBtn.style.opacity = window.soundEffects.muted ? '0.4' : '1';
    });
  }

  // iOS Safari タッチフィードバック
  document.addEventListener('touchstart', (e) => {
    const btn = e.target.closest('button, [role="button"], .next-reward-card');
    if (btn) btn.classList.add('is-touched');
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const btn = e.target.closest('button, [role="button"], .next-reward-card');
    if (btn) setTimeout(() => btn.classList.remove('is-touched'), 120);
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    document.querySelectorAll('.is-touched').forEach(el => el.classList.remove('is-touched'));
  }, { passive: true });

  // 歯車ボタン → パスワードモーダル
  const gearBtn = document.getElementById('admin-gear-btn');
  if (gearBtn) {
    gearBtn.addEventListener('click', () => openAdminPasswordModal());
  }

  // パスワードモーダル: 閉じる / キャンセル
  ['admin-pw-close-btn', 'admin-pw-cancel-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => closeAdminPasswordModal());
  });

  const pwModal = document.getElementById('admin-password-modal');
  if (pwModal) {
    pwModal.addEventListener('click', (e) => {
      if (e.target === pwModal) closeAdminPasswordModal();
    });
  }

  const pwConfirmBtn = document.getElementById('admin-pw-confirm-btn');
  if (pwConfirmBtn) {
    pwConfirmBtn.addEventListener('click', () => submitAdminPassword());
  }

  const pwInput = document.getElementById('admin-pw-input');
  if (pwInput) {
    pwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAdminPassword();
    });
  }

  // 管理モーダル: 閉じる
  const adminModalClose = document.getElementById('admin-modal-close-btn');
  if (adminModalClose) {
    adminModalClose.addEventListener('click', () => closeAdminModal());
  }
  const adminModal = document.getElementById('admin-modal');
  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) closeAdminModal();
    });
  }

  // 抽選編集モーダルの閉じるボタン
  ['lottery-edit-close-btn', 'lottery-edit-cancel-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => closeLotteryEditModal());
  });
  const lotteryEditModal = document.getElementById('lottery-edit-modal');
  if (lotteryEditModal) {
    lotteryEditModal.addEventListener('click', (e) => {
      if (e.target === lotteryEditModal) closeLotteryEditModal();
    });
  }

  // 抽選保存ボタン
  const lotterySaveBtn = document.getElementById('lottery-edit-save-btn');
  if (lotterySaveBtn) {
    lotterySaveBtn.addEventListener('click', () => saveLotteryEdit());
  }

  // 抽選追加ボタン
  const addLotteryBtn = document.getElementById('admin-add-lottery-btn');
  if (addLotteryBtn) {
    addLotteryBtn.addEventListener('click', () => openLotteryEditModal(null));
  }

  setupAdminControls();
}

/**
 * タブ切り替え
 */
function switchTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

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
  renderLotteryList();
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

  const currentCountEl = document.getElementById('stamp-current-count');
  if (currentCountEl) currentCountEl.textContent = currentStamps;
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
  // アイコンはSVG汎用に変更したため img は eevee のまま維持
  if (avatarEl) avatarEl.src = 'images/icons/eevee.svg';

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
    card.dataset.ticketId = ticket.id;

    const date = new Date(ticket.exchangedDate);
    const dateStr = `${date.getMonth()+1}/${date.getDate()} 交換済み`;

    card.innerHTML = `
      <div class="ticket-thumb ticket-icon-thumb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="6"></circle>
          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path>
        </svg>
      </div>
      <div class="ticket-body">
        <div class="ticket-title">${ticket.title}</div>
        <div class="ticket-date">${dateStr}</div>
      </div>
      <button class="ticket-use-btn" type="button">使用する</button>
    `;

    card.querySelector('.ticket-use-btn').addEventListener('click', () => openUseTicketModal(ticket));
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

    let stampDotsHtml = '';
    for (let i = 0; i < reward.requiredStamps; i++) {
      stampDotsHtml += `<div class="reward-stamp-dot ${i < currentStamps ? 'active' : 'inactive'}"></div>`;
    }

    card.innerHTML = `
      <div class="reward-card-thumb reward-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="6"></circle>
          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path>
        </svg>
      </div>
      <div class="reward-card-body">
        <div class="reward-item-title">${reward.title}</div>
        <div class="reward-stamp-progress">${stampDotsHtml}</div>
        <div class="reward-req-text">必要スタンプ: ${reward.requiredStamps}個</div>
      </div>
      <button class="reward-exchange-btn ${canExchange ? 'can-exchange' : 'locked'}" data-reward-id="${reward.id}">
        交換する
      </button>
    `;

    card.querySelector('.reward-exchange-btn').addEventListener('click', () => openExchangeModal(reward.id));
    listEl.appendChild(card);
  });
}

/**
 * 4. 抽選一覧の描画
 */
function renderLotteryList() {
  const listEl = document.getElementById('lottery-card-list');
  if (!listEl) return;

  const lotteries = window.storageManager.getLotteries();
  listEl.innerHTML = '';

  if (lotteries.length === 0) {
    listEl.innerHTML = '<div class="lottery-empty">現在開催中の抽選はありません</div>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  lotteries.forEach(lot => {
    const card = document.createElement('div');
    card.className = 'lottery-card';

    let deadlineHtml = '';
    let isExpired = false;
    if (lot.deadline) {
      const dl = new Date(lot.deadline + 'T00:00:00');
      isExpired = dl < today;
      const dlStr = `${dl.getMonth()+1}/${dl.getDate()}`;
      deadlineHtml = `<div class="lottery-deadline ${isExpired ? 'expired' : ''}">
        締切: ${dlStr}${isExpired ? '（終了）' : ''}
      </div>`;
    }

    card.innerHTML = `
      <div class="lottery-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 12 20 22 4 22 4 12"></polyline>
          <rect x="2" y="7" width="20" height="5"></rect>
          <line x1="12" y1="22" x2="12" y2="7"></line>
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
        </svg>
      </div>
      <div class="lottery-card-body">
        <div class="lottery-title">${lot.title}</div>
        ${deadlineHtml}
      </div>
      <a href="${lot.url}" target="_blank" rel="noopener" class="lottery-link-btn ${isExpired ? 'expired' : ''}">
        応募する ›
      </a>
    `;

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
  const titleEl = document.getElementById('exchange-reward-title');
  const descEl = document.getElementById('exchange-reward-desc');

  if (titleEl) titleEl.textContent = `「${reward.title}」と交換しますか？`;
  if (descEl) {
    descEl.innerHTML = `スタンプを <strong>${reward.requiredStamps}個</strong> 消費して特典と交換します。<br>交換後は履歴に保存されます。`;
  }

  if (modal) modal.classList.add('show');
}

/**
 * リワード交換の実行（豪華エフェクトに変更）
 */
function executeRewardExchange() {
  if (!selectedRewardForExchange) return;

  const modal = document.getElementById('exchange-confirm-modal');
  if (modal) modal.classList.remove('show');

  const res = window.storageManager.consumeStamps(selectedRewardForExchange.id);
  if (res.success) {
    const title = selectedRewardForExchange.title;
    selectedRewardForExchange = null;
    window.showRewardCelebration(title, () => {
      renderApp();
      switchTab('home');
    });
  } else {
    alert(res.message);
    selectedRewardForExchange = null;
  }
}

/**
 * チケット使用確認モーダルを開く
 */
function openUseTicketModal(ticket) {
  selectedTicketForUse = ticket;

  const modal = document.getElementById('use-ticket-modal');
  const titleEl = document.getElementById('use-ticket-title');
  const descEl = document.getElementById('use-ticket-desc');

  if (titleEl) titleEl.textContent = `「${ticket.title}」を使用しますか？`;
  if (descEl) {
    descEl.innerHTML = `「使用する」を押すとこのチケットを消費し、獲得一覧から削除されます。<br><span style="color:#E63946; font-weight:700;">※使用履歴はポイント履歴に保存されます。</span>`;
  }

  if (modal) modal.classList.add('show');
}

/**
 * チケット使用の実行
 */
function executeTicketUse() {
  if (!selectedTicketForUse) return;

  const modal = document.getElementById('use-ticket-modal');
  if (modal) modal.classList.remove('show');

  const ticketId = selectedTicketForUse.id;
  const ticketTitle = selectedTicketForUse.title;

  const ticketCard = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
  if (ticketCard) ticketCard.classList.add('using-out');

  setTimeout(() => {
    const res = window.storageManager.useTicket(ticketId);
    if (res.success) {
      window.soundEffects.playStampSound();
      alert(`🎉「${ticketTitle}」を使用しました！\nチケットを消費し、履歴に記録しました✨`);
      renderApp();
    } else {
      alert(res.message);
    }
  }, 480);

  selectedTicketForUse = null;
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

/* ============================================================
   管理者認証
   ============================================================ */

function openAdminPasswordModal() {
  const modal = document.getElementById('admin-password-modal');
  const input = document.getElementById('admin-pw-input');
  const errorEl = document.getElementById('admin-pw-error');
  if (!modal) return;
  if (input) input.value = '';
  if (errorEl) errorEl.style.display = 'none';
  modal.classList.add('show');
  setTimeout(() => { if (input) input.focus(); }, 300);
}

function closeAdminPasswordModal() {
  const modal = document.getElementById('admin-password-modal');
  const input = document.getElementById('admin-pw-input');
  const errorEl = document.getElementById('admin-pw-error');
  if (modal) modal.classList.remove('show');
  if (input) input.value = '';
  if (errorEl) errorEl.style.display = 'none';
}

function submitAdminPassword() {
  const ADMIN_PASSWORD = '02903991';
  const input = document.getElementById('admin-pw-input');
  const errorEl = document.getElementById('admin-pw-error');
  if (!input) return;

  if (input.value === ADMIN_PASSWORD) {
    closeAdminPasswordModal();
    setTimeout(() => openAdminModal(), 250);
  } else {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.style.animation = 'none';
      errorEl.offsetHeight; // reflow
      errorEl.style.animation = '';
    }
    input.value = '';
    input.focus();
  }
}

/* ============================================================
   管理モーダル
   ============================================================ */

function openAdminModal() {
  const modal = document.getElementById('admin-modal');
  if (!modal) return;
  renderAdminRewardEditList();
  renderAdminLotteryList();
  modal.classList.add('show');
}

function closeAdminModal() {
  const modal = document.getElementById('admin-modal');
  if (modal) modal.classList.remove('show');
}

/**
 * リワード編集リスト描画
 */
function renderAdminRewardEditList() {
  const listEl = document.getElementById('admin-reward-edit-list');
  if (!listEl) return;

  const rewards = window.storageManager.getRewards();
  listEl.innerHTML = '';

  rewards.forEach(reward => {
    const row = document.createElement('div');
    row.className = 'admin-reward-row';
    row.dataset.rewardId = reward.id;
    row.innerHTML = `
      <div class="admin-form-group" style="margin-bottom:6px;">
        <label class="admin-form-label">リワード名</label>
        <input type="text" class="admin-form-input reward-edit-title" value="${reward.title}" placeholder="リワード名">
      </div>
      <div class="admin-form-group" style="margin-bottom:0;">
        <label class="admin-form-label">必要スタンプ数</label>
        <input type="number" class="admin-form-input reward-edit-stamps" value="${reward.requiredStamps}" min="1" max="10" style="width:80px;">
        <button class="admin-btn reward-save-btn" type="button" style="margin-left:8px;">保存</button>
      </div>
    `;

    row.querySelector('.reward-save-btn').addEventListener('click', () => {
      const newTitle = row.querySelector('.reward-edit-title').value.trim();
      const newStamps = parseInt(row.querySelector('.reward-edit-stamps').value, 10);
      if (!newTitle) { alert('リワード名を入力してください'); return; }
      if (isNaN(newStamps) || newStamps < 1 || newStamps > 10) { alert('必要スタンプ数は1〜10で入力してください'); return; }
      window.storageManager.updateReward(reward.id, { title: newTitle, requiredStamps: newStamps });
      renderApp();
      // 行内に保存済み表示
      const btn = row.querySelector('.reward-save-btn');
      btn.textContent = '✓ 保存済';
      btn.style.color = '#27AE60';
      setTimeout(() => { btn.textContent = '保存'; btn.style.color = ''; }, 1500);
    });

    listEl.appendChild(row);
  });
}

/**
 * 抽選リスト描画（管理モーダル内）
 */
function renderAdminLotteryList() {
  const listEl = document.getElementById('admin-lottery-list');
  if (!listEl) return;

  const lotteries = window.storageManager.getLotteries();
  listEl.innerHTML = '';

  if (lotteries.length === 0) {
    listEl.innerHTML = '<div style="font-size:12px;color:#A8A095;padding:4px 0;">抽選はまだありません</div>';
    return;
  }

  lotteries.forEach(lot => {
    const row = document.createElement('div');
    row.className = 'admin-lottery-row';
    const dl = lot.deadline ? lot.deadline : '未設定';
    row.innerHTML = `
      <div class="admin-lottery-row-info">
        <div class="admin-lottery-row-title">${lot.title}</div>
        <div class="admin-lottery-row-meta">締切: ${dl}</div>
      </div>
      <div class="admin-lottery-row-btns">
        <button class="admin-btn lot-edit-btn" type="button">編集</button>
        <button class="admin-btn danger lot-del-btn" type="button">削除</button>
      </div>
    `;

    row.querySelector('.lot-edit-btn').addEventListener('click', () => openLotteryEditModal(lot));
    row.querySelector('.lot-del-btn').addEventListener('click', () => {
      if (confirm(`「${lot.title}」を削除しますか？`)) {
        window.storageManager.deleteLottery(lot.id);
        renderAdminLotteryList();
        renderLotteryList();
      }
    });

    listEl.appendChild(row);
  });
}

/* ============================================================
   抽選 追加・編集モーダル
   ============================================================ */

function openLotteryEditModal(lot) {
  const modal = document.getElementById('lottery-edit-modal');
  if (!modal) return;

  const titleLabel = document.getElementById('lottery-edit-modal-title');
  const idInput = document.getElementById('lottery-edit-id');
  const titleInput = document.getElementById('lottery-edit-title');
  const urlInput = document.getElementById('lottery-edit-url');
  const deadlineInput = document.getElementById('lottery-edit-deadline');

  if (lot) {
    if (titleLabel) titleLabel.textContent = '抽選を編集';
    if (idInput) idInput.value = lot.id;
    if (titleInput) titleInput.value = lot.title;
    if (urlInput) urlInput.value = lot.url;
    if (deadlineInput) deadlineInput.value = lot.deadline || '';
  } else {
    if (titleLabel) titleLabel.textContent = '抽選を追加';
    if (idInput) idInput.value = '';
    if (titleInput) titleInput.value = '';
    if (urlInput) urlInput.value = '';
    if (deadlineInput) deadlineInput.value = '';
  }

  modal.classList.add('show');
}

function closeLotteryEditModal() {
  const modal = document.getElementById('lottery-edit-modal');
  if (modal) modal.classList.remove('show');
}

function saveLotteryEdit() {
  const id = document.getElementById('lottery-edit-id')?.value || '';
  const title = document.getElementById('lottery-edit-title')?.value.trim() || '';
  const url = document.getElementById('lottery-edit-url')?.value.trim() || '';
  const deadline = document.getElementById('lottery-edit-deadline')?.value || '';

  if (!title) { alert('タイトルを入力してください'); return; }
  if (!url) { alert('URLを入力してください'); return; }

  if (id) {
    window.storageManager.updateLottery(id, { title, url, deadline });
  } else {
    window.storageManager.addLottery({ title, url, deadline });
  }

  closeLotteryEditModal();
  renderAdminLotteryList();
  renderLotteryList();
}

/* ============================================================
   管理・テスト機能（スタンプ操作・QR・リセット）
   ============================================================ */

function setupAdminControls() {
  const addBtn = document.getElementById('admin-add-stamp-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const res = window.storageManager.addStamp('テストスタンプ付与');
      if (res.success) {
        window.showCelebration(() => renderApp(true));
      } else {
        alert(res.message);
      }
    });
  }

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

  const showQrBtn = document.getElementById('admin-generate-qr-btn');
  if (showQrBtn) {
    showQrBtn.addEventListener('click', () => {
      const qrUrl = window.qrManager.getDistributionUrl();
      const qrModal = document.getElementById('partner-qr-modal');
      const qrImg = document.getElementById('partner-qr-img');
      const qrLink = document.getElementById('partner-qr-link');

      if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;
      if (qrLink) qrLink.value = qrUrl;
      if (qrModal) qrModal.classList.add('show');
    });
  }

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
