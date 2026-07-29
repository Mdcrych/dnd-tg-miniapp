// ======= PWA: Service Worker =======
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/dnd-tg-miniapp/sw.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// ======= PWA: Install prompt =======
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('btn-install');
  if (btn) btn.classList.remove('hidden');
});
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('btn-install');
  if (btn) btn.classList.add('hidden');
  deferredInstallPrompt = null;
});
function triggerInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => { deferredInstallPrompt = null; });
}
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-install');
  if (btn) btn.addEventListener('click', triggerInstall);
});

// ======= DATA =======
const ABILITIES = ['STR','DEX','INT','WIL','PER','TEC'];
const AB_FULL = {
  STR: 'Сила', DEX: 'Ловкость', INT: 'Интеллект',
  WIL: 'Воля', PER: 'Восприятие', TEC: 'Техника'
};
const AB_MOD = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };

const SKILLS = [
  { name: 'Атлетика',           base: 'STR' },
  { name: 'Ближний бой',        base: 'STR / DEX' },
  { name: 'Стрельба',           base: 'DEX' },
  { name: 'Скрытность',         base: 'DEX' },
  { name: 'Акробатика',         base: 'DEX' },
  { name: 'Взлом',              base: 'INT / TEC' },
  { name: 'Анализ',             base: 'INT' },
  { name: 'Электроника',        base: 'TEC' },
  { name: 'Ремонт',             base: 'TEC' },
  { name: 'Медицина',           base: 'INT / TEC' },
  { name: 'Вождение',           base: 'DEX' },
  { name: 'Пилотирование',      base: 'DEX / TEC' },
  { name: 'Дроны',              base: 'TEC' },
  { name: 'Внимательность'
