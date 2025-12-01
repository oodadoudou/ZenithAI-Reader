const THEME_KEY = 'paperread-theme';

function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.classList.toggle('light', mode !== 'dark');
}

export function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
}

export function setTheme(mode) {
  const normalized = mode === 'dark' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, normalized);
  applyTheme(normalized);
  return normalized;
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  return setTheme(next);
}
