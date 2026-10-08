/**
 * Layanan komunikasi data dengan Google Apps Script backend
 */

import { AppConfig } from '../config';
import { getJakartaCompactDateString, getJakartaNowFormatted, formatJakartaDisplayDate } from '../utils/dateHelper';

export interface PickupPayload {
  namaKurir: string;
  jasaKirim: string;
  jumlahPaket: number;
  tanggalPickup: string; // YYYY-MM-DD
  catatan: string;
  fotoBase64: string; // raw base64 data
  mimeType: string;
}

export interface PickupResponse {
  success: boolean;
  message: string;
  noLaporan?: string;
  waktuLaporan?: string;
  namaKurir?: string;
  jasaKirim?: string;
  jumlahPaket?: number;
  tanggalPickup?: string;
  fotoUrl?: string;
  isDemo?: boolean;
}

export interface PickupRecord {
  id: string;
  noLaporan: string;
  waktuLaporan: string;
  namaKurir: string;
  jasaKirim: string;
  jumlahPaket: number;
  tanggalPickup: string;
  catatan: string;
  fotoUrl: string;
  previewThumbnail?: string;
  createdAt: string;
}

const STORAGE_HISTORY_KEY = 'yaxiya_pickup_history_v1';

export function getLocalPickupHistory(): PickupRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse pickup history', e);
    return [];
  }
}

export function saveLocalPickupRecord(record: PickupRecord): void {
  try {
    const history = getLocalPickupHistory();
    // Cegah duplikasi berdasarkan noLaporan
    const filtered = history.filter((h) => h.noLaporan !== record.noLaporan);
    const updated = [record, ...filtered].slice(0, 100); // Simpan 100 riwayat terakhir
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save record to history', e);
  }
}

/**
 * Mengambil daftar laporan dari Google Spreadsheet melalui Google Apps Script
 */
export async function fetchReportsFromSpreadsheet(
  scriptUrl: string,
  tanggalFilter?: string
): Promise<PickupRecord[]> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return [];
  }

  try {
    let url = `${scriptUrl.trim()}${scriptUrl.includes('?') ? '&' : '?'}action=getReports`;
    if (tanggalFilter) {
      url += `&tanggal=${encodeURIComponent(tanggalFilter)}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.reports)) {
      const parsedRecords: PickupRecord[] = data.reports.map((r: any, idx: number) => ({
        id: `remote-${r.noLaporan || idx}`,
        noLaporan: r.noLaporan || `LAPORAN-${idx}`,
        waktuLaporan: r.waktuLaporan || '',
        namaKurir: r.namaKurir || '',
        jasaKirim: r.jasaKirim || '',
        jumlahPaket: Number(r.jumlahPaket) || 0,
        tanggalPickup: formatJakartaDisplayDate(r.tanggalPickup || ''),
        catatan: r.catatan || '',
        fotoUrl: r.fotoUrl || '',
        createdAt: r.timestamp || new Date().toISOString(),
      }));

      // Sinkronkan ke local storage juga
      const local = getLocalPickupHistory();
      const map = new Map<string, PickupRecord>();
      // Masukkan remote terlebih dahulu
      parsedRecords.forEach((item) => map.set(item.noLaporan, item));
      // Masukkan local (jika belum ada)
      local.forEach((item) => {
        if (!map.has(item.noLaporan)) {
          map.set(item.noLaporan, item);
        }
      });
      const merged = Array.from(map.values()).sort((a, b) => b.noLaporan.localeCompare(a.noLaporan));
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(merged.slice(0, 100)));

      return parsedRecords;
    }
  } catch (err) {
    console.warn('Gagal mengambil laporan dari Spreadsheet:', err);
  }

  return [];
}

/**
 * Tes koneksi ke URL Google Apps Script (GET request)
 */
export async function testConnection(scriptUrl: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return {
      success: false,
      message: 'URL Google Apps Script belum dimasukkan.',
    };
  }

  try {
    const response = await fetch(scriptUrl.trim(), {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    return {
      success: json.success ?? true,
      message: json.message || 'Koneksi ke Google Apps Script berhasil!',
      data: json,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal terhubung ke Google Apps Script: ${err.message || 'Periksa URL dan izin Deployment (Who has access: Anyone)'}`,
    };
  }
}

