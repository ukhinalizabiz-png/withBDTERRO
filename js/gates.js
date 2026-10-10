// Вход, регламент, лестница (подарок 1), переговорная (подарок 2), финал.
import * as UI from './ui.js';
import * as A from './audio.js';
import * as FX from './fx.js';
import { PEOPLE, CAMS, GROUP_PHOTO } from './data.js';
import { person, bear, lookAt, clock, FAX, TURNTABLE, monFace, SPEAKER } from './art.js';

const { say, wait, sleep, h, $, $$, panel, closePanel } = UI;

const MEETING_BG = new URL('assets/office/meeting.webp', location.href).href;
const STAIRS_BG = new URL('assets/office/stairs.webp', location.href).href;
const topbar = (title, back = true) => `<header class="topbar">${back ? '<button class="back">‹ ОФИС</button>' : '<span class="tb-spacer"></span>'}<span class="scene-title">${title}</span><button class="snd" aria-label="Звук">${SPEAKER(A.isOn())}</button></header>`;

function mount(el) {
  $('#screens').append(el);
  void el.offsetHeight;
  el.classList.add('in');
  return { el, panel: null };
}
async function unmount(sc) {
  sc.el.classList.remove('in');
  await sleep(280);
  sc.el.remove();
}

// ---------- вход ----------
export async function entrance() {
  const yc = CAMS.yura;
  const sc = mount(h(`<section class="screen scene entrance">
    ${topbar('ОФИС 205', false)}
    <div class="corridor"><div class="door-shot">
      <img class="door-photo" src="assets/door.webp" alt="Дверь офиса ACTIONDIST" draggable="false">
      <i class="door-glow"></i>
      <i class="note-mini"></i>
      <div class="reader"><i class="led"></i><div class="reader-screen">ПРИЛОЖИ<br>ПРОПУСК</div></div>
    </div></div>
    <div class="entrance-actions">
      <div class="note"><i class="tape-bit t1"></i><i class="tape-bit t2"></i><small>НА ДВЕРИ, НА СКОТЧЕ</small>Юра, в офисе для тебя кое-что лежит. Просто так не отдадим. Угадаешь, что это, тогда поговорим.</div>
      <button class="btn wide" id="passBtn">Приложить пропуск</button>
    </div>
    <div class="pass" id="pass">
      <div class="pass-photo">${yc ? `<img src="${yc}" alt="">` : person('yura', { name: false })}</div>
      <div class="pass-info"><small>ПРОПУСК № 001</small><b>Юра</b><span>Должность: генеральный директор</span><span>Статус на сегодня: именинник</span></div>
    </div>
  </section>`));
  const el = sc.el, led = $('.led', el), scr = $('.reader-screen', el), pass = $('#pass', el);
  await UI.onceClick($('#passBtn', el));
  $('.entrance-actions', el).classList.add('gone');
  pass.classList.add('show');
  A.sfx('paper');
  await sleep(1200);
  pass.classList.add('scan');
  await sleep(500);
  A.sfx('deny');
  led.className = 'led red';
  scr.innerHTML = 'ДОСТУП<br>ЗАПРЕЩЕН';
  pass.classList.remove('show', 'scan');
  await say('reader', 'Доступ запрещен. Именинников пускаем только через квест.');
  await sleep(500);
  A.sfx('beep');
  led.className = 'led green';
  scr.innerHTML = 'ЗАХОДИ';
  await say('reader', 'Ладно, заходи.');
  A.sfx('door');
  el.classList.add('opening');
  await sleep(900);
  await unmount(sc);
}

// ---------- регламент ----------
export async function regulation() {
  await UI.sheet(`<div class="reg-wall">${bear({ cls: 'wall' })}${clock('reg-clock')}</div>
    <div class="paper reg">
      <h3>РЕГЛАМЕНТ ПРОХОЖДЕНИЯ КВЕСТА</h3>
      <p>Нажимай на коллег. Каждый отдел даст задание, за верный ответ получишь подсказку. Соберешь все и поймешь, что тебя ждет.</p>
      <p class="reg-sign">Согласовано всеми отделами.</p>
      <div class="stamp hit">ПЕЧАТЬ<br>БУХГАЛТЕРИИ</div>
    </div>
    <p class="reg-note">Подсказки копятся в полоске внизу экрана.</p>`, {
    btn: 'Принято',
    cls: 'reg-wrap',
    onOpen: w => {
      const b = $('.bear', w);
      lookAt(b, -3, -1);
      setTimeout(() => { lookAt(b, 1.5, 2.5); A.sfx('low'); }, 1600);
    },
  });
}

