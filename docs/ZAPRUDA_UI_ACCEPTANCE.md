# ZAPRUDA — визуальная приёмка
04.11.2026. **DRAFT; владельческая визуальная приёмка остаётся открытой.** Текущие технические результаты: [FINAL_ACCEPTANCE](ZAPRUDA_FINAL_ACCEPTANCE_20261104.md).
Последние требования владельца, а не старый номер v0.6.0, определяют цель. Направление сохраняется, старые противоречащие палитры не восстанавливаются.

## Источники
CURRENT_PRODUCT_SPEC + DECISION_LOG → последние референсы владельца → UIUX_REFINEMENT (направление) → исторические design locks. PR #111 содержит исходный аудит присланных материалов, не pixel-perfect approval. До сравнения получить точные последние файлы авторизации, чатов, аватаров, главной, СХОДОК, администратора, ИИ и зафиксировать их идентификаторы/хеши. Не выдавать память о картинке за просмотр бинарника.

## Обязательные критерии
**НОВОЕ утверждённое владельцем бренд-направление:** [ZAPRUDA_BRAND_IDENTITY_APPROVED_20261104.md](ZAPRUDA_BRAND_IDENTITY_APPROVED_20261104.md). Вариант Б и тонкая контурная рыбка утверждены как визуальное направление; точные экспортированные SVG, иконки, сменные обои и экраны требуют отдельной проверки. Отказ от старой тяжёлой Z-эмблемы и сильного свечения; тема Electric Blue должна сохранять собственную палитру.
- Matte Black default: графит, электролайм, бренд. Electric Blue: синие поверхности, лайм, баклажановый; никаких старых зелёных карточек/градиентов и старого сиреневого. Выбор в Профиль → Настройки → Оформление переживает reload.
- Фирменный wordmark/рыба, качественное фото с правами использования и fallback, без растяжения/битых внешних URL.
- Компактная композиция, одна ясная основная CTA на экран; нормальный текст ≥14px, метаданные обычно ≥12px, основные tap targets ≥44×44px. Исключения документируются.
- Фиксированные вкладки Лента / Комьюнити / + / Выезды / Чат; safe area, клавиатура и zoom не перекрывают действия.
- 320, 390, 1440 CSS px, обе темы; дополнительно 768 для tablet. scrollWidth ≤ clientWidth на каждом экране.
- Видимый focus, связанные labels, последовательный tab order, объявления ошибок, фокус на невалидном поле; reduced-motion. Контраст WCAG AA проверять измерением: 4.5:1 обычный текст, 3:1 крупный текст и значимые UI границы. Не заявлять общую WCAG-сертификацию без аудита.
- Реальные loading/error/empty states с retry/CTA; нулевой каталог не заполнять фальшивой рыбой/пользователями.
- В консоли нет необработанных ошибок; сеть без запросов к production и без скрытых 4xx/5xx основных данных.

## Исторический исходный план снимков (до d421980)

NOT CAPTURED/PENDING ниже — исходный baseline. Актуальные доказательства — в FINAL_ACCEPTANCE; они отдельно маркируют localhost/STAGING и настоящий hosted Preview.
| Экран | Сценарии | До | После / сравнение |
|---|---|---|---|
| /auth | вход, регистрация, recovery, validation | NOT CAPTURED | PENDING |
| / | populated real feed, empty, error, loading | NOT CAPTURED | PENDING; PGRST200 HTTP reload отдельно |
| /communities | география, клубы, СХОДКИ | NOT CAPTURED | PENDING |
| /reports/new | 3 шага, draft, no-catch, privacy, retry | NOT CAPTURED | IMPLEMENTED; signed-in end-to-end проверяется отдельно |
| /partners, СХОДКИ | каталог, пусто, участие, приватные детали | NOT CAPTURED | PENDING |
| /chat, /messages | комнаты, сообщение, фото, unread, keyboard | NOT CAPTURED | IMPLEMENTED mine/unread/read-state; два JWT проверяются отдельно |
| /street | start/running/finished/import | NOT CAPTURED | IMPLEMENTED ticking timer/reload/import; изоляция проверяется отдельно |
| /profile, /settings | edit, save feedback, themes, gear | NOT CAPTURED | PENDING |
| /assistant, /atlas, SPOT | базовый план, error/empty, реальные данные | NOT CAPTURED | PENDING |
| /admin, /moderation, /finance | guest denied; authorized only if permitted | NOT CAPTURED | PENDING; не выдавать роли тестом |

Каждый набор: deployed SHA/URL, дата, размер, тема, auth role, console/network summary, ссылка before/after и точный референс, наблюдаемые расхождения и исправляющий commit. JWT/PII/доказательства/GPS в артефакты не включать. Снимки рисованных макетов не равны реальному приложению.

## Исправления подтверждённых дефектов
На текущем коде reports.new.tsx содержит 3 шага с явным review/publish, chat.tsx — рабочие mine/unread и серверный read-state, street.tsx — ticking timer и account-scoped storage/import. Старые пункты «длинная форма / disabled фильтры / нет тика / импорт недоступен» описывали исходный аудит и больше не являются текущими дефектами. Реализация не подменяет положительный signed-in Browser E2E, клавиатуру физического телефона или визуальное решение владельца.

