// === Telegram Web App Init ===
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// === Constants ===
const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const ABILITY_NAMES = { STR: 'Сила', DEX: 'Ловкость', CON: 'Телосложение', INT: 'Интеллект', WIS: 'Мудрость', CHA: 'Харизма' };

// D&D 5e: minimum ability requirements per class (primary stats)
const CLASS_REQUIREMENTS = {
  barbarian: { STR: 13 },
  bard:      { CHA: 13 },
  cleric:    { WIS: 13 },
  druid:     { WIS: 13 },
  fighter:   { STR: 13 },
  monk:      { DEX: 13, WIS: 13 },
  paladin:   { STR: 13, CHA: 13 },
  ranger:    { DEX: 13, WIS: 13 },
  rogue:     { DEX: 13 },
  sorcerer:  { CHA: 13 },
  warlock:   { CHA: 13 },
  wizard:    { INT: 13 },
};

// Racial stat bonuses (+value to ability)
const RACIAL_BONUSES = {
  human:       { STR:1, DEX:1, CON:1, INT:1, WIS:1, CHA:1 },
  elf:         { DEX:2, INT:1 },
  dwarf:       { CON:2, WIS:1 },
  halfling:    { DEX:2, CHA:1 },
  dragonborn:  { STR:2, CHA:1 },
  gnome:       { INT:2, DEX:1 },
  'half-elf':  { CHA:2, DEX:1, WIS:1 },
  tiefling:    { INT:1, CHA:2 },
};

const VALID_RACES = Object.keys(RACIAL_BONUSES);
const VALID_CLASSES = Object.keys(CLASS_REQUIREMENTS);
const VALID_BACKGROUNDS = ['acolyte','criminal','folk-hero','noble','sage','soldier'];

let currentStep = 1;
let rollHistory = [];

// === Step Navigation ===
function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(stepId(n));
  if (el) el.classList.add('active');
  currentStep = n;
}

function stepId(n) {
  return ['step-basic','step-abilities','step-dice','step-summary','step-saved'][n-1];
}

function nextStep(n) {
  if (!validateStep(n - 1)) return;
  if (n === 4) buildSummary();
  if (n === 5) loadSaved();
  showStep(n);
}

function prevStep(n) { showStep(n); }

// === Step Validation ===
function validateStep(step) {
  if (step === 1) {
    const name = document.getElementById('char-name').value.trim();
    const race = document.getElementById('char-race').value;
    const cls  = document.getElementById('char-class').value;
    const bg   = document.getElementById('char-background').value;
    if (!name) return err('Введите имя персонажа');
    if (!race) return err('Выберите расу');
    if (!cls)  return err('Выберите класс');
    if (!bg)   return err('Выберите предысторию');
  }
  if (step === 2) {
    const scores = getAbilityScores();
    for (const ab of ABILITIES) {
      const v = scores[ab];
      if (isNaN(v) || v < 3 || v > 18) return err(`Характеристика ${ABILITY_NAMES[ab]} должна быть от 3 до 18`);
    }
  }
  return true;
}

function err(msg) {
  if (tg) tg.showAlert(msg);
  else alert(msg);
  return false;
}

// === Ability Scores UI ===
function initAbilityScores() {
  const container = document.getElementById('ability-scores');
  container.innerHTML = ABILITIES.map(ab => `
    <div class="ability-block">
      <div class="ability-name">${ABILITY_NAMES[ab]}</div>
      <input class="ability-input" id="ab-${ab}" type="number" min="3" max="18" value="10"
        oninput="updateMod('${ab}')" />
      <div class="ability-mod" id="mod-${ab}">+0</div>
    </div>
  `).join('');
}

function updateMod(ab) {
  const val = parseInt(document.getElementById(`ab-${ab}`).value) || 10;
  const mod = Math.floor((val - 10) / 2);
  const el = document.getElementById(`mod-${ab}`);
  el.textContent = mod >= 0 ? `+${mod}` : `${mod}`;
  el.style.color = mod > 0 ? '#2ecc71' : mod < 0 ? '#e74c3c' : '#aaa';
}

function getAbilityScores() {
  const scores = {};
  ABILITIES.forEach(ab => { scores[ab] = parseInt(document.getElementById(`ab-${ab}`)?.value) || 0; });
  return scores;
}

function rollAllStats() {
  ABILITIES.forEach(ab => {
    const rolls = Array.from({length:4}, () => Math.ceil(Math.random()*6));
    rolls.sort((a,b)=>a-b);
    const total = rolls[1]+rolls[2]+rolls[3];
    document.getElementById(`ab-${ab}`).value = total;
    updateMod(ab);
  });
}

