# ZAPRUDA — финальная техническая приёмка 04.11.2026

**Техническая база 0.7.5 SPOT; целевой релиз 0.7.6 KING FINISH. NO-GO для main/production.** Номер пакета не изменён. Это результат исправлений и проверок, а не разрешение выпуска.

## Кандидат и изменения

Код PR #93: `22f19cdff33f14554e58d31e9005da4dce722dcc`, ветка `feat/ai-yandex-deepseek-staging`. PR #111 синхронизируется с этим кодом без force-push и без объединения PR. Все 56 исходных feature IDs сохраняются.

| Коммит | Изменение | Требования |
|---|---|---|
| 8b54b53 | Один UUID отправки сообщения сохраняется при потерянном HTTP-ответе; проверка committed-row recovery; настоящий authenticated browser harness в существующем protected workflow | CHAT-01/02/03/04, REPORT, STREET, UI |
| 03873ac | Исправлен TS2769 регрессии; unread Realtime ждёт PostgreSQL и обновляет summary после SUBSCRIBED/reconnect | CHAT, G8 |
| d41f02f | Пустой реальный Atlas schema contract, owner-only claims, published-only catalog, invoker view; SQL security tests; browser retry после потерянного publish RPC ответа | MAP-01, G3/G5/G7 |

Ранее реализованные mine/unread, три шага, private default и account-scoped STREET сохранены. Повторная реализация проекта не выполнялась.

## Проверки на данном SHA

Локально **426 tests / 35 files PASS**, TypeScript PASS, ESLint 0 ошибок / 6 прежних warnings, build PASS. [Quality CI](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41772072020) PASS. [JWT d41f02f](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41772065215): core API, feedback и SPOT-negative steps PASS; Browser не стартовал из-за неверного import expect. Исправлено 9eb5812. Повторный 41772852761: core и SPOT PASS, feedback BLOCKED непустой историей QA (новых обращений не создано), Browser skipped. b2c67da добавляет независимый сбор Browser evidence с сохранением общего FAIL; [новый запуск](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41773106789) ещё выполняется. Browser/frontend здесь исполняется в GitHub runner на localhost с настоящим backend STAGING — это не hosted Netlify browser proof.

[Сохранённый безопасный API/JWT результат](../qa/product-contract/JWT_D41_41772065215.json).

## Исправление дефекта, найденного настоящим Browser

