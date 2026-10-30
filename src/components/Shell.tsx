import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight, BrainCircuit, Compass, Fish, House, LogIn, Menu, Ship, MessagesSquare,
  MessageCircle, Plus, ShoppingBag, UserRound, Users, X, Settings2, ChartNoAxesCombined, ShieldCheck, Trophy,
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { supabase } from "@/integrations/supabase/client";
import { ActivityTracker } from "@/components/ActivityTracker";
import { applyAppearance, loadAppearance } from "@/lib/appearance";

const desktopNav = [
  { to: "/", label: "Лента", Icon: House },
  { to: "/fishing-map", label: "Карта", Icon: Compass },
  { to: "/partners", label: "Напарники", Icon: Users },
  { to: "/communities", label: "Клубы", Icon: Compass },
  { to: "/chat", label: "Чат", Icon: MessageCircle },
  { to: "/messages", label: "Личные", Icon: MessagesSquare },
] as const;

const mobileNav = [
  { to: "/", label: "Лента", Icon: House },
  { to: "/reports/new", label: "Отчёт", Icon: Plus },
  { to: "/fishing-map", label: "Карта", Icon: Compass },
  { to: "/partners", label: "Напарники", Icon: Users },
  { to: "/chat", label: "Чат", Icon: MessageCircle },
  { to: "/profile", label: "Профиль", Icon: UserRound },
] as const;

