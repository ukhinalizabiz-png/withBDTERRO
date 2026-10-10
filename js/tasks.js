// Задания отделов. Каждое возвращает текст подсказки (или {text, after}).
import * as UI from './ui.js';
import * as A from './audio.js';
import * as FX from './fx.js';
import { board, bear, lookAt, REBUS_ART, PHONE, IRON, MIC } from './art.js';

const { say, aside, wait, panel, closePanel, pickFrom, onceClick, until, h, $, $$, shuffle } = UI;
const who = (sc, id) => $(`[data-person="${id}"]`, sc.el);

// ---------- 1 этаж ----------

async function buh(sc) {
  await say('ira', 'Юра, по документам ты сегодня стал на год старше. Без оплаты налога не пропущу.');
  await say('vika_b', 'Только сначала проверь акт. Мы его в пятницу вечером составляли.');
  const rows = [
    ['Именинник', 'Юра', ''],
    ['Должность', 'стажер', 'err'],
    ['Основатель брендов', 'Терро и Прайм', ''],
    ['Вид спорта', 'горные лыжи', 'err'],
    ['Опыт на сноуборде', 'больше, чем у всего офиса вместе', ''],
    ['Отдел продаж', 'присылает оплаты вовремя', 'pay'],
    ['Просьба', 'сдавать чеки вовремя', 'cry'],
  ];
  const body = panel(sc, `<div class="act">
      <div class="act-head">АКТ ПРИЕМКИ ИМЕНИННИКА<small>составлен в пятницу, 19:48</small></div>
      <p class="task-hint">Найди три ошибки и нажми на них</p>
      <div class="act-rows">${rows.map((r, i) => `<button class="act-row" data-i="${i}"><span>${r[0]}:</span> <b>${r[1]}</b></button>`).join('')}</div>
      <div class="act-foot"><span>Ира, Вика</span><span class="counter">Найдено: <b>0</b> из 3</span></div>
    </div>`, { kind: 'paper' });
  let found = 0, lastPay = false;
  await until(done => body.addEventListener('click', e => {
    const b = e.target.closest('.act-row');
    if (!b || b.classList.contains('hit')) return;
    const kind = rows[+b.dataset.i][2];
    if (kind === 'err' || kind === 'pay') {
      b.classList.add('hit'); found++; A.sfx('mark');
      $('.counter b', body).textContent = found;
      lastPay = kind === 'pay';
      if (lastPay) aside('vika_b', 'Вот. Хоть кто-то заметил.');
      if (found === 3) done();
    } else if (kind === 'cry') {
      FX.shake(b); A.sfx('nope'); aside('ira', 'Не ошибка. Крик души.');
    } else {
      FX.shake(b); A.sfx('nope'); aside('ira', 'Тут все сходится.');
    }
  }));
  await wait(lastPay ? 1300 : 600);
  closePanel(sc);
  return 'Оно круглое. Проверили дважды.';
}

async function sales(sc) {
  who(sc, 'andrey')?.classList.add('off');
  sc.props.insertAdjacentHTML('beforeend', `<div class="prop-phone ringing">${PHONE}</div>`);
  const ph = $('.prop-phone', sc.el);
  const stop = A.loop('ring', 2400);
  UI.cleanup(stop);
  const body = panel(sc, `<p class="task-hint big">Звонит дисковый телефон</p><button class="btn wide" id="pick">Снять трубку</button>`, { kind: 'crt' });
  await onceClick($('#pick', body));
  stop();
  ph.classList.remove('ringing'); ph.classList.add('lifted');
  closePanel(sc);
  await say('egor', 'Добрый день! Егор, TERRO/PRIME, у нас для вас уникальное предложение на сноуборды.');
  const i = await UI.choose(sc, ['«Я вообще-то основатель Терро»', '«Интересно, расскажите»', '«Перезвоните позже»'], { title: 'ЧТО ОТВЕТИТЬ?' });
  if (i === 0) await say('egor', 'Леонид, у нас ошибка в базе, директор попал в холодные.');
  if (i === 1) await say('nastya', 'Егор, он клюнул! Неси договор.');
  if (i === 2) await say('leonid', 'Записал. Перезвоним через год, на следующий день рождения.');
  ph.classList.remove('lifted');
  await wait(300);
  A.sfx('tvOn');
  who(sc, 'andrey')?.classList.remove('off');
  await wait(400);
  await say('andrey', 'Юра, с днем рождения из Сибири! У нас уже обед, так что поздравляю первым.');
  await say('leonid', 'Андрей у нас всегда первый. Часовой пояс помогает.');
  await say('nastya', 'Ладно, сделку не закрыли, но подсказку отдадим бесплатно. Акция только сегодня.');
  return 'Оно крутится. Как мы в конце квартала.';
}

