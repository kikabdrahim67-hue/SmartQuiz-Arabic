const THEME_MAP: { [key: string]: string } = {
  "science": "theme-science",
  "history": "theme-history",
  "geography": "theme-geography",
  "sports": "theme-sports",
  "art": "theme-art",
  "anime": "theme-anime",
  "nature": "theme-nature",
  "islamic": "theme-islamic",
  "health": "theme-health",
  "cinema": "theme-cinema",
  "gaming": "theme-gaming",
  "space": "theme-space",
};

const ALL_THEMES = Object.values(THEME_MAP);

export function applyTheme(categoryId: string) {
  const themeClass = THEME_MAP[categoryId];
  document.body.classList.remove(...ALL_THEMES); // Remove any existing theme
  if (themeClass) {
    document.body.classList.add(themeClass);
  }
}

export function resetTheme() {
  document.body.classList.remove(...ALL_THEMES);
}