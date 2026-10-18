import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PETS, themeFor, effectiveDayIndex, weekSequence, petForDate, BASE_DAY_INDEX } from '../src/logic.js';

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test('тема: границы 8:00 и 20:00', () => {
  assert.equal(themeFor(at(2026, 10, 18, 7, 59)), 'dark');
  assert.equal(themeFor(at(2026, 10, 18, 8, 0)), 'light');
  assert.equal(themeFor(at(2026, 10, 18, 19, 59)), 'light');
  assert.equal(themeFor(at(2026, 10, 18, 20, 0)), 'dark');
  assert.equal(themeFor(at(2026, 10, 18, 0, 0)), 'dark');
  assert.equal(themeFor(at(2026, 10, 18, 23, 59)), 'dark');
});

test('«день» животного меняется в 8:00, а не в полночь', () => {
  const evening = effectiveDayIndex(at(2026, 10, 18, 23, 30));
  const night = effectiveDayIndex(at(2026, 10, 19, 1, 0));
  const before = effectiveDayIndex(at(2026, 10, 19, 7, 59));
  const after = effectiveDayIndex(at(2026, 10, 19, 8, 0));
  assert.equal(evening, night);
  assert.equal(evening, before);
  assert.equal(after, evening + 1);
});

test('результат детерминирован', () => {
  assert.equal(petForDate(at(2026, 10, 18)), petForDate(at(2026, 10, 18, 9)));
  assert.deepEqual(weekSequence(40), weekSequence(40));
});

test('в каждой неделе: 3/2/2, подряд не повторяется', () => {
  for (let w = 0; w < 1500; w++) {
    const s = weekSequence(w);
    assert.equal(s.length, 7);
    const counts = PETS.map((p) => s.filter((x) => x === p).length).sort();
    assert.deepEqual(counts, [2, 2, 3], `неделя ${w}: ${s}`);
    for (let i = 1; i < 7; i++) assert.notEqual(s[i], s[i - 1], `неделя ${w}: ${s}`);
  }
});

test('стык недель и любое окно из 7 дней: каждое животное 2–3 раза, без повтора подряд', () => {
  const all = [];
  for (let w = 0; w < 1500; w++) all.push(...weekSequence(w));
  for (let i = 1; i < all.length; i++) assert.notEqual(all[i], all[i - 1], `день ${i}`);
  for (let i = 0; i + 7 <= all.length; i++) {
    const win = all.slice(i, i + 7);
    for (const p of PETS) {
      const c = win.filter((x) => x === p).length;
      assert.ok(c >= 2 && c <= 3, `окно с дня ${i}: ${win} (${p}=${c})`);
    }
  }
});

test('нет схемы А/Б/А/Б/А/Б/А — все три животных в каждой неделе', () => {
  for (let w = 0; w < 1500; w++) assert.equal(new Set(weekSequence(w)).size, 3);
});

test('долгосрочный баланс: за 3 недели каждое животное по 7 раз', () => {
  for (let w = 0; w < 300; w += 3) {
    const all = [...weekSequence(w), ...weekSequence(w + 1), ...weekSequence(w + 2)];
    for (const p of PETS) assert.equal(all.filter((x) => x === p).length, 7);
  }
});

test('по реальным датам (через даты и часовой пояс процесса) за 6 лет вчерашнее не повторяется', () => {
  let prev = null;
  const d = at(2026, 1, 5, 12);
  for (let i = 0; i < 365 * 6; i++) {
    const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, 12);
    const pet = petForDate(cur);
    assert.ok(PETS.includes(pet));
    if (prev) assert.notEqual(pet, prev, `дата ${cur.toDateString()}`);
    prev = pet;
  }
});

test('одно и то же животное весь «день» (8:00 → 7:59 следующего)', () => {
  const a = petForDate(at(2026, 10, 18, 8, 0));
  for (const [h, m] of [[9, 0], [15, 0], [19, 59], [20, 0], [23, 59]]) assert.equal(petForDate(at(2026, 10, 18, h, m)), a);
  for (const [h, m] of [[0, 0], [3, 0], [7, 59]]) assert.equal(petForDate(at(2026, 10, 19, h, m)), a);
  assert.notEqual(petForDate(at(2026, 10, 19, 8, 0)), a);
});

test('BASE_DAY_INDEX — понедельник', () => {
  assert.equal(new Date(BASE_DAY_INDEX * 86400000).getUTCDay(), 1);
});
