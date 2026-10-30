# ZAPRUDA: закрытая бета

Статус: подготовка. Публичное развертывание ещё не выполнено.

## Развертывание
- Для TanStack Start SSR подходит Cloudflare Workers с отдельной конфигурацией Vite: https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- Текущую Docker-конфигурацию не заменять.
- Разрешить доступ только приглашённым 5–10 пользователям через Cloudflare Access: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Убедиться, что защищены и production, и preview URL.
- Настроить авторизацию Supabase на новый домен и проверить HTTPS.
- Использовать staging Supabase для теста, если возможно.

## Тесты
Проверять /beta, /feedback, /fishing-map, /achievements, профиль, отчёт, реакции, карту глубин.
Собирать: устройство, браузер, шаги воспроизведения, ожидаемое и фактическое поведение.
Не передавать реальные секретные точки и пароли.

## Замечания
Страница /beta не является защитой доступа. Публичной ссылки пока нет. Для подключения облака владелец должен авторизовать Cloudflare. Обратная связь уже принимается через существующую /feedback.
