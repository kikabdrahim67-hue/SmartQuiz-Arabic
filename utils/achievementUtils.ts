import type { GameResult } from '../types';
import { ACHIEVEMENTS } from '../constants';

const PROGRESS_KEY = 'quizAppAchievementProgress';

type AchievementProgress = {
  totalCorrectAnswers: number;
  playedCategories: Set<string>;
  gamesPlayed: number;
};

function getAchievementProgress(): AchievementProgress {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    const data = saved ? JSON.parse(saved) : {};
    return {
      totalCorrectAnswers: data.totalCorrectAnswers || 0,
      playedCategories: new Set(data.playedCategories || []),
      gamesPlayed: data.gamesPlayed || 0,
    };
  } catch {
    return {
      totalCorrectAnswers: 0,
      playedCategories: new Set(),
      gamesPlayed: 0,
    };
  }
}

export function updateAchievementProgress(result: GameResult) {
  const progress = getAchievementProgress();
  progress.totalCorrectAnswers += result.score;
  progress.gamesPlayed += 1;
  if (result.category) {
    progress.playedCategories.add(result.category);
  }
  
  try {
    // Convert Set to Array for JSON serialization
    const dataToSave = {
        ...progress,
        playedCategories: Array.from(progress.playedCategories)
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Failed to save achievement progress:', e);
  }
}

export function checkAndUnlockAchievements(result: GameResult, onUnlock: (id: string) => void) {
  const progress = getAchievementProgress();
  const unlocked = new Set(JSON.parse(localStorage.getItem('unlockedAchievements') || '[]'));

  const { score, total, mode, livesLeft } = result;

  const check = (id: string, condition: boolean) => {
    if (!unlocked.has(id) && condition) {
      onUnlock(id);
    }
  };
  
  // General achievements
  check(ACHIEVEMENTS.FIRST_GAME.id, progress.gamesPlayed >= 1);
  check(ACHIEVEMENTS.QUIZ_MASTER.id, progress.totalCorrectAnswers >= 50);
  check(ACHIEVEMENTS.ENCYCLOPEDIA.id, progress.playedCategories.size >= 5);
  
  // Mode-specific achievements
  switch (mode) {
    case 'classic':
      check(ACHIEVEMENTS.CLASSIC_EXPERT.id, total !== undefined && total >= 10 && score === total);
      break;
    case 'timeAttack':
      check(ACHIEVEMENTS.TIME_ATTACK_PRO.id, score >= 15);
      break;
    case 'suddenDeath':
      check(ACHIEVEMENTS.SURVIVOR_STREAK.id, score >= 10);
      break;
    case 'survival':
      check(ACHIEVEMENTS.ULTIMATE_SURVIVOR.id, total !== undefined && score === total && livesLeft === 3);
      break;
  }
}