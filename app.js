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
  { name: 'Переговоры',         base: 'PER / WIL' },
  { name: 'Исполнение',         base: 'PER / WIL' },
  { name: 'Убеждение',          base: 'WIL' },
  { name: 'Торговля',           base: 'PER' },
  { name: 'Связи',              base: 'PER / WIL' },
  { name: 'Уличная смекалка',   base: 'INT / PER' },
];

const ALL_DEVSKILLS = [
  { name: 'Прицельная очередь',  class: 'Боец',        dpCost: 2, desc: 'Перед броском атаки объяви прицел. Попадание — доп. эффект (дезориентация, замедление и т.д.).' },
  { name: 'Двойной выстрел',     class: 'Боец',        dpCost: 3, desc: 'Два броска атаки за одно действие по одной цели или разным.' },
  { name: 'Тяжёлый удар',        class: 'Боец',        dpCost: 2, desc: 'Ближний бой: +1 куб урона, цель делает проверку STR DC 13 или теряет малое действие.' },
  { name: 'Базовый порт',        class: 'Нетраннер',   dpCost: 1, desc: '+2 MAX RAM. Открывает хаки Ping, Tag, Scan.' },
  { name: 'Расширенная RAM',     class: 'Нетраннер',   dpCost: 2, desc: '+1 MAX RAM.' },
  { name: 'Нейропорт',           class: 'Нетраннер',   dpCost: 2, desc: '+1 MAX RAM. Беспроводное подключение без физического кабеля.' },
  { name: 'Разогнанный стек',    class: 'Нетраннер',   dpCost: 3, desc: 'Снижай цену хака на 1 RAM за 1d4 STRESS урона.' },
  { name: 'Стабильная рука',     class: 'Рипер',       dpCost: 1, desc: '+2 к проверкам Медицины при оказании помощи.' },
  { name: 'Полевая хирургия',    class: 'Рипер',       dpCost: 2, desc: 'Восстанавливает 2d6+2 HP за действие. Требует аптечку.' },
  { name: 'Имплант-диагностика', class: 'Рипер',       dpCost: 2, desc: 'Сканирует состояние имплантов союзника, выявляет неисправности или взлом.' },
  { name: 'Личный дрон',         class: 'Техник',      dpCost: 1, desc: 'Компактный дрон: разведка или отвлечение. Действует в твой ход как малое действие.' },
  { name: 'Перенос перегруза',   class: 'Техник',      dpCost: 2, desc: 'Часть технической цены переводится в STRESS вместо потери ресурса.' },
  { name: 'Уверенный пилот',     class: 'Пилот',       dpCost: 1, desc: '+2 к проверкам Вождения/Пилотирования при опасных манёврах.' },
  { name: 'Боевой разворот',     class: 'Пилот',       dpCost: 2, desc: 'Как малое действие: резкий манёвр, враги делают проверку или теряют действие.' },
  { name: 'Толпа слушает',       class: 'Агитатор',    dpCost: 1, desc: '+2 к Исполнению в публичных сценах.' },
  { name: 'Заражающий нарратив', class: 'Агитатор',    dpCost: 2, desc: 'Убедительная речь — цель делает WIL DC 14 или меняет приоритет.' },
  { name: 'Сделка дня',          class: 'Фиксер',      dpCost: 1, desc: '+2 к Торговле при первой сделке сессии.' },
  { name: 'Призрачный маршрут',  class: 'Курьер',      dpCost: 2, desc: 'Снижает Heat на 1 после скрытного отхода.' },
];

const KIT_LABELS = {
  merc:        'Уличный наёмник',
  tech:        'Подпольный техник',
  netrunner:   'Сетевой беглец',
  ripper:      'Рипердок',
  agitator:    'Агитатор сцены',
  fixer:       'Фиксер района',
  agent:       'Корпоративный агент',
  courier:     'Курьер-призрак',
  pilot:       'Пилот транспорта',
  dronebuilder:'Сборщик дронов',
};

