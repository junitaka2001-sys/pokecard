/**
 * POKECARD - QR Scanner & URL Param Handler Module
 * jsQR + BarcodeDetector + Canvas Frame Scanning
 */

class QRManager {
  constructor() {
    this.videoStream = null;
    this.isScanning = false;
    this.scanCanvas = document.createElement('canvas');
    this.scanCtx = this.scanCanvas.getContext('2d', { willReadFrequently: true });
    this.lastScannedTime = 0;
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
    const guideBox = document.getElementById('qr-scan-guide-box');
    if (!modal || !video) return;

    modal.classList.add('show');
    if (guideBox) guideBox.classList.remove('detected');

    try {
      // iOS Safari や Android Chrome に最適な背面カメラスペック
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = this.videoStream;
      video.setAttribute('playsinline', 'true');
      await video.play();

      this.isScanning = true;
      requestAnimationFrame(() => this.scanLoop(video));
    } catch (err) {
      console.warn('Camera access error:', err);
      const errEl = document.getElementById('qr-camera-error');
      if (errEl) errEl.style.display = 'block';
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

  // 毎フレームのQR解析ループ
  scanLoop(video) {
    if (!this.isScanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      this.scanCanvas.width = video.videoWidth;
      this.scanCanvas.height = video.videoHeight;
      this.scanCtx.drawImage(video, 0, 0, this.scanCanvas.width, this.scanCanvas.height);

      const imageData = this.scanCtx.getImageData(0, 0, this.scanCanvas.width, this.scanCanvas.height);

      // jsQR による高速解析
      let code = null;
      if (typeof jsQR !== 'undefined') {
        code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });
      }

      if (code && code.data) {
        const now = Date.now();
        if (now - this.lastScannedTime > 2000) {
          this.lastScannedTime = now;
          this.onQrDetected(code.data);
          return;
        }
      }
    }

    if (this.isScanning) {
      requestAnimationFrame(() => this.scanLoop(video));
    }
  }

  // QR検出時の処理
  onQrDetected(data) {
    const guideBox = document.getElementById('qr-scan-guide-box');
    if (guideBox) guideBox.classList.add('detected');

    // バイブレーション（対応機種）
    if (navigator.vibrate) {
      try { navigator.vibrate(200); } catch(e){}
    }

    setTimeout(() => {
      this.handleScannedData(data);
    }, 300);
  }

  handleScannedData(data) {
    this.stopCameraScanner();

    // 読み取ったデータからトークンまたはURLパラメータを抽出
    let token = null;
    try {
      if (data.includes('?') || data.includes('http')) {
        const url = new URL(data, window.location.origin);
        token = url.searchParams.get('token') || url.searchParams.get('stamp') || 'qr_scan_' + Date.now();
      } else {
        token = data;
      }
    } catch (e) {
      token = data;
    }

    if (token && window.storageManager.isTokenUsed(token)) {
      alert('このQRコードは既に使用済みです。');
      return;
    }

    if (token) {
      window.storageManager.markTokenUsed(token);
    }

    const res = window.storageManager.addStamp('ポケカ当選スタンプ（カメラ読取）');
    if (res.success) {
      window.showCelebration(() => {
        if (window.renderApp) window.renderApp(true);
      });
    } else {
      alert(res.message);
    }
  }

  // 画像ファイル（スクショ）からのQR読み取り
  scanImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.scanCanvas.width = img.width;
        this.scanCanvas.height = img.height;
        this.scanCtx.drawImage(img, 0, 0);
        const imageData = this.scanCtx.getImageData(0, 0, img.width, img.height);
        
        if (typeof jsQR !== 'undefined') {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            this.handleScannedData(code.data);
          } else {
            alert('QRコードを検出できませんでした。別の画像をお試しください。');
          }
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 配布用QRコード表示URLの生成
  getDistributionUrl(unique = true) {
    const baseUrl = window.location.origin + window.location.pathname;
    const token = unique ? 'pk_' + Date.now().toString(36) : 'stamp_win';
    return `${baseUrl}?stamp=1&token=${token}`;
  }
}

window.qrManager = new QRManager();
