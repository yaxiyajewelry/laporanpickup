/**
 * Helper untuk format dan navigasi WhatsApp
 */

export interface WhatsAppReportData {
  noLaporan: string;
  waktuLaporan: string;
  namaKurir: string;
  jasaKirim: string;
  jumlahPaket: number;
  tanggalPickup: string; // Format DD/MM/YYYY
  fotoUrl: string;
  catatan?: string;
}

/**
 * Membuat format pesan teks resmi WhatsApp untuk Pickup Yaxiya Jewelry (Satuan)
 */
export function generateWhatsAppMessage(data: WhatsAppReportData): string {
  let msg = `*LAPORAN PICKUP YAXIYA JEWELRY*

No. Laporan : ${data.noLaporan}
Waktu Laporan : ${data.waktuLaporan}
Nama Kurir : ${data.namaKurir}
Jasa Kirim : ${data.jasaKirim}
Jumlah Paket : ${data.jumlahPaket}
Tanggal Pickup : ${data.tanggalPickup}
Foto Bukti Laporan : ${data.fotoUrl}`;

  if (data.catatan && data.catatan.trim() && data.catatan !== '-') {
    msg += `\nCatatan : ${data.catatan.trim()}`;
  }

  return msg;
}

/**
 * Membuat format pesan gabungan seluruh laporan hari itu untuk dikirim sekaligus dalam satu kali pesan WhatsApp
 */
export function generateCombinedDailyWhatsAppMessage(
  reports: WhatsAppReportData[],
  displayDate: string
): string {
  if (reports.length === 0) {
    return `LAPORAN PICKUP YAXIYA JEWELRY\nTanggal : ${displayDate}\nBelum ada laporan pickup yang tercatat.`;
  }

  const totalPaket = reports.reduce((acc, curr) => acc + (curr.jumlahPaket || 0), 0);
  const totalLaporan = reports.length;

  let msg = `*REKAP LAPORAN PICKUP YAXIYA JEWELRY*\n`;
  msg += `*Tanggal : ${displayDate}*\n`;
  msg += `*Total Pickup : ${totalLaporan} Kurir*\n`;
  msg += `*Total Paket : ${totalPaket} Paket*\n`;
  msg += `================================\n\n`;

  reports.forEach((item, index) => {
    msg += `*[${index + 1}] No. Laporan : ${item.noLaporan}*\n`;
    msg += `• Waktu : ${item.waktuLaporan}\n`;
    msg += `• Kurir : ${item.namaKurir} (${item.jasaKirim})\n`;
    msg += `• Jumlah : ${item.jumlahPaket} Paket\n`;
    msg += `• Tanggal Pickup : ${item.tanggalPickup}\n`;
    if (item.catatan && item.catatan.trim() && item.catatan !== '-') {
      msg += `• Catatan : ${item.catatan.trim()}\n`;
    }
    msg += `• Foto Bukti Laporan :\n${item.fotoUrl}\n\n`;
  });

  msg += `================================\n`;
  msg += `*TOTAL KESELURUHAN: ${totalPaket} PAKET (${totalLaporan} KALI PICKUP)*\n`;
  msg += `_Laporan serah terima resmi Yaxiya Jewelry_`;

  return msg.trim();
}

/**
 * Membuat tautan WhatsApp Web / App
 */
export function buildWhatsAppUrl(message: string, rawPhoneNumber?: string): string {
  const encodedText = encodeURIComponent(message);
  let cleanNumber = (rawPhoneNumber || '').replace(/[^0-9]/g, '');

  // Format nomor Indonesia: 08xxx -> 628xxx
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1);
  }

  if (cleanNumber) {
    return `https://wa.me/${cleanNumber}?text=${encodedText}`;
  }

  // Jika nomor kosong, buka WhatsApp dengan pilihan kontak manual
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Membuka WhatsApp secara aman
 */
export function openWhatsAppSafely(url: string): boolean {
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // Fallback jika diblokir popup blocker
      window.location.assign(url);
    }
    return true;
  } catch (e) {
    console.warn('Gagal membuka WhatsApp otomatis:', e);
    return false;
  }
}
