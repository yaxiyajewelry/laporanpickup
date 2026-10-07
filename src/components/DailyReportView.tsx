import React, { useState, useMemo } from 'react';
import {
  Calendar,
  MessageCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Package,
  Truck,
  PlusCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { PickupRecord } from '../services/apiService';
import {
  WhatsAppReportData,
  generateWhatsAppMessage,
  generateCombinedDailyWhatsAppMessage,
  buildWhatsAppUrl,
  openWhatsAppSafely,
} from '../utils/whatsappHelper';
import { formatJakartaDisplayDate, getJakartaTodayDateString } from '../utils/dateHelper';

interface DailyReportViewProps {
  records: PickupRecord[];
  whatsappNumber?: string;
  onRefreshFromSheet?: () => Promise<void>;
  isRefreshing?: boolean;
  onGoToInput: () => void;
  newlySavedReportNo?: string | null;
  onClearNewlySaved?: () => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  records,
  whatsappNumber,
  onRefreshFromSheet,
  isRefreshing,
  onGoToInput,
  newlySavedReportNo,
  onClearNewlySaved,
}) => {
  const todayYmd = getJakartaTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd); // format YYYY-MM-DD
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [copiedSingleId, setCopiedSingleId] = useState<string | null>(null);

  // Format tanggal display Indonesia, contoh: "06/10/2026"
  const displayDateStr = formatJakartaDisplayDate(selectedDate);

  // Filter laporan berdasarkan tanggal yang dipilih
  const dailyReports = useMemo(() => {
    return records.filter((rec) => {
      // Periksa format tanggalPickup (bisa YYYY-MM-DD atau DD/MM/YYYY)
      if (rec.tanggalPickup) {
        if (rec.tanggalPickup === selectedDate) return true;
        if (rec.tanggalPickup === displayDateStr) return true;
      }
      // Periksa noLaporan yang mengandung compact date YYYYMMDD
      const compactDate = selectedDate.replace(/-/g, '');
      if (rec.noLaporan && rec.noLaporan.includes(compactDate)) return true;

      // Periksa createdAt timestamp
      if (rec.createdAt && rec.createdAt.startsWith(selectedDate)) return true;

      return false;
    });
  }, [records, selectedDate, displayDateStr]);

  // Total paket dan ringkasan
  const totalPaket = useMemo(() => {
    return dailyReports.reduce((acc, curr) => acc + (curr.jumlahPaket || 0), 0);
  }, [dailyReports]);

  // Ekspedisi unik hari itu
  const uniqueServices = useMemo(() => {
    const set = new Set(dailyReports.map((r) => r.jasaKirim).filter(Boolean));
    return Array.from(set);
  }, [dailyReports]);

  // Navigasi Tanggal (Hari sebelumnya & Hari berikutnya)
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(todayYmd);
  };

  // Convert dailyReports ke WhatsAppReportData format
  const formattedReportDataList: WhatsAppReportData[] = useMemo(() => {
    return dailyReports.map((r) => ({
      noLaporan: r.noLaporan,
      waktuLaporan: r.waktuLaporan,
      namaKurir: r.namaKurir,
      jasaKirim: r.jasaKirim,
      jumlahPaket: r.jumlahPaket,
      tanggalPickup: r.tanggalPickup || displayDateStr,
      fotoUrl: r.fotoUrl,
      catatan: r.catatan,
    }));
  }, [dailyReports, displayDateStr]);

  // Action: Kirim SEMUA Laporan Sekaligus ke WhatsApp
  const handleSendAllToWhatsApp = () => {
    if (dailyReports.length === 0) return;
    const combinedMessage = generateCombinedDailyWhatsAppMessage(
      formattedReportDataList,
      displayDateStr
    );
    const waUrl = buildWhatsAppUrl(combinedMessage, whatsappNumber);
    openWhatsAppSafely(waUrl);
  };

  // Action: Salin Pesan Gabungan
  const handleCopyCombinedText = async () => {
    if (dailyReports.length === 0) return;
    try {
      const combinedMessage = generateCombinedDailyWhatsAppMessage(
        formattedReportDataList,
        displayDateStr
      );
      await navigator.clipboard.writeText(combinedMessage);
      setCopiedCombined(true);
      setTimeout(() => setCopiedCombined(false), 2500);
    } catch (err) {
      console.warn('Gagal menyalin:', err);
    }
  };

  // Action: Kirim Satuan ke WhatsApp
  const handleSendSingleToWhatsApp = (rec: PickupRecord) => {
    const data: WhatsAppReportData = {
      noLaporan: rec.noLaporan,
      waktuLaporan: rec.waktuLaporan,
      namaKurir: rec.namaKurir,
      jasaKirim: rec.jasaKirim,
      jumlahPaket: rec.jumlahPaket,
      tanggalPickup: rec.tanggalPickup || displayDateStr,
      fotoUrl: rec.fotoUrl,
      catatan: rec.catatan,
    };
    const message = generateWhatsAppMessage(data);
    const waUrl = buildWhatsAppUrl(message, whatsappNumber);
    openWhatsAppSafely(waUrl);
  };

  // Action: Salin Satuan
  const handleCopySingleText = async (rec: PickupRecord) => {
    try {
      const data: WhatsAppReportData = {
        noLaporan: rec.noLaporan,
        waktuLaporan: rec.waktuLaporan,
        namaKurir: rec.namaKurir,
        jasaKirim: rec.jasaKirim,
        jumlahPaket: rec.jumlahPaket,
        tanggalPickup: rec.tanggalPickup || displayDateStr,
        fotoUrl: rec.fotoUrl,
        catatan: rec.catatan,
      };
      const message = generateWhatsAppMessage(data);
      await navigator.clipboard.writeText(message);
      setCopiedSingleId(rec.id);
      setTimeout(() => setCopiedSingleId(null), 2500);
    } catch (err) {
      console.warn('Gagal menyalin:', err);
    }
  };

  const isToday = selectedDate === todayYmd;

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Notifikasi Laporan Baru Saja Disimpan */}
      {newlySavedReportNo && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start justify-between gap-3 shadow-sm animate-scaleUp">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm shadow-emerald-700/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-emerald-900">
                Laporan {newlySavedReportNo} Berhasil Disimpan!
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Data telah tersimpan ke Google Spreadsheet & foto tersimpan di Google Drive. Laporan otomatis ditambahkan ke daftar rekap di bawah ini.
              </p>
            </div>
          </div>
          {onClearNewlySaved && (
            <button
              type="button"
              onClick={onClearNewlySaved}
              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100/80 transition-colors"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 1. Bar Pemilih Tanggal Laporan */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#AB03A9]" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Laporan Pickup Harian
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih tanggal untuk melihat dan mengirim seluruh laporan hari tersebut
            </p>
          </div>

          {/* Quick Date Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#AB03A9] focus:ring-2 focus:ring-[#AB03A9]/15"
            />

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2.5 py-1.5 bg-[#FDF2FD] text-[#AB03A9] hover:bg-[#F3C5F3] rounded-xl text-xs font-bold transition-colors"
              >
                Hari Ini
              </button>
            )}

            {onRefreshFromSheet && (
              <button
                type="button"
                onClick={onRefreshFromSheet}
                disabled={isRefreshing}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Sinkronkan dengan Spreadsheet"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#AB03A9]' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Kartu Ringkasan Harian (Stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FDF2FD] text-[#AB03A9] flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Total Pickup</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900">
                {dailyReports.length} <span className="text-xs font-semibold text-slate-500">Kurir</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-[#AB03A9] flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Total Paket</p>
              <p className="text-base sm:text-lg font-extrabold text-[#AB03A9]">
                {totalPaket} <span className="text-xs font-semibold text-slate-500">Paket</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1 flex flex-col justify-center">
            <p className="text-[11px] text-slate-500 font-medium">Ekspedisi</p>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {uniqueServices.length > 0 ? uniqueServices.join(', ') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. TOMBOL UTAMA: KIRIM SEMUA LAPORAN SEKALIGUS KE WHATSAPP */}
      {dailyReports.length > 0 ? (
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-emerald-700/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-emerald-100 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>KIRIM SEKALIGUS {dailyReports.length} LAPORAN HARI INI</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                Kirim Semua Rekap Pickup ke WhatsApp
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5 max-w-md">
                Menggabungkan seluruh {dailyReports.length} laporan kurir tanggal {displayDateStr} (Total {totalPaket} paket) lengkap dengan link foto Google Drive dalam 1 kali kirim.
              </p>
            </div>

            <div className="flex flex-col xs:flex-row sm:flex-col gap-2 flex-shrink-0">
              {/* Tombol Utama Kirim WA */}
              <button
                type="button"
                onClick={handleSendAllToWhatsApp}
                className="px-5 py-3.5 bg-white hover:bg-emerald-50 active:scale-98 text-emerald-800 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-emerald-600 text-white" />
                <span>KIRIM SEMUA KE WA</span>
              </button>

              {/* Tombol Salin Teks Rekap */}
              <button
                type="button"
                onClick={handleCopyCombinedText}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
              >
                {copiedCombined ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Teks Rekap Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Pesan Rekap</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl p-8 sm:p-10 text-center shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#AB03A9] flex items-center justify-center mb-3">
            <Package className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Belum Ada Laporan Pickup
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            Tidak ada laporan pickup yang tercatat pada tanggal {displayDateStr}. Silakan input data serah terima kurir baru.
          </p>
          <button
            type="button"
            onClick={onGoToInput}
            className="px-5 py-2.5 bg-[#AB03A9] hover:bg-[#920290] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-purple-900/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Data Pickup Sekarang</span>
          </button>
        </div>
      )}

      {/* 4. Daftar Rincian Laporan Hari Terpilih */}
      {dailyReports.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Rincian Laporan ({dailyReports.length} Kurir)
            </h3>
            <span className="text-[11px] text-slate-500">
              Tanggal: {displayDateStr}
            </span>
          </div>

          <div className="space-y-3">
            {dailyReports.map((rec, index) => {
              const isNewlySaved = newlySavedReportNo === rec.noLaporan;
              return (
                <div
                  key={rec.id || index}
                  className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all hover:shadow-md ${
                    isNewlySaved
                      ? 'border-emerald-400 ring-2 ring-emerald-500/25 bg-emerald-50/20'
                      : 'border-slate-100 hover:border-purple-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#FDF2FD] text-[#AB03A9] font-black text-xs flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-[#AB03A9] text-sm tracking-wide">
                            {rec.noLaporan}
                          </h4>
                          {isNewlySaved && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                              Baru Disimpan
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{rec.waktuLaporan || 'WIB'}</span>
                        </p>
                      </div>
                    </div>

                    <span className="self-start sm:self-center bg-purple-50 text-purple-800 font-bold text-xs px-2.5 py-1 rounded-lg">
                      {rec.jumlahPaket} Paket
                    </span>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kurir & Ekspedisi:</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {rec.namaKurir} <span className="text-slate-500 font-medium">({rec.jasaKirim})</span>
                    </span>
                  </div>

                  {rec.catatan && rec.catatan !== '-' && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Catatan:</span>
                      <span className="text-slate-700 italic bg-slate-50 px-2 py-1 rounded-md block">
                        "{rec.catatan}"
                      </span>
                    </div>
                  )}
                </div>

                {/* Bukti Foto & Action Buttons Satuan */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 text-xs">
                  {rec.fotoUrl ? (
                    <a
                      href={rec.fotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#AB03A9] hover:underline flex items-center gap-1.5 font-semibold text-xs py-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[220px]">Buka Foto Google Drive</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Tidak ada link foto</span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopySingleText(rec)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Salin teks laporan ini"
                    >
                      {copiedSingleId === rec.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendSingleToWhatsApp(rec)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-700/20"
                      title="Kirim hanya laporan ini ke WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white text-emerald-600" />
                      <span>Kirim WA</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
};
