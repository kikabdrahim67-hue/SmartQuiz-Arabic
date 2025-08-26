import React, { useState, useCallback, useEffect } from "react";
import { GameSettings, Question, GamePhase, GameResult } from "./types";
import { prepareQuestions } from "./utils/quizUtils";
import { applyTheme, resetTheme } from "./utils/themeUtils";
import { generateQuestions } from "./services/geminiService";
import { getQuestionsFromCache, saveQuestionsToCache } from "./services/questionCache";
import { ACHIEVEMENTS, QUIZ_CATEGORIES } from "./constants";
import Header from "./components/Header";
import StartScreen from "./components/StartScreen";
import PlayingScreen from "./components/PlayingScreen";
import PlayingScreenVersus from "./components/PlayingScreenVersus";
import FinishedScreen from "./components/FinishedScreen";
import AchievementsScreen from "./components/AchievementsScreen";
import InformationBankScreen from "./components/InformationBankScreen";
import Modal from "./components/Modal";
import WelcomeModal from "./components/WelcomeModal";
import { TrophyIcon, GamepadIcon } from "./components/icons";
import { useOnlineStatus } from "./hooks/useOnlineStatus";

const MAX_QUESTIONS_FETCH = 20;

const Toast = ({ message, onDismiss, icon }: { message: string, onDismiss: () => void, icon?: React.ReactNode }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return <div className="toast">{icon} {message}</div>;
};