/**
 * Kirim laporan pickup ke Google Apps Script
 */
export async function submitPickupReport(
  payload: PickupPayload,
  config: AppConfig,
  onProgress?: (statusText: string) => void
): Promise<PickupResponse> {
  const url = (config.googleScriptUrl || '').trim();

  // Jika URL kosong atau config.useDemoMode diaktifkan
  if (!url || config.useDemoMode) {
    if (onProgress) onProgress('Memproses data laporan (Mode Simulasi/Pratinjau)...');
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const compactDate = getJakartaCompactDateString();
    const history = getLocalPickupHistory();
    const todayCount = history.filter((h) => h.noLaporan.includes(`PICKUP-${compactDate}`)).length;
    const seq = String(todayCount + 1).padStart(3, '0');
    const simulatedNoLaporan = `PICKUP-${compactDate}-${seq}`;
    const simulatedWaktu = getJakartaNowFormatted();
    const simulatedDriveUrl = `https://drive.google.com/file/d/demo_${Date.now()}/view`;

    return {
      success: true,
      message: !url
        ? 'Laporan berhasil dibuat (Mode Pratinjau - Belum terhubung Apps Script).'
        : 'Laporan pickup berhasil disimpan (Mode Simulasi).',
      noLaporan: simulatedNoLaporan,
      waktuLaporan: simulatedWaktu,
      namaKurir: payload.namaKurir,
      jasaKirim: payload.jasaKirim,
      jumlahPaket: payload.jumlahPaket,
      tanggalPickup: formatJakartaDisplayDate(payload.tanggalPickup),
      fotoUrl: simulatedDriveUrl,
      isDemo: true,
    };
  }

  // Pengiriman nyata ke Google Apps Script
  if (onProgress) onProgress('Mengirim data dan foto ke Google Drive & Spreadsheet...');

  const requestBody = {
    namaKurir: payload.namaKurir,
    jasaKirim: payload.jasaKirim,
    jumlahPaket: payload.jumlahPaket,
    tanggalPickup: payload.tanggalPickup,
    catatan: payload.catatan || '-',
    foto: payload.fotoBase64,
    mimeType: payload.mimeType || 'image/jpeg',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 detik timeout untuk upload foto

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Menghindari preflight CORS yang kompleks pada Apps Script
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server Google Apps Script merespons dengan status ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Gagal menyimpan data laporan.');
    }

    return {
      success: true,
      message: result.message || 'Laporan pickup berhasil disimpan.',
      noLaporan: result.noLaporan,
      waktuLaporan: result.waktuLaporan,
      namaKurir: result.namaKurir || payload.namaKurir,
      jasaKirim: result.jasaKirim || payload.jasaKirim,
      jumlahPaket: result.jumlahPaket || payload.jumlahPaket,
      tanggalPickup: result.tanggalPickup || formatJakartaDisplayDate(payload.tanggalPickup),
      fotoUrl: result.fotoUrl,
      isDemo: false,
    };
  } catch (error: any) {
    console.error('Submit error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Koneksi timeout. Proses upload memakan waktu terlalu lama. Periksa sinyal internet Anda.');
    }
    throw new Error(
      error.message || 'Terjadi gangguan jaringan saat mengirim laporan. Silakan coba lagi.'
    );
  }
}

/**
 * Hapus record dari local storage
 */
export function deleteLocalPickupRecord(noLaporan: string): void {
  try {
    const history = getLocalPickupHistory();
    const updated = history.filter((h) => h.noLaporan !== noLaporan);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete record from history', e);
  }
}

/**
 * Perbarui record di local storage
 */
