import React from 'react';
import type { GameSettings, GameMode, Difficulty } from '../types';
import { QUIZ_CATEGORIES, GAME_MODES, DIFFICULTY_LEVELS } from '../constants';
import { clamp } from '../utils/quizUtils';
import { initAudio } from '../services/audioService';
import LoadingSpinner from './LoadingSpinner';
import { TrophyIcon, DatabaseIcon } from './icons';

interface StartScreenProps {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  onStartGame: (settings: GameSettings) => void;
  onShowAchievements: () => void;
  onShowInfoBank: () => void;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
}

const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
    'متغير': 'مزيج من الأسئلة السهلة والمتوسطة والصعبة.',
    'سهل': 'أسئلة مباشرة ومن المعلومات العامة المعروفة.',
    'متوسط': 'أسئلة تتطلب معرفة أعمق قليلاً.',
    'صعب': 'أسئلة للمحترفين وتتطلب معلومات دقيقة.'
};

const MODE_COLORS = {
  indigo: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    hoverBg: 'hover:bg-indigo-200/70 dark:hover:bg-indigo-900/70',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-700',
    selected: 'ring-indigo-500 bg-indigo-200/80 dark:bg-indigo-900 border-indigo-500'
  },
  sky: {
    bg: 'bg-sky-100 dark:bg-sky-900/50',
    hoverBg: 'hover:bg-sky-200/70 dark:hover:bg-sky-900/70',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-700',
    selected: 'ring-sky-500 bg-sky-200/80 dark:bg-sky-900 border-sky-500'
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    hoverBg: 'hover:bg-amber-200/70 dark:hover:bg-amber-900/70',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    selected: 'ring-amber-500 bg-amber-200/80 dark:bg-amber-900 border-amber-500'
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/50',
    hoverBg: 'hover:bg-red-200/70 dark:hover:bg-red-900/70',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    selected: 'ring-red-500 bg-red-200/80 dark:bg-red-900 border-red-500'
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    hoverBg: 'hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    selected: 'ring-emerald-500 bg-emerald-200/80 dark:bg-emerald-900 border-emerald-500'
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-900/50',
    hoverBg: 'hover:bg-violet-200/70 dark:hover:bg-violet-900/70',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-300 dark:border-violet-700',
    selected: 'ring-violet-500 bg-violet-200/80 dark:bg-violet-900 border-violet-500'
  }
};


function StartScreen({ settings, setSettings, onStartGame, onShowAchievements, onShowInfoBank, isLoading, error, isOnline }: StartScreenProps) {

  const handleStartGame = () => {
    initAudio(); // Initialize on first user interaction
    onStartGame(settings);
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 animate-fade-in border border-white/30 dark:border-slate-700/50">
      <div className="text-center relative">
        <div className="absolute -top-2 right-0 flex gap-2">
            <button
                onClick={onShowAchievements}
                className="p-2 rounded-full text-amber-500 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label="عرض الإنجازات"
            >
                <TrophyIcon className="h-7 w-7" />
            </button>
            <button
                onClick={onShowInfoBank}
                className="p-2 rounded-full text-sky-500 dark:text-sky-400 bg-sky-100/50 dark:bg-sky-900/50 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label="بنك المعلومات"
            >
                <DatabaseIcon className="h-7 w-7" />
            </button>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">مرحباً بك!</h2>
        <p className="text-slate-700 dark:text-slate-300 mt-1">اختر وضع اللعبة والإعدادات ثم اضغط "ابدأ".</p>
      </div>

      {!isOnline && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 p-4 rounded-md text-center" role="alert">
          <p className="font-bold">أنت غير متصل بالإنترنت</p>
          <p className="text-sm">يمكنك لعب الأسئلة المحفوظة فقط. قد لا تعمل بعض الميزات.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <p className="font-bold">حدث خطأ</p>
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                اختر وضع اللعبة
            </label>
            <div role="radiogroup" aria-label="أوضاع اللعبة" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {GAME_MODES.map((mode) => {
                const isSelected = settings.gameMode === mode.id;
                const colors = MODE_COLORS[mode.color as keyof typeof MODE_COLORS] || MODE_COLORS.indigo;
                const Icon = mode.icon;
                return(
                  <button
                    key={mode.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSettings(s => ({...s, gameMode: mode.id}))}
                    className={`text-center p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm ${colors.bg} ${colors.hoverBg} ${colors.border} ${isSelected ? colors.selected : ''}`}
                  >
                    <Icon className={`h-8 w-8 mx-auto mb-2 ${colors.text}`} />
                    <p className={`font-bold ${colors.text}`}>{mode.name}</p>
                    <p className={`text-xs mt-1 ${colors.text} opacity-80`}>{mode.description}</p>
                  </button>
                )
              })}
            </div>
        </div>

        <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                اختر مستوى الصعوبة
            </label>
            <div role="radiogroup" aria-label="مستويات الصعوبة" className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  role="radio"
                  aria-checked={settings.difficulty === level.id}
                  onClick={() => setSettings(s => ({...s, difficulty: level.id}))}
                  className={`w-full rounded-md py-2 px-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${settings.difficulty === level.id 
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow' 
                      : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {level.name}
                </button>
              ))}
            </div>
             <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2 min-h-[20px]">
              {DIFFICULTY_DESCRIPTIONS[settings.difficulty]}
            </p>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
            اختر مجالاً
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {QUIZ_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = settings.category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSettings(s => ({ ...s, category: cat.id }))}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${isSelected 
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 border-indigo-500 shadow-md' 
                      : 'bg-white/80 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 hover:border-indigo-400'}`}
                >
                  <Icon className={`h-8 w-8 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`} />
                  <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {settings.gameMode === 'versus' && (
            <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                    <label htmlFor="player1Name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        اسم اللاعب الأول
                    </label>
                    <input
                        id="player1Name"
                        type="text"
                        value={settings.player1Name}
                        onChange={(e) => setSettings(s => ({ ...s, player1Name: e.target.value }))}
                        className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                        placeholder="لاعب 1"
                    />
                </div>
                <div>
                    <label htmlFor="player2Name" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        اسم اللاعب الثاني
                    </label>
                    <input
                        id="player2Name"
                        type="text"
                        value={settings.player2Name}
                        onChange={(e) => setSettings(s => ({ ...s, player2Name: e.target.value }))}
                        className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500 p-2"
                        placeholder="لاعب 2"
                    />
                </div>
            </div>
        )}

        {(settings.gameMode === 'classic' || settings.gameMode === 'versus') && (
          <div className="animate-fade-in">
            <label htmlFor="totalQuestions" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              عدد الأسئلة
            </label>
            <input
              id="totalQuestions"
              type="number"
              min={3}
              max={20}
              value={settings.totalQuestions}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  totalQuestions: clamp(Number(e.target.value) || 3, 3, 20),
                }))
              }
              className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-center"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleStartGame}
        disabled={isLoading}
        className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-lg font-semibold shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105 disabled:bg-indigo-400 disabled:cursor-wait"
      >
        {isLoading ? <LoadingSpinner gameMode={settings.gameMode} /> : "ابدأ اللعبة"}
      </button>
    </div>
  );
}

export default React.memo(StartScreen);