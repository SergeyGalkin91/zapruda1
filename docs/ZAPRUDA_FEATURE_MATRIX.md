# ZAPRUDA — матрица функций и доказательств
Дата: 04.11.2026. Код: PR #93, `652779c74c4189a518555945be1188f7535201fc`.
Статус документа DRAFT. Прочитаны перечисленные экранные исходники и dependency snapshot; имена остальных файлов подтверждены Git tree. Если тест указан, это **существующий тест/путь проверки**, а не новый PASS.

## Статусы и доказательства
- IMPLEMENTED: указанный узкий контракт найден в коде; не подтверждает live.
- STAGING VERIFIED: требуется dated live evidence, SHA, проект и результат.
- E2E VERIFIED: полный пользовательский сценарий с входом, ролью, результатом/артефактом на конкретном SHA.
- PLANNED: полный требуемый контракт ещё не реализован/не доказан; частичный код перечислен явно.
- BLOCKED: установленная зависимость мешает приёмке.
- DEFERRED: только ссылка на явное решение владельца. **Таких переносов здесь нет.**

Пилот: **P0** = необходимое условие уже запрошенной приёмки; **P?** = предлагается включить, требуется решение о составе; **FULL** = полный продукт/поздний этап, обязательство сохранено, это не DEFERRED.

