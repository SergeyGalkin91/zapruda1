# ZAPRUDA — сверка PR #1–51 (2026-11-02)

## Архивировано ранее
#1 #4 #5 #6 #7 #8 #9 #10 #12 #14 #15 #17 #20 #22 #23. PR #2 объединён; PR #3 не найден.

## Архивировано сейчас
#43 — один и тот же head commit fc7ea6766bae60bba68b51b67fc4e0ff519f7a7e, что и у #44. PR #43 был направлен в main, #44 — в release/v0.7.0-alpha. Сохранён #44.

## Оставить открытыми
#11 #13 #16 #34 #36–40 — security/DB/staging; нельзя закрыть до проверки миграций и RLS.
#18 — релиз Alpha к main, без merge.
#19 → #21 → #24 — цепочка чата, не независимые версии; #25 отдельная правка UI.
#26 → #28 → #29 → #32 — цепочка Auth/avatar. #32 QA-only, не merge. #33 rollback Storage. #27 diverged от #28.
#40 и #41 diverged от #42, а #45 зависит от #42 — не архивировать автоматически.
#30 #31 — старые ветки TypeScript от main, не переносить целиком без проверки tsc на Alpha.
#35 #46 #50 #51 — docs/новое позиционирование, PR #51 README пока только Draft.
#47 #48 #49 — новые этапы; workflow-патчи навигации и ЛС не гарантируют, что изменения присутствуют в исходниках.

## Кодовая очистка
Компоненты FishingJournal/FishingMapMarks/FishingSessionTracker/FishingSpotsMap/GuideReviews/ReportReview/ReputationAchievements/TrustAchievements/VerifiedFishingSessions отсутствуют в Alpha: удалять нечего.
GuideBookings, InteractiveFishingMap, ReactionBar есть в Alpha и импортируются действующими маршрутами: сохранять.
Полный tree-wide graph импортов, включая динамические импорты, assets, Vite, GitHub Actions, router generation, не был построен. Нет доказанных безопасных удалений файлов из Alpha. Массовое удаление опасно.

## Неполадки для следующего этапа
#47: Shell меняется лишь по ручному workflow, не внутри PR. #48: аналогично messages.tsx. STAGING содержит 5 public tables против 61 production; отсутствие схемы мешает тестам клубов/DM/гидов. Production не менять.

Историю Git не переписывать, ветки не удалять; production, main и Supabase не менять без отдельного решения.