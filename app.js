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

// Полный список навыков из рулбука v0.6
const SKILLS = [
  // --- Физические ---
  { name: 'Атлетика',           base: 'STR' },
  { name: 'Акробатика',         base: 'DEX' },
  { name: 'Ближний бой',        base: 'STR / DEX' },
  { name: 'Стрельба',           base: 'DEX' },
  { name: 'Скрытность',         base: 'DEX' },
  { name: 'Выживание',          base: 'STR / WIL' },
  { name: 'Запугивание',        base: 'STR / WIL' },
  // --- Технические ---
  { name: 'Взлом',              base: 'INT / TEC' },
  { name: 'Электроника',        base: 'TEC' },
  { name: 'Ремонт',             base: 'TEC' },
  { name: 'Дроны',              base: 'TEC' },
  { name: 'Пилотирование',      base: 'DEX / TEC' },
  { name: 'Вождение',           base: 'DEX' },
  { name: 'Оружейное дело',     base: 'TEC' },
  { name: 'Взрывчатка',         base: 'TEC / INT' },
  // --- Интеллектуальные ---
  { name: 'Анализ',             base: 'INT' },
  { name: 'Медицина',           base: 'INT / TEC' },
  { name: 'Уличная смекалка',   base: 'INT / PER' },
  { name: 'Криминалистика',     base: 'INT' },
  { name: 'История и культура', base: 'INT' },
  { name: 'Тактика',            base: 'INT / WIL' },
  // --- Социальные ---
  { name: 'Внимательность',     base: 'PER' },
  { name: 'Переговоры',         base: 'PER / WIL' },
  { name: 'Убеждение',          base: 'WIL' },
  { name: 'Исполнение',         base: 'PER / WIL' },
  { name: 'Обман',              base: 'WIL / PER' },
  { name: 'Торговля',           base: 'PER' },
  { name: 'Связи',              base: 'PER / WIL' },
  { name: 'Допрос',             base: 'WIL / PER' },
];