async function log(sc) {
  await say('yulya', 'Юра, твоя посылка на одном из трех складов.');
  await say('tanya', 'По документам она точно на складе. На каком, в документах не сказано.');
  const body = panel(sc, `<p class="task-hint" id="lh"></p><div class="boxes" id="boxes"></div>`, { kind: 'crt', title: 'ТРИ СКЛАДА' });
  const wrap = $('#boxes', body), hint = $('#lh', body);
  const EMPTY = ['Пересорт', 'Ушло в отдел продаж без документов'];
  const mk = n => h(`<button class="box" data-n="${n}"><span class="bx-in"></span><span class="lid"></span><span class="bx-body">СКЛАД<br>№${n}</span></button>`);
  const place = list => list.forEach((b, i) => { b.style.left = `${(i + 0.5) * 100 / list.length}%`; });
  let misses = 0, round = 0, fourthShown = false;

  for (;;) {
    round++;
    wrap.innerHTML = '';
    let order = [1, 2, 3].map(mk);
    order.forEach(b => wrap.append(b));
    place(order);
    const win = order[Math.floor(Math.random() * 3)];
    wrap.classList.add('locked');
    hint.textContent = 'Смотри, куда Таня положит подсказку';
    await wait(400);
    win.classList.add('open');
    $('.bx-in', win).innerHTML = '<i class="slip-in"></i>';
    A.sfx('paper');
    await wait(800);
    win.classList.remove('open');
    await wait(250);
    $('.bx-in', win).innerHTML = '';
    hint.textContent = 'Юля перемешивает…';
    const swaps = 5 + Math.min(round, 2);
    for (let s = 0; s < swaps; s++) {
      if (round === 1 && !fourthShown && s === 3) {
        const b4 = mk(4);
        b4.classList.add('fourth');
        wrap.append(b4);
        order.push(b4);
        wrap.classList.add('four');
        fourthShown = true;
        place(order);
        A.sfx('whoosh');
        await wait(350);
      }
      const i = Math.floor(Math.random() * order.length);
      let j = Math.floor(Math.random() * (order.length - 1));
      if (j >= i) j++;
      [order[i], order[j]] = [order[j], order[i]];
      place(order);
      A.sfx('slide');
      await wait(Math.max(260, 360 - round * 40));
    }
    wrap.classList.remove('locked');
    hint.textContent = 'Где подсказка?';

    let result = null;
    while (!result) {
      const b = await pickFrom(wrap, '.box');
      if (b.dataset.n === '4') {
        wrap.classList.add('locked');
        b.classList.add('open');
        b.classList.add('bearbox');
        $('.bx-in', b).innerHTML = bear({ cls: 'box-bear' });
        A.sfx('low');
        const bs = $('.box-bear', b);
        lookAt(bs, 2.5, -1);
        setTimeout(() => lookAt(bs, 0, 2.5), 250);
        await wait(1300);
        b.classList.remove('open');
        A.sfx('thud');
        await wait(250);
        await say('tanya', 'Такого склада у нас по документам нет.');
        b.classList.add('vanish');
        await wait(350);
        b.remove();
        order = order.filter(x => x !== b);
        wrap.classList.remove('four');
        place(order);
        wrap.classList.remove('locked');
        continue;
      }
      wrap.classList.add('locked');
      b.classList.add('open');
      if (b === win || misses >= 1) {
        $('.bx-in', b).innerHTML = '<i class="slip-in big"></i>';
        A.sfx('success');
        result = 'win';
        await wait(700);
      } else {
        $('.bx-in', b).innerHTML = `<span class="bx-note">${EMPTY[misses % 2]}</span>`;
        A.sfx('nope');
        misses++;
        await wait(1200);
        hint.textContent = 'Пусто. Перемешиваем заново';
        result = 'again';
        await wait(400);
      }
    }
    if (result === 'win') break;
  }
  closePanel(sc);
  return 'Оно плоское и едет в квадратной упаковке. Довезли без единой царапины.';
}

