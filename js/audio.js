// Все звуки синтезируются в браузере, файлов нет.
let ctx = null, master = null, on = false;
let noiseBuf = null, amb = null, ambMode = 'office';

export const isOn = () => on;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.85;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// Вызывать только из обработчика нажатия: иначе iOS не даст звуку играть.
export function enable(v) {
  on = v;
  try { localStorage.setItem('kvest-sound', v ? '1' : '0'); } catch {}
  if (v) {
    // На айфоне с беззвучным режимом Web Audio молчит, пока тип сессии не «playback».
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    if (!ensure()) return;
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
    if (ctx.state !== 'running') ctx.resume();
    startAmbient();
  } else {
    stopAmbient();
  }
}

export const savedPref = () => { try { return localStorage.getItem('kvest-sound'); } catch { return null; } };

const T = () => ctx.currentTime;

function tone(freq, dur, { type = 'square', vol = 0.05, at = 0, slide = null, attack = 0.004 } = {}) {
  const t = T() + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.1, at = 0, type = 'lowpass', freq = 1000, q = 1, attack = 0.002, sweep = null } = {}) {
  const t = T() + at;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  s.loopStart = Math.random();
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
  if (sweep) sweep.forEach((fr, i) => f.frequency.linearRampToValueAtTime(fr, t + dur * (i + 1) / sweep.length));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.02);
}

const SFX = {
  click: () => tone(1900, 0.03, { vol: 0.025 }),
  blip: () => tone(880, 0.07, { vol: 0.035 }),
  type: () => noise(0.018, { type: 'highpass', freq: 3500, vol: 0.05 }),
  beep: () => { tone(1320, 0.1, { vol: 0.04 }); tone(1760, 0.14, { vol: 0.035, at: 0.11 }); },
  deny: () => { tone(220, 0.16, { vol: 0.06 }); tone(165, 0.26, { vol: 0.06, at: 0.18 }); },
  nope: () => tone(150, 0.14, { type: 'sawtooth', vol: 0.045 }),
  mark: () => { noise(0.07, { type: 'bandpass', freq: 2400, q: 2, vol: 0.12 }); tone(990, 0.08, { vol: 0.03, at: 0.03 }); },
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { vol: 0.035, at: i * 0.07 })),
  stamp: () => { noise(0.09, { freq: 650, vol: 0.5 }); tone(95, 0.2, { type: 'sine', vol: 0.4, slide: 45 }); },
  paper: () => noise(0.25, { type: 'bandpass', freq: 3000, q: 0.8, vol: 0.06, attack: 0.05 }),
  whoosh: () => noise(0.45, { type: 'bandpass', freq: 400, q: 1.2, sweep: [1600, 500], vol: 0.12, attack: 0.12 }),
  slide: () => noise(0.12, { type: 'bandpass', freq: 900, q: 1, vol: 0.05, attack: 0.03 }),
  thud: () => { tone(70, 0.25, { type: 'sine', vol: 0.3, slide: 40 }); noise(0.06, { freq: 400, vol: 0.2 }); },
  low: () => { tone(55, 1.6, { type: 'sawtooth', vol: 0.05, attack: 0.3 }); tone(58, 1.6, { type: 'sawtooth', vol: 0.04, attack: 0.3 }); },
  squeak: () => tone(1700, 0.09, { type: 'triangle', vol: 0.04, slide: 2700 }),
  pop: () => { noise(0.07, { type: 'highpass', freq: 1400, vol: 0.3 }); tone(520, 0.12, { type: 'sine', vol: 0.12, slide: 110 }); },
  scratch: () => {
    noise(0.16, { type: 'bandpass', q: 5, freq: 500, sweep: [2600], vol: 0.35 });
    noise(0.2, { type: 'bandpass', q: 5, freq: 2400, sweep: [450], vol: 0.3, at: 0.17 });
  },
  tvOn: () => { noise(0.3, { type: 'highpass', freq: 2500, vol: 0.07 }); tone(80, 0.12, { type: 'sine', vol: 0.12 }); },
  glitch: () => {
    tone(58, 0.7, { type: 'sawtooth', vol: 0.07 });
    for (let i = 0; i < 6; i++) noise(0.05, { type: 'bandpass', freq: 800 + Math.random() * 3000, q: 1, vol: 0.09, at: i * 0.1 + Math.random() * 0.05 });
  },
  buzz: () => noise(0.25, { type: 'bandpass', freq: 120, q: 8, vol: 0.12 }),
  ring: () => {
    for (let i = 0; i < 20; i++) {
      tone(1250, 0.035, { type: 'triangle', vol: 0.05, at: i * 0.05 });
      tone(1660, 0.03, { type: 'triangle', vol: 0.03, at: i * 0.05 + 0.02 });
    }
  },
  fax: () => {
    tone(1100, 0.35, { type: 'sine', vol: 0.05 });
    tone(2100, 0.25, { type: 'sine', vol: 0.04, at: 0.45 });
    noise(0.9, { type: 'bandpass', freq: 1800, q: 5, vol: 0.05, at: 0.8 });
    tone(1650, 0.5, { type: 'sine', vol: 0.03, at: 1.75 });
    for (let i = 0; i < 10; i++) noise(0.03, { type: 'highpass', freq: 2000, vol: 0.05, at: 2.3 + i * 0.09 });
  },
  tick: () => { noise(0.012, { type: 'highpass', freq: 4500, vol: 0.18 }); tone(2100, 0.02, { vol: 0.02 }); },
  door: () => { noise(0.9, { freq: 380, vol: 0.14, attack: 0.25 }); tone(52, 0.9, { type: 'sine', vol: 0.1, attack: 0.2 }); },
};

