// Точка входа: заставка, офис в разрезе, переходы между сценами и подсказки, куда идти.
import { DEPTS, ZONES, NEED, WALL_SIGNS, ORDER, CALLS, BG } from './data.js';
import { S, save, reset } from './state.js';
import * as A from './audio.js';
import * as FX from './fx.js';
import * as UI from './ui.js';
import { person, bear, lookAt, clock, SPEAKER } from './art.js';
import { TASKS } from './tasks.js';
import * as G from './gates.js';

const { $, $$, h, sleep } = UI;
const app = $('#app');
let busy = false;
const setBusy = v => { busy = v; app.classList.toggle('is-busy', v); if (!v) renderGuide(); };
const bgUrl = id => new URL(`assets/office/${BG[id]}.webp`, location.href).href;

// ---------- часы 9:59: секундная стрелка доходит до конца и откатывается ----------
let sec = 50, tenOClock = false;
setInterval(() => {
  sec = tenOClock ? sec + 1 : (sec >= 59 ? 50 : sec + 1);
  $$('.clock .c-s').forEach(s => { s.style.transform = `rotate(${sec * 6}deg)`; });
  $$('.clock').forEach(c => c.classList.toggle('tremble', !tenOClock && sec === 59));
}, 1000);
new MutationObserver(() => { tenOClock = document.body.classList.contains('ten'); }).observe(document.body, { attributes: true });

// ---------- звук ----------
document.addEventListener('click', e => {
  const b = e.target.closest('.snd');
  if (!b) return;
  A.enable(!A.isOn());
  syncSound();
});
function syncSound() { $$('.snd').forEach(b => { b.innerHTML = SPEAKER(A.isOn()); b.classList.toggle('muted', !A.isOn()); }); }

// ---------- «Поверни телефон» ----------
// CSS судит по окну, а клавиатура делает его низким и широким, будто телефон боком.
// Поэтому спрашиваем сам экран; пока печатают ответ, подсказку не показываем вовсе.
function syncUpright() {
  const t = screen.orientation?.type;
  const portrait = t ? t.startsWith('portrait') : typeof window.orientation === 'number' && window.orientation % 180 === 0;
  const typing = !!document.activeElement?.matches('input, textarea, [contenteditable]');
  document.documentElement.classList.toggle('upright', portrait || typing);
}
screen.orientation?.addEventListener('change', syncUpright);
addEventListener('orientationchange', syncUpright);
addEventListener('resize', syncUpright);
document.addEventListener('focusin', syncUpright);
document.addEventListener('focusout', () => setTimeout(syncUpright));
syncUpright();

// ---------- заставка ----------
// Встроенный браузер Телеграма режет звук, поэтому предупреждаем сразу.
// ?tg в адресе показывает ту же подсказку для проверки.
// На зеркале внизу справа значок хостинга, под него освобождаем место.
if (location.hostname.endsWith('netlify.app')) document.documentElement.classList.add('on-netlify');

const TG_FLAG = new URLSearchParams(location.search).has('tg');   // адрес чистится при ?reset, поэтому читаем сразу
const inTelegram = () => !!(window.TelegramWebviewProxy || window.Telegram?.WebView || /Telegram/i.test(navigator.userAgent) || TG_FLAG);

