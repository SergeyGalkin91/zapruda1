import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Monitor,
  RotateCcw,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { LiquidDropPreview } from "@/components/LiquidDrop";
import { LiquidDropArtwork } from "@/components/LiquidDropArtwork";
import { supabase } from "@/integrations/supabase/client";
import {
  APP_BACKGROUNDS,
  APP_WALLPAPERS,
  CHAT_BACKGROUNDS,
  DEFAULT_APPEARANCE,
  DEFAULT_LIQUID_DROP,
  LIQUID_DROP_STYLES,
  loadAppearance,
  applyAppearance,
  saveAppearance,
  type Appearance,
  type LiquidDropAppearance,
} from "@/lib/appearance";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки оформления — ZAPRUDA COMMUNITY" },
      { name: "description", content: "Настройка фона приложения и фона чатов." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [appearanceReady, setAppearanceReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [developer, setDeveloper] = useState(false);
  const [yandexKey, setYandexKey] = useState("");
  const selectableBackgrounds = APP_BACKGROUNDS.filter(
    (item) => item.value === "classic" || item.value === "electric-blue",
  );

  useEffect(() => {
    const saved = loadAppearance();
    setAppearance(saved);
    applyAppearance(saved);
    setAppearanceReady(true);
    try {
      setYandexKey(localStorage.getItem("zapruda.yandex_maps_api_key") || "");
    } catch {
      // Keep the default key when browser storage is unavailable.
    }
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: role } = await supabase
        .from("zapruda_admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      setDeveloper(Boolean(role));
    });
  }, []);

  function change(next: Appearance) {
    if (!appearanceReady) return;
    setAppearance(next);
    const persisted = saveAppearance(next);
    setNotice(
      persisted
        ? "Оформление сохранено на этом устройстве."
        : "Оформление применено, но браузер запретил сохранение. После перезапуска оно может сброситься.",
    );
  }

  const liquidDrop = appearance.liquidDrop ?? DEFAULT_LIQUID_DROP;
  const changeLiquidDrop = (patch: Partial<LiquidDropAppearance>) =>
    change({ ...appearance, liquidDrop: { ...liquidDrop, ...patch } });

  return (
    <Shell screen="settings">
      <div
        className="mx-auto max-w-4xl space-y-6"
        data-appearance-ready={appearanceReady ? "true" : "false"}
        aria-busy={!appearanceReady}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-[#D7FF35]"
        >
          <ArrowLeft className="size-4" /> Вернуться к ленте
        </Link>
        <header className="rounded-3xl border border-[#D7FF35]/25 z-electric-settings-hero bg-gradient-to-br from-[#1B2718] to-[#10150E] p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">
            ZAPRUDA / ПЕРСОНАЛИЗАЦИЯ
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-black text-white sm:text-3xl">
            <Settings2 className="size-7 text-[#D7FF35]" /> Настройки
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
            Настрой внешний вид ZAPRUDA под себя. Изменения применяются сразу, без перезагрузки и
            без изменения твоего аккаунта.
          </p>
        </header>

        {!appearanceReady && <p role="status">Загружаем оформление…</p>}

        <section
          aria-labelledby="app-background-title"
          className="rounded-3xl border border-white/10 bg-[var(--premium-panel)] z-electric-settings-panel p-5 sm:p-7"
        >
          <h2
            id="app-background-title"
            className="flex items-center gap-2 text-lg font-black text-white"
          >
            <Monitor className="size-5 text-[#D7FF35]" /> Цветовая тема
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Matte Black остаётся основным. Electric Blue — яркий синий фон с лаймовыми и
            баклажановыми акцентами. Выбор сохраняется в этом браузере, в том числе после повторного
            входа.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {selectableBackgrounds.map((item) => {
              const selected = appearance.background === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={!appearanceReady}
                  onClick={() => change({ ...appearance, background: item.value })}
                  className={
                    "rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7FF35] " +
                    (selected
                      ? "border-[#D7FF35] bg-[#D7FF35]/10"
                      : "border-white/10 bg-black/15 hover:border-[#D7FF35]/45")
                  }
                >
                  <span
                    className="relative block h-20 rounded-xl border border-white/10"
                    style={{ background: item.preview }}
                  >
                    {item.secondaryAccent && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/35 px-2 py-1.5"
                      >
                        <span
                          className="size-4 rounded-full border border-white/25"
                          style={{ backgroundColor: "#D7FF35" }}
                        />
                        <span
                          className="size-4 rounded-full border border-white/25"
                          style={{ backgroundColor: item.secondaryAccent }}
                        />
                      </span>
                    )}
                    {selected && (
                      <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#D7FF35] text-black">
                        <Check className="size-4" />
                      </span>
                    )}
                  </span>
                  <span className="mt-3 block text-sm font-bold text-white">{item.title}</span>
                  <span className="mt-1 block text-xs text-zinc-400">{item.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          id="liquid-drop"
          aria-labelledby="liquid-drop-title"
          className="z-premium-card z-liquid-settings p-5 sm:p-7"
        >
          <h2 id="liquid-drop-title" className="text-lg font-bold">
            Liquid Drop
          </h2>
          <fieldset disabled={!appearanceReady} className="z-liquid-options">
            <legend>Стиль выделения</legend>
            <div>
              {LIQUID_DROP_STYLES.map(({ value, title }) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="liquidDropStyle"
                    checked={liquidDrop.style === value}
                    onChange={() => changeLiquidDrop({ style: value })}
                  />
                  <span className="z-liquid-swatch" data-zapruda-liquid={value}>
                    <LiquidDropArtwork />
                  </span>
                  <span>{title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="z-liquid-settings-control">
            <label htmlFor="liquid-drop-intensity">Интенсивность</label>
            <output htmlFor="liquid-drop-intensity">{liquidDrop.intensity}%</output>
            <input
              id="liquid-drop-intensity"
              type="range"
              min="0"
              max="100"
              aria-valuetext={liquidDrop.intensity + "%"}
              value={liquidDrop.intensity}
              disabled={!appearanceReady}
              onChange={(event) =>
                changeLiquidDrop({ intensity: event.currentTarget.valueAsNumber })
              }
            />
          </div>
          <div className="z-liquid-presets" role="group" aria-label="Быстрый выбор интенсивности">
            {[20, 40, 70, 100].map((intensity) => (
              <button
                key={intensity}
                type="button"
                disabled={!appearanceReady}
                aria-pressed={liquidDrop.intensity === intensity}
                onClick={() => changeLiquidDrop({ intensity })}
              >
                {intensity}%
              </button>
            ))}
          </div>
          <label className="z-liquid-motion-option">
            <input
              type="checkbox"
              checked={liquidDrop.animate}
              disabled={!appearanceReady}
              onChange={(event) => changeLiquidDrop({ animate: event.currentTarget.checked })}
            />
            Анимация
          </label>
          <p className="text-xs text-muted-foreground">
            Проверь переход между вкладками в предпросмотре.
          </p>
          <LiquidDropPreview />
        </section>

        <section aria-labelledby="wallpaper-title" className="z-premium-card p-5 sm:p-7">
          <p className="z-eyebrow">ТВОЁ ПРОСТРАНСТВО</p>
          <h2 id="wallpaper-title" className="mt-2 text-lg font-bold">
            Фон приложения
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Четыре фактуры для обеих тем. Без анимации и лишней нагрузки. Выбор сохранится на этом
            устройстве.
          </p>
          <div className="z-wallpaper-options">
            {APP_WALLPAPERS.map((item) => {
              const selected = (appearance.wallpaper ?? "matte-black") === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={!appearanceReady}
                  className="z-wallpaper-option"
                  onClick={() => change({ ...appearance, wallpaper: item.value })}
                >
                  <span
                    className={"z-wallpaper-swatch z-wallpaper-swatch-" + item.value}
                    aria-hidden="true"
                  >
                    {selected && <Check className="size-5" />}
                  </span>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="chat-background-title"
          className="rounded-3xl border border-white/10 bg-[var(--premium-panel)] z-electric-settings-panel p-5 sm:p-7"
        >
          <h2
            id="chat-background-title"
            className="flex items-center gap-2 text-lg font-black text-white"
          >
            <MessageCircle className="size-5 text-[#D7FF35]" /> Фон чатов
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Отдельное оформление области сообщений в общем и личных чатах.
          </p>
          {appearance.background === "electric-blue" && (
            <div className="mt-5 rounded-2xl border border-[#614051]/70 bg-[#614051] p-4 text-sm text-white">
              <p className="font-bold text-[#D7FF35]">Electric Blue · Чаты</p>
              <p className="mt-1 text-[#F9ECF7]">
                В синей теме сообщения оформляются в синих и баклажановых оттенках с лаймовыми
                акцентами. Тёмно-зелёные фоны не используются.
              </p>
            </div>
          )}
          <div
            className={
              appearance.background === "electric-blue"
                ? "hidden"
                : "mt-5 grid gap-3 sm:grid-cols-2"
            }
          >
            {CHAT_BACKGROUNDS.map((item) => {
              const selected = appearance.chat === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={!appearanceReady}
                  onClick={() => change({ ...appearance, chat: item.value })}
                  className={
                    "rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7FF35] " +
                    (selected
                      ? "border-[#D7FF35] bg-[#D7FF35]/10"
                      : "border-white/10 bg-black/15 hover:border-[#D7FF35]/45")
                  }
                >
                  <span
                    className="relative block h-20 overflow-hidden rounded-xl border border-white/10"
                    style={{ background: item.preview }}
                  >
                    <span className="absolute left-3 top-3 rounded-lg bg-black/30 px-3 py-1.5 text-[10px] text-white">
                      Привет, как клёв?
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-lg border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-3 py-1.5 text-[10px] text-[#D7FF35]">
                      Отлично! 🎣
                    </span>
                    {selected && (
                      <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#D7FF35] text-black">
                        <Check className="size-4" />
                      </span>
                    )}
                  </span>
                  <span className="mt-3 block text-sm font-bold text-white">{item.title}</span>
                  <span className="mt-1 block text-xs text-zinc-400">{item.description}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              search={{ place: "", topic: "general", country: "" }}
              to="/chat"
              className="font-semibold text-[#D7FF35] hover:underline"
            >
              Открыть общий чат →
            </Link>
            <Link
              to="/messages"
              search={{ mark: "" }}
              className="font-semibold text-[#D7FF35] hover:underline"
            >
              Открыть личные сообщения →
            </Link>
          </div>
        </section>

        {developer && (
          <section className="rounded-3xl border border-white/10 bg-[var(--premium-panel)] z-electric-settings-panel p-5 sm:p-7">
            <h2 className="text-lg font-black text-white">Яндекс Карты · API для тестирования</h2>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Сейчас в ZAPRUDA работает виджет Яндекс Карт. Чтобы выбирать личные точки кликом,
              нужен публичный ключ JavaScript API Яндекс Карт. Здесь можно подключить ключ для
              тестирования только в этом браузере. Для всех пользователей позже потребуется
              настроить его в общем окружении приложения.
            </p>
            <label className="mt-4 block text-xs font-semibold text-zinc-300">
              Публичный ключ Яндекс Карт JavaScript API
              <input
                className="field mt-1 w-full"
                type="text"
                autoComplete="off"
                maxLength={256}
                placeholder="Введите ключ из кабинета разработчика Яндекса"
                value={yandexKey}
                onChange={(e) => setYandexKey(e.target.value)}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-primary"
                type="button"
                onClick={() => {
                  try {
                    if (yandexKey.trim())
                      localStorage.setItem("zapruda.yandex_maps_api_key", yandexKey.trim());
                    else localStorage.removeItem("zapruda.yandex_maps_api_key");
                    setNotice(
                      "Ключ Яндекс Карт настроен для этого браузера. Открой профиль и обнови страницу.",
                    );
                  } catch {
                    setNotice("Браузер не разрешил сохранить ключ.");
                  }
                }}
              >
                Сохранить ключ карт
              </button>
              <a
                className="btn-ghost inline-flex"
                target="_blank"
                rel="noopener noreferrer"
                href="https://developer.tech.yandex.ru/services/"
              >
                Получить ключ Яндекс Карт →
              </a>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              Используется только публичный API-ключ карты, не секретный ключ платежей. Не вводи
              сюда ЮKassa Secret Key.
            </p>
          </section>
        )}

        {notice && (
          <p
            role="status"
            className="rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/5 p-4 text-sm text-[#D7FF35]"
          >
            {notice}
          </p>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
          <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-zinc-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#D7FF35]" />
            Настройки хранятся только в этом браузере. На аккаунт, рыболовные отчёты и сохранённые
            координаты они не влияют.
          </p>
          <button
            type="button"
            disabled={!appearanceReady}
            onClick={() => change({ ...DEFAULT_APPEARANCE })}
            className="btn-ghost inline-flex min-h-11 items-center gap-2"
          >
            <RotateCcw className="size-4" /> Сбросить оформление
          </button>
        </footer>
      </div>
    </Shell>
  );
}
