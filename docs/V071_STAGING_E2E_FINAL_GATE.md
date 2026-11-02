# v0.7.1 — финальная проверка реальных JWT на STAGING

**Статус:** CI проверяет код, но не заменяет HTTP/JWT E2E. Эта инструкция — для владельца с доступом к GitHub Environment Secrets. Никогда не вставляйте пароли в PR, Issues, чат или репозиторий.

## Настройка один раз
1. Откройте https://github.com/SergeyGalkin91/zapruda1/settings/environments и окружение **staging-e2e** (создайте при отсутствии).
2. Добавьте **Environment variable** `ZAPRUDA_E2E_STAGING_URL` = `https://yudtbifopfnjtjanaqrd.supabase.co`.
3. Добавьте **Environment secrets**:
   - `ZAPRUDA_E2E_PUBLISHABLE_KEY`: publishable key проекта **STAGING**, начинается с `sb_publishable_`.
   - `ZAPRUDA_E2E_OWNER_EMAIL`, `ZAPRUDA_E2E_OWNER_PASSWORD`
   - `ZAPRUDA_E2E_SEATED_EMAIL`, `ZAPRUDA_E2E_SEATED_PASSWORD`
   - `ZAPRUDA_E2E_RACER_A_EMAIL`, `ZAPRUDA_E2E_RACER_A_PASSWORD`
   - `ZAPRUDA_E2E_RACER_B_EMAIL`, `ZAPRUDA_E2E_RACER_B_PASSWORD`
   Все четыре аккаунта должны быть уникальными и иметь подтверждённый email в Supabase STAGING. Не использовать production.
4. **Important:** если GitHub Actions не показывает workflow с feature-ветки, сначала проверьте его наличие в Actions UI; не переносите тесты в main без ревью и не используйте production, чтобы «заставить workflow появиться». Отсутствие dispatch — отдельный blocker.

## Ручной запуск
На вкладке Actions выберите workflow `v0.7.1 Competitions real-JWT STAGING race (manual)` или `v0.7.1 Live Edge JWT STAGING E2E (manual)`, затем **Run workflow**, branch `fix/issue61-v071-p0-stages-5-8`.

Для meetups используется workflow `v0.7.1 Meetup real-JWT STAGING E2E (manual)` только из integration branch `release/v0.7.1-integration-20261102`; кроме четырёх перечисленных аккаунтов нужен `ZAPRUDA_E2E_INVITEE_EMAIL/PASSWORD`. Если только четыре аккаунта, отдельного пятого можно не создавать, но роли нужно аккуратно перераспределить в тесте и проверить права — не подставлять ID из production.

## Критерии приёмки
- Все relevant workflows завершились **success** на точном SHA и ссылки на runs сохранены в PR #63.
- Успешно: concurrent last seat, spoofed captain rejected, ownership immutable, meetup private data, xAI once-per-day и live OpenWeather.
- Проверены cleanup QA fixtures и отсутствие секретов в логах.
- Проверка платежей **не** считается выполненной: webhook deliberately fail-closed, провайдер не подключён.
- При отсутствии секретов или невозможности запустить workflow записать **BLOCKED**, не ставить PASS.

**Релиз в production и слияние PR автоматически не выполняются.**
