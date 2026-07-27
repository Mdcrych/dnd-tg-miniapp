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
  { name: 'Внимательность',     base: 'PER' },
  { name: 'Поиск',              base: 'PER' },
  { name: 'Уличная смекалка',   base: 'PER / INT' },
  { name: 'Убеждение',          base: 'WIL' },
  { name: 'Запугивание',        base: 'WIL / STR' },
  { name: 'Ложь',               base: 'INT / WIL' },
  { name: 'Исполнение',         base: 'WIL / PER' },
  { name: 'Переговоры',         base: 'WIL' },
  { name: 'Репутация',          base: 'WIL / PER' },
  { name: 'Выживание в городе', base: 'PER' },
];

const DEV_SKILLS = [
  { name: 'Боевое чутьё',         class: 'merc',        classLabel: 'Уличный наёмник',     desc: 'Раз в сцену переброси один промах в рукопашной.' },
  { name: 'Щит из тела',          class: 'merc',        classLabel: 'Уличный наёмник',     desc: 'Используй союзника как укрытие без штрафа к атаке.' },
  { name: 'Берсерк',              class: 'merc',        classLabel: 'Уличный наёмник',     desc: '+2 к урону в ближнем бою пока HP < 50%.' },
  { name: 'Полевой ремонт',       class: 'tech',        classLabel: 'Подпольный техник',   desc: 'Чини снаряжение без инструментов с DC +2.' },
  { name: 'Самодельный гаджет',   class: 'tech',        classLabel: 'Подпольный техник',   desc: 'Раз в день создай одноразовый гаджет из хлама.' },
  { name: 'Точная сборка',        class: 'tech',        classLabel: 'Подпольный техник',   desc: '+4 к TEC-проверкам при тонкой работе с механикой.' },
  { name: 'Быстрый взлом',        class: 'netrunner',   classLabel: 'Сетевой беглец',      desc: 'Взлом ICE занимает действие, а не раунд.' },
  { name: 'Цифровой призрак',     class: 'netrunner',   classLabel: 'Сетевой беглец',      desc: 'Не оставляешь следов в сети при успешном Взломе.' },
  { name: 'Перегрузка',           class: 'netrunner',   classLabel: 'Сетевой беглец',      desc: 'Нанеси 1d6 урона нейро-интерфейсу цели через сеть.' },
  { name: 'Экстренная операция',  class: 'ripper',      classLabel: 'Рипердок',            desc: 'Стабилизируй умирающего за бонусное действие.' },
  { name: 'Отладка импланта',     class: 'ripper',      classLabel: 'Рипердок',            desc: 'Сними дебафф импланта без клиники (DC 14 TEC).' },
  { name: 'Синтетическая кровь',  class: 'ripper',      classLabel: 'Рипердок',            desc: 'Один раз в день восстанови 1d6+TEC HP союзнику.' },
  { name: 'Зажигательная речь',   class: 'agitator',    classLabel: 'Агитатор сцены',      desc: '+2 к Убеждению при публичных выступлениях.' },
  { name: 'Слухи района',         class: 'agitator',    classLabel: 'Агитатор сцены',      desc: 'Раз в сцену узнай одну скрытую информацию о локации.' },
  { name: 'Медийный образ',       class: 'agitator',    classLabel: 'Агитатор сцены',      desc: 'Репутация работает как дополнительный навык в публичных местах.' },
  { name: 'Чёрный рынок',         class: 'fixer',       classLabel: 'Фиксер района',       desc: 'Достань любой товар за 1d4 часа (доступность −1 ступень).' },
  { name: 'Нужный человек',       class: 'fixer',       classLabel: 'Фиксер района',       desc: 'Раз в сессию вызови контакт без Переговоров.' },
  { name: 'Крыша',                class: 'fixer',       classLabel: 'Фиксер района',       desc: 'Группа защищена от случайных уличных атак в твоём районе.' },
  { name: 'Протокол прикрытия',   class: 'agent',       classLabel: 'Корпоративный агент', desc: 'Раз в сцену легенда выдерживает проверку PER DC 14.' },
  { name: 'Корпоративный доступ', class: 'agent',       classLabel: 'Корпоративный агент', desc: '+3 к Анализу при работе с корп-базами данных.' },
  { name: 'Нейтрализация',        class: 'agent',       classLabel: 'Корпоративный агент', desc: 'Допрос даёт +2 к следующей Лжи или Запугиванию.' },
  { name: 'Городской паркур',     class: 'courier',     classLabel: 'Курьер-призрак',      desc: 'Передвигайся по сложному рельефу без штрафа скорости.' },
  { name: 'Мёртвая зона',         class: 'courier',     classLabel: 'Курьер-призрак',      desc: 'Знаешь 1d4 безопасных мест в любом районе.' },
  { name: 'Скорая доставка',      class: 'courier',     classLabel: 'Курьер-призрак',      desc: 'Раз в сессию прибудь в любую точку города без случайных встреч.' },
  { name: 'Экстремальный манёвр', class: 'pilot',       classLabel: 'Пилот транспорта',    desc: 'Раз в сцену не считай штраф за опасный манёвр.' },
  { name: 'Знание техники',       class: 'pilot',       classLabel: 'Пилот транспорта',    desc: '+2 к Ремонту и Электронике на транспортных средствах.' },
  { name: 'Слияние с машиной',    class: 'pilot',       classLabel: 'Пилот транспорта',    desc: 'Транспорт считается продолжением тела: +1 DEF при вождении.' },
  { name: 'Рой дронов',           class: 'dronebuilder',classLabel: 'Сборщик дронов',      desc: 'Управляй двумя дронами одновременно без штрафа.' },
  { name: 'Автономный режим',     class: 'dronebuilder',classLabel: 'Сборщик дронов',      desc: 'Дрон действует по приказу 1 раунд без проверки TEC.' },
  { name: 'Экстренный апгрейд',   class: 'dronebuilder',classLabel: 'Сборщик дронов',      desc: 'Раз в сессию добавь временный модуль к дрону (+1d4 эффект).' },
];