function intro() {
  const back = S.entered;
  const el = h(`<section class="screen intro">
    <div class="intro-top">ACTIONDIST · ВНУТРЕННЯЯ СЕТЬ</div>
    <div class="intro-crt"><div class="crt-box big"><div class="crt-text">${back ? 'С ВОЗВРАЩЕНИЕМ.<br>РАБОЧИЙ ДЕНЬ<br>ПРОДОЛЖАЕТСЯ' : 'ВНИМАНИЕ.<br>ИМЕНИННИК<br>В ЗДАНИИ'}</div></div></div>
    <div class="intro-actions">
      <button class="btn wide" data-s="1">Войти со звуком</button>
      <button class="btn ghost wide" data-s="0">Без звука</button>
      <p class="intro-note">Звук можно выключить в любой момент, кнопка справа сверху.</p>
    ${inTelegram() ? '<p class="intro-tg">Открыто внутри Телеграма. Если звука не будет, нажми три точки справа сверху и выбери «Открыть в Safari»</p>' : ''}
    </div>
  </section>`);
  $('#screens').append(el);
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-s]');
    if (!b || busy) return;
    busy = true;
    A.enable(b.dataset.s === '1');
    A.sfx('beep');
    el.classList.add('out');
    await sleep(450);
    el.remove();
    busy = false;
    if (S.entered) { showHub(); welcomeBack(); }
    else await enter();
  });
}

async function enter() {
  setBusy(true);
  showHub();
  zoomTo('door', 0);
  await G.entrance();
  S.entered = true; save();
  renderHub();
  await sleep(80);
  await reveal3d(1900);
  await G.regulation();
  setBusy(false);
  // Первое знакомство с офисом: объясняем, как тут все устроено.
  if (!S.seen.hub) {
    S.seen.hub = true; save();
    await sleep(500);
    UI.toast('Кто зовет, у того задание. Порядок любой: нажми отдел на плане или кнопку «Другой отдел»');
  }
}

function welcomeBack() {
  const t = target();
  if (t && t !== 'finale') setTimeout(() => UI.toast(`С возвращением. Тебя ждут: ${nameOf(t)}`), 500);
}

// ---------- кто сейчас зовет ----------
// Первый несделанный отдел этажа, потом лестница или переговорная.
function target() {
  if (!S.gift1) return ORDER[1].find(id => !S.done[id]) || 'stairs';
  if (!S.gift2) return ORDER[2].find(id => !S.done[id]) || 'meeting';
  return 'finale';
}
// Как отдел называется в подсказках и на кнопке.
const NICK = { buh: 'бухгалтерия', sales: 'отдел продаж', log: 'логистика', prod: 'продукт', mkt: 'маркетинг', design: 'дизайнеры', haggle: 'Сережа', captcha: 'Влад', dossier: 'поддержка', call: 'удаленка', stairs: 'лестница', meeting: 'переговорная', finale: 'переговорная' };
const nameOf = t => NICK[t];
const undoneHere = () => (S.gift1 ? ORDER[2] : ORDER[1]).filter(id => !S.done[id]);

function renderGuide() {
  const b = $('#building');
  if (!b) return;
  const t = target();
  const zid = t === 'finale' ? 'meeting' : t;
  $$('#building .zone.calling').forEach(z => z.classList.remove('calling'));
  $(`#building [data-zone="${zid}"]`)?.classList.add('calling');
  // реплика над отделом
  const z = ZONES[zid], bub = $('#bubble'), ring = $('#ring');
  bub.textContent = t === 'finale' ? 'Все уже тут' : CALLS[zid];
  bub.style.left = `${Math.min(75, Math.max(25, z.x + z.w / 2))}%`;
  bub.style.top = `${z.y + 1}%`;
  bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
  ring.style.left = `${z.x + z.w / 2}%`;
  ring.style.top = `${z.y + z.h * 0.84}%`;
  // кнопка внизу
  const cta = $('#cta');
  const big = t === 'finale' ? 'ФИНАЛ' : NICK[t].toUpperCase();
  const small = t === 'stairs' ? 'Все 6 подсказок у тебя. Угадай подарок' : t === 'meeting' ? 'Все подсказки у тебя. Угадай второй подарок' : t === 'finale' ? 'Посмотреть поздравление еще раз' : 'Тебя зовут';
  $('#ctaGo', cta).innerHTML = `<span class="cta-txt"><small>${small}</small><b>${big}</b></span><span class="cta-go">›</span>`;
  cta.dataset.go = zid;
  // кнопка выбора нужна, только если есть куда еще пойти
  cta.classList.toggle('with-pick', undoneHere().some(id => id !== t && DEPTS[id]));
}

