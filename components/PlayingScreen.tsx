import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Question, GameResult, GameSettings, QuestionHistoryEntry } from '../types';
import ProgressBar from './ProgressBar';
import ChoiceButton from './ChoiceButton';
import { 
    ClipboardIcon, ExitIcon, FireIcon, FiftyFiftyIcon, LightBulbIcon, 
    ShieldIcon, ArrowSmRightIcon, GiftIcon
} from './icons';
import confetti from 'https://esm.sh/canvas-confetti';
import { playCorrectSound, playIncorrectSound, playStreakSound } from '../services/audioService';
import { generateSmartHint, generateFunFact } from '../services/geminiService';
import { useGamepad } from '../hooks/useGamepad';

interface PlayingScreenProps {
  questions: Question[];
  settings: GameSettings;
  onGameFinish: (result: GameResult) => void;
  onQuit: () => void;
  addToast: (message: string, icon?: React.ReactNode) => void;
  isOnline: boolean;
}

const TIME_LIMIT_SECONDS = 60;
const SPEEDRUN_TIME_PER_QUESTION = 5;
const SUDDEN_DEATH_TIMER_START = 10;
const DIFFICULTY_POINTS = { 'سهل': 10, 'متوسط': 20, 'صعب': 30 };
const SURVIVAL_LIVES = 3;

