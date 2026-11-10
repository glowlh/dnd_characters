(() => {
  'use strict';

  const storageKey = 'dnd-theme';
  const modes = ['system', 'light', 'dark'];
  const labels = {system: 'системная', light: 'светлая', dark: 'тёмная'};
  const icons = {system: '◐', light: '☀', dark: '☾'};
  const preference = matchMedia('(prefers-color-scheme: dark)');
  let mode = 'system';
  let button;

  function validMode(value) {
    return modes.includes(value) ? value : 'system';
  }

  try {
    mode = validMode(localStorage.getItem(storageKey));
  } catch {
    // The button still works when storage is unavailable.
  }

  function nextMode() {
    return modes[(modes.indexOf(mode) + 1) % modes.length];
  }

  function applyTheme() {
    document.documentElement.dataset.theme = mode === 'system'
      ? (preference.matches ? 'dark' : 'light')
      : mode;

    if (button) {
      button.textContent = icons[mode];
      const label = 'Тема: ' + labels[mode] + '. Следующая: ' + labels[nextMode()];
      button.title = label;
      button.setAttribute('aria-label', label);
    }
  }

  applyTheme();
  if (preference.addEventListener) preference.addEventListener('change', applyTheme);
  else preference.addListener(applyTheme);

  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    mode = validMode(event.newValue);
    applyTheme();
  });

  document.addEventListener('DOMContentLoaded', () => {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.addEventListener('click', () => {
      mode = nextMode();
      try {
        if (mode === 'system') localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, mode);
      } catch {
        // Keep the choice in memory for the current page.
      }
      applyTheme();
    });
    document.body.prepend(button);
    applyTheme();
  });
})();