| ID / функция | Пилот | Маршрут / код | Backend / данные | Тест или критерий | Статус и точный недостаток |
|---|---|---|---|---|---|
| AUTH-01 email/password, регистрация/восстановление | P0 | /auth; src/routes/auth.tsx | Supabase Auth | AuthSessionBoundary.test.tsx; реальный signup/confirm/login/recovery | IMPLEMENTED — ветви найдены; live не перепроверен |
| AUTH-02 email gating, безопасный выход/смена пользователя | P0 | auth.tsx; profile.tsx; AuthSessionBoundary.tsx | session + email confirmation | AuthSessionBoundary.test.tsx; два пользователя в одном браузере | IMPLEMENTED — STAGING E2E открыт |
| AUTH-03 Google OAuth | P? | SocialAuthButtons.tsx | provider settings/callback | вход, отказ, callback в preview | BLOCKED — наличие discovery/кнопки не подтверждает настройку |
| AUTH-04 Яндекс OAuth | P? | SocialAuthButtons.tsx; docs/OAUTH_APPLE_YANDEX.md | custom:yandex | реальный callback | BLOCKED — настройка/допуск не проверены |
| AUTH-05 Apple OAuth | FULL | docs/OAUTH_APPLE_YANDEX.md | provider/callback | отдельный live вход | PLANNED — в прочитанном массиве providers Google/Яндекс, Apple не найден |
| FEED-01 лента реальных отчётов/фото | P0 | /; index.tsx:318 | fishing_reports → profiles, report_photos | reload preview без PGRST200 | BLOCKED — PR #110 сообщает применённую FK; HTTP повтор ещё не выполнен |
| FEED-02 комментарии | P0 | index.tsx:179,220 | comments + Realtime | два JWT, вставка/обновление без дубля | IMPLEMENTED — live открыт |
| FEED-03 реакции | P0 | ReactionBar.tsx; report-reaction-toggle.ts | reactions | report-reaction-toggle.test.ts | IMPLEMENTED по источникам; новый live PASS отсутствует |
| SOC-01 подписки | P? | /messages; messages.tsx | follows | два JWT, подписка/отписка, доступ графа | IMPLEMENTED — live открыт |
| SOC-02 городские/региональные/тематические сообщества | P0 | /communities; communities.tsx, SocialGroups.tsx; /chat | social_groups, chat_places | выбрать страну/регион/город/тему; privacy | IMPLEMENTED — гео-навигация найдена, полнота сценария открыта |
| CHAT-01 общий/географический чат | P0 | /chat; chat.tsx | chat_places/chat_messages, ensure_chat_place | GeographicChat.test.tsx; два JWT | IMPLEMENTED — live открыт |
| CHAT-02 ответы/реакции/вложения | P0 | chat.tsx; chat-media.ts | chat_message_reactions/photos; chat-photo-upload/access | GeographicChat.test.tsx; chat-media.test.ts; outsider denial | IMPLEMENTED — серверная и UI приёмка открыты |
| CHAT-03 Realtime без потери draft | P0 | chat.tsx:397; /messages | subscriptions сообщения/реакции/фото | reconnect, два клиента, ввод во время обновления | IMPLEMENTED — live открыт |
| CHAT-04 Мои чаты / реальные unread/read receipts | P0 | chat.tsx:653,662 | модель посещений/read receipts не подтверждена | доставка → unread → прочитано → другой клиент | PLANNED — фильтры disabled; backend нельзя заменить счётчиком UI |
| SOC-03 личные сообщения | P? | /messages; messages.tsx | social_threads/social_messages | заявка/принятие/чужой thread/Realtime | IMPLEMENTED — live открыт |
| SOC-04 поиск напарников | P? | /partners; partners.tsx | partner_trips/requests/messages | приватные детали только участникам | IMPLEMENTED по route/dependency inventory; live не проверен |
| SOC-05 бесплатные СХОДКИ | P? | /communities; SocialMeetups.tsx | meetup_posts/members/messages/private_details | SocialMeetups.test.tsx; e2e-meetups-two-real-jwt.mjs | IMPLEMENTED — occupancy/race проверять отдельно, не платный выезд |
| SOC-06 клубы/создание и модерация | P? | SocialGroups.tsx; /moderation | social_groups, club_creation_requests | e2e-club-two-real-jwt.mjs; реальные права | BLOCKED для полного контракта — snapshot: нет confirm_club_creation_payment; бесплатные группы не объявлять отсутствующими |
| PROFILE-01 профиль/предпочтения/снасти/комплекты | P0 | /profile; profile.tsx; AnglerGearSets.tsx, AnglerTackleCabinet.tsx | profiles, angler_preferences/gear/gear_sets | ProfilePrivateRead.test.tsx; profile-save-feedback.test.ts | IMPLEMENTED — запись/повторное чтение с JWT открыты |
| PROFILE-02 активность/достижения | P? | ActivityAchievements.tsx; progression.ts | my_activity_badges; my_fishing_progress | progression-boundaries.test.ts | IMPLEMENTED по inventory; не означает подтверждённый KING |
| PROFILE-03 подтверждённые титулы в профиле/история | P? | profile.tsx; spot-records.ts | authoritative verified title history | роль, отзыв, stale crown | PLANNED — полный профильный UX не доказан |
| REPORT-01 ввод/черновик/без улова | P0 | /reports/new; reports.new.tsx:79,139 | per-user localStorage; fishing_reports/catches | NewReport.test.tsx; reload/zero-catch | IMPLEMENTED — файлы после reload прикреплять заново |
| REPORT-02 три шага/предпросмотр/поэтапная валидация | P0 | reports.new.tsx:684 | тот же черновик и публикация | back/next/reload на всех шагах, invalid focus | PLANNED — текущий UI длинная форма, wizard не найден |
| REPORT-03 атомарность и идемпотентность | P0 | reports.new.tsx:516; publish_report_with_catches | invoker RPC, private retry receipt | pilot-schema-database.test.ts; NewReport.test.tsx; lost response/retry | IMPLEMENTED — live приёмка открыта |
| REPORT-04 приватность, GPS/EXIF и безопасные фото | P0 | report-photo.ts; report-photo-upload/access | report_photos, private media gateway | report-photo-security.test.ts; report-privacy-database.test.ts; check-report-photo-browser.mjs | IMPLEMENTED — не означает безопасность production legacy media |
| STREET-01 старт/восстановление/завершение, район, рыба/заметки | P? | /street; street.tsx | localStorage zapruda:street-session:v1 | reload, завершение, отказ storage | IMPLEMENTED — только локально, формат не привязан к account |
| STREET-02 самостоятельно обновляемая длительность | P? | street.tsx elapsedMinutes | startedAt/finishedAt | ожидание > минуты без действий | PLANNED — Date.now в render, отдельный ticking effect не найден |
| STREET-03 структурированные снасти/приманки | P? | StreetCatch в street.tsx | пока species/note/at | создать/восстановить выбранные снасти | PLANNED — свободная заметка не равна полному контракту |
| STREET-04 добровольный импорт/приватность/без дубля | P? | reports.new.tsx:182 importStreetSession | локальный источник → draft; isPublic=false | повторный импорт, отмена, публикация один раз | IMPLEMENTED частичный импорт — полный E2E открыт; street.tsx содержит устаревшее пояснение |
| MAP-01 водоёмы/виды/прогресс | FULL | /atlas; atlas.tsx | atlas_waterbodies/fish_species/waterbody_species/my_atlas_progress | загрузка/пустое/ошибка, без ложного прогресса | BLOCKED — эти отношения отсутствовали в snapshot 01:07 UTC; нужен свежий readback |
| MAP-02 приватные точки | P? | PrivateFishingMarks.tsx; /messages | private_fishing_marks | owner/outsider, добровольное раскрытие | IMPLEMENTED по inventory, live открыт |
| SPOT-01 каталог подтверждённых спотов | P? | ZaprudaPublicSpotAtlas.tsx, SpotLeaderboards.tsx | zc_public_spots | approved-spot-map.test.ts; пустой каталог | IMPLEMENTED — не создавать тестовые публичные точки |
| SPOT-02 заявка/доказательства/решение | P? | SpotCatchFlow.tsx | zapruda-spot-records Edge | SpotCatchFlow.test.tsx; spot-v075-live.mjs | IMPLEMENTED — полный live требует реального спота/evidence |
| SPOT-03 пошаговый статус заявки | P? | SpotCatchFlow.tsx | серверные mine/inbox/reviewed/review/revoke | rejected ≠ revoked; owner visibility | PLANNED — выделенный status UX не принят |
| KING-01 KING OF THE SPOT / LENGTH KING | P? | spot-records.ts:70–71; SpotLeaderboards.tsx | spot-records Edge/SQL | spot-records.test.ts; spot-moderation-database.test.ts | IMPLEMENTED — политика найдена; не live награда |
| KING-02 KING OF UL / MICRO KING | P? | spot-records.ts:72–73 | проверка снасти/этики сервером | eligibility/method/min-length/self-review | IMPLEMENTED — чистая политика; полный live BLOCKED зависимостями |
| KING-03 KING OF THE LAKE | FULL | spot-records.ts:74 | waterbody/species verification | карп/амур, территория и допуск | PLANNED для полного продукта — policy есть, запуск не принят |
| KING-04 KING OF THE ICE | FULL | spot-records.ts:75 | region/season/method/species | сезон/территория/отзыв | PLANNED для полного продукта — policy есть |
| KING-05 TROPHY KING | FULL | spot-records.ts:76 | boat/species/scope | вид/территория/подлинность | PLANNED для полного продукта — policy есть |
| KING-06 независимая модерация/no self-review | P0 при KING | SpotCatchFlow.tsx; spot-records Edge | v075_spot_scoped_subscriptions_no_self_review.sql | spot-moderation-database.test.ts; 4 роли real JWT | BLOCKED для live — нужен разрешённый независимый модератор; не назначать фиктивного |
| KING-07 ties/race/revocation/history | P0 при KING | spot-records.ts; SpotLeaderboards.tsx | v075_spot_revocation_recalculation.sql | check-spot-postgres.mjs; concurrent/live revoke | IMPLEMENTED серверная основа; полный history UI PLANNED |
| KING-08 адресные уведомления/согласие/отписка | P0 при KING | spot-records Edge | v075_spot_predecessor_notification_race_guard.sql | scoped subscription, prior holder, retry | IMPLEMENTED основа; full notification UX и live не приняты |
| KING-09 поздравления/трофейные пороги | FULL | UIUX_REFINEMENT spec | активный config не утверждён | verified only; no unapproved threshold | BLOCKED — пороги DRAFT; текстовые варианты требуют сверки |
| ZARUBA-01 батлы/дисциплины/BIG FISH | P? | /competitions; competitions.tsx; spot-records.ts | competitions + SPOT | single fish ≠ total; разные дисциплины | PLANNED для полного объединённого сценария; отдельные части кода есть |
| AI-01 базовый план | P? | /assistant; FishingAdvisor.tsx; fishing-plan.ts | клиентские правила | fishing-plan.test.ts; optional-ai.test.ts | IMPLEMENTED — отделён от AI запроса |
| AI-02 погода/единицы/ошибки | P? | DailyFishingBrief.tsx; weather-units.ts | openweather-current/daily-fishing-brief | weather-units.test.ts; live актуальность | IMPLEMENTED по inventory; live погода не принята |
| AI-03 Yandex primary/backup/Web Search OFF | FULL | FishingAdvisor.tsx; yandex canary Edge | текущий daily-advice отдельно от canary | yandex-ai-provider.test.ts; yandex-canary-live.mjs | BLOCKED — protected live/cutover gate; без переключения маршрута |
| AI-04 квоты/кеш/история/приватность | P0 при AI | FishingAdvisor.tsx; ai-advice-quota.ts | ai_daily_advices; ai_memberships отсутствовал | ai-advice-quota.test.ts; live cache/quota/errors | BLOCKED для полного платного контракта; локальные тесты не live |
| ADMIN-01 закрытый кабинет/роли | P0 | /admin; /moderation | zapruda_admins, RLS | outsider denial; без назначения роли тестом | IMPLEMENTED основа, live открыт |
| ADMIN-02 клубы/гиды/обращения | FULL | moderation.tsx; admin.feedback.tsx; feedback.tsx | guide_verification_applications, community_requests; RPC | полномочия и submit/review JWT | BLOCKED — guide/RPC gaps snapshot; состояние feedback broker перепроверить |
| ADMIN-03 финансы/ожидающие vs реальные платежи | FULL | /finance; finance.tsx | admin_finance_summary | безопасное no-data/error, без фальшивой выручки | BLOCKED — RPC отсутствовал; реальные платежи запрещены |
| MARKET-01 карты/авторы/товары/коммерция/гиды/B2B | FULL | /market; market.tsx; guides.tsx; GuideBookings.tsx | pricing/rights/payment contracts | sandbox/legal/consent/refund | PLANNED полный продукт; экран не равен торговой системе |
| FULL-01 дополнительные дисциплины/подводная рыбалка | FULL | /specializations; /spearfishing | spearfishing_profiles отсутствовал | профиль/приватность/правила | BLOCKED для live по snapshot; требования не удалены |
| UI-01 обе темы/сохранение/5 вкладок | P0 | appearance.ts; styles.css; Shell.tsx | localStorage theme | appearance.test.ts; visual-theme-smoke.cjs | IMPLEMENTED основа; визуальный PASS текущего preview не заявлен |
| UI-02 premium/mobile/accessibility/все экраны | P0 | экраны auth/feed/community/report/trips/chat/profile/admin/AI | реальные loading/empty/error данные | UI_ACCEPTANCE: 320/390/1440 обе темы | PLANNED до браузерного сравнения и исправлений |
| RELEASE-01 защита требований/версии | P0 | CURRENT_PRODUCT_SPEC; RELEASE_GATES; AGENTS.md | change log / owner approval | ручная матрица SHA/evidence/решение | IMPLEMENTED документальный процесс в этом PR; автоматического merge-blocker нет |