export default function App() {
  const [settings, setSettings] = useState<GameSettings>({
    shuffleQuestions: true,
    shuffleChoices: true,
    totalQuestions: 5,
    category: "general", // Use ID now
    gameMode: "classic",
    difficulty: "متغير",
    player1Name: 'لاعب 1',
    player2Name: 'لاعب 2',
  });

  const [phase, setPhase] = useState<GamePhase>("start");
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const isOnline = useOnlineStatus();

  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('unlockedAchievements');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch (e) {
      return new Set();
    }
  });
  const [toasts, setToasts] = useState<Array<{id: number, message: string, icon?: React.ReactNode}>>([]);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);
  const [isQuitConfirmVisible, setIsQuitConfirmVisible] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem('hasVisitedQuizApp');
    if (!visited) {
      setIsFirstVisit(true);
      localStorage.setItem('hasVisitedQuizApp', 'true');
    }
  }, []);
  
  useEffect(() => {
    const preCacheGeneralKnowledge = async () => {
      if (isOnline) {
        const cached = getQuestionsFromCache('general', 'متغير', MAX_QUESTIONS_FETCH);
        if (!cached || cached.length < MAX_QUESTIONS_FETCH) {
          console.log("Pre-caching general knowledge questions...");
          try {
            const categoryName = QUIZ_CATEGORIES.find(c => c.id === 'general')?.name || 'معلومات عامة';
            const questions = await generateQuestions(categoryName, MAX_QUESTIONS_FETCH, 'متغير');
            saveQuestionsToCache('general', 'متغير', questions);
            console.log("Successfully pre-cached general knowledge questions.");
          } catch (err) {
            console.error("Failed to pre-cache questions:", err);
          }
        }
      }
    };
    preCacheGeneralKnowledge();
  }, [isOnline]);


  useEffect(() => {
    const handleConnect = () => {
        if (!isGamepadConnected) {
            setIsGamepadConnected(true);
            setToasts(current => [...current, { 
                id: Date.now(), 
                message: `تم توصيل يد التحكم!`,
                icon: <GamepadIcon className="h-5 w-5 ml-2 text-indigo-400"/>
            }]);
        }
    };
    const handleDisconnect = () => setIsGamepadConnected(false);

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    // Check on mount if a gamepad is already there
    if (navigator.getGamepads && navigator.getGamepads()?.[0]) {
        handleConnect();
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
}, [isGamepadConnected]);


  const onUnlockAchievement = useCallback((id: string) => {
    // This check prevents re-triggering toasts for already unlocked achievements.
    setUnlockedAchievements(prevUnlocked => {
        if (prevUnlocked.has(id)) {
            return prevUnlocked;
        }
        
        const newUnlocked = new Set(prevUnlocked);
        newUnlocked.add(id);
        localStorage.setItem('unlockedAchievements', JSON.stringify(Array.from(newUnlocked)));
        
        const achievement = ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS];
        if (achievement) {
            setToasts(current => [...current, { 
                id: Date.now(), 
                message: `إنجاز جديد: ${achievement.name}`,
                icon: <TrophyIcon className="h-5 w-5 ml-2 text-amber-400"/>
            }]);
        }
        
        return newUnlocked;
    });
  }, []);

  const addToast = (message: string, icon?: React.ReactNode) => {
    setToasts(current => [...current, { id: Date.now(), message, icon }]);
  };


  const startGame = useCallback(async (currentSettings: GameSettings) => {
    setPhase("loading");
    setError(null);
    setResult(null);

    let categoryIdToUse = currentSettings.category;
    if (categoryIdToUse === 'random') {
      const availableCategories = QUIZ_CATEGORIES.filter(c => c.id !== 'random');
      categoryIdToUse = availableCategories[Math.floor(Math.random() * availableCategories.length)].id;
      // FIX: Update settings immediately to reflect the actual category being loaded.
      setSettings(s => ({ ...s, category: categoryIdToUse }));
    }
    
    const categoryName = QUIZ_CATEGORIES.find(c => c.id === categoryIdToUse)?.name || 'معلومات عامة';
    
    applyTheme(categoryIdToUse);

    try {
      let questions: Question[] | null = null;
      
      const cachedQuestions = getQuestionsFromCache(categoryIdToUse, currentSettings.difficulty, currentSettings.totalQuestions);
      if (cachedQuestions) {
          console.log("Loaded questions from cache.");
          questions = cachedQuestions;
      }

      // If no cached questions, try to generate them (if online)
      if (!questions) {
        if (!isOnline) {
            throw new Error("أنت غير متصل بالإنترنت. لا يمكن تحميل أسئلة جديدة. حاول اختيار مجال آخر تم لعبه سابقاً أو تحميله من بنك المعلومات.");
        }
        console.log(`Generating new questions for category: ${categoryName}`);
        // Fetch the max amount for other modes to build a good cache
        questions = await generateQuestions(categoryName, MAX_QUESTIONS_FETCH, currentSettings.difficulty);
        saveQuestionsToCache(categoryIdToUse, currentSettings.difficulty, questions);
        console.log("Generated questions and saved to cache.");
      }

      // We always prepare questions, even from cache, to apply shuffling and slicing
      const prepared = prepareQuestions(questions, currentSettings);

      if (prepared.length === 0) {
        throw new Error("فشل الذكاء الاصطناعي في إنشاء الأسئلة. حاول مرة أخرى.");
      }
      setActiveQuestions(prepared);
      setPhase("playing");
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(errorMessage);
      setPhase("start");
      resetTheme();
    }
  }, [isOnline]);

  const onGameFinish = useCallback((gameResult: GameResult) => {
    setResult(gameResult);
    setPhase("finished");
  }, []);

  const restartGame = useCallback(() => {
    setPhase("start");
    setActiveQuestions([]);
    setError(null);
    setResult(null);
    resetTheme();
  }, []);

  const showAchievements = useCallback(() => {
    setPhase("achievements");
  }, []);

  const showInfoBank = useCallback(() => {
    setPhase("infoBank");
  }, []);

  const removeToast = (id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  };
  
  const requestQuit = useCallback(() => {
    setIsQuitConfirmVisible(true);
  }, []);

  const confirmQuit = useCallback(() => {
    setIsQuitConfirmVisible(false);
    restartGame();
  }, [restartGame]);

  const cancelQuit = useCallback(() => {
    setIsQuitConfirmVisible(false);
  }, []);

  const renderContent = () => {
    const categoryName = QUIZ_CATEGORIES.find(c => c.id === settings.category)?.name || 'معلومات عامة';
    switch (phase) {
      case "start":
      case "loading":
        return (
          <StartScreen
            settings={settings}
            setSettings={setSettings}
            onStartGame={startGame}
            onShowAchievements={showAchievements}
            onShowInfoBank={showInfoBank}
            isLoading={phase === 'loading'}
            error={error}
            isOnline={isOnline}
          />
        );
      case "playing":
        if (settings.gameMode === 'versus') {
            return (
              <PlayingScreenVersus
                questions={activeQuestions}
                settings={settings}
                category={categoryName}
                onGameFinish={onGameFinish}
                onQuit={requestQuit}
              />
            );
        }
        return (
          <PlayingScreen
            questions={activeQuestions}
            settings={settings}
            onGameFinish={onGameFinish}
            onQuit={requestQuit}
            addToast={addToast}
            isOnline={isOnline}
          />
        );
      case "finished":
        return result ? (
          <FinishedScreen
            result={result}
            onRestart={restartGame}
            onUnlockAchievement={onUnlockAchievement}
          />
        ) : null;
      case "achievements":
        return (
            <AchievementsScreen 
                unlockedAchievements={unlockedAchievements}
                onBack={restartGame}
            />
        );
      case "infoBank":
        return (
            <InformationBankScreen
              onBack={restartGame}
              isOnline={isOnline}
              addToast={addToast}
            />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <WelcomeModal isOpen={isFirstVisit} onClose={() => setIsFirstVisit(false)} />
      <Modal
        isOpen={isQuitConfirmVisible}
        onClose={cancelQuit}
        onConfirm={confirmQuit}
        title="تأكيد الخروج"
        confirmText="الخروج"
        confirmButtonClass="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
      >
        <p>هل أنت متأكد من رغبتك في الخروج؟ سيتم فقدان تقدمك الحالي.</p>
      </Modal>

      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} icon={toast.icon} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-4xl mx-auto">
          <Header />
          <main className="mt-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </>
  );
}