// Остальные отделы тоже иногда подают голос: порядок свободный.
setInterval(() => {
  if (busy || !$('#hub') || $('#screens .scene') || $('#overlay > *') || !S.entered) return;
  if (S.clues[1].length + S.clues[2].length === 0) return;
  const t = target();
  const others = undoneHere().filter(id => id !== t);
  if (!others.length) return;
  const id = others[Math.floor(Math.random() * others.length)], z = ZONES[id];
  const el = h(`<span class="bubble side">${CALLS[id]}</span>`);
  el.style.left = `${Math.min(75, Math.max(25, z.x + z.w / 2))}%`;
  el.style.top = `${z.y + 1}%`;
  $('#building').append(el);
  $$(`#building [data-zone="${id}"] .person`).forEach(p => p.classList.add('talking'));
  setTimeout(() => { el.remove(); $$(`#building [data-zone="${id}"] .person`).forEach(p => p.classList.remove('talking')); }, 2600);
}, 7000);

// ---------- офис в разрезе ----------
const at = z => `left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%`;
const zbg = id => BG[id] ? `--zbg:url(${bgUrl(id)});` : '';

function zoneHTML(id) {
  const d = DEPTS[id], z = ZONES[id];
  return `<div class="zone photo" role="button" tabindex="0" data-zone="${id}" aria-label="${d.sign}" style="${at(z)};${zbg(id)}">
    <i class="lamp"></i><span class="plate">${d.short || d.sign}</span>
    ${id === 'dossier' ? clock('zone-clock') : ''}
    <span class="cast">${d.cast.map(p => person(p, { name: false })).join('')}</span>
    <span class="desk"></span><span class="done-stamp">ГОТОВО</span>
  </div>`;
}

function hubHTML() {
  const steps = Array.from({ length: 7 }, (_, i) => `<i style="left:${i * 14}%;height:${(i + 1) * 13}%"></i>`).join('');
  return `<section class="screen hub" id="hub">
    <header class="topbar"><span class="status" id="status"></span><button class="snd" aria-label="Звук"></button></header>
    <div class="hub-view"><div class="building" id="building">
      <div class="bldg-shell"></div>
      <div class="slab s-roof"></div><div class="slab s-mid"></div><div class="slab s-ground"></div>
      <i class="d3w l"></i><i class="d3w r"></i>
      <i class="d3p p-roof"></i><i class="d3p p-mid"></i><i class="d3p p-ground"></i>
      ${Object.keys(DEPTS).map(zoneHTML).join('')}
      <div class="zone photo meetz" role="button" tabindex="0" data-zone="meeting" aria-label="Переговорная" style="${at(ZONES.meeting)};${zbg('meeting')}">
        <i class="lamp"></i><span class="plate">ПЕРЕГОВОРНАЯ</span><span class="mdoor"><b class="busy">ЗАНЯТО</b></span>
      </div>
      <div class="zone doorz" role="button" tabindex="0" data-zone="door" aria-label="Выход" style="${at(ZONES.door)}">
        <i class="lamp"></i><span class="in-door"><b>ВЫХОД</b></span>
      </div>
      <div class="zone photo lobby" role="button" tabindex="0" data-zone="lobby" aria-label="Регламент" style="${at(ZONES.lobby)};${zbg('lobby')}">
        <i class="lamp"></i>
        <span class="wall-bear">${bear({ cls: 'wall' })}</span>${clock('lobby-clock')}
        <span class="reg-mini"><b>РЕГЛАМЕНТ</b><i></i><i></i><i></i><i></i></span>
        <span class="lobby-sign">Сноуборд без согласования не выносить</span>
      </div>
      <div class="zone photo stairsz" role="button" tabindex="0" data-zone="stairs" aria-label="Лестница" style="${at(ZONES.stairs)};${zbg('stairs')}">
        <i class="lamp"></i><span class="plate">ЛЕСТНИЦА</span><span class="steps">${steps}</span>
        <span class="tape"><b>ПРОХОД ТОЛЬКО ДЛЯ УГАДАВШИХ</b></span>
      </div>
      <div class="lock2"><b>ДОСТУП ЗАПРЕЩЕН</b><small>откроется после первого подарка</small></div>
      <div class="yura-token" id="yura">${person('yura', { name: false, snow: true })}</div>
      <i class="ring" id="ring"></i>
      <span class="bubble" id="bubble"></span>
    </div></div>
    <div class="cta" id="cta">
      <button class="cta-main" id="ctaGo"></button>
      <button class="cta-pick" id="ctaPick">Другой<br>отдел</button>
    </div>
  </section>`;
}

