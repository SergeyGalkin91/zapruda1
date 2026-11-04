# ZAPRUDA — журнал решений
Обновлено 04.11.2026. Это журнал источников и предложений, не автоматическое утверждение всего PR.

| ID | Дата / источник | Решение / состояние | Последствие |
|---|---|---|---|
| D01 | 03.11, решения владельца «Проверка палитры Electric Blue» | Matte Black default, Electric Blue optional/save | Не менять default; blue/lime/eggplant без зелёных поверхностей |
| D02 | 03.11, те же решения; PR #92 | premium refinement; отчёт 3 шага/autosave; chat → report → mobile → SPOT | Foundations не равны завершённым фазам |
| D03 | 03.11, уточнение STREET/KING | одна крупнейшая рыба, отдельные дисциплины, независимая проверка, адресная смена KING | Личный diary не награждает титулом |
| D04 | 04.11, PR #109 и прямое задание владельца | Продукт обо всех направлениях рыбалки | Старое «только спиннинг» SUPERSEDED; README PR пока не слит |
| D05 | 04.11, прямое исправление ссылки design lock | Использовать самую последнюю утверждённую версию | v0.6.0 не автоматическая текущая инструкция; новый номер дизайна не придумывать |
| D06 | 04.11, приложенное мастер-задание | Сохранить 8 модулей, 7 титулов, STREET, отчёт, AI и общие сервисы | CURRENT_PRODUCT_SPEC + FEATURE_MATRIX — постоянный контракт |
| D07 | 04.11, мастер-задание | Никаких неутверждённых весовых порогов/фиктивных KING | Числа и конфликтующие поздравления в UX-spec не активировать |
| D08 | 04.11, мастер-задание и сообщение владельца | Невыполненное остаётся обязательным либо переносится явно; версия не обновляется автоматически | Требуются release matrix и отдельный GO |
| D09 | 04.11, мастер-задание | Один документальный PR; не объявлять его утверждённым; реализация после согласования матрицы | Дополняем существующий #111, не создаём дубль |
| D10 | 04.11, техническое предложение этой консолидации | P0/P?/FULL состав пилота | **PENDING owner review**, это не DEFERRED и не окончательный scope |

## Разрешение противоречий
**D16 — 04.11.2026: владелец утвердил фирменную айдентику ZAPRUDA (визуальное направление).** Премиальный разреженный наклонный wordmark «вариант Б»; тонкая минималистичная контурная рыбка в том же начертании; ZAPRUDA / ZAPRUDA COMMUNITY / ZAPRUDA SPOT; референсы иконок 01/05/11/20; тихие сменные обои Matte Black, Carbon, Neon Threads, Topographic. Подробнее — [ZAPRUDA_BRAND_IDENTITY_APPROVED_20261104.md](ZAPRUDA_BRAND_IDENTITY_APPROVED_20261104.md). Не объявлять автоматически утверждёнными точный SVG, финальные скриншоты, реализацию обоев или релиз. Решение не меняет G0–G10 и scope KING.

Прямые последние решения → текущая спецификация/журнал → latest approved references → тематические документы; код описывает факт, но не автоматически отменяет требование. При неразрешимом конфликте записать обе версии и получить конкретное решение.
Исторический audit #111 сохраняется, не превращается задним числом в owner approval.
Зарегистрированные конфликты: старые ссылки v0.6.0; старое позиционирование; street.tsx «нет переноса» против импорта в reports.new.tsx; разные лозунги щуки/окуня и DRAFT threshold table. Их нельзя разрешить удалением целой функции.

## Исторические документы и безопасный план
| Источник | Маркировка / замена | Действие |
|---|---|---|
| ZAPRUDA_DESIGN_LOCK.md, ZAPRUDA_DESIGN_LOCK_v0.6.0-admin-rc.1.md | SUPERSEDED как единственный текущий authority; CURRENT_PRODUCT_SPEC/UI_ACCEPTANCE | сохранить референсы, не удалять полезные бренд-правила |
| ZAPRUDA_PROJECT_HANDOFF.md | старые разделы — исторические; текущая точка входа CURRENT_PRODUCT_SPEC/DECISION_LOG | добавить указатель, не менять доказательства |
| ZAPRUDA_CURRENT_SOURCE_OF_TRUTH.md | тематический контекст/история, включённые неподтверждённые числа не часть нового контракта | сохранять; ссылаться по теме, не дублировать обещания |
| UIUX_REFINEMENT и audit PR #111 | direction/evidence источники; поздние прямые решения выше | сохранить draft thresholds как draft |
| main README и старые screenshots | старое позиционирование/палитра SUPERSEDED | README актуализируется отдельным #109; main не трогать |
| SQL/QA/CI/readiness документы | доказательства на указанных SHA/датах | не объявлять superseded целиком и не удалять |

