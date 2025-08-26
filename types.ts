export type Question = {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation?: string;
  difficulty: 'سهل' | 'متوسط' | 'صعب';
  imageUrl?: string;
  sources?: { uri: string, title: string }[];
  isSkipped?: boolean;
  isSurprise?: boolean;
};

export type GameMode = "classic" | "timeAttack" | "suddenDeath" | "survival" | "speedrun" | "versus";
export type Difficulty = 'متغير' | 'سهل' | 'متوسط' | 'صعب';

export type GameSettings = {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  totalQuestions: number;
  category: string; // This will now be the category ID
  gameMode: GameMode;
  difficulty: Difficulty;
  player1Name?: string;
  player2Name?: string;
};

export type QuestionHistoryEntry = {
  question: Question;
  player1AnswerIndex: number | null; // For single player, this is the main player's answer
  player2AnswerIndex?: number | null; // For versus mode
};

export type GameResult = {
  score: number; // Correct answers count for player 1 in versus, or general score
  total?: number; // Total questions for classic/survival
  points?: number;
  mode: GameMode;
  hintsUsed?: number;
  unlockedAchievements?: string[];
  livesLeft?: number;
  category: string; // Add category to result for achievements
  questionsHistory?: QuestionHistoryEntry[];
  // Versus mode specific
  player1Name?: string;
  player2Name?: string;
  player1Score?: number;
  player2Score?: number;
  player1Points?: number;
  player2Points?: number;
  winner?: 'player1' | 'player2' | 'draw';
};

export type GamePhase = "start" | "loading" | "playing" | "finished" | "achievements" | "infoBank";

export type ScoreEntry = {
  score: number;
  points: number;
  date: number; // timestamp
};