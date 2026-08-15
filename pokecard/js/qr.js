/**
 * POKECARD - QR Scanner & URL Param Handler Module
 */

class QRManager {
  constructor() {
    this.videoStream = null;
    this.isScanning = false;
    this.detector = null;
    this.initBarcodeDetector();
  }

  async initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) {
          this.detector = new BarcodeDetector({ formats: ['qr_code'] });
        }
      } catch (e) {
        console.log('BarcodeDetector check error:', e);
      }
    }
  }

  // 起動時のURLパラメータ検知（最重要機能）
  checkUrlParamsOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // パラメータ判定: ?add_stamp=1 or ?stamp=1 or ?token=xxx
    const addStamp = urlParams.get('add_stamp') || urlParams.get('stamp') || urlParams.get('win');
    const token = urlParams.get('token');

    if (addStamp || token) {
      if (token && window.storageManager.isTokenUsed(token)) {
        alert('このQRコード/リンクは既に使用されています。');
        this.cleanUrlParams();
        return;
      }

      // トークンを記録
      if (token) {
        window.storageManager.markTokenUsed(token);
      }

      // スタンプ付与 & 演出
      const res = window.storageManager.addStamp('ポケカ当選スタンプ（QR獲得）');
      this.cleanUrlParams();

      if (res.success) {
        // スタンプ演出を発火
        setTimeout(() => {
          window.showCelebration(() => {
            if (window.renderApp) window.renderApp(true);
          });
        }, 300);
      } else {
        alert(res.message);
      }
    }
  }

  cleanUrlParams() {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // カメラ起動によるスキャナーモーダル
  async startCameraScanner() {
    const modal = document.getElementById('qr-scan-modal');
    const video = document.getElementById('qr-video');
    if (!modal || !video) return;

    modal.classList.add('show');

    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = this.videoStream;
      await video.play();
      this.isScanning = true;
      this.scanLoop(video);
    } catch (err) {
      console.warn('Camera access failed:', err);
      // カメラが使用できない場合は手動シミュレーション案内
      document.getElementById('qr-camera-error').style.display = 'block';
    }
  }

  stopCameraScanner() {
    this.isScanning = false;
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    const modal = document.getElementById('qr-scan-modal');
    if (modal) modal.classList.remove('show');
    const errEl = document.getElementById('qr-camera-error');
    if (errEl) errEl.style.display = 'none';
  }

  async scanLoop(video) {
    if (!this.isScanning) return;

    if (this.detector && video.readyState === video.HAVE_ENOUGH_DATA) {
      try {
        const barcodes = await this.detector.detect(video);
        if (barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          this.handleScannedData(rawValue);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (this.isScanning) {
      requestAnimationFrame(() => this.scanLoop(video));
    }
  }

  handleScannedData(data) {
    this.stopCameraScanner();

    // 読み取ったデータがPOKECARDのURLかチェック
    try {
      const url = new URL(data);
      const token = url.searchParams.get('token') || url.searchParams.get('stamp') || 'qr_scanned';
      
      if (token && window.storageManager.isTokenUsed(token)) {
        alert('このQRコードは既に使用済みです。');
        return;
      }

      window.storageManager.markTokenUsed(token);
      const res = window.storageManager.addStamp('ポケカ当選スタンプ（カメラ読取）');
      if (res.success) {
        window.showCelebration(() => {
          if (window.renderApp) window.renderApp(true);
        });
      } else {
        alert(res.message);
      }
    } catch (e) {
      // URL形式でない場合もスタンプ付与
      const res = window.storageManager.addStamp('ポケカ当選スタンプ（コード読取）');
      if (res.success) {
        window.showCelebration(() => {
          if (window.renderApp) window.renderApp(true);
        });
      } else {
        alert(res.message);
      }
    }
  }

  // 配布用QRコード表示URLの生成
  getDistributionUrl(unique = true) {
    const baseUrl = window.location.origin + window.location.pathname;
    const token = unique ? 'pk_' + Date.now().toString(36) : 'stamp_win';
    return `${baseUrl}?stamp=1&token=${token}`;
  }
}

window.qrManager = new QRManager();
