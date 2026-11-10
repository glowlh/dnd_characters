(() => {
  'use strict';

  if (!window.isSecureContext || !/^https?:$/.test(location.protocol) ||
      !('serviceWorker' in navigator)) return;

  const workerUrl = new URL('sw.js', document.currentScript.src);
  const workers = navigator.serviceWorker;
  let registration;
  let button;
  let applying = false;

  function showUpdate() {
    if (!workers.controller || !registration.waiting || button) return;

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'pwa-update';
    button.textContent = 'Обновить';
    button.title = 'Доступна новая версия листов';
    button.addEventListener('click', () => {
      const waiting = registration.waiting;
      if (!waiting) {
        location.reload();
        return;
      }
      applying = true;
      button.disabled = true;
      waiting.postMessage({type: 'APPLY_UPDATE'});
    });
    document.body.append(button);
  }

  workers.addEventListener('controllerchange', () => {
    if (applying) location.reload();
    else if (button) {
      button.remove();
      button = undefined;
    }
  });

  workers.register(workerUrl, {updateViaCache: 'none'}).then(result => {
    registration = result;
    const observe = worker => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') showUpdate();
      });
    };
    registration.addEventListener('updatefound', () => observe(registration.installing));
    observe(registration.installing);
    showUpdate();

    const checkForUpdate = () => registration.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkForUpdate();
    });
    window.addEventListener('online', checkForUpdate);
    checkForUpdate();
  }).catch(error => console.warn('Не удалось включить офлайн-режим.', error));
})();