async function prod(sc) {
  await say('asya', 'Юра, фабрика прислала образец новой доски. В письме пишут: „Я скопирую тебя, 100% как оригинал“.');
  await say('viktor', 'Я каждую позицию знаю наизусть, такой у нас нет. Найди, что они напутали, я отпишу китайцам.');
  const body = panel(sc, `<div class="boards">
      <div class="bd-col"><div class="bd-label">НАШ МАКЕТ</div>${board()}</div>
      <div class="bd-col"><div class="bd-label">ОБРАЗЕЦ С ФАБРИКИ</div>${board({ sample: true })}</div>
    </div>
    <p class="task-hint">Нажимай на отличия на образце · нашел: <span class="counter"><b>0</b> из 3</span></p>`, { kind: 'crt', title: 'НАЙДИ ТРИ ОТЛИЧИЯ' });
  const sample = $('.bd.sample', body);
  const found = new Set();
  let lastMiss = 0;
  await until(done => sample.addEventListener('click', e => {
    const hit = e.target.closest('[data-diff]');
    if (hit) {
      const k = hit.dataset.diff;
      if (found.has(k)) return;
      found.add(k);
      A.sfx('mark');
      hit.classList.add('found');
      $('.counter b', body).textContent = found.size;
      if (found.size === 3) done();
    } else {
      A.sfx('nope');
      if (Date.now() - lastMiss > 2600) { lastMiss = Date.now(); aside('asya', 'А вот это они сделали правильно. Сама удивлена.'); }
    }
  }));
  await wait(700);
  closePanel(sc);
  return 'Посередине у него дырка. Это не брак, так задумано.';
}

const REBUS = [
  { pic: REBUS_ART.bike, ok: 'Леван Горозия, «Велосипед»', no: ['Леван Горозия, «Самокат»', 'Леван Горозия, «Моноколесо»', 'Леван Горозия, «Электричка»'] },
  { pic: REBUS_ART.simple, ok: 'Антоха МС, «Все просто»', no: ['Антоха МС, «Все сложно»', 'Антоха МС, «Созвон в 9:00»', 'Антоха МС, «Согласуем в понедельник»'] },
  { pic: REBUS_ART.run, ok: 'Kanye West, «Runaway»', no: ['Kanye West, «Walkaway»', 'Kanye West, «Deadline»', 'Kanye West, «Stay in Office»'] },
  { pic: REBUS_ART.bandits, ok: 'Леван Горозия, «Бандиты»', no: ['Леван Горозия, «Налоговая»', 'Леван Горозия, «Аудиторы»', 'Леван Горозия, «Бухгалтеры»'] },
  { pic: REBUS_ART.copy, ok: 'Кассета, «Я скопирую тебя»', no: ['Кассета, «Я удалю тебя»', 'Кассета, «Я перешлю тебя»', 'Кассета, «Я отмечу тебя в сторис»'] },
];

async function mkt(sc) {
  const nata = who(sc, 'nata');
  const blip = ms => { nata?.classList.add('glitching'); setTimeout(() => nata?.classList.remove('glitching'), ms); };
  await say('liza', 'Юра, мы делаем рилс про тебя. Осталось подобрать музыку.');
  await say('yana', 'Я смотрела тренды, но решила взять твой плейлист. Мы подслушали, что ты включаешь в машине.');
  await say('nata', 'А я уже договорилась с блогерами, все поставят твой трек. Осталось понять, како…');
  blip(700); A.sfx('glitch');
  await wait(600);
  await say('nata', 'Алло? Меня видно?');
  const body = panel(sc, '', { kind: 'crt', title: 'РЕБУСЫ ИЗ ПЕСЕН' });
  for (let i = 0; i < REBUS.length; i++) {
    const r = REBUS[i];
    body.innerHTML = `<div class="rebus-n">Ребус ${i + 1} из ${REBUS.length}</div><div class="rebus">${r.pic}</div>
      <div class="stack">${shuffle([r.ok, ...r.no]).map(o => `<button class="btn ghost wide opt" data-v="${o}">${o}</button>`).join('')}</div>`;
    for (;;) {
      const b = await pickFrom(body, '.opt');
      if (b.dataset.v === r.ok) { b.classList.add('right'); A.sfx('success'); await wait(450); break; }
      b.classList.add('wrong'); b.disabled = true; A.sfx('nope'); blip(500);
      aside('nata', 'Юра, ты пропадаешь. В смысле, ответ неправильный.');
    }
  }
  closePanel(sc);
  return 'На нем твои любимые треки. И еще немного нас.';
}

