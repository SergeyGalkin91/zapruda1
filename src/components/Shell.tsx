import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  Compass,
  Fish,
  House,
  LogIn,
  Menu,
  Ship,
  MessageCircle,
  Plus,
  ShoppingBag,
  UserRound,
  Users,
  X,
  Settings2,
  ChartNoAxesCombined,
  ShieldCheck,
  Trophy,
  WifiOff,
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { BrandWallpaper } from "@/components/BrandWallpaper";
import { supabase } from "@/integrations/supabase/client";
import { ActivityTracker } from "@/components/ActivityTracker";
import { applyAppearance, loadAppearance } from "@/lib/appearance";

const desktopNav = [
  { to: "/", label: "Лента", Icon: House },
  { to: "/reports/new", label: "Новый отчёт", Icon: Plus },
  { to: "/partners", label: "Выезды", Icon: Users },
  { to: "/communities", label: "Комьюнити", Icon: Compass },
  { to: "/chat", label: "Чат", Icon: MessageCircle },
  { to: "/messages", label: "Личные", Icon: MessageCircle },
  { to: "/assistant", label: "ИИ-рыболов", Icon: BrainCircuit },
] as const;

const mobileNav = [
  { to: "/", label: "Лента", Icon: House },
  { to: "/communities", label: "Комьюнити", Icon: Compass },
  { to: "/reports/new", label: "Создать", Icon: Plus },
  { to: "/partners", label: "Выезды", Icon: Users },
  { to: "/chat", label: "Чат", Icon: MessageCircle },
] as const;

const otherNav = [
  { to: "/messages", label: "Личные сообщения", Icon: MessageCircle },
  { to: "/guides", label: "Кабинет гида", Icon: Ship },
  { to: "/communities", label: "Комьюнити и клубы", Icon: Compass },
  { to: "/assistant", label: "ИИ-рыболов", Icon: BrainCircuit },
  { to: "/analytics", label: "Аналитика · Beta (VIP)", Icon: ChartNoAxesCombined },
  { to: "/market", label: "Барахолка — скоро", Icon: ShoppingBag },
] as const;