export function updateLocalPickupRecord(record: PickupRecord): void {
  try {
    const history = getLocalPickupHistory();
    const index = history.findIndex((h) => h.noLaporan === record.noLaporan);
    if (index !== -1) {
      history[index] = { ...history[index], ...record };
    } else {
      history.unshift(record);
    }
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to update record in history', e);
  }
}

/**
 * Hapus laporan di Google Spreadsheet & Lokal
 */
export async function deletePickupReport(
  noLaporan: string,
  config: AppConfig
): Promise<{ success: boolean; message: string }> {
  const url = (config.googleScriptUrl || '').trim();

  // Hapus dari local storage terlebih dahulu
  deleteLocalPickupRecord(noLaporan);

  if (!url || config.useDemoMode) {
    return {
      success: true,
      message: `Laporan ${noLaporan} berhasil dihapus.`,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'delete',
        noLaporan: noLaporan,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const res = await response.json();
    return {
      success: res.success ?? true,
      message: res.message || `Laporan ${noLaporan} berhasil dihapus dari Spreadsheet.`,
    };
  } catch (err: any) {
    console.warn('Gagal menghapus di spreadsheet backend:', err);
    return {
      success: true,
      message: `Laporan ${noLaporan} telah dihapus dari aplikasi.`,
    };
  }
}

/**
 * Edit / Update laporan di Google Spreadsheet & Lokal
 */
export async function updatePickupReport(
  payload: {
    noLaporan: string;
    namaKurir: string;
    jasaKirim: string;
    jumlahPaket: number;
    tanggalPickup: string; // YYYY-MM-DD
    catatan: string;
    fotoBase64?: string;
    mimeType?: string;
  },
  config: AppConfig
): Promise<{ success: boolean; message: string; updatedRecord?: Partial<PickupRecord> }> {
  const url = (config.googleScriptUrl || '').trim();

  const formattedTgl = formatJakartaDisplayDate(payload.tanggalPickup);
  const localUpdate: Partial<PickupRecord> = {
    namaKurir: payload.namaKurir,
    jasaKirim: payload.jasaKirim,
    jumlahPaket: payload.jumlahPaket,
    tanggalPickup: formattedTgl,
    catatan: payload.catatan || '-',
  };

  const history = getLocalPickupHistory();
  const existing = history.find((h) => h.noLaporan === payload.noLaporan);
  if (existing) {
    const updatedFull: PickupRecord = {
      ...existing,
      ...localUpdate,
      namaKurir: payload.namaKurir,
      jasaKirim: payload.jasaKirim,
      jumlahPaket: payload.jumlahPaket,
      tanggalPickup: formattedTgl,
      catatan: payload.catatan || '-',
    };
    updateLocalPickupRecord(updatedFull);
  }

  if (!url || config.useDemoMode) {
    return {
      success: true,
      message: `Laporan ${payload.noLaporan} berhasil diperbarui.`,
      updatedRecord: localUpdate,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'update',
        noLaporan: payload.noLaporan,
        namaKurir: payload.namaKurir,
        jasaKirim: payload.jasaKirim,
        jumlahPaket: payload.jumlahPaket,
        tanggalPickup: payload.tanggalPickup,
        catatan: payload.catatan,
        foto: payload.fotoBase64,
        mimeType: payload.mimeType || 'image/jpeg',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const res = await response.json();
    if (res.fotoUrl && existing) {
      existing.fotoUrl = res.fotoUrl;
      updateLocalPickupRecord(existing);
      localUpdate.fotoUrl = res.fotoUrl;
    }

    return {
      success: res.success ?? true,
      message: res.message || `Laporan ${payload.noLaporan} berhasil diperbarui di Spreadsheet.`,
      updatedRecord: localUpdate,
    };
  } catch (err: any) {
    console.warn('Gagal update di backend spreadsheet:', err);
    return {
      success: true,
      message: `Laporan ${payload.noLaporan} telah diperbarui di aplikasi.`,
      updatedRecord: localUpdate,
    };
  }
}