// Бонусы пакетов: каждый вариант — { label, skill?, val?, multi? }
const KIT_BONUSES = {
  merc:        [
    { label: 'Стрельба +2',                       skill: 'Стрельба',     val: 2 },
    { label: 'Ближний бой +2',                    skill: 'Ближний бой',  val: 2 },
    { label: 'Атлетика +1 и Скрытность +1',       multi: [['Атлетика',1],['Скрытность',1]] },
  ],
  tech:        [
    { label: 'Электроника +2',                    skill: 'Электроника',  val: 2 },
    { label: 'Ремонт +2',                         skill: 'Ремонт',       val: 2 },
    { label: 'Дроны +2',                          skill: 'Дроны',        val: 2 },
  ],
  netrunner:   [
    { label: 'Взлом +2',                          skill: 'Взлом',        val: 2 },
    { label: 'Анализ +2',                         skill: 'Анализ',       val: 2 },
    { label: 'Взлом +1 и Электроника +1',         multi: [['Взлом',1],['Электроника',1]] },
  ],
  ripper:      [
    { label: 'Медицина +2',                       skill: 'Медицина',     val: 2 },
    { label: 'Электроника +1 и Медицина +1',      multi: [['Электроника',1],['Медицина',1]] },
  ],
  agitator:    [
    { label: 'Исполнение +2',                     skill: 'Исполнение',   val: 2 },
    { label: 'Убеждение +2',                      skill: 'Убеждение',    val: 2 },
    { label: 'Исполнение +1 и Связи +1',          multi: [['Исполнение',1],['Связи',1]] },
  ],
  fixer:       [
    { label: 'Торговля +2',                       skill: 'Торговля',     val: 2 },
    { label: 'Связи +2',                          skill: 'Связи',        val: 2 },
    { label: 'Торговля +1 и Переговоры +1',       multi: [['Торговля',1],['Переговоры',1]] },
  ],
  agent:       [
    { label: 'Анализ +2',                         skill: 'Анализ',       val: 2 },
    { label: 'Скрытность +2',                     skill: 'Скрытность',   val: 2 },
    { label: 'Скрытность +1 и Анализ +1',         multi: [['Скрытность',1],['Анализ',1]] },
  ],
  courier:     [
    { label: 'Скрытность +2',                     skill: 'Скрытность',   val: 2 },
    { label: 'Вождение +2',                       skill: 'Вождение',     val: 2 },
    { label: 'Скрытность +1 и Акробатика +1',     multi: [['Скрытность',1],['Акробатика',1]] },
  ],
  pilot:       [
    { label: 'Пилотирование +2',                  skill: 'Пилотирование',val: 2 },
    { label: 'Вождение +2',                       skill: 'Вождение',     val: 2 },
    { label: 'Вождение +1 и Дроны +1',            multi: [['Вождение',1],['Дроны',1]] },
  ],
  dronebuilder:[
    { label: 'Дроны +2',                          skill: 'Дроны',        val: 2 },
    { label: 'Ремонт +2',                         skill: 'Ремонт',       val: 2 },
    { label: 'Ремонт +1 и Дроны +1',             multi: [['Ремонт',1],['Дроны',1]] },
  ],
};

const SKILL_RANKS  = ['Необучен', 'Обучен', 'Эксперт', 'Мастер'];
const SKILL_BONUS  = [0, 2, 4, 6];
const UPGRADE_COST_SKILL = { 0: 1, 1: 2, 2: 3 };
const UPGRADE_COST_STAT  = { 3: 3, 4: 5 };

// ======= STATE =======
let abilities = { STR:3, DEX:3, INT:3, WIL:3, PER:3, TEC:3 };
let pointsLeft = 6;
let skillRanks = {}; // { name: 0|1|2|3 }
let selectedDevskills = [];
let savedChars = [];
let currentCharIndex = -1;
let upgradeChar = null; // working copy during upgrade

// ======= STORAGE =======
function saveToStorage() {
  try { localStorage.setItem('cp_chars', JSON.stringify(savedChars)); } catch(e) {}
}
function loadFromStorage() {
  try {
    const d = localStorage.getItem('cp_chars');
    if (d) savedChars = JSON.parse(d);
  } catch(e) { savedChars = []; }
}

// ======= NAVIGATION =======
function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const steps = [
    null,'step-basic','step-abilities','step-skills','step-devskills',
    'step-summary','step-saved','step-charsheet','step-skills-sub',
    'step-devskills-sub','step-level'
  ];
  const el = document.getElementById(steps[n]);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}