const WORDS = ['сделай', 'красиво', 'вчера', 'как у конкурентов', 'но лучше', 'чтобы вау', 'ну ты понял', 'бюджет обсудим'];

async function design(sc) {
  await say('sergey_d', 'Юра, у нас как раз окно между правками. Минут пять, не больше.');
  await say('anara', 'Подсказку мы нарисуем. Только сначала объясни задачу.');
  await UI.crt('ПРИНИМАЕМ ТЗ', 1400);
  const body = panel(sc, `<div class="brief">
      <div class="brief-doc"><small>БРИФ ДЛЯ ДИЗАЙНЕРОВ</small><p id="bt">…</p></div>
      <div class="chips">${WORDS.map((w, i) => `<button class="chip" data-i="${i}">${w}</button>`).join('')}</div>
      <p class="task-hint">Собери бриф хотя бы из трех карточек</p>
      <button class="btn wide" id="send" disabled>Отправить</button>
    </div>`, { kind: 'crt' });
  const sel = [];
  body.addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    const i = +c.dataset.i, k = sel.indexOf(i);
    if (k >= 0) { sel.splice(k, 1); c.classList.remove('on'); } else { sel.push(i); c.classList.add('on'); }
    A.sfx('click');
    const txt = sel.map(j => WORDS[j]).join(', ');
    $('#bt', body).textContent = txt ? txt[0].toUpperCase() + txt.slice(1) + '.' : '…';
    $('#send', body).disabled = sel.length < 3;
  });
  await onceClick($('#send', body));
  A.sfx('whoosh');
  closePanel(sc);
  await wait(250);
  await say('sergey_d', 'Понял. Ничего не понял.');
  await say('anara', 'Сделаю три варианта, выберешь четвертый.');
  return 'У него есть обложка. И шрифт на ней с нами никто не согласовал.';
}

// ---------- 2 этаж ----------

async function haggle(sc) {
  await say('seryozha', 'Юра, подсказка есть. Но я коммерческий директор, бесплатно ничего не отдаю. Миллион рублей.');
  const steps = [
    [500000, 'Ладно, 500 000. Как постоянному клиенту.'],
    [100000, '100 000, и это ниже себестоимости.'],
    [10000, '10 000. Влад, не смотри на меня так.'],
    [0, 'Все, забирай бесплатно. У тебя день рождения, у нас акция.'],
  ];
  const fmt = n => n ? `${n.toLocaleString('ru-RU')} ₽` : 'БЕСПЛАТНО';
  const labels = ['Торговаться', 'Торговаться еще', 'Торговаться сильнее', 'Ну Сережа!'];
  const body = panel(sc, `<div class="price-tag"><small>ПОДСКАЗКА · 1 шт.</small><div class="old-prices"></div><div class="price" id="pr">${fmt(1000000)}</div></div>
    <p class="task-hint">Жми, пока не сдастся. Он сдается не сразу</p>
    <button class="btn wide" id="haggle">${labels[0]}</button>`, { kind: 'paper' });
  const btn = $('#haggle', body), pr = $('#pr', body), old = $('.old-prices', body);
  for (const [i, [n, line]] of steps.entries()) {
    await onceClick(btn);
    btn.disabled = true;
    old.insertAdjacentHTML('beforeend', `<s>${pr.textContent}</s>`);
    pr.textContent = fmt(n);
    pr.classList.remove('stamp-in'); void pr.offsetWidth; pr.classList.add('stamp-in');
    A.sfx('stamp');
    await say('seryozha', line);
    if (labels[i + 1]) btn.textContent = labels[i + 1];
    btn.disabled = false;
  }
  btn.remove();
  $('.task-hint', body)?.remove();
  await wait(300);
  closePanel(sc);
  return 'Его режут на всех.';
}

