/**
 * Konfigurasi Aplikasi Pickup Yaxiya Jewelry
 */

export interface AppConfig {
  googleScriptUrl: string;
  whatsappNumber: string; // e.g. "628123456789" or "" for contact picker
  useDemoMode: boolean; // Fallback jika belum deploy Apps Script
}

const STORAGE_KEY = 'yaxiya_pickup_config_v1';

export const DEFAULT_CONFIG: AppConfig = {
  // URL Google Apps Script Web App resmi hasil deployment
  googleScriptUrl: 'https://script.google.com/macros/s/AKfycbz5ObT5ymjyuBriGGRujZNcLnhvfF_UwaPZNdNKE15hp_hJHCh7XtB-Cwfi0eo0R8Rn/exec',
  // Masukkan nomor WhatsApp tujuan (format: 628xxx) atau kosongkan untuk memilih kontak manual
  whatsappNumber: '',
  useDemoMode: false,
};

export function loadConfig(): AppConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        // Pastikan selalu menggunakan URL script default jika yang tersimpan kosong
        googleScriptUrl: (parsed.googleScriptUrl && parsed.googleScriptUrl.trim())
          ? parsed.googleScriptUrl.trim()
          : DEFAULT_CONFIG.googleScriptUrl,
      };
    }
  } catch (e) {
    console.error('Failed to load config from localStorage', e);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config to localStorage', e);
  }
}
