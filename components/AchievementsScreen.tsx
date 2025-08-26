import React from 'react';
import { ACHIEVEMENTS } from '../constants';
import { TrophyIcon, ArrowRightIcon } from './icons';

interface AchievementsScreenProps {
  unlockedAchievements: Set<string>;
  onBack: () => void;
}

function AchievementsScreen({ unlockedAchievements, onBack }: AchievementsScreenProps) {
  const allAchievementKeys = Object.keys(ACHIEVEMENTS);

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in border border-white/30 dark:border-slate-700/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <TrophyIcon className="h-8 w-8 text-amber-500" />
          الإنجازات
        </h2>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
        >
          العودة
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAchievementKeys.map(key => {
          const achievement = ACHIEVEMENTS[key as keyof typeof ACHIEVEMENTS];
          const isUnlocked = unlockedAchievements.has(achievement.id);

          return (
            <div
              key={achievement.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                isUnlocked
                  ? 'bg-amber-50 dark:bg-amber-900/40 border-amber-300 dark:border-amber-600/70'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 p-2 rounded-full ${
                    isUnlocked ? 'bg-amber-200 dark:bg-amber-500/50' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  <TrophyIcon className={`h-6 w-6 ${
                      isUnlocked ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
                  }`} />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${
                      isUnlocked ? 'text-amber-900 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {achievement.name}
                  </h3>
                  <p className={`text-sm ${
                      isUnlocked ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(AchievementsScreen);