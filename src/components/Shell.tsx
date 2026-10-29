import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";

const nav = [
  { to: "/", label: "Лента", icon: "⌂" },
  { to: "/partners", label: "Напарники", icon: "♧" },
  { to: "/communities", label: "Клубы", icon: "♧" },
  { to: "/market", label: "Барахолка", icon: "◇" },
  { to: "/chat", label: "Чат", icon: "✉" },
  { to: "/assistant", label: "ИИ-рыболов", icon: "✳" },
  { to: "/profile", label: "Профиль", icon: "◉" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="ZAPRUDA — на главную" className="shrink-0"><Wordmark /></Link>
          <nav aria-label="Основная навигация" className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                activeProps={{ className: "rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-foreground" }}
                activeOptions={{ exact: true }}>
                {n.label}{n.to === "/market" && <span className="ml-1.5 rounded-full border border-lime-300/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-lime-300">скоро</span>}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/auth" className="btn-ghost hidden sm:inline-flex">Войти</Link>
            <Link to="/reports/new" className="btn-primary">＋ <span className="hidden sm:inline">Новый отчёт</span><span className="sm:hidden">Отчёт</span></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>

      <nav aria-label="Мобильная навигация" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-7">
          {nav.map((n) => (
            <Link key={n.to} to={n.to}
              className="flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[9px] text-muted-foreground sm:text-[11px] transition"
              activeProps={{ className: "flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[9px] font-semibold text-primary sm:text-[11px]" }}
              activeOptions={{ exact: true }}>
              <span aria-hidden="true" className="text-xl leading-none">{n.icon}</span>
              <span className="truncate">{n.label}</span>
              {n.to === "/market" && <span className="text-[9px] font-bold leading-none text-lime-300">скоро</span>}
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
      <p className="font-display text-sm font-semibold">Раздел в разработке</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {what} — подключаем и доводим до рабочего состояния.
      </p>
    </div>
  );
}
