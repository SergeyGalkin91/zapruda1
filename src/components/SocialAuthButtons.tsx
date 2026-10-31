import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SocialProvider = "google" | "apple" | "custom:yandex";
type ProviderSettings = {
  external?: { google?: boolean; apple?: boolean; email?: boolean };
  disable_signup?: boolean;
};

const providers: ReadonlyArray<{ provider: SocialProvider; title: string; symbol: string; native: boolean }> = [
  { provider: "google", title: "Google", symbol: "G", native: true },
  { provider: "custom:yandex", title: "Яндекс", symbol: "Я", native: false },
  { provider: "apple", title: "Apple", symbol: "●", native: true },
];

function getAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Не удалось выполнить вход через сервис.";
  if (/not enabled|provider.*disabled|provider.*not found|unsupported provider/i.test(message)) {
    return "Этот способ входа ещё не подключён в Supabase. Выбери email/пароль или другой сервис.";
  }
  if (/network|failed to fetch|connection/i.test(message)) {
    return "Нет соединения с сервером авторизации. Проверь интернет или VPN.";
  }
  return message;
}

export function SocialAuthButtons({ onError }: { onError: (message: string) => void }) {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
    if (!url || !key) {
      setChecked(true);
      return () => controller.abort();
    }
    void fetch(url.replace(/\/+$/, "") + "/auth/v1/settings", {
      headers: { apikey: key },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to load Supabase Auth settings");
      setSettings((await response.json()) as ProviderSettings);
    }).catch(() => {
      // Keep email login accessible when provider discovery is offline.
    }).finally(() => {
      if (!controller.signal.aborted) setChecked(true);
    });
    return () => controller.abort();
  }, []);

  async function beginLogin(provider: SocialProvider) {
    if (busy) return;
    setBusy(provider);
    onError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Parameters<typeof supabase.auth.signInWithOAuth>[0]["provider"],
        options: { redirectTo: window.location.origin + "/auth?oauth=1" },
      });
      if (error) throw error;
    } catch (error) {
      onError(getAuthError(error));
    } finally {
      setBusy(null);
    }
  }

  const customEnabled: Record<string, boolean> = {
    "custom:yandex": import.meta.env["VITE_SOCIAL_YANDEX_ENABLED"] === "true",
  };

  return (
    <div className="mt-7 border-t border-white/10 pt-6">
      <div className="mb-4 flex items-center gap-3 text-xs font-semibold text-[#A9B2A5]">
        <span className="h-px flex-1 bg-white/10" />
        Или через аккаунт
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {providers.map(({ provider, title, symbol, native }) => {
          const available = native
            ? checked && settings?.external?.[provider as "google" | "apple"] === true
            : checked && customEnabled[provider];
          const label = available ? "Продолжить с " + title : title + " — не подключён";
          return (
            <button
              key={provider}
              type="button"
              onClick={() => void beginLogin(provider)}
              disabled={!available || busy !== null}
              title={available ? label : "Для работы требуется настройка OAuth-провайдера"}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#20271D] px-2.5 py-2.5 text-sm font-bold text-white transition enabled:hover:border-[#D7FF35]/50 enabled:hover:bg-[#D7FF35]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-extrabold text-[#D7FF35]">{symbol}</span>
              <span className="min-w-0 text-left">
                <span className="block">{title}</span>
                {!available && <span className="block text-[10px] font-normal text-zinc-400">Не подключён</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        Google и Apple включаются через Supabase Auth Providers. Яндекс ID подключается как Custom OAuth/OIDC.
        До настройки сервиса кнопка не выполняет вход.
      </p>
      {checked && settings?.external?.email === false && (
        <p role="alert" className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
          Email-авторизация отключена в Supabase. Включи Email в настройках Auth Providers.
        </p>
      )}
      {checked && settings?.disable_signup && (
        <p role="status" className="mt-3 text-xs text-amber-200">Создание новых аккаунтов отключено в Supabase.</p>
      )}
    </div>
  );
}
