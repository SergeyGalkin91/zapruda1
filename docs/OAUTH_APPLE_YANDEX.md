# ZAPRUDA — Apple ID и Яндекс ID

Проект Supabase: `sonvniuwtvzzyuglscah`.

## Адрес обратного вызова провайдеров

`https://sonvniuwtvzzyuglscah.supabase.co/auth/v1/callback`

Этот адрес указывать в настройках OAuth-приложений Apple и Яндекс. Не путать с адресом возврата на страницу ZAPRUDA после успешной авторизации — приложение использует `<origin>/profile`.

## Apple ID

1. В Apple Developer настроить Sign in with Apple и веб-идентификатор Services ID для настоящего домена приложения.
2. Указать Supabase callback URL выше в Return URLs.
3. Создать необходимые Apple credentials (Team ID, Key ID, Services ID и приватный ключ); добавлять их **только** в Supabase Auth → Providers → Apple, не в GitHub и не в файлы VITE_*.
4. Проверить, что адрес сайта и redirect allow list в Supabase Auth → URL Configuration содержат домен приложения и `<origin>/profile`.
5. Проверить реальный вход и возврат в профиль. Apple может не предоставлять фотографию, а имя и скрытый email предоставлять ограниченно.

Документация: https://supabase.com/docs/guides/auth/social-login/auth-apple

## Яндекс ID

1. В кабинете OAuth Яндекса создать приложение, разрешить подходящие данные пользователя (при наличии согласия: имя/email/аватар).
2. В Supabase Auth → Providers создать кастомный OAuth2/OIDC провайдер с идентификатором `custom:yandex`; заполнить параметры только по актуальной документации Яндекса.
3. Указать Supabase callback URL выше как redirect URI в Яндексе.
4. В конфигурации веб-приложения после успешной серверной настройки выставить `VITE_SOCIAL_YANDEX_ENABLED=true`; до этого кнопка остаётся отключённой.
5. Проверить вход и корректность данных в профиле.

Документация Supabase: https://supabase.com/docs/guides/auth/custom-oauth-providers

## Данные профиля

Приложение уже умеет импортировать доступное имя и HTTPS-аватар из OAuth metadata только если пользователь не заполнил их сам. Email остаётся в Supabase Auth, а не копируется в публичный профиль. Существующие редактируемые данные профиля и рыболовная анкета сохраняются.

## Безопасность и проверка

- Никогда не размещать Client Secret, приватные .p8-ключи, service_role или refresh tokens в публичном коде, репозитории и переменных VITE_*.
- Не включать видимую активную кнопку до настройки провайдера в Supabase.
- Для реальной проверки входа нужны действующий домен и реальные учётные данные провайдера; тестовая сборка CI не проверяет реальный OAuth redirect.
