import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Upload, AlertCircle, RefreshCw, CheckCircle2, QrCode } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (blCode: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MEDIA_DEVICES_NOT_SUPPORTED");
      }

      // Prefer back camera on mobile devices
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsScanning(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message === 'Permission denied') {
        setCameraError("Accès à la caméra refusé ou bloqué par le navigateur. Vous pouvez autoriser la caméra dans les paramètres de votre navigateur, ouvrir l'application dans un nouvel onglet, ou utiliser l'importation de photo.");
      } else if (err.message === "MEDIA_DEVICES_NOT_SUPPORTED") {
        setCameraError("La caméra n'est pas supportée dans cette vue intégrée. Ouvrez l'application dans un nouvel onglet ou utilisez l'importation de photo.");
      } else {
        setCameraError("Impossible d'accéder à la caméra sur cet appareil. Utilisez l'importation d'image.");
      }
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const processQrText = (text: string) => {
    let blCode = text.trim();
    if (text.includes('bl=')) {
      const match = text.match(/bl=([^&]+)/);
      if (match) blCode = match[1];
    } else if (text.includes('BON-')) {
      const match = text.match(/(BON-[A-Za-z0-9-]+)/);
      if (match) blCode = match[1];
    }

    // Play feedback sound / vibration if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(100); } catch {}
    }

    setLastScanned(blCode);
    stopCamera();
    onScanSuccess(blCode);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        processQrText(code.data);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            processQrText(code.data);
          } else {
            alert("Aucun QR Code valide trouvé sur cette image. Veuillez réessayer.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-[#0f62fe] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-sm tracking-wide">Scanner de QR Code BL</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-white/80 hover:text-white p-1 rounded-lg transition hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'camera'
                ? 'border-[#0f62fe] text-[#0f62fe] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Caméra en direct</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'file'
                ? 'border-[#0f62fe] text-[#0f62fe] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importer une photo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 bg-gray-900 text-white">
          {activeTab === 'camera' && (
            <div className="relative flex flex-col items-center justify-center min-h-[280px] bg-black rounded-lg overflow-hidden border border-gray-800">
              {cameraError ? (
                <div className="p-6 text-center text-rose-300 space-y-4 max-w-sm mx-auto">
                  <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
                  <p className="text-xs leading-relaxed text-gray-300">{cameraError}</p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => setActiveTab('file')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Importer une photo du QR Code</span>
                    </button>
                    <button
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded text-xs font-semibold transition"
                    >
                      <X className="w-3.5 h-3.5 rotate-45" />
                      <span>Ouvrir dans un nouvel onglet</span>
                    </button>
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-gray-400 hover:text-white text-[11px]"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Réessayer la caméra</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover max-h-[320px]"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Aiming Reticle Frame */}
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-emerald-400 rounded-lg relative shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                        <div className="w-full h-0.5 bg-emerald-400/80 absolute top-1/2 left-0 animate-pulse shadow-[0_0_8px_#34d399]" />
                      </div>
                    </div>
                  )}

                  <p className="absolute bottom-3 text-[11px] bg-black/70 px-3 py-1 rounded-full text-emerald-300 font-medium">
                    Placez le QR Code du BL dans le cadre
                  </p>
                </>
              )}
            </div>
          )}

          {activeTab === 'file' && (
            <div className="flex flex-col items-center justify-center min-h-[280px] bg-gray-800 rounded-lg p-6 text-center border-2 border-dashed border-gray-600 hover:border-blue-400 transition">
              <Upload className="w-12 h-12 text-blue-400 mb-3 animate-bounce" />
              <p className="text-sm font-medium text-gray-200 mb-1">
                Choisissez une image contenat le QR code
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Capture d'écran, document ou photo de la galerie du smartphone
              </p>
              <label className="cursor-pointer bg-[#0f62fe] hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-xs transition inline-flex items-center gap-2 shadow-md">
                <Upload className="w-4 h-4" />
                <span>Sélectionner une photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-600">
          <span className="font-mono text-[11px]">
            {lastScanned ? `Détecté: ${lastScanned}` : 'Détection automatique activée'}
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold transition"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
