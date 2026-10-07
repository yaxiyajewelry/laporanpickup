import React from 'react';
import { Package, Calendar, FileText, Plus, Minus } from 'lucide-react';
import { formatJakartaDisplayDate } from '../utils/dateHelper';

interface PackageDetailCardProps {
  packageCount: string;
  onPackageCountChange: (val: string) => void;
  pickupDate: string; // YYYY-MM-DD
  onPickupDateChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  errors: {
    packageCount?: string;
    pickupDate?: string;
  };
}

export const PackageDetailCard: React.FC<PackageDetailCardProps> = ({
  packageCount,
  onPackageCountChange,
  pickupDate,
  onPickupDateChange,
  notes,
  onNotesChange,
  errors,
}) => {
  const handleIncrement = () => {
    const current = parseInt(packageCount, 10);
    if (isNaN(current) || current < 1) {
      onPackageCountChange('1');
    } else {
      onPackageCountChange(String(current + 1));
    }
  };

  const handleDecrement = () => {
    const current = parseInt(packageCount, 10);
    if (!isNaN(current) && current > 1) {
      onPackageCountChange(String(current - 1));
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-[#FDF2FD] text-[#AB03A9] flex items-center justify-center font-bold">
          <Package className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            DETAIL PAKET
          </h2>
          <p className="text-xs text-slate-500">
            Rincian jumlah dan jadwal penyerahan paket
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Field 1: Jumlah Paket */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="packageCount"
              className="text-xs sm:text-sm font-semibold text-slate-700"
            >
              Jumlah Paket <span className="text-[#AB03A9]">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Minimal 1 paket</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDecrement}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center font-bold transition-all"
              title="Kurang 1"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Package className="w-4 h-4" />
              </div>
              <input
                id="packageCount"
                type="number"
                min="1"
                step="1"
                value={packageCount}
                onChange={(e) => onPackageCountChange(e.target.value)}
                placeholder="Masukkan jumlah paket"
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50/70 border text-sm font-semibold rounded-xl text-center transition-all focus:bg-white focus:outline-none ${
                  errors.packageCount
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-[#AB03A9] focus:ring-2 focus:ring-[#AB03A9]/15'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={handleIncrement}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDF2FD] hover:bg-[#F3C5F3] active:scale-95 text-[#AB03A9] flex items-center justify-center font-bold transition-all"
              title="Tambah 1"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {errors.packageCount && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">
              {errors.packageCount}
            </p>
          )}
        </div>

        {/* Field 2: Tanggal Pickup */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="pickupDate"
              className="text-xs sm:text-sm font-semibold text-slate-700"
            >
              Tanggal Pickup <span className="text-[#AB03A9]">*</span>
            </label>
            <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              Tampilan: {formatJakartaDisplayDate(pickupDate)}
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              id="pickupDate"
              type="date"
              value={pickupDate}
              onChange={(e) => onPickupDateChange(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50/70 border text-sm rounded-xl transition-all focus:bg-white focus:outline-none ${
                errors.pickupDate
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-[#AB03A9] focus:ring-2 focus:ring-[#AB03A9]/15'
              }`}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Tanggal otomatis terisi hari ini (WIB). Dapat disesuaikan jika pickup susulan.
          </p>
          {errors.pickupDate && (
            <p className="mt-1 text-xs text-rose-600 font-medium">
              {errors.pickupDate}
            </p>
          )}
        </div>

        {/* Field 3: Catatan */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="notes"
              className="text-xs sm:text-sm font-semibold text-slate-700"
            >
              Catatan <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {notes.length}/250
            </span>
          </div>
          <div className="relative">
            <div className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
              <FileText className="w-4 h-4" />
            </div>
            <textarea
              id="notes"
              rows={3}
              maxLength={250}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Tambahkan catatan jika diperlukan..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 text-sm rounded-xl transition-all focus:bg-white focus:outline-none focus:border-[#AB03A9] focus:ring-2 focus:ring-[#AB03A9]/15 resize-none"
            />
          </div>

          {/* Quick Note Chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              'Sudah dicek kelengkapan resi',
              'Paket perhiasan aman terbungkus bubble',
              'Titip security post',
              'Pickup kloter sore',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  const updated = notes ? `${notes}, ${chip}` : chip;
                  onNotesChange(updated.slice(0, 250));
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#FDF2FD] hover:text-[#AB03A9] text-slate-600 transition-colors border border-slate-200/60"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
