/**
 * POKECARD - QR Scanner & URL Param Handler Module
 * Ultra Fast & Robust QR Scanner for Mobile (iOS Safari, Android, PWA)
 */

class QRManager {
  constructor() {
    this.videoStream = null;
    this.isScanning = false;
    this.scanCanvas = document.createElement('canvas');
    this.scanCtx = this.scanCanvas.getContext('2d', { willReadFrequently: true });
    this.lastScannedTime = 0;
    this.barcodeDetector = null;
    this.initBarcodeDetector();
  }

  async initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats && formats.includes('qr_code')) {
          this.barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        }
      } catch (e) {
        console.warn('BarcodeDetector init error:', e);
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

      if (token) {
        window.storageManager.markTokenUsed(token);
      }

      // スタンプ付与 & 演出
      const res = window.storageManager.addStamp('ポケカ当選スタンプ（QR獲得）');
      this.cleanUrlParams();

      if (res.success) {
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

    // 既存ストリームがあれば停止
    this.stopCameraScanner(false);

    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = this.videoStream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;

      await video.play();

      this.isScanning = true;
      requestAnimationFrame(() => this.scanLoop(video));
    } catch (err) {
      console.warn('Camera access error:', err);
      // フォールバック: 制約なしで再試行
      try {
        this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = this.videoStream;
        await video.play();
        this.isScanning = true;
        requestAnimationFrame(() => this.scanLoop(video));
      } catch (err2) {
        console.error('All camera attempts failed:', err2);
        const errEl = document.getElementById('qr-camera-error');
        if (errEl) errEl.style.display = 'block';
      }
    }
  }

  stopCameraScanner(closeModal = true) {
    this.isScanning = false;
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    const video = document.getElementById('qr-video');
    if (video) {
      video.srcObject = null;
    }
    if (closeModal) {
      const modal = document.getElementById('qr-scan-modal');
      if (modal) modal.classList.remove('show');
    }
    const errEl = document.getElementById('qr-camera-error');
    if (errEl) errEl.style.display = 'none';
  }

  // 毎フレームの高速スキャンループ
  async scanLoop(video) {
    if (!this.isScanning) return;

    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        let scannedText = null;

        // 1. ネイティブ BarcodeDetector (iOS 17+ / Chrome で最速)
        if (this.barcodeDetector) {
          try {
            const barcodes = await this.barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              scannedText = barcodes[0].rawValue;
            }
          } catch (e) {}
        }

        // 2. jsQR フォールバック（超高精度解析）
        if (!scannedText && typeof jsQR !== 'undefined') {
          const w = Math.min(video.videoWidth, 480);
          const scale = w / video.videoWidth;
          const h = Math.floor(video.videoHeight * scale);

          if (this.scanCanvas.width !== w || this.scanCanvas.height !== h) {
            this.scanCanvas.width = w;
            this.scanCanvas.height = h;
          }

          this.scanCtx.drawImage(video, 0, 0, w, h);
          const imageData = this.scanCtx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            scannedText = code.data;
          }
        }

        // 検出成功時
        if (scannedText) {
          const now = Date.now();
          if (now - this.lastScannedTime > 2000) {
            this.lastScannedTime = now;
            this.onQrDetected(scannedText);
            return;
          }
        }
      } catch (err) {
        console.warn('Scan frame error:', err);
      }
    }

    if (this.isScanning) {
      requestAnimationFrame(() => this.scanLoop(video));
    }
  }

  // QR検出時の演出 & 処理
  onQrDetected(data) {
    const guideBox = document.getElementById('qr-scan-guide-box');
    if (guideBox) guideBox.classList.add('detected');

    if (navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch(e){}
    }

    setTimeout(() => {
      this.handleScannedData(data);
    }, 200);
  }

  handleScannedData(data) {
    this.stopCameraScanner(true);

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

  // 画像ファイル（スクショ等）からの読み取り
  scanImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.floor(h * (maxDim / w));
            w = maxDim;
          } else {
            w = Math.floor(w * (maxDim / h));
            h = maxDim;
          }
        }

        this.scanCanvas.width = w;
        this.scanCanvas.height = h;
        this.scanCtx.drawImage(img, 0, 0, w, h);
        const imageData = this.scanCtx.getImageData(0, 0, w, h);
        
        if (typeof jsQR !== 'undefined') {
          const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            this.handleScannedData(code.data);
          } else {
            alert('QRコードを検出できませんでした。より明るく正面から写った画像をお試しください。');
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
