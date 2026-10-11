// Прогресс живёт только внутри одного захода: новый гость или возврат на следующий день
// начинают квест с двери. Внутри захода прогресс нужен, иначе случайная перезагрузка
// страницы (а Сафари любит перезагружать вкладку после звонка) стёрла бы всё пройденное.
const KEY = 'kvest-yura-v1';
const LIFE = 40 * 60 * 1000;

const fresh = () => ({
  entered: false,
  done: {},
  clues: { 1: [], 2: [] },
  gift1: false,
  gift2: false,
  glitch: { 1: false, 2: false },
  seen: {},
});

function load() {
  // Старые версии писали прогресс надолго, подчищаем за ними.
  try { localStorage.removeItem(KEY); } catch {}
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const box = JSON.parse(raw);
      if (box && box.at && Date.now() - box.at < LIFE) return Object.assign(fresh(), box.s);
    }
  } catch {}
  return fresh();
}

export const S = load();

export function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), s: S })); } catch {}
}

export function reset() {
  Object.assign(S, fresh());
  try { sessionStorage.removeItem(KEY); } catch {}
}
