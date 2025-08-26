import React, { useMemo, useEffect, useState } from 'react';
import type { GameResult, ScoreEntry, QuestionHistoryEntry } from '../types';
import { GAME_MODES, ACHIEVEMENTS } from '../constants';
import { playWinSound, playLoseSound } from '../services/audioService';
import { getHighScores, saveHighScore } from '../utils/scoreUtils';
import { checkAndUnlockAchievements, updateAchievementProgress } from '../utils/achievementUtils';
import { CrownIcon, ShareIcon, TrophyIcon, CheckIcon, XIcon, BookOpenIcon, ChevronDownIcon } from './icons';
import confetti from 'https://esm.sh/canvas-confetti';


interface FinishedScreenProps {
  result: GameResult;
  onRestart: () => void;
  onUnlockAchievement: (id: string) => void;
}

const AnswerReviewItem = React.memo(function AnswerReviewItem({ entry, index, mode, p1Name, p2Name }: { entry: QuestionHistoryEntry, index: number, mode: GameResult['mode'], p1Name?: string, p2Name?: string }) {
    const { question, player1AnswerIndex, player2AnswerIndex } = entry;
    const correctAnswerIndex = question.answerIndex;
    const isSinglePlayer = mode !== 'versus';

    return (
        <div className="text-right p-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <p className="font-bold text-slate-800 dark:text-slate-200">{index + 1}. {question.prompt}</p>
            <ul className="mt-3 space-y-2 text-sm">
                {question.choices.map((choice, choiceIndex) => {
                    const isCorrect = choiceIndex === correctAnswerIndex;
                    const isP1Selected = choiceIndex === player1AnswerIndex;
                    const isP2Selected = choiceIndex === player2AnswerIndex;

                    let baseClasses = "p-2 rounded-lg flex items-center justify-between";
                    let textClasses = "";
                    
                    if (isCorrect) {
                        baseClasses += " bg-green-100 dark:bg-green-900/50";
                        textClasses = "font-semibold text-green-800 dark:text-green-200";
                    } else if (isP1Selected || isP2Selected) {
                        baseClasses += " bg-red-100 dark:bg-red-900/50";
                        textClasses = "text-red-800 dark:text-red-200 line-through";
                    } else {
                        baseClasses += " bg-slate-100 dark:bg-slate-800";
                        textClasses = "text-slate-700 dark:text-slate-300";
                    }

                    return (
                        <li key={choiceIndex} className={`${baseClasses} ${textClasses}`}>
                            <div className="flex items-center gap-2">
                                {isCorrect ? <CheckIcon className="h-4 w-4 text-green-600" /> : (isP1Selected || isP2Selected) ? <XIcon className="h-4 w-4 text-red-600" /> : <div className="h-4 w-4" />}
                                <span>{choice}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold">
                                {isSinglePlayer && isP1Selected && !isCorrect && <span className="px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-800/70 text-red-800 dark:text-red-200">إجابتك</span>}
                                {!isSinglePlayer && isP1Selected && <span className="px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-800/70 text-indigo-800 dark:text-indigo-200">{p1Name}</span>}
                                {!isSinglePlayer && isP2Selected && <span className="px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-800/70 text-red-800 dark:text-red-200">{p2Name}</span>}
                            </div>
                        </li>
                    );
                })}
            </ul>
            {player1AnswerIndex === null && isSinglePlayer && (
                 <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-center">تم تخطي هذا السؤال.</p>
            )}
        </div>
    );
});