function nextStep(n) {
  if (n === 2) renderAbilities();
  if (n === 3) renderSkills();
  if (n === 4) renderDevskills();
  if (n === 5) renderSummary();
  showStep(n);
}
function prevStep(n) { showStep(n); }

// ======= KIT BONUS PANEL =======
function renderKitBonus(n) {
  const sel = document.getElementById('char-kit' + n).value;
  const panel = document.getElementById('kit' + n + '-bonus-panel');
  if (!sel || !KIT_BONUSES[sel]) {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }
  const opts = KIT_BONUSES[sel];
  panel.innerHTML =
    '<p class="hint" style="margin-bottom:0.4rem">Выберите бонус пакета <strong>' + KIT_LABELS[sel] + '</strong>:</p>' +
    opts.map((o, i) =>
      '<label class="kit-bonus-option"><input type="radio" name="kit' + n + 'bonus" value="' + i + '" ' + (i===0?'checked':'') + ' /> ' + o.label + '</label>'
    ).join('');
  panel.classList.remove('hidden');
}

function getKitBonusIndex(n) {
  const radios = document.querySelectorAll('input[name="kit' + n + 'bonus"]');
  for (const r of radios) { if (r.checked) return parseInt(r.value); }
  return 0;
}

// ======= ABILITIES =======
function renderAbilities() {
  const container = document.getElementById('ability-scores');
  container.innerHTML = ABILITIES.map(ab => {
    const v = abilities[ab];
    return `<div class="ability-row">
      <span class="ab-name">${AB_FULL[ab]} <small>(${ab})</small></span>
      <div class="ab-controls">
        <button onclick="changeAb('${ab}',-1)" aria-label="−">−</button>
        <span class="ab-val">${v}</span>
        <button onclick="changeAb('${ab}',1)" aria-label="+">+</button>
      </div>
      <span class="ab-mod">${AB_MOD[v]>=0?'+':''}${AB_MOD[v]}</span>
    </div>`;
  }).join('');
  document.getElementById('points-left').textContent = pointsLeft;
}

function changeAb(ab, delta) {
  const cur = abilities[ab];
  const next = cur + delta;
  if (next < 1 || next > 5) return;
  const fivesCount = ABILITIES.filter(a => abilities[a] === 5).length;
  if (delta === 1 && next === 5 && fivesCount >= 2) { alert('Нельзя больше двух характеристик на 5!'); return; }
  const cost = delta === 1
    ? (cur >= 3 ? (cur === 4 ? 2 : 1) : -1)
    : (cur > 3 ? (cur === 4 ? -1 : -2) : 1);
  if (delta === 1 && pointsLeft < cost) { alert('Не хватает очков!'); return; }
  abilities[ab] = next;
  pointsLeft -= cost;
  renderAbilities();
}

// ======= SKILLS =======
function renderSkills() {
  const container = document.getElementById('skills-container');
  let trained = 0, expert = 0;
  Object.values(skillRanks).forEach(r => { if(r===1) trained++; if(r===2) expert++; });
  container.innerHTML = SKILLS.map(sk => {
    const r = skillRanks[sk.name] || 0;
    return `<div class="skill-row">
      <span class="skill-name">${sk.name} <small class="skill-base">[${sk.base}]</small></span>
      <div class="skill-controls">
        <button onclick="cycleSkill('${sk.name}',-1)">−</button>
        <span class="skill-rank rank-${r}">${SKILL_RANKS[r]}</span>
        <button onclick="cycleSkill('${sk.name}',1)">+</button>
      </div>
    </div>`;
  }).join('');
  const counter = document.querySelector('#step-skills .hint');
  if(counter) counter.innerHTML = `Выберите <strong>5 навыков Обучен</strong> и <strong>1 Эксперт</strong>.<br>Обучен: ${trained}/5 &nbsp;|&nbsp; Эксперт: ${expert}/1`;
}

function cycleSkill(name, delta) {
  const cur = skillRanks[name] || 0;
  const next = Math.max(0, Math.min(2, cur + delta));
  const trained = Object.values(skillRanks).filter(r=>r===1).length;
  const expert  = Object.values(skillRanks).filter(r=>r===2).length;
  if (delta === 1) {
    if (next === 1 && trained >= 5 && (skillRanks[name]||0) !== 1) { alert('Уже выбрано 5 навыков Обучен!'); return; }
    if (next === 2 && expert >= 1 && (skillRanks[name]||0) !== 2) { alert('Уже выбран 1 Эксперт!'); return; }
  }
  skillRanks[name] = next;
  renderSkills();
}

