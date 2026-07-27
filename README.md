# 🎲 DnD Character Builder — Telegram Mini App

Конструктор персонажей в стиле Cyberpunk/DnD, работающий как Telegram Mini App.

## Структура проекта

```
├── index.html       # Фронтенд Mini App
├── app.js           # Логика конструктора персонажа
├── style.css        # Стили
└── bot/
    ├── bot.js       # Telegram бот (серверная часть)
    ├── package.json
    ├── .env.example
    └── .gitignore
```

## Быстрый старт

### 1. Фронтенд (GitHub Pages)

Фронтенд уже хостится на GitHub Pages:
```
https://mdcrych.github.io/dnd-tg-miniapp
```
Ничего дополнительно настраивать не нужно.

### 2. Бот-сервер

```bash
cd bot
npm install
cp .env.example .env
# Отредактируй .env — вставь токен бота и URL GitHub Pages
npm start
```

### 3. Настройка в @BotFather

1. `/newbot` — создай бота, получи `BOT_TOKEN`
2. `/setmenubutton` → выбери бота → введи URL: `https://mdcrych.github.io/dnd-tg-miniapp`
   (кнопка появится рядом с полем ввода)
3. `/setcommands` → вставь:
   ```
   start - Открыть конструктор персонажа
   help - Справка
   about - О боте
   ```

## Как работает

1. Пользователь отправляет `/start` → бот отвечает кнопкой «Создать персонажа»
2. Открывается Mini App (GitHub Pages) прямо в Telegram
3. После заполнения нажимается кнопка «Сохранить» → `tg.sendData()` отправляет JSON персонажа боту
4. Бот получает данные через `web_app_data` и отправляет красивую карточку персонажа в чат

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `BOT_TOKEN` | Токен бота от @BotFather |
| `WEBAPP_URL` | URL фронтенда (GitHub Pages) |