function FinishedScreen({ result, onRestart, onUnlockAchievement }: FinishedScreenProps) {
  const { score, total, mode, points = 0, livesLeft, winner, player1Name, player2Name, player1Score, player2Score, player1Points, player2Points, questionsHistory } = result;
  
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let won = false;
    switch (mode) {
        case 'versus':
            if (winner !== 'player2') { // Win or draw
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 1000 });
                playWinSound();
            } else {
                playLoseSound();
            }
            break;
        case 'classic':
        case 'survival':
            if (total && score / total >= 0.7) won = true;
            if (mode === 'survival' && livesLeft && livesLeft > 0) won = true;
            break;
        case 'timeAttack':
        case 'suddenDeath':
        case 'speedrun':
            if (score >= 8) won = true;
            break;
    }

    if (mode !== 'versus') {
        if (won) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 1000 });
            playWinSound();
        } else {
            playLoseSound();
        }
    }
    
    if (mode !== 'versus') {
        const newHighScore = saveHighScore(mode, { score, points });
        setIsNewHighScore(newHighScore);
        setHighScores(getHighScores(mode));
        
        updateAchievementProgress(result);
        const unlockedIds: string[] = [];
        checkAndUnlockAchievements(result, (id) => {
            unlockedIds.push(id);
            onUnlockAchievement(id);
        });
        setUnlocked(unlockedIds);
    }
  }, [result, onUnlockAchievement, mode, score, points, total, livesLeft, winner]);

  const handleShare = async () => {
    const gameModeInfo = GAME_MODES.find(m => m.id === mode);
    let shareText: string;

    if (mode === 'versus') {
      const winnerName = winner === 'player1' ? player1Name : player2Name;
      const winnerPoints = winner === 'player1' ? player1Points : player2Points;
      if (winner === 'draw') {
        shareText = `انتهت مباراتنا بالتعادل في وضع ${gameModeInfo?.name || ''} برصيد ${player1Points} نقطة!`;
      } else {
        shareText = `لقد فزت على ${winner === 'player1' ? player2Name : player1Name} في وضع ${gameModeInfo?.name || ''} بنتيجة ${winnerPoints} نقطة!`;
      }
    } else {
       shareText = ` لقد أجبت على ${score} من ${total || score} سؤالاً بشكل صحيح في وضع ${gameModeInfo?.name || ''}! وحصلت على ${points} نقطة. هل يمكنك التغلب عليّ؟`;
    }
    
    const shareUrl = window.location.href;
    const shareData = {
      title: 'مولّد الاختبارات الذكي',
      text: shareText,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error using Web Share API:", err);
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };


  const gameModeInfo = useMemo(() => GAME_MODES.find(m => m.id === mode), [mode]);

  const renderSinglePlayerResults = () => (
    <>
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
        🎉 انتهت الجولة!
      </h2>
      <p className="text-lg text-slate-700 dark:text-slate-300">
        أداء رائع في وضع {gameModeInfo?.name}!
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 text-center">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">النتيجة</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{score} / {total || score}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">النقاط</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{points}</p>
        </div>
      </div>
      {isNewHighScore && (
        <p className="mt-4 text-center text-lg font-bold text-green-600 dark:text-green-400 animate-pulse flex items-center justify-center gap-2">
            <CrownIcon className="h-6 w-6" /> رقم قياسي جديد!
        </p>
      )}
    </>
  );

  const renderVersusResults = () => {
    const p1Color = "text-indigo-600 dark:text-indigo-400";
    const p2Color = "text-red-600 dark:text-red-400";
    
    let winnerText;
    if (winner === 'draw') {
        winnerText = "تعادل مذهل!";
    } else {
        const winnerName = winner === 'player1' ? player1Name : player2Name;
        winnerText = `🏆 الفائز هو ${winnerName}!`;
    }

    return (
        <>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                انتهت المنافسة!
            </h2>
            <p className="text-xl font-bold text-amber-500 dark:text-amber-400">{winnerText}</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="text-center p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 border-2 border-indigo-200 dark:border-indigo-800">
                    <h3 className={`text-xl font-bold ${p1Color}`}>{player1Name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">النتيجة: {player1Score} / {total}</p>
                    <p className={`text-4xl font-extrabold mt-2 ${p1Color}`}>{player1Points}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">نقطة</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/40 border-2 border-red-200 dark:border-red-800">
                    <h3 className={`text-xl font-bold ${p2Color}`}>{player2Name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">النتيجة: {player2Score} / {total}</p>
                    <p className={`text-4xl font-extrabold mt-2 ${p2Color}`}>{player2Points}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">نقطة</p>
                </div>
            </div>
        </>
    );
  };

  const renderUnlockedAchievements = () => (
    unlocked.length > 0 && (
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/40 rounded-xl border-2 border-amber-200 dark:border-amber-700/60">
        <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
            <TrophyIcon className="h-6 w-6"/>
            إنجازات جديدة!
        </h3>
        <ul className="space-y-1">
          {unlocked.map(id => {
            const achievement = ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS];
            return (
              <li key={id} className="text-sm text-amber-700 dark:text-amber-300 font-semibold">
                - {achievement.name}
              </li>
            );
          })}
        </ul>
      </div>
    )
  );
  
  const renderHighScores = () => (
    highScores.length > 0 && (
      <div className="mt-6">
          <h3 className="font-bold text-center text-slate-700 dark:text-slate-300 mb-3">أفضل النتائج في وضع {gameModeInfo?.name}</h3>
          <ol className="space-y-2 max-w-sm mx-auto">
              {highScores.map((entry, index) => (
                  <li key={index} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm">
                      <span className="font-bold text-slate-600 dark:text-slate-400">{index + 1}.</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">النتيجة: {entry.score}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{entry.points} نقطة</span>
                  </li>
              ))}
          </ol>
      </div>
    )
  );


  return (
    <div className="text-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-2xl mx-auto animate-fade-in border border-white/30 dark:border-slate-700/50">
      {mode === 'versus' ? renderVersusResults() : renderSinglePlayerResults()}
      
      {renderUnlockedAchievements()}
      
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onRestart}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 px-8 text-lg font-semibold shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105"
        >
          جرّب مرة أخرى 🔁
        </button>
        <button
          onClick={handleShare}
          className="w-full sm:w-auto relative flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl py-3 px-8 text-lg font-semibold shadow-md transition-colors"
        >
          <ShareIcon className="h-5 w-5" />
          <span>شارك نتيجتك</span>
          {isCopied && <div className="absolute -bottom-10 text-xs bg-slate-800 text-white px-2 py-1 rounded">تم نسخ الرابط!</div>}
        </button>
      </div>
      
      {questionsHistory && questionsHistory.length > 0 && (
        <div className="mt-6 border-t dark:border-slate-700 pt-4">
            <button
              onClick={() => setShowReview(!showReview)}
              className="w-full flex items-center justify-center gap-2 text-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-3 rounded-lg transition-colors"
            >
              <BookOpenIcon className="h-6 w-6"/>
              <span>مراجعة الإجابات</span>
              <ChevronDownIcon className={`h-6 w-6 transition-transform ${showReview ? 'rotate-180' : ''}`} />
            </button>
            {showReview && (
              <div className="mt-4 bg-white dark:bg-slate-900/50 rounded-xl border dark:border-slate-700 max-h-96 overflow-y-auto">
                  {questionsHistory.map((entry, index) => (
                      <AnswerReviewItem 
                        key={entry.question.id} 
                        entry={entry} 
                        index={index} 
                        mode={mode}
                        p1Name={player1Name}
                        p2Name={player2Name}
                      />
                  ))}
              </div>
            )}
        </div>
      )}

      {mode !== 'versus' && renderHighScores()}
    </div>
  );
}

export default React.memo(FinishedScreen);