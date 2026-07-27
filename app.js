// ======= PWA: Service Worker registration =======
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

// ======= Telegram Web App Init (optional) =======
const tg = window.Telegram?.WebApp ?? null;
if (tg) { tg.ready(); tg.expand(); }

// ======= DATA =======
const ABILITIES = ['STR','DEX','INT','WIL','PER','TEC'];
const AB_FULL = {
  STR: 'Сила', DEX: 'Ловкость', INT: 'Интеллект',
  WIL: 'Воля', PER: 'Восприятие', TEC: 'Техника'
};
const AB_DESC = {
  STR: 'мощь, захват, ближний бой',
  DEX: 'стрельба, реакция, скрытность',
  INT: 'анализ, код, память, логика',
  WIL: 'самоконтроль, давление, стресс',
  PER: 'наблюдение, поиск, инициатива',
  TEC: 'ремонт, дроны, импланты'
};

const AB_MOD = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };

const SKILLS = [
  { name: 'Атлетика',          base: 'STR' },
  { name: 'Ближний бой',       base: 'STR / DEX' },
  { name: 'Стрельба',          base: 'DEX' },
  { name: 'Скрытность',        base: 'DEX' },
  { name: 'Акробатика',        base: 'DEX' },
  { name: 'Взлом',             base: 'INT / TEC' },
  { name: 'Анализ',            base: 'INT' },
  { name: 'Электроника',       base: 'TEC' },
  { name: 'Ремонт',            base: 'TEC' },
  { name: 'Медицина',          base: 'INT / TEC' },
  { name: 'Вождение',          base: 'DEX' },
  { name: 'Пилотирование',     base: 'DEX / TEC' },
  { name: 'Дроны',             base: 'TEC' },
  { name: 'Внимательность',    base: 'PER' },
  { name: 'Поиск',             base: 'PER' },
  { name: 'Уличная смекалка',  base: 'PER / INT' },
  { name: 'Убеждение',         base: 'WIL' },
  { name: 'Запугивание',       base: 'WIL / STR' },
  { name: 'Ложь',              base: 'INT / WIL' },
  { name: 'Исполнение',        base: 'WIL / PER' },
  { name: 'Переговоры',        base: 'WIL' },
  { name: 'Репутация',         base: 'WIL / PER' },
  { name: 'Выживание в городе',base: 'PER' },
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

// ======= STATE =======
let abilityValues = { STR:3, DEX:3, INT:3, WIL:3, PER:3, TEC:3 };
let TOTAL_POINTS = 6;
let currentPopupAb = null;

// ======= STEP NAVIGATION =======
function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const ids = ['step-basic','step-abilities','step-skills','step-dice','step-summary','step-saved'];
  const el = document.getElementById(ids[n-1]);
  if (el) el.classList.add('active');
  window.scrollTo(0,0);
}

function nextStep(n) {
  if (!validateStep(n-1)) return;
  if (n === 5) buildSummary();
  if (n === 6) loadSaved();
  showStep(n);
}
function prevStep(n) { showStep(n); }

function validateStep(s) {
  if (s === 1) {
    const name = v('char-name'), origin = v('char-origin'), k1 = v('char-kit1'), k2 = v('char-kit2');
    if (!name)   return err('Введите имя персонажа');
    if (!origin) return err('Выберите происхождение');
    if (!k1)     return err('Выберите первый пакет подготовки');
    if (!k2)     return err('Выберите второй пакет подготовки');
    if (k1 === k2) return err('Пакеты подготовки должны быть разными');
  }
  if (s === 2) {
    const errs = validateAbilities();
    if (errs.length) return err(errs[0]);
  }
  if (s === 3) {
    const errs = validateSkills();
    if (errs.length) return err(errs[0]);
  }
  return true;
}

function v(id) { return document.getElementById(id)?.value?.trim() || ''; }
function err(msg) {
  if (tg?.showAlert) tg.showAlert(msg);
  else alert(msg);
  return false;
}

// ======= ABILITY SCORES =======
function initAbilityScores() {
  const c = document.getElementById('ability-scores');
  c.innerHTML = ABILITIES.map(ab => `
    <div class="ability-block" id="ab-block-${ab}" onclick="openPopup('${ab}')">
      <div class="ability-tag">${ab}</div>
      <div class="ability-name-full">${AB_FULL[ab]}</div>
      <div class="ability-controls">
        <button class="ab-btn" onclick="event.stopPropagation(); changeAb('${ab}',-1)">−</button>
        <span class="ab-val" id="ab-val-${ab}">${abilityValues[ab]}</span>
        <button class="ab-btn" onclick="event.stopPropagation(); changeAb('${ab}',+1)">+</button>
      </div>
      <div class="ab-mod" id="ab-mod-${ab}"></div>
      <div class="dice-hint">нажми → бросок проверки</div>
    </div>
  `).join('');
  ABILITIES.forEach(ab => refreshAb(ab));
  refreshPoints();
}