// ======= DEV SKILLS =======
function renderDevskills() {
  const container = document.getElementById('devskills-container');
  container.innerHTML = ALL_DEVSKILLS.map(ds => {
    const sel = selectedDevskills.includes(ds.name);
    return `<div class="devskill-card ${sel?'selected':''}" onclick="toggleDevskill('${ds.name}')">
      <div class="devskill-header">
        <span class="devskill-name">${ds.name}</span>
        <span class="devskill-class">${ds.class}</span>
      </div>
      <div class="devskill-desc">${ds.desc}</div>
    </div>`;
  }).join('');
  document.getElementById('devskills-count').textContent = `Выбрано: ${selectedDevskills.length} / 2`;
}

function toggleDevskill(name) {
  const idx = selectedDevskills.indexOf(name);
  if (idx >= 0) { selectedDevskills.splice(idx, 1); }
  else {
    if (selectedDevskills.length >= 2) { alert('Максимум 2 скила развития на старте!'); return; }
    selectedDevskills.push(name);
  }
  renderDevskills();
}

// ======= SUMMARY =======
function calcDerived() {
  const hp     = 10 + abilities.STR + abilities.WIL;
  const stress = 10 + abilities.WIL + abilities.INT;
  const def    = 10 + AB_MOD[abilities.DEX];
  const impl   = abilities.WIL + 1;
  let maxRam   = 0;
  selectedDevskills.forEach(n => {
    const ds = ALL_DEVSKILLS.find(d => d.name === n);
    if (!ds) return;
    if (ds.name === 'Базовый порт')    maxRam += 2;
    if (ds.name === 'Расширенная RAM') maxRam += 1;
    if (ds.name === 'Нейропорт')       maxRam += 1;
  });
  return { hp, stress, def, impl, maxRam };
}

function renderSummary() {
  const derived = calcDerived();
  const kit1val = document.getElementById('char-kit1').value;
  const kit2val = document.getElementById('char-kit2').value;
  const bonus1  = kit1val && KIT_BONUSES[kit1val] ? KIT_BONUSES[kit1val][getKitBonusIndex(1)].label : '—';
  const bonus2  = kit2val && KIT_BONUSES[kit2val] ? KIT_BONUSES[kit2val][getKitBonusIndex(2)].label : '—';

  document.getElementById('summary-content').innerHTML = `
    <div class="summary-block">
      <strong>${document.getElementById('char-name').value || '(без имени)'}</strong>
      <div class="summary-sub">${document.getElementById('char-concept').value || ''}</div>
    </div>
    <div class="summary-row">Происхождение: <span>${document.getElementById('char-origin').options[document.getElementById('char-origin').selectedIndex].text}</span></div>
    <div class="summary-row">Пакет 1: <span>${kit1val ? KIT_LABELS[kit1val]+' → '+bonus1 : '—'}</span></div>
    <div class="summary-row">Пакет 2: <span>${kit2val ? KIT_LABELS[kit2val]+' → '+bonus2 : '—'}</span></div>
    <h3>Характеристики</h3>
    <div class="ab-summary">${ABILITIES.map(ab=>`<div class="ab-chip"><span>${ab}</span><strong>${abilities[ab]}</strong></div>`).join('')}</div>
    <h3>Навыки</h3>
    <div class="skills-summary">${SKILLS.filter(sk=>(skillRanks[sk.name]||0)>0).map(sk=>`<span class="skill-chip rank-${skillRanks[sk.name]}">${sk.name}: ${SKILL_RANKS[skillRanks[sk.name]]}</span>`).join('') || '<em>не выбраны</em>'}</div>
    <h3>Скиллы развития</h3>
    <div class="devskills-summary">${selectedDevskills.length ? selectedDevskills.map(n=>`<span class="devskill-chip">${n}</span>`).join('') : '<em>не выбраны</em>'}</div>
  `;
  document.getElementById('derived-stats').innerHTML = `
    <h3>Производные</h3>
    <div class="derived-grid">
      <div class="derived-item"><span>HP</span><strong>${derived.hp}</strong></div>
      <div class="derived-item"><span>STRESS</span><strong>${derived.stress}</strong></div>
      <div class="derived-item"><span>DEF</span><strong>${derived.def}</strong></div>
      <div class="derived-item"><span>IMPL LIMIT</span><strong>${derived.impl}</strong></div>
      ${derived.maxRam > 0 ? `<div class="derived-item"><span>MAX RAM</span><strong>${derived.maxRam}</strong></div>` : ''}
    </div>
  `;
  validateBuild();
}