function PlayingScreen({ questions, settings, onGameFinish, onQuit, addToast, isOnline }: PlayingScreenProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0); // correct answer count
  const [points, setPoints] = useState(0); // graded points
  const [lives, setLives] = useState(SURVIVAL_LIVES);
  const [timer, setTimer] = useState(TIME_LIMIT_SECONDS);
  
  const questionStartTime = useRef<number>(Date.now());
  const [feedbackClass, setFeedbackClass] = useState('');
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(0);
  const [lastStreak, setLastStreak] = useState(0);
  const [questionsState, setQuestionsState] = useState(questions);
  const [history, setHistory] = useState<QuestionHistoryEntry[]>([]);
  
  // New state for mode enhancements
  const [hintedOutChoices, setHintedOutChoices] = useState<number[]>([]);
  const [smartHintText, setSmartHintText] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [secondChances] = useState(1); // For Sudden Death
  const [usedSecondChance, setUsedSecondChance] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(SPEEDRUN_TIME_PER_QUESTION);
  const [suddenDeathTimer, setSuddenDeathTimer] = useState(SUDDEN_DEATH_TIMER_START);
  const [speedrunCombo, setSpeedrunCombo] = useState(0);
  const [hasSkipped, setHasSkipped] = useState(false);
  
  // New state for Fun Facts and Global Stats
  const [funFact, setFunFact] = useState<{ text: string, isLoading: boolean } | null>(null);
  const [answerStats, setAnswerStats] = useState<number[] | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameMode = settings.gameMode;
  const currentQuestion = questionsState[current];
  const hasAnswered = selected !== null;

  const handleGameEnd = useCallback(() => {
    let result: GameResult;
    switch (gameMode) {
      case 'timeAttack':
        result = { score, points, mode: 'timeAttack', category: settings.category, questionsHistory: history };
        break;
      case 'suddenDeath':
        result = { score, points, mode: 'suddenDeath', category: settings.category, questionsHistory: history }; // score is the streak
        break;
      case 'survival':
        result = { score, points, total: history.length, mode: 'survival', livesLeft: lives, category: settings.category, questionsHistory: history };
        break;
      default:
        result = { score, points, total: history.length, mode: gameMode, category: settings.category, questionsHistory: history };
        break;
    }
    onGameFinish(result);
  }, [gameMode, onGameFinish, score, points, lives, settings.category, history]);
  
  const handleNext = useCallback(() => {
    setFeedbackClass('');
    if (current + 1 < questionsState.length) {
      setCurrent(c => c + 1);
      setSelected(null);
      setCopied(false);
      setHintedOutChoices([]);
      setSmartHintText(null);
      setSpeedrunCombo(0);
      setFunFact(null);
      setAnswerStats(null);
      questionStartTime.current = Date.now();
      if (gameMode === 'speedrun') setQuestionTimer(SPEEDRUN_TIME_PER_QUESTION);
      if (gameMode === 'suddenDeath') setSuddenDeathTimer(Math.max(3, SUDDEN_DEATH_TIMER_START - current));

    } else {
      handleGameEnd();
    }
  }, [current, questionsState.length, gameMode, handleGameEnd]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const generateAnswerStats = (correctIndex: number, difficulty: 'سهل' | 'متوسط' | 'صعب'): number[] => {
      let correctChance: number;
      switch(difficulty) {
          case 'سهل': correctChance = 0.6 + Math.random() * 0.2; break; // 60-80%
          case 'متوسط': correctChance = 0.4 + Math.random() * 0.2; break; // 40-60%
          case 'صعب': correctChance = 0.2 + Math.random() * 0.2; break; // 20-40%
          default: correctChance = 0.45 + Math.random() * 0.2; // 45-65%
      }
      
      const stats = [0, 0, 0, 0];
      stats[correctIndex] = Math.round(correctChance * 100);
      
      let remaining = 100 - stats[correctIndex];
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
      
      for (let i = 0; i < wrongIndices.length - 1; i++) {
          const randShare = Math.round(Math.random() * remaining);
          stats[wrongIndices[i]] = randShare;
          remaining -= randShare;
      }
      stats[wrongIndices[wrongIndices.length - 1]] = remaining;
      
      return stats;
  };

  const handleSelectChoice = useCallback((choiceIndex: number) => {
    if (hasAnswered || hintedOutChoices.includes(choiceIndex)) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSelected(choiceIndex);
    const isCorrect = choiceIndex === currentQuestion.answerIndex;
    const timeTaken = (Date.now() - questionStartTime.current) / 1000;
    
    const newHistoryEntry = { question: currentQuestion, player1AnswerIndex: choiceIndex };
    setHistory(h => [...h, newHistoryEntry]);

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore(s => s + 1);
      
      let questionPoints = DIFFICULTY_POINTS[currentQuestion.difficulty] || 10;
      let comboMultiplier = 1;

      if (gameMode === 'speedrun' && timeTaken < 2) {
          const newCombo = speedrunCombo + 1;
          setSpeedrunCombo(newCombo);
          comboMultiplier = Math.min(4, 1 + newCombo); // up to x4
          questionPoints *= comboMultiplier;
      }
      
      let streakBonus = Math.max(0, (newStreak - 1) * 5);
      
      if (currentQuestion.isSurprise) {
          questionPoints *= 2;
          streakBonus *= 2;
          addToast("🎁 نقاط مضاعفة!", <GiftIcon className="h-5 w-5 text-amber-400"/>);
      }

      setPoints(p => p + questionPoints + streakBonus);

      setFeedbackClass('correct');
      if(newStreak > 1) playStreakSound(newStreak);
      else playCorrectSound();
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 1000 });
      
      if (gameMode === 'timeAttack') setTimer(t => t + 2);
      if (gameMode === 'survival' && lives < SURVIVAL_LIVES && newStreak > 0 && newStreak % 5 === 0) {
        setLives(l => l + 1);
        addToast("استعادة محاولة!", "❤️");
      }
      if (gameMode === 'survival' && lives === 1 && newStreak === 0) { // First correct answer on last life
          handleUse5050Hint(true); // Lifeline
          addToast("شريان حياة! تم تفعيل 50/50.", <FiftyFiftyIcon className="h-5 w-5"/>);
      }
      
      timeoutRef.current = setTimeout(handleNext, 1200);

    } else { // Incorrect Answer
      setLastStreak(streak);
      setStreak(0);
      setSpeedrunCombo(0);
      setFeedbackClass('wrong');
      playIncorrectSound();
      
      if (gameMode === 'timeAttack') setTimer(t => Math.max(0, t - 3));

      if (gameMode === 'suddenDeath') {
        if (!usedSecondChance) {
          setUsedSecondChance(true);
          addToast("تم استخدام الفرصة الثانية!", <ShieldIcon className="h-5 w-5"/>);
          timeoutRef.current = setTimeout(handleNext, 1500);
        } else {
          timeoutRef.current = setTimeout(handleGameEnd, 1500);
        }
      } else if (gameMode === 'survival') {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          timeoutRef.current = setTimeout(handleGameEnd, 1500);
        } else {
          timeoutRef.current = setTimeout(handleNext, 1500);
        }
      } else {
        timeoutRef.current = setTimeout(handleNext, 1500);
      }
    }
    
    // Generate stats and fun fact for all answers
    setAnswerStats(generateAnswerStats(currentQuestion.answerIndex, currentQuestion.difficulty));
    
    if (isOnline) {
      setFunFact({ text: '', isLoading: true });
      generateFunFact(currentQuestion)
          .then(fact => setFunFact({ text: fact, isLoading: false }))
          .catch(() => setFunFact(null)); // Hide on error
    } else {
      setFunFact(null);
    }

  }, [hasAnswered, currentQuestion, gameMode, lives, streak, usedSecondChance, handleGameEnd, handleNext, addToast, hintedOutChoices, speedrunCombo, isOnline]);
  
    // Ref pattern to safely call the latest handleSelectChoice from a useEffect without dependency cycles
    const handleSelectChoiceRef = useRef(handleSelectChoice);
    useEffect(() => {
        handleSelectChoiceRef.current = handleSelectChoice;
    });

  const handleUse5050Hint = (isFree: boolean = false) => {
    if (hasAnswered || hintedOutChoices.length > 0) return;

    const wrongChoices = currentQuestion.choices
        .map((_, i) => i)
        .filter(i => i !== currentQuestion.answerIndex);
    
    // Shuffle wrong choices and pick two to remove
    for (let i = wrongChoices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongChoices[i], wrongChoices[j]] = [wrongChoices[j], wrongChoices[i]];
    }
    setHintedOutChoices(wrongChoices.slice(0, 2));
  };
  
  const handleSkip = () => {
    if (hasSkipped || hasAnswered) return;
    setHasSkipped(true);
    addToast("تم تخطي السؤال!", <ArrowSmRightIcon className="h-5 w-5"/>);
    
    // Mark as skipped and move to the next question
    const newQuestions = [...questionsState];
    newQuestions[current].isSkipped = true;
    setQuestionsState(newQuestions);

    const newHistoryEntry = { question: newQuestions[current], player1AnswerIndex: null };
    setHistory(h => [...h, newHistoryEntry]);

    setTimeout(handleNext, 500);
  };

  const handleUseSmartHint = async () => {
    if (hasAnswered || smartHintText || isHintLoading) return;
    if (!isOnline) {
        addToast("لا يمكن استخدام التلميح وأنت غير متصل بالإنترنت.");
        return;
    }
    setIsHintLoading(true);
    try {
        const hint = await generateSmartHint(currentQuestion);
        setSmartHintText(hint);
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "حدث خطأ في التلميح.";
        addToast(errorMessage);
    } finally {
        setIsHintLoading(false);
    }
  };


  // Gamepad controls
  useGamepad({
    onChoiceSelect: (index: number) => {
      if (currentQuestion.choices.length > index && !hintedOutChoices.includes(index)) {
        handleSelectChoice(index);
      }
    },
  });

  const handleCopy = () => {
    if (!currentQuestion.explanation) return;
    navigator.clipboard.writeText(currentQuestion.explanation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Timers for different game modes
  useEffect(() => {
    if (!hasAnswered) {
        let intervalId: NodeJS.Timeout | undefined;
        if (gameMode === 'timeAttack' && timer > 0) {
            intervalId = setInterval(() => setTimer(t => t - 1), 1000);
        } else if (gameMode === 'speedrun' && questionTimer > 0) {
            intervalId = setInterval(() => setQuestionTimer(t => t - 1), 1000);
        } else if (gameMode === 'suddenDeath' && suddenDeathTimer > 0) {
            intervalId = setInterval(() => setSuddenDeathTimer(t => t - 1), 1000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }
  }, [gameMode, timer, questionTimer, suddenDeathTimer, hasAnswered]);

  useEffect(() => {
      if (gameMode === 'timeAttack' && timer <= 0) handleGameEnd();
      if (gameMode === 'speedrun' && questionTimer <= 0) handleSelectChoiceRef.current(-1);
      if (gameMode === 'suddenDeath' && suddenDeathTimer <= 0) handleSelectChoiceRef.current(-1);
  }, [timer, questionTimer, suddenDeathTimer, gameMode, handleGameEnd]);
  
  if (!currentQuestion) {
    return <div className="text-center p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl">لم يتم العثور على أسئلة.</div>;
  }

  const renderTopBar = () => {
    const commonStats = (
      <div className="flex items-center gap-2">
        <div className="text-sm font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-300 px-3 py-1 rounded-full">
            النقاط: {points}
        </div>
      </div>
    );

    switch (gameMode) {
      case 'timeAttack':
        const timerClasses = timer <= 10 ? 'text-red-600 dark:text-red-400 animate-pulse font-extrabold' : 'text-slate-600 dark:text-slate-300';
        return <div className={`text-center font-bold text-2xl transition-colors ${timerClasses}`}>⏳ {timer}</div>;
      case 'speedrun':
        const timerPercentage = (questionTimer / SPEEDRUN_TIME_PER_QUESTION) * 100;
        const timerColor = questionTimer <= 2 ? 'bg-red-500' : 'bg-amber-500';
        return <div className="w-full max-w-xs"><div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 my-1"><div className={`${timerColor} h-2.5 rounded-full`} style={{ width: `${timerPercentage}%`, transition: 'width 1s linear, background-color 0.5s ease' }}/></div></div>
      case 'suddenDeath':
        const suddenTimerClasses = suddenDeathTimer <= 3 ? 'text-red-600 dark:text-red-400 animate-pulse font-extrabold' : 'text-slate-600 dark:text-slate-300';
        return <div className={`text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2 ${suddenTimerClasses}`}>⏳ {suddenDeathTimer}</div>;
      case 'survival':
        return <div className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-1" aria-label={`لديك ${lives} محاولات`}>{Array.from({ length: SURVIVAL_LIVES }).map((_, i) => (<span key={i} className={`transition-opacity ${i < lives ? 'opacity-100' : 'opacity-25'}`}>❤️</span>))}</div>;
      default:
        return <div className="text-sm">سؤال {current + 1} من {questionsState.filter(q=>!q.isSkipped).length}</div>;
    }
  };

  const isSinglePlayerMode = !['versus'].includes(gameMode);

  return (
    <div className={`relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in feedback-container ${feedbackClass} border border-white/30 dark:border-slate-700/50`}>
      {currentQuestion.isSurprise && !hasAnswered && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 text-lg font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300 px-4 py-2 rounded-full animate-fade-in shadow-lg">
              <GiftIcon className="h-6 w-6" /> سؤال مفاجأة!
          </div>
      )}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
         <button onClick={onQuit} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="الخروج من اللعبة"><ExitIcon className="h-6 w-6" /></button>
      </div>
      
       {isSinglePlayerMode && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button 
                  onClick={handleSkip}
                  disabled={hasSkipped || hasAnswered}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-semibold text-sm shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-label="تخطي السؤال"
              >
                  <ArrowSmRightIcon className="h-5 w-5" />
                  <span>تخطي</span>
              </button>
          </div>
      )}

      <div className="flex items-center justify-between mb-2 text-slate-600 dark:text-slate-300 min-h-[44px]">
        {renderTopBar()}
        <div className="text-lg font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-300 px-4 py-2 rounded-full">
            النقاط: {points}
        </div>
      </div>
      
      {gameMode === 'classic' || gameMode === 'survival' && <ProgressBar current={current} total={questionsState.length} />}
      
      <div className="text-center my-4 min-h-[50px]">
          {streak > 1 && (
              <div className="flex items-center justify-center gap-2 text-2xl font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300 px-4 py-2 rounded-full animate-fade-in w-fit mx-auto">
                  <FireIcon className="h-7 w-7" /> سلسلة {streak}!
              </div>
          )}
          {streak === 0 && lastStreak > 1 && (
              <div className="text-md font-semibold text-red-700 dark:text-red-400 animate-fade-in">
                  انهارت سلسلتك! كانت {lastStreak} إجابات متتالية.
              </div>
          )}
      </div>

      {currentQuestion.imageUrl && (
        <div className="my-4 rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700">
            <img src={currentQuestion.imageUrl} alt="سؤال الصورة" className="w-full h-auto object-contain max-h-72 bg-slate-100 dark:bg-slate-800" />
        </div>
      )}

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 my-6 text-center min-h-[6rem] flex items-center justify-center">
        {currentQuestion.prompt}
      </h2>

      <div className="space-y-3">
        {currentQuestion.choices.map((choice, index) => {
          const isCorrect = hasAnswered && index === currentQuestion.answerIndex;
          const isWrong = hasAnswered && index === selected && !isCorrect;
          return (
            <ChoiceButton
              key={index}
              label={choice}
              isSelected={selected === index}
              isCorrect={isCorrect}
              isWrong={isWrong}
              disabled={hasAnswered}
              isHintedOut={hintedOutChoices.includes(index)}
              onClick={() => handleSelectChoice(index)}
              statsPercentage={answerStats?.[index]}
              showStats={hasAnswered}
            />
          );
        })}
      </div>

      {hasAnswered && !['timeAttack', 'speedrun'].includes(gameMode) && (
        <div className="mt-6 space-y-4 animate-fade-in">
          {currentQuestion.explanation && (
            <div className="relative text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <button onClick={handleCopy} className="absolute top-2 left-2 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="نسخ التوضيح">
                  <ClipboardIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
              {copied && <div className="absolute top-2 left-10 text-xs bg-slate-800 text-white px-2 py-1 rounded">تم النسخ!</div>}
              <strong className="block mb-1 text-slate-900 dark:text-slate-100">💡 توضيح:</strong>
              {currentQuestion.explanation}
            </div>
          )}
          {funFact && (
              <div className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <strong className="block mb-1 text-slate-900 dark:text-slate-100">💡 معلومة ممتعة:</strong>
                  {funFact.isLoading ? (
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse"></div>
                  ) : (
                      <p>{funFact.text}</p>
                  )}
              </div>
          )}
          {currentQuestion.sources && currentQuestion.sources.length > 0 && (
            <div className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-2">المصادر للتحقق:</h4>
              <ul className="space-y-1">
                {currentQuestion.sources.map((source, index) => (
                  <li key={index} className="flex items-start">
                    <span className="ml-2 text-slate-500">🔗</span>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(PlayingScreen);