// ---------- ввод догадки ----------
function guessForm(sc, label) {
  const body = panel(sc, `<form class="guess" autocomplete="off">
      <label for="g">${label}</label>
      <div class="guess-row"><input id="g" type="text" enterkeyhint="send" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Твой ответ"><button class="btn" type="submit">Ответить</button></div>
    </form>`, { kind: 'crt' });
  const form = $('form', body);
  form.addEventListener('submit', e => e.preventDefault());
  return { form, input: $('input', body) };
}

function nextGuess(form, input) {
  const t = UI.tok();
  return new Promise(res => {
    const fn = e => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      form.removeEventListener('submit', fn);
      A.sfx('click');
      res(v);
    };
    form.addEventListener('submit', fn);
    UI.cleanup(() => form.removeEventListener('submit', fn));
  }).then(v => { UI.check(t); return v; });
}

function pulseClues() {
  const cb = $('#cluebar');
  cb.classList.remove('pulse'); void cb.offsetWidth; cb.classList.add('pulse');
  setTimeout(() => cb.classList.remove('pulse'), 4000);
}

const pickReply = (v, table, fallback) => (table.find(([words]) => UI.matches(v, words)) || [null, fallback])[1];

// ---------- лестница ----------
const STAIRS_OK = ['пластинка', 'винил', 'виниловая пластинка', 'грампластинка'];
const STAIRS_NO = [
  [['диск', 'cd', 'сд', 'компакт'], 'Почти. Но у нас не 2007-й.'],
  [['сноуборд', 'доска', 'доску', 'борд'], 'Досок у тебя и так полный склад.'],
  [['премия', 'премию', 'бонус'], 'Бухгалтерия такое не согласовывала.'],
  [['пицца', 'пиццу'], 'Круглая и плоская, согласны. Но пицца по пятницам.'],
  [['часы'], 'Круглые, да. Но нет.'],
];

function flight(n) {
  return Array.from({ length: n }, (_, i) => `<i style="left:${(i * 100 / n).toFixed(2)}%;bottom:0;width:${(100 / n + 0.6).toFixed(2)}%;height:${((i + 1) * 100 / n).toFixed(2)}%"></i>`).join('');
}

