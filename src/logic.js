// Чистая логика (без DOM) — её проверяют тесты в tests/.

export const PETS = ['goose', 'mouse', 'capy'];

export const LIGHT_FROM_HOUR = 8;   // светлая тема с 8:00
export const DARK_FROM_HOUR = 20;   // тёмная тема с 20:00
export const DAY_START_HOUR = 8;    // «день» животного начинается в 8:00 (ночь 20:00–8:00 = то же животное)

const DAY_MS = 86400000;
// Понедельник 2026-01-05: от него считаются недели.
export const BASE_DAY_INDEX = Date.UTC(2026, 0, 5) / DAY_MS;

export function themeFor(date) {
  const h = date.getHours();
  return h >= LIGHT_FROM_HOUR && h < DARK_FROM_HOUR ? 'light' : 'dark';
}

const mod = (n, m) => ((n % m) + m) % m;

// Номер «дня животного» по местному времени (устойчив к переводу часов).
export function effectiveDayIndex(date) {
  const shift = date.getHours() < DAY_START_HOUR ? 1 : 0;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - shift);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidWeek(seq, prev) {
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) return false; // подряд не повторяется
  if (!prev) return true;
  if (seq[0] === prev[prev.length - 1]) return false;                            // и на стыке недель тоже
  // любое «скользящее» окно в 7 дней на стыке: каждое животное 2–3 раза
  const all = prev.concat(seq);
  for (let s = 1; s <= 6; s++) {
    const win = all.slice(s, s + 7);
    for (const p of PETS) {
      const c = win.filter((x) => x === p).length;
      if (c < 2 || c > 3) return false;
    }
  }
  return true;
}

function buildWeek(w, prev) {
  // В неделе 7 дней и 3 животных: одно встречается 3 раза, два других — по 2. «Лишнее» крутится по кругу.
  const extra = PETS[mod(w, 3)];
  const rest = PETS.filter((p) => p !== extra);
  const pool = [extra, extra, extra, rest[0], rest[0], rest[1], rest[1]];
  const rnd = mulberry32(Math.imul(w + 1, 2654435761) ^ 0x9e3779b1);
  for (let t = 0; t < 20000; t++) {
    const seq = shuffled(pool, rnd);
    if (isValidWeek(seq, prev)) return seq;
  }
  throw new Error('Не удалось собрать расписание недели ' + w);
}

const cache = new Map();

// Расписание недели w (0 = неделя с 2026-01-05). Одно и то же на любом устройстве — без хранилища.
export function weekSequence(w) {
  if (w < 0) return buildWeek(w, null);
  let prev = null;
  for (let i = 0; i <= w; i++) {
    if (!cache.has(i)) cache.set(i, buildWeek(i, prev));
    prev = cache.get(i);
  }
  return cache.get(w);
}

export function petForDate(date) {
  const day = effectiveDayIndex(date) - BASE_DAY_INDEX;
  const w = Math.floor(day / 7);
  return weekSequence(w)[mod(day, 7)];
}