Инвентаризация Git tree выполнена для текущего code SHA; **полная проверка входящих ссылок и build-зависимостей перед удалением ещё не выполнена**. Никаких удалений этим PR. План очистки: rg по путям/имени → проверить Markdown/code/workflows/assets ссылки → список безопасных переносов владельцу → подтверждение → отдельный reviewable change.

## Шаблон следующего решения
ID / дата / точная формулировка владельца / затронутые feature IDs / что заменяет / критерий приёмки / версия вступления / ссылка на approval.
Ни одно решение о DEFERRED, release GO, production, оплатах или AI cutover этим журналом не создано.

## D12 — 04.11.2026: прямое задание владельца на выполнение
Консолидация #111, сохранение всех 56 ID, автоматическая защита, реализация chat/report/STREET и визуальная QA разрешены. PR не объединять, версию не повышать. Нет разрешения на production/main/DNS/платежи. Новая матрица явно отделяет IMPLEMENTED от реальной приёмки.

## Продолжение после d421980
Единственный merge-конфликт — начало PROJECT_HANDOFF; сохранены и source-of-truth указатель, и свежий JWT handoff. Код обновлён с 87592b7 до d421980. Исторический core JWT PASS не потерян; новые UI/read-receipts acceptance открыты. Применена только новая STAGING delta v075_chat_read_state; существующие миграции не переиграны.

## Новое прямое решение — 04.11.2026
| ID | Дата / источник | Решение / состояние | Последствие |
|---|---|---|---|
| D11 | 04.11, прямое сообщение владельца в проектном чате | **Название целевого обновления: `0.7.1 KING FINISH`**; вносить все новые данные и изменения, согласованные в этом обсуждении | Закрепить target в CURRENT_PRODUCT_SPEC/RELEASE_GATES; переносить новые требования в FEATURE_MATRIX и журнал до обновления, не исключать STREET/KING/Atlas/коммерческие модули без согласования; название не равнозначно release GO. Отдельно урегулировать числовой конфликт с существующим техническим кандидатом `v0.7.5 SPOT`, не переименовывать код/теги молча |
| D12 | 04.11, прямое утверждение владельца в проектном чате | **`0.7.6 KING FINISH` вместо `0.7.1 KING FINISH` — окончательное целевое имя следующего обновления** | D11 сохранить как историю заменённого решения, в текущих спецификации и release gates использовать только `0.7.6 KING FINISH`; базовый код остаётся `v0.7.5 SPOT`; это не разрешение на merge, tag, bump, release или production |

## Техническая приёмка продолжения (не новое release GO)
Запрос владельца исполнен кодом d421980, исправлением browser-discovered submit bug 90f3f54 и reset/empty-chat fix 61b5957. Новый exact-head JWT request 3fbaa2c4ab4e8803fa3d3bfa6a8e1219d62bdefd ожидает required reviewer staging-e2e. 424 local tests/34 files, typecheck/lint/build PASS; 6 contract regressions PASS. Один QA report без улова, созданный ошибочным переходом, теперь private; удаление не выполнено из-за истекшего подтверждения. Main/production/version не изменены. Новейшее целевое имя из параллельных решений сохранено без переписывания.

## D13 — 04.11.2026: техническая приёмка и release preparation
Выполнены исправления send-retry/read-summary и пустая защищённая схема Atlas только в STAGING; настоящий JWT и Browser выполняются на exact SHA. Все 56 ID сохраняются. Новые факты в [FINAL_ACCEPTANCE](ZAPRUDA_FINAL_ACCEPTANCE_20261104.md); исторический аудит 8b54b53 сохранён с указателем. Это не owner release GO, не разрешение main/production/version. Устаревшие статусы wizard/unread/timer исправлены без отката дизайна.