function showHub() {
  if (!$('#hub')) {
    $('#screens').prepend(h(hubHTML()));
    $('#building').addEventListener('click', onZone);
    $('#building').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.zone) onZone(e); });
    $('#cta').addEventListener('click', e => {
      if (busy) return;
      if (e.target.closest('#ctaPick')) { pickDept(); return; }
      go($('#cta').dataset.go);
    });
    placeYura(S.gift1 ? { x: 55, y: 22, w: 10, h: 15 } : { x: 20, y: 74, w: 10, h: 18 }, true);
  }
  renderHub();
  syncSound();
}

function renderHub() {
  $$('#building .zone[data-zone]').forEach(z => z.classList.toggle('done', !!S.done[z.dataset.zone]));
  $('#building').classList.toggle('unlocked', S.gift1);
  $('#building').classList.toggle('stairs-open', S.clues[1].length >= NEED[1] || S.gift1);
  $('#building').classList.toggle('meet-open', S.clues[2].length >= NEED[2]);
  const c1 = S.clues[1].length, c2 = S.clues[2].length;
  $('#status').textContent =
    !S.gift1 ? (c1 < NEED[1] ? `1 ЭТАЖ · ПОДСКАЗКИ ${c1} ИЗ ${NEED[1]}` : 'ИДИ К ЛЕСТНИЦЕ') :
    !S.gift2 ? (c2 < NEED[2] ? `2 ЭТАЖ · ПОДСКАЗКИ ${c2} ИЗ ${NEED[2]}` : 'ИДИ В ПЕРЕГОВОРНУЮ') : 'ВСЕ СОГЛАСОВАНО';
  renderClues();
  renderGuide();
}

function renderClues() {
  const cb = $('#cluebar');
  cb.hidden = !S.entered;
  app.classList.toggle('in-office', S.entered);
  const slips = (f, n, total) => Array.from({ length: total }, (_, i) => `<i class="slip ${i < n ? 'got' : ''}"></i>`).join('');
  cb.innerHTML = `<button class="cb-btn" id="cbOpen" aria-label="Подсказки">
    <span class="cb-label">ПОДСКАЗКИ</span>
    <span class="cb-slips">${slips(1, S.clues[1].length, NEED[1])}${S.gift1 ? `<span class="cb-sep"></span>${slips(2, S.clues[2].length, NEED[2])}` : ''}</span>
    <span class="cb-open">›</span></button>`;
}

$('#cluebar').addEventListener('click', () => {
  if ($('.clues-wrap')) return;
  A.sfx('click');
  $('.cb-tip')?.remove();
  const list = f => {
    const got = S.clues[f];
    const items = got.map(c => `<div class="paper clue-mini"><small>${DEPTS[c.id].from}</small>${c.text}</div>`).join('');
    const left = NEED[f] - got.length;
    return items + (left > 0 ? `<div class="clue-empty">Еще не получено: ${left}</div>` : '');
  };
  UI.sheet(`<h3 class="clues-h">1 ЭТАЖ · ПОДАРОК №1${S.gift1 ? ' · <em>УГАДАН</em>' : ''}</h3>${list(1)}
    ${S.gift1 ? `<h3 class="clues-h">2 ЭТАЖ · ПОДАРОК №2${S.gift2 ? ' · <em>УГАДАН</em>' : ''}</h3>${list(2)}` : ''}`, { btn: 'Закрыть', cls: 'clues-wrap' });
});

