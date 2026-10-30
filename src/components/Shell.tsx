import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight, BrainCircuit, Compass, Fish, House, LogIn, Menu, Ship, Waves, Handshake,
  MessageCircle, Plus, ShoppingBag, UserRound, Users, X, Lightbulb, LogOut,
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { supabase } from "@/integrations/supabase/client";

const desktopNav = [
  { to: "/", label: "Лента", Icon: House },
  { to: "/partners", label: "Напарники", Icon: Users },
  { to: "/guides", label: "Гиды", Icon: Ship },
  { to: "/communities", label: "Клубы", Icon: Compass },
  { to: "/market", label: "Барахолка", Icon: ShoppingBag, comingSoon: true },
  { to: "/chat", label: "Чат", Icon: MessageCircle },
  { to: "/assistant", label: "ИИ-рыболов", Icon: BrainCircuit },
  { to: "/profile", label: "Профиль", Icon: UserRound },
] as const;

const mobileNav = [
  { to: "/", label: "Лента", Icon: House },
  { to: "/partners", label: "Напарники", Icon: Users },
  { to: "/reports/new", label: "Отчёт", Icon: Plus, primary: true },
  { to: "/chat", label: "Чат", Icon: MessageCircle },
  { to: "/profile", label: "Профиль", Icon: UserRound },
] as const;

