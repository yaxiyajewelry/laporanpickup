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
  // Masukkan URL Google Apps Script Web App hasil deploy (atau atur via menu Pengaturan di aplikasi)
  googleScriptUrl: '',
  // Masukkan nomor WhatsApp tujuan (format: 628xxx) atau kosongkan untuk memilih kontak manual
  whatsappNumber: '',
  useDemoMode: false,
};

export function loadConfig(): AppConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
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
