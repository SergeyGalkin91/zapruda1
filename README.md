# ZAPRUDА: Спиннинг-сообщество

Создай адаптивное веб-приложение ZAPRUDA — современное социальное приложение для спиннингистов.

Язык интерфейса: русский.
Стиль: современный, тёмный, минималистичный, профессиональный рыболовный сервис. Удобная работа на телефоне и компьютере.

Основные разделы:

Главная лента рыболовных отчётов.

Регистрация и вход пользователей.

Профиль рыболова.

Создание отчёта: водоём, дата, погода, давление, ветер, приманки, техника ловли, фотографии и улов.

Карточки пойманной рыбы с видом, весом и длиной.

Комментарии и реакции.

Раздел с рыболовными местами и картой — добавим после запуска основной версии.

Используй React, TypeScript и современный адаптивный интерфейс. Не создавай фальшивую демонстрационную ленту вместо реальных данных.

Важно: у меня уже есть проект Supabase с таблицами profiles, fishing_reports, catches, comments, reactions, follows и report_private_locations. Не создавай дубликаты этих таблиц. Сначала создай интерфейс и предложи подключить мой существующий проект Supabase. После подключения используй реальные таблицы, настрой регистрацию, чтение и создание публикаций с учётом RLS. Не отключай защиту базы и не используй секретные серверные ключи в браузере.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3bae4721-73b5-4293-872e-d10bee6f839d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
