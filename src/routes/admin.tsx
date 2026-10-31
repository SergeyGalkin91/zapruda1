import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Wallet, ClipboardList, Inbox, LogIn, LockKeyhole } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Кабинет администрации — ZAPRUDA COMMUNITY" }] }),
  component: AdminConsole,
});

type Section = { title: string; description: string; href: "/moderation" | "/finance" | "/admin/feedback"; Icon: typeof ShieldCheck };
const sections: Section[] = [
  { title: "Заявки и модерация", description: "Заявки на клубы, подтверждение платежей, проверка гидов и документов.", href: "/moderation", Icon: ClipboardList },
  { title: "Финансы ZAPRUDA", description: "Подтверждённые платежи клубов, бронирования гидов, комиссии и обязательства.", href: "/finance", Icon: Wallet },
  { title: "Обращения пользователей", description: "Предложения, сотрудничество, сообщения об ошибках и доставка уведомлений.", href: "/admin/feedback", Icon: Inbox },
];

function AdminConsole() {
  const [state, setState] = useState<"loading" | "login" | "forbidden" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<{ clubs: number | null; guides: number | null; requests: number | null }>({ clubs: null, guides: null, requests: null });

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: identity, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !identity.user) { setState("login"); return; }
      const { data: admin, error: roleError } = await supabase.from("zapruda_admins")
        .select("user_id").eq("user_id", identity.user.id).maybeSingle();
      if (!active) return;
      if (roleError) { setError("Не удалось проверить права доступа."); setState("error"); return; }
      if (!admin) { setState("forbidden"); return; }
      setState("ready");
      // Counts come from the user's RLS-protected session; never use a service key in the browser.
      const db = supabase as any;
      const [clubs, guides, requests] = await Promise.all([
        db.from("club_creation_requests").select("id", { count: "exact", head: true }).eq("status", "awaiting_payment"),
        db.from("guide_verification_applications").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("community_requests").select("id", { count: "exact", head: true }),
      ]);
      if (active) setCounts({
        clubs: clubs.error ? null : clubs.count,
        guides: guides.error ? null : guides.count,
        requests: requests.error ? null : requests.count,
      });
    })().catch(() => { if (active) { setError("Сервис временно недоступен."); setState("error"); } });
    return () => { active = false; };
  }, []);

  return <Shell>
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl border border-[#D7FF35]/25 bg-[#151915] p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-[#D7FF35]">ZAPRUDA / PRIVATE ADMIN</p>
        <h1 className="mt-3 flex items-center gap-3 text-2xl font-black text-white sm:text-3xl">
          <ShieldCheck className="size-8 text-[#D7FF35]" /> Кабинет администрации
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Закрытый центр управления заявками, финансами и обращениями. Действия доступны только назначенным администраторам.</p>
      </header>
      {state === "loading" && <div className="panel p-6 text-sm text-zinc-400">Проверяем авторизацию и права…</div>}
      {state === "login" && <div className="panel space-y-4 p-6">
        <div className="flex items-center gap-2 font-bold"><LockKeyhole className="size-5 text-[#D7FF35]" /> Вход для администрации</div>
        <p className="text-sm text-zinc-400">Войди в свой аккаунт ZAPRUDA. Дополнительные административные права проверяются на сервере.</p>
        <Link to="/auth" search={{ mode: "in" }} className="btn-primary inline-flex items-center gap-2"><LogIn className="size-4" /> Войти</Link>
      </div>}
      {state === "forbidden" && <div role="alert" className="panel p-6 text-sm text-zinc-300">Доступ закрыт. Твой аккаунт не назначен администратором ZAPRUDA.</div>}
      {state === "error" && <div role="alert" className="rounded-xl border border-red-400/30 p-5 text-sm text-red-200">{error}</div>}
      {state === "ready" && <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Заявки на клубы", counts.clubs],
            ["Проверка гидов", counts.guides],
            ["Обращения", counts.requests],
          ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#151915] p-5">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#D7FF35]">{value === null ? "—" : value}</p>
          </div>)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map(({ title, description, href, Icon }) =>
            <Link key={href} to={href} className="rounded-2xl border border-[#D7FF35]/20 bg-[#151915] p-5 transition hover:border-[#D7FF35]/60">
              <Icon className="size-6 text-[#D7FF35]" />
              <h2 className="mt-4 font-black text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
              <span className="mt-4 block text-sm font-bold text-[#D7FF35]">Открыть раздел →</span>
            </Link>
          )}
        </div>
        <p className="text-xs text-zinc-500">Финансовые показатели берутся из существующего защищённого кабинета. Кабинет не является банковским счётом и не подтверждает поступление денег автоматически.</p>
      </>}
    </div>
  </Shell>;
}
