import React, { useState, useMemo, useRef } from 'react';
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
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react';
import { PickupRecord, deletePickupReport, updatePickupReport } from '../services/apiService';
import { AppConfig } from '../config';
import {
  WhatsAppReportData,
  generateWhatsAppMessage,
  generateCombinedDailyWhatsAppMessage,
  buildWhatsAppUrl,
  openWhatsAppSafely,
} from '../utils/whatsappHelper';
import { formatJakartaDisplayDate, getJakartaTodayDateString, toIsoDateString } from '../utils/dateHelper';
import { SHIPPING_SERVICES } from './CourierInfoCard';
import { validateImageFile, compressImage, CompressionResult } from '../utils/imageCompressor';

interface DailyReportViewProps {
  records: PickupRecord[];
  config: AppConfig;
  onRefreshFromSheet?: () => Promise<void>;
  isRefreshing?: boolean;
  onGoToInput: () => void;
  newlySavedReportNo?: string | null;
  onClearNewlySaved?: () => void;
  onRecordsChange: (updatedRecords: PickupRecord[]) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  records,
  config,
  onRefreshFromSheet,
  isRefreshing,
  onGoToInput,
  newlySavedReportNo,
  onClearNewlySaved,
  onRecordsChange,
}) => {
  const todayYmd = getJakartaTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd); // format YYYY-MM-DD
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [copiedSingleId, setCopiedSingleId] = useState<string | null>(null);

  // Status feedback notifikasi aksi (edit / delete)
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // State Modal Konfirmasi Hapus
  const [reportToDelete, setReportToDelete] = useState<PickupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State Modal Edit
  const [reportToEdit, setReportToEdit] = useState<PickupRecord | null>(null);
  const [editForm, setEditForm] = useState({
    namaKurir: '',
    jasaKirim: '',
    customService: '',
    jumlahPaket: '',
    tanggalPickup: '',
    catatan: '',
  });
  const [editErrors, setEditErrors] = useState<{
    namaKurir?: string;
    jasaKirim?: string;
    jumlahPaket?: string;
    tanggalPickup?: string;
  }>({});
  const [editPhotoResult, setEditPhotoResult] = useState<CompressionResult | null>(null);
  const [isProcessingEditPhoto, setIsProcessingEditPhoto] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const editCameraInputRef = useRef<HTMLInputElement>(null);
  const editGalleryInputRef = useRef<HTMLInputElement>(null);

  // Format tanggal display Indonesia, contoh: "06/10/2026"
  const displayDateStr = formatJakartaDisplayDate(selectedDate);

  // Filter laporan berdasarkan tanggal yang dipilih
  const dailyReports = useMemo(() => {
    return records.filter((rec) => {
      if (rec.tanggalPickup) {
        if (toIsoDateString(rec.tanggalPickup) === selectedDate) return true;
        if (rec.tanggalPickup === selectedDate) return true;
        if (rec.tanggalPickup === displayDateStr) return true;
      }
      const compactDate = selectedDate.replace(/-/g, '');
      if (rec.noLaporan && rec.noLaporan.includes(compactDate)) return true;
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

  // Navigasi Tanggal
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
    const waUrl = buildWhatsAppUrl(combinedMessage, config.whatsappNumber);
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
    const waUrl = buildWhatsAppUrl(message, config.whatsappNumber);
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

  // ==========================================================================
  // LOGIKA HAPUS LAPORAN (DELETE)
  // ==========================================================================
  const handleOpenDeleteModal = (rec: PickupRecord) => {
    setReportToDelete(rec);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setReportToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    const targetNo = reportToDelete.noLaporan;

    try {
      const res = await deletePickupReport(targetNo, config);
      if (res.success) {
        // Hapus dari state lokal
        const updated = records.filter((r) => r.noLaporan !== targetNo);
        onRecordsChange(updated);
        setActionFeedback({
          type: 'success',
          message: `Laporan ${targetNo} berhasil dihapus dari Google Spreadsheet & aplikasi.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.message || `Gagal menghapus laporan ${targetNo}.`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || `Terjadi kesalahan saat menghapus laporan.`,
      });
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // ==========================================================================
  // LOGIKA EDIT LAPORAN (UPDATE)
  // ==========================================================================
  const handleOpenEditModal = (rec: PickupRecord) => {
    const isStandard = SHIPPING_SERVICES.includes(rec.jasaKirim);
    setReportToEdit(rec);
    setEditForm({
      namaKurir: rec.namaKurir || '',
      jasaKirim: isStandard ? rec.jasaKirim : 'Lainnya',
      customService: isStandard ? '' : rec.jasaKirim || '',
      jumlahPaket: String(rec.jumlahPaket || '1'),
      tanggalPickup: rec.tanggalPickup ? convertDisplayToIsoDate(rec.tanggalPickup) : todayYmd,
      catatan: rec.catatan && rec.catatan !== '-' ? rec.catatan : '',
    });
    setEditErrors({});
    setEditPhotoResult(null);
  };

  const handleCloseEditModal = () => {
    if (isUpdating) return;
    setReportToEdit(null);
    setEditPhotoResult(null);
  };

  const convertDisplayToIsoDate = (displayStr: string): string => {
    if (!displayStr) return todayYmd;
    const iso = toIsoDateString(displayStr);
    return iso || todayYmd;
  };

  const handleEditPhotoSelected = async (file: File) => {
    const valid = validateImageFile(file);
    if (!valid.valid) {
      setActionFeedback({ type: 'error', message: valid.error || 'Format foto tidak valid.' });
      return;
    }

    setIsProcessingEditPhoto(true);
    try {
      const res = await compressImage(file);
      setEditPhotoResult(res);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Gagal memproses foto baru.' });
    } finally {
      setIsProcessingEditPhoto(false);
    }
  };

  const validateEditForm = (): boolean => {
    const errs: typeof editErrors = {};
    if (!editForm.namaKurir.trim()) {
      errs.namaKurir = 'Nama kurir wajib diisi.';
    }
    if (!editForm.jasaKirim) {
      errs.jasaKirim = 'Jasa kirim wajib dipilih.';
    } else if (editForm.jasaKirim === 'Lainnya' && !editForm.customService.trim()) {
      errs.jasaKirim = 'Nama jasa kirim kustom wajib diisi.';
    }
    const countNum = parseInt(editForm.jumlahPaket, 10);
    if (!editForm.jumlahPaket.trim() || isNaN(countNum) || countNum < 1) {
      errs.jumlahPaket = 'Jumlah paket minimal 1.';
    }
    if (!editForm.tanggalPickup) {
      errs.tanggalPickup = 'Tanggal pickup wajib diisi.';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirmUpdate = async () => {
    if (!reportToEdit) return;
    if (!validateEditForm()) return;

    setIsUpdating(true);
    const targetNo = reportToEdit.noLaporan;
    const selectedService = editForm.jasaKirim === 'Lainnya' ? editForm.customService.trim() : editForm.jasaKirim;

    try {
      const res = await updatePickupReport(
        {
          noLaporan: targetNo,
          namaKurir: editForm.namaKurir.trim(),
          jasaKirim: selectedService,
          jumlahPaket: parseInt(editForm.jumlahPaket, 10),
          tanggalPickup: editForm.tanggalPickup,
          catatan: editForm.catatan.trim() || '-',
          fotoBase64: editPhotoResult ? editPhotoResult.base64Data : undefined,
          mimeType: editPhotoResult ? editPhotoResult.mimeType : undefined,
        },
        config
      );

      if (res.success) {
        // Perbarui di state lokal
        const updated = records.map((r) => {
          if (r.noLaporan === targetNo) {
            return {
              ...r,
              namaKurir: editForm.namaKurir.trim(),
              jasaKirim: selectedService,
              jumlahPaket: parseInt(editForm.jumlahPaket, 10),
              tanggalPickup: formatJakartaDisplayDate(editForm.tanggalPickup),
              catatan: editForm.catatan.trim() || '-',
              fotoUrl: editPhotoResult?.previewUrl || res.updatedRecord?.fotoUrl || r.fotoUrl,
            };
          }
          return r;
        });
        onRecordsChange(updated);
        setActionFeedback({
          type: 'success',
          message: `Laporan ${targetNo} berhasil diperbarui di Google Spreadsheet & aplikasi.`,
        });
        setReportToEdit(null);
      } else {
        setActionFeedback({
          type: 'error',
          message: res.message || `Gagal memperbarui laporan ${targetNo}.`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || `Terjadi kesalahan saat memperbarui laporan.`,
      });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const isToday = selectedDate === todayYmd;

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Toast Feedback Feedback Sukses / Gagal */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 shadow-md animate-scaleUp text-xs sm:text-sm ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <p className="font-semibold">{actionFeedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              Pilih tanggal untuk melihat, mengedit, atau mengirim seluruh laporan hari tersebut
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
              <button
                type="button"
                onClick={handleSendAllToWhatsApp}
                className="px-5 py-3.5 bg-white hover:bg-emerald-50 active:scale-98 text-emerald-800 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-emerald-600 text-white" />
                <span>KIRIM SEMUA KE WA</span>
              </button>

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

                    <div>
                      <span className="text-slate-400 block text-[11px]">Tanggal Pickup:</span>
                      <span className="font-semibold text-slate-700 text-xs">
                        {formatJakartaDisplayDate(rec.tanggalPickup)}
                      </span>
                    </div>

                    {rec.catatan && rec.catatan !== '-' && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">Catatan:</span>
                        <span className="text-slate-700 italic bg-slate-50 px-2 py-1 rounded-md block">
                          "{rec.catatan}"
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bukti Foto & Action Buttons Satuan (Edit, Hapus, Salin, Kirim WA) */}
                  <div className="pt-2.5 border-t border-slate-100 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 text-xs">
                    {rec.fotoUrl ? (
                      <a
                        href={rec.fotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#AB03A9] hover:underline flex items-center gap-1.5 font-semibold text-xs py-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">Buka Foto Google Drive</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Tidak ada link foto</span>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Tombol Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(rec)}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-[#AB03A9] text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200/80"
                        title="Edit data laporan ini"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(rec)}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-rose-200/70"
                        title="Hapus laporan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>

                      {/* Tombol Salin */}
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

                      {/* Tombol Kirim WA Satuan */}
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

      {/* ===================================================================== */}
      {/* POPUP MODAL KONFIRMASI HAPUS LAPORAN                                   */}
      {/* ===================================================================== */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 my-auto animate-scaleUp">
            {/* Header Icon */}
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            {/* Title & Warning */}
            <div className="text-center mb-5">
              <h3 className="text-lg font-extrabold text-slate-900">
                Hapus Laporan Pickup?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Laporan ini akan dihapus secara permanen dari sistem dan Google Spreadsheet.
              </p>
            </div>

            {/* Target Report Detail Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-5 space-y-2 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">No. Laporan:</span>
                <span className="font-extrabold text-[#AB03A9]">{reportToDelete.noLaporan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kurir & Ekspedisi:</span>
                <span className="font-bold text-slate-800">{reportToDelete.namaKurir} ({reportToDelete.jasaKirim})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Paket:</span>
                <span className="font-bold text-slate-800">{reportToDelete.jumlahPaket} Paket</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Pickup:</span>
                <span className="font-semibold text-slate-700">{formatJakartaDisplayDate(reportToDelete.tanggalPickup)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleCloseDeleteModal}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-extrabold transition-all shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Laporan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* POPUP MODAL EDIT LAPORAN                                              */}
      {/* ===================================================================== */}
      {reportToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-purple-100 my-auto max-h-[90vh] flex flex-col animate-scaleUp">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FDF2FD] text-[#AB03A9] flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Laporan Pickup
                  </h3>
                  <p className="text-xs text-[#AB03A9] font-bold">
                    {reportToEdit.noLaporan}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleCloseEditModal}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto pr-1 space-y-3.5 text-xs sm:text-sm flex-1">
              {/* Nama Kurir */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kurir <span className="text-[#AB03A9]">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.namaKurir}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, namaKurir: e.target.value }))}
                  placeholder="Masukkan nama kurir"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:outline-none ${
                    editErrors.namaKurir ? 'border-rose-400' : 'border-slate-200 focus:border-[#AB03A9]'
                  }`}
                />
                {editErrors.namaKurir && (
                  <p className="text-[11px] text-rose-600 mt-1">{editErrors.namaKurir}</p>
                )}
              </div>

              {/* Jasa Kirim */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jasa Kirim <span className="text-[#AB03A9]">*</span>
                </label>
                <select
                  value={editForm.jasaKirim}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, jasaKirim: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#AB03A9]"
                >
                  {SHIPPING_SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {editForm.jasaKirim === 'Lainnya' && (
                  <input
                    type="text"
                    value={editForm.customService}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, customService: e.target.value }))}
                    placeholder="Masukkan nama jasa kirim"
                    className="w-full mt-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#AB03A9]"
                  />
                )}
                {editErrors.jasaKirim && (
                  <p className="text-[11px] text-rose-600 mt-1">{editErrors.jasaKirim}</p>
                )}
              </div>

              {/* Jumlah Paket */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jumlah Paket <span className="text-[#AB03A9]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={editForm.jumlahPaket}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, jumlahPaket: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#AB03A9]"
                />
                {editErrors.jumlahPaket && (
                  <p className="text-[11px] text-rose-600 mt-1">{editErrors.jumlahPaket}</p>
                )}
              </div>

              {/* Tanggal Pickup */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Pickup <span className="text-[#AB03A9]">*</span>
                </label>
                <input
                  type="date"
                  value={editForm.tanggalPickup}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, tanggalPickup: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#AB03A9]"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editForm.catatan}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, catatan: e.target.value }))}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#AB03A9] resize-none"
                />
              </div>

              {/* Foto Bukti Pickup (Opsi Ganti) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Foto Bukti Pickup
                </label>

                {/* Hidden Inputs */}
                <input
                  ref={editCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleEditPhotoSelected(e.target.files[0]);
                    }
                    e.target.value = '';
                  }}
                />
                <input
                  ref={editGalleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleEditPhotoSelected(e.target.files[0]);
                    }
                    e.target.value = '';
                  }}
                />

                {isProcessingEditPhoto ? (
                  <div className="p-4 rounded-xl bg-purple-50 flex items-center justify-center gap-2 text-xs text-[#AB03A9]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengoptimalkan foto baru...</span>
                  </div>
                ) : editPhotoResult ? (
                  <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-slate-900 p-1">
                    <img
                      src={editPhotoResult.previewUrl}
                      alt="Foto Baru"
                      className="max-h-40 w-auto mx-auto rounded-lg object-contain"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-white px-1">
                      <span className="text-emerald-300 font-semibold">Foto baru siap diupload</span>
                      <button
                        type="button"
                        onClick={() => setEditPhotoResult(null)}
                        className="text-rose-300 underline"
                      >
                        Batal ganti
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">
                      Foto saat ini tersimpan di Drive
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => editCameraInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FDF2FD] text-[#AB03A9] hover:bg-purple-100 text-xs font-semibold flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Kamera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => editGalleryInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Galeri</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons Modal Edit */}
            <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleCloseEditModal}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleConfirmUpdate}
                className="px-5 py-2.5 rounded-xl bg-[#AB03A9] hover:bg-[#920290] active:scale-98 text-white text-xs font-bold transition-all shadow-md shadow-purple-900/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