const KIT_LABELS = {
  merc: 'Уличный наёмник', tech: 'Подпольный техник', netrunner: 'Сетевой беглец',
  ripper: 'Рипердок', agitator: 'Агитатор сцены', fixer: 'Фиксер района',
  agent: 'Корпоративный агент', courier: 'Курьер-призрак',
  pilot: 'Пилот транспорта', dronebuilder: 'Сборщик дронов',
};
const ORIGIN_LABELS = {
  corpo: 'Корпо-беглец', street: 'Уличный ребёнок', military: 'Военный подрядчик',
  clinic: 'Клинический специалист', media: 'Медиа-активист',
  netrunner: 'Сетевой бродяга', smuggler: 'Контрабандист', cult: 'Культ техно-плоти',
};
const SKILL_LEVEL_NAMES = { 0: 'Необучен', 2: 'Обучен', 4: 'Эксперт', 6: 'Мастер' };

// ======= LEVEL PROGRESSION (Rulebook §8.2 + §20.3) =======
const LEVEL_PROGRESSION = [
  { level: 1,  tier: 'I',   dp: 0,  dpTotal: 0,  access: 'Базовые скилы' },
  { level: 2,  tier: 'II',  dp: 2,  dpTotal: 2,  access: 'Продвинутые скилы Tier II' },
  { level: 3,  tier: 'II',  dp: 2,  dpTotal: 4,  access: 'Первые гибридные сборки' },
  { level: 4,  tier: 'II',  dp: 2,  dpTotal: 6,  access: 'Экзотичные скилы' },
  { level: 5,  tier: 'II',  dp: 3,  dpTotal: 9,  access: 'Глубокая специализация' },
  { level: 6,  tier: 'III', dp: 3,  dpTotal: 12, access: 'Престижные скилы Tier III' },
  { level: 7,  tier: 'III', dp: 3,  dpTotal: 15, access: 'Второй сильный трек' },
  { level: 8,  tier: 'III', dp: 3,  dpTotal: 18, access: 'Чёрные ветви и жёсткие обходы' },
  { level: 9,  tier: 'III', dp: 3,  dpTotal: 21, access: 'Культовые скилы' },
  { level: 10, tier: 'III', dp: 3,  dpTotal: 24, access: 'Легендарные комбинации' },
];

const DP_COSTS = [
  { name: 'Базовый скил развития',      cost: 2 },
  { name: 'Продвинутый скил развития',  cost: 3 },
  { name: 'Глубокий скил развития',     cost: 4 },
  { name: 'Экзотичный скил развития',   cost: 5 },
  { name: 'Культовый скил развития',    cost: 6 },
  { name: 'Престижный скил развития',   cost: 7 },
  { name: 'Новый обученный навык',      cost: 2 },
  { name: 'Навык до Эксперта',          cost: 3 },
  { name: 'Навык до Мастера',           cost: 5 },
  { name: 'Новая специализация',        cost: 2 },
  { name: 'Улучшенный имплант',         cost: 3 },
  { name: 'Экзотичный имплант',         cost: 5 },
  { name: 'Улучшенный дрон',            cost: 3 },
  { name: 'Экзотичный дрон',            cost: 5 },
];

