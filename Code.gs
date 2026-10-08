/**
 * ============================================================================
 * SISTEM APLIKASI PICKUP YAXIYA JEWELRY - BACKEND GOOGLE APPS SCRIPT
 * ============================================================================
 * File: Code.gs
 * Versi: 1.0.0
 * 
 * Deskripsi:
 * Backend API untuk menerima data pickup paket, mengupload foto bukti pickup
 * ke Google Drive dalam folder terstruktur (Tahun/Bulan), membuat nomor laporan
 * unik tanpa duplikasi (menggunakan LockService), serta menyimpan data lengkap
 * ke Google Spreadsheet.
 */

// KONFIGURASI UTAMA
const CONFIG = {
  // ID Spreadsheet Google
  SPREADSHEET_ID: '1ZGIAw9sY2uBTwQwBLjfcWfUqYWB1eHX-CL8BTpMsgK8',

  // ID Folder Utama Google Drive
  DRIVE_FOLDER_ID: '1pLmR1TW7TL0cDKQM-IJrqjgjBWI-LAIw',

  // Pengaturan sistem
  TIMEZONE: 'Asia/Jakarta',
  SHEET_NAME: 'Database Pickup',
  ROOT_FOLDER_NAME: 'YAXIYA JEWELRY - BUKTI PICKUP',
  STATUS_DEFAULT: 'Berhasil'
};

// HEADER KOLOM DATABASE SPREADSHEET
const SHEET_HEADERS = [
  'Timestamp',
  'No. Laporan',
  'Waktu Laporan',
  'Nama Kurir',
  'Jasa Kirim',
  'Jumlah Paket',
  'Tanggal Pickup',
  'Catatan',
  'Foto Bukti Pickup',
  'Status'
];

/**
 * Endpoint GET - Untuk pengecekan status API / Ping kesehatan sistem / Ambil data laporan
 */
function doGet(e) {
  try {
    const sheet = getOrCreateDatabaseSheet();
    const folder = getOrCreateRootFolder();

    const action = e && e.parameter ? e.parameter.action : '';

    // Jika parameter action=getReports, kembalikan daftar data laporan dari Spreadsheet
    if (action === 'getReports') {
      const tanggalFilter = e.parameter.tanggal || ''; // format YYYY-MM-DD atau DD/MM/YYYY
      const lastRow = sheet.getLastRow();
      const reports = [];

      if (lastRow > 1) {
        // Kolom A-J (1-10)
        const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
        for (let i = 0; i < values.length; i++) {
          const row = values[i];
          // Kolom G: Tanggal Pickup - format ke "Hari, DD/MM/YYYY"
          const tglPickupRow = formatDisplayDate(row[6]);
          const noLap = String(row[1] || '').trim();

          // Jika ada filter tanggal, periksa kesesuaian
          if (tanggalFilter) {
            const cleanFilter = tanggalFilter.replace(/-/g, '');
            const matchFormatted = tglPickupRow.includes(tanggalFilter);
            const matchNoLap = noLap.includes(cleanFilter);
            if (!matchFormatted && !matchNoLap) {
              continue;
            }
          }

          reports.push({
            timestamp: row[0],
            noLaporan: noLap,
            waktuLaporan: String(row[2] || ''),
            namaKurir: String(row[3] || ''),
            jasaKirim: String(row[4] || ''),
            jumlahPaket: parseInt(row[5], 10) || 0,
            tanggalPickup: tglPickupRow,
            catatan: String(row[7] || ''),
            fotoUrl: String(row[8] || ''),
            status: String(row[9] || 'Berhasil')
          });
        }
      }

      return jsonResponse({
        success: true,
        message: 'Data laporan berhasil dimuat.',
        total: reports.length,
        reports: reports
      });
    }

    return jsonResponse({
      success: true,
      message: 'API Sistem Pickup Yaxiya Jewelry aktif & siap menerima data.',
      timestamp: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      timezone: CONFIG.TIMEZONE,
      spreadsheetId: sheet.getParent().getId(),
      spreadsheetUrl: sheet.getParent().getUrl(),
      sheetName: CONFIG.SHEET_NAME,
      driveFolderId: folder.getId(),
      driveFolderUrl: folder.getUrl()
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: 'Error saat mengecek sistem: ' + error.toString()
    });
  }
}