// Один раз показываем, где копятся подсказки.
function clueTip() {
  if (S.seen.clues) return;
  S.seen.clues = true; save();
  const cb = $('#cluebar');
  cb.classList.add('pulse');
  const tip = h('<div class="cb-tip">Подсказки копятся здесь. Нажми, чтобы перечитать</div>');
  app.append(tip);
  setTimeout(() => { tip.remove(); cb.classList.remove('pulse'); }, 5000);
}

// ---------- камера ----------
function placeYura(z, instant = false) {
  const y = $('#yura');
  if (!y) return;
  if (instant) y.style.transition = 'none';
  y.style.left = `${z.x + z.w / 2}%`;
  y.style.top = `${z.y + z.h - 1.5}%`;
  if (instant) { void y.offsetWidth; y.style.transition = ''; }
  const wb = $('.wall-bear .bear');
  const dx = (z.x + z.w / 2) > 44 ? 2.5 : -2.5, dy = z.y < 40 ? -2.5 : 1.5;
  setTimeout(() => lookAt(wb, dx, dy), 250);
}

// Первый взгляд на офис: дом сначала виден объемным макетом с двумя этажами,
// камера медленно обходит его и только потом раскладывает в плоский разрез.
async function reveal3d(ms = 1900, from = 'wide') {
  const b = $('#building');
  const [p0, p1] = from === 'floor2'
    ? ['translateY(5%) scale(.84) rotateX(12deg) rotateY(23deg)', 'translateY(3%) scale(.89) rotateX(9deg) rotateY(14deg)']
    : ['translateY(2%) scale(.72) rotateX(15deg) rotateY(-26deg)', 'translateY(1%) scale(.78) rotateX(11deg) rotateY(-16deg)'];
  const dur = x => UI.FAST ? Math.round(x / 10) : x;
  const orbit = Math.round(ms * 0.47), settle = ms - orbit;
  b.classList.add('d3');
  b.style.transition = 'none';
  b.style.transformOrigin = '50% 50%';
  b.style.transform = p0;
  void b.offsetWidth;
  b.style.transition = `transform ${dur(orbit)}ms linear`;
  b.style.transform = p1;
  await sleep(orbit);
  b.style.transition = `transform ${dur(settle)}ms cubic-bezier(.4,0,.2,1)`;
  b.style.transform = 'translate(0px, 0px) scale(1)';
  await sleep(settle + 60);
  b.classList.remove('d3');
  b.style.transition = '';
}

function zoomTo(zid, ms = 420) {
  const b = $('#building'), z = ZONES[zid];
  const W = b.offsetWidth, H = b.offsetHeight;
  const cx = (z.x + z.w / 2) / 100 * W, cy = (z.y + z.h / 2) / 100 * H;
  const s = Math.min(3.4, 0.94 / (z.w / 100), 0.9 / (z.h / 100));
  b.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.35,1)`;
  b.style.transformOrigin = `${cx}px ${cy}px`;
  b.style.transform = `translate(${W / 2 - cx}px, ${H / 2 - cy}px) scale(${s})`;
  return sleep(ms);
}
function zoomOut(ms = 420) {
  const b = $('#building');
  b.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.35,1)`;
  b.style.transform = 'translate(0px, 0px) scale(1)';
  return sleep(ms);
}