// ======= STATE =======
let abilityValues = { STR:3, DEX:3, INT:3, WIL:3, PER:3, TEC:3 };
let TOTAL_POINTS = 6;
let selectedDevSkills = [];
let currentCharLevel = 1;
let currentCharDP = 0;
// Стек навигации для кнопки «Назад» на подстраницах
let navStack = [];

// ======= STEP NAVIGATION =======
// Steps: 1=basic, 2=abilities, 3=skills, 4=devskills, 5=summary, 6=saved
// Subpages: 7=char-sheet, 8=skills-sub, 9=devskills-sub, 10=level
const STEP_IDS = [
  'step-basic','step-abilities','step-skills','step-devskills',
  'step-summary','step-saved','step-charsheet',
  'step-skills-sub','step-devskills-sub','step-level'
];

function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(STEP_IDS[n - 1]);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}
function nextStep(n) {
  if (!validateStep(n - 1)) return;
  if (n === 4) initDevSkills();
  if (n === 5) buildSummary();
  if (n === 6) loadSaved();
  showStep(n);
}
function prevStep(n) { showStep(n); }

function validateStep(s) {
  if (s === 1) {
    const name = v('char-name'), origin = v('char-origin'), k1 = v('char-kit1'), k2 = v('char-kit2');
    if (!name)     return err('Введите имя персонажа');
    if (!origin)   return err('Выберите происхождение');
    if (!k1)       return err('Выберите первый пакет подготовки');
    if (!k2)       return err('Выберите второй пакет подготовки');
    if (k1 === k2) return err('Пакеты подготовки должны быть разными');
  }
  if (s === 2) { const e = validateAbilities(); if (e.length) return err(e[0]); }
  if (s === 3) { const e = validateSkills();    if (e.length) return err(e[0]); }
  return true;
}

function v(id) { return document.getElementById(id)?.value?.trim() || ''; }
function err(msg) { alert(msg); return false; }

// ======= ABILITY SCORES (step 2) =======
function initAbilityScores() {
  const c = document.getElementById('ability-scores');
  const frag = document.createDocumentFragment();
  ABILITIES.forEach(ab => {
    const div = document.createElement('div');
    div.className = 'ability-block';
    div.id = `ab-block-${ab}`;
    div.innerHTML = `
      <div class="ability-tag">${ab}</div>
      <div class="ability-name-full">${AB_FULL[ab]}</div>
      <div class="ability-controls">
        <button class="ab-btn" onclick="changeAb('${ab}',-1)">−</button>
        <span class="ab-val" id="ab-val-${ab}">${abilityValues[ab]}</span>
        <button class="ab-btn" onclick="changeAb('${ab}',+1)">+</button>
      </div>
      <div class="ab-mod" id="ab-mod-${ab}"></div>`;
    frag.appendChild(div);
  });
  c.innerHTML = '';
  c.appendChild(frag);
  ABILITIES.forEach(ab => refreshAb(ab));
  refreshPoints();
}

function changeAb(ab, delta) {
  const cur = abilityValues[ab], next = cur + delta;
  if (next < 1 || next > 5) return;

  if (delta > 0) {
    // Повышение: считаем стоимость
    const cost = pointCost(cur, next);
    const rem = getRemainingPoints();
    if (cost > rem) { err(`Недостаточно очков! Нужно ${cost}, осталось ${rem}`); return; }
  }
  // Понижение ниже 3: возвращаем 1 очко за каждый шаг
  // Понижение от 3 и выше: возвращаем обычную стоимость

  abilityValues[ab] = next;
  refreshAb(ab);
  refreshPoints();
}

// Стоимость повышения от from до to (оба >= 3)
// При понижении ниже 3 каждый шаг даёт +1 очко (pointCost не используется)
function pointCost(from, to) {
  let c = 0;
  for (let i = from; i < to; i++) c += (i >= 4 ? 2 : 1);
  return c;
}

// Суммарно потрачено очков с учётом возвратов при значениях < 3
function totalSpent() {
  return ABILITIES.reduce((s, ab) => {
    const val = abilityValues[ab];
    if (val >= 3) {
      return s + pointCost(3, val);
    } else {
      // val < 3: каждый шаг ниже 3 возвращает 1 очко
      return s - (3 - val);
    }
  }, 0);
}
function getRemainingPoints() { return TOTAL_POINTS - totalSpent(); }

