import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
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
  validateSearch: (search: Record<string, unknown>) => ({ mode: search.mode === "up" ? "up" as const : "in" as const }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up" | "forgot" | "new-password">(search.mode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Never forcibly redirect users from registration to profile.
    // Existing sessions are checked after explicit login; password recovery is handled separately.
    const recovering = new URLSearchParams(window.location.search).get("recovery") === "1";
    if (recovering) setMode("new-password");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("new-password");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (mode === "in" || mode === "up") setMode(search.mode);
  }, [search.mode]);


  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "in") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (!data.session && !authError) throw new Error("Сервер не вернул сессию. Попробуй войти ещё раз.");
        if (authError) throw authError;
        await navigate({ to: "/profile" });
      } else if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/auth?recovery=1",
        });
        if (resetError) throw resetError;
        setNotice("Если такой email зарегистрирован, мы отправили письмо для восстановления пароля. Проверь также «Спам».");
      } else if (mode === "new-password") {
        if (password.length < 6) throw new Error("Пароль должен содержать не менее 6 символов.");
        if (password !== confirmPassword) throw new Error("Пароли не совпадают.");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setNotice("Пароль изменён. Теперь можно перейти в профиль.");
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
        <aside className="relative hidden min-h-[440px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1C3119] via-[#101610] to-[#0A0E0A] p-8 md:flex">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#D7FF35]">ZAPRUDA COMMUNITY</p>
            <h1 className="mt-8 text-4xl font-bold leading-tight">Свои люди.<br />Свои водоёмы.<br />Свои истории.</h1>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Записывай выезды, делись уловом и обсуждай рыбалку с теми, кто в теме.</p>
          </div>
          <p className="relative text-xs text-muted-foreground">Рыболовное сообщество без лишнего шума 🎣</p>
        </aside>
        <section className="p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Рыболовное сообщество</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{mode === "in" ? "С возвращением" : mode === "up" ? "Создать аккаунт" : mode === "forgot" ? "Восстановить пароль" : "Новый пароль"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{mode === "in" ? "Войди по email и паролю или выбери подключённый сервис." : mode === "up" ? "Заполни данные и подтверди адрес электронной почты." : mode === "forgot" ? "Отправим ссылку для сброса пароля на почту." : "Придумай новый пароль для своего аккаунта."}</p>

          <div className="my-6 grid grid-cols-2 rounded-xl bg-[#20271D] p-1 text-sm">
            <a href="/auth?mode=in" aria-current={mode === "in" ? "page" : undefined} className={`rounded-lg py-2.5 text-center font-semibold transition ${mode === "in" ? "bg-[#D7FF35] text-[#0D100C] shadow-sm" : "text-[#BAC2B4] hover:text-white"}`}>Вход</a>
            <a href="/auth?mode=up" aria-current={mode === "up" ? "page" : undefined} className={`rounded-lg py-2.5 text-center font-semibold transition ${mode === "up" ? "bg-[#D7FF35] text-[#0D100C] shadow-sm" : "text-[#BAC2B4] hover:text-white"}`}>Регистрация</a>
          </div>
          <p className="mb-4 text-xs text-zinc-400">Для входа используй <strong className="text-[#D7FF35]">email</strong>, на который регистрировал аккаунт, а не никнейм.</p>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "up" && (
              <label className="block space-y-1.5 text-sm font-medium">
                Никнейм
                <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="например, river_hunter" minLength={3} maxLength={24} autoComplete="username" required />
              </label>
            )}
            {mode !== "new-password" && <label className="block space-y-1.5 text-sm font-medium">
              Email
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>}
            {(mode === "in" || mode === "up" || mode === "new-password") && <label className="block space-y-1.5 text-sm font-medium">
              {mode === "new-password" ? "Новый пароль" : "Пароль"}
              <span className="relative block">
                <input className="field pr-14" type={passwordVisible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Не менее 6 символов" minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} required />
                <button type="button" aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"} title={passwordVisible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((prev) => !prev)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-[#D7FF35] hover:bg-white/10">
                  {passwordVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </span>
            </label>}
            {mode === "new-password" && <label className="block space-y-1.5 text-sm font-medium">
              Повтори новый пароль
              <span className="relative block">
                <input className="field pr-14" type={confirmVisible ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} autoComplete="new-password" required />
                <button type="button" aria-label={confirmVisible ? "Скрыть повтор пароля" : "Показать повтор пароля"} aria-pressed={confirmVisible} onClick={() => setConfirmVisible((prev) => !prev)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-[#D7FF35] hover:bg-white/10">
                  {confirmVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </span>
            </label>}
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p>}
            <button className="btn-primary min-h-12 w-full" disabled={busy}>
              {busy ? "Подожди…" : mode === "in" ? "Войти в ZAPRUDA →" : mode === "up" ? "Зарегистрироваться →" : mode === "forgot" ? "Получить письмо →" : "Сохранить пароль →"}
            </button>
            {mode === "in" && <button type="button" className="w-full py-2 text-center text-xs font-semibold text-[#D7FF35] hover:underline" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Забыли пароль?</button>}
            {(mode === "forgot" || mode === "new-password") && <button type="button" className="w-full py-2 text-center text-xs text-zinc-400 hover:text-white" onClick={() => { setMode("in"); setError(""); setNotice(""); }}>Вернуться ко входу</button>}
          </form>
          <SocialAuthButtons onError={setError} />
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Продолжая, ты используешь ZAPRUDA для общения и публикации рыболовных отчётов.</p>
        </section>
      </div>
    </Shell>
  );
}