export function Shell({
  children,
  screen = "default",
}: {
  children: ReactNode;
  screen?:
    | "default"
    | "feed"
    | "communities"
    | "spot"
    | "profile"
    | "welcome"
    | "settings"
    | "create"
    | "trips"
    | "chat";
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isNetlifyStagingPreview, setIsNetlifyStagingPreview] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [offline, setOffline] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    applyAppearance(loadAppearance());
  }, []);
  useEffect(() => {
    setIsNetlifyStagingPreview(
      import.meta.env["VITE_SUPABASE_URL"] === "https://yudtbifopfnjtjanaqrd.supabase.co" &&
        /^(deploy-preview-[0-9]+|[a-f0-9]{24})--zapruda1[.]netlify[.]app$/.test(
          window.location.hostname,
        ),
    );
  }, []);

  useEffect(() => {
    const syncConnection = () => setOffline(!navigator.onLine);
    window.addEventListener("online", syncConnection);
    window.addEventListener("offline", syncConnection);
    syncConnection();
    return () => {
      window.removeEventListener("online", syncConnection);
      window.removeEventListener("offline", syncConnection);
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboard = () => {
      const field = document.activeElement;
      const isTyping =
        field instanceof HTMLElement &&
        (field.isContentEditable ||
          field.matches(
            "textarea, input:not([type]), input:is([type=text], [type=search], [type=email], [type=password], [type=tel], [type=url], [type=number])",
          ));
      setKeyboardOpen(
        isTyping && viewport.scale === 1 && window.innerHeight - viewport.height > 120,
      );
    };
    const closeKeyboard = () => setKeyboardOpen(false);
    viewport.addEventListener("resize", updateKeyboard);
    document.addEventListener("focusin", updateKeyboard);
    document.addEventListener("focusout", closeKeyboard);
    updateKeyboard();
    return () => {
      viewport.removeEventListener("resize", updateKeyboard);
      document.removeEventListener("focusin", updateKeyboard);
      document.removeEventListener("focusout", closeKeyboard);
    };
  }, []);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

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
      void supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (!active || sawAuthEvent) return;
          if (error) throw error;
          setIsSignedIn(Boolean(data.session?.user));
        })
        .catch((error: unknown) => {
          if (!active) return;
          // A visitor without a session is an expected state, not a UI failure.
          if (error instanceof Error && /auth session missing/i.test(error.message)) {
            setIsSignedIn(false);
            setAuthError("");
            return;
          }
          setAuthError(
            "Не удалось проверить авторизацию. Обнови страницу или попробуй войти снова.",
          );
        });
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Не удалось инициализировать авторизацию.",
      );
    }
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!isSignedIn) {
      setIsAdmin(false);
      return;
    }
    void supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!active || !data.user) return;
        const { data: role } = await supabase
          .from("zapruda_admins")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (active) setIsAdmin(Boolean(role));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  return (
    <div
      data-z-screen={screen}
      data-z-keyboard-open={keyboardOpen || undefined}
      data-z-admin-nav={isAdmin || undefined}
      className="z-app-shell overflow-x-clip"
    >
      <BrandWallpaper />
      <ActivityTracker />
      <header className="z-shell-header z-electric-shell-header sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="z-shell-header-inner mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-col items-start sm:flex-row sm:items-center sm:gap-3">
            <Link
              to="/"
              aria-label="ZAPRUDA — на главную"
              className="inline-flex min-h-11 shrink-0 items-center"
            >
              <Wordmark />
            </Link>
            {isNetlifyStagingPreview && (
              <span
                className="rounded-lg border border-[#D7FF35]/40 bg-[#D7FF35]/10 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-[#D7FF35] sm:px-2 sm:py-1 sm:text-[10px]"
                title="Тестовая среда Supabase STAGING"
              >
                STAGING
              </span>
            )}
          </div>
          <nav aria-label="Основная навигация" className="hidden items-center gap-1 xl:flex">
            {desktopNav.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="group relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-[#A5ADA1] transition hover:bg-white/[0.05] hover:text-white"
                activeProps={{
                  className:
                    "group relative inline-flex items-center gap-1.5 rounded-xl bg-[#D7FF35]/10 px-2.5 py-2 text-[13px] font-bold text-[#D7FF35]",
                }}
              >
                <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {isSignedIn ? (
              <>
                <a
                  href="/profile"
                  aria-label="Профиль"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-2.5 py-2 text-sm font-semibold text-[#D7FF35] transition hover:bg-[#D7FF35]/15 sm:gap-2 sm:px-3"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Профиль</span>
                </a>
              </>
            ) : (
              <Link
                search={{ mode: "in" }}
                to="/auth"
                aria-label="Войти"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#D7FF35]/30 hover:text-white"
              >
                <LogIn className="size-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Войти</span>
              </Link>
            )}
            <details
              ref={menuRef}
              className="relative group"
              onKeyDown={(event) => {
                if (event.key !== "Escape" || !event.currentTarget.open) return;
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }}
            >
              <summary
                aria-label="Открыть список разделов"
                aria-controls="zapruda-extra-nav"
                className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-xl border border-white/15 text-[#D7FF35] transition hover:bg-[#D7FF35]/10 [&::-webkit-details-marker]:hidden"
              >
                <Menu className="size-5 group-open:hidden" aria-hidden="true" />
                <X className="hidden size-5 group-open:block" aria-hidden="true" />
              </summary>
              <nav
                id="zapruda-extra-nav"
                aria-label="Остальные разделы"
                className="z-shell-menu z-electric-shell-menu absolute right-0 top-[calc(100%+8px)] z-50 space-y-1 rounded-2xl border p-2 shadow-2xl shadow-black/70"
                onClick={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest("a") &&
                    menuRef.current
                  ) {
                    menuRef.current.open = false;
                  }
                }}
              >
                <div className="px-3 pb-2 pt-2 text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#D7FF35]">
                  ZAPRUDA / Разделы
                </div>
                <Link
                  to="/welcome"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]"
                >
                  <Fish className="size-4 text-[#D7FF35]" aria-hidden="true" /> Добро пожаловать
                </Link>
                {(isNetlifyStagingPreview ||
                  import.meta.env["VITE_SUPABASE_URL"] ===
                    "https://yudtbifopfnjtjanaqrd.supabase.co") && (
                  <Link
                    to="/competitions"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]"
                  >
                    <Trophy className="size-4 text-[#D7FF35]" aria-hidden="true" />
                    ZARUBA · SPOT (STAGING)
                    <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
                  </Link>
                )}
                {otherNav.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]"
                  >
                    <Icon className="size-4 text-[#D7FF35]" aria-hidden="true" />
                    {label}
                    <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
                  </Link>
                ))}
                {!isSignedIn && (
                  <Link
                    search={{ mode: "in" }}
                    to="/auth"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]"
                  >
                    <LogIn className="size-4 text-[#D7FF35]" aria-hidden="true" />
                    Вход в аккаунт
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.07]"
                  >
                    <ShieldCheck className="size-4 text-[#D7FF35]" aria-hidden="true" />
                    Кабинет администрации
                    <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/moderation"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.07]"
                  >
                    <ShieldCheck className="size-4 text-[#D7FF35]" aria-hidden="true" />
                    Модерация заявок
                    <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
                  </Link>
                )}
                <div className="my-2 border-t border-white/10" />
                <Link
                  to="/settings"
                  className="flex items-center gap-3 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 px-3 py-3 text-sm font-semibold text-[#D7FF35] transition hover:bg-[#D7FF35]/10"
                >
                  <Settings2 className="size-4" aria-hidden="true" /> Настройки
                  <ArrowUpRight className="ml-auto size-3.5" aria-hidden="true" />
                </Link>
              </nav>
            </details>
          </div>
        </div>
        {authError && (
          <div role="alert" className="mx-auto max-w-7xl px-4 py-2 text-sm text-red-300">
            {authError}
          </div>
        )}
      </header>

      <main className="z-shell-content mx-auto min-w-0 max-w-6xl py-5 sm:py-8">
        {offline && (
          <div role="status" className="z-premium-card mb-4 flex items-center gap-3 p-3 text-sm">
            <WifiOff className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>Нет подключения к интернету. После восстановления связи повтори действие.</span>
          </div>
        )}
        {children}
      </main>
      <footer className="z-shell-content mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-xs text-zinc-500">
        <span>ZAPRUDA COMMUNITY · Свои на одной волне</span>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="https://t.me/ZAPRUDACOMMUNITY"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            Telegram ZAPRUDA
          </a>
        </div>
      </footer>

      <nav
        aria-label="Мобильная навигация"
        className="z-mobile-nav z-electric-mobile-nav fixed inset-x-0 bottom-0 z-50 border-t shadow-[0_-12px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl xl:hidden"
      >
        <div className="z-mobile-nav-items mx-auto grid max-w-xl grid-cols-5 gap-1">
          {mobileNav.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true, includeSearch: false }}
              className="z-mobile-nav-link"
              activeProps={{ "aria-current": "page" }}
            >
              <span
                className={
                  to === "/reports/new"
                    ? "flex size-11 items-center justify-center rounded-full bg-[#D7FF35] text-black shadow-[0_0_22px_rgba(215,255,53,0.2)]"
                    : "flex size-8 items-center justify-center"
                }
              >
                <Icon
                  className={to === "/reports/new" ? "size-6" : "size-[21px]"}
                  strokeWidth={to === "/reports/new" ? 2.5 : 1.9}
                  aria-hidden="true"
                />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
        {isAdmin && (
          <div className="mx-auto max-w-xl px-3 pb-2">
            <Link
              to="/admin"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#A99AD9]/40 bg-[#171527] text-xs font-black text-[#D7FF35]"
            >
              <ShieldCheck className="size-4" /> Админ-панель
            </Link>
          </div>
        )}
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