// ph: фото товара, ic: значок, пока фото нет
const CAP = [
  { id: 'terro', ph: 'assets/goods/board_dark.webp', t: 'TERRO', ok: true },
  { id: 'prime', ph: 'assets/goods/board_color.webp', t: 'PRIME', ok: true },
  { id: 'lucky', ph: 'assets/goods/lucky.webp', t: 'LUCKYBOO', ok: true },
  { id: 'pepper', ic: '🎿', t: 'PEPPER' },
  { id: 'sup', ic: '🏄', t: 'TERRO', line: 'Сап тоже наш, но по снегу на нем далеко не уедешь.' },
  { id: 'poles', ph: 'assets/goods/poles.webp', t: 'TERRO', line: 'Палки наши, но это не сноуборд. Хотя в походе пригодятся.' },
  { id: 'mask', ph: 'assets/goods/loxley.webp', t: 'LOXLEY' },
  { id: 'only', ph: 'assets/goods/only.webp', t: 'ONLY', line: 'Это ONLY. Катается только в багажнике.' },
  { id: 'iron', svg: IRON, t: '', line: 'Юра, это гладильная доска. Попробуй выключить и включить.' },
];

async function captcha(sc) {
  await say('vlad', 'Юра, я тут единственный айтишник, безопасность на мне. Докажи, что ты не робот.');
  const items = shuffle(CAP);
  const body = panel(sc, `<div class="cap">
      <div class="cap-head"><small>Отметьте все</small><b>сноуборды</b></div>
      <div class="cap-grid">${items.map(it => `<button class="cap-tile" data-id="${it.id}">
        ${it.ph ? `<img class="cap-ph" src="${it.ph}" alt="" draggable="false">` : it.svg || `<span class="cap-ic">${it.ic}</span>`}<span class="cap-t">${it.t}</span>
        <span class="cap-bear">${bear({ ink: true })}</span><i class="cap-check">✓</i></button>`).join('')}</div>
      <div class="cap-foot"><span class="cap-logo">IT-ОТДЕЛ · ЗАЩИТА</span><button class="btn" id="capOk">Подтвердить</button></div>
    </div>`, { kind: 'plain' });

  let timer = 0, bearSeen = false, busy = false;
  const tick = () => {
    const tiles = $$('.cap-tile', body);
    const t = tiles[Math.floor(Math.random() * tiles.length)];
    t.classList.add('bear-on');
    setTimeout(() => t.classList.remove('bear-on'), 480);
    timer = setTimeout(tick, 5500 + Math.random() * 4000);
  };
  timer = setTimeout(tick, 2600 + Math.random() * 1500);
  UI.cleanup(() => clearTimeout(timer));

  const sel = new Set();
  body.addEventListener('click', async e => {
    const tile = e.target.closest('.cap-tile');
    if (!tile || busy) return;
    if (tile.classList.contains('bear-on') && !bearSeen) {
      bearSeen = true; busy = true; clearTimeout(timer);
      try {
        await say('vlad', '…');
        await wait(1300);
        await say('vlad', 'Его в базе нет. Забудь.');
      } catch {}
      busy = false;
      return;
    }
    const it = CAP.find(x => x.id === tile.dataset.id);
    if (it.ok) {
      if (sel.has(it.id)) sel.delete(it.id); else sel.add(it.id);
      tile.classList.toggle('sel');
      A.sfx('click');
    } else {
      FX.shake(tile); A.sfx('nope');
      aside('vlad', it.line || 'Не сноуборд. Смотри внимательнее.');
    }
  });

  for (;;) {
    await onceClick($('#capOk', body));
    if (sel.size === 3) break;
    if (sel.size === 2 && !sel.has('lucky')) await say('vlad', 'Не все. Детский тоже сноуборд, просто маленький.');
    else await say('vlad', 'Отмечены не все сноуборды.');
  }
  clearTimeout(timer);
  closePanel(sc);
  await UI.crt('ВЫ НЕ РОБОТ.<br>ВЫ ИМЕНИННИК', 1900);
  return 'На нем будут свечи. Сколько, не скажем, это конфиденциальные данные.';
}