## Фактическая проверка 04.11 — продолжение
Cloud Browser открыл preview #93: реальная пустая лента без ошибки FK; browser console не содержит ошибки приложения, только сообщение расширения о metadata. До: чрезмерно крупный hero, техническая метка CONCEPT 01 и слоган только STREET. Исправления d421980: компактнее заголовок, удалена CONCEPT-метка, перечислены разные направления рыбалки, CTA «Новый отчёт» допускает рыбалку без улова. Скриншот before сохранён. After и mobile acceptance проверять по текущему deployed SHA; не переносить старые результаты автоматически.

## Реальный браузерный результат и артефакты
См. [QA evidence](../qa/product-contract/ACCEPTANCE_20261104.md). Cloud Browser 1363px: обе темы, no horizontal overflow, реальная лента без PGRST200, STREET reload+tackle/lures→opt-in report, review after refresh. Это не полный mobile/auth/receipt E2E. Снимки before/after в qa/product-contract. Исторические NOT CAPTURED строки выше отражают первоначальную инвентаризацию; актуальные scoped результаты — в QA evidence.

## Итог visual CI
Run 41768499027, SHA 3fbaa2c4ab4e8803fa3d3bfa6a8e1219d62bdefd: PASS. 320/390/768/1440, Chromium/WebKit/Firefox, обе темы, no horizontal overflow, theme persistence, computed-color audit. Палитра: lime/bright-blue 5.29:1, lime/blue 8.44:1, light/eggplant 7.78:1; это отдельные пары, не общий WCAG аудит. Guest/local isolated build, не авторизованный Netlify mobile E2E. Добавлены CI PNG 390 и 320 в qa/product-contract, просмотрены визуально.

## Актуальный технический результат 2051567
Actual Browser 41777927568 PASS: Chromium/Firefox/WebKit × 320/390/768/1440 × Matte Black/Electric Blue × 10 маршрутов, 243 viewport-снимка после завершения загрузки данных и видимых изображений, no horizontal overflow. Тесты авторизованы настоящими STAGING JWT; admin — только denial, роли не назначались. Полный архив artifact 13298351128, expires 11.11.2026 05:20 UTC. Это localhost frontend, не hosted Netlify: hosted gate BLOCKED_NETLIFY_AUTH. Физическая клавиатура/сеть и owner pixel review открыты. После завершения CI среда стала недоступна, перенос полного архива не выполнен; оригинал остаётся в Actions.

## Actual hosted P0 continuation 04.11
[P0 evidence and exact deployed SHA](ZAPRUDA_P0_CLOSURE_20261104.md): genuine invited Netlify login plus ZAPRUDA login; desktop both themes, private report draft/reload and STREET timer/import checked. Hosted olive STREET gradient and literal backslash-n import defect fixed and captured before/after. Isolated three-engine 320/390 checks PASS. Authenticated hosted 320/390, complete network and two-user transaction checks remain open; desktop screenshots are not mobile evidence.

## FINAL RELEASE INTEGRATION — фактическое продолжение
[Текущий отчёт](ZAPRUDA_FINAL_RELEASE_INTEGRATION_20261104.md). Реальный invited Netlify вход и ZAPRUDA вход восстановлены. Hosted CSS-frame QA при320 выявила обрезку профиля/меню при scrollWidth=clientWidth; e9fd4aa исправляет компоновку и добавляет проверку реальных bounds/44px targets в обе браузерные suites. Clean-cache deploy6aeb663d03e8681d52163b74 успешно разместил e9fd4aa: after profile197–241/menu249–293 в client305,44px targets. 96/96 hosted layout/readiness checks (12 маршрутов×4 размера×2 темы) PASS, данные/ошибки честные:16 случаев с ошибками сводки/гидов. Это single-account CSS iframe, не полный functional E2E или физический телефон. Финальный protected run, signup/recovery, two-user hosted transactions и keyboard/safe area открыты. Снимки и hashes — в текущем отчёте.

## Финальный проверенный код c216963 (04.11, Москва)
26 focused hosted layout/readiness PASS:12 маршрутов на320 Matte Black, плюс Лента/Чат на всех4размерах в обеих темах. Сводка работает с настоящими погодой и источниками; первоначальная ошибка отсутствующей Edge Function исправлена на STAGING. Зависшая декоративная картинка чата получила5s deadline и прежнюю запасную иконку; настоящие вложения не изменены.13 CI PASS,446 tests/37files,5новых thumbnail regressions и9 Deno auth/upstream regressions. Исторические96 проверок e9fd4aa остаются отдельным срезом. Native context-снимки/метрики/ограничения — в [текущем отчёте](ZAPRUDA_FINAL_RELEASE_INTEGRATION_20261104.md). Полный functional hosted и физический keyboard/safe area gate остаются OPEN; guide contract ошибки не скрыты. Исходная Matte Black восстановлена штатным UI и проверена aria-pressed.

## Последнее решение об айдентике
Параллельный commit5564945 добавил [APPROVED brand direction](ZAPRUDA_BRAND_IDENTITY_APPROVED_20261104.md): премиальный вариантБ, минималистичная рыба, тихие опциональные обои. Сохранён без изменения. Точные SVG/иконки, глифы/kerning и прототипы требуют следующего этапа и отдельной визуальной приёмки; текущие скриншоты c216963 не объявляются реализацией нового семейства assets. Ни main/production, ни приоритет старого design lock этим не меняются.