// ---------- сцены отделов ----------
function openScene(id) {
  const d = DEPTS[id];
  const el = h(`<section class="screen scene dept" data-scene="${id}">
    <div class="scene-bg" style="background-image:url(${bgUrl(id)})"><span class="wall-sign">${WALL_SIGNS[id]}</span>${clock('wall-clock')}</div>
    <header class="topbar"><button class="back">‹ ОФИС</button><span class="scene-title">${d.sign}</span><button class="snd" aria-label="Звук">${SPEAKER(A.isOn())}</button></header>
    <div class="stage-row"><div class="cast" style="--n:${d.cast.length}">${d.cast.map(p => person(p)).join('')}</div><div class="desk"></div><div class="props"></div></div>
  </section>`);
  $('#screens').append(el);
  syncSound();
  void el.offsetHeight;
  el.classList.add('in');
  return { el, id, props: $('.props', el), panel: null };
}

async function closeScene(el) {
  el.classList.remove('in');
  await sleep(280);
  el.remove();
  UI.runCleanups();
  app.style.removeProperty('--subs-bottom');
}

async function runDept(id) {
  const d = DEPTS[id];
  await zoomTo(id);
  const sc = openScene(id);
  let backRes;
  const back = new Promise(r => { backRes = r; });
  $('.back', sc.el).addEventListener('click', () => { A.sfx('click'); backRes('back'); });
  const task = TASKS[id](sc).then(r => ({ r }), e => ({ e }));
  const out = await Promise.race([task, back]);
  if (out === 'back' || out.e) {
    if (out.e && out.e !== UI.ABORT) console.error(out.e);
    UI.abortAll();
    await closeScene(sc.el);
    await zoomOut();
    UI.toast('Задание подождет. Вернешься, начнешь заново');
    return;
  }
  const res = typeof out.r === 'string' ? { text: out.r } : out.r;
  try {
    await UI.clueAward(res.text, d.from, d.floor);
    S.clues[d.floor].push({ id, text: res.text });
    S.done[id] = true;
    save();
    renderClues();
    for (const [w, t] of res.after || []) await UI.say(w, t);
  } catch (e) { if (e !== UI.ABORT) console.error(e); }
  await closeScene(sc.el);
  await zoomOut();
  renderHub();
  const n = S.clues[d.floor].length;
  if (n === 1 && d.floor === 1) clueTip();
  if (n === 3 && !S.glitch[d.floor]) {
    S.glitch[d.floor] = true;
    save();
    await glitch();
  }
  if (n === NEED[d.floor]) {
    UI.toast(d.floor === 1 ? 'Шесть подсказок у тебя. Иди к лестнице' : 'Четыре подсказки у тебя. Иди в переговорную');
    A.sfx('success');
  }
}

// Сбой: лампы мигают, все поворачиваются и слишком широко улыбаются.
async function glitch() {
  const hub = $('#hub');
  await sleep(300);
  A.sfx('glitch');
  FX.flicker(3);
  await sleep(300);
  hub.classList.add('glitch-on');
  await sleep(1800);
  FX.flicker(1);
  hub.classList.remove('glitch-on');
}

async function runGate(fn) {
  let backRes;
  const back = new Promise(r => { backRes = r; });
  const r = await Promise.race([fn(() => backRes('back')), back]);
  if (r === 'back') {
    UI.abortAll();
    const sc = $('#screens .scene:last-child');
    if (sc) await closeScene(sc);
    return false;
  }
  return r;
}

// Выбор отдела списком: по плану офиса нажимать можно, но это неочевидно.
function pickDept() {
  const t = target();
  const list = [t, ...undoneHere().filter(id => id !== t)].filter(id => DEPTS[id]);
  if (!list.length) return;
  A.sfx('click');
  let taken = false;
  UI.sheet(`<div class="pick">
      <b class="pick-h">Куда пойдешь?</b>
      <div class="pick-list">${list.map(id => `<button class="pick-item${id === t ? ' now' : ''}" data-pick="${id}">
        <span class="pick-name">${NICK[id].toUpperCase()}${id === t ? '<i>зовут</i>' : ''}</span>
        <span class="pick-call">${CALLS[id]}</span>
      </button>`).join('')}</div>
      <small class="pick-note">Отделы можно нажимать и прямо на плане офиса</small>
    </div>`, { btn: 'Назад', cls: 'pick-sheet', onOpen: el => {
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-pick]');
      if (!b || taken) return;
      taken = true;
      A.sfx('click');
      el.classList.add('out');
      setTimeout(() => el.remove(), 240);
      go(b.dataset.pick);
    });
  } });
}