export async function stairs(back) {
  const sc = mount(h(`<section class="screen scene stairs-scene">
    ${topbar('ЛЕСТНИЦА')}
    <div class="stairwell">
      <div class="stair-bg" style="background-image:url(${STAIRS_BG})"></div>
      <div class="floor-sign">ЭТАЖ <b>1</b></div>
      <div class="step-count">СТУПЕНЕК: <b>14</b></div>
      <div class="flight">${flight(14)}</div>
      <div class="fax-spot">${FAX}</div>
      <div class="guard">${bear({ cls: 'guard' })}<span class="badge">ОХРАНА</span></div>
      <div class="tape big" id="tape"><span>ПРОХОД ТОЛЬКО ДЛЯ УГАДАВШИХ</span><em class="tape-hint"></em></div>
    </div>
  </section>`));
  $('.back', sc.el).addEventListener('click', () => { A.sfx('click'); back(); });
  const el = sc.el, gb = $('.guard .bear', el);
  lookAt(gb, 0, 1);
  const { form, input } = guessForm(sc, 'Ну что, Юра, что тебя ждет?');
  let wrong = 0;
  try {
    for (;;) {
      const v = await nextGuess(form, input);
      lookAt(gb, 0, 3);
      if (UI.matches(v, STAIRS_OK)) break;
      wrong++;
      input.value = '';
      FX.shake(form);
      A.sfx('nope');
      if (wrong === 3) {
        $('.tape-hint', el).textContent = 'П _ _ _ _ _ _ _ _ · 9 букв';
        A.sfx('stamp');
      }
      UI.aside('office', pickReply(v, STAIRS_NO, 'Холодно. Перечитай подсказки внизу.'));
      pulseClues();
      setTimeout(() => lookAt(gb, 0, 1), 1500);
    }
    input.blur();
    closePanel(sc);
    A.sfx('scratch');
    $('#tape', el).classList.add('fall');
    $('.guard', el).classList.add('aside');
    await wait(700);
    // Подъем: ступенек становится больше.
    const fl = $('.flight', el), cnt = $('.step-count b', el), fs = $('.floor-sign b', el);
    el.classList.add('climbing');
    await wait(600);
    fl.innerHTML = flight(15); cnt.textContent = '15'; A.sfx('tick');
    await wait(700);
    fl.innerHTML = flight(23); cnt.textContent = '23'; A.sfx('tick');
    await wait(500);
    fs.textContent = '2½'; A.sfx('glitch'); FX.flicker(2);
    await wait(500);
    fs.textContent = '2';
    await wait(350);
    $('.fax', el).classList.add('printing');
    A.sfx('fax');
    await wait(1700);
    await UI.sheet(`<div class="paper fax-paper"><div class="fax-head">ФАКС · ВХОДЯЩИЙ · ОТ ВСЕХ ОТДЕЛОВ</div><p>Юра, у тебя все получится! Создавай и реализуй, а мы поддержим!</p><p>P.S. В офисе ждет третий подарок, которого нет здесь)</p></div>`, { btn: 'Подняться на второй этаж', cls: 'fax-wrap' });
    await unmount(sc);
    return true;
  } catch (e) {
    if (e !== UI.ABORT) console.error(e);
    return false;
  }
}

// ---------- переговорная ----------
const CAKE_OK = ['торт', 'тортик', 'торты', 'тортики'];
const CAKE_NO = [
  [['пирог', 'пирожок'], 'Близко. Но нет.'],
  [['пицца', 'пиццу'], 'Опять пицца? Сказали же, по пятницам.'],
  [['пирожные', 'пирожное', 'печенье', 'печенька', 'печеньки'], 'Бери выше. Слоев на пять.'],
];

export async function meetingDoor(back) {
  const sc = mount(h(`<section class="screen scene door-scene" style="--mbg:url(${MEETING_BG})">
    ${topbar('ПЕРЕГОВОРНАЯ')}
    <div class="mr-door">
      <span class="mr-plate">ПЕРЕГОВОРНАЯ</span>
      <div class="card">
        <div class="card-photo"><i></i><span>фото скрыто</span></div>
        <div class="card-name"><span class="redact">████████</span><em class="card-hint"></em></div>
        <div class="card-rating">★★★☆☆ <b>3,0</b> · 2 отзыва</div>
        <dl class="card-specs">
          <dt>Вес</dt><dd>хватит на весь офис, кроме удаленки</dd>
          <dt>Срок годности</dt><dd>до конца рабочего дня</dd>
          <dt>Комплектация</dt><dd>свечи и надпись, нож не входит. Шрифт надписи с дизайнерами не согласован</dd>
        </dl>
        <div class="card-reviews">
          <div class="rv"><b>Сережа</b><span>★★★★★</span><p>Взял бы еще</p></div>
          <div class="rv"><b>Катя</b><span>★☆☆☆☆</span><p>До удаленки не доехало</p></div>
        </div>
      </div>
    </div>
  </section>`));
  $('.back', sc.el).addEventListener('click', () => { A.sfx('click'); back(); });
  const el = sc.el;
  const { form, input } = guessForm(sc, 'Что за товар на карточке?');
  let wrong = 0;
  try {
    for (;;) {
      const v = await nextGuess(form, input);
      if (UI.matches(v, CAKE_OK)) break;
      wrong++;
      input.value = '';
      FX.shake(form);
      A.sfx('nope');
      if (wrong === 3) { $('.card-hint', el).textContent = 'Т _ _ _ · 4 буквы'; A.sfx('stamp'); }
      UI.aside('office', pickReply(v, CAKE_NO, 'Холодно. Как в холодильнике, где оно стоит.'));
      pulseClues();
    }
    input.blur();
    closePanel(sc);
    A.sfx('success');
    el.classList.add('opening');
    A.sfx('door');
    await wait(900);
    await unmount(sc);
    return true;
  } catch (e) {
    if (e !== UI.ABORT) console.error(e);
    return false;
  }
}

