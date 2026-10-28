import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";

const nav = [
  { to: "/", label: "Лента" },
  { to: "/communities", label: "Сообщества" },
  { to: "/chat", label: "Чат" },
  { to: "/assistant", label: "ИИ-рыболов" },
  { to: "/reports/new", label: "Новый отчёт" },
  { to: "/profile", label: "Профиль" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/"><Wordmark /></Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }}
                activeOptions={{ exact: true }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link to="/auth" className="btn-ghost">Войти</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-background md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="py-3 text-center text-xs text-muted-foreground"
            activeProps={{ className: "text-primary" }}
            activeOptions={{ exact: true }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function NotConnected({ what }: { what: string }) {
  return (
    <div className="panel border-dashed p-6 text-center">
      <p className="font-display text-sm font-semibold">База данных ещё не подключена</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {what} появятся после подключения вашего проекта Supabase.
      </p>
    </div>
  );
}
