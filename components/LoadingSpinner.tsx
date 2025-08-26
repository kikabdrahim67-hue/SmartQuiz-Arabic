import React, { useState, useEffect } from 'react';
import type { GameMode } from '../types';

const GENERIC_MESSAGES = [
  "جاري التواصل مع الذكاء الاصطناعي...",
  "الذكاء الاصطناعي يفكر بعمق...",
  "صياغة أسئلة فريدة من نوعها...",
  "التحقق من جودة المحتوى...",
  "وضع اللمسات الأخيرة...",
  "لحظات قليلة وتكون الأسئلة جاهزة!",
];

interface LoadingSpinnerProps {
  gameMode: GameMode;
}

function LoadingSpinner({ gameMode }: LoadingSpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(0);
    
    const interval = setInterval(() => {
      setMessageIndex(prevIndex => (prevIndex + 1) % GENERIC_MESSAGES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [gameMode]);

  return (
    <div className="flex items-center space-x-2" dir="ltr">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      <span className="text-white">{GENERIC_MESSAGES[messageIndex]}</span>
    </div>
  );
}

export default React.memo(LoadingSpinner);