export function sfx(name) {
  if (!on || !ctx) return;
  try { SFX[name]?.(); } catch {}
}

// Повтор звука, пока не остановят. Возвращает функцию остановки.
export function loop(name, every) {
  sfx(name);
  const id = setInterval(() => sfx(name), every);
  return () => clearInterval(id);
}

// ---------- музыка: детская шкатулка, только расстроенная ----------
// Полутона от ля первой октавы. Мелодия своя, в миноре, медленная.
const LULLABY = [[0, 1], [3, 1], [7, 1], [3, 1], [2, 1], [0, 1], [-1, 1], [2, 1],
  [0, 1], [3, 1], [7, 1], [8, 1], [7, 1], [5, 1], [3, 2], [2, 2]];
const semi = n => 440 * Math.pow(2, n / 12);

// Удар молоточка по зубцу и долгий звон с обертонами.
function boxNote(freq, vol = 0.042) {
  noise(0.012, { type: 'highpass', freq: 5200, vol: vol * 0.45 });
  [[1, 1, 2.2], [2.76, 0.3, 1.5], [5.4, 0.1, 0.9]].forEach(([k, amp, dur]) => {
    tone(freq * k, dur, { type: 'sine', vol: vol * amp, attack: 0.006 });
  });
}

// Маримба: короткая фигура, как у телефона, дважды подряд.
function marimba(freq, at, vol = 0.05) {
  noise(0.012, { type: 'bandpass', freq: 1900, q: 1.2, vol: vol * 0.35, at });
  tone(freq, 0.5, { type: 'sine', vol, at, attack: 0.004 });
  tone(freq * 4.1, 0.16, { type: 'sine', vol: vol * 0.16, at, attack: 0.003 });
}

// «Happy birthday to you» в миноре, на той же расстроенной шкатулке. Мелодия народная.
const BIRTHDAY = [
  [-2, .5], [-2, .5], [-1, 1], [-2, 1], [3, 1], [1, 2],
  [-2, .5], [-2, .5], [-1, 1], [-2, 1], [5, 1], [3, 2],
  [-2, .5], [-2, .5], [10, 1], [6, 1], [3, 1], [1, 1], [-1, 2],
  [8, .5], [8, .5], [6, 1], [3, 1], [5, 1], [3, 3],
];
let hbTimer = null, hbIdx = 0;
function birthdayStep() {
  if (!on || !ctx || ambMode !== 'finale') { hbTimer = null; return; }
  const [n, len] = BIRTHDAY[hbIdx];
  const f = semi(n) * 0.5;
  boxNote(f, 0.055);
  tone(f * 1.414, 1.2, { type: 'sine', vol: 0.006, attack: 0.15 });   // тритон снизу, чтобы было не по-доброму
  const slow = 1 + hbIdx * 0.012;                                      // к концу замедляется
  hbIdx++;
  if (hbIdx >= BIRTHDAY.length) { hbIdx = 0; hbTimer = setTimeout(birthdayStep, 9000); return; }
  hbTimer = setTimeout(birthdayStep, len * 620 * slow);
}
function startBirthday() { if (!hbTimer && ctx) { hbIdx = 0; hbTimer = setTimeout(birthdayStep, 1200); } }
function stopBirthday() { clearTimeout(hbTimer); hbTimer = null; }

let lullTimer = null, lullStep = 0, lullBar = 0;
function playLullaby() {
  if (!on || !ctx || ambMode === 'finale') { lullTimer = setTimeout(playLullaby, 4000); return; }
  const [n, len] = LULLABY[lullStep];
  // шкатулка подсаживается по высоте и иногда проглатывает ноту
  const drift = 1 - (lullBar % 3) * 0.006;
  if (!(lullBar > 0 && Math.random() < 0.1)) boxNote(semi(n) * drift * (lullBar % 4 === 3 ? 0.5 : 1));
  lullStep++;
  if (lullStep >= LULLABY.length) { lullStep = 0; lullBar++; }
  const beat = lullBar % 4 === 3 ? 0.78 : 0.62;
  const pause = lullStep === 0 ? 3200 : 0;
  lullTimer = setTimeout(playLullaby, len * beat * 1000 + pause);
}

