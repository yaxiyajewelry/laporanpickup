/**
 * Helper tanggal dan waktu dengan timezone Asia/Jakarta (WIB)
 */

export const NAMA_HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const MONTH_EN_TO_NUM: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

export interface ParsedDateInfo {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dayOfWeek: number; // 0-6 (0=Minggu)
}

/**
 * Parsing berbagai format input tanggal menjadi komponen tanggal
 * Mendukung format:
 * - Date string Google Spreadsheet: "Wed Oct 07 2026 00:00:00 GMT+0700 (Waktu Indonesia Barat)"
 * - Format "Hari, DD/MM/YYYY" (contoh: "Rabu, 07/10/2026")
 * - Format DD/MM/YYYY (contoh: "07/10/2026" atau "7/10/2026")
 * - Format YYYY-MM-DD (contoh: "2026-10-07")
 * - Objek Date atau ISO timestamp
 */
export function parseAnyDateToParts(input: any): ParsedDateInfo | null {
  if (!input) return null;

  // Jika input adalah objek Date
  if (input instanceof Date && !isNaN(input.getTime())) {
    return {
      year: input.getFullYear(),
      month: input.getMonth() + 1,
      day: input.getDate(),
      dayOfWeek: input.getDay(),
    };
  }

  const str = String(input).trim();
  if (!str) return null;

  // Pola 1: String format Date Google Spreadsheet / Apps Script / toString()
  // Contoh: "Wed Oct 07 2026 00:00:00 GMT+0700 (Waktu Indonesia Barat)"
  const gmtMatch = str.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
  if (gmtMatch) {
    const monthKey = gmtMatch[1].toLowerCase();
    const month = MONTH_EN_TO_NUM[monthKey];
    const day = parseInt(gmtMatch[2], 10);
    const year = parseInt(gmtMatch[3], 10);
    if (month && !isNaN(day) && !isNaN(year)) {
      const d = new Date(year, month - 1, day, 12, 0, 0);
      return { year, month, day, dayOfWeek: d.getDay() };
    }
  }

  // Pola 2: Format "Hari, DD/MM/YYYY" (contoh: "Rabu, 07/10/2026" atau "rabu, 7/10/2026")
  const withDayNameMatch = str.match(/^[A-Za-z]+,\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (withDayNameMatch) {
    const day = parseInt(withDayNameMatch[1], 10);
    const month = parseInt(withDayNameMatch[2], 10);
    const year = parseInt(withDayNameMatch[3], 10);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return { year, month, day, dayOfWeek: d.getDay() };
  }

  // Pola 3: Format DD/MM/YYYY (contoh: "07/10/2026" atau "7/10/2026")
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return { year, month, day, dayOfWeek: d.getDay() };
  }

  // Pola 4: Format YYYY-MM-DD (contoh: "2026-10-07")
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return { year, month, day, dayOfWeek: d.getDay() };
  }

  // Pola 5: Fallback menggunakan Date.parse
  const parsedTs = Date.parse(str);
  if (!isNaN(parsedTs)) {
    const d = new Date(parsedTs);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      dayOfWeek: d.getDay(),
    };
  }

  return null;
}

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
 * Mengubah input tanggal menjadi format: "hari, dd/mm/yyyy" (contoh: "Rabu, 07/10/2026")
 * Jika withDayName = false, menghasilkan format: "dd/mm/yyyy" (contoh: "07/10/2026")
 */
export function formatJakartaDisplayDate(input: any, withDayName: boolean = true): string {
  if (!input) return '';
  const parts = parseAnyDateToParts(input);
  if (!parts) return String(input);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dStr = pad(parts.day);
  const mStr = pad(parts.month);
  const yStr = parts.year;
  const dayName = NAMA_HARI_ID[parts.dayOfWeek] || '';

  if (withDayName && dayName) {
    return `${dayName}, ${dStr}/${mStr}/${yStr}`;
  }
  return `${dStr}/${mStr}/${yStr}`;
}

/**
 * Mengubah input tanggal menjadi format DD/MM/YYYY murni tanpa nama hari
 */
export function formatJakartaDateOnly(input: any): string {
  return formatJakartaDisplayDate(input, false);
}

/**
 * Mengubah input tanggal menjadi format ISO "YYYY-MM-DD" (untuk <input type="date"> dan filter data)
 */
export function toIsoDateString(input: any): string {
  const parts = parseAnyDateToParts(input);
  if (!parts) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
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
