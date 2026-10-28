import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход и регистрация — ZAPRUDA" },
      { name: "description", content: "Войдите или создайте аккаунт рыболова в ZAPRUDA." },
      { property: "og:title", content: "Вход и регистрация — ZAPRUDA" },
      { property: "og:description", content: "Войдите или создайте аккаунт рыболова в ZAPRUDA." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  return (
    <Shell>
      <div className="panel mx-auto max-w-sm p-6">
        <div className="mb-6 grid grid-cols-2 rounded-md bg-muted p-1 text-sm">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded py-2 font-semibold ${mode === m ? "bg-card" : "text-muted-foreground"}`}
            >
              {m === "in" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          {mode === "up" && <input className="field" placeholder="Имя пользователя" />}
          <input className="field" type="email" placeholder="Email" />
          <input className="field" type="password" placeholder="Пароль" />
          <button className="btn-primary w-full" disabled>
            {mode === "in" ? "Войти" : "Создать аккаунт"}
          </button>
          <p className="text-center text-xs text-muted-foreground">Станет доступно после подключения базы.</p>
        </form>
      </div>
    </Shell>
  );
}
