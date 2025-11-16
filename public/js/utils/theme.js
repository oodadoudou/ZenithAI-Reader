const THEME_KEY = 'paperread-theme';

export function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.classList.toggle('dark', saved === 'dark');
  document.documentElement.classList.toggle('light', saved !== 'dark');
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applySavedTheme();
  return next;
}
