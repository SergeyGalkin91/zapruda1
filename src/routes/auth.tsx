import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Wordmark } from "@/components/Wordmark";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { supabase } from "@/integrations/supabase/client";

type Mode = "in" | "up" | "forgot" | "new-password";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode === "up" || search.mode === "forgot" || search.mode === "new-password" ? search.mode : "in") as Mode,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      // recovery session detection for new-password mode is handled by URL/hash in parent flows
      if (data.session && initialMode === "new-password") setMode("new-password");
    });
    return () => { active = false; };
  }, [initialMode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "up") {
        if (password.length < 6) throw new Error("Пароль должен быть не короче 6 символов.");
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() || undefined } },
        });
        if (signUpError) throw signUpError;
        setNotice("Проверь почту и подтверди адрес, затем войди в аккаунт.");
        setMode("in");
      } else if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth?mode=new-password` : undefined,
        });
        if (resetError) throw resetError;
        setNotice("Если аккаунт существует, письмо для сброса пароля уже отправлено.");
      } else if (mode === "new-password") {
        if (password.length < 6) throw new Error("Пароль должен быть не короче 6 символов.");
        if (password !== confirmPassword) throw new Error("Пароли не совпадают.");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setNotice("Пароль обновлён. Можно пользоваться аккаунтом.");
        setMode("in");
        setPassword("");
        setConfirmPassword("");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) {
          setError("Не удалось войти. Alpha использует отдельную тестовую базу: аккаунты предыдущей версии сюда не перенесены. Создай тестовый аккаунт через «Регистрация» или проверь данные нового аккаунта.");
        } else {
          window.location.href = "/";
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить запрос.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-[440px] overflow-hidden rounded-[28px] border border-[#344153] bg-[#070B10] shadow-[0_25px_100px_rgba(0,0,0,0.65)]">
        <aside className="relative flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_60%_83%,#F9A43B_0%,#C4673A_12%,#533C59_34%,#17233A_63%,#070B10_100%)] px-5 pb-5 pt-5">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(0deg,#030A10_8%,#10182D_70%,transparent_100%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[14%] h-px bg-[#F8B25E]/40 shadow-[0_0_18px_4px_rgba(255,166,73,0.18)]" />
          <div className="relative z-10">
            <Wordmark />
            <h1 className="mt-5 max-w-sm text-[1.65rem] font-black leading-[1.15] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.65)] sm:text-3xl sm:leading-tight">Вход в сообщество рыболовов</h1>
            <p className="mt-2.5 max-w-xs text-sm leading-5 text-muted-foreground">Записывай выезды, делись уловом и обсуждай рыбалку с теми, кто в теме.</p>
          </div>
          <p className="relative z-10 mt-4 text-xs leading-5 text-muted-foreground">Рыболовное сообщество без лишнего шума 🎣</p>
        </aside>
        <section className="bg-[#070B10] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Рыболовное сообщество</p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{mode === "in" ? "С возвращением" : mode === "up" ? "Создать аккаунт" : mode === "forgot" ? "Восстановить пароль" : "Новый пароль"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{mode === "in" ? "Войди в тестовое сообщество по email и паролю." : mode === "up" ? "Заполни данные и подтверди адрес электронной почты." : mode === "forgot" ? "Отправим ссылку для сброса пароля на почту." : "Придумай новый пароль для своего аккаунта."}</p>

          <div className="my-4 grid grid-cols-2 rounded-xl bg-[#20271D] p-1 text-sm">
            <a href="/auth?mode=in" aria-current={mode === "in" ? "page" : undefined} className={`rounded-lg py-2.5 text-center font-semibold transition ${mode === "in" ? "bg-[#D7FF35] text-[#0D100C] shadow-sm" : "text-[#BAC2B4] hover:text-white"}`}>Вход</a>
            <a href="/auth?mode=up" aria-current={mode === "up" ? "page" : undefined} className={`rounded-lg py-2.5 text-center font-semibold transition ${mode === "up" ? "bg-[#D7FF35] text-[#0D100C] shadow-sm" : "text-[#BAC2B4] hover:text-white"}`}>Регистрация</a>
          </div>

          <form className="mt-4 space-y-3.5" onSubmit={onSubmit}>
            {mode === "up" && <label className="block space-y-1.5 text-sm font-medium">
              Имя в сообществе
              <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" maxLength={40} placeholder="Как к тебе обращаться" />
            </label>}
            {(mode === "in" || mode === "up" || mode === "forgot") && <label className="block space-y-1.5 text-sm font-medium">
              Email
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>}
            {(mode === "in" || mode === "up" || mode === "new-password") && <label className="block space-y-1.5 text-sm font-medium">
              {mode === "new-password" ? "Новый пароль" : "Пароль"}
              <span className="relative block">
                <input className="field pr-14" type={passwordVisible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} required />
                <button type="button" aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((prev) => !prev)} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-[#D7FF35] hover:bg-white/10">
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
