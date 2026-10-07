/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { CourierInfoCard } from './components/CourierInfoCard';
import { PackageDetailCard } from './components/PackageDetailCard';
import { PickupProofCard } from './components/PickupProofCard';
import { SubmitButton } from './components/SubmitButton';
import { DailyReportView } from './components/DailyReportView';
import { loadConfig, AppConfig } from './config';
import { getJakartaTodayDateString, getJakartaCompactDateString, formatJakartaDisplayDate } from './utils/dateHelper';
import { validateImageFile, compressImage, CompressionResult } from './utils/imageCompressor';
import {
  submitPickupReport,
  PickupPayload,
  getLocalPickupHistory,
  saveLocalPickupRecord,
  PickupRecord,
  fetchReportsFromSpreadsheet,
} from './services/apiService';
import {
  WhatsAppReportData,
  generateWhatsAppMessage,
  buildWhatsAppUrl,
  openWhatsAppSafely,
} from './utils/whatsappHelper';
import { AlertCircle } from 'lucide-react';

export default function App() {
  // Global App Config
  const [config, setConfig] = useState<AppConfig>(loadConfig);

  // Tab State: 'input' atau 'laporan'
  const [activeTab, setActiveTab] = useState<ActiveTab>('input');

  // Form States
  const [courierName, setCourierName] = useState('');
  const [shippingService, setShippingService] = useState('');
  const [customService, setCustomService] = useState('');
  const [packageCount, setPackageCount] = useState('');
  const [pickupDate, setPickupDate] = useState(getJakartaTodayDateString());
  const [notes, setNotes] = useState('');

  // Photo States
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Validation Errors
  const [errors, setErrors] = useState<{
    courierName?: string;
    shippingService?: string;
    packageCount?: string;
    pickupDate?: string;
    photo?: string;
    general?: string;
  }>({});

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [newlySavedReportNo, setNewlySavedReportNo] = useState<string | null>(null);

  // History Records
  const [historyRecords, setHistoryRecords] = useState<PickupRecord[]>([]);
  const [isRefreshingSheet, setIsRefreshingSheet] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistoryRecords(getLocalPickupHistory());
  }, []);

  // Pastikan tanggal selalu mengikuti Asia/Jakarta WIB hari ini saat buka form
  useEffect(() => {
    setPickupDate(getJakartaTodayDateString());
  }, []);

  // Hitung jumlah laporan hari ini untuk badge tab LAPORAN
  const todayCompact = getJakartaCompactDateString();
  const todayDisplay = formatJakartaDisplayDate(getJakartaTodayDateString());
  const todayReportCount = historyRecords.filter((rec) => {
    return (
      (rec.noLaporan && rec.noLaporan.includes(todayCompact)) ||
      rec.tanggalPickup === todayDisplay ||
      rec.tanggalPickup === getJakartaTodayDateString() ||
      (rec.createdAt && rec.createdAt.startsWith(getJakartaTodayDateString()))
    );
  }).length;

  // Handle Photo Selection & Compression
  const handleFileSelected = async (file: File) => {
    setErrors((prev) => ({ ...prev, photo: undefined, general: undefined }));

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrors((prev) => ({ ...prev, photo: validation.error }));
      return;
    }

    setIsProcessingImage(true);
    try {
      const result = await compressImage(file);
      setCompressionResult(result);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        photo: err.message || 'Gagal memproses foto. Silakan ambil foto ulang.',
      }));
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleResetPhoto = () => {
    setCompressionResult(null);
    setErrors((prev) => ({ ...prev, photo: undefined }));
  };

  // Validasi Form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!courierName.trim()) {
      newErrors.courierName = 'Nama kurir wajib diisi.';
    }

    if (!shippingService) {
      newErrors.shippingService = 'Jasa kirim wajib dipilih.';
    } else if (shippingService === 'Lainnya' && !customService.trim()) {
      newErrors.shippingService = 'Silakan masukkan nama jasa kirim.';
    }

    const countNum = parseInt(packageCount, 10);
    if (!packageCount.trim() || isNaN(countNum) || countNum < 1) {
      newErrors.packageCount = 'Jumlah paket wajib diisi (minimal 1).';
    }

    if (!pickupDate) {
      newErrors.pickupDate = 'Tanggal pickup wajib diisi.';
    }

    // Validasi Foto (Wajib)
    if (!compressionResult) {
      newErrors.photo = 'Silakan ambil foto bukti pickup terlebih dahulu.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async () => {
    setErrors({});

    // 1. Validasi
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!compressionResult) {
      setErrors({ photo: 'Silakan ambil foto bukti pickup terlebih dahulu.' });
      return;
    }

    setIsSubmitting(true);
    setProgressText('Memvalidasi data laporan...');

    try {
      const selectedService =
        shippingService === 'Lainnya' ? customService.trim() : shippingService;

      const payload: PickupPayload = {
        namaKurir: courierName.trim(),
        jasaKirim: selectedService,
        jumlahPaket: parseInt(packageCount, 10),
        tanggalPickup: pickupDate,
        catatan: notes.trim(),
        fotoBase64: compressionResult.base64Data,
        mimeType: compressionResult.mimeType,
      };

      // 2. Kirim ke API backend (Google Apps Script)
      setProgressText('Mengupload foto ke Google Drive...');
      const response = await submitPickupReport(payload, config, (status) => {
        setProgressText(status);
      });

      if (!response.success) {
        throw new Error(response.message || 'Gagal menyimpan laporan.');
      }

      const reportData: WhatsAppReportData = {
        noLaporan: response.noLaporan || 'PICKUP-LAPORAN',
        waktuLaporan: response.waktuLaporan || 'WIB',
        namaKurir: response.namaKurir || payload.namaKurir,
        jasaKirim: response.jasaKirim || payload.jasaKirim,
        jumlahPaket: response.jumlahPaket || payload.jumlahPaket,
        tanggalPickup: response.tanggalPickup || formatJakartaDisplayDate(payload.tanggalPickup),
        fotoUrl: response.fotoUrl || '',
        catatan: notes.trim() || '-',
      };

      // Simpan ke local history
      const newRecord: PickupRecord = {
        id: `${Date.now()}-${Math.random()}`,
        noLaporan: reportData.noLaporan,
        waktuLaporan: reportData.waktuLaporan,
        namaKurir: reportData.namaKurir,
        jasaKirim: reportData.jasaKirim,
        jumlahPaket: reportData.jumlahPaket,
        tanggalPickup: reportData.tanggalPickup,
        catatan: notes.trim() || '-',
        fotoUrl: reportData.fotoUrl,
        createdAt: new Date().toISOString(),
      };
      saveLocalPickupRecord(newRecord);
      setHistoryRecords(getLocalPickupHistory());

      // Reset form field agar siap untuk input berikutnya
      setCourierName('');
      setShippingService('');
      setCustomService('');
      setPackageCount('');
      setPickupDate(getJakartaTodayDateString());
      setNotes('');
      setCompressionResult(null);
      setErrors({});

      // Tandai nomor laporan yang baru saja disimpan
      setNewlySavedReportNo(reportData.noLaporan);

      // Otomatis berpindah ke menu LAPORAN
      setActiveTab('laporan');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('Submit error:', err);
      let errorMsg = err.message || 'Terjadi kesalahan saat memproses laporan.';

      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = 'Koneksi internet bermasalah. Periksa koneksi Anda dan coba kembali.';
      } else if (errorMsg.toLowerCase().includes('drive')) {
        errorMsg = 'Foto gagal diupload. Silakan coba lagi.';
      } else if (errorMsg.toLowerCase().includes('sheet') || errorMsg.toLowerCase().includes('spreadsheet')) {
        errorMsg = 'Data gagal disimpan. Silakan coba lagi.';
      }

      setErrors({ general: errorMsg });
    } finally {
      setIsSubmitting(false);
      setProgressText('');
    }
  };

  // Reset form setelah selesai laporan
  const handleResetForm = () => {
    setCourierName('');
    setShippingService('');
    setCustomService('');
    setPackageCount('');
    setPickupDate(getJakartaTodayDateString());
    setNotes('');
    setCompressionResult(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sinkronkan data dari Google Spreadsheet
  const handleRefreshFromSheet = async () => {
    if (!config.googleScriptUrl) return;
    setIsRefreshingSheet(true);
    try {
      const remoteData = await fetchReportsFromSpreadsheet(config.googleScriptUrl);
      if (remoteData.length > 0) {
        setHistoryRecords(getLocalPickupHistory());
      }
    } finally {
      setIsRefreshingSheet(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] flex flex-col font-sans">
      {/* Header dengan Tab Menu: INPUT DATA & LAPORAN */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        todayReportCount={todayReportCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 sm:py-6">
        {/* TAB 1: INPUT DATA */}
        {activeTab === 'input' && (
          <div className="space-y-4 sm:space-y-5 animate-fadeIn">
            {/* Banner Alert jika ada error umum */}
            {errors.general && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-sm animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Laporan Belum Terkirim</p>
                  <p className="mt-0.5 leading-relaxed">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Section 1: INFORMASI KURIR */}
            <CourierInfoCard
              courierName={courierName}
              onCourierNameChange={(val) => {
                setCourierName(val);
                if (errors.courierName) setErrors((prev) => ({ ...prev, courierName: undefined }));
              }}
              shippingService={shippingService}
              onShippingServiceChange={(val) => {
                setShippingService(val);
                if (errors.shippingService) setErrors((prev) => ({ ...prev, shippingService: undefined }));
              }}
              customService={customService}
              onCustomServiceChange={(val) => {
                setCustomService(val);
                if (errors.shippingService) setErrors((prev) => ({ ...prev, shippingService: undefined }));
              }}
              errors={errors}
            />

            {/* Section 2: DETAIL PAKET */}
            <PackageDetailCard
              packageCount={packageCount}
              onPackageCountChange={(val) => {
                setPackageCount(val);
                if (errors.packageCount) setErrors((prev) => ({ ...prev, packageCount: undefined }));
              }}
              pickupDate={pickupDate}
              onPickupDateChange={(val) => {
                setPickupDate(val);
                if (errors.pickupDate) setErrors((prev) => ({ ...prev, pickupDate: undefined }));
              }}
              notes={notes}
              onNotesChange={setNotes}
              errors={errors}
            />

            {/* Section 3: BUKTI PICKUP */}
            <PickupProofCard
              compressionResult={compressionResult}
              isProcessingImage={isProcessingImage}
              onFileSelected={handleFileSelected}
              onResetPhoto={handleResetPhoto}
              error={errors.photo}
            />

            {/* Tombol Besar KIRIM LAPORAN */}
            <SubmitButton
              isLoading={isSubmitting}
              progressText={progressText}
              onClick={handleSubmit}
            />
          </div>
        )}

        {/* TAB 2: LAPORAN (Laporan Harian & Kirim Sekaligus ke WhatsApp) */}
        {activeTab === 'laporan' && (
          <DailyReportView
            records={historyRecords}
            whatsappNumber={config.whatsappNumber}
            onRefreshFromSheet={config.googleScriptUrl ? handleRefreshFromSheet : undefined}
            isRefreshing={isRefreshingSheet}
            onGoToInput={() => setActiveTab('input')}
            newlySavedReportNo={newlySavedReportNo}
            onClearNewlySaved={() => setNewlySavedReportNo(null)}
          />
        )}
      </main>
    </div>
  );
}

