
import { Question, GameSettings } from "../types";

export function shuffle<T,>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function prepareQuestions(
  pool: Question[],
  settings: GameSettings,
  rng: () => number = Math.random
): Question[] {
  // Add unique IDs if they are missing
  const poolWithIds = pool.map((q, index) => ({
      ...q,
      id: q.id || `q-${index}-${Date.now()}`
  }));

  const shuffledPool = settings.shuffleQuestions ? shuffle(poolWithIds, rng) : [...poolWithIds];
  
  // Slice the required number of questions for modes that have a limit
  const questionLimit = (settings.gameMode === 'classic' || settings.gameMode === 'versus') 
    ? settings.totalQuestions 
    : shuffledPool.length;

  const selectedQuestions = shuffledPool.slice(0, questionLimit);
  
  // Add a surprise question for single-player modes
  if (selectedQuestions.length > 2 && settings.gameMode !== 'versus') {
      const surpriseIndex = Math.floor(rng() * selectedQuestions.length);
      selectedQuestions[surpriseIndex].isSurprise = true;
  }

  if (!settings.shuffleChoices) return selectedQuestions;

  return selectedQuestions.map((q) => {
    const indexed = q.choices.map((c, i) => ({ c, i }));
    const shuffled = shuffle(indexed, rng);
    const newAnswerIndex = shuffled.findIndex((x) => x.i === q.answerIndex);
    return { ...q, choices: shuffled.map((x) => x.c), answerIndex: newAnswerIndex };
  });
}