// ---------- финал ----------
export async function finale(onAgain) {
  const office = Object.keys(PEOPLE).filter(id => id !== 'yura' && !PEOPLE[id].remote);
  const remote = Object.keys(PEOPLE).filter(id => PEOPLE[id].remote);
  const sc = mount(h(`<section class="screen scene finale" style="--mbg:url(${MEETING_BG})">
    ${topbar('ПЕРЕГОВОРНАЯ', false)}
    <div class="mr">
      <i class="lamp l1"></i><i class="lamp l2"></i>
      <div class="tv"><div class="tv-screen">${remote.map(id => `<div class="tv-tile" data-person="${id}">${monFace(id)}<span>${PEOPLE[id].name}</span></div>`).join('')}<div class="tv-tile tv-logo"><span>ACTIONDIST</span></div></div></div>
      ${clock('mr-clock')}
      <div class="party-bear">${bear({ cls: 'party' })}</div>
      <div class="crowd-wrap">
        <div class="crowd">${office.slice(0, 7).map(id => person(id)).join('')}</div>
        <div class="crowd">${office.slice(7).map(id => person(id)).join('')}</div>
      </div>
      <div class="mr-table">${TURNTABLE}</div>
    </div>
    <div class="mr-doors"><i></i><i></i></div>
  </section>`));
  const el = sc.el;
  A.ambient('finale');
  await sleep(250);
  el.classList.add('open');
  await sleep(600);
  FX.confetti(110);
  await sleep(900);
  $$('.clock', el).forEach(c => c.classList.add('ten'));
  document.body.classList.add('ten');
  A.sfx('tick');
  await sleep(900);
  try {
    await say('all', 'С днем рождения, Юра!', { big: true });
    FX.confetti(60);
    await say(['ira', 'vika_b'], 'Чек за торт мы, кстати, сдали вовремя.');
    await say('seryozha', 'И он по акции, бесплатно.');
    const nt = $('.tv-tile[data-person="nata"]', el);
    nt?.classList.add('glitching');
    await say('nata', 'Юра, с днем рож… Алло?');
    nt?.classList.remove('glitching');
  } catch {}
  await sleep(500);
  const fin = h(`<div class="sheet-wrap final-wrap">
      <div class="paper final-paper">
        ${GROUP_PHOTO ? `<img class="group" src="${GROUP_PHOTO}" alt="Команда">` : ''}
        <p>Все правильно. В офисе тебя ждут пластинка с твоими любимыми песнями и нашими поздравлениями и торт.</p>
        <p>Что мы там наговорили, услышишь на месте. Приезжай, свечи сами себя не задуют.</p>
        <div class="stamp hit">СОГЛАСОВАНО<br>ВСЕМИ ОТДЕЛАМИ</div>
        <button class="fin-x" id="finX" aria-label="Убрать письмо">✕</button>
      </div>
      <div class="final-btns"><button class="btn ghost" id="again">Пройти еще раз</button><button class="btn" id="go">Еду!</button></div>
    </div>`);
  $('#overlay').append(fin);
  $('#go', fin).addEventListener('click', () => FX.confetti(90));
  $('#again', fin).addEventListener('click', () => { A.sfx('click'); onAgain(); });
  // письмо убирается, чтобы посмотреть офис, и возвращается кнопкой
  const back = h('<button class="btn ghost fin-back">‹ Письмо</button>');
  $('#finX', fin).addEventListener('click', () => {
    A.sfx('click');
    UI.clearSubs();
    fin.classList.add('away');
    $('#overlay').append(back);
  });
  back.addEventListener('click', () => { A.sfx('click'); fin.classList.remove('away'); back.remove(); });
}