/**
 * Endpoint POST - Menerima payload laporan pickup dari frontend website
 */
function doPost(e) {
  // LockService untuk mencegah race condition & duplikasi No. Laporan
  const lock = LockService.getScriptLock();
  
  try {
    // Tunggu antrian kunci hingga 30 detik
    const lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      return jsonResponse({
        success: false,
        message: 'Server sedang sibuk memproses laporan lain. Silakan coba beberapa detik lagi.'
      });
    }

    // 1. Parsing data POST
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        message: 'Tidak ada data yang diterima pada request.'
      });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({
        success: false,
        message: 'Format data tidak valid (bukan JSON): ' + parseErr.message
      });
    }

    const action = payload.action || 'create';
    const sheet = getOrCreateDatabaseSheet();

    // ========================================================================
    // AKSI 1: HAPUS LAPORAN (DELETE)
    // ========================================================================
    if (action === 'delete') {
      const targetNoLaporan = sanitizeText(payload.noLaporan);
      if (!targetNoLaporan) {
        return jsonResponse({ success: false, message: 'No. Laporan wajib disertakan untuk menghapus.' });
      }

      const lastRow = sheet.getLastRow();
      let foundRow = -1;

      if (lastRow > 1) {
        const colBValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (let i = 0; i < colBValues.length; i++) {
          if (String(colBValues[i][0] || '').trim() === targetNoLaporan) {
            foundRow = i + 2; // Baris 1 adalah header
            break;
          }
        }
      }

      if (foundRow > 1) {
        sheet.deleteRow(foundRow);
        return jsonResponse({
          success: true,
          message: 'Laporan ' + targetNoLaporan + ' berhasil dihapus dari Google Spreadsheet.',
          noLaporan: targetNoLaporan
        });
      } else {
        return jsonResponse({
          success: false,
          message: 'Laporan dengan nomor ' + targetNoLaporan + ' tidak ditemukan di Google Spreadsheet.'
        });
      }
    }

    // ========================================================================
    // AKSI 2: EDIT / UPDATE LAPORAN
    // ========================================================================
    if (action === 'update' || action === 'edit') {
      const targetNoLaporan = sanitizeText(payload.noLaporan);
      if (!targetNoLaporan) {
        return jsonResponse({ success: false, message: 'No. Laporan wajib disertakan untuk mengedit.' });
      }

      const lastRow = sheet.getLastRow();
      let foundRow = -1;

      if (lastRow > 1) {
        const colBValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (let i = 0; i < colBValues.length; i++) {
          if (String(colBValues[i][0] || '').trim() === targetNoLaporan) {
            foundRow = i + 2;
            break;
          }
        }
      }

      if (foundRow <= 1) {
        return jsonResponse({
          success: false,
          message: 'Laporan ' + targetNoLaporan + ' tidak ditemukan untuk diperbarui.'
        });
      }

      const namaKurir = sanitizeText(payload.namaKurir);
      const jasaKirim = sanitizeText(payload.jasaKirim);
      const jumlahPaket = parseInt(payload.jumlahPaket, 10);
      const tanggalPickup = sanitizeText(payload.tanggalPickup);
      const catatan = payload.catatan !== undefined ? sanitizeText(payload.catatan) : '-';
      const formattedTanggalPickup = formatDisplayDate(tanggalPickup);

      if (namaKurir) sheet.getRange(foundRow, 4).setValue(namaKurir);
      if (jasaKirim) sheet.getRange(foundRow, 5).setValue(jasaKirim);
      if (!isNaN(jumlahPaket) && jumlahPaket >= 1) sheet.getRange(foundRow, 6).setValue(jumlahPaket);
      if (formattedTanggalPickup) sheet.getRange(foundRow, 7).setValue(formattedTanggalPickup);
      if (catatan !== undefined) sheet.getRange(foundRow, 8).setValue(catatan || '-');

      // Jika ada upload foto baru saat edit
      let updatedFotoUrl = '';
      if (payload.foto) {
        try {
          const now = new Date();
          const year = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy');
          const month = Utilities.formatDate(now, CONFIG.TIMEZONE, 'MM');
          const targetFolder = getOrCreateSubFolder(year, month);
          const safeKurirName = (namaKurir || 'update').replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${targetNoLaporan}_${safeKurirName}_edited.jpg`;

          const imageBytes = Utilities.base64Decode(payload.foto);
          const blob = Utilities.newBlob(imageBytes, payload.mimeType || 'image/jpeg', fileName);
          const file = targetFolder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          updatedFotoUrl = `https://drive.google.com/file/d/${file.getId()}/view`;
          sheet.getRange(foundRow, 9).setValue(updatedFotoUrl);
        } catch (photoErr) {
          Logger.log('Gagal update foto saat edit: ' + photoErr.message);
        }
      }

      return jsonResponse({
        success: true,
        message: 'Laporan ' + targetNoLaporan + ' berhasil diperbarui di Spreadsheet.',
        noLaporan: targetNoLaporan,
        namaKurir: namaKurir,
        jasaKirim: jasaKirim,
        jumlahPaket: jumlahPaket,
        tanggalPickup: formattedTanggalPickup,
        catatan: catatan,
        fotoUrl: updatedFotoUrl || undefined
      });
    }

    // ========================================================================
    // AKSI 3: BUAT LAPORAN BARU (CREATE - DEFAULT)
    // ========================================================================
    const namaKurir = sanitizeText(payload.namaKurir);
    const jasaKirim = sanitizeText(payload.jasaKirim);
    const jumlahPaket = parseInt(payload.jumlahPaket, 10);
    const tanggalPickup = sanitizeText(payload.tanggalPickup); // format YYYY-MM-DD
    const catatan = payload.catatan ? sanitizeText(payload.catatan) : '-';
    const fotoBase64 = payload.foto;
    const mimeType = payload.mimeType || 'image/jpeg';

    if (!namaKurir) {
      return jsonResponse({ success: false, message: 'Nama Kurir wajib diisi.' });
    }
    if (!jasaKirim) {
      return jsonResponse({ success: false, message: 'Jasa Kirim wajib dipilih.' });
    }
    if (isNaN(jumlahPaket) || jumlahPaket < 1) {
      return jsonResponse({ success: false, message: 'Jumlah paket minimal 1.' });
    }
    if (!tanggalPickup) {
      return jsonResponse({ success: false, message: 'Tanggal pickup wajib diisi.' });
    }
    if (!fotoBase64) {
      return jsonResponse({ success: false, message: 'Foto bukti pickup wajib dilampirkan.' });
    }

    // 4. Generate No. Laporan & Waktu Laporan (WIB)
    const now = new Date();
    const compactDate = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd');
    const noLaporan = generateNextReportNumber(sheet, compactDate);
    const waktuLaporan = Utilities.formatDate(now, CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm') + ' WIB';
    const timestampISO = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    // Format tanggal pickup display: DD/MM/YYYY
    const formattedTanggalPickup = formatDisplayDate(tanggalPickup);

    // 5. Simpan Foto ke Google Drive dalam folder Tahun / Bulan
    let fotoUrl = '';
    try {
      const year = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy');
      const month = Utilities.formatDate(now, CONFIG.TIMEZONE, 'MM');

      const targetFolder = getOrCreateSubFolder(year, month);
      const safeKurirName = namaKurir.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${noLaporan}_${safeKurirName}.jpg`;

      // Decode base64
      const imageBytes = Utilities.base64Decode(fotoBase64);
      const blob = Utilities.newBlob(imageBytes, mimeType, fileName);

      const file = targetFolder.createFile(blob);
      file.setDescription(`Bukti Pickup Yaxiya Jewelry - ${noLaporan} - Kurir: ${namaKurir} (${jasaKirim})`);
      
      // Berikan akses agar penerima WhatsApp dapat membuka link foto
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        Logger.log('Warning saat set sharing: ' + shareErr.message);
      }

      fotoUrl = `https://drive.google.com/file/d/${file.getId()}/view`;
    } catch (driveErr) {
      Logger.log('Drive Error: ' + driveErr.toString());
      return jsonResponse({
        success: false,
        message: 'Foto gagal diupload ke Google Drive: ' + driveErr.message
      });
    }

    // 6. Simpan baris ke Google Spreadsheet
    try {
      const rowData = [
        timestampISO,
        noLaporan,
        waktuLaporan,
        namaKurir,
        jasaKirim,
        jumlahPaket,
        formattedTanggalPickup,
        catatan,
        fotoUrl,
        CONFIG.STATUS_DEFAULT
      ];

      sheet.appendRow(rowData);
    } catch (sheetErr) {
      Logger.log('Sheet Error: ' + sheetErr.toString());
      return jsonResponse({
        success: false,
        message: 'Data gagal disimpan ke Google Spreadsheet: ' + sheetErr.message
      });
    }

    // 7. Berhasil disimpan
    return jsonResponse({
      success: true,
      message: 'Laporan pickup berhasil disimpan.',
      noLaporan: noLaporan,
      waktuLaporan: waktuLaporan,
      namaKurir: namaKurir,
      jasaKirim: jasaKirim,
      jumlahPaket: jumlahPaket,
      tanggalPickup: formattedTanggalPickup,
      fotoUrl: fotoUrl
    });

  } catch (err) {
    Logger.log('Unhandled Error: ' + err.toString());
    return jsonResponse({
      success: false,
      message: 'Terjadi kesalahan pada server: ' + err.message
    });
  } finally {
    // Selalu lepaskan lock
    lock.releaseLock();
  }
}

