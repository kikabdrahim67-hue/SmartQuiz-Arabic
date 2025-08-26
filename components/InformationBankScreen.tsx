import React, { useState, useEffect, useCallback } from 'react';
import { QUIZ_CATEGORIES } from '../constants';
import { ArrowRightIcon, DatabaseIcon, ArrowDownOnSquareIcon, TrashIcon, CheckCircleIcon, XIcon } from './icons';
import { getCategoryCacheStatus, clearAllQuestionCache, saveQuestionsToCache } from '../services/questionCache';
import { generateQuestions } from '../services/geminiService';
import Modal from './Modal';

interface InformationBankScreenProps {
  onBack: () => void;
  isOnline: boolean;
  addToast: (message: string, icon?: React.ReactNode) => void;
}

const INFO_BANK_TARGET_COUNT = 2000;
const INFO_BANK_BATCH_SIZE = 50; // Fetch 50 questions at a time
const DIFFICULTY = 'متغير';

type CacheStatus = Record<string, { count: number }>;
type DownloadProgress = {
    categoryName: string;
    loaded: number;
    total: number;
    overallProgress: number; // Percentage 0-100
};

function InformationBankScreen({ onBack, isOnline, addToast }: InformationBankScreenProps) {
    const [cacheStatus, setCacheStatus] = useState<CacheStatus>({});
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [isClearConfirmVisible, setIsClearConfirmVisible] = useState(false);
    
    const categoriesToDownload = QUIZ_CATEGORIES.filter(c => c.id !== 'random');

    const updateAllCacheStatus = useCallback(() => {
        const newStatus: CacheStatus = {};
        for (const category of categoriesToDownload) {
            newStatus[category.id] = getCategoryCacheStatus(category.id, DIFFICULTY);
        }
        setCacheStatus(newStatus);
    }, [categoriesToDownload]);

    useEffect(() => {
        updateAllCacheStatus();
    }, [updateAllCacheStatus]);
    
    const handleDownloadAll = async () => {
        if (!isOnline) {
            addToast("يجب أن تكون متصلاً بالإنترنت لتنزيل الأسئلة.", <XIcon className="h-5 w-5 text-red-500" />);
            return;
        }
        setIsDownloading(true);
        setDownloadProgress({ categoryName: '', loaded: 0, total: INFO_BANK_TARGET_COUNT, overallProgress: 0 });

        const totalCategories = categoriesToDownload.length;

        for (let i = 0; i < totalCategories; i++) {
            const category = categoriesToDownload[i];
            const currentStatus = getCategoryCacheStatus(category.id, DIFFICULTY);
            let currentCount = currentStatus.count;

            while (currentCount < INFO_BANK_TARGET_COUNT) {
                const overallProgress = ((i / totalCategories) + ((currentCount / INFO_BANK_TARGET_COUNT) / totalCategories)) * 100;
                setDownloadProgress({
                    categoryName: category.name,
                    loaded: currentCount,
                    total: INFO_BANK_TARGET_COUNT,
                    overallProgress,
                });

                try {
                    const questionsToFetch = Math.min(INFO_BANK_BATCH_SIZE, INFO_BANK_TARGET_COUNT - currentCount);
                    const newQuestions = await generateQuestions(category.name, questionsToFetch, DIFFICULTY);
                    saveQuestionsToCache(category.id, DIFFICULTY, newQuestions);
                    
                    const newStatus = getCategoryCacheStatus(category.id, DIFFICULTY);
                    currentCount = newStatus.count;
                    
                    // Update the main status object as well for real-time UI updates
                    setCacheStatus(prev => ({...prev, [category.id]: { count: currentCount }}));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
                    addToast(`خطأ في تحميل أسئلة ${category.name}: ${errorMessage}`, <XIcon className="h-5 w-5 text-red-500" />);
                    // Stop downloading this category and move to the next
                    break;
                }
            }
        }

        setDownloadProgress({ categoryName: 'اكتمل التحميل!', loaded: INFO_BANK_TARGET_COUNT, total: INFO_BANK_TARGET_COUNT, overallProgress: 100 });
        setTimeout(() => {
            setIsDownloading(false);
            setDownloadProgress(null);
            updateAllCacheStatus(); // Final status update
            addToast("اكتمل تحميل جميع الأسئلة بنجاح!", <CheckCircleIcon className="h-5 w-5 text-green-500" />);
        }, 2000);
    };

    const handleConfirmClear = () => {
        clearAllQuestionCache();
        updateAllCacheStatus();
        setIsClearConfirmVisible(false);
        addToast("تم مسح جميع الأسئلة المخزنة بنجاح.", <TrashIcon className="h-5 w-5" />);
    };

    const renderProgressBar = (count: number) => {
        const percentage = (count / INFO_BANK_TARGET_COUNT) * 100;
        const color = percentage >= 100 ? 'bg-green-500' : 'bg-sky-500';
        return (
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }} />
            </div>
        );
    };

    return (
        <>
            <Modal
                isOpen={isClearConfirmVisible}
                onClose={() => setIsClearConfirmVisible(false)}
                onConfirm={handleConfirmClear}
                title="تأكيد مسح الذاكرة"
                confirmText="نعم، امسح الكل"
                confirmButtonClass="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            >
                <p>هل أنت متأكد من رغبتك في مسح جميع الأسئلة المخزنة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </Modal>
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 animate-fade-in border border-white/30 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <DatabaseIcon className="h-8 w-8 text-sky-500" />
                        بنك المعلومات
                    </h2>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                        العودة
                        <ArrowRightIcon className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    قم بتحميل الأسئلة هنا للعب بها في أي وقت دون الحاجة للاتصال بالإنترنت.
                </p>

                {isDownloading && downloadProgress ? (
                    <div className="text-center p-8 space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">جاري التحميل...</h3>
                        <p className="font-semibold text-indigo-600 dark:text-indigo-400">{downloadProgress.categoryName}</p>
                        <p className="text-2xl font-bold">{downloadProgress.loaded} / {downloadProgress.total}</p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                            <div className="bg-indigo-600 h-4 rounded-full transition-all duration-300 text-center text-white text-xs font-bold" style={{ width: `${downloadProgress.overallProgress}%` }}>
                                {Math.round(downloadProgress.overallProgress)}%
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">قد تستغرق هذه العملية عدة دقائق. يرجى إبقاء الصفحة مفتوحة.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                            {categoriesToDownload.map(category => {
                                const status = cacheStatus[category.id] || { count: 0 };
                                const isComplete = status.count >= INFO_BANK_TARGET_COUNT;
                                const Icon = category.icon;
                                return (
                                    <div key={category.id} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border dark:border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">{category.name}</h4>
                                            </div>
                                            {isComplete && <CheckCircleIcon className="h-6 w-6 text-green-500" />}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">{status.count} / {INFO_BANK_TARGET_COUNT} سؤال</p>
                                        {renderProgressBar(status.count)}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleDownloadAll}
                                disabled={!isOnline}
                                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-3 text-lg font-semibold shadow-lg hover:shadow-sky-500/50 transition-all transform hover:scale-105 disabled:bg-sky-400 disabled:cursor-not-allowed"
                            >
                                <ArrowDownOnSquareIcon className="h-6 w-6" />
                                تنزيل الكل ({categoriesToDownload.length} فئة)
                            </button>
                            <button
                                onClick={() => setIsClearConfirmVisible(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded-xl py-3 px-6 font-semibold shadow-sm transition-colors"
                            >
                                <TrashIcon className="h-5 w-5" />
                                مسح الكل
                            </button>
                        </div>
                         {!isOnline && <p className="text-center mt-4 text-sm text-amber-700 dark:text-amber-400">يجب أن تكون متصلاً بالإنترنت لتنزيل الأسئلة.</p>}
                         <p className="text-center mt-4 text-xs text-slate-500 dark:text-slate-400">
                            <b>ملاحظة:</b> تحميل جميع الأسئلة قد يستهلك مساحة تخزين كبيرة على جهازك وقد يستغرق وقتاً طويلاً.
                         </p>
                    </>
                )}
            </div>
        </>
    );
}

export default React.memo(InformationBankScreen);