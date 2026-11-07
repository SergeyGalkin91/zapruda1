# Переходы из фактического исходного кода

Код: `37eb39aa92e55607e58234f264da0470c973fe10`. 28 router definitions включают admin-layout и index; это не число различных визуальных экранов.

Общие компоненты имеют условную видимость: login, роль, STAGING, состояние сущности. Таблица не даёт новых прав. Query/hash сохраняются; наличие route не доказывает загрузку backend или anchor. Динамические переходы и все шаги форм проверяются отдельно настоящими JWT/browser E2E.

| Источник перехода | Назначение | Код | Статус route |
|---|---|---|---|
| `shared/conditional component` | `/reports/new` | `src/components/CatchJourneyNav.tsx:5` | registered |
| `shared/conditional component` | `/big-fish` | `src/components/CatchJourneyNav.tsx:6` | registered |
| `shared/conditional component` | `/big-fish#my-catches` | `src/components/CatchJourneyNav.tsx:7` | registered |
| `shared/conditional component` | `/profile#verified-titles` | `src/components/CatchJourneyNav.tsx:8` | registered |
| `shared/conditional component` | `/profile` | `src/components/DailyFishingBrief.tsx:157` | registered |
| `shared/conditional component` | `/auth` | `src/components/FishingAdvisor.tsx:417` | registered |
| `shared/conditional component` | `/analytics` | `src/components/FishingAdvisor.tsx:482` | registered |
| `shared/conditional component` | `/specializations` | `src/components/FishingDisciplineTree.tsx:53` | registered |
| `shared/conditional component` | `/reports/new` | `src/components/PremiumFeedHeader.tsx:12` | registered |
| `shared/conditional component` | `/` | `src/components/PremiumFeedHeader.tsx:18` | registered |
| `shared/conditional component` | `/communities` | `src/components/PremiumFeedHeader.tsx:21` | registered |
| `shared/conditional component` | `/competitions` | `src/components/PremiumFeedHeader.tsx:22` | registered |
| `shared/conditional component` | `/street` | `src/components/PremiumFeedHeader.tsx:25` | registered |
| `shared/conditional component` | `/assistant` | `src/components/PremiumFeedHeader.tsx:32` | registered |
| `shared/conditional component` | `/analytics` | `src/components/PrivateFishingMarks.tsx:323` | registered |
| `shared/conditional component` | `/messages` | `src/components/PrivateFishingMarks.tsx:332` | registered |
| `shared/conditional component` | `/big-fish` | `src/components/ReportBigFishNextStep.tsx:66` | registered |
| `shared/conditional component` | `/` | `src/components/Shell.tsx:30` | registered |
| `shared/conditional component` | `/reports/new` | `src/components/Shell.tsx:31` | registered |
| `shared/conditional component` | `/partners` | `src/components/Shell.tsx:32` | registered |
| `shared/conditional component` | `/communities` | `src/components/Shell.tsx:33` | registered |
| `shared/conditional component` | `/chat` | `src/components/Shell.tsx:34` | registered |
| `shared/conditional component` | `/messages` | `src/components/Shell.tsx:35` | registered |
| `shared/conditional component` | `/assistant` | `src/components/Shell.tsx:36` | registered |
| `shared/conditional component` | `/guides` | `src/components/Shell.tsx:49` | registered |
| `shared/conditional component` | `/analytics` | `src/components/Shell.tsx:52` | registered |
| `shared/conditional component` | `/market` | `src/components/Shell.tsx:53` | registered |
| `shared/conditional component` | `/profile` | `src/components/Shell.tsx:195` | registered |
| `shared/conditional component` | `/auth` | `src/components/Shell.tsx:206` | registered |
| `shared/conditional component` | `/welcome` | `src/components/Shell.tsx:232` | registered |
| `shared/conditional component` | `/competitions` | `src/components/Shell.tsx:241` | registered |
| `shared/conditional component` | `/admin` | `src/components/Shell.tsx:272` | registered |
| `shared/conditional component` | `/moderation` | `src/components/Shell.tsx:282` | registered |
| `shared/conditional component` | `/settings` | `src/components/Shell.tsx:292` | registered |
| `shared/conditional component` | `/auth` | `src/components/SocialGroups.tsx:290` | registered |
| `shared/conditional component` | `/messages` | `src/components/SocialGroups.tsx:482` | registered |
| `shared/conditional component` | `/auth?mode=in` | `src/components/SpotVerifiedProgress.tsx:120` | registered |
| `shared/conditional component` | `/big-fish` | `src/components/SpotVerifiedProgress.tsx:190` | registered |
| `shared/conditional component` | `/competitions#spot-records` | `src/components/SpotVerifiedProgress.tsx:193` | registered |
| `shared/conditional component` | `/messages` | `src/components/VerifiedGuideDirectory.tsx:177` | registered |
| `shared/conditional component` | `/` | `src/lib/error-page.ts:25` | registered |
| `shared/conditional component` | `/` | `src/routes/__root.tsx:30` | registered |
| `/admin/feedback` | `/feedback` | `src/routes/admin.feedback.tsx:135` | registered |
| `/admin/` | `/moderation` | `src/routes/admin.index.tsx:23` | registered |
| `/admin/` | `/finance` | `src/routes/admin.index.tsx:36` | registered |
| `/admin/` | `/admin/feedback` | `src/routes/admin.index.tsx:42` | registered |
| `/admin/` | `/admin/operations` | `src/routes/admin.index.tsx:49` | registered |
| `/admin/` | `/auth` | `src/routes/admin.index.tsx:156` | registered |
| `/admin/operations` | `/admin` | `src/routes/admin.operations.tsx:150` | registered |
| `/analytics` | `/auth` | `src/routes/analytics.tsx:270` | registered |
| `/analytics` | `/profile` | `src/routes/analytics.tsx:305` | registered |
| `/atlas` | `/reports/new` | `src/routes/atlas.tsx:140` | registered |
| `/auth` | `/profile` | `src/routes/auth.tsx:60` | registered |
| `/auth` | `/auth?mode=in` | `src/routes/auth.tsx:216` | registered |
| `/auth` | `/auth?mode=up` | `src/routes/auth.tsx:223` | registered |
| `/big-fish` | `/profile#verified-titles` | `src/routes/big-fish.tsx:27` | registered |
| `/chat` | `/chat` | `src/routes/chat.tsx:314` | registered |
| `/chat` | `/reports/new` | `src/routes/chat.tsx:708` | registered |
| `/chat` | `/auth` | `src/routes/chat.tsx:796` | registered |
| `/chat` | `/messages` | `src/routes/chat.tsx:1404` | registered |
| `/communities` | `/chat` | `src/routes/communities.tsx:45` | registered |
| `/communities` | `/on-spot` | `src/routes/communities.tsx:62` | registered |
| `/communities` | `/atlas` | `src/routes/communities.tsx:124` | registered |
| `/communities` | `/feedback` | `src/routes/communities.tsx:188` | registered |
| `/competitions` | `/big-fish` | `src/routes/competitions.tsx:77` | registered |
| `/competitions` | `/big-fish#my-catches` | `src/routes/competitions.tsx:78` | registered |
| `/competitions` | `/profile#verified-titles` | `src/routes/competitions.tsx:79` | registered |
| `/competitions` | `/on-spot` | `src/routes/competitions.tsx:80` | registered |
| `/competitions` | `/auth` | `src/routes/competitions.tsx:97` | registered |
| `/feedback` | `/auth` | `src/routes/feedback.tsx:173` | registered |
| `/finance` | `/moderation` | `src/routes/finance.tsx:95` | registered |
| `/guides` | `/partners` | `src/routes/guides.tsx:369` | registered |
| `/guides` | `/auth` | `src/routes/guides.tsx:401` | registered |
| `/` | `/reports/new` | `src/routes/index.tsx:431` | registered |
| `/market` | `/` | `src/routes/market.tsx:77` | registered |
| `/market` | `/reports/new` | `src/routes/market.tsx:147` | registered |
| `/messages` | `/auth` | `src/routes/messages.tsx:446` | registered |
| `/moderation` | `/` | `src/routes/moderation.tsx:175` | registered |
| `/on-spot` | `/chat?country=&place=&topic=general` | `src/routes/on-spot.tsx:31` | registered |
| `/on-spot` | `/partners` | `src/routes/on-spot.tsx:34` | registered |
| `/on-spot` | `/communities#community-meetups` | `src/routes/on-spot.tsx:37` | registered |
| `/on-spot` | `/competitions#approved-spot-map` | `src/routes/on-spot.tsx:40` | registered |
| `/partners` | `/guides` | `src/routes/partners.tsx:440` | registered |
| `/partners` | `/auth` | `src/routes/partners.tsx:470` | registered |
| `/partners` | `/communities` | `src/routes/partners.tsx:992` | registered |
| `/profile` | `/reports/new` | `src/routes/profile.tsx:210` | registered |
| `/profile` | `/` | `src/routes/profile.tsx:347` | registered |
| `/profile` | `/auth` | `src/routes/profile.tsx:716` | registered |
| `/profile` | `/settings` | `src/routes/profile.tsx:720` | registered |
| `/profile` | `/assistant` | `src/routes/profile.tsx:799` | registered |
| `/profile` | `/guides` | `src/routes/profile.tsx:1201` | registered |
| `/profile` | `/spearfishing` | `src/routes/profile.tsx:1204` | registered |
| `/profile` | `/feedback` | `src/routes/profile.tsx:1236` | registered |
| `/reports/new` | `/` | `src/routes/reports.new.tsx:694` | registered |
| `/settings` | `/` | `src/routes/settings.tsx:85` | registered |
| `/settings` | `/chat` | `src/routes/settings.tsx:275` | registered |
| `/settings` | `/messages` | `src/routes/settings.tsx:281` | registered |
| `/spearfishing` | `/partners` | `src/routes/spearfishing.tsx:150` | registered |
| `/spearfishing` | `/reports/new` | `src/routes/spearfishing.tsx:154` | registered |
| `/spearfishing` | `/profile` | `src/routes/spearfishing.tsx:158` | registered |
| `/spearfishing` | `/auth` | `src/routes/spearfishing.tsx:211` | registered |
| `/specializations` | `/profile` | `src/routes/specializations.tsx:154` | registered |
| `/specializations` | `/auth` | `src/routes/specializations.tsx:231` | registered |
| `/specializations` | `/reports/new` | `src/routes/specializations.tsx:291` | registered |
| `/specializations` | `/specializations` | `src/routes/specializations.tsx:307` | registered |
| `/street` | `/reports/new` | `src/routes/street.tsx:330` | registered |
| `/street` | `/partners` | `src/routes/street.tsx:363` | registered |
| `/street` | `/chat` | `src/routes/street.tsx:372` | registered |
| `/welcome` | `/auth` | `src/routes/welcome.tsx:32` | registered |
| `/welcome` | `/` | `src/routes/welcome.tsx:35` | registered |
| `/welcome` | `/communities` | `src/routes/welcome.tsx:40` | registered |
| `/welcome` | `/settings` | `src/routes/welcome.tsx:43` | registered |

Критический пользовательский путь и границы: [единая карта](ZAPRUDA_SCREEN_MAP_20261105.md).
