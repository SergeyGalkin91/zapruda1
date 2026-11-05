# ZAPRUDA COMMUNITY v0.7.1 с дополнениями — release preflight

Дата: 03.11.2026, Europe/Moscow. Область: кандидат PR #63 и ранее утверждённое оформление из PR #77. Это не объявление production-релиза.

Владелец поручил исправлять ошибки, проводить проверки и выпускать релиз после приёмки. Повторное общее разрешение на выпуск не требуется. Непройденные обязательные проверки остаются блокерами.

## Исправления

- Полная строгая проверка TypeScript проходит. Настройки strict, noUncheckedIndexedAccess и exactOptionalPropertyTypes сохранены.
- Удалены unchecked `any`-приведения клиента. Существующая схема сохранена; типовой контракт расширен только отсутствовавшими таблицами/RPC из read-only снимка STAGING. Это не миграция и не доказательство соответствия production.
- Исправлены nullable/optional значения, обработка фотографий, PromiseLike-контракт сохранения профиля, границы рангов и зависимости React hooks.
- Маршрут `/admin` разделён на layout с Outlet и index. `/admin/operations` и `/admin/feedback` теперь имеют собственные маршруты, а не скрываются страницей кабинета. Сгенерирован актуальный routeTree.
- Устранены ошибки общего lint, включая форматирование исходников. Остались шесть предупреждений Fast Refresh в существующих UI-компонентах; ошибок нет.
- В CI typecheck и lint обязательны, continue-on-error удалён. Добавлена проверка отсутствия дрейфа сгенерированных маршрутов. Установка зависимостей использует frozen lockfile и Bun 1.4.4.
- Статические safeguards читают синтаксические токены, сохраняя исходные проверки вместимости и изоляции preview независимо от форматирования/кавычек. Комментарии не считаются исполняемым кодом.
- Browser smoke дополнен гостевыми `/admin`, `/admin/operations`, `/admin/feedback`, `/competitions` на 390/1280 px. Гостевой прогон не заменяет JWT/RLS-проверки.
- Утверждённый Electric Blue включён в кандидата; Matte Black остаётся default. Его отдельный browser workflow запускается также для интеграционного PR.

## Завершённые локальные проверки

| Проверка | Факт |
| --- | --- |
| `npm run typecheck` | PASS, без ошибок, до и после сборки |
| `npm run lint` | PASS, 0 ошибок / 6 предупреждений Fast Refresh |
| `npm test -- --maxWorkers=2 --reporter=dot` | PASS, 166 тестов / 14 файлов |
| `npm run build`, Nitro node-server | PASS, client + SSR |
| Meetup safeguards / preview isolation | PASS, статические проверки |
| Migration filename audit | PASS для новых конфликтов; три исторические группы требуют отдельного согласования |
| `git diff --check` | PASS |

Результаты GitHub Actions и скриншоты проверяются на точном опубликованном SHA и приводятся в описании PR #63. Наличие workflow не считается его успешным выполнением.

## Две Edge-функции в STAGING

После offline handler-тестов обновлены только `openweather-current` и `zapruda-daily-advice` в проекте `yudtbifopfnjtjanaqrd`. Обе ACTIVE v5, `verify_jwt=true`. Полное чтение исходников обратно подтвердило побайтовое совпадение с локальными файлами.

| Функция | SHA-256 исходника | Реальный POST без авторизации |
| --- | --- | --- |
| openweather-current | `8c20ade3c2c0123e5e34f44a7f34c56f6ac51064e522fd30506d159ae7eeac5a` | HTTP 401 |
| zapruda-daily-advice | `0f8a636da8986af3c2954da2e4c13db3158289d8fa081f2088abe8071e609d95` | HTTP 401 |

401 подтверждает отказ на входе, а не работу провайдера с действующим JWT. Схема/права БД, Auth-пользователи и production в этой работе не изменялись. Другие Edge-функции не развёртывались.

Read-only security advisors сохранили известные замечания: owner-scoped SECURITY DEFINER helpers, две закрытые RLS-таблицы без policies и отключённая проверка утёкших паролей. Права автоматически не расширялись. Справка: [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS без policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [защита паролей](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Открытые обязательные условия

1. Реальные authenticated live E2E: соревнования, СХОДКИ/последнее место, Grok и OpenWeather — **0/4 подтверждённых PASS**. Последний read-only счёт Auth: 3 аккаунта, 2 подтверждённых; нужны четыре разных подтверждённых пользователя. В рабочей среде отсутствуют все девять E2E bindings. Защищённые credentials и review окружения настраиваются по [runbook](V071_STAGING_E2E_RUNBOOK.md); пароли не включаются в исходники или переписку.
2. Публичный запуск с геоданными/фото: открытый [P0 #67](https://github.com/SergeyGalkin91/zapruda1/issues/67) — STAGING/PROD drift, публичные legacy GPS-поля, безопасные фото без EXIF и реальные ролевые тесты. Этот preflight не закрывает его.
3. Production rollout: проверить совпадение схем, backup/restore и рабочую конфигурацию целевого хостинга; выполнить миграции/публикацию только после приёмки. Текущий зелёный frontend CI не разрешает автоматически копировать непроверенную схему.
4. Реальные оплаты, платные точки и автоматические выплаты не приняты и не включаются этим релизным preflight.

Итог: технические блокеры typecheck/lint устранены, кандидат подготовлен к дальнейшей приёмке. Публичный production-релиз не подтверждён.
