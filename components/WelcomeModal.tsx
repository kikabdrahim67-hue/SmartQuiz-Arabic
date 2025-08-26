import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md m-4 transform transition-all animate-pop-in-subtle border border-slate-200 dark:border-slate-700 text-center"
      >
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            🎮 مرحباً بك!
        </h2>
        <p className="text-slate-700 dark:text-slate-300 mb-6 text-lg">
            أنت على وشك اختبار ذكائك في لعبة لا تنتهي!
            <br />
            اختر فئة، وابدأ التحدي الآن!
        </p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 transform hover:scale-105 shadow-lg"
          >
            لنبدأ!
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WelcomeModal);