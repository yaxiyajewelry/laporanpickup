/**
 * Image compressor & validator utility
 * Kompresi gambar client-side sebelum diupload ke Google Drive
 */

export interface CompressionResult {
  previewUrl: string; // Data URL untuk preview UI
  base64Data: string; // Raw base64 data untuk dikirim ke backend
  mimeType: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 1920; // 1080p-1440p standard for sharp courier waybill readability
const QUALITY = 0.82; // Optimal quality balance

/**
 * Validasi apakah file merupakan gambar yang didukung
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Silakan pilih atau ambil foto bukti pickup.' };
  }

  const isAllowed = ALLOWED_MIME_TYPES.some((type) =>
    file.type.toLowerCase().includes(type.replace('image/', ''))
  );

  if (!isAllowed && !file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Harap gunakan format JPG, JPEG, PNG, atau WEBP.',
    };
  }

  // Cek batas ukuran maksimal mentah (misal jika kamera DSLR 50MB)
  if (file.size > 30 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Ukuran foto terlalu besar (> 30MB). Silakan ambil foto ulang.',
    };
  }

  return { valid: true };
}

/**
 * Kompres file gambar menggunakan Canvas HTML5
 */
export function compressImage(file: File): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const originalSizeBytes = file.size;
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar. Silakan coba lagi.'));
    };

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Gagal memproses gambar. Pastikan file tidak rusak.'));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skalakan dimensi jika melebihi batas MAX_DIMENSION
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menginisialisasi canvas untuk kompresi.'));
          return;
        }

        // Fill white background for transparent PNG to avoid black background in JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with optimal quality
        const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
        const base64Prefix = 'data:image/jpeg;base64,';
        const base64Data = dataUrl.startsWith(base64Prefix)
          ? dataUrl.substring(base64Prefix.length)
          : dataUrl.split(',')[1] || '';

        // Hitung estimasi ukuran byte dari base64
        const compressedSizeBytes = Math.round((base64Data.length * 3) / 4);

        resolve({
          previewUrl: dataUrl,
          base64Data,
          mimeType: 'image/jpeg',
          originalSizeBytes,
          compressedSizeBytes,
          width,
          height,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes ke format yang mudah dibaca (KB/MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