function refreshAb(ab) {
  const val = abilityValues[ab], mod = AB_MOD[val] ?? 0;
  document.getElementById(`ab-val-${ab}`).textContent = val;
  const modEl = document.getElementById(`ab-mod-${ab}`);
  modEl.textContent = `мод: ${mod >= 0 ? '+' : ''}${mod}`;
  modEl.style.color = mod > 0 ? '#00ffe0' : mod < 0 ? '#ff3c6e' : '#6688aa';
}
function refreshPoints() {
  document.getElementById('points-left').textContent = getRemainingPoints();
}

function validateAbilities() {
  const errs = [];
  const fives = ABILITIES.filter(ab => abilityValues[ab] === 5);
  if (fives.length > 2) errs.push(`Нельзя иметь более двух характеристик на 5 (${fives.join(', ')})`);
  if (getRemainingPoints() < 0) errs.push('Потрачено слишком много очков');
  return errs;
}

// ======= INPUT VALIDATION HELPERS =======
function showFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.add('input-error');
  let hint = el.parentElement.querySelector('.field-error-hint');
  if (!hint) {
    hint = document.createElement('span');
    hint.className = 'field-error-hint';
    el.parentElement.appendChild(hint);
  }
  hint.textContent = msg;
}
function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.remove('input-error');
  el.parentElement?.querySelector('.field-error-hint')?.remove();
}

// ======= SKILLS (step 3) =======
function initSkills() {
  const c = document.getElementById('skills-container');
  const frag = document.createDocumentFragment();
  SKILLS.forEach((sk, i) => {
    const div = document.createElement('div');
    div.className = 'skill-row';
    div.innerHTML = `
      <div class="skill-label">
        <div class="skill-name">${sk.name}</div>
        <div class="skill-base">${sk.base}</div>
      </div>
      <select class="skill-select" id="sk-${i}">
        <option value="">—</option>
        <option value="0">Необучен</option>
        <option value="2">Обучен</option>
        <option value="4">Эксперт</option>
        <option value="6">Мастер</option>
      </select>`;
    frag.appendChild(div);
  });
  c.innerHTML = '';
  c.appendChild(frag);
}

function getSkillLevels() {
  return SKILLS.map((sk, i) => {
    const val = document.getElementById(`sk-${i}`)?.value;
    return { name: sk.name, base: sk.base, bonus: val === '' ? null : parseInt(val) };
  });
}

function validateSkills() {
  const levels = getSkillLevels();
  const errs = [];
  if (levels.filter(s => s.bonus === 2).length > 5) errs.push('Обученных навыков > 5');
  if (levels.filter(s => s.bonus === 4).length > 1) errs.push('Навыков Эксперт > 1');
  if (levels.filter(s => s.bonus === 6).length > 0) errs.push('Уровень Мастер недоступен при создании');
  return errs;
}

// ======= DEV SKILLS (step 4) =======
function initDevSkills() {
  const c = document.getElementById('devskills-container');
  const byClass = {};
  DEV_SKILLS.forEach(sk => {
    if (!byClass[sk.class]) byClass[sk.class] = [];
    byClass[sk.class].push(sk);
  });

  const frag = document.createDocumentFragment();
  Object.entries(byClass).forEach(([cls, skills]) => {
    const group = document.createElement('div');
    group.className = 'devskill-group';
    group.innerHTML = `<div class="devskill-group-title">🏷 ${skills[0].classLabel}</div>`;
    skills.forEach(sk => {
      const checked = selectedDevSkills.includes(sk.name);
      const label = document.createElement('label');
      label.className = `devskill-row${checked ? ' devskill-selected' : ''}`;
      label.id = `dsl-${sk.name.replace(/\s/g,'-')}`;
      label.innerHTML = `
        <input type="checkbox" class="devskill-cb" value="${sk.name}" ${checked ? 'checked' : ''} />
        <div class="devskill-info">
          <div class="devskill-name">
            ${sk.name}
            <span class="devskill-class-badge">${sk.classLabel}</span>
          </div>
          <div class="devskill-desc">${sk.desc}</div>
        </div>`;
      label.querySelector('input').addEventListener('change', function() {
        toggleDevSkill(sk.name, this);
      });
      group.appendChild(label);
    });
    frag.appendChild(group);
  });
  c.innerHTML = '';
  c.appendChild(frag);
  refreshDevSkillCount();
}

