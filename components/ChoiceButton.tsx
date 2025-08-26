import React from 'react';
import { CheckIcon, XIcon } from './icons';

interface ChoiceButtonProps {
  label: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  disabled?: boolean;
  isHintedOut?: boolean;
  onClick?: () => void;
  keyboardHint?: string;
  statsPercentage?: number;
  showStats?: boolean;
}

function ChoiceButton({ label, isSelected, isCorrect, isWrong, disabled, isHintedOut, onClick, keyboardHint, statsPercentage, showStats }: ChoiceButtonProps) {
  let baseClasses = "relative w-full text-right p-4 rounded-xl border-2 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 flex justify-between items-center choice-btn-glow overflow-hidden";
  let stateClasses = "";

  if (isCorrect) {
    stateClasses = "bg-green-100 dark:bg-green-900/50 border-green-500 dark:border-green-500 text-green-800 dark:text-green-200 font-bold ring-2 ring-green-500 correct animate-correct-reveal";
  } else if (isWrong) {
    stateClasses = "bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-500 text-red-800 dark:text-red-200 ring-2 ring-red-500 wrong";
  } else if (isSelected) {
    stateClasses = "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 ring-2 ring-indigo-500 selected";
  } else if (isHintedOut) {
    stateClasses = "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed";
  } else {
    stateClasses = "bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500";
  }

  if (disabled && !isCorrect && !isWrong && !isHintedOut) {
    stateClasses += " opacity-60 cursor-not-allowed";
  }
  
  const isDisabled = disabled || isHintedOut;

  const renderIcon = () => {
    if (isCorrect) return <CheckIcon className="h-6 w-6 text-green-600" />;
    if (isWrong) return <XIcon className="h-6 w-6 text-red-600" />;
    return <div className="h-6 w-6"></div>; // Placeholder for alignment
  };

  return (
    <button className={`${baseClasses} ${stateClasses}`} onClick={onClick} disabled={isDisabled}>
        {showStats && statsPercentage !== undefined && (
            <div 
                className="absolute top-0 right-0 bottom-0 bg-slate-200 dark:bg-slate-600/50 transition-all duration-500 ease-out"
                style={{ width: `${statsPercentage}%` }}
            />
        )}
        <div className="relative z-10 w-full flex justify-between items-center">
            <span className="text-lg font-medium text-slate-800 dark:text-slate-200">{label}</span>
            <div className="flex items-center gap-3">
                {showStats && statsPercentage !== undefined && (
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{statsPercentage}%</span>
                )}
                {renderIcon()}
            </div>
        </div>
        {keyboardHint && <span className="absolute top-1 right-2 text-xs font-bold text-slate-400 dark:text-slate-500 select-none z-10" aria-hidden="true">{keyboardHint}</span>}
    </button>
  );
}

export default React.memo(ChoiceButton);