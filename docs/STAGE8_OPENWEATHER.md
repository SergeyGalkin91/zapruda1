# Stage 8 — OpenWeather API

## Что сделано
1. Edge Function `openweather-current` — текущая погода по городу или координатам.
2. `daily-fishing-brief` — если задан `OPENWEATHER_API_KEY`, погода берётся из OpenWeather, иначе Open-Meteo (fallback).
3. Форма `/reports/new` — кнопка «Подставить из OpenWeather» заполняет погоду, температуру, давление (мм рт. ст.), ветер.

## Секреты (Supabase → Edge Functions → Secrets)
- `OPENWEATHER_API_KEY` — ключ с https://openweathermap.org/api
- Алиас: `OPENWEATHERMAP_API_KEY`

## Деплой STAGING
```bash
supabase functions deploy openweather-current --project-ref yudtbifopfnjtjanaqrd
supabase functions deploy daily-fishing-brief --project-ref yudtbifopfnjtjanaqrd
```

## Безопасность
- Ключ только в Deno.env, не в `VITE_*`.
- Вызов требует Bearer-сессию пользователя.
- Координаты пользователя в ответ не логируются на клиенте сверх полей формы.

## Не трогать
main, production SQL, design lock.
