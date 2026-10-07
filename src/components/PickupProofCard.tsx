import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RotateCcw, CheckCircle, Maximize2, X, AlertCircle } from 'lucide-react';
import { formatFileSize, CompressionResult } from '../utils/imageCompressor';

interface PickupProofCardProps {
  compressionResult: CompressionResult | null;
  isProcessingImage: boolean;
  onFileSelected: (file: File) => void;
  onResetPhoto: () => void;
  error?: string;
}

export const PickupProofCard: React.FC<PickupProofCardProps> = ({
  compressionResult,
  isProcessingImage,
  onFileSelected,
  onResetPhoto,
  error,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
    // Reset value agar input change tetap terpicu jika memilih file yang sama
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
      {/* Hidden Native Camera Input (Prioritizes Environment/Rear Camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Hidden Gallery/Picker Input (Fallback option) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Section Header */}
      <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-[#FDF2FD] text-[#AB03A9] flex items-center justify-center font-bold">
          <Camera className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            BUKTI PICKUP
          </h2>
          <p className="text-xs text-slate-500">
            Foto serah terima paket bersama kurir (Wajib)
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Processing State */}
      {isProcessingImage && (
        <div className="py-12 border-2 border-dashed border-[#AB03A9]/30 rounded-2xl flex flex-col items-center justify-center bg-[#FDF2FD]/40">
          <div className="w-10 h-10 border-3 border-[#AB03A9] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-slate-800">Mengoptimalkan foto...</p>
          <p className="text-xs text-slate-500 mt-1">Mengompres agar upload cepat & stabil</p>
        </div>
      )}

      {/* View 1: Belum Ada Foto (Tampilkan Tombol Ambil Kamera) */}
      {!isProcessingImage && !compressionResult && (
        <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 sm:p-8 text-center bg-gradient-to-b from-[#FDF4FD]/60 to-white flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-md border border-purple-100 flex items-center justify-center text-[#AB03A9] mb-4 group transition-transform hover:scale-105">
            <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-[#AB03A9]" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
            Ambil Foto Bukti Pickup
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
            Arahkan kamera ke paket dan kurir untuk bukti serah terima resmi Yaxiya Jewelry
          </p>

          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Tombol Utama Buka Kamera */}
            <button
              type="button"
              onClick={handleCameraClick}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#8E028C] to-[#AB03A9] hover:from-[#7C027B] hover:to-[#920290] active:scale-98 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-900/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>BUKA KAMERA SEKARANG</span>
            </button>

            {/* Tombol Cadangan Pilih Galeri */}
            <button
              type="button"
              onClick={handleGalleryClick}
              className="w-full sm:w-auto px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-slate-500" />
              <span>Pilih Dari Galeri</span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Mendukung kamera belakang HP otomatis</span>
          </div>
        </div>
      )}

      {/* View 2: Foto Sudah Diambil (Preview & Info Kompresi) */}
      {!isProcessingImage && compressionResult && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-purple-200 bg-slate-900 shadow-sm group">
            <img
              src={compressionResult.previewUrl}
              alt="Bukti Pickup"
              className="w-full max-h-80 object-contain bg-slate-950 mx-auto"
            />

            {/* Overlay Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Foto Siap Diupload</span>
            </div>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 backdrop-blur-sm text-white rounded-lg transition-transform active:scale-95"
              title="Perbesar Foto"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Bottom info bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 text-white text-xs flex items-center justify-between">
              <span>
                Resolusi: {compressionResult.width} x {compressionResult.height}
              </span>
              <span className="font-semibold text-purple-200">
                Ukuran: {formatFileSize(compressionResult.compressedSizeBytes)}
              </span>
            </div>
          </div>

          {/* Info Kompresi */}
          <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100 flex items-center justify-between text-xs">
            <div className="text-slate-600">
              <span className="font-medium text-slate-800">Status Kompresi:</span>{' '}
              {formatFileSize(compressionResult.originalSizeBytes)} &rarr;{' '}
              <strong className="text-[#AB03A9]">
                {formatFileSize(compressionResult.compressedSizeBytes)}
              </strong>
            </div>
            <span className="text-[11px] text-emerald-700 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded-md">
              Optimal & Tajam
            </span>
          </div>

          {/* Tombol Aksi Foto */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCameraClick}
              className="px-4 py-2.5 rounded-xl border-2 border-[#AB03A9] text-[#AB03A9] hover:bg-[#FDF2FD] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ambil Ulang</span>
            </button>

            <button
              type="button"
              onClick={handleGalleryClick}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Ganti Foto</span>
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {showPreviewModal && compressionResult && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
            <h4 className="font-semibold text-sm">Pratinjau Foto Bukti Pickup</h4>
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-h-[80vh] overflow-auto rounded-xl">
            <img
              src={compressionResult.previewUrl}
              alt="Pratinjau Penuh"
              className="max-h-[75vh] w-auto rounded-lg mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
