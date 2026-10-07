import React from 'react';
import { Save, Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  isLoading: boolean;
  progressText: string;
  onClick: () => void;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoading,
  progressText,
  onClick,
}) => {
  return (
    <div className="pt-2 pb-6">
      <button
        type="button"
        disabled={isLoading}
        onClick={onClick}
        className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg active:scale-[0.99] ${
          isLoading
            ? 'bg-purple-900/80 text-white cursor-not-allowed opacity-90'
            : 'bg-[#AB03A9] hover:bg-[#920290] text-white shadow-purple-900/25 hover:shadow-purple-900/35 hover:-translate-y-0.5'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-white" />
            <span>Menyimpan Laporan...</span>
          </>
        ) : (
          <>
            <Save className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Simpan Laporan</span>
          </>
        )}
      </button>

      {/* Progress subtext indicator during loading */}
      {isLoading && progressText && (
        <div className="mt-2.5 text-center">
          <p className="text-xs font-semibold text-purple-900 animate-pulse">
            {progressText}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Mohon jangan menutup aplikasi selama proses penyimpanan berlangsung.
          </p>
        </div>
      )}
    </div>
  );
};