const QUIZ = [
  { q: 'Что из этого выпускает Терро?', ok: 'Треккинговые палки', no: ['Горные лыжи', 'Детские комбинезоны', 'Солнечные панели'], who: 'masha_m', why: 'Лыжи делает PEPPER, комбинезоны LUCKYBOO, панели ONLY. А Терро ходит с палками.' },
  { q: 'Какой бренд делает маски с линзами Carl Zeiss?', ok: 'LOXLEY', no: ['SKIFREE', 'TERRO', 'PRIME'], who: 'masha_m', why: 'LOXLEY. Маски есть и у других, но Carl Zeiss только в премиуме.' },
  { q: 'Символ с какого альбома «Кино» спрятан на доске TERRO X КИНО?', ok: '«Группа крови»', no: ['«Звезда по имени Солнце»', '«Черный альбом»', '«Последний герой»'], who: 'masha_m', why: '«Группа крови». Матовый топшит, а под ним глянцевый символ с обложки. Свои доски надо знать.' },
  { q: 'Сколько у нас складов?', ok: '3', no: ['1', '2', '4'], who: 'yulya', why: 'Три! И я отвечаю за все три, пожалей меня.' },
  { q: 'Кто в бухгалтерии ведет оплаты от отдела продаж?', ok: 'Вика', no: ['Ира', 'Таня', 'Леонид'], who: 'vika_b', why: 'Это я. И оплаты все еще приходят не вовремя.' },
  { q: 'Сколько в компании айтишников?', ok: '1', no: ['2', '3', '5'], who: 'vlad', why: 'Один. И это я проверял тебя капчей.' },
];

async function supportChat() {
  const t = UI.tok();
  const el = h(`<div class="sheet-wrap chat-wrap"><div class="chat">
      <div class="chat-top">Поддержка ACTIONDIST <span>● онлайн</span></div>
      <div class="chat-body"><div class="msg sys">Ваш запрос передан специалисту</div></div>
    </div></div>`);
  $('#overlay').append(el);
  UI.cleanup(() => el.remove());
  const cb = $('.chat-body', el);
  await wait(700);
  cb.insertAdjacentHTML('beforeend', `<div class="msg sys">Специалист подключился</div><div class="msg bear-msg"><span class="ava">${bear({ ink: true })}</span><span class="typing"><i></i><i></i><i></i></span></div>`);
  A.sfx('blip');
  const av = $('.ava .bear', el);
  lookAt(av, -3, 0);
  setTimeout(() => lookAt(av, 0, 2.5), 700);
  const stop = A.loop('type', 420);
  UI.cleanup(stop);
  try { await wait(6000); } finally { stop(); }
  $('.bear-msg', el).remove();
  cb.insertAdjacentHTML('beforeend', '<div class="msg sys">Специалист покинул чат</div>');
  await wait(1000);
  el.classList.add('out');
  await wait(250);
  el.remove();
  UI.check(t);
  UI.toast('Квиз начинается заново');
}

