# ZAPRUDA COMMUNITY — GPS/RLS: фактический прогон на STAGING

**Версия:** v0.7.1 с дополнениями. **Дата:** 03.11.2026. **Задача:** #67.  
**СТАТУС:** SQL-проверки изоляции ролей проведены и прошли; **полный Auth API / JWT / Storage E2E ещё НЕ готов**. Это не разрешение выпускать релиз.

## Где тесты
- `supabase/tests/security/zapruda_geo_rls_staging.sql` — выполняемый PostgreSQL SQL regression suite с транзакцией `BEGIN ... ROLLBACK`, **без постоянных тестовых записей**.
- `.github/workflows/staging-geo-rls.yml` — **ручной** безопасный GitHub Actions runner с проверкой STAGING ref в connection URL и `ON_ERROR_STOP=1`; не стартует на каждый push и не применяется к production.

## Что проверено в подключённом STAGING
- Схема `fishing_reports` имеет `latitude,longitude`, но два CHECK constraints не позволяют сохранять точные GPS в этой таблице, включая для приватных отчётов; отдельная `report_private_locations` защищена RLS владельца.
- Guest (`anon`): видит опубликованный отчёт, но не приватный; нет SELECT grant к `report_private_locations`; точный GPS в публичной строке пуст.
- Stranger (`authenticated` + другое `request.jwt.claim.sub`): видит публичную строку, не видит приватную и чужие координаты, не меняет отчёт владельца.
- Owner (`authenticated` + реальный owner sub в STAGING): видит оба отчёта, видит созданные для него приватные GPS и может изменить собственный отчёт.
- Forged admin: злоумышленник подставляет `app_metadata.role="admin"` при обычной `authenticated` роли; **не получает доступа к чужому отчёту и GPS**. Это негативный тест эскалации, **не тест настоящего администратора**.
- Создание/изменение `fishing_reports` с точными GPS отклоняется проверками базы. Тест выполнен на искусственных координатах.
- После `ROLLBACK` агрегированная проверка: **один исходный STAGING-отчёт, ноль публичных, ноль приватных координат, ноль тестовых записей**. Никакой production SQL не запускался.

## Ограничения и блокеры
1. **В STAGING отсутствует public.zapruda_admins**. Администраторское поведение приложения (настоящий разрешённый JWT, read/action scope, audit) НЕ протестировано. Тест имитированной админ-роли НЕ заменяет этот E2E.
2. `SET LOCAL ROLE` и `request.jwt.claim.sub` моделируют PostgreSQL-контекст JWT, а не прохождение настоящего HTTP Auth/PostgREST запроса. Требуются реальные тестовые аккаунты с отдельными access tokens, без передачи секретов в чат.
3. В `fishing_reports` остались SELECT-привилегии на столбцы точных GPS для `anon/authenticated`, но CHECK constraints текущего STAGING не дают сохранять туда значения. Нужна совместимая миграция/тип публичной DTO и исключение секретных полей из клиентского API.
4. **STAGING и production отличаются по триггерам и схеме**, результат одного не гарантирует другой. Сначала безопасный review/миграция в STAGING, потом отдельный approval для production.
5. Не проверены EXIF в фотографиях, Storage RLS/signed URLs, реальные SSR/Network/OG/Map API, ролевые RPC, гонки и переключение public/private. Без них #67 НЕ закрывать.
6. Тест использует уже существующего владельца одного STAGING-отчёта (только UUID внутри транзакции). Если STAGING пуст, тест **правильно завершится ошибкой precondition**; не подменять результат PASS. Для пустого тестового окружения потребуется отдельный Auth/fixtures bootstrap.
7. При миграции модели администратора тест `public.zapruda_admins` намеренно останавливается: надо переписать **положительную** проверку настоящего admin, а не silently пропускать новый контур.

## Как запускать в безопасной среде
Использовать защищённый connection URI **только к STAGING** и `psql` с `ON_ERROR_STOP=1`; не вставлять пароль/URI в Git, PR или чат:

```bash
psql "$STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -f supabase/tests/security/zapruda_geo_rls_staging.sql
```

После проверки/слияния workflow в default branch он становится доступен для ручного запуска по `workflow_dispatch`, если в GitHub Secrets задан `STAGING_DATABASE_URL`. Runner отказывается работать, когда строка подключения не содержит идентификатор разрешённого STAGING. **Никакой автоматической миграции** и постоянной тестовой базы он не создаёт.

## Следующие технические действия
1. Исправить/согласовать схему прав и позитивный admin-сценарий в STAGING.
2. Выполнить **реальные HTTP/JWT тесты** guest/stranger/owner/admin через PostgREST с изолированными тестовыми аккаунтами; добавить проверки DELETE/INSERT, revoke, cache.
3. Проверить Storage/EXIF и что приватный GPS не попадает в HTML/SSR/метаданные/аналитику.
4. Прогнать GitHub CI, проверить миграционный контракт; подготовить доказательства для релизной приёмки.

**Документация:** https://supabase.com/docs/guides/local-development/testing/overview  
**Автор проверки:** ChatGPT / GPT-6. **Без изменений в действующих таблицах или production.**