function toggleDevSkill(name, cb) {
  if (cb.checked) {
    if (selectedDevSkills.length >= 2) {
      cb.checked = false;
      err('Можно выбрать не более 2 скиллов развития');
      return;
    }
    selectedDevSkills.push(name);
  } else {
    selectedDevSkills = selectedDevSkills.filter(n => n !== name);
  }
  const key = name.replace(/\s/g,'-');
  document.getElementById(`dsl-${key}`)?.classList.toggle('devskill-selected', cb.checked);
  refreshDevSkillCount();
}

function refreshDevSkillCount() {
  const el = document.getElementById('devskills-count');
  if (el) el.textContent = `Выбрано: ${selectedDevSkills.length} / 2`;
}

// ======= SUMMARY (step 5) =======
function buildSummary() {
  const name    = v('char-name');
  const concept = v('char-concept');
  const origin  = v('char-origin');
  const k1      = v('char-kit1');
  const k2      = v('char-kit2');
  const STR = abilityValues.STR, WIL = abilityValues.WIL,
        INT = abilityValues.INT, DEX = abilityValues.DEX;
  const HP       = 10 + STR + WIL;
  const STRESS   = 10 + WIL + INT;
  const DEF      = 10 + (AB_MOD[DEX] ?? 0);
  const HUMANITY = 10 + WIL;
  const IMPL_LIM = WIL + 1;

  const abRows = ABILITIES.map(ab => {
    const m = AB_MOD[abilityValues[ab]] ?? 0;
    return `<div class="s-row">
      <span class="s-label">${AB_FULL[ab]} (${ab})</span>
      <span class="s-value">${abilityValues[ab]} (${m >= 0 ? '+' : ''}${m})</span>
    </div>`;
  }).join('');

  const skillRows = getSkillLevels().filter(s => s.bonus !== null).map(s =>
    `<div class="s-row"><span class="s-label">${s.name}</span><span class="s-value">${SKILL_LEVEL_NAMES[s.bonus] || 'Необучен'} (+${s.bonus})</span></div>`
  ).join('') || '<div class="s-row"><span class="s-label">—</span></div>';

  const devRows = selectedDevSkills.length
    ? selectedDevSkills.map(name => {
        const sk = DEV_SKILLS.find(d => d.name === name);
        return sk ? `<div class="s-row">
          <span class="s-label">${sk.name} <span class="devskill-class-badge">${sk.classLabel}</span></span>
          <span class="s-value s-value-desc">${sk.desc}</span>
        </div>` : '';
      }).join('')
    : '<div class="s-row"><span class="s-label">—</span></div>';

  document.getElementById('summary-content').innerHTML = `
    <div class="s-section">Персонаж</div>
    <div class="s-row"><span class="s-label">Имя</span><span class="s-value">${name}</span></div>
    <div class="s-row"><span class="s-label">Концепт</span><span class="s-value">${concept || '—'}</span></div>
    <div class="s-row"><span class="s-label">Происхождение</span><span class="s-value">${ORIGIN_LABELS[origin]||origin}</span></div>
    <div class="s-row"><span class="s-label">Пакеты</span><span class="s-value">${KIT_LABELS[k1]||k1} + ${KIT_LABELS[k2]||k2}</span></div>
    <div class="s-section">Характеристики</div>
    ${abRows}
    <div class="s-section">Навыки</div>
    ${skillRows}
    <div class="s-section">Скиллы развития</div>
    ${devRows}`;

  document.getElementById('derived-stats').innerHTML = `
    <div class="derived-item"><div class="derived-label">HP</div><div class="derived-val">${HP}</div></div>
    <div class="derived-item"><div class="derived-label">STRESS</div><div class="derived-val">${STRESS}</div></div>
    <div class="derived-item"><div class="derived-label">DEF</div><div class="derived-val">${DEF}</div></div>
    <div class="derived-item"><div class="derived-label">HUMANITY</div><div class="derived-val">${HUMANITY}</div></div>
    <div class="derived-item"><div class="derived-label">IMPLANT LIM</div><div class="derived-val">${IMPL_LIM}</div></div>
    <div class="derived-item"><div class="derived-label">RAM</div><div class="derived-val">—</div></div>`;

  validateBuild();
}