const ALL_DEVSKILLS = [
  { name: 'Прицельная очередь', class: 'Штурм', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '1 раз за раунд +2 к урону автоогнём; Heat +1.' },
  { name: 'Рывок под огнём', class: 'Штурм', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Игнор первой реактивной опасности при смене укрытия.' },
  { name: 'Жёсткая стойка', class: 'Штурм', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '+2 DEF против первой атаки каждого боя.' },
  { name: 'Штурмовой вход', class: 'Штурм', tier: 'Продвинутый', dpCost: 3, prereq: '1 базовый скил Штурма', desc: 'Если начинаешь ход в укрытии и идёшь ближе к врагу, получаешь +2 к первой атаке.' },
  { name: 'Комнатная мясорубка', class: 'Штурм', tier: 'Продвинутый', dpCost: 3, prereq: '1 базовый скил Штурма', desc: 'Дробовики и ПП получают +1 к ближнему урону.' },
  { name: 'Подавляющий ритм', class: 'Штурм', tier: 'Продвинутый', dpCost: 3, prereq: 'Прицельная очередь', desc: 'Подавление дополнительно накладывает Подавлен.' },
  { name: 'Личный протокол войны', class: 'Штурм', tier: 'Глубокий', dpCost: 4, prereq: '2 скила Штурма', desc: '1 раз за сцену получаешь дополнительное малое действие.' },
  { name: 'Невозможный угол', class: 'Штурм', tier: 'Глубокий', dpCost: 4, prereq: '2 скила Штурма', desc: 'Игнорируешь лёгкое укрытие и часть штрафов стрельбы.' },
  { name: 'Красная зона', class: 'Штурм', tier: 'Экзотичный', dpCost: 5, prereq: '3 скила Штурма, уровень 4+', desc: 'Пока HP ниже половины, +2 к атакам вблизи; после сцены 2 STRESS.' },

  { name: 'Тихий профиль', class: 'Скрытность', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '1 раз за сцену преимущество на Скрытность.' },
  { name: 'Слепое пятно', class: 'Скрытность', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '+2 против камер и дешёвых сенсоров.' },
  { name: 'Мягкий шаг', class: 'Скрытность', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Игнорируешь мелкие шумовые штрафы.' },
  { name: 'Вторая кожа', class: 'Скрытность', tier: 'Продвинутый', dpCost: 3, prereq: '1 базовый скил Скрытности', desc: 'Провал Скрытности можно превратить в успех с ценой.' },
  { name: 'Разрыв контакта', class: 'Скрытность', tier: 'Продвинутый', dpCost: 3, prereq: 'Тихий профиль', desc: 'После атаки смещаешься на 1 дистанцию.' },
  { name: 'Призрачный маршрут', class: 'Скрытность', tier: 'Продвинутый', dpCost: 3, prereq: '2 скила Скрытности', desc: 'После сцены можешь снизить Heat на 1, если скрывал следы.' },
  { name: 'Удар из пустоты', class: 'Скрытность', tier: 'Глубокий', dpCost: 4, prereq: 'Вторая кожа', desc: 'Первая атака из скрытности наносит +1d4 урона.' },
  { name: 'Чужое лицо', class: 'Скрытность', tier: 'Глубокий', dpCost: 4, prereq: '2 скила Скрытности', desc: 'Временно меняешь биометрию и поведение.' },
  { name: 'Нулевой силуэт', class: 'Скрытность', tier: 'Экзотичный', dpCost: 5, prereq: '3 скила Скрытности, уровень 4+', desc: '1 раз за миссию исчезаешь из обычного наблюдения на короткую сцену; Heat +1.' },

  { name: 'Базовый порт', class: 'Сеть', tier: 'Базовый', dpCost: 2, prereq: 'Навык Взлом Обучен+', desc: 'RAM 2 и доступ к хакам 1 RAM.' },
  { name: 'Быстрый пинг', class: 'Сеть', tier: 'Базовый', dpCost: 2, prereq: 'Базовый порт', desc: 'Ping не требует действия вне боя.' },
  { name: 'Тихий логин', class: 'Сеть', tier: 'Базовый', dpCost: 2, prereq: 'Базовый порт', desc: 'Первое сетевое действие сцены не повышает Heat.' },
  { name: 'Расширенная RAM', class: 'Сеть', tier: 'Продвинутый', dpCost: 3, prereq: 'Базовый порт', desc: '+1 RAM.' },
  { name: 'Боевой эксплойт', class: 'Сеть', tier: 'Продвинутый', dpCost: 3, prereq: 'Расширенная RAM', desc: 'Открывает хаки 2 RAM.' },
  { name: 'Мягкий доступ', class: 'Сеть', tier: 'Продвинутый', dpCost: 3, prereq: 'Боевой эксплойт', desc: 'При успешном хаке даёт дополнительный небросковый эффект.' },
  { name: 'Каскадный пакет', class: 'Сеть', tier: 'Глубокий', dpCost: 4, prereq: 'Боевой эксплойт', desc: 'За 1 дополнительную RAM переносишь простой эффект на вторую цель.' },
  { name: 'Чёрный маршрут', class: 'Сеть', tier: 'Глубокий', dpCost: 4, prereq: 'Боевой эксплойт, уровень 5+', desc: 'Открывает чёрные хаки 3 RAM.' },
  { name: 'Слепая зона', class: 'Сеть', tier: 'Глубокий', dpCost: 4, prereq: 'Тихий логин или Чёрный маршрут', desc: '1 раз за сцену скрываешь цифровое присутствие группы.' },
  { name: 'Ядро вторжения', class: 'Сеть', tier: 'Экзотичный', dpCost: 5, prereq: 'Чёрный маршрут, уровень 6+', desc: 'Открывает хаки 4 RAM.' },
  { name: 'Разогнанный стек', class: 'Сеть', tier: 'Экзотичный', dpCost: 5, prereq: 'Ядро вторжения', desc: 'Снижаешь стоимость 1 хака на 1 RAM, но получаешь 1d4 STRESS.' },
  { name: 'Чёрный мост', class: 'Сеть', tier: 'Культовый', dpCost: 6, prereq: '2 глубоких скила Сети, уровень 8+', desc: '+1 RAM и доступ к чёрным хакам вне обычных ограничений; критошибка требует WIL DC 16.' },

  { name: 'Полевой ремонт', class: 'Инженерия', tier: 'Базовый', dpCost: 2, prereq: 'Навык Ремонт или Электроника Обучен+', desc: 'Действием чинишь простое устройство.' },
  { name: 'Импровизированный модуль', class: 'Инженерия', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '1 раз за сцену собираешь малый гаджет.' },
  { name: 'Понимание схем', class: 'Инженерия', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '+2 к анализу техники.' },
  { name: 'Тех-апгрейд', class: 'Инженерия', tier: 'Продвинутый', dpCost: 3, prereq: 'Полевой ремонт', desc: 'Улучшенная техника дешевле по крафту.' },
  { name: 'Подрывник', class: 'Инженерия', tier: 'Продвинутый', dpCost: 3, prereq: '1 базовый скил Инженерии', desc: '+2 к зарядам, минам, тех-саботажу.' },
  { name: 'Модульная сборка', class: 'Инженерия', tier: 'Продвинутый', dpCost: 3, prereq: 'Импровизированный модуль', desc: 'Между сценами перестраиваешь оружие или модуль.' },
  { name: 'Каскадный отказ', class: 'Инженерия', tier: 'Глубокий', dpCost: 4, prereq: 'Подрывник', desc: 'Ломая один узел системы, вредишь связанному соседнему.' },
  { name: 'Умная мастерская', class: 'Инженерия', tier: 'Глубокий', dpCost: 4, prereq: 'Тех-апгрейд', desc: 'Во время отдыха собираешь редкий модуль.' },
  { name: 'Боевой конструктор', class: 'Инженерия', tier: 'Экзотичный', dpCost: 5, prereq: '2 глубоких скила Инженерии, уровень 5+', desc: '1 раз за миссию создаёшь одноразовый сильный тех-эффект.' },

  { name: 'Стабильная рука', class: 'Хирургия', tier: 'Базовый', dpCost: 2, prereq: 'Навык Медицина Обучен+', desc: '+2 к стабилизации и полевой медицине.' },
  { name: 'Мед-узел', class: 'Хирургия', tier: 'Базовый', dpCost: 2, prereq: 'Навык Медицина Обучен+', desc: '1 раз за сцену восстанавливаешь 1d6 HP союзнику.' },
  { name: 'Диагностика', class: 'Хирургия', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Быстро считываешь импланты и травмы.' },
  { name: 'Боевая медицина', class: 'Хирургия', tier: 'Продвинутый', dpCost: 3, prereq: 'Стабильная рука', desc: 'Лечишь без помех в бою.' },
  { name: 'Нейрохимия', class: 'Хирургия', tier: 'Продвинутый', dpCost: 3, prereq: '1 базовый скил Хирургии', desc: 'Доступ к стимам и антишоку.' },
  { name: 'Грязная хирургия', class: 'Хирургия', tier: 'Продвинутый', dpCost: 3, prereq: 'Диагностика', desc: 'Ставишь и снимаешь импланты в плохих условиях.' },
  { name: 'Перегон импланта', class: 'Хирургия', tier: 'Глубокий', dpCost: 4, prereq: 'Грязная хирургия', desc: 'Временно усиливаешь имплант цели или свой.' },
  { name: 'Редактор боли', class: 'Хирургия', tier: 'Глубокий', dpCost: 4, prereq: 'Нейрохимия', desc: 'Цель игнорирует Ранен до конца сцены, потом теряет 1d4 STRESS.' },
  { name: 'Второе сердце', class: 'Хирургия', tier: 'Экзотичный', dpCost: 5, prereq: '2 глубоких скила Хирургии, уровень 5+', desc: '1 раз за миссию поднимаешь цель с 0 HP до 1 HP без потери следующего хода.' },

  { name: 'Сделка дня', class: 'Влияние', tier: 'Базовый', dpCost: 2, prereq: 'Навык Переговоры или Убеждение Обучен+', desc: '1 раз за сцену снижаешь цену или риск после соцуспеха.' },
  { name: 'Чтение мотива', class: 'Влияние', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Задаёшь 1 вопрос о слабости NPC.' },
  { name: 'Свой человек', class: 'Влияние', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Объявляешь разумный контакт.' },
  { name: 'Толпа слушает', class: 'Влияние', tier: 'Продвинутый', dpCost: 3, prereq: '1 базовый скил Влияния', desc: 'Сдвигаешь настроение группы NPC на 1 ступень.' },
  { name: 'Тонкий нажим', class: 'Влияние', tier: 'Продвинутый', dpCost: 3, prereq: 'Сделка дня', desc: 'Можешь заменить рост Heat ростом долга.' },
  { name: 'Район говорит', class: 'Влияние', tier: 'Продвинутый', dpCost: 3, prereq: 'Свой человек', desc: 'В знакомой среде +2 к соцпроверкам.' },
  { name: 'Сеть обязательств', class: 'Влияние', tier: 'Глубокий', dpCost: 4, prereq: '2 скила Влияния', desc: 'Можешь требовать опасные услуги от контактов.' },
  { name: 'Перекройка слухов', class: 'Влияние', tier: 'Глубокий', dpCost: 4, prereq: 'Толпа слушает', desc: 'Запускаешь локальную легенду или компромат.' },
  { name: 'Живой символ', class: 'Влияние', tier: 'Экзотичный', dpCost: 5, prereq: '2 глубоких скила Влияния, уровень 5+', desc: '1 раз за миссию превращаешь нейтральную группу в временных союзников.' },

  { name: 'Быстрая команда', class: 'Командование', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Союзник получает +2 к следующему действию.' },
  { name: 'Распределение углов', class: 'Командование', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '+2 DEF союзнику при смене укрытия.' },
  { name: 'Холодный расчёт', class: 'Командование', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '1 раз за сцену группа получает +2 INIT.' },
  { name: 'Окно штурма', class: 'Командование', tier: 'Продвинутый', dpCost: 3, prereq: 'Быстрая команда', desc: 'Два союзника могут синхронно действовать.' },
  { name: 'Сбор силы', class: 'Командование', tier: 'Продвинутый', dpCost: 3, prereq: '1 базовый скил Командования', desc: 'Помощники, фанаты и наймиты полезнее.' },
  { name: 'Контроль темпа', class: 'Командование', tier: 'Продвинутый', dpCost: 3, prereq: 'Холодный расчёт', desc: 'Следование плану даёт бонусы.' },
  { name: 'Боевой сценарий', class: 'Командование', tier: 'Глубокий', dpCost: 4, prereq: '2 скила Командования', desc: 'Заранее объявленный план даёт бонус группе на первый раунд.' },
  { name: 'Резервный канал', class: 'Командование', tier: 'Глубокий', dpCost: 4, prereq: 'Окно штурма', desc: 'Снимаешь Подавлен с союзника раз в сцену.' },
  { name: 'Тактическая сетка', class: 'Командование', tier: 'Экзотичный', dpCost: 5, prereq: '2 глубоких скила Командования, уровень 5+', desc: 'Кратко усиливаешь всю сцену, но Heat +1 и STRESS -1d4.' },

  { name: 'Личный дрон', class: 'Дроны', tier: 'Базовый', dpCost: 2, prereq: 'Навык Дроны Обучен+ или пакет Сборщик дронов', desc: 'Получаешь стандартный развед- или сервис-дрон.' },
  { name: 'Удалённая команда', class: 'Дроны', tier: 'Базовый', dpCost: 2, prereq: 'Личный дрон', desc: 'Управление дроном требует меньше действий.' },
  { name: 'Полевой uplink', class: 'Дроны', tier: 'Базовый', dpCost: 2, prereq: 'Личный дрон', desc: 'Дрон даёт +2 к связанному действию.' },
  { name: 'Шок-дрон', class: 'Дроны', tier: 'Продвинутый', dpCost: 3, prereq: 'Личный дрон', desc: 'Доступ к боевому дрону низкого уровня.' },
  { name: 'Синхронизация роя', class: 'Дроны', tier: 'Продвинутый', dpCost: 3, prereq: 'Удалённая команда', desc: 'Два дрона действуют согласованно.' },
  { name: 'Живая ретрансляция', class: 'Дроны', tier: 'Продвинутый', dpCost: 3, prereq: 'Полевой uplink', desc: 'Дроны помогают взлому и разведке.' },
  { name: 'Ударный корпус', class: 'Дроны', tier: 'Глубокий', dpCost: 4, prereq: 'Шок-дрон', desc: 'Доступ к тяжёлому дрону.' },
  { name: 'Экстренная переброска', class: 'Дроны', tier: 'Глубокий', dpCost: 4, prereq: 'Живая ретрансляция', desc: 'Дрон может пронести стим, предмет или модуль через опасную зону.' },
  { name: 'Рой-пастырь', class: 'Дроны', tier: 'Экзотичный', dpCost: 5, prereq: '2 глубоких скила Дронов, уровень 5+', desc: '1 раз за миссию управляешь несколькими дронами как общей угрозой.' },

  { name: 'Уверенный пилот', class: 'Транспорт', tier: 'Базовый', dpCost: 2, prereq: 'Навык Вождение или Пилотирование Обучен+', desc: '+2 к вождению в опасной ситуации.' },
  { name: 'Знание маршрутов', class: 'Транспорт', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Можешь искать безопасный путь.' },
  { name: 'Боевой разворот', class: 'Транспорт', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Игнорируешь первый штраф манёвра.' },
  { name: 'Призрачный проезд', class: 'Транспорт', tier: 'Продвинутый', dpCost: 3, prereq: 'Уверенный пилот', desc: '+2 к уходу от преследования в городе.' },
  { name: 'Контрабандный отсек', class: 'Транспорт', tier: 'Продвинутый', dpCost: 3, prereq: 'Знание маршрутов', desc: 'Транспорт скрывает груз, людей и хром.' },
  { name: 'Водитель удара', class: 'Транспорт', tier: 'Продвинутый', dpCost: 3, prereq: 'Боевой разворот', desc: 'Эффективнее используешь таран.' },
  { name: 'Слепой туннель', class: 'Транспорт', tier: 'Глубокий', dpCost: 4, prereq: 'Призрачный проезд', desc: 'Уходишь из погони ценой поломки, топлива или Heat.' },
  { name: 'Городской призрак', class: 'Транспорт', tier: 'Глубокий', dpCost: 4, prereq: 'Знание маршрутов и Призрачный проезд', desc: 'Твоё перемещение крайне трудно отследить.' },
  { name: 'Последний марш-бросок', class: 'Транспорт', tier: 'Экзотичный', dpCost: 5, prereq: '2 глубоких скила Транспорта, уровень 5+', desc: 'Транспорт доживает до конца сцены после критических повреждений.' },

  { name: 'Адаптация к хрому', class: 'Импланты', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: '+1 к лимиту имплантов.' },
  { name: 'Снижение отторжения', class: 'Импланты', tier: 'Базовый', dpCost: 2, prereq: 'Нет', desc: 'Первая побочка импланта сцены игнорируется.' },
  { name: 'Калибровка тела', class: 'Импланты', tier: 'Базовый', dpCost: 2, prereq: '1 установленный имплант', desc: '1 раз за сцену +2 к проверке, связанной с имплантом.' },
  { name: 'Глубокий разъём', class: 'Импланты', tier: 'Продвинутый', dpCost: 3, prereq: 'Адаптация к хрому', desc: 'Импланты работают быстрее и чище.' },
  { name: 'Живой интерфейс', class: 'Импланты', tier: 'Продвинутый', dpCost: 3, prereq: 'Калибровка тела, Базовый порт или имплант-сеть', desc: 'Имплант и хак могут усиливать друг друга.' },
  { name: 'Холодная плоть', class: 'Импланты', tier: 'Продвинутый', dpCost: 3, prereq: 'Снижение отторжения', desc: '+2 к сопротивлению боли и шоку.' },
  { name: 'Перенос перегруза', class: 'Импланты', tier: 'Глубокий', dpCost: 4, prereq: 'Глубокий разъём', desc: 'Штраф от перегруза можно переводить в STRESS.' },
  { name: 'Серийная интеграция', class: 'Импланты', tier: 'Глубокий', dpCost: 4, prereq: 'Адаптация к хрому и 2 импланта', desc: 'Держишь больше модулей одновременно.' },
  { name: 'Плоть как платформа', class: 'Импланты', tier: 'Экзотичный', dpCost: 5, prereq: '2 глубоких скила Имплантов, уровень 5+', desc: 'Экзотичный имплант не занимает обычный слот, но даёт постоянную побочку.' },
  { name: 'Хромированное чудовище', class: 'Импланты', tier: 'Культовый', dpCost: 6, prereq: 'Серийная интеграция, уровень 8+', desc: 'Ломаешь лимит тела, но ухудшаешь скрытность, эмпатию или ментальную стабильность.' },
];

const HACKS = [
  { id: 'ping', name: 'Ping', ram: 1, effect: 'Показывает узлы, устройства и сенсоры.' },
  { id: 'target_mark', name: 'Target Mark', ram: 1, effect: '+2 к первой атаке союзников по цели.' },
  { id: 'sensor_blur', name: 'Sensor Blur', ram: 1, effect: 'Камера или сенсор теряет точность.' },
  { id: 'ghost_hand', name: 'Ghost Hand', ram: 1, effect: 'Открывает простую дверь или панель.' },
  { id: 'social_scrape', name: 'Social Scrape', ram: 1, effect: 'Читает слабость или интерес NPC.' },
  { id: 'med_ping', name: 'Med Ping', ram: 1, effect: 'Анализирует тело и импланты.' },
  { id: 'jam_channel', name: 'Jam Channel', ram: 1, effect: 'Ломает координацию цели.' },
  { id: 'weapon_overload', name: 'Weapon Overload', ram: 2, effect: 'Оружие или имплант цели сбоит.' },
  { id: 'crowd_feed', name: 'Crowd Feed', ram: 2, effect: 'Меняет реакцию массы.' },
  { id: 'false_route', name: 'False Route', ram: 2, effect: 'Меняет маршрут патруля, дрона или авто.' },
  { id: 'firewall_spike', name: 'Firewall Spike', ram: 2, effect: 'Дроны и турели получают помеху.' },
  { id: 'credit_shuffle', name: 'Credit Shuffle', ram: 2, effect: 'Путает или задерживает транзакцию.' },
  { id: 'neuro_tap', name: 'Neuro Tap', ram: 2, effect: '1d4 STRESS или нейроанализ.' },
  { id: 'exit_window', name: 'Exit Window', ram: 2, effect: 'Снижает Heat на 1 при цифровом отходе.' },
  { id: 'puppet_drone', name: 'Puppet Drone', ram: 3, effect: 'Перехват дрона или турели.' },
  { id: 'blackout_bubble', name: 'Blackout Bubble', ram: 3, effect: 'Гасит локальную сеть света и сенсоров.' },
  { id: 'reputation_leak', name: 'Reputation Leak', ram: 3, effect: 'Запускает компромат или легенду.' },
  { id: 'pain_editor', name: 'Pain Editor', ram: 3, effect: 'Цель игнорирует Ранен до конца сцены.' },
  { id: 'lockdown', name: 'Lockdown', ram: 3, effect: 'Блокирует двери и лифты.' },
  { id: 'stack_collapse', name: 'Stack Collapse', ram: 3, effect: 'Цель с имплантом получает 1d6 STRESS.' },
  { id: 'pursuit_jam', name: 'Pursuit Jam', ram: 3, effect: 'Ломает навигацию преследователя.' },
  { id: 'ghost_city', name: 'Ghost City', ram: 4, effect: 'Группа исчезает из городской сети.' },
  { id: 'kill_switch', name: 'Kill Switch', ram: 4, effect: 'Мощный имплант или тяжёлый дрон выключается.' },
  { id: 'mob_trigger', name: 'Mob Trigger', ram: 4, effect: 'Толпа впадает в хаос.' },
  { id: 'hostile_rewrite', name: 'Hostile Rewrite', ram: 4, effect: 'Переписывает поведение автономной системы.' },
  { id: 'emergency_rewrite', name: 'Emergency Rewrite', ram: 4, effect: 'Цель с 0 HP встаёт на 1 HP.' },
  { id: 'corp_scandal_burst', name: 'Corporate Scandal Burst', ram: 4, effect: 'Бьёт по репутации фракции.' },
  { id: 'ghost_burn', name: 'Ghost Burn', ram: 3, effect: 'Чёрный хак. Требует особого доступа.' },
  { id: 'seizure_spike', name: 'Seizure Spike', ram: 3, effect: 'Чёрный хак. Нейрошок цели.' },
  { id: 'memory_salt', name: 'Memory Salt', ram: 4, effect: 'Чёрный хак. Искажение памяти.' },
  { id: 'dead_choir', name: 'Dead Choir', ram: 4, effect: 'Чёрный хак. Токсичный резонанс сигнала.' },
];

const RARITY_LABELS = { bad: 'Плохое', standard: 'Стандартное', improved: 'Улучшенное', exotic: 'Экзотичное', cult: 'Культовое' };
const RARITY_ORDER = ['bad', 'standard', 'improved', 'exotic', 'cult'];

// Каталог снаряжения — Cyberpunk Rulebook v0.5, плейтестовый модуль (108 предметов: 36 оружия, 36 брони, 36 имплантов)
const WEAPONS = [
  { id: "w_samodelnyi_pistolet", name: "Самодельный пистолет", type: "Побочное", damage: "1d4", range: "Близко/средне", property: "Критический провал: Сломан", price: null, rarity: "bad" },
  { id: "w_rzhavyi_revolver", name: "Ржавый револьвер", type: "Побочное", damage: "1d6", range: "Близко/средне", property: "Перезарядка требует малого действия", price: null, rarity: "bad" },
  { id: "w_obrez", name: "Обрез", type: "Основное", damage: "1d6", range: "Близко", property: "На средней дистанции помеха", price: null, rarity: "bad" },
  { id: "w_samopalnyi_pp", name: "Самопальный ПП", type: "Основное", damage: "1d6", range: "Близко", property: "Автоогонь: Heat +1 дополнительно", price: null, rarity: "bad" },
  { id: "w_trubchatoe_ruzhe", name: "Трубчатое ружьё", type: "Основное", damage: "1d8", range: "Близко/средне", property: "После каждого выстрела перезарядка малым действием", price: null, rarity: "bad" },
  { id: "w_odnorazovyi_shoker", name: "Одноразовый шокер", type: "Побочное", damage: "1d4 STRESS", range: "Вплотную", property: "После применения Сломан", price: null, rarity: "bad" },
  { id: "w_armaturnaya_dubina", name: "Арматурная дубина", type: "Ближнее", damage: "1d4", range: "Вплотную", property: "Шумная: нельзя применять скрытно", price: null, rarity: "bad" },
  { id: "w_zatochka_iz_metalloloma", name: "Заточка из металлолома", type: "Ближнее", damage: "1d4", range: "Вплотную", property: "Критический провал: оружие ломается", price: null, rarity: "bad" },
  { id: "w_cep_s_gruzom", name: "Цепь с грузом", type: "Ближнее", damage: "1d4", range: "Вплотную", property: "Помеха против целей в надёжном укрытии", price: null, rarity: "bad" },
  { id: "w_skladnoi_rezak", name: "Складной резак", type: "Ближнее", damage: "1d4", range: "Вплотную", property: "-1 к Ближнему бою, пока используется", price: null, rarity: "bad" },
  { id: "w_pistolet_kobra", name: "Пистолет «Кобра»", type: "Побочное", damage: "1d6", range: "Близко/средне", property: "Надёжный", price: null, rarity: "standard" },
  { id: "w_kompaktnyi_pistolet", name: "Компактный пистолет", type: "Побочное", damage: "1d4", range: "Близко", property: "Скрываемый", price: null, rarity: "standard" },
  { id: "w_tyazhelyi_revolver", name: "Тяжёлый револьвер", type: "Побочное", damage: "1d8", range: "Близко/средне", property: "Перезарядка требует малого действия", price: null, rarity: "standard" },
  { id: "w_pistolet_pulemet_strizh", name: "Пистолет-пулемёт «Стриж»", type: "Основное", damage: "1d6", range: "Близко", property: "Автоогонь", price: null, rarity: "standard" },
  { id: "w_karabin_raion_7", name: "Карабин «Район-7»", type: "Основное", damage: "1d8", range: "Средне/далеко", property: "Универсальный", price: null, rarity: "standard" },
  { id: "w_shturmovaya_vintovka_vektor", name: "Штурмовая винтовка «Вектор»", type: "Основное", damage: "1d8", range: "Средне/далеко", property: "Автоогонь", price: null, rarity: "standard" },
  { id: "w_pompovyi_drobovik", name: "Помповый дробовик", type: "Основное", damage: "1d8", range: "Близко", property: "На близкой дистанции +1 к урону", price: null, rarity: "standard" },
  { id: "w_ohotniche_ruzhe", name: "Охотничье ружьё", type: "Основное", damage: "1d10", range: "Средне/далеко", property: "Перезарядка требует малого действия", price: null, rarity: "standard" },
  { id: "w_takticheskaya_dubinka", name: "Тактическая дубинка", type: "Ближнее", damage: "1d6", range: "Вплотную", property: "Крит: цель Подавлена", price: null, rarity: "standard" },
  { id: "w_machete", name: "Мачете", type: "Ближнее", damage: "1d6", range: "Вплотную", property: "Бесшумное и прочное", price: null, rarity: "standard" },
  { id: "w_umnyi_pistolet", name: "Умный пистолет", type: "Побочное", damage: "1d6", range: "Близко/средне", property: "+1 к первой атаке по отмеченной цели", price: null, rarity: "improved" },
  { id: "w_besshumnyi_pistolet", name: "Бесшумный пистолет", type: "Побочное", damage: "1d6", range: "Близко/средне", property: "Не повышает Heat от одиночного выстрела", price: null, rarity: "improved" },
  { id: "w_boevoi_pp", name: "Боевой ПП", type: "Основное", damage: "1d8", range: "Близко", property: "Автоогонь; компактный", price: null, rarity: "improved" },
  { id: "w_takticheskii_drobovik", name: "Тактический дробовик", type: "Основное", damage: "1d10", range: "Близко", property: "Перезарядка малым действием не требуется раз за сцену", price: null, rarity: "improved" },
  { id: "w_tochnaya_vintovka", name: "Точная винтовка", type: "Основное", damage: "1d10", range: "Далеко", property: "+1 к атаке с подготовленной позиции", price: null, rarity: "improved" },
  { id: "w_probivnoi_karabin", name: "Пробивной карабин", type: "Основное", damage: "1d8", range: "Средне/далеко", property: "Игнорирует 1 DEF от брони", price: null, rarity: "improved" },
  { id: "w_vibroklinok", name: "Виброклинок", type: "Ближнее", damage: "1d8", range: "Вплотную", property: "Игнорирует 1 DEF от брони", price: null, rarity: "improved" },
  { id: "w_elektrodubinka", name: "Электродубинка", type: "Ближнее", damage: "1d6 + 1 STRESS", range: "Вплотную", property: "Крит: Оглушён", price: null, rarity: "improved" },
  { id: "w_mononit", name: "Мононить", type: "Ближнее", damage: "1d8", range: "Вплотную", property: "Скрываемая; требуется осторожность", price: null, rarity: "improved" },
  { id: "w_marksmanskaya_vintovka", name: "Марксманская винтовка", type: "Основное", damage: "1d10", range: "Далеко", property: "Крит добавляет 1d4 урона", price: null, rarity: "improved" },
  { id: "w_relsovyi_pistolet", name: "Рельсовый пистолет", type: "Побочное", damage: "1d8", range: null, property: "Игнорирует лёгкое укрытие", price: "После выстрела Перегрет", rarity: "exotic" },
  { id: "w_mikroraketnyi_kompleks", name: "Микроракетный комплекс", type: "Основное", damage: "2d6", range: null, property: "Зона поражения", price: "Heat +1 за применение", rarity: "exotic" },
  { id: "w_neiroshoker", name: "Нейрошокер", type: "Побочное", damage: "1d6 STRESS", range: null, property: "Успех может наложить Оглушён", price: "Требует контакт или близкую дистанцию", rarity: "exotic" },
  { id: "w_golos_voiny", name: "«Голос войны»", type: "Основное", damage: "2d8", range: null, property: "Автоогонь и подавление без штрафа", price: "После сцены Heat +2", rarity: "cult" },
  { id: "w_poslednii_argument", name: "«Последний аргумент»", type: "Побочное", damage: "2d6", range: null, property: "Один выстрел за сцену; крит на 19–20", price: "После выстрела требуется сервис", rarity: "cult" },
  { id: "w_pevec_provodov", name: "«Певец проводов»", type: "Ближнее", damage: "2d8", range: null, property: "Наносит HP и STRESS", price: "Требует имплант-интерфейс; Humanity -1", rarity: "cult" },
];

const ARMORS = [
  { id: "a_latannyi_bronezhilet", name: "Латанный бронежилет", class: "Лёгкая", def: "+1", property: "После критического попадания получает Сломан", price: null, rarity: "bad" },
  { id: "a_kurtka_s_kevlarovymi_vstavkami", name: "Куртка с кевларовыми вставками", class: "Лёгкая", def: "+1", property: "-1 к социальным проверкам в корпоративной зоне", price: null, rarity: "bad" },
  { id: "a_staraya_motobronya", name: "Старая мотоброня", class: "Лёгкая", def: "+1", property: "Шумная при беге", price: null, rarity: "bad" },
  { id: "a_samodelnaya_plastina", name: "Самодельная пластина", class: "Лёгкая", def: "+1", property: "Помеха на Скрытность", price: null, rarity: "bad" },
  { id: "a_rzhavyi_zhilet_ohrany", name: "Ржавый жилет охраны", class: "Средняя", def: "+2", property: "После погони требует обслуживания", price: null, rarity: "bad" },
  { id: "a_kontrabandnyi_razgruz", name: "Контрабандный разгруз", class: "Средняя", def: "+2", property: "Привлекает внимание при досмотре", price: null, rarity: "bad" },
  { id: "a_tyazhelyi_schitovoi_komplekt", name: "Тяжёлый щитовой комплект", class: "Тяжёлая", def: "+3", property: "Помеха на Скрытность и Акробатику", price: null, rarity: "bad" },
  { id: "a_brakovannaya_silovaya_rama", name: "Бракованная силовая рама", class: "Экзо-рама", def: "+4", property: "Критический провал: Сломан", price: null, rarity: "bad" },
  { id: "a_pressovannyi_pancir", name: "Прессованный панцирь", class: "Средняя", def: "+2", property: "Помеха на Переговоры с гражданскими", price: null, rarity: "bad" },
  { id: "a_deshevyi_plasch_bronya", name: "Дешёвый плащ-броня", class: "Лёгкая", def: "+1", property: "Не защищает от первого попадания при внезапной атаке", price: null, rarity: "bad" },
  { id: "a_gorodskaya_kurtka_s_kevlarom", name: "Городская куртка с кевларом", class: "Лёгкая", def: "+1", property: "Без штрафа", price: null, rarity: "standard" },
  { id: "a_skrytyi_zhilet", name: "Скрытый жилет", class: "Лёгкая", def: "+1", property: "Не заметен при обычном досмотре", price: null, rarity: "standard" },
  { id: "a_kurerskii_bronekostyum", name: "Курьерский бронекостюм", class: "Лёгкая", def: "+1", property: "Удобен для Акробатики", price: null, rarity: "standard" },
  { id: "a_standartnyi_bronezhilet", name: "Стандартный бронежилет", class: "Средняя", def: "+2", property: "Заметен", price: null, rarity: "standard" },
  { id: "a_takticheskii_razgruz", name: "Тактический разгруз", class: "Средняя", def: "+2", property: "Вмещает один дополнительный полезный предмет", price: null, rarity: "standard" },
  { id: "a_bronepalto_fikserov", name: "Бронепальто фиксеров", class: "Средняя", def: "+2", property: "Не выглядит военной бронёй", price: null, rarity: "standard" },
  { id: "a_ohrannyi_komplekt", name: "Охранный комплект", class: "Средняя", def: "+2", property: "Помогает выдать себя за охрану", price: null, rarity: "standard" },
  { id: "a_shturmovoi_pancir", name: "Штурмовой панцирь", class: "Тяжёлая", def: "+3", property: "Помеха на Скрытность", price: null, rarity: "standard" },
  { id: "a_komplekt_podavleniya", name: "Комплект подавления", class: "Тяжёлая", def: "+3", property: "Раз за сцену игнорирует Подавлен", price: null, rarity: "standard" },
  { id: "a_rabochaya_ekzo_rama", name: "Рабочая экзо-рама", class: "Экзо-рама", def: "+4", property: "Требует силы, питания или хрома", price: null, rarity: "standard" },
  { id: "a_skrytnyi_bronekostyum", name: "Скрытный бронекостюм", class: "Средняя", def: "+2", property: "Не даёт помеху на Скрытность", price: null, rarity: "improved" },
  { id: "a_takticheskaya_plastina", name: "Тактическая пластина", class: "Тяжёлая", def: "+3", property: "Раз за сцену игнорирует Ранен", price: null, rarity: "improved" },
  { id: "a_plasch_sensoropodavitel", name: "Плащ-сенсороподавитель", class: "Лёгкая", def: "+1", property: "+2 против камер и дешёвых сенсоров", price: null, rarity: "improved" },
  { id: "a_shturmovoi_komplekt_blok", name: "Штурмовой комплект «Блок»", class: "Тяжёлая", def: "+3", property: "+2 против захвата и тарана", price: null, rarity: "improved" },
  { id: "a_usilennaya_ekzo_rama", name: "Усиленная экзо-рама", class: "Экзо-рама", def: "+4", property: "+2 к Атлетике при силовых действиях", price: null, rarity: "improved" },
  { id: "a_medicinskii_bronekostyum", name: "Медицинский бронекостюм", class: "Средняя", def: "+2", property: "+2 к стабилизации раненого", price: null, rarity: "improved" },
  { id: "a_kurerskaya_skolzyaschaya_bronya", name: "Курьерская скользящая броня", class: "Средняя", def: "+2", property: "Раз за сцену игнорирует помеху от преследования", price: null, rarity: "improved" },
  { id: "a_protivogazovyi_pancir", name: "Противогазовый панцирь", class: "Средняя", def: "+2", property: "Преимущество против газа и дыма", price: null, rarity: "improved" },
  { id: "a_bronya_svyazista", name: "Броня связиста", class: "Лёгкая", def: "+1", property: "Защищает носимый сетевой инструмент от первого сбоя", price: null, rarity: "improved" },
  { id: "a_sapernyi_komplekt", name: "Сапёрный комплект", class: "Тяжёлая", def: "+3", property: "+2 против взрывов; помеха на Скрытность", price: null, rarity: "improved" },
  { id: "a_reaktivnaya_bronya", name: "Реактивная броня", class: "Тяжёлая", def: "+3", property: "Реакцией снижает урон на 1d6", price: "Затем Перегрет", rarity: "exotic" },
  { id: "a_mask_kostyum", name: "Маск-костюм", class: "Средняя", def: "+2", property: "Преимущество на одну Скрытность за сцену", price: "Камеры могут отметить аномалию", rarity: "exotic" },
  { id: "a_shturmovaya_ekzo_rama", name: "Штурмовая экзо-рама", class: "Экзо-рама", def: "+4", property: "Игнорирует лёгкое укрытие при таране", price: "Heat +1 при активации", rarity: "exotic" },
  { id: "a_bastion_nulya", name: "«Бастион Нуля»", class: "Экзо-рама", def: "+4", property: "Раз за сцену получает ещё +4 DEF до следующего хода", price: "STRESS -1d4 после сцены", rarity: "cult" },
  { id: "a_svyataya_obolochka", name: "«Святая оболочка»", class: "Экзо-рама", def: "+4", property: "Игнорирует первый критический эффект сцены", price: "Внимание фракций и Heat +1", rarity: "cult" },
  { id: "a_kozha_megapolisa", name: "«Кожа мегаполиса»", class: "Средняя", def: "+3", property: "Сливается с городской инфраструктурой: +2 к уходу от погони", price: "Требует сетевую связь; уязвима к Рассинхрону", rarity: "cult" },
];

const IMPLANTS = [
  { id: "i_drozhaschii_pricel", name: "Дрожащий прицел", slots: "1", effect: "+1 к Стрельбе с подготовленной позиции", drawback: "Критический провал: помеха к следующей атаке", price: null, rarity: "bad" },
  { id: "i_ulichnyi_neiroport", name: "Уличный нейропорт", slots: "1", effect: "Физическое подключение к устройствам", drawback: "Уязвим к сетевым атакам", price: null, rarity: "bad" },
  { id: "i_ruka_protez", name: "Рука-протез", slots: "1", effect: "Базовые манипуляции и удержание предметов", drawback: "-1 к тонкой моторике", price: null, rarity: "bad" },
  { id: "i_deshevyi_refleks_buster", name: "Дешёвый рефлекс-бустер", slots: "1", effect: "+1 INIT", drawback: "После применения STRESS -1", price: null, rarity: "bad" },
  { id: "i_sboinyi_kiberglaz", name: "Сбойный киберглаз", slots: "1", effect: "Видит в темноте на близкой дистанции", drawback: "Помеха в ярком свете", price: null, rarity: "bad" },
  { id: "i_podkozhnaya_setka", name: "Подкожная сетка", slots: "1", effect: "DEF +1 против первого попадания сцены", drawback: "После срабатывания отключается", price: null, rarity: "bad" },
  { id: "i_stim_regulyator", name: "Стим-регулятор", slots: "1", effect: "Игнорирует Ранен на один ход", drawback: "Затем STRESS -1d4", price: null, rarity: "bad" },
  { id: "i_paket_pamyati", name: "Пакет памяти", slots: "1", effect: "Записывает разговор или изображение", drawback: "Данные уязвимы к взлому", price: null, rarity: "bad" },
  { id: "i_legkie_filtry", name: "Лёгкие-фильтры", slots: "1", effect: "Преимущество против дыма и газа", drawback: "Шумное дыхание при нагрузке", price: null, rarity: "bad" },
  { id: "i_kostnyi_fiksator", name: "Костный фиксатор", slots: "1", effect: "+1 к Атлетике при захвате", drawback: "Помеха к Акробатике", price: null, rarity: "bad" },
  { id: "i_kiberglaz", name: "Киберглаз", slots: "1", effect: "+2 к Внимательности при поиске деталей", drawback: null, price: null, rarity: "standard" },
  { id: "i_neiroport", name: "Нейропорт", slots: "1", effect: "Безопасное подключение к устройствам и сетям", drawback: null, price: null, rarity: "standard" },
  { id: "i_refleks_buster", name: "Рефлекс-бустер", slots: "1", effect: "+2 INIT раз за сцену", drawback: null, price: null, rarity: "standard" },
  { id: "i_podkozhnaya_bronya", name: "Подкожная броня", slots: "1", effect: "DEF +1; не занимает слот брони", drawback: null, price: null, rarity: "standard" },
  { id: "i_med_uzel", name: "Мед-узел", slots: "1", effect: "Раз за сцену восстанавливает 1d6 HP", drawback: null, price: null, rarity: "standard" },
  { id: "i_silovye_miofibry", name: "Силовые миофибры", slots: "1", effect: "+2 к силовым проверкам", drawback: null, price: null, rarity: "standard" },
  { id: "i_legkie_filtry_mk_ii", name: "Лёгкие-фильтры Mk II", slots: "1", effect: "Преимущество против дыма, газа и загрязнения", drawback: null, price: null, rarity: "standard" },
  { id: "i_audiofiltr", name: "Аудиофильтр", slots: "1", effect: "Игнорирует первую звуковую помеху сцены", drawback: null, price: null, rarity: "standard" },
  { id: "i_pamyat_bufer", name: "Память-буфер", slots: "1", effect: "Хранит и воспроизводит запись сцены", drawback: null, price: null, rarity: "standard" },
  { id: "i_kozhnyi_interfeis", name: "Кожный интерфейс", slots: "1", effect: "+2 к Электронике при физическом подключении", drawback: null, price: null, rarity: "standard" },
  { id: "i_boevoi_opticheskii_paket", name: "Боевой оптический пакет", slots: "1", effect: "+1 к Стрельбе; игнорирует слабую дымовую помеху", drawback: null, price: null, rarity: "improved" },
  { id: "i_pamyat_prizrak", name: "Память-призрак", slots: "1", effect: "+2 к Анализу и сохраняет запись одной сцены", drawback: null, price: null, rarity: "improved" },
  { id: "i_usilennyi_neiroport", name: "Усиленный нейропорт", slots: "1", effect: "+1 RAM", drawback: null, price: null, rarity: "improved" },
  { id: "i_reflektornaya_set", name: "Рефлекторная сеть", slots: "2", effect: "Раз за сцену дополнительное малое действие", drawback: null, price: null, rarity: "improved" },
  { id: "i_hirurgicheskii_interfeis", name: "Хирургический интерфейс", slots: "1", effect: "+2 к Медицине при лечении и установке имплантов", drawback: null, price: null, rarity: "improved" },
  { id: "i_myshechnyi_usilitel", name: "Мышечный усилитель", slots: "2", effect: "+1 урон ближнего боя и +2 к Атлетике", drawback: null, price: null, rarity: "improved" },
  { id: "i_kibersluh_eho", name: "Киберслух «Эхо»", slots: "1", effect: "+2 к Внимательности по звуку; слышит через тонкие стены", drawback: null, price: null, rarity: "improved" },
  { id: "i_dron_sinaps", name: "Дрон-синапс", slots: "1", effect: "+2 к одной проверке Дронов раз за сцену", drawback: null, price: null, rarity: "improved" },
  { id: "i_termooptika", name: "Термооптика", slots: "1", effect: "Видит тепловые следы и скрытые источники тепла", drawback: null, price: null, rarity: "improved" },
  { id: "i_nanofiltr_krovi", name: "Нанофильтр крови", slots: "1", effect: "Раз за сцену игнорирует яд, наркотик или лёгкий токсин", drawback: null, price: null, rarity: "improved" },
  { id: "i_uskoritel_sdvig", name: "Ускоритель «Сдвиг»", slots: "2", effect: "Раз за сцену дополнительное действие", drawback: null, price: "Перегрет и STRESS -1d4", rarity: "exotic" },
  { id: "i_hameleonovaya_kozha", name: "Хамелеоновая кожа", slots: "2", effect: "Преимущество на одну Скрытность за сцену", drawback: null, price: "Камеры могут распознать аномалию", rarity: "exotic" },
  { id: "i_chernyi_neiroport", name: "Чёрный нейропорт", slots: "2", effect: "+2 RAM и доступ к чёрным хакам", drawback: null, price: "Уязвимость к нейрошоку", rarity: "exotic" },
  { id: "i_prizrak_v_obolochke", name: "«Призрак в оболочке»", slots: "3", effect: "+1 RAM и +2 к лимиту имплантов", drawback: null, price: "Риск срыва при критическом сбое", rarity: "cult" },
  { id: "i_hromirovannoe_chudovische", name: "«Хромированное чудовище»", slots: "3", effect: "Игнорирует требования тяжёлой брони и оружия", drawback: null, price: "Снижение скрытности, эмпатии или стабильности", rarity: "cult" },
  { id: "i_svyatoi_razgon", name: "«Святой разгон»", slots: "3", effect: "Раз за сцену применяет хак или имплант без цены ресурса", drawback: null, price: "STRESS -1d6 и Перегрет", rarity: "cult" },
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
let skillRanks = {};
let selectedDevskills = [];
let savedChars = [];
let currentCharIndex = -1;
let upgradeChar = null;
let inventoryModal = null;
let invCurrentTab = 'weapons';
let invCharIdx = -1;
let invRarityFilter = 'all';
let invSearchQuery = '';

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
// Правила распределения:
//   Базовое значение = 3. Всего 6 очков для распределения.
//   Повышение: 3→4 стоит 1 очко, 4→5 стоит 2 очка.
//   Понижение: 3→2 возвращает 1 очко, 2→1 возвращает 1 очко.
//   Минимум = 1, максимум = 5. Не более двух характеристик на 5.
function renderAbilities() {
  const container = document.getElementById('ability-scores');
  container.innerHTML = ABILITIES.map(ab => {
    const v = abilities[ab];
    const canDec = v > 1;
    const canInc = v < 5;
    return `<div class="ability-row">
      <span class="ab-name">${AB_FULL[ab]} <small>(${ab})</small></span>
      <div class="ab-controls">
        <button onclick="changeAb('${ab}',-1)" ${canDec?'':'disabled'} aria-label="−">−</button>
        <span class="ab-val">${v}</span>
        <button onclick="changeAb('${ab}',1)" ${canInc?'':'disabled'} aria-label="+">+</button>
      </div>
      <span class="ab-mod">${AB_MOD[v]>=0?'+':''}${AB_MOD[v]}</span>
    </div>`;
  }).join('');
  document.getElementById('points-left').textContent = pointsLeft;
}

function changeAb(ab, delta) {
  const cur = abilities[ab];
  const next = cur + delta;

  // Жёсткие границы
  if (next < 1 || next > 5) return;

  // Не более двух характеристик на 5
  if (delta === 1 && next === 5) {
    const fivesCount = ABILITIES.filter(a => abilities[a] === 5).length;
    if (fivesCount >= 2) { alert('Нельзя больше двух характеристик на 5!'); return; }
  }

  // Стоимость изменения:
  // +1: 3→4 = 1 очко, 4→5 = 2 очка
  // −1: 4→3 = возврат 1, 5→4 = возврат 2, 3→2 = возврат 1, 2→1 = возврат 1
  let cost;
  if (delta === 1) {
    cost = (cur >= 4) ? 2 : 1;   // 4→5 дорого, остальное по 1
  } else {
    cost = (cur >= 5) ? -2 : -1; // снимаем столько, сколько тратили
  }

  // Проверяем что хватает очков при увеличении
  if (delta === 1 && pointsLeft < cost) { alert('Не хватает очков!'); return; }

  abilities[ab] = next;
  pointsLeft -= cost; // при delta=-1 cost отрицательный → pointsLeft растёт
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
      <div class="devskill-desc">${ds.desc}</div><div class="devskill-meta">${ds.tier || 'Базовый'} · ${ds.dpCost} DP${ds.prereq ? ' · Требует: ' + ds.prereq : ''}</div>
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

  const originEl = document.getElementById('char-origin');
  const originText =
    originEl && originEl.selectedIndex >= 0
      ? originEl.options[originEl.selectedIndex].text
      : '—';

  document.getElementById('summary-content').innerHTML = `
    <div class="summary-block">
      <strong>${document.getElementById('char-name').value || '(без имени)'}</strong>
      <div class="summary-sub">${document.getElementById('char-concept').value || ''}</div>
    </div>
    <div class="summary-row">Происхождение: <span>${originText}</span></div>
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
    inventory: { weapons: [], implants: [], armor: [] },
    hacksKnown: [],
    hacksPrepared: [],
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
  const equippedArmorId = (c.inventory?.armor || [])[0];
  const equippedArmor = equippedArmorId ? ARMORS.find(a => a.id === equippedArmorId) : null;
  const armorBonus = equippedArmor ? (parseInt(equippedArmor.def) || 0) : 0;
  const def    = 10 + AB_MOD[ab.DEX] + armorBonus;
  const impl   = ab.WIL + 1;
  let maxRam   = 0;
  (c.devskills||[]).forEach(ds => {
    if (ds.name === 'Базовый порт')    maxRam += 2;
    if (ds.name === 'Расширенная RAM') maxRam += 1;
    if (ds.name === 'Нейропорт')       maxRam += 1;
  });
  return { hp, stress, def, impl, maxRam, armorBonus };
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
      ${(c.devskills||[]).length ? (c.devskills||[]).map(ds=>`<div class="devskill-card selected compact"><div class="devskill-header"><span class="devskill-name">${ds.name}</span><span class="devskill-class">${ds.class}</span></div><div class="devskill-desc">${ds.desc}</div><div class="devskill-meta">${ds.tier || 'Базовый'} · ${ds.dpCost} DP${ds.prereq ? ' · Требует: ' + ds.prereq : ''}</div></div>`).join('') : '<em>нет скилов</em>'}
    </div>
    <div class="sheet-section">
      <h3>🎒 Инвентарь</h3>
      ${renderInventorySection(c)}
      <div class="nav-buttons" style="margin-top:0.6rem">
        <button class="btn-upgrade" onclick="openInventory(${currentCharIndex})">🎒 Открыть инвентарь</button>
      </div>
    </div>
    ${(c.upgrades&&c.upgrades.length) ? `<div class="sheet-section"><h3>История прокачки</h3><div class="upgrades-log">${c.upgrades.map(u=>`<div class="upgrade-log-entry">${u}</div>`).join('')}</div></div>` : ''}
    <div class="nav-buttons">
      <button class="btn-upgrade" onclick="openUpgradeModal()">⬆ Прокачать</button>
      <button class="btn-danger" onclick="deleteChar(${currentCharIndex})">🗑 Удалить</button>
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
  renderUpgradeHacks();
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
  ['skills','stats','devskills','hacks'].forEach(t => {
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
  renderUpgradeHacks();
}

function applyUpgrades() {
  if (!upgradeChar || currentCharIndex < 0) return;
  savedChars[currentCharIndex] = upgradeChar;
  saveToStorage();
  closeUpgradeModal();
  renderCharSheet(savedChars[currentCharIndex]);
}


// ======= INVENTORY & HACKS =======
function renderInventorySection(c) {
  const inv = c.inventory || { weapons: [], implants: [], armor: [] };
  const weapons = inv.weapons.length ? inv.weapons.map(id => WEAPONS.find(x=>x.id===id)?.name).filter(Boolean).map(n => `<span class="devskill-chip">⚔️ ${n}</span>`).join('') : '<em>нет</em>';
  const implants = inv.implants.length ? inv.implants.map(id => IMPLANTS.find(x=>x.id===id)?.name).filter(Boolean).map(n => `<span class="devskill-chip">🔩 ${n}</span>`).join('') : '<em>нет</em>';
  const armor = inv.armor.length ? inv.armor.map(id => ARMORS.find(x=>x.id===id)?.name).filter(Boolean).map(n => `<span class="devskill-chip">🛡 ${n}</span>`).join('') : '<em>нет</em>';
  return `<div class="summary-row">Оружие: <span>${weapons}</span></div><div class="summary-row">Импланты: <span>${implants}</span></div><div class="summary-row">Броня: <span>${armor}</span></div>`;
}

function openInventory(charIdx) {
  invCharIdx = charIdx;
  const c = savedChars[charIdx];
  if (!c.inventory) c.inventory = { weapons: [], implants: [], armor: [] };
  let modal = document.getElementById('inventory-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'inventory-modal';
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) closeInventoryModal(); };
  const rarityChips = RARITY_ORDER.map(r =>
    `<button class="inv-filter-chip" onclick="setInvRarityFilter('${r}', this)">${RARITY_LABELS[r]}</button>`
  ).join('');
  modal.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Инвентарь персонажа">
      <div class="modal-header"><span class="modal-title">🎒 Инвентарь</span><button class="modal-close" onclick="closeInventoryModal()">✕</button></div>
      <div class="modal-body">
        <div class="upgrade-tabs">
          <button class="upgrade-tab active" onclick="switchInventoryTab('weapons', this)">Оружие</button>
          <button class="upgrade-tab" onclick="switchInventoryTab('implants', this)">Импланты</button>
          <button class="upgrade-tab" onclick="switchInventoryTab('armor', this)">Броня</button>
        </div>
        <input type="text" id="inv-search" class="inv-search-input" placeholder="🔍 Поиск по названию..." oninput="filterInventorySearch(this.value)" />
        <div class="inv-filter-row">
          <button class="inv-filter-chip active" onclick="setInvRarityFilter('all', this)">Все</button>
          ${rarityChips}
        </div>
        <div id="inventory-content"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  invCurrentTab = 'weapons';
  invRarityFilter = 'all';
  invSearchQuery = '';
  renderInventoryTab();
}

function closeInventoryModal() {
  document.getElementById('inventory-modal')?.remove();
  saveToStorage();
  if (currentCharIndex >= 0) renderCharSheet(savedChars[currentCharIndex]);
}

function switchInventoryTab(tab, btn) {
  invCurrentTab = tab;
  invRarityFilter = 'all';
  invSearchQuery = '';
  const search = document.getElementById('inv-search');
  if (search) search.value = '';
  document.querySelectorAll('#inventory-modal .upgrade-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#inventory-modal .inv-filter-chip').forEach((b, i) => b.classList.toggle('active', i === 0));
  renderInventoryTab();
}

function setInvRarityFilter(r, btn) {
  invRarityFilter = r;
  document.querySelectorAll('#inventory-modal .inv-filter-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderInventoryTab();
}

function filterInventorySearch(value) {
  invSearchQuery = value;
  renderInventoryTab();
}

function renderInventoryItemCard(item, active) {
  let meta = '', desc = '';
  if (invCurrentTab === 'weapons') {
    meta = item.type;
    desc = `Урон: ${item.damage}` + (item.range ? ` · Дистанция: ${item.range}` : '') + ` — ${item.property}` + (item.price ? ` · Цена: ${item.price}` : '');
  } else if (invCurrentTab === 'armor') {
    meta = `${item.class} · DEF ${item.def}`;
    desc = item.property + (item.price ? ` · Цена: ${item.price}` : '');
  } else {
    meta = `Слоты: ${item.slots}`;
    desc = item.effect + (item.drawback ? ` · Недостаток: ${item.drawback}` : '') + (item.price ? ` · Цена: ${item.price}` : '');
  }
  return `<div class="devskill-card ${active?'selected':''}" onclick="toggleInventoryItem('${invCurrentTab}','${item.id}')">
    <div class="devskill-header"><span class="devskill-name">${item.name}</span><span class="devskill-class">${meta}</span></div>
    <div class="devskill-desc">${desc}</div>
  </div>`;
}

function renderInventoryTab() {
  const c = savedChars[invCharIdx];
  if (!c) return;
  const map = { weapons: WEAPONS, implants: IMPLANTS, armor: ARMORS };
  let list = map[invCurrentTab] || [];
  const selected = c.inventory?.[invCurrentTab] || [];
  const usedImplants = (c.inventory?.implants || []).reduce((acc, id) => acc + (parseInt(IMPLANTS.find(x=>x.id===id)?.slots) || 0), 0);
  const implLimit = calcDerivedFromChar(c).impl;

  if (invRarityFilter !== 'all') list = list.filter(it => it.rarity === invRarityFilter);
  if (invSearchQuery.trim()) {
    const q = invSearchQuery.trim().toLowerCase();
    list = list.filter(it => it.name.toLowerCase().includes(q));
  }

  let top = '';
  if (invCurrentTab === 'implants') top = `<div class="hint">Лимит имплантов: <strong>${usedImplants}/${implLimit}</strong></div>`;

  if (!list.length) {
    document.getElementById('inventory-content').innerHTML = top + '<div class="empty-state">Ничего не найдено</div>';
    return;
  }

  const grouped = RARITY_ORDER.map(r => ({ rarity: r, items: list.filter(it => it.rarity === r) })).filter(g => g.items.length);

  document.getElementById('inventory-content').innerHTML = top + grouped.map(g => `
    <div class="inv-rarity-group">
      <div class="inv-rarity-heading rarity-${g.rarity}">${RARITY_LABELS[g.rarity]} <small>(${g.items.length})</small></div>
      ${g.items.map(item => renderInventoryItemCard(item, selected.includes(item.id))).join('')}
    </div>
  `).join('');
}

function toggleInventoryItem(tab, itemId) {
  const c = savedChars[invCharIdx];
  if (!c.inventory) c.inventory = { weapons: [], implants: [], armor: [] };
  const arr = c.inventory[tab];
  const idx = arr.indexOf(itemId);
  if (idx >= 0) arr.splice(idx, 1);
  else {
    if (tab === 'armor') c.inventory.armor = [itemId];
    else if (tab === 'implants') {
      const nextCost = parseInt(IMPLANTS.find(x=>x.id===itemId)?.slots) || 0;
      const used = c.inventory.implants.reduce((acc, id) => acc + (parseInt(IMPLANTS.find(x=>x.id===id)?.slots) || 0), 0);
      const limit = calcDerivedFromChar(c).impl;
      if (used + nextCost > limit) { alert('Превышен лимит имплантов.'); return; }
      arr.push(itemId);
    } else arr.push(itemId);
  }
  renderInventoryTab();
}

function renderHackList(ids, mode='known') {
  const list = (ids || []).map(id => HACKS.find(h => h.id === id)).filter(Boolean);
  if (!list.length) return '<em>нет</em>';
  return list.map(h => `<span class="skill-chip ${mode==='prepared' ? 'rank-2' : 'rank-1'}">RAM ${h.ram}: ${h.name}</span>`).join('');
}

function openHacksEditor() {
  if (currentCharIndex < 0) return;
  openUpgradeModal();
  switchUpgradeTab('hacks', document.querySelectorAll('.upgrade-tab')[3]);
}

function renderUpgradeHacks() {
  const list = document.getElementById('upgrade-hacks-list');
  if (!list || !upgradeChar) return;
  if (!upgradeChar.hacksKnown) upgradeChar.hacksKnown = [];
  if (!upgradeChar.hacksPrepared) upgradeChar.hacksPrepared = [];
  list.innerHTML = HACKS.map(h => {
    const known = upgradeChar.hacksKnown.includes(h.id);
    const prepared = upgradeChar.hacksPrepared.includes(h.id);
    return `<div class="skill-row"><span class="skill-name">${h.name} <small class="skill-base">[RAM ${h.ram}]</small><br><small class="skill-base">${h.effect}</small></span><div class="skill-controls"><label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" ${known?'checked':''} onchange="toggleHackKnown('${h.id}', this.checked)"> знать</label><label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" ${prepared?'checked':''} ${known?'':'disabled'} onchange="toggleHackPrepared('${h.id}', this.checked)"> готов</label></div></div>`;
  }).join('');
}

function toggleHackKnown(id, checked) {
  if (!upgradeChar.hacksKnown) upgradeChar.hacksKnown = [];
  if (!upgradeChar.hacksPrepared) upgradeChar.hacksPrepared = [];
  if (checked) {
    if (!upgradeChar.hacksKnown.includes(id)) upgradeChar.hacksKnown.push(id);
  } else {
    upgradeChar.hacksKnown = upgradeChar.hacksKnown.filter(x => x !== id);
    upgradeChar.hacksPrepared = upgradeChar.hacksPrepared.filter(x => x !== id);
  }
  renderUpgradeHacks();
}

function toggleHackPrepared(id, checked) {
  if (!upgradeChar.hacksPrepared) upgradeChar.hacksPrepared = [];
  if (checked) {
    if (!upgradeChar.hacksPrepared.includes(id)) upgradeChar.hacksPrepared.push(id);
  } else {
    upgradeChar.hacksPrepared = upgradeChar.hacksPrepared.filter(x => x !== id);
  }
  renderUpgradeHacks();
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
