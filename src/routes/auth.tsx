import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { MobileField, StickyFormActions } from "@/components/MobileForm";
import { Shell } from "@/components/Shell";
import { Wordmark } from "@/components/Wordmark";
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
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "up" ? ("up" as const) : ("in" as const),
  }),
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
  const submitting = useRef(false);
  const [fieldError, setFieldError] = useState<{ name: string; text: string } | null>(null);
  const errorFor = (name: string) => (fieldError?.name === name ? fieldError.text : undefined);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Never forcibly redirect users from registration to profile.
    // Existing sessions are checked after explicit login; password recovery is handled separately.
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const recovering = params.get("recovery") === "1";
    const oauthReturn = params.get("oauth") === "1";
    if (recovering) setMode("new-password");
    const oauthError =
      params.get("error_description") ||
      hash.get("error_description") ||
      params.get("error") ||
      hash.get("error");
    if (oauthError) {
      setError("Не удалось войти через внешний сервис: " + oauthError.slice(0, 250));
    }
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setMode("new-password");
      if (oauthReturn && !recovering && event === "SIGNED_IN" && session && active) {
        void navigate({ to: "/profile", replace: true });
      }
    });
    if (oauthReturn && !recovering && !oauthError) {
      setNotice("Проверяем вход через выбранный сервис…");
      void supabase.auth
        .getSession()
        .then(({ data, error: sessionError }) => {
          if (!active) return;
          if (data.session) void navigate({ to: "/profile", replace: true });
          else if (sessionError) setError("Не удалось завершить вход: " + sessionError.message);
          else setNotice("Вход не завершён. Повтори попытку или воспользуйся email.");
        })
        .catch(() => {
          if (active) setError("Не удалось проверить вход. Попробуй ещё раз.");
        });
    }
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    setMode((current) => (current === "in" || current === "up" ? search.mode : current));
  }, [search.mode]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    setFieldError(null);
    const form = e.currentTarget;
    function rejectField(name: string, text: string) {
      setFieldError({ name, text });
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement) field.focus();
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "in") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!data.session && !authError)
          throw new Error("Сервер не вернул сессию. Попробуй войти ещё раз.");
        if (authError) throw authError;
        await navigate({ to: "/profile" });
      } else if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/auth?recovery=1",
        });
        if (resetError) throw resetError;
        setNotice(
          "Если такой email зарегистрирован, мы отправили письмо для восстановления пароля. Проверь также «Спам».",
        );
      } else if (mode === "new-password") {
        if (password.length < 6) throw new Error("Пароль должен содержать не менее 6 символов.");
        if (password !== confirmPassword) {
          rejectField("confirmPassword", "Пароли не совпадают.");
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setNotice("Пароль изменён. Теперь можно перейти в профиль.");
        await navigate({ to: "/profile" });
      } else {
        const cleanUsername = username.trim().replace(/^@/, "");
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(cleanUsername)) {
          rejectField(
            "username",
            "Никнейм: 3–24 символа, латинские буквы, цифры, точка, дефис или подчёркивание.",
          );
          return;
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
          setNotice(
            "Проверь почту и подтверди email, затем войди в аккаунт. Если письмо не пришло, проверь папку «Спам».",
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось выполнить запрос.";
      const normalized = message.toLowerCase();
      if (
        normalized.includes("failed to fetch") ||
        normalized.includes("network") ||
        normalized.includes("connection") ||
        normalized.includes("fetch failed")
      ) {
        setError("Не удалось связаться с сервером. Проверь подключение и повтори попытку.");
      } else if (normalized.includes("invalid login credentials")) {
        setError("Не удалось войти. Проверь адрес почты и пароль.");
      } else if (normalized.includes("email not confirmed")) {
        setError("Почта ещё не подтверждена. Открой письмо подтверждения и повтори вход.");
      } else {
        setError(message);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="z-premium-card mx-auto max-w-[440px]">
        <header className="border-b border-white/10 px-4 py-5 sm:p-7">
          <Wordmark />
          <h1 className="mt-3 text-2xl font-black leading-tight">Вход в сообщество рыболовов</h1>
        </header>
        <section className="p-4 sm:p-7">
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            {mode === "in"
              ? "С возвращением"
              : mode === "up"
                ? "Создать аккаунт"
                : mode === "forgot"
                  ? "Восстановить пароль"
                  : "Новый пароль"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "in"
              ? "Войди по адресу почты и паролю."
              : mode === "up"
                ? "Заполни данные и подтверди адрес электронной почты."
                : mode === "forgot"
                  ? "Отправим ссылку для сброса пароля на почту."
                  : "Придумай новый пароль для своего аккаунта."}
          </p>
          <div className="z-segments my-4 grid grid-cols-2">
            <Link
              to="/auth"
              search={{ mode: "in" }}
              onClick={() => {
                setMode("in");
                setFieldError(null);
                setNotice("");
                setError("");
              }}
              aria-current={mode === "in" ? "page" : undefined}
              className={`rounded-lg py-2.5 text-center font-semibold transition ${mode === "in" ? "bg-[#D7FF35] text-[#0D100C] shadow-sm" : "text-[#BAC2B4] hover:text-white"}`}
            >
              Вход
            </Link>
            <Link
              to="/auth"
              search={{ mode: "up" }}
              onClick={() => {
                setMode("up");
                setFieldError(null);
                setNotice("");
                setError("");
              }}
              aria-current={mode === "up" ? "page" : undefined}
              className={`rounded-lg py-2.5 text-center font-semibold transition ${mode === "up" ? "bg-[#D7FF35] text-[#0D100C] shadow-sm" : "text-[#BAC2B4] hover:text-white"}`}
            >
              Регистрация
            </Link>
          </div>
          <form
            className="space-y-3"
            aria-busy={busy}
            onSubmit={submit}
            onInvalid={(event) => {
              const field = event.target;
              if (field instanceof HTMLInputElement)
                setFieldError(
                  (current) => current ?? { name: field.name, text: field.validationMessage },
                );
            }}
            onInput={() => setFieldError(null)}
          >
            {mode === "up" && (
              <MobileField
                label="Никнейм"
                hint="Например, river_hunter"
                error={errorFor("username")}
              >
                <input
                  name="username"
                  className="field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={24}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </MobileField>
            )}
            {mode !== "new-password" && (
              <MobileField label="Email" error={errorFor("email")}>
                <input
                  name="email"
                  className="field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete={mode === "in" ? "username" : "email"}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </MobileField>
            )}
            {(mode === "in" || mode === "up" || mode === "new-password") && (
              <MobileField
                label={mode === "new-password" ? "Новый пароль" : "Пароль"}
                hint={mode !== "in" ? "Не менее 6 символов." : undefined}
                error={errorFor("password")}
                action={
                  <button
                    type="button"
                    className="text-primary"
                    aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((value) => !value)}
                  >
                    {passwordVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                }
              >
                <input
                  name="password"
                  className="field"
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  required
                />
              </MobileField>
            )}
            {mode === "new-password" && (
              <MobileField
                label="Повтори новый пароль"
                error={errorFor("confirmPassword")}
                action={
                  <button
                    type="button"
                    className="text-primary"
                    aria-label={confirmVisible ? "Скрыть повтор пароля" : "Показать повтор пароля"}
                    aria-pressed={confirmVisible}
                    onClick={() => setConfirmVisible((value) => !value)}
                  >
                    {confirmVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                }
              >
                <input
                  name="confirmPassword"
                  className="field"
                  type={confirmVisible ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </MobileField>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm"
              >
                {notice}
              </p>
            )}
            <StickyFormActions>
              <button type="submit" className="btn-primary min-h-12 w-full" disabled={busy}>
                {busy
                  ? "Подожди…"
                  : mode === "in"
                    ? "Войти в ZAPRUDA →"
                    : mode === "up"
                      ? "Зарегистрироваться →"
                      : mode === "forgot"
                        ? "Получить письмо →"
                        : "Сохранить пароль →"}
              </button>
            </StickyFormActions>
            {mode === "in" && (
              <button
                type="button"
                className="min-h-11 w-full text-center text-xs font-semibold text-[#D7FF35] hover:underline"
                onClick={() => {
                  setMode("forgot");
                  setFieldError(null);
                  setError("");
                  setNotice("");
                }}
              >
                Забыли пароль?
              </button>
            )}
            {(mode === "forgot" || mode === "new-password") && (
              <button
                type="button"
                className="min-h-11 w-full text-center text-xs text-zinc-400 hover:text-white"
                onClick={() => {
                  setMode("in");
                  setFieldError(null);
                  setError("");
                  setNotice("");
                }}
              >
                Вернуться ко входу
              </button>
            )}
          </form>
          <SocialAuthButtons onError={setError} />
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Продолжая, ты используешь ZAPRUDA для общения и публикации рыболовных отчётов.
          </p>
        </section>
      </div>
    </Shell>
  );
}
