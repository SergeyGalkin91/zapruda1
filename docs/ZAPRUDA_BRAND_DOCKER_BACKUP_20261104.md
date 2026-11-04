# ZAPRUDA — сохранение утверждённой айдентики в Docker
**Дата:** 04.11.2026. **Статус:** backup/instructions, не application image, не production release.

## Что создано
- Полный исходный ZIP из **35 изображений**: `ZAPRUDA_BRAND_ARCHIVE_20261104.zip`, SHA-256 `153e4b2ff82d0cb33b0cdfdad571c22df625a50305927e7c849964b7082cd729`.
- **Отдельный локальный Docker build bundle**: `ZAPRUDA_BRAND_DOCKER_BUNDLE_20261104.zip` (28 658 087 байт), SHA-256 `7f902bd05e35a22efd74986360ad1483fcc5094aa7f7ca73efa8fb034ba1407a`. Файлы внутри: `Dockerfile`, `compose.yaml`, `SHA256SUMS`, `README_RU.md`, полный оригинальный ZIP. **Набор подготовлен и проверен, но Docker image НЕ собран/не запущен: в доступной среде отсутствует Docker CLI/daemon.**
- **Сохранение:** скачиваемое вложение в беседе; сам бинарный ZIP и Docker bundle ещё **не загружены в GitHub**, где пока хранятся текстовые спецификации и хеши.

## Сборка на рабочей машине с Docker
1. Сохранить `ZAPRUDA_BRAND_DOCKER_BUNDLE_20261104.zip` в постоянную папку и распаковать.
2. Выполнить `docker compose build`.
3. Проверить: `docker run --rm --network none zapruda-brand-backup:20261104 sh -c 'cd /opt/zapruda-brand && sha256sum -c SHA256SUMS'`.
4. Для переносимого backup образа: `docker save -o zapruda-brand-backup-20261104.tar zapruda-brand-backup:20261104`. Отдельно хранить оригинальные ZIP и tar на диске/в Drive.
5. После переноса: `docker load -i zapruda-brand-backup-20261104.tar`, затем повторить проверку хеша.

**Не добавлять эту коллекцию в production Dockerfile приложения**: `Dockerfile` сейчас содержит Node/Nitro runtime и копирует только .output. Включать все исходные reference boards в клиентский build или runtime нельзя: лишний вес, исторические/нефинальные материалы и неумышленное распространение.

## Где хранится решение
- [Утверждённая айдентика](ZAPRUDA_BRAND_IDENTITY_APPROVED_20261104.md)
- [История/индекс 35 изображений](ZAPRUDA_BRAND_IDENTITY_ARCHIVE_INDEX_20261104.md)
- [UI acceptance](ZAPRUDA_UI_ACCEPTANCE.md)
- [Журнал решений](ZAPRUDA_DECISION_LOG.md)
- [Текущая продуктовая спецификация](ZAPRUDA_CURRENT_PRODUCT_SPEC.md)

## Когда новый дизайн попадёт в приложение — этапы с чёткими условиями
1. **DONE:** владелец утвердил направление (шрифт Б, контурная рыба, иконки 01/05/11/20, две темы, варианты фоновых текстур).
2. **TODO:** отстроить оригинальные векторные мастер-активы: SVG wordmark/рыба/локапы, монохромные версии и production app icons. Это ещё не готово; растровые презентации не заменяют SVG.
3. **TODO:** подготовить живые макеты `Лента / Комьюнити / + / Выезды / Чат`, профиль, STREET, SPOT, меню и `Настройки → Оформление` с wallpaper picker. Проверить дизайн на Matte Black и Electric Blue с Carbon, Threads, Topographic; никакого цветового шума под формами.
4. **TODO:** владелец принимает макеты и точные asset-файлы; явный GO на интеграцию дизайна в code PR #93/отдельную разрешённую рабочую ветку. **Текущее утверждение visual direction не разрешает автоматическую замену работающего UI.**
5. **TODO:** внедрение, размеры 320/390/768/1440, accessibility/contrast, reduced-motion, account-specific wallpaper preference, screenshot diff, Playwright/JWT hosted QA. Сохранить все 56 features, 8 modules, 7 KING titles.
6. **TODO:** только после code review и release gates дизайн может быть объединён в main. Production deploy и публичный релиз отдельно.

**Не обещать дату выхода без утверждённых макетов, готовых asset и закрытых release gates.** В качестве точного критерия ответить владельцу «уже доступно в Preview» только после проверки deployed SHA и реальных скриншотов.