function validateBuild() {
  const errors = [];
  const fives = ABILITIES.filter(ab => abilityValues[ab] === 5);
  if (fives.length > 2) errors.push(`❌ > 2 характеристик на 5 (${fives.join(', ')})`);
  if (getRemainingPoints() < 0) errors.push('❌ Потрачено больше 6 очков');
  const levels = getSkillLevels();
  if (levels.filter(s => s.bonus === 2).length > 5) errors.push('❌ Обученных навыков > 5');
  if (levels.filter(s => s.bonus === 4).length > 1) errors.push('❌ Навыков Эксперт > 1');
  if (levels.filter(s => s.bonus === 6).length > 0) errors.push('❌ Уровень Мастер недоступен');
  const errEl = document.getElementById('validation-errors');
  const okEl  = document.getElementById('validation-ok');
  if (errors.length) {
    errEl.classList.remove('hidden'); okEl.classList.add('hidden');
    errEl.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
    document.getElementById('btn-save').disabled = true;
  } else {
    errEl.classList.add('hidden'); okEl.classList.remove('hidden');
    document.getElementById('btn-save').disabled = false;
  }
}

// ======= SAVE =======
function saveCharacter() {
  const char = {
    name: v('char-name'), concept: v('char-concept'),
    origin: v('char-origin'), k1: v('char-kit1'), k2: v('char-kit2'),
    abilities: { ...abilityValues },
    skills: getSkillLevels().filter(s => s.bonus !== null),
    devSkills: [...selectedDevSkills],
    level: 1,
    dp: 0,
    createdAt: Date.now()
  };
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  saved.push(char);
  localStorage.setItem('cp_characters', JSON.stringify(saved));
  nextStep(6);
}

