import { 
    AcademicCapIcon, BeakerIcon, BookOpenIcon, GlobeAltIcon, LeafIcon, MapIcon, 
    PaintBrushIcon, ScaleIcon, TvIcon, TrophyIcon, BrainIcon, StopwatchIcon, 
    BoltIcon, SkullIcon, ShieldCheckIcon, SwordsIcon, 
    RocketIcon, PuzzleIcon, FilmIcon, HeartIcon, MoonIcon 
} from "./components/icons";

export const QUIZ_CATEGORIES = [
  { id: "random", name: "عشوائي", icon: AcademicCapIcon },
  { id: "general", name: "معلومات عامة", icon: GlobeAltIcon },
  { id: "history", name: "التاريخ", icon: ScaleIcon },
  { id: "science", name: "العلوم والتكنولوجيا", icon: BeakerIcon },
  { id: "geography", name: "الجغرافيا", icon: MapIcon },
  { id: "sports", name: "الرياضة", icon: TrophyIcon },
  { id: "art", name: "الفن والموسيقى", icon: PaintBrushIcon },
  { id: "literature", name: "الأدب العربي والعالمي", icon: BookOpenIcon },
  { id: "nature", name: "الطبيعة والبيئة", icon: LeafIcon },
  { id: "anime", name: "الأنمي والثقافة الشعبية", icon: TvIcon },
  { id: "islamic", name: "دين وثقافة إسلامية", icon: MoonIcon },
  { id: "health", name: "الطب والصحة", icon: HeartIcon },
  { id: "cinema", name: "السينما", icon: FilmIcon },
  { id: "gaming", name: "الألعاب", icon: PuzzleIcon },
  { id: "space", name: "الفضاء", icon: RocketIcon },
] as const;


export const GAME_MODES = [
  { id: "classic", name: "الكلاسيكي", description: "أجب على عدد محدد من الأسئلة.", icon: BrainIcon, color: "indigo" },
  { id: "versus", name: "منافسة", description: "تحدَّ صديقاً في مواجهة مباشرة.", icon: SwordsIcon, color: "red" },
  { id: "timeAttack", name: "تحدي الوقت", description: "أجب على أكبر عدد خلال 60 ثانية.", icon: StopwatchIcon, color: "sky" },
  { id: "speedrun", name: "تحدي السرعة", description: "أجب على كل سؤال خلال 5 ثوانٍ.", icon: BoltIcon, color: "amber" },
  { id: "suddenDeath", name: "الموت المفاجئ", description: "خطأ واحد وتنتهي اللعبة.", icon: SkullIcon, color: "red" },
  { id: "survival", name: "البقاء", description: "لديك 3 محاولات فقط للبقاء.", icon: ShieldCheckIcon, color: "emerald" },
] as const;

export const DIFFICULTY_LEVELS = [
    { id: "متغير", name: "متغير" },
    { id: "سهل", name: "سهل" },
    { id: "متوسط", name: "متوسط" },
    { id: "صعب", name: "صعب" },
] as const;


export const ACHIEVEMENTS: { [key: string]: { id: string; name: string; description: string } } = {
  // General Progress
  FIRST_GAME: { id: 'FIRST_GAME', name: 'البداية!', description: 'أكملت أول لعبة أسئلة.' },
  QUIZ_MASTER: { id: 'QUIZ_MASTER', name: 'المثقف', description: 'أجبت على 50 سؤالاً صحيحاً في المجمل.' },
  ENCYCLOPEDIA: { id: 'ENCYCLOPEDIA', name: 'الموسوعة', description: 'لعبت في 5 مجالات مختلفة.' },
  
  // Classic Mode
  CLASSIC_EXPERT: { id: 'CLASSIC_EXPERT', name: 'الخبير', description: 'حققت علامة كاملة في الوضع الكلاسيكي (10 أسئلة أو أكثر).' },
  
  // Time Attack Mode
  TIME_ATTACK_PRO: { id: 'TIME_ATTACK_PRO', name: 'البرق', description: 'حققت 15 إجابة صحيحة أو أكثر في تحدي الوقت.' },

  // Sudden Death Mode
  SURVIVOR_STREAK: { id: 'SURVIVOR_STREAK', name: 'الخارق', description: 'حققت سلسلة من 10 إجابات صحيحة في الموت المفاجئ.' },

  // Survival Mode
  ULTIMATE_SURVIVOR: { id: 'ULTIMATE_SURVIVOR', name: 'الناجي الأخير', description: 'أكملت وضع البقاء بجميع محاولاتك.' },
};