## Техническая приёмка 2051567 (не release GO)
Подтверждены настоящие local/STAGING Browser-сценарии чата/отчётов/STREET и загрузившиеся viewport-снимки; hosted доступ остаётся BLOCKED_NETLIFY_AUTH. Исправлены UUID no-catch retry и преждевременный enable чата до загрузки комнаты. Источники 56 функций нормализованы в реальные уникальные пути, нестабильные номера строк убраны; добавлены CSS/workflow/Markdown source checks и седьмой regression. Ни один ID/модуль/титул/scope не удалён и не перенесён. Main/production/version не изменены.

## D14 — 04.11.2026: P0 STAGING continuation
По прямому заданию владельца сохранены 56 требований, 8 модулей и все 7 KING-титулов. На существующей ветке #93 исправлены club message membership correlation и meetup leave/cancel без повышения версии/прав и без production. Две недостающие дельты применены только в STAGING после сверки истории; live rollback regressions не оставили фикстур. Финальный protected run 41850073063 на f3bbe1b ждёт обязательного owner environment review; автоматическая проверка отклонила самостоятельный Approve and deploy. Netlify invited Google login и отдельный ZAPRUDA login выполнены без переноса сессий. Hosted QA выявил и исправил Electric Blue STREET gradient (a671f85) и literal backslash-n при импорте (f3bbe1b); добавлены регрессии. Результаты/границы: [P0 closure](ZAPRUDA_P0_CLOSURE_20261104.md). Это не релизный GO, не перенос или удаление фич.

## D15 — 04.11.2026: FINAL RELEASE INTEGRATION, условное разрешение main
Владелец прямо разрешил обновить main стандартным merge только после прохождения всех обязательных gates, включая hosted/mobile, финальный релевантный JWT, сохранение 56 ID и семи KING. Отдельное повторное разрешение main при выполнении этих условий не требуется. Production SQL/deploy, DNS, платежи, роли, bump/tag/release и force-push не разрешены. Все семь титулов теперь P0 при KING; прежние FULL/P? не являются утверждённым исключением. KING при отсутствии настоящего модератора/SPOT/evidence остаётся BLOCKED и 0.7.6 NO-GO до отдельного scope-решения. Protected run 41850073063 подтверждён SUCCESS на f3bbe1b. Поздняя hosted QA выявила clipping шапки при320; исправление e9fd4aa и новая регрессия требуют финальной проверки. Пять новых feedback fixtures из этого успешного run перечислены отдельно; прежние шесть не удаляются повторно. [Текущий отчёт](ZAPRUDA_FINAL_RELEASE_INTEGRATION_20261104.md).

### Execution evidence after D15 (no new owner waiver)
04.11.2026: e9fd4aa fixes actual320px header clipping;610d0f9 corrects daily brief caller JWT/RLS and is deployed to STAGING only; c216963 bounds stalled decorative room artwork using its existing fallback. No feature ID/status obligation, category, title, production role or release scope is removed. Current source c216963,13 CI PASS,26 targeted hosted cases PASS; full protected/hosted/KING/production gates stay open. The old six QA rows remain absent. Five new exact disposable feedback rows from successful41850073063 are retained pending the separately required owner authorization.


## D17 — 04.11.2026: полное сохранение истории бренда
Владелец прямо потребовал **«зафиксируй все это, чтобы не потерялось ничего»**. Для решения D16 создан [архивный индекс](ZAPRUDA_BRAND_IDENTITY_ARCHIVE_INDEX_20261104.md), 35 исходных изображений упакованы в отдельный ZIP с SHA-256. Индекс сохраняет альтернативы, отметки 03/06 и 01/05/11/20, premium B, геометрию тонкой рыбки, спокойные обои, Carbon, Neon Threads, Topographic, принципы меню и темы. **В GitHub зафиксированы тексты и manifest ссылки; бинарный ZIP пока передаётся владельцу отдельно и требует сохранения в постоянном хранилище.** Ни PR #93, ни main, ни production, ни версия не меняются по данному решению.

