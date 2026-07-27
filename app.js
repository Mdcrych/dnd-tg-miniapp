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

// ======= STATE =======
let abilityValues = { STR:3, DEX:3, INT:3, WIL:3, PER:3, TEC:3 };
let TOTAL_POINTS = 6;
let selectedDevSkills = [];
let currentPopupAb = null;
let currentPopupAbValues = null;
// Стек навигации для кнопки «Назад» на подстраницах
let navStack = [];

// ======= STEP NAVIGATION =======
// Steps: 1=basic, 2=abilities, 3=skills, 4=devskills, 5=dice, 6=summary, 7=saved
// Subpages: 8=char-sheet, 9=skills-sub, 10=devskills-sub
const STEP_IDS = [
  'step-basic','step-abilities','step-skills','step-devskills',
  'step-dice','step-summary','step-saved','step-charsheet',
  'step-skills-sub','step-devskills-sub'
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
  if (n === 6) buildSummary();
  if (n === 7) loadSaved();
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
  // Используем DocumentFragment для быстрой вставки
  const frag = document.createDocumentFragment();
  ABILITIES.forEach(ab => {
    const div = document.createElement('div');
    div.className = 'ability-block';
    div.id = `ab-block-${ab}`;
    div.onclick = () => openPopup(ab, null);
    div.innerHTML = `
      <div class="ability-tag">${ab}</div>
      <div class="ability-name-full">${AB_FULL[ab]}</div>
      <div class="ability-controls">
        <button class="ab-btn" onclick="event.stopPropagation(); changeAb('${ab}',-1)">−</button>
        <span class="ab-val" id="ab-val-${ab}">${abilityValues[ab]}</span>
        <button class="ab-btn" onclick="event.stopPropagation(); changeAb('${ab}',+1)">+</button>
      </div>
      <div class="ab-mod" id="ab-mod-${ab}"></div>
      <div class="dice-hint">нажми → бросок проверки</div>`;
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
  const cost = delta > 0 ? pointCost(cur, next) : -pointCost(next, cur);
  const rem = getRemainingPoints();
  if (delta > 0 && cost > rem) { err(`Недостаточно очков! Нужно ${cost}, осталось ${rem}`); return; }
  abilityValues[ab] = next;
  refreshAb(ab);
  refreshPoints();
}

function pointCost(from, to) {
  let c = 0;
  for (let i = from; i < to; i++) c += (i >= 4 ? 2 : 1);
  return c;
}
function totalSpent() {
  return ABILITIES.reduce((s, ab) => s + pointCost(3, abilityValues[ab]), 0);
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

// ======= POPUP (Ability Check) =======
function openPopup(ab, abValues) {
  currentPopupAb = ab;
  currentPopupAbValues = abValues || abilityValues;
  const val = currentPopupAbValues[ab] ?? 3;
  const mod = AB_MOD[val] ?? 0;
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  document.getElementById('popup-title').textContent = `Бросок: ${AB_FULL[ab]} (${ab})`;
  document.getElementById('popup-formula').textContent = `1d20 ${modStr} (мод) + навык + ситуатив`;
  document.getElementById('popup-result').classList.add('hidden');
  clearPopupErrors();
  const advNormal = document.querySelector('input[name=adv][value=normal]');
  if (advNormal) advNormal.checked = true;
  document.getElementById('popup-dc').value = '13';
  document.getElementById('popup-skill').value = '0';
  document.getElementById('ability-roll-popup').classList.remove('hidden');
  document.querySelectorAll('.ability-block').forEach(b => b.classList.remove('active-popup'));
  document.getElementById(`ab-block-${ab}`)?.classList.add('active-popup');
}

function closePopup() {
  document.getElementById('ability-roll-popup').classList.add('hidden');
  document.querySelectorAll('.ability-block').forEach(b => b.classList.remove('active-popup'));
  currentPopupAb = null;
  currentPopupAbValues = null;
  clearPopupErrors();
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
function clearPopupErrors() {
  ['popup-dc','popup-skill','dice-count'].forEach(clearFieldError);
}

function validatePopupInputs() {
  let valid = true;
  clearPopupErrors();
  const dc = parseInt(document.getElementById('popup-dc')?.value);
  if (isNaN(dc) || dc < 1 || dc > 30) { showFieldError('popup-dc', 'DC: число от 1 до 30'); valid = false; }
  const skill = parseInt(document.getElementById('popup-skill')?.value);
  if (![0, 2, 4, 6].includes(skill)) { showFieldError('popup-skill', 'Выберите уровень навыка'); valid = false; }
  if (!document.querySelector('input[name=adv]:checked')) valid = false;
  return valid;
}

function validateDiceCount() {
  clearFieldError('dice-count');
  const val = parseInt(document.getElementById('dice-count')?.value);
  if (isNaN(val) || val < 1 || val > 20) {
    showFieldError('dice-count', 'Кол-во кубиков: от 1 до 20');
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('popup-dc')?.addEventListener('input', () => {
    const val = parseInt(document.getElementById('popup-dc').value);
    if (!isNaN(val) && val >= 1 && val <= 30) clearFieldError('popup-dc');
    else showFieldError('popup-dc', 'DC: число от 1 до 30');
  });
  document.getElementById('popup-skill')?.addEventListener('change', () => clearFieldError('popup-skill'));
  document.getElementById('dice-count')?.addEventListener('input', () => {
    const val = parseInt(document.getElementById('dice-count').value);
    if (!isNaN(val) && val >= 1 && val <= 20) clearFieldError('dice-count');
    else showFieldError('dice-count', 'От 1 до 20');
  });
});

// ======= EXECUTE ROLL =======
function executeRoll() {
  if (!validatePopupInputs()) return;
  const ab = currentPopupAb;
  const abVals = currentPopupAbValues || abilityValues;
  if (!ab) return;
  const val = abVals[ab] ?? 3;
  const mod = AB_MOD[val] ?? 0;
  const skillBonus = parseInt(document.getElementById('popup-skill').value) || 0;
  const dc   = parseInt(document.getElementById('popup-dc').value) || 13;
  const adv  = document.querySelector('input[name=adv]:checked')?.value || 'normal';
  let d1 = roll20(), d2 = roll20(), chosen, rolls;
  if (adv === 'advantage')      { chosen = Math.max(d1,d2); rolls = `[${d1}, ${d2}] → ${chosen}`; }
  else if (adv === 'disadvantage') { chosen = Math.min(d1,d2); rolls = `[${d1}, ${d2}] → ${chosen}`; }
  else                              { chosen = d1; rolls = `${d1}`; }
  const total = chosen + mod + skillBonus;
  const isCritSuccess = chosen === 20;
  const isCritFail    = chosen === 1;
  const diff = total - dc;
  let verdict, cls;
  if (isCritFail)         { verdict = '💀 Крит. провал! Осложнение.'; cls = 'crit-fail'; }
  else if (isCritSuccess) { verdict = '⚡ Крит. успех!';              cls = 'crit-success'; }
  else if (diff >= 0)     { verdict = `✅ Успех! (+${diff} к DC)`;    cls = 'success'; }
  else if (diff >= -2)    { verdict = `⚠️ Ценой? (не хв. ${Math.abs(diff)})`; cls = 'close'; }
  else                    { verdict = `❌ Провал (хв. ${Math.abs(diff)})`;     cls = 'fail'; }
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  const sklStr = skillBonus > 0 ? ` + ${skillBonus}` : '';
  const resEl = document.getElementById('popup-result');
  resEl.classList.remove('hidden');
  resEl.innerHTML = `
    <div class="res-dice">d20: ${rolls}</div>
    <div class="res-total">${chosen} (d20) ${modStr} (${AB_FULL[ab]})${sklStr} = <strong>${total}</strong> vs DC ${dc}</div>
    <div class="res-verdict ${cls}">${verdict}</div>`;
  addHistory(`${ab}: d20=${chosen} ${modStr}${sklStr} = ${total} (DC ${dc}) → ${isCritSuccess?'КРИТ!':isCritFail?'ФЕЙЛ!':diff>=0?'Успех':'Провал'}`);
}

function roll20() { return Math.ceil(Math.random() * 20); }

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
// Скиллы развития — отдельная подстраница с группировкой по классам.
// Выбрать можно любой скилл (до 2), независимо от класса персонажа.
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
      // Класс персонажа указан в badge рядом с именем скилла
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

// ======= DICE ROLLER (step 5) =======
function rollDice(sides) {
  if (!validateDiceCount()) return;
  const count = parseInt(document.getElementById('dice-count').value);
  const results = Array.from({length: count}, () => Math.ceil(Math.random() * sides));
  const total = results.reduce((a,b) => a+b, 0);
  const label = count > 1
    ? `${count}d${sides}: [${results.join(', ')}] = ${total}`
    : `d${sides}: ${total}`;
  const resultEl = document.getElementById('roll-result');
  resultEl.classList.remove('hidden');
  resultEl.textContent = label;
  addHistory(label);
}

function addHistory(text) {
  const hist = document.getElementById('roll-history');
  if (!hist) return;
  const p = document.createElement('p');
  p.textContent = text;
  hist.prepend(p);
  if (hist.children.length > 25) hist.lastChild.remove();
}

// ======= SUMMARY (step 6) =======
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
    return `<div class="s-row s-row-rollable" onclick="openPopup('${ab}', null)" title="Бросок ${AB_FULL[ab]}">
      <span class="s-label">${AB_FULL[ab]} (${ab})</span>
      <span class="s-value">${abilityValues[ab]} (${m >= 0 ? '+' : ''}${m}) <span class="roll-hint">🎲</span></span>
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
    <div class="s-section">Характеристики <span class="section-hint">— нажми для броска</span></div>
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
    createdAt: Date.now()
  };
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  saved.push(char);
  localStorage.setItem('cp_characters', JSON.stringify(saved));
  nextStep(7);
}

// ======= SAVED LIST (step 7) =======
function loadSaved() {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const list  = document.getElementById('saved-list');
  if (!saved.length) {
    list.innerHTML = '<p style="color:#446688">Нет сохранённых персонажей</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  saved.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'char-list-row';
    row.onclick = () => openCharSheet(i);
    row.innerHTML = `
      <div class="char-list-info">
        <span class="char-list-name">${c.name}</span>
        ${c.concept ? `<span class="char-list-concept">${c.concept}</span>` : ''}
        <span class="char-list-meta">${ORIGIN_LABELS[c.origin]||c.origin} · ${KIT_LABELS[c.k1]||c.k1}</span>
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

// ======= CHARACTER SHEET (step 8 — подстраница) =======
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
    return `<div class="sheet-row sheet-row-rollable" onclick="openPopupFromSaved('${ab}', ${charIndex})">
      <span class="sheet-label">${AB_FULL[ab]} <span class="sheet-ab-key">${ab}</span></span>
      <span class="sheet-value">${val} <span class="sheet-mod">(${mStr})</span> <span class="roll-hint">🎲</span></span>
    </div>`;
  }).join('');

  // Навыки и Dev Skills — кликабельные ссылки на подстраницы
  const skillCount = (c.skills || []).filter(s => s.bonus !== null).length;
  const devCount   = (c.devSkills || []).length;

  document.getElementById('charsheet-content').innerHTML = `
    <div class="sheet-header">
      <div class="sheet-name">${c.name}</div>
      ${c.concept ? `<div class="sheet-concept">${c.concept}</div>` : ''}
      <div class="sheet-meta">${ORIGIN_LABELS[c.origin]||c.origin} · ${KIT_LABELS[c.k1]||c.k1} + ${KIT_LABELS[c.k2]||c.k2}</div>
    </div>
    ${derivedHtml}
    <div class="sheet-section">Характеристики <span class="section-hint">— нажми для броска</span></div>
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
  showStep(8);
}

// ======= SKILLS SUBPAGE (step 9) =======
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
  showStep(9);
}

// ======= DEV SKILLS SUBPAGE (step 10) =======
// Подстраница показывает выбранные скиллы с именем класса в описании
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
  showStep(10);
}

function openPopupFromSaved(ab, charIndex) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const char  = saved[charIndex];
  if (!char) return;
  openPopup(ab, char.abilities);
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