function changeAb(ab, delta) {
  const cur = abilityValues[ab];
  const next = cur + delta;
  if (next < 1 || next > 5) return;
  const cost = delta > 0 ? pointCost(cur, next) : -pointCost(next, cur);
  const remaining = getRemainingPoints();
  if (delta > 0 && cost > remaining) { err(`Недостаточно очков! Нужно ${cost}, осталось ${remaining}`); return; }
  abilityValues[ab] = next;
  refreshAb(ab);
  refreshPoints();
}

function pointCost(from, to) {
  let cost = 0;
  for (let i = from; i < to; i++) cost += (i >= 4 ? 2 : 1);
  return cost;
}

function totalSpent() {
  let spent = 0;
  ABILITIES.forEach(ab => { spent += pointCost(3, abilityValues[ab]); });
  return spent;
}

function getRemainingPoints() { return TOTAL_POINTS - totalSpent(); }

function refreshAb(ab) {
  const val = abilityValues[ab];
  const mod = AB_MOD[val] ?? 0;
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
  if (fives.length > 2) errs.push(`Нельзя иметь более двух характеристик на 5 (сейчас: ${fives.join(', ')})`);
  if (getRemainingPoints() < 0) errs.push('Потрачено слишком много очков');
  return errs;
}

// ======= POPUP (Ability Check) =======
function openPopup(ab) {
  currentPopupAb = ab;
  const val = abilityValues[ab];
  const mod = AB_MOD[val] ?? 0;
  document.getElementById('popup-title').textContent = `Проверка ${AB_FULL[ab]} (${ab})`;
  document.getElementById('popup-formula').textContent =
    `1d20 + ${mod >= 0 ? '+' : ''}${mod} (мод) + навык + ситуатив`;
  document.getElementById('popup-result').classList.add('hidden');
  document.querySelector('input[name=adv][value=normal]').checked = true;
  document.getElementById('ability-roll-popup').classList.remove('hidden');
  document.querySelectorAll('.ability-block').forEach(b => b.classList.remove('active-popup'));
  document.getElementById(`ab-block-${ab}`)?.classList.add('active-popup');
}

function closePopup() {
  document.getElementById('ability-roll-popup').classList.add('hidden');
  document.querySelectorAll('.ability-block').forEach(b => b.classList.remove('active-popup'));
  currentPopupAb = null;
}

function executeRoll() {
  const ab = currentPopupAb;
  if (!ab) return;
  const val = abilityValues[ab];
  const mod = AB_MOD[val] ?? 0;
  const skillBonus = parseInt(document.getElementById('popup-skill').value) || 0;
  const dc = parseInt(document.getElementById('popup-dc').value) || 13;
  const adv = document.querySelector('input[name=adv]:checked')?.value || 'normal';

  let d1 = roll20(), d2 = roll20();
  let chosen, rolls;
  if (adv === 'advantage')    { chosen = Math.max(d1,d2); rolls = `[${d1}, ${d2}] → ${chosen}`; }
  else if (adv === 'disadvantage') { chosen = Math.min(d1,d2); rolls = `[${d1}, ${d2}] → ${chosen}`; }
  else { chosen = d1; rolls = `${d1}`; }

  const total = chosen + mod + skillBonus;
  const isCritSuccess = chosen === 20;
  const isCritFail    = chosen === 1;
  const diff = total - dc;

  let verdict, cls;
  if (isCritFail)       { verdict = '💀 Критический провал! Осложнение.'; cls = 'crit-fail'; }
  else if (isCritSuccess) { verdict = '⚡ Критический успех!'; cls = 'crit-success'; }
  else if (diff >= 0)   { verdict = `✅ Успех! (+${diff} к DC ${dc})`; cls = 'success'; }
  else if (diff >= -2)  { verdict = `⚠️ Успех с ценой? (не хватило ${Math.abs(diff)})`; cls = 'close'; }
  else                  { verdict = `❌ Провал (не хватило ${Math.abs(diff)})`; cls = 'fail'; }

  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  const sklStr = skillBonus > 0 ? ` + ${skillBonus}` : '';

  const resEl = document.getElementById('popup-result');
  resEl.classList.remove('hidden');
  resEl.innerHTML = `
    <div class="res-dice">d20: ${rolls}</div>
    <div class="res-total">${chosen} (d20) ${modStr} (${AB_FULL[ab]})${sklStr} = <strong>${total}</strong> vs DC ${dc}</div>
    <div class="res-verdict ${cls}">${verdict}</div>
  `;

  if (tg?.HapticFeedback) {
    if (isCritSuccess) tg.HapticFeedback.notificationOccurred('success');
    else if (isCritFail) tg.HapticFeedback.notificationOccurred('error');
    else tg.HapticFeedback.impactOccurred('medium');
  }

  addHistory(`${ab}: d20=${chosen} ${modStr}${sklStr} = ${total} (DC ${dc}) → ${isCritSuccess ? 'КРИТ!' : isCritFail ? 'ФЕЙЛ!' : diff >= 0 ? 'Успех' : 'Провал'}`);
}

