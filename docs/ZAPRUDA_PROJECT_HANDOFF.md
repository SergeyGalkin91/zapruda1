> **SUPERSEDED как единственная актуальная точка входа (04.11.2026).** Сначала читать [CURRENT_PRODUCT_SPEC](ZAPRUDA_CURRENT_PRODUCT_SPEC.md), [DECISION_LOG](ZAPRUDA_DECISION_LOG.md) и [UI_ACCEPTANCE](ZAPRUDA_UI_ACCEPTANCE.md). Исторические требования ниже не отменяют поздние прямые решения владельца. Референсы и доказательства сохранены; никакого автоматического отката интерфейса.

# Актуальный handoff после настоящего JWT PASS — 04.11.2026

Продолжать только [PR93](https://github.com/SergeyGalkin91/zapruda1/pull/93) → release/v0.7.5-spot; точный HEAD читать из GitHub. [CURRENT_STATE](ZAPRUDA_CURRENT_STATE_20261104.md), [JWT acceptance](ZAPRUDA_STAGING_JWT_ACCEPTANCE_20261104.md), [readiness](ZAPRUDA_V075_SPOT_RELEASE_READINESS.md), [alignment](ZAPRUDA_STAGING_SCHEMA_ALIGNMENT_20261104.md), [matrix](ZAPRUDA_STAGING_DEPENDENCY_MATRIX_20261104.md) имеют приоритет над историческим журналом ниже.

Branch rule исправлено с сохранением reviewers. Run 41759969230/source8273912: core/Realtime/weather + feedback v2 + SPOT negative preflight PASS, owned cleanup подтверждён отдельно. 421 offline tests — не подмена JWT. В STAGING уже применены **8** наших дельт, последняя **20261104021404 v075_feedback_atomic_limits**; feedback **v2**/JWT=true без Telegram. Не повторять старые/adopted миграции и не перезаписывать функцию v1.

Следующее: отдельное явное согласие на read-only GitHub email для Netlify Auth → действительный deploy SHA/env/hosted UI; Yandex canary config YANDEX_KEY_MISSING → настоящий upstream без сброса квот → отдельное разрешение на cutover. Текст Annotations больше не нужен, прежний branch blocker установлен/устранён. 8 missing tables + Atlas view + 6 RPC остаются. Не применять #105 по старому драфту; отдельные evidence/confirmation/view checks. Unconfirmed/live KING/российская мобильная сеть остаются недоказанными gates.

Main, production, DNS, платежи и public release не менять. Существующий PR108 из зеркала в main не объединялся (auto_merge=null); новый дубль не создан. #109 README — отдельный открытый docs PR. Оригинальный AI v14, Yandex canary v2 и legacy keys сохранены. Дизайн v0.6.0-admin-rc.1, обе темы, навигация не меняются.

---

## Исторический журнал до снятия branch blocker

# Передача работы — 04.11.2026: актуальная версия

Сначала читать [CURRENT_STATE](ZAPRUDA_CURRENT_STATE_20261104.md), [SCHEMA ALIGNMENT](ZAPRUDA_STAGING_SCHEMA_ALIGNMENT_20261104.md), [48 dependency contracts](ZAPRUDA_STAGING_DEPENDENCY_MATRIX_20261104.md), [AI acceptance](ZAPRUDA_DEEPSEEK_STAGING_ACCEPTANCE.md), [RELEASE READINESS](ZAPRUDA_V075_SPOT_RELEASE_READINESS.md) и утверждённый UX-spec. PR #93 → SPOT; head определять из GitHub, зеркало work/v075-consolidation-20261104. Не переигрывать уже применённые семь дельт или adopted 000548/000608/001134/002109. STAGING 45 public tables/RLS; новая isolated/component база 410/32.

Приоритет продолжения: прочитать фактический protected pilot JWT run и его cleanup; получить текст недоступных Annotations Yandex run 41736781269; настоящие primary/backup/cache/quota; отдельное разрешение на cutover. Остальные 8 таблиц, Atlas view, 6 RPC и guide/paid differences не считать исправленными. SQL fixtures и guest previews не заменяют JWT. KING: только разрешённый независимый модератор, законный SPOT и подлинное evidence.

Main/production/DNS/платежи/публичный релиз не менять. Оригинальная AI v14 и XAI secrets сохранены; canary v2 отдельна. Закрытые #91/#94/#95 не открывать, дубль PR не создавать. Дизайн v0.6.0-admin-rc.1, обе темы и навигация неизменны. Ниже сохранён **исторический** журнал; его старые blockers/версии не переопределяют current documents.

---

# Актуальное продолжение — 04.11.2026, v0.7.5 SPOT

Сначала читать [текущее состояние](ZAPRUDA_CURRENT_STATE_20261104.md), [приёмку DeepSeek](ZAPRUDA_DEEPSEEK_STAGING_ACCEPTANCE.md), [release gates](ZAPRUDA_V075_SPOT_RELEASE_READINESS.md), [legacy cleanup](ZAPRUDA_LEGACY_CLEANUP.md) и [утверждённый UX-spec](ZAPRUDA_UIUX_REFINEMENT_V075_APPROVED_SPEC.md). Design lock v0.6.0-admin-rc.1 неизменен. PR #93/#92 канонические; #94/#91 закрыты как точные дубли в main. Сверять точный head Actions, а не старое описание.

Актуальный canary v2 уже в STAGING, source readback совпал; protected run 41736781269 блокирован до runner, требуется текст GitHub Annotations. Текущий active original route v14 остаётся legacy. Новая общая граница Auth очищает состояние маршрутов/QueryClient при смене личности и сохраняет его при same-user token refresh.

Приоритет: настоящий Yandex canary upstream и backup → проверенная квота/хранение → отдельное разрешение на STAGING cutover → legacy cleanup. Не требовать очередной смены xAI ключа: последнее отклонение подтверждено read-only диагностикой. Сохранить локальный планировщик, бесплатные СХОДКИ, обе темы и текущую навигацию. Действующий ИИ-маршрут пока не переключён.

Main, production, платежи и публичный релиз запрещены без отдельного разрешения. Ни одного модератора/фиктивного публичного спота не назначать/не создавать ради зелёного теста. Отдельно нужны реальные KING и российский мобильный сетевой замер. Ниже сохранён исторический handoff, не новая дорожная карта.

---

> **ВАЖНО: АКТУАЛЬНЫЙ HANDOFF ПЕРЕНЕСЁН** в [ZAPRUDA_CURRENT_SOURCE_OF_TRUTH.md](ZAPRUDA_CURRENT_SOURCE_OF_TRUTH.md). Все текущие решения Gemini/DeepSeek/Grok, стратегия street-сообщества, бесплатные СХОДКИ, AI PRO/PAY, безопасность и актуальные release gates собраны там. **Текст ниже — исторический журнал; не использовать старые обозначения и прежние инструкции как текущую дорожную карту.**

---

# ZAPRUDA COMMUNITY — единая карточка проекта

Статус: ВИЗУАЛЬНЫЙ ДИЗАЙН УТВЕРЖДЁН владельцем 2026-10-31; программный релиз и публикация пока не утверждены.
Утверждённая дизайн-версия: `v0.6.0-admin-rc.1` (Git tag не создан; это не production release).
Дата: 2026-10-31.

## Источники истины

- Репозиторий: https://github.com/SergeyGalkin91/zapruda1
- Последний ранее подтверждённый зелёный main: `d9f256e4666304bead9d3267446e7c203a25bc3e`.
- PR #5: https://github.com/SergeyGalkin91/zapruda1/pull/5 — исключение ручной активации клуба из клиента, не объединён.
- PR #6: https://github.com/SergeyGalkin91/zapruda1/pull/6 — админ-консоль `/admin`, `/admin/operations`, не объединён.
- Supabase: проект ZAPRUDA COMMUNITY, существующая БД и RLS; не пересоздавать.
- Lovable: проект `3bae4721-73b5-4293-872e-d10bee6f839d`; кредиты исчерпаны.

## ОБЯЗАТЕЛЬНО: ЗАКРЕПЛЁННЫЙ ДИЗАЙН

Источник истины — `docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md` и последний одобренный мобильный макет владельца от 2026-10-31. Старый коллаж административной панели отменён как визуальный референс. Никогда не возвращать к предыдущему белому/серому стилю или иной палитре без нового явного согласования.

## Утверждённые визуальные ограничения

Тёмный чёрно-графитовый фон, акцент `#D7FF35`, приглушённый фиолетовый, рыболовные фотографии Street Fishing, существующий ZAPRUDA-логотип; навигация «Лента · Комьюнити · + · Выезды · Чат». Не создавать фальшивые записи, пользователей, поступления и уведомления.

## Готово в коде ветки feature/admin-console

- единый вход `/admin`, существующая роль `zapruda_admins`;
- ссылки на `/moderation`, `/finance`, `/admin/feedback`, `/admin/operations`;
- только для чтения журнал заявок, бронирований и обращений — НЕ audit log сотрудников;
- поправлен текст автоматической активации клуба после ручного подтверждения платежа.

## Не утверждено / не завершено

- Не выполнены браузерные тесты с admin/non-admin аккаунтами; PR не смержены и не опубликованы.
- Нужны независимые CI по ветке и ревью RLS/RPC под JWT разных ролей.
- Платёжный провайдер отсутствует; нельзя называть административно подтверждённые платежи банковскими поступлениями.
- Серверная RPC `activate_paid_club` остаётся доступной; требуется отдельное устранение дублирующего пути после анализа зависимостей.
- Журнал действий модератора, жалобы, блокировки, разделение owner/admin/moderator — отдельная будущая версия.

## Как продолжать в новом чате

Напиши: «Продолжаем ZAPRUDA COMMUNITY, утверждённый дизайн v0.6.0-admin-rc.1. Прочитай docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md, AGENTS.md и docs/ZAPRUDA_PROJECT_HANDOFF.md. Сначала проверь PR #5/#6 и GitHub Actions; не меняй дизайн, Supabase и production без моего согласия». Обязательно сверяй актуальный HEAD GitHub, не полагайся только на эту карточку.

## Продолжение v0.7.0 — фактическое состояние на 2026-11-01

- Рабочая ветка: `design/approved-v060-mobile-implementation`; черновик PR #14: https://github.com/SergeyGalkin91/zapruda1/pull/14. Приложение: **v0.7.0**. Идентификатор `v0.6.0-admin-rc.1` обозначает только утверждённый **дизайн**, не текущую версию приложения.
- По результатам GitHub Actions для коммита `645790f3` успешно завершились Docker image smoke test, ZAPRUDA checks и Frontend Build.
- Docker-конфигурация в репозитории: `Dockerfile`, `compose.staging.yaml`, `.github/workflows/docker-smoke.yml`; запуск Windows: `scripts/start-staging-docker.ps1` (в обход PowerShell ExecutionPolicy только для отдельного процесса). Инструкция: `docs/ZAPRUDA_V070_DOCKER_STAGING.md`.
- Пользователь **сам подтвердил успешную локальную сборку и запуск** `zapruda-community:0.7.0-staging` и что приложение **открылось в браузере** по адресу `http://127.0.0.1:3080` на его Windows/Docker Desktop. В логе после запуска был `health: starting`; итоговый `healthy` ещё не подтверждён.
- Локальная копия: `C:\Users\Dell\Desktop\ZAPRUDA-v070\zapruda1-design-approved-v060-mobile-implementation` (архив ветки GitHub, поскольку `git` не был доступен в PowerShell). Там создан личный `.env.staging.local` с публичными параметрами STAGING; **не запрашивать ключи в чате, не коммитить этот файл**. Сам пользовательский Docker Desktop недоступен через инструменты ChatGPT; не утверждать, что он изменён удалённо.
- STAGING Supabase: `yudtbifopfnjtjanaqrd`, до завершения сессии проверено 0 public tables и 0 migrations. Поэтому авторизация, профиль и чат с настоящей тестовой БД пока **не подтверждены**. Production Supabase `sonvniuwtvzzyuglscah` не меняли. Атомарный RPC сохранения профиля также не реализован; текущие два запроса могут частично сохраниться.
- Следующий шаг по возвращении: из уже открытой папки PowerShell `docker compose -f compose.staging.yaml ps`, проверить `healthy`; затем безопасно восстановить схему **только STAGING**, тестировать авторизацию/профиль с тестовым аккаунтом. Не возвращаться к переустановке Docker, Supabase CLI или Git и не просить заново публичный ключ.
- **НЕИЗМЕННЫЙ ДИЗАЙН:** `docs/ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md`; тёмный графит `#070B10`, лаймовый акцент `#D7FF35`, приглушённый сиреневый, рыболовные street-fishing фото, утверждённый логотип, мобильная навигация. Старый белый/серый стиль не возвращать. Никаких изменений дизайна без явного согласования.
- PR #14 оставить черновиком, `main` не менять и ничего не выкладывать в production без отдельного одобрения и STAGING-проверок.

## Уточнение владельца: главный визуальный референс (2026-11-01)

Владелец отдельно подтвердил: **основной визуальный эталон — изображение с ПЯТЬЮ мобильными экранами** под заголовком «ZAPRUDA COMMUNITY | v0.6.0-admin-rc.1 — утверждённый единый визуальный стиль», предоставленное в чате как `ЗАПРУДА ВИЗУАЛТОПОВЫЙ!!!!!!!!!.png`. Это уточнение **имеет приоритет над ранее приложенным PDF «0.7.0 РД запруда.pdf»** в вопросах визуального оформления. PNG получен в чате; его бинарное содержимое этой записью **не добавлено** в GitHub — не выдавать ссылку на несуществующий файл репозитория.

Макет показывает: (1) вход в сообщество на фоне рыбалки на закате, (2) список тематических чатов, (3) переписку с фото, (4) кабинет администрации, (5) экран финансов. Стиль: практически чёрный/графитовый интерфейс, кислотно-лаймовый `#D7FF35`, мягкие сиреневые акценты, рыболовные фотографии с тёплым закатом, яркий рукописный логотип ZAPRUDA и контрастная мобильная нижняя навигация с лаймовой кнопкой «+». **Сохранять композицию, визуальную плотность, настроение и иерархию этого референса. Не возвращать более старые варианты дизайна.** Название дизайн-фиксации `v0.6.0-admin-rc.1` не изменяет текущую версию приложения `v0.7.0`.

## Продолжение выравнивания схемы — 04.11.2026

Последующая сверка обнаружила уже применённые дельты catches/comments (20261104000548/000608) и geographic text chat (20261104001134): прежние 31/22 — исторический срез. Эти дельты приняты как baseline и повторно не накладываются. Подготовлены атомарное report+catch сохранение с retry receipt, защищённые chat photos без прямого Storage signing, private gear/marks и необходимые profile aggregates/activity. [План, контракты, rollback и фактические gates](ZAPRUDA_STAGING_SCHEMA_ALIGNMENT_20261104.md). Состояние новых hosted deploy и точный CI смотреть в evidence этого документа; подготовленные SQL/скрипты сами по себе не являются PASS.
