require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL; // e.g. https://mdcrych.github.io/dnd-tg-miniapp

if (!TOKEN) throw new Error('BOT_TOKEN is not set in .env');
if (!WEBAPP_URL) throw new Error('WEBAPP_URL is not set in .env');

const bot = new TelegramBot(TOKEN, { polling: true });

// ─── /start ────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'Искатель приключений';

  bot.sendMessage(
    chatId,
    `🎲 Привет, ${firstName}!\n\nДобро пожаловать в *DnD Character Builder*.\nСоздай своего персонажа — выбери характеристики, навыки и узнай его боевые показатели.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🧙 Создать персонажа',
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    }
  );
});

// ─── /help ─────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '📖 *Команды бота:*\n\n/start — открыть конструктор персонажа\n/help — справка\n/about — о боте',
    { parse_mode: 'Markdown' }
  );
});

// ─── /about ────────────────────────────────────────────────────────────────
bot.onText(/\/about/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '⚔️ *DnD Mini App* — конструктор персонажей в стиле Cyberpunk/DnD.\n\nСоздавай персонажей прямо в Telegram!',
    { parse_mode: 'Markdown' }
  );
});

// ─── Приём данных из Mini App (tg.sendData) ────────────────────────────────
bot.on('message', (msg) => {
  if (!msg.web_app_data) return;

  let char;
  try {
    char = JSON.parse(msg.web_app_data.data);
  } catch (e) {
    bot.sendMessage(msg.chat.id, '❌ Ошибка: не удалось разобрать данные персонажа.');
    return;
  }

  const abilities = char.abilities || {};
  const abilityLines = ['STR','DEX','INT','WIL','PER','TEC']
    .map(ab => `  ${ab}: ${abilities[ab] ?? '—'}`)
    .join('\n');

  const skillLines = (char.skills || []).length
    ? char.skills.map(s => `  • ${s.name} (+${s.bonus})`).join('\n')
    : '  —';

  const kitLabels = {
    merc: 'Уличный наёмник', tech: 'Подпольный техник', netrunner: 'Сетевой беглец',
    ripper: 'Рипердок', agitator: 'Агитатор сцены', fixer: 'Фиксер района',
    agent: 'Корпоративный агент', courier: 'Курьер-призрак',
    pilot: 'Пилот транспорта', dronebuilder: 'Сборщик дронов',
  };
  const originLabels = {
    corpo: 'Корпо-беглец', street: 'Уличный ребёнок', military: 'Военный подрядчик',
    clinic: 'Клинический специалист', media: 'Медиа-активист',
    netrunner: 'Сетевой бродяга', smuggler: 'Контрабандист', cult: 'Культ техно-плоти',
  };

  const report = [
    `✅ *Персонаж создан!*`,
    ``,
    `👤 *${char.name}*`,
    char.concept ? `_${char.concept}_` : null,
    `🌐 Происхождение: ${originLabels[char.origin] || char.origin || '—'}`,
    `🎒 Пакеты: ${kitLabels[char.k1] || char.k1 || '—'} + ${kitLabels[char.k2] || char.k2 || '—'}`,
    ``,
    `📊 *Характеристики:*`,
    abilityLines,
    ``,
    `🛠 *Навыки:*`,
    skillLines,
  ].filter(l => l !== null).join('\n');

  bot.sendMessage(msg.chat.id, report, { parse_mode: 'Markdown' });
});

// ─── Polling errors ────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('[polling_error]', err.message);
});

console.log('🤖 Bot is running...');