// ---------- куда нажали ----------
function onZone(e) {
  if (busy) return;
  const zEl = e.target.closest('[data-zone], .lock2');
  if (!zEl) return;
  go(zEl.dataset.zone);
}

async function go(id) {
  if (busy) return;
  if (!id || (DEPTS[id]?.floor === 2 || id === 'meeting') && !S.gift1) {
    UI.toast('Второй этаж откроется, когда угадаешь первый подарок на лестнице');
    A.sfx('deny');
    flash(S.clues[1].length >= NEED[1] ? 'stairs' : target());
    return;
  }
  setBusy(true);
  try {
    if (DEPTS[id]) {
      if (S.done[id]) {
        UI.toast(`Здесь подсказку уже выдали. Сейчас ждут: ${nameOf(target())}`);
        flash(target());
        return;
      }
      placeYura(ZONES[id]);
      await sleep(250);
      await runDept(id);
    } else if (id === 'lobby') {
      A.sfx('click');
      await G.regulation();
    } else if (id === 'door') {
      UI.toast('Выход только после квеста. Регламент');
    } else if (id === 'stairs') {
      if (S.gift1) { UI.toast('Лестницу ты уже прошел, ты на втором этаже'); flash(target()); return; }
      const n = S.clues[1].length;
      if (n < NEED[1]) {
        UI.toast(`Проход только для угадавших. Сначала собери подсказки: ${n} из ${NEED[1]}`);
        A.sfx('deny');
        flash(target());
        return;
      }
      placeYura(ZONES.stairs);
      await sleep(380);
      await zoomTo('stairs');
      const ok = await runGate(G.stairs);
      if (ok) {
        S.gift1 = true; save();
        renderHub();
        placeYura({ x: 55, y: 22, w: 10, h: 15 }, true);
        await sleep(60);
        await reveal3d(1600, 'floor2');
        UI.toast('Ты на втором этаже. Тут сидит отдел коммерции');
      } else {
        await zoomOut();
      }
    } else if (id === 'meeting') {
      if (S.gift2) { await zoomTo('meeting'); await G.finale(again); return; }
      const n = S.clues[2].length;
      if (n < NEED[2]) {
        UI.toast(`Переговорная занята. Сначала собери подсказки: ${n} из ${NEED[2]}`);
        A.sfx('deny');
        flash(target());
        return;
      }
      placeYura(ZONES.meeting);
      await sleep(380);
      await zoomTo('meeting');
      const ok = await runGate(G.meetingDoor);
      if (ok) {
        S.gift2 = true; save();
        renderHub();
        await G.finale(again);
      } else {
        await zoomOut();
      }
    }
  } finally {
    setBusy(false);
  }
}

// Короткая вспышка на отделе, куда стоит идти.
function flash(id) {
  const z = $(`#building [data-zone="${id}"]`);
  if (!z) return;
  z.classList.remove('flash'); void z.offsetWidth; z.classList.add('flash');
  setTimeout(() => z.classList.remove('flash'), 1400);
}

function again() {
  reset();
  location.reload();
}

// ---------- старт ----------
// ?reset в адресе стирает прогресс, чтобы пройти квест с начала.
if (new URLSearchParams(location.search).has('reset')) { reset(); history.replaceState(null, '', location.pathname); }
FX.startNoise($('#noise'));
FX.lampLife();
intro();