Запуск b2c67da действительно вошёл двумя пользователями и прочитал Atlas через JWT, но отправка чата не прошла: INSERT(id) отсутствовал в column grants. 22f19cd добавляет `v075_chat_client_message_identity.sql`, применённую только в STAGING как `20261104043020`. Readback: authenticated INSERT(id)=true; table INSERT=false, anon INSERT(id)=false, UPDATE(id)=false, RLS=true. Изолированный SQL regression: собственный UUID работает; collision, смена id, чужой user_id и guest запрещены. 30/30 pilot-schema tests PASS; TypeScript и targeted ESLint PASS. Также исправлен Prettier harness. Повторный [41773619158](https://github.com/SergeyGalkin91/zapruda1/actions/runs/41773619158) выполняется.

## STAGING и ограничения

Проект `yudtbifopfnjtjanaqrd`: **50 public tables, все 50 с RLS**. Первая schema delta этой приёмки: `20261104041357 v076_atlas_catalog` из `supabase/staging/v076_atlas_catalog.sql`. Существующие migrations не переигрывались; PR #105 не объединялся и не применялся целиком.

Atlas: четыре таблицы, default is_published=false, нет клиентской записи в каталог/самоподтверждения; `my_atlas_progress security_invoker=true`; заявка требует собственного улова/отчёта и готового безопасного фото. Реальных водоёмов в каталоге 0; никаких выдуманных сущностей. Изолированные SQL tests проверили собственные/чужие доказательства и запрет самостоятельного verified.

Остаются отсутствующими таблицы `ai_memberships`, `guide_booking_inquiries`, `guide_verification_applications`, `spearfishing_profiles` и RPC `accept_guide_quote`, `admin_finance_summary`, `cancel_guide_booking`, `confirm_club_creation_payment`, `quote_guide_booking`, `review_guide_application`. Это блокеры соответствующих функций, не повод удалить их из 56-ID матрицы.

**KING BLOCKED:** 0 разрешённых независимых модераторов, 0 approved public SPOT, 0 verified catches. Ни одна роль, точка или титул не подделаны. Изолированные policy/race tests и JWT negative authorization не доказывают положительную цепочку submit→verify→winner→history→revoke→notify. Полный KING FINISH не принят.

AI: canary diagnose отделён от upstream; диагностический ответ сам по себе не доказывает primary/backup/cache/quota. Cutover не выполнен, ключи не копировались и квоты не сбрасывались.

## Сопоставление с main и безопасный путь

Read-only main: `0d787d8e615dde821ca326fec1eeb6b9ef4ac15d`. Он является предком кандидата. Локальное полное сравнение: **424 коммита, 320 файлов** (для b2c67da; на d41f02f — 422 коммита) (GitHub compare ограничивает выдачу 300 файлами). `git merge-tree --write-tree main b2c67da` завершился без конфликтов, дерево `9440408fb96d52e43fd9961da2bcd3745310e7e4`. Это проверка Git, не технический допуск production.

Production read-only metadata: `chat_read_state` и RPC `mark_chat_read`, `chat_room_read_summary`, `publish_report_with_catches` отсутствуют; migration history заканчивается `20261101204210`. На fishing_reports.latitude/longitude сохраняются column grants anon/authenticated. Наличие grants само по себе не доказывает утечку через RLS, но требует закрыть расхождение ACL и отдельно проверить legacy media до выпуска. Main сейчас безопасно обновлять **нельзя**: приложение и production schema не согласованы.

До любого будущего разрешённого rollout:

1. Заморозить exact SHA, принять scope по ID, завершить открытые gates и review #111. Снять backup schema/data и текущий deploy artifact; проверить восстановление в отдельном окружении.
2. Сопоставить production с STAGING по каждой migration, grants/RLS/RPC/Storage/Edge и env **без слепого replay STAGING history**. Подготовить отдельную additive migration последовательность и dry-run. Секреты не помещать в Git/артефакты.
3. Подтвердить frontend env STAGING/production, publishable-only bundle, разрешённые origins/OAuth callback, Edge JWT и актуальность deployed SHA. DNS/платежи/AI cutover — отдельные разрешения.
4. После отдельного owner GO выполнить согласованный release путь; canary health/auth/feed/report/chat/media, затем решение о дальнейшем трафике. Версия/tag/production не меняются этой задачей.
5. При frontend регрессии восстановить сохранённый предыдущий build/deploy, сохранив additive database compatibility. Не откатывать БД DROP/CASCADE и не удалять пользовательские данные. Для нарушения privacy — остановить соответствующую функцию и применить согласованный forward permission fix; data restore только из проверенного backup по отдельному решению.

## Настоящий Netlify Preview

[Hosted Atlas](https://deploy-preview-93--zapruda1.netlify.app/atlas?country=): Cloud Browser подтвердил нормальное пустое состояние без schema error, 0 водоёмов. [Реальный снимок](../qa/product-contract/atlas-real-empty-20261104.jpg), guest/desktop/Matte Black. Netlify status на b2c67da — success / Deploy Preview ready; снимок сделан на deploy `6aeab320c0e8ed0c6de1dc4c` (точный SHA этого deploy отдельно не установлен). Снимок не является authenticated mobile proof.

## QA-данные

Одна старая private zero-catch запись от wizard auto-submit bug сохраняется: точное совпадение UUID/владельца/заголовка/времени проверено, фото/уловов/комментариев/реакций/private locations/receipts нет. Удаление отдельно требует действующего подтверждения; массовая очистка не выполнялась. Новые browser fixtures удаляются только собственным JWT по уникальному run prefix с проверкой cleanup.

## Открытые gates

Полный KING, production schema/privacy convergence, реальный hosted Netlify signed-in mobile QA, физическая клавиатура/сеть, owner visual/scope approval, OAuth/recovery и остальные зависимости остаются открытыми. Зелёный CI не означает release GO. Ни main, ни production, ни DNS/платежи/версия/теги не изменены.
