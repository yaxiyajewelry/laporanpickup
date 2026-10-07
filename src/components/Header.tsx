import React from 'react';
import { ClipboardEdit, FileText } from 'lucide-react';

export type ActiveTab = 'input' | 'laporan';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  todayReportCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  todayReportCount,
}) => {
  return (
    <header className="bg-white border-b border-purple-100/80 shadow-sm sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 py-3 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white shadow-md border border-purple-100 flex-shrink-0 flex items-center justify-center p-0.5 ring-2 ring-purple-100/70">
              <img
                src="https://cdn.phototourl.com/member/2026-10-07-4d2217af-2933-40b4-ad4f-ca09af6fda85.jpg"
                alt="Logo Yaxiya Jewelry"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                YAXIYA <span className="text-[#AB03A9]">JEWELRY</span>
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
                Sistem Aplikasi Pickup
              </p>
            </div>
          </div>

          {/* DUA TOMBOL TAB MENU DI BAGIAN ATAS: INPUT DATA & LAPORAN */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 sm:w-72">
            {/* Tab 1: INPUT DATA */}
            <button
              type="button"
              onClick={() => onTabChange('input')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'input'
                  ? 'bg-gradient-to-r from-[#8E028C] to-[#AB03A9] text-white shadow-md shadow-purple-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ClipboardEdit className="w-4 h-4" />
              <span>INPUT DATA</span>
            </button>

            {/* Tab 2: LAPORAN */}
            <button
              type="button"
              onClick={() => onTabChange('laporan')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
                activeTab === 'laporan'
                  ? 'bg-gradient-to-r from-[#8E028C] to-[#AB03A9] text-white shadow-md shadow-purple-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>LAPORAN</span>
              {todayReportCount > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full transition-colors ${
                    activeTab === 'laporan'
                      ? 'bg-white text-[#AB03A9]'
                      : 'bg-[#AB03A9] text-white'
                  }`}
                >
                  {todayReportCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