// === Dice Roller ===
function rollDice(sides) {
  const count = parseInt(document.getElementById('dice-count').value) || 1;
  const results = Array.from({length: count}, () => Math.ceil(Math.random() * sides));
  const total = results.reduce((a,b)=>a+b,0);

  const resultEl = document.getElementById('roll-result');
  resultEl.classList.remove('hidden');
  resultEl.textContent = count > 1
    ? `${count}d${sides}: [${results.join(', ')}] = ${total}`
    : `d${sides}: ${total}`;

  // Add to history
  const entry = document.createElement('p');
  entry.textContent = `${count}d${sides} → ${total}` + (count>1 ? ` (${results.join('+')})` : '');
  const hist = document.getElementById('roll-history');
  hist.prepend(entry);
  if (hist.children.length > 20) hist.lastChild.remove();

  // Haptic feedback via Telegram
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

// === Summary & Build Validation ===
function buildSummary() {
  const name = document.getElementById('char-name').value.trim();
  const race = document.getElementById('char-race').value;
  const cls  = document.getElementById('char-class').value;
  const bg   = document.getElementById('char-background').value;
  const scores = getAbilityScores();
  const bonuses = RACIAL_BONUSES[race] || {};

  // Apply racial bonuses for display
  const finalScores = {};
  ABILITIES.forEach(ab => {
    finalScores[ab] = Math.min(20, scores[ab] + (bonuses[ab] || 0));
  });

  const raceLabel = document.querySelector(`#char-race option[value="${race}"]`)?.textContent || race;
  const clsLabel  = document.querySelector(`#char-class option[value="${cls}"]`)?.textContent || cls;
  const bgLabel   = document.querySelector(`#char-background option[value="${bg}"]`)?.textContent || bg;

  document.getElementById('summary-content').innerHTML = `
    <div class="summary-row"><span class="summary-label">Имя</span><span class="summary-value">${name}</span></div>
    <div class="summary-row"><span class="summary-label">Раса</span><span class="summary-value">${raceLabel}</span></div>
    <div class="summary-row"><span class="summary-label">Класс</span><span class="summary-value">${clsLabel}</span></div>
    <div class="summary-row"><span class="summary-label">Предыстория</span><span class="summary-value">${bgLabel}</span></div>
    ${ABILITIES.map(ab => {
      const mod = Math.floor((finalScores[ab]-10)/2);
      return `<div class="summary-row">
        <span class="summary-label">${ABILITY_NAMES[ab]}</span>
        <span class="summary-value">${finalScores[ab]} (${mod>=0?'+':''}${mod})</span>
      </div>`;
    }).join('')}
  `;

  validateBuild(cls, finalScores);
}

function validateBuild(cls, scores) {
  const errors = [];
  const reqs = CLASS_REQUIREMENTS[cls] || {};

  for (const [ab, min] of Object.entries(reqs)) {
    if (scores[ab] < min) {
      errors.push(`❌ ${ABILITY_NAMES[ab]} должна быть ≥ ${min} для класса (сейчас: ${scores[ab]})`);
    }
  }

  // General rules
  const total = ABILITIES.reduce((s,ab) => s + scores[ab], 0);
  if (total > 120) errors.push('❌ Сумма всех характеристик слишком высокая (возможный читерство)');
  if (total < 50)  errors.push('⚠️ Очень низкие характеристики — убедитесь, что всё правильно');

  const errEl = document.getElementById('validation-errors');
  const okEl  = document.getElementById('validation-ok');

  if (errors.length > 0) {
    errEl.classList.remove('hidden');
    okEl.classList.add('hidden');
    errEl.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
    document.getElementById('btn-save').disabled = true;
  } else {
    errEl.classList.add('hidden');
    okEl.classList.remove('hidden');
    document.getElementById('btn-save').disabled = false;
  }
}

// === Save Character ===
function saveCharacter() {
  const name = document.getElementById('char-name').value.trim();
  const race = document.getElementById('char-race').value;
  const cls  = document.getElementById('char-class').value;
  const bg   = document.getElementById('char-background').value;
  const scores = getAbilityScores();
  const bonuses = RACIAL_BONUSES[race] || {};
  const finalScores = {};
  ABILITIES.forEach(ab => { finalScores[ab] = Math.min(20, scores[ab] + (bonuses[ab]||0)); });

  const character = { name, race, cls, bg, scores: finalScores, createdAt: Date.now() };
  const saved = JSON.parse(localStorage.getItem('dnd_characters') || '[]');
  saved.push(character);
  localStorage.setItem('dnd_characters', JSON.stringify(saved));

  if (tg) {
    tg.sendData(JSON.stringify(character));
  } else {
    alert(`Персонаж «${name}» сохранён!`);
  }

  nextStep(5);
}

function loadSaved() {
  const saved = JSON.parse(localStorage.getItem('dnd_characters') || '[]');
  const list = document.getElementById('saved-list');
  if (saved.length === 0) {
    list.innerHTML = '<p style="color:#888">Нет сохранённых персонажей</p>';
    return;
  }
  const clsNames = {barbarian:'Варвар',bard:'Бард',cleric:'Жрец',druid:'Друид',fighter:'Воин',
    monk:'Монах',paladin:'Паладин',ranger:'Следопыт',rogue:'Плут',sorcerer:'Чародей',
    warlock:'Колдун',wizard:'Волшебник'};
  const raceNames = {human:'Человек',elf:'Эльф',dwarf:'Дварф',halfling:'Полурослик',
    dragonborn:'Драконорождённый',gnome:'Гном','half-elf':'Полуэльф',tiefling:'Тифлинг'};
  list.innerHTML = saved.map((c,i) => `
    <div class="char-card">
      <div class="char-info">
        <h3>${c.name}</h3>
        <p>${raceNames[c.race]||c.race} · ${clsNames[c.cls]||c.cls}</p>
        <p>STR:${c.scores.STR} DEX:${c.scores.DEX} CON:${c.scores.CON} INT:${c.scores.INT} WIS:${c.scores.WIS} CHA:${c.scores.CHA}</p>
      </div>
      <button class="btn-delete" onclick="deleteChar(${i})">🗑</button>
    </div>
  `).join('');
}

function deleteChar(i) {
  const saved = JSON.parse(localStorage.getItem('dnd_characters') || '[]');
  saved.splice(i, 1);
  localStorage.setItem('dnd_characters', JSON.stringify(saved));
  loadSaved();
}

function newCharacter() {
  document.getElementById('char-name').value = '';
  document.getElementById('char-race').value = '';
  document.getElementById('char-class').value = '';
  document.getElementById('char-background').value = '';
  initAbilityScores();
  showStep(1);
}

// === Init ===
initAbilityScores();
ABILITIES.forEach(ab => updateMod(ab));
showStep(1);