// ======= SAVED LIST (step 6) =======
function loadSaved() {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const list  = document.getElementById('saved-list');
  if (!saved.length) {
    list.innerHTML = '<p style="color:#446688">Нет сохранённых персонажей</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  saved.forEach((c, i) => {
    const level = c.level || 1;
    const dp = c.dp || 0;
    const row = document.createElement('div');
    row.className = 'char-list-row';
    row.onclick = () => openCharSheet(i);
    row.innerHTML = `
      <div class="char-list-info">
        <span class="char-list-name">${c.name}</span>
        ${c.concept ? `<span class="char-list-concept">${c.concept}</span>` : ''}
        <span class="char-list-meta">${ORIGIN_LABELS[c.origin]||c.origin} · ${KIT_LABELS[c.k1]||c.k1}</span>
        <span class="char-list-meta">Уровень ${level} · DP: ${dp}</span>
        <span class="char-list-date">${new Date(c.createdAt).toLocaleDateString('ru-RU')}</span>
      </div>
      <div class="char-list-actions">
        <button class="btn-delete">🗑</button>
        <span class="char-list-arrow">›</span>
      </div>`;
    row.querySelector('.btn-delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteChar(i);
    });
    frag.appendChild(row);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

// ======= CHARACTER SHEET (step 7) =======
function openCharSheet(charIndex) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const c = saved[charIndex];
  if (!c) return;

  const abs = c.abilities || {};
  const STR = abs.STR||3, WIL = abs.WIL||3, INT = abs.INT||3,
        DEX = abs.DEX||3, PER = abs.PER||3, TEC = abs.TEC||3;
  const HP       = 10 + STR + WIL;
  const STRESS   = 10 + WIL + INT;
  const DEF      = 10 + (AB_MOD[DEX] ?? 0);
  const HUMANITY = 10 + WIL;
  const IMPL_LIM = WIL + 1;
  const level    = c.level || 1;
  const dp       = c.dp || 0;
  const lvlInfo  = LEVEL_PROGRESSION.find(l => l.level === level) || LEVEL_PROGRESSION[0];
  const nextLvl  = LEVEL_PROGRESSION.find(l => l.level === level + 1);

  const derivedHtml = `
    <div class="derived-stats-sheet">
      <div class="derived-item"><div class="derived-label">HP</div><div class="derived-val">${HP}</div></div>
      <div class="derived-item"><div class="derived-label">STRESS</div><div class="derived-val">${STRESS}</div></div>
      <div class="derived-item"><div class="derived-label">DEF</div><div class="derived-val">${DEF}</div></div>
      <div class="derived-item"><div class="derived-label">HUMANITY</div><div class="derived-val">${HUMANITY}</div></div>
      <div class="derived-item"><div class="derived-label">IMPLANT LIM</div><div class="derived-val">${IMPL_LIM}</div></div>
    </div>`;

  const abHtml = ABILITIES.map(ab => {
    const val = abs[ab] ?? 3;
    const mod = AB_MOD[val] ?? 0;
    const mStr = mod >= 0 ? `+${mod}` : `${mod}`;
    return `<div class="sheet-row">
      <span class="sheet-label">${AB_FULL[ab]} <span class="sheet-ab-key">${ab}</span></span>
      <span class="sheet-value">${val} <span class="sheet-mod">(${mStr})</span></span>
    </div>`;
  }).join('');

  const skillCount = (c.skills || []).filter(s => s.bonus !== null).length;
  const devCount   = (c.devSkills || []).length;

  // Управление уровнем и DP
  const levelHtml = `
    <div class="level-block">
      <div class="level-row">
        <span class="level-label">Уровень</span>
        <div class="level-controls">
          <button class="ab-btn" onclick="changeCharLevel(${charIndex}, -1)">−</button>
          <span class="level-val">${level}</span>
          <button class="ab-btn" onclick="changeCharLevel(${charIndex}, +1)">+</button>
        </div>
      </div>
      <div class="level-row">
        <span class="level-label">DP (Development Points)</span>
        <div class="level-controls">
          <button class="ab-btn" onclick="changeCharDP(${charIndex}, -1)">−</button>
          <span class="level-val">${dp}</span>
          <button class="ab-btn" onclick="changeCharDP(${charIndex}, +1)">+</button>
        </div>
      </div>
      <div class="level-access">Tier ${lvlInfo.tier}: ${lvlInfo.access}</div>
      ${nextLvl ? `<div class="level-next">Следующий уровень (${nextLvl.level}): +${nextLvl.dp} DP → ${nextLvl.access}</div>` : '<div class="level-next">🏆 Максимальный уровень!</div>'}
      <button class="btn-level-table" onclick="openLevelSubpage(${charIndex})">📈 Таблица прогрессии →</button>
    </div>`;

  document.getElementById('charsheet-content').innerHTML = `
    <div class="sheet-header">
      <div class="sheet-name">${c.name}</div>
      ${c.concept ? `<div class="sheet-concept">${c.concept}</div>` : ''}
      <div class="sheet-meta">${ORIGIN_LABELS[c.origin]||c.origin} · ${KIT_LABELS[c.k1]||c.k1} + ${KIT_LABELS[c.k2]||c.k2}</div>
    </div>
    ${levelHtml}
    ${derivedHtml}
    <div class="sheet-section">Характеристики</div>
    ${abHtml}
    <div class="sheet-section subpage-section-link" id="link-skills-sub">
      Навыки <span class="subpage-badge">${skillCount}</span><span class="section-arrow">›</span>
    </div>
    <div class="sheet-section subpage-section-link" id="link-devskills-sub">
      Скиллы развития <span class="subpage-badge">${devCount}</span><span class="section-arrow">›</span>
    </div>`;

  document.getElementById('link-skills-sub').onclick = () => openSkillsSubpage(charIndex);
  document.getElementById('link-devskills-sub').onclick = () => openDevSkillsSubpage(charIndex);
  document.getElementById('charsheet-content').dataset.charIndex = charIndex;
  showStep(7);
}

// ======= LEVEL CONTROLS =======
function changeCharLevel(charIndex, delta) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const c = saved[charIndex];
  if (!c) return;
  const newLevel = Math.max(1, Math.min(10, (c.level || 1) + delta));
  const lvlInfo = LEVEL_PROGRESSION.find(l => l.level === newLevel);
  if (delta > 0 && lvlInfo) {
    c.dp = (c.dp || 0) + lvlInfo.dp;
  } else if (delta < 0) {
    const oldLvlInfo = LEVEL_PROGRESSION.find(l => l.level === (c.level || 1));
    c.dp = Math.max(0, (c.dp || 0) - (oldLvlInfo ? oldLvlInfo.dp : 0));
  }
  c.level = newLevel;
  saved[charIndex] = c;
  localStorage.setItem('cp_characters', JSON.stringify(saved));
  openCharSheet(charIndex);
}

function changeCharDP(charIndex, delta) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const c = saved[charIndex];
  if (!c) return;
  c.dp = Math.max(0, (c.dp || 0) + delta);
  saved[charIndex] = c;
  localStorage.setItem('cp_characters', JSON.stringify(saved));
  openCharSheet(charIndex);
}

