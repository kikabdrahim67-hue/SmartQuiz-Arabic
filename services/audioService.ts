let audioCtx: AudioContext | null = null;
let isMutedInternal = false;

try {
  const savedMutedState = localStorage.getItem('quizAppMuted');
  if (savedMutedState !== null) {
    isMutedInternal = JSON.parse(savedMutedState);
  }
} catch (e) {
  console.error("Could not parse muted state from localStorage", e);
}

const persistMuteState = () => {
  try {
    localStorage.setItem('quizAppMuted', JSON.stringify(isMutedInternal));
  } catch (e) {
    console.error("Could not save muted state to localStorage", e);
  }
};

export const initAudio = () => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch(e) {
      console.error("Web Audio API is not supported in this browser.");
    }
  }
};

const playTone = (frequency: number, type: OscillatorType, duration: number) => {
  if (isMutedInternal || !audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
};

export const playCorrectSound = () => {
  if (isMutedInternal || !audioCtx) return;
  playTone(440, 'sine', 0.2);
  setTimeout(() => playTone(587.33, 'sine', 0.2), 100);
};

export const playStreakSound = (streakCount: number) => {
    if (isMutedInternal || !audioCtx) return;
    // Start at C5 (523Hz) and go up chromatically
    const baseFrequency = 523.25;
    const semitoneRatio = Math.pow(2, 1/12);
    // Clamp streak count to avoid very high pitches
    const effectiveStreak = Math.min(streakCount, 12);
    const frequency = baseFrequency * Math.pow(semitoneRatio, effectiveStreak);
    playTone(frequency, 'triangle', 0.15);
};


export const playIncorrectSound = () => {
  if (isMutedInternal || !audioCtx) return;
  playTone(220, 'sawtooth', 0.3);
};

export const playWinSound = () => {
  if (isMutedInternal || !audioCtx) return;
  playTone(523.25, 'triangle', 0.15);
  setTimeout(() => playTone(659.25, 'triangle', 0.15), 150);
  setTimeout(() => playTone(783.99, 'triangle', 0.15), 300);
  setTimeout(() => playTone(1046.50, 'triangle', 0.2), 450);
};

export const playLoseSound = () => {
  if (isMutedInternal || !audioCtx) return;
  playTone(349.23, 'square', 0.2);
  setTimeout(() => playTone(261.63, 'square', 0.3), 200);
};

export const toggleMute = (): boolean => {
  isMutedInternal = !isMutedInternal;
  persistMuteState();
  return isMutedInternal;
};

export const isMuted = (): boolean => {
  return isMutedInternal;
};