## Реестр свидетельств и что они доказывают
- [Quality run 41752421541](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41752421541): metadata повторно прочитана 04.11, completed/success, **SHA 8ac4de73961d853c387f01400979d1d1cddc9a42**, не текущий HEAD 652779c. PR #93 сообщает 410/410 тестов, 32 файла. В этой задаче тесты не запускались, логи всех шагов заново не читались.
- PR #93 ссылается на guest appearance run 41752421360, protected pilot 41750476167 и Yandex 41736781269. Это исторические ссылки, их PASS на текущем HEAD здесь не установлен. Для полного JWT/E2E статуса нужны реальные результаты.
- Backend inventory: [48 dependency contracts](ZAPRUDA_STAGING_DEPENDENCY_MATRIX_20261104.md), snapshot **01:07:53 UTC 04.11.2026**. Это структурная история, не новая SQL-проверка.
- PR #110: FK применена, файл не слит; не воспроизводить миграцию ради этой матрицы.

## Недостающая реализация и следующая работа
P0: HTTP-проверка ленты; actual JWT auth/profile/chat/report; unread/read receipts; трёхшаговый wizard; реальная visual QA.
Далее: ticking STREET timer, структурированные снасти/приманки, исправление противоречащего импорту текста, shared-browser isolation, полноценные SPOT status/history/notifications.
Зависимости: честная модерация/evidence, свежий schema readback, AI live и отдельный cutover, Atlas/guide/admin gaps.
Функция может получить более высокий статус только с привязанным SHA, датой, окружением, шагами/ожидаемым результатом и ссылкой на доказательство. Отсутствие теста записывать прямо.