/**
 * Fungsi Setup Otomatis: Membuat Spreadsheet & Folder jika belum ada
 * Dapat dijalankan manual di Editor Apps Script: setupDatabase()
 */
function setupDatabase() {
  const sheet = getOrCreateDatabaseSheet();
  const folder = getOrCreateRootFolder();
  
  Logger.log('=== SETUP BERHASIL ===');
  Logger.log('Spreadsheet URL: ' + sheet.getParent().getUrl());
  Logger.log('Sheet Name: ' + sheet.getName());
  Logger.log('Drive Folder URL: ' + folder.getUrl());

  return {
    spreadsheetUrl: sheet.getParent().getUrl(),
    sheetName: sheet.getName(),
    folderUrl: folder.getUrl()
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format output JSON
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengambil atau membuat sheet "Database Pickup" lengkap dengan Header
 */
function getOrCreateDatabaseSheet() {
  let ss;

  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== '') {
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
  } else {
    // Cek apakah script terikat (container-bound) pada spreadsheet
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }

    // Jika standalone dan belum ada SPREADSHEET_ID, cari file yang ada atau buat baru
    if (!ss) {
      const files = DriveApp.getFilesByName('DATABASE PICKUP YAXIYA JEWELRY');
      if (files.hasNext()) {
        const file = files.next();
        ss = SpreadsheetApp.openById(file.getId());
      } else {
        ss = SpreadsheetApp.create('DATABASE PICKUP YAXIYA JEWELRY');
      }
    }
  }

  // Cari sheet berdasarkan nama
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  // Periksa apakah header sudah ada di baris 1
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    // Tulis header
    sheet.appendRow(SHEET_HEADERS);

    // Styling Header: Background #AB03A9, teks putih, tebal
    const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
    headerRange.setBackground('#AB03A9');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);

    // Auto resize kolom
    for (let i = 1; i <= SHEET_HEADERS.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }

  return sheet;
}

