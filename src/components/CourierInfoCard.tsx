import React from 'react';
import { User, Truck, ChevronDown } from 'lucide-react';

interface CourierInfoCardProps {
  courierName: string;
  onCourierNameChange: (val: string) => void;
  shippingService: string;
  onShippingServiceChange: (val: string) => void;
  customService: string;
  onCustomServiceChange: (val: string) => void;
  errors: {
    courierName?: string;
    shippingService?: string;
  };
}

export const SHIPPING_SERVICES = [
  'JNE',
  'J&T Express',
  'SiCepat',
  'SPX',
  'GTL',
  'LEXID',
  'Ninja Xpress',
  'POS Indonesia',
  'TIKI',
  'Lion Parcel',
  'Lainnya',
];

export const CourierInfoCard: React.FC<CourierInfoCardProps> = ({
  courierName,
  onCourierNameChange,
  shippingService,
  onShippingServiceChange,
  customService,
  onCustomServiceChange,
  errors,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-[#FDF2FD] text-[#AB03A9] flex items-center justify-center font-bold">
          <Truck className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            INFORMASI KURIR
          </h2>
          <p className="text-xs text-slate-500">
            Lengkapi identitas penjemput paket
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Field 1: Nama Kurir */}
        <div>
          <label
            htmlFor="courierName"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
          >
            Nama Kurir <span className="text-[#AB03A9]">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="courierName"
              type="text"
              value={courierName}
              onChange={(e) => onCourierNameChange(e.target.value)}
              placeholder="Masukkan nama kurir"
              className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50/70 border text-sm rounded-xl transition-all focus:bg-white focus:outline-none ${
                errors.courierName
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-[#AB03A9] focus:ring-2 focus:ring-[#AB03A9]/15'
              }`}
            />
          </div>
          {errors.courierName && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">
              {errors.courierName}
            </p>
          )}
        </div>

        {/* Field 2: Jasa Kirim */}
        <div>
          <label
            htmlFor="shippingService"
            className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
          >
            Jasa Kirim <span className="text-[#AB03A9]">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Truck className="w-4 h-4" />
            </div>
            <select
              id="shippingService"
              value={shippingService}
              onChange={(e) => onShippingServiceChange(e.target.value)}
              className={`w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50/70 border text-sm rounded-xl appearance-none transition-all focus:bg-white focus:outline-none cursor-pointer ${
                errors.shippingService
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-[#AB03A9] focus:ring-2 focus:ring-[#AB03A9]/15'
              } ${!shippingService ? 'text-slate-400' : 'text-slate-900 font-medium'}`}
            >
              <option value="" disabled>
                Pilih jasa kirim ▼
              </option>
              {SHIPPING_SERVICES.map((service) => (
                <option key={service} value={service} className="text-slate-900 font-normal">
                  {service}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          {errors.shippingService && (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">
              {errors.shippingService}
            </p>
          )}
        </div>

        {/* Conditional Field: Jika memilih 'Lainnya' */}
        {shippingService === 'Lainnya' && (
          <div className="pt-1 animate-fadeIn">
            <label
              htmlFor="customService"
              className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
            >
              Masukkan Nama Jasa Kirim <span className="text-[#AB03A9]">*</span>
            </label>
            <input
              id="customService"
              type="text"
              value={customService}
              onChange={(e) => onCustomServiceChange(e.target.value)}
              placeholder="Masukkan nama jasa kirim"
              className="w-full px-4 py-2.5 sm:py-3 bg-slate-50/70 border border-slate-200 text-sm rounded-xl transition-all focus:bg-white focus:outline-none focus:border-[#AB03A9] focus:ring-2 focus:ring-[#AB03A9]/15"
            />
          </div>
        )}
      </div>
    </div>
  );
};
