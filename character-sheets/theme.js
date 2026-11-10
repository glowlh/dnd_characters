(() => {
  'use strict';

  const storageKey = 'dnd-theme';
  const modes = ['system', 'light', 'dark'];
  const labels = {system: 'системная', light: 'светлая', dark: 'тёмная'};
  const icons = {system: '◐', light: '☀', dark: '☾'};
  const preference = matchMedia('(prefers-color-scheme: dark)');
  const homeUrl = new URL('../index.html', document.currentScript.src);
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
    if (document.body.classList.contains('site-home')) {
      document.body.prepend(button);
    } else {
      const toolbar = document.querySelector('.sheet-tools') || document.createElement('nav');
      toolbar.className = 'sheet-tools';
      toolbar.setAttribute('aria-label', 'Навигация');

      const home = document.createElement('a');
      home.className = 'sheet-home';
      home.href = homeUrl.href;
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '←';
      home.append(arrow, 'На главную');

      toolbar.replaceChildren(home, button);
      document.body.prepend(toolbar);
    }
    applyTheme();
  });
})();