// Где-то в офисе звонит телефон. Не звоним там, где телефон звонит по сюжету.
let phoneTimer = null;
function phoneAllowed() {
  return on && ctx && ambMode !== 'finale' && !document.querySelector('[data-scene="sales"], [data-scene="call"]');
}
function phoneRing() {
  const fig = [1046.5, 783.99, 659.25, 783.99, 1046.5, 1318.5];
  for (let r = 0; r < 3; r++) {
    if (r && Math.random() < 0.25) break;
    fig.forEach((f, i) => marimba(f, r * 2.1 + i * 0.13, 0.038));
  }
}
function schedulePhone() {
  phoneTimer = setTimeout(() => {
    if (phoneAllowed()) { try { phoneRing(); } catch {} }
    schedulePhone();
  }, 80000 + Math.random() * 100000);
}
function startMusic() {
  if (!lullTimer) { lullStep = 0; lullBar = 0; lullTimer = setTimeout(playLullaby, 1800); }
  if (!phoneTimer) schedulePhone();
}
function stopMusic() {
  clearTimeout(lullTimer); lullTimer = null;
  clearTimeout(phoneTimer); phoneTimer = null;
  stopBirthday();
}

const CHORDS = {
  office: [[55, 65.41, 82.41], [43.65, 65.41, 87.31], [36.71, 55, 73.42], [41.2, 61.74, 82.41]],
  finale: [[65.41, 82.41, 98], [49, 73.42, 98], [55, 65.41, 82.41], [43.65, 65.41, 87.31]],
};

function startAmbient() {
  if (!ctx || amb) return;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, T());
  out.gain.exponentialRampToValueAtTime(1, T() + 2.5);
  out.connect(master);

  // гул ламп
  const hum = ctx.createOscillator(), hum2 = ctx.createOscillator(), hf = ctx.createBiquadFilter(), hg = ctx.createGain();
  hum.type = 'sawtooth'; hum.frequency.value = 100;
  hum2.type = 'sine'; hum2.frequency.value = 50;
  hf.type = 'lowpass'; hf.frequency.value = 320;
  hg.gain.value = 0.014;
  hum.connect(hf); hum2.connect(hf); hf.connect(hg); hg.connect(out);
  hum.start(); hum2.start();

  // мрачный синтезатор
  const pf = ctx.createBiquadFilter(), pg = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  pf.type = 'lowpass'; pf.frequency.value = 520; pf.Q.value = 3;
  lfo.frequency.value = 0.06; lg.gain.value = 260;
  lfo.connect(lg); lg.connect(pf.frequency); lfo.start();
  pg.gain.value = 0.022;
  pf.connect(pg); pg.connect(out);
  const oscs = [0, 1, 2].map(i => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.detune.value = (i - 1) * 7;
    o.frequency.value = CHORDS[ambMode][0][i];
    o.connect(pf); o.start();
    return o;
  });
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const ch = CHORDS[ambMode][step % 4], k = ambMode === 'finale' ? 2 : 1;
    oscs.forEach((o, i) => o.frequency.setTargetAtTime(ch[i] * k, T(), 1.4));
  }, 9000);

  amb = { out, nodes: [hum, hum2, lfo, ...oscs], timer, hg, pg, oscs };
  applyMode();
  startMusic();
}

function stopAmbient() {
  if (!amb) return;
  const a = amb; amb = null;
  clearInterval(a.timer);
  a.out.gain.cancelScheduledValues(T());
  a.out.gain.setTargetAtTime(0.0001, T(), 0.3);
  setTimeout(() => a.nodes.forEach(n => { try { n.stop(); } catch {} }), 1500);
  stopCrackle();
  stopMusic();
}

function applyMode() {
  if (!amb) return;
  const fin = ambMode === 'finale';
  amb.hg.gain.setTargetAtTime(fin ? 0.0001 : 0.014, T(), 0.5);
  amb.oscs.forEach((o, i) => {
    o.type = fin ? 'triangle' : 'sawtooth';
    o.frequency.setTargetAtTime(CHORDS[ambMode][0][i] * (fin ? 2 : 1), T(), 0.8);
  });
  amb.pg.gain.setTargetAtTime(fin ? 0.05 : 0.022, T(), 0.8);
  if (fin) { startCrackle(); startBirthday(); } else { stopCrackle(); stopBirthday(); }
}

export function ambient(mode) {
  ambMode = mode;
  applyMode();
}

let crackle = null;
function startCrackle() {
  if (crackle || !ctx) return;
  crackle = setInterval(() => {
    if (Math.random() < 0.55) noise(0.008, { type: 'highpass', freq: 2500 + Math.random() * 3000, vol: 0.03 + Math.random() * 0.05 });
  }, 70);
}
function stopCrackle() { clearInterval(crackle); crackle = null; }

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
});