const otherNav = [
  { to: "/achievements", label: "Достижения", Icon: Trophy },
  { to: "/messages", label: "Личные сообщения", Icon: MessagesSquare },
  { to: "/guides", label: "Кабинет гида", Icon: Ship },
  { to: "/reviews", label: "Отзывы и репутация", Icon: ShieldCheck },
  { to: "/beta", label: "Тестирование и обратная связь", Icon: ShieldCheck },

  { to: "/communities", label: "Клубы и сообщества", Icon: Compass },
  { to: "/assistant", label: "ИИ-рыболов", Icon: BrainCircuit },
  { to: "/analytics", label: "Аналитика · Beta (VIP)", Icon: ChartNoAxesCombined },
  { to: "/market", label: "Барахолка — скоро", Icon: ShoppingBag },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingClubs, setPendingClubs] = useState(0);

  useEffect(() => { applyAppearance(loadAppearance()); }, []);

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

  useEffect(() => {
    let active = true;
    if (!isSignedIn) { setIsAdmin(false); return; }
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: role } = await supabase.from("zapruda_admins")
        .select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (active) setIsAdmin(Boolean(role));
    }).catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isAdmin) { setPendingClubs(0); return; }
    let live = true;
    const refresh = async () => {
      const { count, error } = await (supabase as any).from("club_creation_requests")
        .select("id", { count: "exact", head: true }).eq("status", "awaiting_payment").eq("admin_approved", false);
      if (live && !error) setPendingClubs(count ?? 0);
    };
    void refresh();
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    const channel = supabase.channel("admin-club-requests")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "club_creation_requests" }, () => void refresh())
      .subscribe();
    return () => { live = false; window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [isAdmin]);

  return (
    <div className="min-h-screen pb-24 xl:pb-0">
      <a href="#zapruda-main-content" className="zapruda-skip-link">Перейти к содержимому</a>
      <ActivityTracker />
      <header className="sticky top-0 z-50 border-b border-[#D7FF35]/15 bg-[#090C09]/98">
        <div className="mx-auto flex h-[64px] max-w-5xl items-center justify-between gap-2 px-4 sm:px-5">
          <Link to="/" aria-label="ZAPRUDA — на главную" className="shrink-0">
            <Wordmark />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            {isAdmin && pendingClubs > 0 && <Link to="/moderation" className="inline-flex items-center gap-1 rounded-lg border border-[#D7FF35]/50 px-2 py-2 text-xs font-bold text-[#D7FF35]" aria-label={"Новые заявки на клубы: "+pendingClubs}>Клубы · {pendingClubs}</Link>}
            {isSignedIn ? (
              <>
                <Link to="/profile" className="inline-flex items-center gap-1.5 rounded-lg border border-[#D7FF35]/45 bg-[#D7FF35]/10 shadow-[0_0_12px_rgba(215,255,53,0.07)] px-2.5 py-2 text-sm font-semibold text-[#D7FF35] transition-colors hover:border-[#D7FF35] hover:bg-[#D7FF35]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF35] active:bg-[#D7FF35]/25 sm:gap-2 sm:px-3">
                  <UserRound className="size-4" aria-hidden="true" />
                  Профиль
                </Link>
              </>
            ) : (
              <Link to="/auth" className="inline-flex rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-[#D7FF35]/30 hover:text-white">
                Войти
              </Link>
            )}
            <details className="relative group">
              <summary aria-label="Открыть список разделов" aria-controls="zapruda-extra-nav" className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[#D7FF35]/30 text-[#D7FF35] transition-colors hover:border-[#D7FF35] hover:bg-[#D7FF35]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF35] active:bg-[#D7FF35]/25 [&::-webkit-details-marker]:hidden">
                <Menu className="size-5 group-open:hidden" aria-hidden="true" />
                <X className="hidden size-5 group-open:block" aria-hidden="true" />
              </summary>
          <nav
            id="zapruda-extra-nav"
            aria-label="Остальные разделы"
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-2rem))] space-y-1 rounded-2xl border border-white/15 bg-[#171C14] p-2 shadow-2xl shadow-black/70"
          >
            <div className="px-3 pb-2 pt-2 text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#D7FF35]">ZAPRUDA / Разделы</div>
            {otherNav.map(({ to, label, Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]">
                <Icon className="size-4 text-[#D7FF35]" aria-hidden="true" />{label}
                <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
              </Link>
            ))}
            {!isSignedIn && (
              <Link to="/auth" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.07]">
                <LogIn className="size-4 text-[#D7FF35]" aria-hidden="true" />Вход в аккаунт
              </Link>
            )}
            {isAdmin && (
              <Link to="/finance"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.07]">
                <ShieldCheck className="size-4 text-[#D7FF35]" aria-hidden="true" />
                Финансы ZAPRUDA
                <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
              </Link>
            )}
            {isAdmin && (
              <Link to="/moderation"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.07]">
                <ShieldCheck className="size-4 text-[#D7FF35]" aria-hidden="true" />
                Модерация заявок {pendingClubs > 0 ? "(" + pendingClubs + ")" : ""}
                <ArrowUpRight className="ml-auto size-3.5 text-zinc-500" aria-hidden="true" />
              </Link>
            )}
            <div className="my-2 border-t border-white/10" />
            <Link to="/settings"
              className="flex items-center gap-3 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 px-3 py-3 text-sm font-semibold text-[#D7FF35] transition hover:bg-[#D7FF35]/10">
              <Settings2 className="size-4" aria-hidden="true" /> Настройки
              <ArrowUpRight className="ml-auto size-3.5" aria-hidden="true" />
            </Link>
          </nav>
            </details>
          </div>
        </div>
        <div className="mx-auto hidden max-w-5xl px-4 pb-2 sm:px-5 xl:block">
          <nav aria-label="Основная навигация" className="hidden w-full items-center justify-center gap-1 rounded-lg border border-[#D7FF35]/35 bg-[#10150D] p-1.5 shadow-[0_0_12px_rgba(215,255,53,0.07)] xl:flex">
            {desktopNav.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="group relative inline-flex min-h-10 items-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-[13px] font-semibold text-[#A5ADA1] transition-colors duration-150 hover:border-[#D7FF35]/25 hover:bg-[#D7FF35]/10 hover:text-[#D7FF35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF35] active:bg-[#D7FF35]/20"
                activeProps={{ className: "!border-[#D7FF35]/50 !bg-[#D7FF35]/15 !font-bold !text-[#D7FF35]" }}
              >
                <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
                {label}

              </Link>
            ))}
          </nav>
        </div>
        {authError && <div role="alert" className="mx-auto max-w-5xl px-4 py-2 text-sm text-red-300">{authError}</div>}
      </header>

      <main id="zapruda-main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-8">{children}</main>
      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-5 text-xs text-zinc-500 sm:px-6">
        <span>ZAPRUDA COMMUNITY · Свои на одной волне</span>
        <div className="flex flex-wrap items-center gap-4">
          <a href="https://t.me/ZAPRUDACOMMUNITY" target="_blank" rel="noopener noreferrer" className="hover:text-white">Telegram ZAPRUDA</a>
        </div>
      </footer>

      <nav aria-label="Мобильная навигация" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0D100C]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2">
          {mobileNav.map(({ to, label, Icon }) => (
            <Link key={to}
              to={to === "/profile" && !isSignedIn ? "/auth" : to}
              activeOptions={{ exact: true }}
              className="flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-[#949D90] transition hover:text-[#D7FF35] sm:text-[11px]"
              activeProps={{ className: "flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-[#D7FF35]/10 px-1 py-2 text-[10px] font-bold text-[#D7FF35] sm:text-[11px]" }}>
              {to === "/profile" && !isSignedIn ? (
                <LogIn className="size-[21px]" strokeWidth={1.9} aria-hidden="true" />
              ) : (
                <Icon className="size-[21px]" strokeWidth={1.9} aria-hidden="true" />
              )}
              <span className="truncate">{to === "/profile" && !isSignedIn ? "Войти" : label}</span>
            </Link>
          ))}
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
