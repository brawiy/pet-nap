import { PETS, themeFor, petForDate, weekSequence, effectiveDayIndex, BASE_DAY_INDEX } from './logic.js';

const params = new URLSearchParams(location.search);
const root = document.documentElement;

// Параметры для тестирования:
//   ?now=2026-10-18T21:00   — подменить текущее время
//   ?theme=light|dark       — принудительная тема
//   ?pet=goose|mouse|capy   — принудительное животное
//   ?splash=0               — пропустить экран с лого
//   ?debug=1                — показать служебную плашку
function currentDate() {
  const raw = params.get('now');
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

const SKIP_SPLASH = params.get('splash') === '0';
const ENTER_MS = 500;      // лого влетает слева
const EXIT_MS = 500;       // лого улетает вправо
const MIN_HOLD_MS = 800;   // минимум, сколько лого висит в центре
const MAX_LOAD_MS = 6000;  // не ждём загрузку дольше
const SWIPE_PX = 40;

const now = currentDate();
const themeParam = params.get('theme');
const theme = themeParam === 'light' || themeParam === 'dark' ? themeParam : themeFor(now);
const petParam = params.get('pet');
const pet = PETS.includes(petParam) ? petParam : petForDate(now);

// Тема определяется один раз при запуске и дальше не меняется.
root.dataset.theme = theme;

// Режим «веб-приложение» (с экрана «Домой»): растягиваем слои на всю высоту экрана,
// включая нижнюю безопасную зону, которую iOS иногда не включает в высоту окна.
const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
function updateAppHeight() {
  const landscape = window.innerWidth > window.innerHeight;
  const full = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  root.style.setProperty('--app-h', Math.max(window.innerHeight, full) + 'px');
}
if (isStandalone) {
  root.classList.add('standalone');
  updateAppHeight();
  window.addEventListener('resize', updateAppHeight);
  window.addEventListener('orientationchange', updateAppHeight);
}
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#2a2b2e' : '#dcdde6');

const petLayer = document.getElementById('pet');
const petImg = petLayer.querySelector('img');
const splash = document.getElementById('splash');
petImg.src = `assets/pet-${pet}.png`;

let ready = false;
let shown = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const pageLoaded = new Promise((r) =>
  document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })
);
const assetsReady = Promise.race([
  Promise.all([petImg.decode().catch(() => {}), pageLoaded]),
  sleep(MAX_LOAD_MS),
]);

async function runSplash() {
  if (SKIP_SPLASH) {
    splash.hidden = true;
    ready = true;
    return;
  }
  await Promise.race([frames(), sleep(100)]);     // даём отрисовать лого за левым краем
  splash.classList.add('is-in');
  await sleep(ENTER_MS);
  await Promise.all([assetsReady, sleep(MIN_HOLD_MS)]);  // висит, пока всё не загрузится
  splash.classList.add('is-out');
  await sleep(EXIT_MS);
  splash.hidden = true;
  ready = true;                                    // свайпы включаются после ухода лого
}
runSplash();

function show() {
  if (shown) return;            // животное уже показано — свайп вверх игнорируется
  shown = true;
  petLayer.classList.add('is-visible');
}
function hide() {
  if (!shown) return;
  shown = false;
  petLayer.classList.remove('is-visible');
}

// Свайпы (touch/мышь через pointer events)
let start = null;
document.addEventListener('pointerdown', (e) => {
  if (!ready || !e.isPrimary) return;
  start = { x: e.clientX, y: e.clientY };
});
document.addEventListener('pointermove', (e) => {
  if (!start) return;
  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;
  if (Math.abs(dy) < SWIPE_PX || Math.abs(dy) < Math.abs(dx) * 1.2) return;
  (dy < 0 ? show : hide)();
  start = null;
});
const endGesture = () => { start = null; };
document.addEventListener('pointerup', endGesture);
document.addEventListener('pointercancel', endGesture);

// Запрет «резинки»/прокрутки страницы в Safari
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Для проверки на компьютере
document.addEventListener('keydown', (e) => {
  if (!ready) return;
  if (e.key === 'ArrowUp') show();
  if (e.key === 'ArrowDown') hide();
});

if (params.get('debug') === '1') {
  const day = effectiveDayIndex(now);
  const w = Math.floor((day - BASE_DAY_INDEX) / 7);
  const box = document.createElement('div');
  box.className = 'debug';
  box.textContent = [
    `now:   ${now.toString().slice(0, 24)}`,
    `theme: ${theme}`,
    `pet:   ${pet}`,
    `week:  ${weekSequence(w).join(' > ')}`,
    `win:   ${window.innerWidth}x${window.innerHeight}  screen: ${screen.width}x${screen.height}`,
    `standalone: ${isStandalone}  app-h: ${root.style.getPropertyValue('--app-h') || '-'}`,
    `day:   ${(day - BASE_DAY_INDEX) % 7 < 0 ? ((day - BASE_DAY_INDEX) % 7) + 7 : (day - BASE_DAY_INDEX) % 7} (0 = пн)`,
  ].join('\n');
  document.body.appendChild(box);
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
