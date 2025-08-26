import type { Question } from '../types';

const CACHE_KEY_PREFIX = 'quizAppQuestionCache';
const CACHE_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface CachedData {
  timestamp: number;
  questions: Question[];
}

function getCacheKey(category: string, difficulty: string): string {
  return `${CACHE_KEY_PREFIX}_${category}_${difficulty}`;
}

// Gets the entire cache for a category, if valid.
function getCategoryCache(category: string, difficulty: string): CachedData | null {
  try {
    const cacheKey = getCacheKey(category, difficulty);
    const rawData = localStorage.getItem(cacheKey);
    if (!rawData) return null;

    const data: CachedData = JSON.parse(rawData);

    if (Date.now() - data.timestamp > CACHE_EXPIRATION_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return data;
  } catch (e) {
    console.error("Failed to retrieve from cache:", e);
    return null;
  }
}


export function getQuestionsFromCache(category: string, difficulty: string, requiredCount: number): Question[] | null {
  const cache = getCategoryCache(category, difficulty);
  if (cache && cache.questions.length >= requiredCount) {
    return cache.questions;
  }
  return null;
}

export function saveQuestionsToCache(category: string, difficulty: string, newQuestions: Question[]): void {
  if (newQuestions.length === 0) return;
  const cacheKey = getCacheKey(category, difficulty);
  try {
    const existingCache = getCategoryCache(category, difficulty);
    const existingQuestions = existingCache ? existingCache.questions : [];
    
    // Simple de-duplication based on question prompt
    const questionPrompts = new Set(existingQuestions.map(q => q.prompt));
    const uniqueNewQuestions = newQuestions.filter(q => !questionPrompts.has(q.prompt));
    
    if (uniqueNewQuestions.length === 0) return; // No new questions to add

    const combinedQuestions = [...existingQuestions, ...uniqueNewQuestions];
    
    const data: CachedData = {
      timestamp: Date.now(),
      questions: combinedQuestions,
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save questions to cache:", e);
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        // This error should be handled by the caller, maybe with a toast.
        throw new Error("مساحة التخزين ممتلئة. حاول مسح ذاكرة التخزين المؤقت للأسئلة.");
    }
  }
}

export function getCategoryCacheStatus(category: string, difficulty: string): { count: number } {
    const cache = getCategoryCache(category, difficulty);
    return {
        count: cache ? cache.questions.length : 0,
    };
}

export function isCategoryCached(category: string, difficulty: string): boolean {
    return getCategoryCache(category, difficulty) !== null;
}

export function clearAllQuestionCache(): void {
    try {
        let clearedCount = 0;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
                clearedCount++;
            }
        });
        console.log(`Cleared ${clearedCount} cache entries.`);
    } catch (e) {
        console.error("Failed to clear question cache:", e);
    }
}