/**
 * Mengambil atau membuat root folder "YAXIYA JEWELRY - BUKTI PICKUP"
 */
function getOrCreateRootFolder() {
  if (CONFIG.DRIVE_FOLDER_ID && CONFIG.DRIVE_FOLDER_ID.trim() !== '') {
    return DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID.trim());
  }

  const folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
  }
}

/**
 * Mengambil atau membuat subfolder bertingkat: ROOT / TAHUN / BULAN
 */
function getOrCreateSubFolder(year, month) {
  const root = getOrCreateRootFolder();

  // Folder Tahun
  let yearFolder;
  const yearFolders = root.getFoldersByName(year);
  if (yearFolders.hasNext()) {
    yearFolder = yearFolders.next();
  } else {
    yearFolder = root.createFolder(year);
  }

  // Folder Bulan
  let monthFolder;
  const monthFolders = yearFolder.getFoldersByName(month);
  if (monthFolders.hasNext()) {
    monthFolder = monthFolders.next();
  } else {
    monthFolder = yearFolder.createFolder(month);
  }

  return monthFolder;
}

/**
 * Generate No. Laporan sequential per tanggal: PICKUP-YYYYMMDD-XXX
 */
function generateNextReportNumber(sheet, compactDate) {
  const prefix = `PICKUP-${compactDate}-`;
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return `${prefix}001`;
  }

  // Kolom B adalah No. Laporan
  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  let maxSeq = 0;

  for (let i = 0; i < values.length; i++) {
    const val = String(values[i][0] || '').trim();
    if (val.startsWith(prefix)) {
      const seqPart = val.substring(prefix.length);
      const num = parseInt(seqPart, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}${paddedSeq}`;
}

/**
 * Format tanggal ke format "Hari, DD/MM/YYYY" (contoh: "Rabu, 07/10/2026")
 */
function formatDisplayDate(input) {
  if (!input) return '';
  const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthMap = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const pad = function(n) { return (n < 10 ? '0' : '') + n; };

  // Kasus 1: Objek Date di Apps Script
  if (input instanceof Date && !isNaN(input.getTime())) {
    const dayName = hariArr[input.getDay()];
    const dStr = Utilities.formatDate(input, CONFIG.TIMEZONE, 'dd/MM/yyyy');
    return dayName + ', ' + dStr;
  }

  const str = String(input).trim();
  if (!str) return '';

  // Kasus 2: Sudah berformat "Hari, DD/MM/YYYY"
  if (/^[A-Za-z]+,\s*\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    return str;
  }

  // Kasus 3: String Date default Apps Script: "Wed Oct 07 2026 00:00:00 GMT+0700 (Waktu Indonesia Barat)"
  const gmtMatch = str.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
  if (gmtMatch) {
    const m = monthMap[gmtMatch[1].toLowerCase()];
    const d = parseInt(gmtMatch[2], 10);
    const y = parseInt(gmtMatch[3], 10);
    if (m && !isNaN(d) && !isNaN(y)) {
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      const dayName = hariArr[dt.getDay()];
      return dayName + ', ' + pad(d) + '/' + pad(m) + '/' + y;
    }
  }

  // Kasus 4: Format YYYY-MM-DD (dari <input type="date">)
  const ymdParts = str.split('-');
  if (ymdParts.length === 3) {
    const y = parseInt(ymdParts[0], 10);
    const m = parseInt(ymdParts[1], 10);
    const d = parseInt(ymdParts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      const dayName = hariArr[dt.getDay()];
      return dayName + ', ' + pad(d) + '/' + pad(m) + '/' + y;
    }
  }

  // Kasus 5: Format DD/MM/YYYY
  const dmyParts = str.split('/');
  if (dmyParts.length === 3) {
    const d = parseInt(dmyParts[0], 10);
    const m = parseInt(dmyParts[1], 10);
    const y = parseInt(dmyParts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      const dayName = hariArr[dt.getDay()];
      return dayName + ', ' + pad(d) + '/' + pad(m) + '/' + y;
    }
  }

  return str;
}

/**
 * Sanitasi string input
 */
function sanitizeText(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim();
}
