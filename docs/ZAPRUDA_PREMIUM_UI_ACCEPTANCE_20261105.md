# Premium UI — фактическая STAGING-приёмка, 05.11.2026

**Фиксированный передаваемый SHA:** `9c7fe6e1bf1ee386e910769dac8eb611d50bd08e`; финальные CI/hosted доказательства — в последнем разделе.

**Результат:** утверждённая айдентика и пять экранов внедрены в настоящее приложение. Доступный [Netlify Preview](https://deploy-preview-93--zapruda1.netlify.app/) / [Welcome](https://deploy-preview-93--zapruda1.netlify.app/welcome). Это визуальный STAGING-кандидат, не RELEASE GO.

Первый проверенный UI-кандидат: `4d7d677fac2efbcc23222d7cd363ea26cdfb14a3`, tree `ccb17cec708cb2025762a84fec174efac29a2c15`, [PR #93](https://github.com/SergeyGalkin91/zapruda1/pull/93). Документы и сохранённый контракт: [PR #111](https://github.com/SergeyGalkin91/zapruda1/pull/111). Обычный merge без force-push, без main/production. Netlify site ID `3a98edc7-c77f-45f8-9fe0-7a156c72abf5`, проверенный deploy ID `6aeba942b22736415513b8b5`. Защита доступа Netlify сохранена: на другом устройстве может потребоваться существующий разрешённый Netlify-вход. Новый публичный доступ не выдавался.

## DONE — реализация

Подробности, исходники и контрольная сумма 35 референсов: [implementation](ZAPRUDA_PREMIUM_UI_IMPLEMENTATION_20261105.md). Основной wordmark и рыба — реальные SVG-контуры по исходному утверждённому логотипу; локапы COMMUNITY/SPOT и иконки 32/64/180/192/512. Растровые presentation sheets не загружаются вместо интерфейса, новых сгенерированных референсов нет.

- `/welcome`: рыбка, wordmark, тёмная сцена и работающие переходы.
- `/`: компактная типографика/табы/переходы, настоящие карточки/фото/реакции сохранены, empty/error/retry. Свежая лента пуста; фальшивые отчёты не созданы. Сводка дня переведена на графит и размещена после отчётов.
- `/communities`: поиск стран, выбор реальной географии, чат/Атлас и существующие клубы/СХОДКИ/гиды.
- `/competitions`: SPOT branding, настоящая карта Яндекса, одобренные маркеры/карточки только из разрешённого каталога. Сейчас 0 одобренных точек — карта без выдуманных маркеров. Турниры и KING сохранены.
- `/profile`: настоящие имя/аватар/серверные счётчики, снасти/достижения/настройки и прежняя форма профиля.
- Настройки: четыре независимых фоновых оформления в обеих темах, локальные CSS/SVG без постоянной анимации, reduced-motion и pre-paint allowlist. Старые v1 предпочтения сохраняются.

Нижнее меню: Лента / Комьюнити / + / Выезды / Чат. Electric Blue остаётся полноценной альтернативой; зелёные поверхности не переносились в синюю тему.

## Коммиты реализации

| Коммит | Изменение |
|---|---|
| `818e0d944a78b1eb6c9cc59b2b16fcb7e2b0ec8a` | Бренд, пять экранов, тема/обои и новый браузерный набор |
| `f5831f943213693c4fea537905a503fadcb21ffc` | Графитовая сводка после отчётов, явные hosted bounds/wallpaper metrics |
| `57c23c294026e0378a13a9c57e5d189394745f09` | Живая пятиэкранная QA-страница только для STAGING PR93, точный painted-color wait и корректная essential-control метрика |
| `4d7d677fac2efbcc23222d7cd363ea26cdfb14a3` | Ожидание восстановления выбранных React-контролов после pre-paint bootstrap в WebKit; UI/runtime не изменён относительно 57c23c2 |

Первые два visual CI выявили гонку проверок: dataset готов до painted color/React selected state. Ожидания теперь требуют того же точного цвета и `aria-pressed=true`; проверки не заменены диапазонами/таймаутами и не отключены.

## Настоящий hosted Browser — отдельно от CI

- На `57c23c2`: 40 layout-снимков метрик = 5 экранов × 4 ширины (320/390/768/1440) × 2 темы, Chromium Cloud Browser. 0 overflow, 0 clipped essential controls, 0 чужих Supabase origins. В исходных 13 снимках данные ещё загружались; **это не 40 функциональных/загрузочных PASS**. Исходные значения сохранены, не переписаны.
- На финальном `4d7d677`: пять реально загрузившихся страниц в 390×844 CSS frames — `loading=false`, `overflow=false`, только `https://yudtbifopfnjtjanaqrd.supabase.co`. [Живая галерея](https://deploy-preview-93--zapruda1.netlify.app/__qa/premium.html). Галерея содержит пять настоящих same-origin iframes, не фотографии макета и не имитацию API.
- Пять отдельных native context-снимков 390×640 и один общий 390×844: полный набор, размеры и SHA-256 в [manifest](../qa/premium-ui-20261105/hosted-screenshot-manifest.json). Снимки с настоящим профилем переданы владельцу отдельно, не публикуются в git. Метрики не содержат JWT/контактов/точных GPS.
- Все четыре фоновых оформления после настоящей перезагрузки проверены в Matte Black (`57c23c2`) и Electric Blue (`4d7d677`), 8/8. Matte Black и чистый фон восстановлены штатным UI.
- Настоящий поиск «Россия» открыл ссылку чата страны `RU`; открытие/отмена формы профиля проверены без сохранения личных данных. Редактирование других аккаунтов/создание публичных уловов не выполнялись.

Артефакты: [layout matrix](../qa/premium-ui-20261105/hosted-layout-57c23c2-matrix.json), [final gallery metrics](../qa/premium-ui-20261105/gallery-4d7d677-metrics.json), [five screen metrics](../qa/premium-ui-20261105/five-hosted-screens-4d7d677-metrics.json). Resource Timing показывает origins, не полные headers/bodies/WebSocket trace. Существующая авторизованная STAGING-сессия не заменяет полный multi-account JWT E2E.

## Проверки кода и CI

TypeScript/build/Vitest449/37files и lint(0errors/6 прежних FastRefresh warnings) PASS на первой UI tree; финальные runtime-файлы дополнительно проверяет exact-head CI ниже. Lockfile/package version не изменены. Target `0.7.6 KING FINISH`, технический package `0.7.5`.

Контракт на объединённой документационной tree: все56 IDs/статусы/источники/ссылки сохранены, 7 regression tests PASS. Это сохраняет 8 модулей и 7 KING-титулов, а не объявляет их полностью принятыми. QA page generation:3/3 tests PASS, в production/других PR страницы удаляются, wrong backend/SHA блокируют публикацию.

**Exact HEAD:13/13 ordinary workflows PASS.** [Full machine-readable result](../qa/premium-ui-20261105/exact-head-ci.json).

| Workflow | Result | Run |
|---|---|---|
| Netlify preview STAGING isolation guard | PASS | [run 41920215876](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215876) |
| v0.7.1 Meetup security guards | PASS | [run 41920215877](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215877) |
| Independent Node hosting proof | PASS | [run 41920216154](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920216154) |
| SPOT isolated PostgreSQL transaction races | PASS | [run 41920215910](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215910) |
| ZAPRUDA Docker image smoke test | PASS | [run 41920215811](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215811) |
| Yandex canary Deno typecheck | PASS | [run 41920215978](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215978) |
| Pilot schema PostgreSQL and Deno checks | PASS | [run 41920215917](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215917) |
| ZAPRUDA checks | PASS | [run 41920215999](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215999) |
| Advisor availability without an AI provider | PASS | [run 41920216061](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920216061) |
| ZAPRUDA Frontend Build | PASS | [run 41920215801](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215801) |
| v0.7.1 Meetup mobile browser smoke | PASS | [run 41920216078](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920216078) |
| Report photo privacy browser check | PASS | [run 41920216129](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920216129) |
| ZAPRUDA Electric Blue cross-browser review | PASS | [run 41920215935](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215935) |

Visual workflow:Chromium/Firefox/WebKit,320/390/768/1440,оба оформления; legacy10routes и новый5screen suite PASS. Новая suite:72 checks/40 PNG на каждый engine, всего216 checks/120 PNG. Весь artifact содержит376 PNG. Это изолированный guest build с CI placeholder backend, **не hosted/JWT E2E**. [Artifact13366607933](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41920215935/artifacts/13366607933),42,943,474bytes,SHA-256 `152548a22a8e50b12465f180d2a9205d17f730a29a2860f7d60afac74a9115a7`,GitHub expiry18.11.2026. Архив скачан и проверен.

Exact-head quality log подтверждает449/449 Vitest,37/37 files,TypeScript,lint,build и generated route sync PASS. Docker,Node,PostgreSQL/Deno,photo privacy,advisor fallback и STAGING guard — отдельные PASS, не полнофункциональная приёмка.


## Изоляция STAGING

Netlify preview build pin и runtime browser/server guard используют только `yudtbifopfnjtjanaqrd`. Preview публичные переменные — URL и publishable key, service-role переменных во frontend config нет. Настоящие origins подтверждены финальной галереей. Новых Supabase функций/миграций/RLS/ролей этим UI-заданием не разворачивали. Main, production, DNS, платежи, версии, теги и публичный релиз не менялись.

## PARTIAL / OPEN

- **P1, прежний backend:** `/communities` ниже географии выдаёт реальные ошибки гидов: отсутствуют `guide_profiles.live_sonar_system` и `guide_booking_inquiries`. Ошибки не скрыты, UI не выдаёт их за успешную загрузку. Нужна отдельная сверка схемы/GRANT/RLS и точечная STAGING-приёмка; автоматического копирования production не было.
- **P1, полная функциональная приёмка:** исторический настоящий protected multi-account JWT [41908405475](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41908405475) на4eba367 подтверждён отдельным параллельным обновлением и сохранён в [каноническом доказательстве](../qa/product-contract/PROTECTED_4EBA367_41908405475_PASS.json). Это не новый exact-head JWT4d7d677. KING с законным спотом/независимым разрешённым модератором/evidence и полный hosted transaction flow остаются отдельными gates. Этот запрос UI их не обходит и не блокирует первый Preview.
- **P2, визуальная приёмка владельца:** точность итоговых SVG/кернинга/иконки, мобильная физическая клавиатура/safe area, поведение реального iOS/Android устройства. 390px iframe и WebKit — не тест физического iPhone.
- **P2, следующий UI этап:** остальные модули, фотографии реальных публикаций/полные populated состояния и дополнительные монохромные/adaptive branding экспорты после первого просмотра. Отсутствующие настоящие уловы/споты не подменять фикстурами ради снимка.

**Готово к первому визуальному мобильному просмотру. Полная готовность пилота/релиза не заявляется.**


## Последний сохранённый кандидат — e391c57

`e391c578eff6d9eb717e7dfb9e43e36956307630` добавлен параллельной разрешённой работой и сохранён. Изменение разрешает STAGING-only QA на точном Netlify deployment hostname и маркирует такой build только при compiled STAGING backend; рисунок пяти экранов/палитра/обои не меняются. Исходные4d7d677/57c23c2 снимки и PASS выше остаются отдельными срезами.

**На e391c57 снова13/13 ordinary workflows PASS,449/449 Vitest/37files,TypeScript/lint/build/Docker PASS.** [Exact CI inventory](../qa/premium-ui-20261105/exact-head-ci-e391.json).

| Workflow | Result | Run |
|---|---|---|
| v0.7.1 Meetup security guards | PASS | [run 41921085293](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921085293) |
| SPOT isolated PostgreSQL transaction races | PASS | [run 41921085366](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921085366) |
| ZAPRUDA Docker image smoke test | PASS | [run 41921085209](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921085209) |
| Yandex canary Deno typecheck | PASS | [run 41921084836](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084836) |
| Independent Node hosting proof | PASS | [run 41921084879](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084879) |
| Netlify preview STAGING isolation guard | PASS | [run 41921084557](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084557) |
| Advisor availability without an AI provider | PASS | [run 41921084763](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084763) |
| Pilot schema PostgreSQL and Deno checks | PASS | [run 41921084737](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084737) |
| ZAPRUDA checks | PASS | [run 41921085249](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921085249) |
| ZAPRUDA Frontend Build | PASS | [run 41921084584](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084584) |
| ZAPRUDA Electric Blue cross-browser review | PASS | [run 41921084911](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084911) |
| v0.7.1 Meetup mobile browser smoke | PASS | [run 41921085227](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921085227) |
| Report photo privacy browser check | PASS | [run 41921085273](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921085273) |

Actual hosted gallery вновь проверена на e391c57: все5страниц загрузились,390×844,Matte Black/чистый фон,no overflow,only STAGING origins. Deployed ID `6aebaa9dcba491b547ff1f60`; [метрики](../qa/premium-ui-20261105/gallery-e391c57-metrics.json) и [SHA256 нового native снимка](../qa/premium-ui-20261105/latest-hosted-screenshot-manifest.json). Single-account Chromium CSS frame не объявляется физическим телефоном или multi-account JWT.

[Новый cross-browser artifact13367258225](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41921084911/artifacts/13367258225):42,942,638bytes,SHA256 `b2e67fbaa1c10b684d82d776c34d87861c5433702114e5936214631a50824bbd`,expires18.11.2026. Скачан, hash проверен,120 premium PNG/216checks подтверждены3 JSON summaries (по72/40 на Chromium/Firefox/WebKit). Полный архив включён в переданный владельцу QA ZIP. Host-boundary/generation tests теперь4/4 PASS; product contract7/7 PASS.


## Фиксированный результат P0 — 9c7fe6e

**Постоянный [Netlify STAGING Welcome](https://6aebae0a59ab32e0cc56cdfb--zapruda1.netlify.app/welcome)**,SHA `9c7fe6e1bf1ee386e910769dac8eb611d50bd08e`,deploy `6aebae0a59ab32e0cc56cdfb`. Ссылка получена из Netlify Permalink и действительно открыта в браузере; защита Netlify сохранена. Этот кандидат зафиксирован для передачи владельцу, дальнейший HEAD#93 может развиваться независимо. На телефоне требуется существующий разрешённый Netlify-вход и отдельный обычный вход ZAPRUDA для личного профиля; JWT/пароли между origins не копировались.

Последующая параллельная правка9c7fe6e сохраняется: реальный early-tap дефект устранён — SSR-кнопки темы/обоев/чата/reset disabled до восстановления локальных настроек. Есть явный ready/busy boundary и новая SSR→hydrate→first-choice регрессия. Пять экранов/типографика/навигация не заменены.

**На9c7fe6e:13/13 ordinary CI PASS;450/450 Vitest/38files,TypeScript/lint/build/Docker PASS.** [Exact inventory](../qa/premium-ui-20261105/exact-head-ci-9c7fe6e.json).

| Workflow | Result | Run |
|---|---|---|
| Advisor availability without an AI provider | PASS | [run41923368267](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923368267) |
| v0.7.1 Meetup mobile browser smoke | PASS | [run41923367869](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367869) |
| ZAPRUDA Frontend Build | PASS | [run41923367865](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367865) |
| v0.7.1 Meetup security guards | PASS | [run41923367893](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367893) |
| Report photo privacy browser check | PASS | [run41923368030](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923368030) |
| ZAPRUDA checks | PASS | [run41923367929](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367929) |
| Pilot schema PostgreSQL and Deno checks | PASS | [run41923368006](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923368006) |
| Independent Node hosting proof | PASS | [run41923367783](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367783) |
| Yandex canary Deno typecheck | PASS | [run41923367909](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367909) |
| ZAPRUDA Docker image smoke test | PASS | [run41923367788](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367788) |
| SPOT isolated PostgreSQL transaction races | PASS | [run41923368081](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923368081) |
| Netlify preview STAGING isolation guard | PASS | [run41923367973](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367973) |
| ZAPRUDA Electric Blue cross-browser review | PASS | [run41923367786](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367786) |

Три движка/четыре ширины/две темы снова PASS,новый UI216checks/120PNG. [Artifact13369515438](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41923367786/artifacts/13369515438),42,942,618bytes,SHA256 `e18ae0d0f1cc3fc94b6e22b117ce54df7e07594cedad277ed5601cafe759122c`,скачан и проверен,в переданном QA ZIP. Изолированный guest browser не переименовывается в настоящий JWT E2E.

На постоянном9c7fe6e host штатными UI кликами проверены **8/8 тема×обои после reload**,включая первый выбор после ready. [Реальные pinned метрики](../qa/premium-ui-20261105/pinned-9c7fe6e-wallpapers.json); исходный чистый Matte Black на pinned origin восстановлен. Новый native снимок пяти загрузившихся страниц9c7fe6e на PR93 показывает реальный Carbon,0overflow/0foreign backend; [метрики](../qa/premium-ui-20261105/gallery-9c7fe6e-metrics.json) и [hash](../qa/premium-ui-20261105/final-pinned-9c7fe6e.json). Физическое устройство/full functional/KING остаются OPEN.