function validateBuild() {
  const errors = [];
  const name = document.getElementById('char-name').value.trim();
  if (!name) errors.push('Укажи имя персонажа.');
  const trained = Object.values(skillRanks).filter(r=>r===1).length;
  const expert  = Object.values(skillRanks).filter(r=>r===2).length;
  if (trained < 5) errors.push(`Нужно 5 навыков Обучен (выбрано: ${trained}).`);
  if (expert < 1)  errors.push('Нужен 1 навык Эксперт.');
  if (pointsLeft !== 0) errors.push(`Очков характеристик: осталось ${pointsLeft} нераспределённых.`);
  const errEl = document.getElementById('validation-errors');
  const okEl  = document.getElementById('validation-ok');
  if (errors.length) {
    errEl.innerHTML = errors.map(e=>`<div>⚠ ${e}</div>`).join('');
    errEl.classList.remove('hidden');
    okEl.classList.add('hidden');
  } else {
    errEl.classList.add('hidden');
    okEl.classList.remove('hidden');
  }
  return errors.length === 0;
}

// ======= SAVE =======
function buildKitBonusSkillMap() {
  const bonusSkills = {};
  [1,2].forEach(n => {
    const kitVal = document.getElementById('char-kit'+n).value;
    if (!kitVal || !KIT_BONUSES[kitVal]) return;
    const bonus = KIT_BONUSES[kitVal][getKitBonusIndex(n)];
    if (bonus.skill) {
      bonusSkills[bonus.skill] = (bonusSkills[bonus.skill]||0) + bonus.val;
    } else if (bonus.multi) {
      bonus.multi.forEach(([sk, v]) => { bonusSkills[sk] = (bonusSkills[sk]||0) + v; });
    }
  });
  return bonusSkills;
}

function saveCharacter() {
  if (!validateBuild()) { alert('Исправь ошибки перед сохранением.'); return; }
  const kitBonusSkills = buildKitBonusSkillMap();
  const derivedSkillRanks = {};
  SKILLS.forEach(sk => {
    derivedSkillRanks[sk.name] = skillRanks[sk.name] || 0;
  });
  const char = {
    name:     document.getElementById('char-name').value.trim(),
    concept:  document.getElementById('char-concept').value.trim(),
    origin:   document.getElementById('char-origin').value,
    kit1:     document.getElementById('char-kit1').value,
    kit2:     document.getElementById('char-kit2').value,
    kit1bonus: getKitBonusIndex(1),
    kit2bonus: getKitBonusIndex(2),
    abilities: { ...abilities },
    skillRanks: derivedSkillRanks,
    kitBonusSkills,
    devskills: selectedDevskills.map(n => ALL_DEVSKILLS.find(d=>d.name===n)).filter(Boolean),
    dp: 0,
    upgrades: [],
    createdAt: Date.now(),
  };
  loadFromStorage();
  savedChars.push(char);
  saveToStorage();
  resetBuilder();
  loadSaved();
  nextStep(6);
}

