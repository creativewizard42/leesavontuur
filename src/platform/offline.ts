/** Browser adapter. Learning/core remain independent of PWA or native shells. */
export async function checkForUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  await registration.update();
  return Boolean(registration.waiting);
}

/** Called only from the parent screen after an explicit click. */
export async function applyUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.waiting) return false;
  const worker = registration.waiting;
  return new Promise(resolve => {
    const cleanup = (): void => {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', changed);
      navigator.serviceWorker.removeEventListener('message', message);
    };
    const changed = (): void => { cleanup(); resolve(true); location.reload(); };
    const message = (event: MessageEvent): void => {
      if (event.source === worker && event.data?.type === 'UPDATE_OTHER_WINDOWS') { cleanup(); resolve(false); }
    };
    const timeout = setTimeout(() => { cleanup(); resolve(false); }, 10000);
    navigator.serviceWorker.addEventListener('controllerchange', changed);
    navigator.serviceWorker.addEventListener('message', message);
    worker.postMessage({ type: 'PARENT_APPLY_UPDATE' });
  });
}

export async function registerOffline(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    await navigator.serviceWorker.ready;
    document.documentElement.dataset['offlineReady'] = 'true';
  } catch {
    document.documentElement.dataset['offlineReady'] = 'false';
  }
}