function roll20() { return Math.ceil(Math.random() * 20); }

// ======= SKILLS =======
function initSkills() {
  const c = document.getElementById('skills-container');
  c.innerHTML = SKILLS.map((sk, i) => `
    <div class="skill-row">
      <div class="skill-label">
        <div class="skill-name">${sk.name}</div>
        <div class="skill-base">${sk.base}</div>
      </div>
      <select class="skill-select" id="sk-${i}" onchange="onSkillChange()">
        <option value="">—</option>
        <option value="0">Необучен</option>
        <option value="2">Обучен</option>
        <option value="4">Эксперт</option>
        <option value="6">Мастер</option>
      </select>
    </div>
  `).join('');
}

function getSkillLevels() {
  return SKILLS.map((sk, i) => {
    const val = document.getElementById(`sk-${i}`)?.value;
    return { name: sk.name, base: sk.base, bonus: val === '' ? null : parseInt(val) };
  });
}

function onSkillChange() {}

function validateSkills() {
  const levels = getSkillLevels();
  const trained = levels.filter(s => s.bonus === 2).length;
  const expert  = levels.filter(s => s.bonus === 4).length;
  const master  = levels.filter(s => s.bonus === 6).length;
  const errs = [];
  if (trained > 5) errs.push(`Обученных навыков: ${trained} (максимум 5)`);
  if (expert > 1)  errs.push(`Навыков Эксперт: ${expert} (максимум 1)`);
  if (master > 0)  errs.push('Нельзя начинать с уровня Мастер');
  return errs;
}

// ======= DICE ROLLER =======
let rollHistoryLog = [];

