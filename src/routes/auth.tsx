import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check the saved browser session without blocking the login form on a remote getUser request.
    let alive = true;
    void supabase.auth.getSession()
      .then(({ data }) => {
        if (alive && data.session?.user) void navigate({ to: "/profile" });
      })
      .catch(() => {
        // A disconnected Supabase service must not disable manual sign-in.
      });
    return () => { alive = false; };
  }, [navigate]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "in") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        await navigate({ to: "/profile" });
      } else {
        const cleanUsername = username.trim().replace(/^@/, "");
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(cleanUsername)) {
          throw new Error("Никнейм: 3–24 символа, латинские буквы, цифры, точка, дефис или подчёркивание.");
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: cleanUsername, display_name: cleanUsername } },
        });
        if (authError) throw authError;
        // The database's on_auth_user_created trigger creates the profile.
        // When email confirmation is enabled the signup response has no session,
        // so writing to profiles here would fail the authenticated-only RLS policy.
        if (data.session) {
          await navigate({ to: "/profile" });
        } else {
          setNotice("Проверь почту и подтверди email, затем войди в аккаунт. Если письмо не пришло, проверь папку «Спам».");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось выполнить запрос.";
      const normalized = message.toLowerCase();
      if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("connection") || normalized.includes("fetch failed")) {
        setError("Не удалось соединиться с сервером авторизации Supabase. Проверь подключение к интернету или VPN и повтори попытку.");
      } else if (normalized.includes("invalid login credentials")) {
        setError("Неверный email или пароль. Проверь адрес, под которым регистрировался.");
      } else if (normalized.includes("email not confirmed")) {
        setError("Почта ещё не подтверждена. Открой письмо подтверждения и повтори вход.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl md:grid-cols-2">
        <aside className="relative hidden min-h-[440px] flex-col justify-between overflow-hidden bg-gradient-to-br from-orange-950 via-neutral-950 to-neutral-900 p-8 md:flex">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">ZAPRUDA SPINNING</p>
            <h1 className="mt-8 text-4xl font-bold leading-tight">Свои люди.<br />Свои водоёмы.<br />Свои истории.</h1>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Записывай выезды, делись уловом и обсуждай рыбалку с теми, кто в теме.</p>
          </div>
          <p className="relative text-xs text-muted-foreground">Рыболовное сообщество без лишнего шума 🎣</p>
        </aside>
        <section className="p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Рыболовное сообщество</p>
          <h2 className="mt-2 text-2xl font-bold">{mode === "in" ? "С возвращением" : "Создать аккаунт"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{mode === "in" ? "Войди, чтобы комментировать отчёты и общаться." : "Займёт минуту — и можно публиковать выезды."}</p>

          <div className="my-6 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm">
            {(["in", "up"] as const).map((m) => (
              <button type="button" key={m} onClick={() => { setMode(m); setError(""); setNotice(""); }}
                className={`rounded-lg py-2.5 font-semibold transition ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {m === "in" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "up" && (
              <label className="block space-y-1.5 text-sm font-medium">
                Никнейм
                <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="например, river_hunter" minLength={3} maxLength={24} autoComplete="username" required />
              </label>
            )}
            <label className="block space-y-1.5 text-sm font-medium">
              Email
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Пароль
              <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Не менее 6 символов" minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} required />
            </label>
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}
            <button className="btn-primary min-h-12 w-full" disabled={busy}>
              {busy ? "Подожди…" : mode === "in" ? "Войти в ZAPRUDA →" : "Создать аккаунт →"}
            </button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Продолжая, ты используешь ZAPRUDA для общения и публикации рыболовных отчётов.</p>
        </section>
      </div>
    </Shell>
  );
}
