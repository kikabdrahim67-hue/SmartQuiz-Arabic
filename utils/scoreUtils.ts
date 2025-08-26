import type { GameMode, ScoreEntry } from '../types';

const HIGH_SCORES_KEY = 'quizAppHighScores';
const MAX_SCORES_PER_MODE = 5;

// The stored data will be a Record mapping game modes to arrays of scores
type HighScoresData = Partial<Record<GameMode, ScoreEntry[]>>;

export function getHighScores(mode: GameMode): ScoreEntry[] {
  try {
    const rawData = localStorage.getItem(HIGH_SCORES_KEY);
    if (!rawData) return [];
    const allScores: HighScoresData = JSON.parse(rawData);
    return allScores[mode] || [];
  } catch (e) {
    console.error("Failed to retrieve high scores:", e);
    return [];
  }
}

export function saveHighScore(mode: GameMode, newScore: { score: number; points: number }): boolean {
  try {
    const rawData = localStorage.getItem(HIGH_SCORES_KEY);
    const allScores: HighScoresData = rawData ? JSON.parse(rawData) : {};

    const modeScores = allScores[mode] || [];
    
    // We primarily sort by points, then score as a tie-breaker.
    // Check if the new score is better than the worst score in the list, or if the list isn't full.
    const worstScore = modeScores.length > 0 ? modeScores[modeScores.length - 1] : null;
    const isHighScore = 
        modeScores.length < MAX_SCORES_PER_MODE || 
        (worstScore && (newScore.points > worstScore.points || (newScore.points === worstScore.points && newScore.score > worstScore.score)));

    if (!isHighScore) {
      return false; // Not a high score
    }

    // Add new score and sort
    const newEntry: ScoreEntry = { ...newScore, date: Date.now() };
    const updatedScores = [...modeScores, newEntry];
    
    updatedScores.sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points; // Higher points first
        }
        return b.score - a.score; // Higher score as tie-breaker
    });

    // Trim to the max length
    allScores[mode] = updatedScores.slice(0, MAX_SCORES_PER_MODE);
    
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(allScores));
    return true; // It was a new high score that made it to the list
  } catch (e) {
    console.error("Failed to save high score:", e);
    return false;
  }
}