function rollDice(sides) {
  const count = parseInt(document.getElementById('dice-count').value) || 1;
  const results = Array.from({length: count}, () => Math.ceil(Math.random() * sides));
  const total = results.reduce((a,b)=>a+b,0);
  const label = count > 1
    ? `${count}d${sides}: [${results.join(', ')}] = ${total}`
    : `d${sides}: ${total}`;
  const resultEl = document.getElementById('roll-result');
  resultEl.classList.remove('hidden');
  resultEl.textContent = label;
  addHistory(label);
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function addHistory(text) {
  const hist = document.getElementById('roll-history');
  if (!hist) return;
  const p = document.createElement('p');
  p.textContent = text;
  hist.prepend(p);
  if (hist.children.length > 25) hist.lastChild.remove();
}

// ======= SUMMARY =======
function buildSummary() {
  const name    = v('char-name');
  const concept = v('char-concept');
  const origin  = v('char-origin');
  const k1      = v('char-kit1');
  const k2      = v('char-kit2');

  const STR = abilityValues.STR, WIL = abilityValues.WIL,
        INT = abilityValues.INT, DEX = abilityValues.DEX;
  const modDEX = AB_MOD[DEX];
  const HP       = 10 + STR + WIL;
  const STRESS   = 10 + WIL + INT;
  const DEF      = 10 + modDEX;
  const HUMANITY = 10 + WIL;
  const IMPL_LIM = WIL + 1;

  const mods = {};
  ABILITIES.forEach(ab => { mods[ab] = AB_MOD[abilityValues[ab]] ?? 0; });

  document.getElementById('summary-content').innerHTML = `
    <div class="s-section">Персонаж</div>
    <div class="s-row"><span class="s-label">Имя</span><span class="s-value">${name}</span></div>
    <div class="s-row"><span class="s-label">Концепт</span><span class="s-value">${concept || '—'}</span></div>
    <div class="s-row"><span class="s-label">Происхождение</span><span class="s-value">${ORIGIN_LABELS[origin] || origin}</span></div>
    <div class="s-row"><span class="s-label">Пакеты</span><span class="s-value">${KIT_LABELS[k1] || k1} + ${KIT_LABELS[k2] || k2}</span></div>
    <div class="s-section">Характеристики</div>
    ${ABILITIES.map(ab => {
      const m = mods[ab];
      return `<div class="s-row"><span class="s-label">${AB_FULL[ab]} (${ab})</span><span class="s-value">${abilityValues[ab]} (${m>=0?'+':''}${m})</span></div>`;
    }).join('')}
    <div class="s-section">Навыки</div>
    ${getSkillLevels().filter(s => s.bonus !== null).map(s => {
      const lvl = ['Необучен','Обучен','Эксперт','Мастер'][s.bonus/2] || 'Необучен';
      return `<div class="s-row"><span class="s-label">${s.name}</span><span class="s-value">${lvl} (+${s.bonus})</span></div>`;
    }).join('') || '<div class="s-row"><span class="s-label">—</span></div>'}
  `;

  document.getElementById('derived-stats').innerHTML = `
    <div class="derived-item"><div class="derived-label">HP</div><div class="derived-val">${HP}</div></div>
    <div class="derived-item"><div class="derived-label">STRESS</div><div class="derived-val">${STRESS}</div></div>
    <div class="derived-item"><div class="derived-label">DEF</div><div class="derived-val">${DEF}</div></div>
    <div class="derived-item"><div class="derived-label">HUMANITY</div><div class="derived-val">${HUMANITY}</div></div>
    <div class="derived-item"><div class="derived-label">IMPLANT LIM</div><div class="derived-val">${IMPL_LIM}</div></div>
    <div class="derived-item"><div class="derived-label">RAM</div><div class="derived-val">—</div></div>
  `;

  validateBuild();
}

function validateBuild() {
  const errors = [];
  const fives = ABILITIES.filter(ab => abilityValues[ab] === 5);
  if (fives.length > 2) errors.push(`❌ Нельзя иметь более двух характеристик на 5 (${fives.join(', ')})`);
  if (getRemainingPoints() < 0) errors.push('❌ Потрачено больше 6 очков характеристик');
  const levels = getSkillLevels();
  if (levels.filter(s => s.bonus === 2).length > 5) errors.push('❌ Обученных навыков: больше 5');
  if (levels.filter(s => s.bonus === 4).length > 1) errors.push('❌ Навыков Эксперт: больше 1');
  if (levels.filter(s => s.bonus === 6).length > 0) errors.push('❌ Уровень Мастер недоступен при создании');

  const errEl = document.getElementById('validation-errors');
  const okEl  = document.getElementById('validation-ok');
  if (errors.length > 0) {
    errEl.classList.remove('hidden'); okEl.classList.add('hidden');
    errEl.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
    document.getElementById('btn-save').disabled = true;
  } else {
    errEl.classList.add('hidden'); okEl.classList.remove('hidden');
    document.getElementById('btn-save').disabled = false;
  }
}

// ======= SAVE / LOAD / EXPORT / IMPORT =======
function saveCharacter() {
  const char = {
    name: v('char-name'), concept: v('char-concept'),
    origin: v('char-origin'), k1: v('char-kit1'), k2: v('char-kit2'),
    abilities: { ...abilityValues },
    skills: getSkillLevels().filter(s => s.bonus !== null),
    createdAt: Date.now()
  };
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  saved.push(char);
  localStorage.setItem('cp_characters', JSON.stringify(saved));

  // Send to Telegram bot only if running inside Telegram
  if (tg?.sendData) {
    tg.sendData(JSON.stringify(char));
  }

  nextStep(6);
}

function loadSaved() {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  const list = document.getElementById('saved-list');
  if (!saved.length) { list.innerHTML = '<p style="color:#446688">Нет сохранённых персонажей</p>'; return; }
  list.innerHTML = saved.map((c,i) => `
    <div class="char-card">
      <div>
        <h3>${c.name}</h3>
        <p>${ORIGIN_LABELS[c.origin]||c.origin} · ${KIT_LABELS[c.k1]||c.k1} + ${KIT_LABELS[c.k2]||c.k2}</p>
        <p>STR:${c.abilities?.STR} DEX:${c.abilities?.DEX} INT:${c.abilities?.INT} WIL:${c.abilities?.WIL} PER:${c.abilities?.PER} TEC:${c.abilities?.TEC}</p>
        ${c.concept ? `<p><em>${c.concept}</em></p>` : ''}
        <small>${new Date(c.createdAt).toLocaleDateString('ru-RU')}</small>
      </div>
      <button class="btn-delete" onclick="deleteChar(${i})">🗑</button>
    </div>
  `).join('');
}

function deleteChar(i) {
  const saved = JSON.parse(localStorage.getItem('cp_characters') || '[]');
  saved.splice(i,1);
  localStorage.setItem('cp_characters', JSON.stringify(saved));
  loadSaved();
}

function exportChars() {
  const saved = localStorage.getItem('cp_characters') || '[]';
  const blob = new Blob([saved], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cp_characters_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function newCharacter() {
  abilityValues = { STR:3, DEX:3, INT:3, WIL:3, PER:3, TEC:3 };
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