async function dossier(sc) {
  await say('masha_m', 'Юра, я провела исследование целевой аудитории. Сегодня она у нас одна, и это ты.');
  await say('vika_s', 'Клиенты задают мне вопросы весь день, сегодня отвечаешь ты. Шесть вопросов про нашу же компанию. Ответишь на четыре, отдадим подсказку.');
  for (;;) {
    let right = 0;
    const body = panel(sc, '', { kind: 'crt', title: 'ДОСЬЕ НА ЮРУ' });
    for (let i = 0; i < QUIZ.length; i++) {
      const q = QUIZ[i];
      body.innerHTML = `<div class="quiz-n">Вопрос ${i + 1} из ${QUIZ.length} · верно: ${right}</div><div class="quiz-q">${q.q}</div>
        <div class="stack">${shuffle([q.ok, ...q.no]).map(o => `<button class="btn ghost wide opt" data-v="${o}">${o}</button>`).join('')}</div>`;
      const b = await pickFrom(body, '.opt');
      $$('.opt', body).forEach(x => { x.disabled = true; if (x.dataset.v === q.ok) x.classList.add('right'); });
      if (b.dataset.v === q.ok) { right++; A.sfx('success'); await wait(500); }
      else { b.classList.add('wrong'); A.sfx('nope'); await say(q.who, q.why); }
    }
    closePanel(sc);
    if (right >= 4) break;
    await say('vika_s', 'Ваш запрос передан специалисту.');
    await supportChat();
  }
  await say('vika_s', 'Спасибо за обращение! Оцените нашу работу от 1 до 5.');
  const body = panel(sc, `<div class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="star" data-n="${n}" aria-label="${n}">★</button>`).join('')}</div><p class="task-hint">Оцените работу поддержки</p>`, { kind: 'crt' });
  const s = await pickFrom(body, '.star');
  $$('.star', body).forEach((x, k) => setTimeout(() => { x.classList.add('on'); A.sfx('blip'); }, k * 110));
  if (+s.dataset.n < 5) setTimeout(() => UI.toast('Оценка ниже пяти не предусмотрена регламентом'), 600);
  await wait(1100);
  closePanel(sc);
  return 'Оно сладкое. И слоев в нем больше, чем в нашей системе скидок.';
}

const CALL_BTNS = [
  ['✋', 'Поднять руку', 'Рука поднята. Никто не заметил'],
  ['▦', 'Размыть фон', 'Фон размыт. Бардак все равно видно'],
  ['▭', 'Экран', 'Демонстрация экрана: показывать нечего'],
  ['☺', 'Реакции', 'Реакция отправлена'],
  ['✉', 'Чат', 'Ната: Алло?'],
  ['CC', 'Субтитры', 'Субтитры и так включены'],
  ['👥', 'Участники', 'Участники: 21 и медведь'],
  ['●', 'Запись', 'Запись ведет бухгалтерия'],
];

async function call(sc) {
  await say('katya', 'Юра, ты на мьюте!');
  await say('masha_s', 'Здравствуйте, техподдержка. У вас выключен микрофон, найдите значок в углу экрана.');
  const body = panel(sc, `<div class="call">
      <div class="call-top"><span>Планерка</span><span>09:59</span></div>
      <div class="call-tiles"><div class="ct">Маша</div><div class="ct">Катя</div><div class="ct you" id="you">Юра (вы) <em>микрофон выкл.</em></div></div>
      <div class="call-bar">${CALL_BTNS.map((b, i) => `<button class="cb" data-i="${i}"><span>${b[0]}</span><small>${b[1]}</small></button>`).join('')}
        <button class="cb leave" data-leave="1"><span>✕</span><small>Выйти</small></button></div>
      <button class="mic muted" id="mic" aria-label="Микрофон">${MIC}</button>
      <div class="call-left">Вы покинули встречу</div>
    </div>`, { kind: 'plain' });
  const callEl = $('.call', body), mic = $('#mic', body);
  const SPOTS = [['auto', 'auto', '6px', '6px'], ['6px', '6px', 'auto', 'auto'], ['6px', 'auto', 'auto', '6px']];
  const put = k => { const [t, r, b, l] = SPOTS[k]; Object.assign(mic.style, { top: t, right: r, bottom: b, left: l }); };
  put(0);
  let dodges = 0, leaving = false;
  body.addEventListener('click', async e => {
    const b = e.target.closest('.cb');
    if (!b || leaving) return;
    A.sfx('click');
    if (b.dataset.leave) {
      leaving = true;
      callEl.classList.add('left');
      A.sfx('deny');
      try { await say('katya', 'Юра, ты вышел. Заходи обратно, мы все видели.'); } catch {}
      callEl.classList.remove('left');
      leaving = false;
    } else {
      UI.toast(CALL_BTNS[+b.dataset.i][2]);
    }
  });
  mic.addEventListener('pointerdown', e => {
    if (dodges >= 2) return;
    e.preventDefault();
    dodges++;
    put(dodges);
    A.sfx('squeak');
  });
  await until(res => mic.addEventListener('click', () => { if (dodges >= 2 && !leaving) res(); }));
  mic.classList.remove('muted');
  $('#you', body).innerHTML = 'Юра (вы) <em>говорит</em>';
  A.sfx('success');
  await wait(600);
  closePanel(sc);
  return { text: 'Сейчас оно стоит в холодильнике на кухне.', after: [['masha_s', 'А нам все равно не достанется. Сфоткайте хоть.']] };
}

export const TASKS = { buh, sales, log, prod, mkt, design, haggle, captcha, dossier, call };
