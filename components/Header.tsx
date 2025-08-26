import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon, VolumeUpIcon, VolumeOffIcon, WifiIcon, WifiOffIcon } from './icons';
import { isMuted, toggleMute } from '../services/audioService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const ThemeToggle = React.memo(function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
            return localStorage.getItem('theme');
        }
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]);
    
    const handleToggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <button
            onClick={handleToggleTheme}
            className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
        </button>
    );
});

const AudioToggle = React.memo(function AudioToggle() {
    const [muted, setMuted] = useState(isMuted());

    const handleToggleMute = () => {
        setMuted(toggleMute());
    };
    
    return (
        <button
            onClick={handleToggleMute}
            className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle sound"
        >
            {muted ? <VolumeOffIcon className="h-6 w-6" /> : <VolumeUpIcon className="h-6 w-6" />}
        </button>
    );
});

const OnlineStatusIndicator = React.memo(function OnlineStatusIndicator() {
    const isOnline = useOnlineStatus();
    
    const statusText = isOnline ? "متصل بالإنترنت" : "غير متصل بالإنترنت";
    const Icon = isOnline ? WifiIcon : WifiOffIcon;
    const colorClass = isOnline ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500";

    return (
        <div className="relative group">
            <div
                className={`p-2 rounded-full bg-white/50 dark:bg-slate-800/50 ${colorClass} transition-colors`}
                aria-label={statusText}
            >
                <Icon className="h-6 w-6" />
            </div>
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {statusText}
            </div>
        </div>
    );
});


function Header() {
  return (
    <header className="text-center relative">
      <div className="absolute top-4 left-4 flex gap-2">
        <ThemeToggle />
        <AudioToggle />
        <OnlineStatusIndicator />
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
        🧠 مولّد الاختبارات الذكي
      </h1>
      <p className="text-lg text-slate-700 dark:text-slate-300 mt-2">
        أسئلة لا تنتهي، في كل المجالات، بقوة الذكاء الاصطناعي.
      </p>
    </header>
  );
}

export default React.memo(Header);