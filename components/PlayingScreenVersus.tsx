import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Question, GameResult, GameSettings, QuestionHistoryEntry } from '../types';
import ProgressBar from './ProgressBar';
import ChoiceButton from './ChoiceButton';
import { ExitIcon } from './icons';
import { playCorrectSound, playIncorrectSound } from '../services/audioService';
import confetti from 'https://esm.sh/canvas-confetti';

interface PlayingScreenVersusProps {
  questions: Question[];
  settings: GameSettings;
  category: string;
  onGameFinish: (result: GameResult) => void;
  onQuit: () => void;
}

const DIFFICULTY_POINTS = { 'سهل': 10, 'متوسط': 20, 'صعب': 30 };
const SPEED_BONUS = 10;
const REVEAL_DELAY_MS = 2000; // Time after reveal before next question
const PRE_REVEAL_COUNTDOWN = 3; // Seconds before showing the answer

function PlayingScreenVersus({ questions, settings, category, onGameFinish, onQuit }: PlayingScreenVersusProps) {
  const [current, setCurrent] = useState(0);
  const [p1Selection, setP1Selection] = useState<{ choice: number, time: number } | null>(null);
  const [p2Selection, setP2Selection] = useState<{ choice: number, time: number } | null>(null);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Points, setP1Points] = useState(0);
  const [p2Points, setP2Points] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [speedBonusWinner, setSpeedBonusWinner] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [history, setHistory] = useState<QuestionHistoryEntry[]>([]);

  const currentQuestion = questions[current];
  const { player1Name = 'لاعب 1', player2Name = 'لاعب 2' } = settings;
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);


  const handleGameEnd = useCallback(() => {
    let winner: 'player1' | 'player2' | 'draw';
    if (p1Points > p2Points) {
      winner = 'player1';
    } else if (p2Points > p1Points) {
      winner = 'player2';
    } else {
      winner = 'draw';
    }
    
    const result: GameResult = {
      score: p1Score, // Base score
      total: questions.length,
      mode: 'versus',
      category,
      questionsHistory: history,
      player1Name,
      player2Name,
      player1Score: p1Score,
      player2Score: p2Score,
      player1Points: p1Points,
      player2Points: p2Points,
      winner,
    };
    onGameFinish(result);
  }, [onGameFinish, p1Score, p2Score, p1Points, p2Points, questions.length, category, player1Name, player2Name, history]);

  const handleNext = useCallback(() => {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
      setP1Selection(null);
      setP2Selection(null);
      setIsRevealed(false);
      setSpeedBonusWinner(null);
      setCountdown(null);
    } else {
      handleGameEnd();
    }
  }, [current, questions.length, handleGameEnd]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Effect to START the countdown once both players have made a selection
  useEffect(() => {
    if (p1Selection && p2Selection && !isRevealed) {
      setCountdown(PRE_REVEAL_COUNTDOWN);
    }
  }, [p1Selection, p2Selection, isRevealed]);

  // Effect to TICK the countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(c => (c !== null ? c - 1 : null));
      }, 1000);
      return () => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      };
    }
  }, [countdown]);

  // Effect to REVEAL the answer when countdown reaches zero
  useEffect(() => {
    if (countdown === 0) {
      setIsRevealed(true);
      
      // Ensure selections are not null before proceeding
      if (!p1Selection || !p2Selection) return;

      const newHistoryEntry = { 
        question: currentQuestion, 
        player1AnswerIndex: p1Selection.choice, 
        player2AnswerIndex: p2Selection.choice 
      };
      setHistory(h => [...h, newHistoryEntry]);

      const p1Correct = p1Selection.choice === currentQuestion.answerIndex;
      const p2Correct = p2Selection.choice === currentQuestion.answerIndex;
      const questionPoints = DIFFICULTY_POINTS[currentQuestion.difficulty] || 10;
      
      let p1PointsGained = 0;
      let p2PointsGained = 0;
      
      if (p1Correct) {
        setP1Score(s => s + 1);
        p1PointsGained += questionPoints;
      }
      if (p2Correct) {
        setP2Score(s => s + 1);
        p2PointsGained += questionPoints;
      }
      
      if(p1Correct && p2Correct) {
          if (p1Selection.time < p2Selection.time) {
              p1PointsGained += SPEED_BONUS;
              setSpeedBonusWinner(player1Name);
          } else {
              p2PointsGained += SPEED_BONUS;
              setSpeedBonusWinner(player2Name);
          }
      }

      setP1Points(p => p + p1PointsGained);
      setP2Points(p => p + p2PointsGained);

      if (p1Correct || p2Correct) {
          playCorrectSound();
      } else {
          playIncorrectSound();
      }
      
      revealTimeoutRef.current = setTimeout(handleNext, REVEAL_DELAY_MS);
    }
  }, [countdown, currentQuestion, p1Selection, p2Selection, handleNext, player1Name, player2Name]);

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRevealed || countdown !== null) return;

      if (p1Selection === null && ['1', '2', '3', '4'].includes(e.key)) {
        const choiceIndex = parseInt(e.key) - 1;
        if (choiceIndex < currentQuestion.choices.length) {
          setP1Selection({ choice: choiceIndex, time: Date.now() });
        }
      }
      
      if (p2Selection === null && ['7', '8', '9', '0'].includes(e.key)) {
        const keyMap: { [key: string]: number } = { '7': 0, '8': 1, '9': 2, '0': 3 };
        const choiceIndex = keyMap[e.key];
        if (choiceIndex < currentQuestion.choices.length) {
          setP2Selection({ choice: choiceIndex, time: Date.now() });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [p1Selection, p2Selection, currentQuestion, isRevealed, countdown]);

  if (!currentQuestion) {
    return <div className="text-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl">تحميل الأسئلة...</div>;
  }
  
  const renderPlayerStatus = (selection: {choice: number, time: number} | null) => {
      if (isRevealed && countdown === null) return null;
      if (selection !== null) {
          return <span className="text-sm font-bold text-green-600 dark:text-green-400">تم الاختيار!</span>;
      }
      return <span className="text-sm text-slate-500 dark:text-slate-400">ينتظر...</span>;
  }

  return (
    <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 animate-fade-in border border-white/30 dark:border-slate-700/50">
       {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl animate-fade-in">
              <div key={countdown} className="text-9xl font-extrabold text-white animate-countdown-pop">{countdown}</div>
          </div>
      )}
      <div className="absolute top-3 left-3 z-10">
         <button 
            onClick={onQuit}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="الخروج من اللعبة"
         >
            <ExitIcon className="h-6 w-6" />
         </button>
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">سؤال {current + 1} من {questions.length}</p>
        <ProgressBar current={current} total={questions.length} />
      </div>

      {currentQuestion.imageUrl && (
        <div className="my-4 rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700 max-w-md mx-auto">
            <img src={currentQuestion.imageUrl} alt="سؤال الصورة" className="w-full h-auto object-contain max-h-60 bg-slate-100 dark:bg-slate-800" />
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 my-4 sm:my-6 text-center min-h-[5rem] flex items-center justify-center">
        {currentQuestion.prompt}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 lg:gap-x-8 gap-y-6">
        {/* Player 1 Area */}
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-800">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-300">{player1Name}</h3>
                {renderPlayerStatus(p1Selection)}
            </div>
            <div className="space-y-3">
                {currentQuestion.choices.map((choice, index) => {
                    const isSelected = p1Selection?.choice === index;
                    const isCorrect = isRevealed && index === currentQuestion.answerIndex;
                    const isWrong = isRevealed && isSelected && !isCorrect;
                    return (
                        <ChoiceButton
                            key={`p1-${index}`}
                            label={choice}
                            isSelected={!!isSelected}
                            isCorrect={isCorrect}
                            isWrong={isWrong}
                            disabled={p1Selection !== null || isRevealed}
                            onClick={() => { if (p1Selection === null) setP1Selection({ choice: index, time: Date.now() }); }}
                            keyboardHint={`${index + 1}`}
                        />
                    );
                })}
            </div>
            <p className="text-center mt-3 font-semibold text-indigo-700 dark:text-indigo-400">
                النقاط: {p1Points}
                {speedBonusWinner === player1Name && <span className="text-amber-500 font-bold animate-fade-in"> +{SPEED_BONUS}!</span>}
            </p>
        </div>

        {/* Player 2 Area */}
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300">{player2Name}</h3>
                {renderPlayerStatus(p2Selection)}
            </div>
            <div className="space-y-3">
                 {currentQuestion.choices.map((choice, index) => {
                    const isSelected = p2Selection?.choice === index;
                    const isCorrect = isRevealed && index === currentQuestion.answerIndex;
                    const isWrong = isRevealed && isSelected && !isCorrect;
                    const keyMap = ['7', '8', '9', '0'];
                    return (
                        <ChoiceButton
                            key={`p2-${index}`}
                            label={choice}
                            isSelected={!!isSelected}
                            isCorrect={isCorrect}
                            isWrong={isWrong}
                            disabled={p2Selection !== null || isRevealed}
                            onClick={() => { if (p2Selection === null) setP2Selection({ choice: index, time: Date.now() }); }}
                            keyboardHint={keyMap[index]}
                        />
                    );
                })}
            </div>
            <p className="text-center mt-3 font-semibold text-red-700 dark:text-red-400">
                النقاط: {p2Points}
                {speedBonusWinner === player2Name && <span className="text-amber-500 font-bold animate-fade-in"> +{SPEED_BONUS}!</span>}
            </p>
        </div>
      </div>
       <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>تحكم لاعب 1: مفاتيح <kbd className="font-sans">1</kbd> <kbd className="font-sans">2</kbd> <kbd className="font-sans">3</kbd> <kbd className="font-sans">4</kbd></p>
            <p>تحكم لاعب 2: مفاتيح <kbd className="font-sans">7</kbd> <kbd className="font-sans">8</kbd> <kbd className="font-sans">9</kbd> <kbd className="font-sans">0</kbd></p>
       </div>
    </div>
  );
}

export default React.memo(PlayingScreenVersus);