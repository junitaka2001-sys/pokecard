/**
 * POKECARD - Storage & Data Management Module
 * localStorage を使用したスタンプ・リワード・履歴の永続化
 */

const STORAGE_KEYS = {
  STAMPS: 'pokecard_stamps_v1',
  HISTORY: 'pokecard_history_v1',
  REWARDS: 'pokecard_rewards_v1',
  TICKETS: 'pokecard_active_tickets_v1',
  SETTINGS: 'pokecard_settings_v1',
  USED_TOKENS: 'pokecard_used_tokens_v1',
  STAMP_ANGLES: 'pokecard_stamp_angles_v1',
  LOTTERIES: 'pokecard_lotteries_v1'
};

// デフォルトのリワード一覧
const DEFAULT_REWARDS = [
  {
    id: 'reward-1',
    title: '映画デート',
    requiredStamps: 3,
    image: 'images/rewards/movie.svg',
    description: 'お好きな映画＆ポップコーンセット🍿'
  },
  {
    id: 'reward-2',
    title: '焼肉デート',
    requiredStamps: 5,
    image: 'images/rewards/yakiniku.svg',
    description: '美味しいお肉をたっぷり堪能🥩'
  },
  {
    id: 'reward-3',
    title: '水族館デート',
    requiredStamps: 7,
    image: 'images/rewards/aquarium.svg',
    description: '癒やしの水族館で素敵なひととき🐬'
  },
  {
    id: 'reward-4',
    title: 'ディズニーシー',
    requiredStamps: 10,
    image: 'images/rewards/disney.svg',
    description: '夢と魔法の冒険へご招待🏰✨'
  }
];

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    if (localStorage.getItem(STORAGE_KEYS.STAMPS) === null) {
      this.setStamps(3);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REWARDS)) {
      this.setRewards(DEFAULT_REWARDS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TICKETS)) {
      this.setTickets([]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      const initialHistory = [
        {
          id: 'hist-init',
          type: 'stamp_add',
          title: 'カード発行記念スタンプ',
          amount: 3,
          date: new Date().toISOString()
        }
      ];
      this.setHistory(initialHistory);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STAMP_ANGLES)) {
      this.initAngles();
    }
  }

  // 各スタンプマスの手押し風ランダム角度
  initAngles() {
    const angles = [];
    for (let i = 0; i < 10; i++) {
      angles.push((Math.random() * 14 - 7).toFixed(1));
    }
    localStorage.setItem(STORAGE_KEYS.STAMP_ANGLES, JSON.stringify(angles));
  }

  getStampAngles() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAMP_ANGLES);
      return data ? JSON.parse(data) : [0,0,0,0,0,0,0,0,0,0];
    } catch {
      return [0,0,0,0,0,0,0,0,0,0];
    }
  }

  // スタンプ数
  getStamps() {
    const val = parseInt(localStorage.getItem(STORAGE_KEYS.STAMPS), 10);
    return isNaN(val) ? 0 : Math.max(0, Math.min(10, val));
  }

  setStamps(count) {
    const safeCount = Math.max(0, Math.min(10, count));
    localStorage.setItem(STORAGE_KEYS.STAMPS, safeCount.toString());
    return safeCount;
  }

  // スタンプ追加（1回につき+1）
  addStamp(reason = 'ポケカ当選スタンプ') {
    const current = this.getStamps();
    if (current >= 10) {
      return { success: false, message: 'スタンプカードは満杯です！', current };
    }
    const next = current + 1;
    this.setStamps(next);
    
    // 履歴に追加
    this.addHistoryItem({
      id: 'hist-' + Date.now(),
      type: 'stamp_add',
      title: reason,
      amount: 1,
      date: new Date().toISOString()
    });

    return { success: true, current: next, prev: current };
  }

  // スタンプ消費（リワード交換 ➔ チケット発行）
  consumeStamps(rewardId) {
    const reward = this.getRewardById(rewardId);
    if (!reward) return { success: false, message: 'リワードが見つかりません' };

    const current = this.getStamps();
    if (current < reward.requiredStamps) {
      return { success: false, message: 'スタンプが足りません' };
    }

    const next = current - reward.requiredStamps;
    this.setStamps(next);

    // 新規チケットを作成して保有リストに追加
    const newTicket = {
      id: 'tkt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      rewardId: reward.id,
      title: reward.title,
      image: reward.image,
      description: reward.description,
      exchangedDate: new Date().toISOString()
    };
    this.addTicket(newTicket);

    // 履歴に追加
    this.addHistoryItem({
      id: 'hist-' + Date.now(),
      type: 'reward_exchange',
      title: `特典交換: ${reward.title}`,
      amount: -reward.requiredStamps,
      rewardId: reward.id,
      ticketId: newTicket.id,
      date: new Date().toISOString()
    });

    return { success: true, current: next, reward, ticket: newTicket };
  }

  // --- 保有チケット管理 ---
  getTickets() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TICKETS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  setTickets(tickets) {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  }

  addTicket(ticket) {
    const tickets = this.getTickets();
    tickets.unshift(ticket);
    this.setTickets(tickets);
  }

  // 特典チケットを使用（消化 ➔ 削除 ➔ 履歴記録）
  useTicket(ticketId) {
    const tickets = this.getTickets();
    const targetIdx = tickets.findIndex(t => t.id === ticketId);
    if (targetIdx === -1) {
      return { success: false, message: '対象のチケットが見つかりません' };
    }

    const usedTicket = tickets[targetIdx];
    tickets.splice(targetIdx, 1);
    this.setTickets(tickets);

    // 使用履歴を記録
    this.addHistoryItem({
      id: 'hist-use-' + Date.now(),
      type: 'reward_use',
      title: `🎟️ 特典使用: ${usedTicket.title}`,
      amount: 0,
      rewardId: usedTicket.rewardId,
      date: new Date().toISOString()
    });

    return { success: true, ticket: usedTicket };
  }

  // リワード一覧
  getRewards() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REWARDS);
      return data ? JSON.parse(data) : DEFAULT_REWARDS;
    } catch {
      return DEFAULT_REWARDS;
    }
  }

  getRewardById(id) {
    const rewards = this.getRewards();
    return rewards.find(r => r.id === id);
  }

  setRewards(rewards) {
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
  }

  // 「次のリワード」を計算
  getNextReward() {
    const stamps = this.getStamps();
    const rewards = this.getRewards().sort((a, b) => a.requiredStamps - b.requiredStamps);
    
    // 現在のスタンプ数を超える最小のリワード
    const next = rewards.find(r => r.requiredStamps > stamps);
    if (next) {
      return {
        reward: next,
        remaining: next.requiredStamps - stamps,
        isCompleted: false
      };
    }

    // 全て達成している場合は最上位のリワードまたは達成状態
    const topReward = rewards[rewards.length - 1];
    return {
      reward: topReward,
      remaining: 0,
      isCompleted: true
    };
  }

  // 履歴
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addHistoryItem(item) {
    const history = this.getHistory();
    history.unshift(item);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  setHistory(history) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  // 使用済みワンタイムトークン管理
  isTokenUsed(token) {
    if (!token) return false;
    try {
      const used = JSON.parse(localStorage.getItem(STORAGE_KEYS.USED_TOKENS) || '[]');
      return used.includes(token);
    } catch {
      return false;
    }
  }

  markTokenUsed(token) {
    if (!token) return;
    try {
      const used = JSON.parse(localStorage.getItem(STORAGE_KEYS.USED_TOKENS) || '[]');
      if (!used.includes(token)) {
        used.push(token);
        localStorage.setItem(STORAGE_KEYS.USED_TOKENS, JSON.stringify(used));
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 全リセット（テスト用）
  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.STAMPS);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.REWARDS);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
    localStorage.removeItem(STORAGE_KEYS.USED_TOKENS);
    localStorage.removeItem(STORAGE_KEYS.STAMP_ANGLES);
    localStorage.removeItem(STORAGE_KEYS.LOTTERIES);
    this.init();
  }

  // --- リワード更新 ---
  updateReward(id, fields) {
    const rewards = this.getRewards();
    const idx = rewards.findIndex(r => r.id === id);
    if (idx === -1) return false;
    rewards[idx] = { ...rewards[idx], ...fields };
    this.setRewards(rewards);
    return true;
  }

  // --- 抽選データ管理 ---
  getLotteries() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOTTERIES);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  setLotteries(lotteries) {
    localStorage.setItem(STORAGE_KEYS.LOTTERIES, JSON.stringify(lotteries));
  }

  addLottery(lottery) {
    const list = this.getLotteries();
    const item = {
      id: 'lot_' + Date.now(),
      title: lottery.title || '',
      url: lottery.url || '',
      deadline: lottery.deadline || ''
    };
    list.unshift(item);
    this.setLotteries(list);
    return item;
  }

  updateLottery(id, fields) {
    const list = this.getLotteries();
    const idx = list.findIndex(l => l.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...fields };
    this.setLotteries(list);
    return true;
  }

  deleteLottery(id) {
    const list = this.getLotteries().filter(l => l.id !== id);
    this.setLotteries(list);
  }
}

window.storageManager = new StorageManager();
