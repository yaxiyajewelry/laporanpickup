/**
 * Helper tanggal dan waktu dengan timezone Asia/Jakarta (WIB)
 */

/**
 * Mengambil tanggal hari ini dalam format YYYY-MM-DD menggunakan timezone Asia/Jakarta (WIB)
 */
export function getJakartaTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs: YYYY-MM-DD
  } catch {
    const d = new Date();
    // Offset +7 hours for WIB
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const jkt = new Date(utc + 3600000 * 7);
    const year = jkt.getFullYear();
    const month = String(jkt.getMonth() + 1).padStart(2, '0');
    const day = String(jkt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Mengubah format YYYY-MM-DD menjadi DD/MM/YYYY untuk tampilan form
 */
export function formatJakartaDisplayDate(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return isoDateStr;
}

/**
 * Mengambil waktu saat ini dalam format "DD/MM/YYYY HH:mm WIB" (Asia/Jakarta)
 */
export function getJakartaNowFormatted(): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const formatted = formatter.format(d).replace(/\./g, ':');
    return `${formatted} WIB`;
  } catch {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} WIB`;
  }
}

/**
 * Mengambil format tanggal singkat untuk kode laporan: YYYYMMDD
 */
export function getJakartaCompactDateString(): string {
  const ymd = getJakartaTodayDateString();
  return ymd.replace(/-/g, '');
}