function resetBuilder() {
  abilities = { STR:3, DEX:3, INT:3, WIL:3, PER:3, TEC:3 };
  pointsLeft = 6;
  skillRanks = {};
  selectedDevskills = [];
  ['char-name','char-concept'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  ['char-origin','char-kit1','char-kit2'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  [1,2].forEach(n => {
    const p = document.getElementById('kit'+n+'-bonus-panel');
    if(p) { p.innerHTML=''; p.classList.add('hidden'); }
  });
}

function newCharacter() { resetBuilder(); showStep(1); }

// ======= SAVED LIST =======
function loadSaved() {
  loadFromStorage();
  const list = document.getElementById('saved-list');
  if (!savedChars.length) {
    list.innerHTML = '<div class="empty-state">Нет сохранённых персонажей</div>';
    return;
  }
  list.innerHTML = savedChars.map((c,i) => {
    const d = calcDerivedFromChar(c);
    return `<div class="char-card" onclick="openCharSheet(${i})">
      <div class="char-card-name">${c.name}</div>
      <div class="char-card-sub">${c.concept || ''}</div>
      <div class="char-card-stats">HP ${d.hp} · STRESS ${d.stress} · DEF ${d.def} · DP ${c.dp||0}</div>
    </div>`;
  }).join('');
}

function calcDerivedFromChar(c) {
  const ab = c.abilities;
  const hp     = 10 + ab.STR + ab.WIL;
  const stress = 10 + ab.WIL + ab.INT;
  const def    = 10 + AB_MOD[ab.DEX];
  const impl   = ab.WIL + 1;
  let maxRam   = 0;
  (c.devskills||[]).forEach(ds => {
    if (ds.name === 'Базовый порт')    maxRam += 2;
    if (ds.name === 'Расширенная RAM') maxRam += 1;
    if (ds.name === 'Нейропорт')       maxRam += 1;
  });
  return { hp, stress, def, impl, maxRam };
}

// ======= CHARACTER SHEET =======
function openCharSheet(idx) {
  currentCharIndex = idx;
  renderCharSheet(savedChars[idx]);
  showStep(7);
}

function renderCharSheet(c) {
  const d = calcDerivedFromChar(c);
  const kit1lbl = c.kit1 ? KIT_LABELS[c.kit1] : '—';
  const kit2lbl = c.kit2 ? KIT_LABELS[c.kit2] : '—';
  const bonus1  = (c.kit1 && KIT_BONUSES[c.kit1]) ? KIT_BONUSES[c.kit1][c.kit1bonus||0].label : '—';
  const bonus2  = (c.kit2 && KIT_BONUSES[c.kit2]) ? KIT_BONUSES[c.kit2][c.kit2bonus||0].label : '—';

  const skillsWithBonus = {};
  SKILLS.forEach(sk => {
    const rank = (c.skillRanks||{})[sk.name] || 0;
    const kitBonus = (c.kitBonusSkills||{})[sk.name] || 0;
    skillsWithBonus[sk.name] = { rank, kitBonus };
  });

  document.getElementById('charsheet-content').innerHTML = `
    <div class="sheet-header">
      <div class="sheet-name">${c.name}</div>
      <div class="sheet-concept">${c.concept||''}</div>
      <div class="sheet-dp">DP: <span class="pts">${c.dp||0}</span></div>
    </div>
    <div class="sheet-section">
      <h3>Происхождение и пакеты</h3>
      <div>Происхождение: <strong>${c.origin||'—'}</strong></div>
      <div>Пакет 1: <strong>${kit1lbl}</strong> — ${bonus1}</div>
      <div>Пакет 2: <strong>${kit2lbl}</strong> — ${bonus2}</div>
    </div>
    <div class="sheet-section">
      <h3>Характеристики</h3>
      <div class="ab-summary">${ABILITIES.map(ab=>`<div class="ab-chip"><span>${ab}</span><strong>${c.abilities[ab]}</strong><small>${AB_MOD[c.abilities[ab]]>=0?'+':''}${AB_MOD[c.abilities[ab]]}</small></div>`).join('')}</div>
    </div>
    <div class="sheet-section">
      <h3>Производные</h3>
      <div class="derived-grid">
        <div class="derived-item"><span>HP</span><strong>${d.hp}</strong></div>
        <div class="derived-item"><span>STRESS</span><strong>${d.stress}</strong></div>
        <div class="derived-item"><span>DEF</span><strong>${d.def}</strong></div>
        <div class="derived-item"><span>IMPL LIMIT</span><strong>${d.impl}</strong></div>
        ${d.maxRam>0?`<div class="derived-item"><span>MAX RAM</span><strong>${d.maxRam}</strong></div>`:''}
      </div>
    </div>
    <div class="sheet-section">
      <h3>Навыки</h3>
      <div class="skills-summary">${SKILLS.filter(sk=>{
        const entry = skillsWithBonus[sk.name];
        return entry.rank > 0 || entry.kitBonus > 0;
      }).map(sk => {
        const e = skillsWithBonus[sk.name];
        const bonusTxt = e.kitBonus > 0 ? ` <span class="kit-bonus-badge">+${e.kitBonus} пакет</span>` : '';
        return `<span class="skill-chip rank-${e.rank}">${sk.name}: ${SKILL_RANKS[e.rank]}${bonusTxt}</span>`;
      }).join('') || '<em>нет активных навыков</em>'}</div>
    </div>
    <div class="sheet-section">
      <h3>Скиллы развития</h3>
      ${(c.devskills||[]).length ? (c.devskills||[]).map(ds=>`<div class="devskill-card selected compact"><div class="devskill-header"><span class="devskill-name">${ds.name}</span><span class="devskill-class">${ds.class}</span></div><div class="devskill-desc">${ds.desc}</div></div>`).join('') : '<em>нет скилов</em>'}
    </div>
    ${(c.upgrades&&c.upgrades.length) ? `<div class="sheet-section"><h3>История прокачки</h3><div class="upgrades-log">${c.upgrades.map(u=>`<div class="upgrade-log-entry">${u}</div>`).join('')}</div></div>` : ''}
    <div class="sheet-section">
      <button class="btn-danger" onclick="deleteChar(${currentCharIndex})">🗑 Удалить персонажа</button>
    </div>
  `;
}

function deleteChar(idx) {
  if (!confirm('Удалить персонажа «' + savedChars[idx].name + '»?')) return;
  savedChars.splice(idx, 1);
  saveToStorage();
  loadSaved();
  showStep(6);
}

// ======= UPGRADE MODAL =======
function openUpgradeModal() {
  if (currentCharIndex < 0) return;
  upgradeChar = JSON.parse(JSON.stringify(savedChars[currentCharIndex]));
  if (!upgradeChar.dp) upgradeChar.dp = 0;
  if (!upgradeChar.skillRanks) upgradeChar.skillRanks = {};
  if (!upgradeChar.upgrades) upgradeChar.upgrades = [];

  document.getElementById('upgrade-dp-val').textContent = upgradeChar.dp;
  renderUpgradeSkills();
  renderUpgradeStats();
  renderUpgradeDevskills();
  document.getElementById('upgrade-modal').classList.remove('hidden');
  switchUpgradeTab('skills', document.querySelector('.upgrade-tab'));
}

function closeUpgradeModal() {
  document.getElementById('upgrade-modal').classList.add('hidden');
  upgradeChar = null;
}

function closeUpgradeModalOutside(e) {
  if (e.target === document.getElementById('upgrade-modal')) closeUpgradeModal();
}

function switchUpgradeTab(tab, btn) {
  ['skills','stats','devskills'].forEach(t => {
    document.getElementById('upgrade-tab-'+t).classList.add('hidden');
  });
  document.getElementById('upgrade-tab-'+tab).classList.remove('hidden');
  document.querySelectorAll('.upgrade-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function changeDP(delta) {
  if (!upgradeChar) return;
  upgradeChar.dp = Math.max(0, (upgradeChar.dp||0) + delta);
  document.getElementById('upgrade-dp-val').textContent = upgradeChar.dp;
}

function renderUpgradeSkills() {
  const list = document.getElementById('upgrade-skills-list');
  list.innerHTML = SKILLS.map(sk => {
    const cur = (upgradeChar.skillRanks||{})[sk.name] || 0;
    const canUp = cur < 3;
    const cost = UPGRADE_COST_SKILL[cur];
    return `<div class="upgrade-row">
      <span class="upgrade-skill-name">${sk.name}</span>
      <span class="upgrade-rank-badge rank-${cur}">${SKILL_RANKS[cur]}</span>
      ${canUp
        ? `<button class="upgrade-btn" onclick="upgradeSkill('${sk.name}', ${cost})">
            +1 (${cost}DP) → ${SKILL_RANKS[cur+1]}
           </button>`
        : '<span class="upgrade-maxed">МАКС</span>'}
    </div>`;
  }).join('');
}

function upgradeSkill(name, cost) {
  if (!upgradeChar) return;
  if ((upgradeChar.dp||0) < cost) { alert('Не хватает DP!'); return; }
  const cur = (upgradeChar.skillRanks||{})[name] || 0;
  if (cur >= 3) return;
  upgradeChar.skillRanks[name] = cur + 1;
  upgradeChar.dp -= cost;
  upgradeChar.upgrades.push(`Навык «${name}»: ${SKILL_RANKS[cur]} → ${SKILL_RANKS[cur+1]} (−${cost}DP)`);
  document.getElementById('upgrade-dp-val').textContent = upgradeChar.dp;
  renderUpgradeSkills();
}

function renderUpgradeStats() {
  const list = document.getElementById('upgrade-stats-list');
  list.innerHTML = ABILITIES.map(ab => {
    const cur = upgradeChar.abilities[ab];
    const cost = UPGRADE_COST_STAT[cur];
    const canUp = cur < 5 && cost !== undefined;
    return `<div class="upgrade-row">
      <span>${AB_FULL[ab]} <small>(${ab})</small></span>
      <span class="pts upgrade-stat-val">${cur}</span>
      ${canUp
        ? `<button class="upgrade-btn" onclick="upgradeStat('${ab}', ${cost})">+1 (${cost}DP)</button>`
        : '<span class="upgrade-maxed">МАКС</span>'}
    </div>`;
  }).join('');
}

function upgradeStat(ab, cost) {
  if (!upgradeChar) return;
  if ((upgradeChar.dp||0) < cost) { alert('Не хватает DP!'); return; }
  const cur = upgradeChar.abilities[ab];
  if (cur >= 5) return;
  upgradeChar.abilities[ab] = cur + 1;
  upgradeChar.dp -= cost;
  upgradeChar.upgrades.push(`Характеристика ${ab}: ${cur} → ${cur+1} (−${cost}DP)`);
  document.getElementById('upgrade-dp-val').textContent = upgradeChar.dp;
  renderUpgradeStats();
}

function renderUpgradeDevskills() {
  const list = document.getElementById('upgrade-devskills-list');
  const owned = new Set((upgradeChar.devskills||[]).map(d=>d.name));
  const available = ALL_DEVSKILLS.filter(d => !owned.has(d.name));
  if (!available.length) {
    list.innerHTML = '<div class="empty-state">Все скиллы уже изучены</div>';
    return;
  }
  list.innerHTML = available.map(d =>
    `<div class="devskill-card upgrade-buy" onclick="buyDevSkill('${d.name}', ${d.dpCost})">
      <div class="devskill-header">
        <span class="devskill-name">${d.name}</span>
        <span class="devskill-class">${d.class}</span>
        <span class="upgrade-cost-badge">${d.dpCost} DP</span>
      </div>
      <div class="devskill-desc">${d.desc}</div>
    </div>`
  ).join('');
}

function buyDevSkill(name, cost) {
  if (!upgradeChar) return;
  if ((upgradeChar.dp||0) < cost) { alert('Не хватает DP!'); return; }
  const ds = ALL_DEVSKILLS.find(d=>d.name===name);
  if (!ds) return;
  if (!upgradeChar.devskills) upgradeChar.devskills = [];
  upgradeChar.devskills.push(ds);
  upgradeChar.dp -= cost;
  upgradeChar.upgrades.push(`Скил «${name}» куплен (−${cost}DP)`);
  document.getElementById('upgrade-dp-val').textContent = upgradeChar.dp;
  renderUpgradeDevskills();
}

function applyUpgrades() {
  if (!upgradeChar || currentCharIndex < 0) return;
  savedChars[currentCharIndex] = upgradeChar;
  saveToStorage();
  closeUpgradeModal();
  renderCharSheet(savedChars[currentCharIndex]);
}

// ======= EXPORT / IMPORT =======
function exportChars() {
  const blob = new Blob([JSON.stringify(savedChars, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cp_characters.json';
  a.click();
}

function importChars(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      savedChars = data;
      saveToStorage();
      loadSaved();
      alert('Импорт успешен: ' + data.length + ' персонаж(ей).');
    } catch(err) { alert('Ошибка импорта: ' + err.message); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ======= INIT =======
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  renderAbilities();
  renderSkills();
  renderDevskills();

  const el = document.getElementById('step-saved');
  if (el) el.addEventListener('show', loadSaved);

  document.getElementById('skills-sub-back')?.addEventListener('click', () => showStep(7));
  document.getElementById('devskills-sub-back')?.addEventListener('click', () => showStep(7));
  document.getElementById('level-back')?.addEventListener('click', () => showStep(7));

  if (savedChars.length) { loadSaved(); showStep(6); }
});