// ======= LEVEL SUBPAGE (step 10) =======
function openLevelSubpage(charIndex) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const c = saved[charIndex];
  if (!c) return;
  const currentLevel = c.level || 1;

  const progressionRows = LEVEL_PROGRESSION.map(l => {
    const isActive = l.level === currentLevel;
    const isPast = l.level < currentLevel;
    return `<div class="level-table-row${isActive ? ' level-active' : isPast ? ' level-past' : ''}">
      <span class="lt-lvl">${isActive ? '▶ ' : ''}Ур. ${l.level}</span>
      <span class="lt-tier">Tier ${l.tier}</span>
      <span class="lt-dp">+${l.dp} DP</span>
      <span class="lt-total">${l.dpTotal} DP всего</span>
      <span class="lt-access">${l.access}</span>
    </div>`;
  }).join('');

  const costsRows = DP_COSTS.map(d =>
    `<div class="dp-cost-row">
      <span class="dp-cost-name">${d.name}</span>
      <span class="dp-cost-val">${d.cost} DP</span>
    </div>`
  ).join('');

  document.getElementById('level-content').innerHTML = `
    <div class="level-subpage-header">Персонаж: <strong>${c.name}</strong> · Уровень ${currentLevel} · DP: ${c.dp || 0}</div>
    <div class="s-section">Таблица прогрессии</div>
    <div class="level-table">${progressionRows}</div>
    <div class="s-section">Стоимость улучшений (DP)</div>
    <div class="dp-costs-list">${costsRows}</div>`;

  document.getElementById('level-back').onclick = () => openCharSheet(charIndex);
  showStep(10);
}

// ======= SKILLS SUBPAGE (step 8) =======
function openSkillsSubpage(charIndex) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const c = saved[charIndex];
  if (!c) return;
  const skills = (c.skills || []).filter(s => s.bonus !== null);
  const rows = skills.length
    ? skills.map(s => `
        <div class="subpage-row">
          <div class="subpage-row-main">
            <span class="subpage-name">${s.name}</span>
            <span class="subpage-value">${SKILL_LEVEL_NAMES[s.bonus] || '—'} <span class="subpage-bonus">(+${s.bonus})</span></span>
          </div>
          <div class="subpage-base">${s.base}</div>
        </div>`).join('')
    : '<div class="subpage-empty">Нет выбранных навыков</div>';
  document.getElementById('skills-sub-content').innerHTML = rows;
  document.getElementById('skills-sub-back').onclick = () => openCharSheet(charIndex);
  showStep(8);
}

// ======= DEV SKILLS SUBPAGE (step 9) =======
function openDevSkillsSubpage(charIndex) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const c = saved[charIndex];
  if (!c) return;
  const devSkillNames = c.devSkills || [];
  const rows = devSkillNames.length
    ? devSkillNames.map(name => {
        const sk = DEV_SKILLS.find(d => d.name === name);
        if (!sk) return '';
        return `<div class="subpage-devskill-row">
          <div class="subpage-devskill-header">
            <span class="subpage-devskill-name">${sk.name}</span>
            <span class="subpage-devskill-class">${sk.classLabel}</span>
          </div>
          <div class="subpage-devskill-desc">${sk.desc}</div>
        </div>`;
      }).join('')
    : '<div class="subpage-empty">Нет выбранных скиллов развития</div>';
  document.getElementById('devskills-sub-content').innerHTML = rows;
  document.getElementById('devskills-sub-back').onclick = () => openCharSheet(charIndex);
  showStep(9);
}

function deleteChar(i) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  saved.splice(i, 1);
  localStorage.setItem('cp_characters', JSON.stringify(saved));
  loadSaved();
}

function exportChars() {
  const saved = localStorage.getItem('cp_characters') || '[]';
  const blob  = new Blob([saved], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = `cp_characters_${Date.now()}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function importChars(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Неверный формат');
      const existing = JSON.parse(localStorage.getItem('cp_characters') || '[]');
      localStorage.setItem('cp_characters', JSON.stringify([...existing, ...data]));
      loadSaved();
      alert(`Импортировано ${data.length} персонаж(ей)`);
    } catch (er) { alert('Ошибка импорта: ' + er.message); }
  };
  reader.readAsText(file);
}

function newCharacter() {
  abilityValues = { STR:3, DEX:3, INT:3, WIL:3, PER:3, TEC:3 };
  selectedDevSkills = [];
  ['char-name','char-concept','char-origin','char-kit1','char-kit2'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  initAbilityScores();
  initSkills();
  showStep(1);
}

// ======= INIT =======
initAbilityScores();
initSkills();
showStep(1);