const otherNav = [
  { to: "/feedback", label: "Предложения и сотрудничество", Icon: Handshake },
  { to: "/spearfishing", label: "Подводная охота", Icon: Waves },
  { to: "/guides", label: "Кабинет гида", Icon: Ship },
  { to: "/feedback", label: "Сотрудничество и идеи", Icon: Lightbulb },
  { to: "/communities", label: "Клубы и сообщества", Icon: Compass },
  { to: "/assistant", label: "ИИ-рыболов", Icon: BrainCircuit },
  { to: "/market", label: "Барахолка — скоро", Icon: ShoppingBag },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");

  // Always render a usable login link while the browser session initializes.
  // The listener handles login/logout; getSession covers clients that delay INITIAL_SESSION.
  useEffect(() => {
    let active = true;
    let sawAuthEvent = false;
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        sawAuthEvent = true;
        setIsSignedIn(Boolean(session?.user));
        setAuthError("");
      });
      subscription = result.data.subscription;
      void supabase.auth.getSession().then(({ data, error }) => {
        if (!active || sawAuthEvent) return;
        if (error) throw error;
        setIsSignedIn(Boolean(data.session?.user));
      }).catch((error: unknown) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : "Не удалось проверить авторизацию.");
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Не удалось инициализировать авторизацию.");
    }
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setAuthError("");
    try {
      // Local sign-out clears this device's session without signing out other devices.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setIsSignedIn(false);
      setMenuOpen(false);
      // A full navigation also resets pages holding private user-specific data.
      window.location.assign("/");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Не удалось выйти из аккаунта.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen pb-24 xl:pb-0">
      <header className="sticky top-0 z-50 border-b border-white/[0.09] bg-[#0D100C]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="ZAPRUDA — на главную" className="shrink-0" onClick={() => setMenuOpen(false)}>
            <Wordmark />
          </Link>
          <nav aria-label="Основная навигация" className="hidden items-center gap-1 xl:flex">
            {desktopNav.filter(({ to }) => to !== "/profile" || isSignedIn).map(({ to, label, Icon, ...rest }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="group relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-[#A5ADA1] transition hover:bg-white/[0.05] hover:text-white"
                activeProps={{ className: "group relative inline-flex items-center gap-1.5 rounded-xl bg-[#D7FF35]/10 px-2.5 py-2 text-[13px] font-bold text-[#D7FF35]" }}
              >
                <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
                {label}
                {"comingSoon" in rest && rest.comingSoon && <span className="text-[9px] font-bold text-[#D7FF35]">скоро</span>}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {isSignedIn ? (
              <>
                <a href="/profile" className="inline-flex items-center gap-1.5 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-2.5 py-2 text-sm font-semibold text-[#D7FF35] transition hover:bg-[#D7FF35]/15 sm:gap-2 sm:px-3">
                  <UserRound className="size-4" aria-hidden="true" />
                  Профиль
                </a>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={loggingOut}
                  aria-label="Выйти из аккаунта"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-2.5 py-2 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-50 sm:px-3"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{loggingOut ? "Выход…" : "Выйти"}</span>
                </button>
              </>
            ) : (
              <Link to="/auth" className="inline-flex rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#D7FF35]/30 hover:text-white">
                Войти
              </Link>
            )}
            <Link to="/reports/new" className="btn-primary hidden xl:inline-flex">
              <Plus className="size-4" strokeWidth={2.7} aria-hidden="true" />
              Новый отчёт
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Закрыть список разделов" : "Открыть список разделов"}
              aria-expanded={menuOpen}
              aria-controls="zapruda-extra-nav"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-[#D7FF35] transition hover:bg-[#D7FF35]/10"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {authError && <div role="alert" className="mx-auto max-w-7xl px-4 py-2 text-sm text-red-300">{authError}</div>}
        {menuOpen && (
          <nav
            id="zapruda-extra-nav"
            aria-label="Остальные разделы"
            className="absolute right-4 top-[66px] z-50 w-[min(320px,calc(100vw-2rem))] space-y-1 rounded-2xl border border-white/15 bg-[#171C14] p-2 shadow-2xl shadow-black/70"
          >
            <div className="px-3 pb-2 pt-2 text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#D7FF35]">ZAPRUDA / Разделы</div>
            {otherNav.map(({ to, label, Icon }) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]">
                <Icon className="size-4 text-[#D7FF35]" aria-hidden="true" />{label}
                <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
              </Link>
            ))}
            {isSignedIn ? (
              <>
                <a href="/profile" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]">
                  <UserRound className="size-4 text-[#D7FF35]" aria-hidden="true" />Мой профиль
                </a>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-white/[0.07] disabled:opacity-50"
                >
                  <LogOut className="size-4 text-[#D7FF35]" aria-hidden="true" />
                  {loggingOut ? "Выход…" : "Выйти из аккаунта"}
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]">
                <LogIn className="size-4 text-[#D7FF35]" aria-hidden="true" />Вход в аккаунт
              </Link>
            )}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-5 text-xs text-zinc-500 sm:px-6">
        <span>ZAPRUDA COMMUNITY · Свои на одной волне</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/feedback" className="font-semibold text-[#D7FF35] hover:underline">Предложить улучшение / сотрудничество</Link>
          <a href="https://web.telegram.org/a/#@ZAPRUDACOMMUNITY" target="_blank" rel="noopener noreferrer" className="hover:text-white">Telegram Web ZAPRUDA</a>
        </div>
      </footer>

      <nav aria-label="Мобильная навигация" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0D100C]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2">
          {mobileNav.map(({ to, label, Icon, ...rest }) =>
            "primary" in rest && rest.primary ? (
              <Link key={to} to={to} aria-label="Создать отчёт" onClick={() => setMenuOpen(false)} className="flex min-h-[69px] flex-col items-center justify-center gap-1 text-[11px] font-bold text-[#D7FF35]">
                <span className="flex size-11 items-center justify-center rounded-[16px] bg-[#D7FF35] text-[#0D100C] shadow-[0_0_25px_rgba(215,255,53,0.18)]">
                  <Icon className="size-6" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="sr-only">{label}</span>
              </Link>
            ) : (
              <Link key={to} to={to === "/profile" && !isSignedIn ? "/auth" : to} activeOptions={{ exact: true }} onClick={() => setMenuOpen(false)}
                className="flex min-h-[69px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#949D90] transition sm:text-[11px]"
                activeProps={{ className: "flex min-h-[69px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold text-[#D7FF35] sm:text-[11px]" }}>
                {to === "/profile" && !isSignedIn ? (
                  <LogIn className="size-[21px]" strokeWidth={1.9} aria-hidden="true" />
                ) : (
                  <Icon className="size-[21px]" strokeWidth={1.9} aria-hidden="true" />
                )}
                <span className="truncate">{to === "/profile" && !isSignedIn ? "Войти" : label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}

export function NotConnected({ what }: { what: string }) {
  return (
    <div className="panel border-dashed p-6 text-center">
      <Fish className="mx-auto mb-3 size-7 text-[#D7FF35]" strokeWidth={1.6} />
      <p className="font-display text-sm font-semibold">Раздел в разработке</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {what} — подключаем и доводим до рабочего состояния.
      </p>
    </div>
  );
}