## D18 — 04.11.2026: точечная очистка пяти QA feedback и финальный JWT
Последнее прямое разрешение владельца распространяется исключительно на пять UUID из [утверждённого SQL](../qa/product-contract/OWNER_APPROVAL_REQUIRED_feedback_41850073063.sql) в STAGING `yudtbifopfnjtjanaqrd`. Все исходные проверки пройдены, SQL выполнен без изменений, удалено ровно5. Независимый SELECT после COMMIT 20:34:16UTC: метка0, точные UUID0, история отдельного feedback-аккаунта0. [Проверяемые доказательства](../qa/product-contract/FEEDBACK_CLEANUP_41850073063_EXECUTED.json).
Новый protected run [41908405475](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41908405475) создан на `4eba36702a62de0957fb2a0310b0aa6fa8913985`; runtime идентичен c216963, изменён только существующий request marker. На контрольной точке job real-pilot WAITING обязательного environment review `staging-e2e`, не PASS. Новый запуск не даёт права повторно удалять будущие feedback-фикстуры. Старые шесть записей не удалялись повторно.
**Последнее указание владельца прямо запрещает main, Production, реальные пользовательские записи, техническую версию и релиз в этой операции; оно имеет приоритет над прежним условным разрешением D15.** Все56 ID/8модулей/7KING остаются без удаления или исключений; Netlify/KING/release gates продолжаются, статус NO-GO.

## D19 — 05.11.2026: подтверждённый JWT PASS и выполнение Premium UI
Последнее прямое задание владельца: сохранить JWT PASS в PR111, проверить остальные gates и продолжить внедрение уже утверждённого Premium UI (рыбка/карбон/современные экраны) в отдельном STAGING Preview для телефона. Main и Production пока запрещены; bump/tag/release также не разрешены. Утверждение концепции не запрашивается повторно, но фактическое размещение/скриншоты/functional acceptance проверяются на точном SHA.
Защищённый41908405475/4eba367 завершился SUCCESS05.11 в00:21:50MSK после owner environment review. [JWT PASS](../qa/product-contract/PROTECTED_4EBA367_41908405475_PASS.json). Четыре настоящих JWT и actual authenticated localhost/STAGING browser PASS; это не hosted Netlify и не PASS позднего Premium57c23c2. Новый run создал пять новых точных feedback UUID; старое разрешение на предыдущие пять на них не распространяется, никаких удалений этим заданием. Исторические WAITING-срезы D18 не переопределяют новый SUCCESS.
Реализация818e0d9/f5831f9/57c23c2 сохраняет все56 ID/8модулей/7титулов и техническую0.7.5. Новые обои — независимое локальное оформление, не привилегия или релиз. KING/guide/production-restore и полный hosted/physical scope не отменяются визуальным Preview.


## D20 — 05.11.2026: фактическое исполнение Premium UI по D19
Владелец прямо потребовал внедрить утверждённую 04.11 айдентику по пяти исходным изображениям, пять мобильных экранов и четыре обоев в настоящее STAGING-приложение. Это заменяет прежнее ожидание повторного согласования **общей концепции/начала реализации** в D16/D17 и brand/mobile документах. Точные итоговые assets/экраны предъявлены владельцу на визуальную приёмку; это не RELEASE GO. Все56 IDs/8 модулей/7 KING сохранены. Никаких main/production/version/DNS/payment изменений. Фактический код/Preview/тесты/ограничения: [Premium UI acceptance](ZAPRUDA_PREMIUM_UI_ACCEPTANCE_20261105.md).


Финальная сохранённая интеграция P0 UI: `e391c578eff6d9eb717e7dfb9e43e36956307630`,13 CI PASS/449 tests,5 actual hosted screens loaded на390×844,STAGING only. Последующие host-boundary изменения сохранены, исторический JWT4eba367 не переименован в новый JWT PASS. [Полные scoped доказательства](ZAPRUDA_PREMIUM_UI_ACCEPTANCE_20261105.md).


## D20 — техническое продолжение 9c7fe6e (05.11.2026, не новое разрешение релиза)
По тому же прямому поручению внедрены и проверены утверждённые Premium UI/рыба/карбон в отдельном STAGING размещении. Исправлен настоящий ранний тап до hydration; regression проверяет SSR disabled и первый сохраняемый выбор. Код9c7fe6e:13/13 ordinary CI,450tests/38files,40actual hosted layout/readiness комбинаций,8reload-проверок обоев PASS. [Точный отчёт, SHA, фото и границы](ZAPRUDA_PREMIUM_UI_ACCEPTANCE_20261105.md). Все56ID/статусы/8модулей/7KING сохранены. Исторический JWT41908405475 остаётся SUCCESS только на4eba367. Старый QA-marker0;новые5строк оставлены без удаления. KING/guide/полный hosted/device/production readiness не закрыты. Main/Production/version/release запрещены последним заданием. Это evidence продолжения D19/D20, не владелецкий waiver.
