import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, LockKeyhole, RefreshCcw, Send, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({ meta: [{ title: "Обращения пользователей — ZAPRUDA Admin" }] }),
  component: AdminFeedback,
});

type Entry = {
  id: string;
  user_id: string;
  request_type: "cooperation" | "improvement" | "bug";
  category: string;
  subject: string;
  body: string;
  contact: string;
  review_status: string;
  telegram_status: string;
  telegram_attempts: number;
  created_at: string;
};

const titles = {
  cooperation: "Сотрудничество",
  improvement: "Улучшение",
  bug: "Ошибка",
} as const;

function AdminFeedback() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<Entry[]>([]);
  const [kind, setKind] = useState("all");
  const [delivery, setDelivery] = useState("all");
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: identity } = await supabase.auth.getUser();
    if (!identity.user) {
      setAuthorized(false);
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: adminRow, error: adminError } = await supabase.from("zapruda_admins")
      .select("user_id").eq("user_id", identity.user.id).maybeSingle();
    if (adminError || !adminRow) {
      setAuthorized(false);
      setRows([]);
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const { data, error: queryError } = await supabase.from("community_requests")
      .select("id,user_id,request_type,category,subject,body,contact,review_status,telegram_status,telegram_attempts,created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (queryError) setError("Не удалось загрузить обращения: " + queryError.message);
    setRows((data ?? []) as Entry[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function retryTelegram(id: string) {
    if (retrying) return;
    setRetrying(id);
    setNotice("");
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke("admin-telegram-retry", {
      body: { id },
    });
    setRetrying(null);
    if (invokeError || data?.status !== "sent") {
      setError(typeof data?.error === "string" ? data.error : "Не удалось доставить в Telegram. Проверь настройки бота и чата.");
    } else {
      setNotice("Уведомление отправлено в закрытый Telegram-чат.");
    }
    await refresh();
  }

  const filtered = useMemo(() => rows.filter((item) =>
    (kind === "all" || item.request_type === kind) &&
    (delivery === "all" || item.telegram_status === delivery)
  ), [rows, kind, delivery]);

  return <Shell>
    <section className="rounded-3xl border border-[#D7FF35]/20 bg-[#172016] p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D7FF35]">ZAPRUDA / Только администрация</p>
      <h1 className="mt-2 text-2xl font-black">Обращения пользователей</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">Сотрудничество, пожелания и ошибки. Содержимое не публикуется в общем Telegram-канале. Отправка в закрытый чат требует настроенного бота.</p>
    </section>
    {loading ? <div className="panel mt-6 p-6 text-sm text-zinc-400">Проверяем права доступа…</div>
      : !authorized ? <div className="panel mt-6 p-7">
        <div className="flex items-center gap-3 text-[#D7FF35]"><LockKeyhole className="size-6" /><strong>Доступ только для назначенных администраторов</strong></div>
        <p className="mt-3 text-sm text-zinc-400">Роль администратора выдаётся на сервере и не может быть включена в пользовательском профиле.</p>
        <Link to="/feedback" className="btn-ghost mt-4 inline-flex">Вернуться к обращениям</Link>
      </div>
      : <>
        {notice && <p role="status" className="mt-5 rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 p-3 text-sm text-[#D7FF35]">{notice}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-xs text-zinc-300">Тип обращения
            <select aria-label="Тип обращения" className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Все</option><option value="cooperation">Сотрудничество</option>
              <option value="improvement">Улучшение</option><option value="bug">Ошибка</option>
            </select>
          </label>
          <label className="text-xs text-zinc-300">Уведомление Telegram
            <select aria-label="Статус Telegram" className="field mt-1" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
              <option value="all">Все</option><option value="pending">Ожидает</option>
              <option value="sent">Отправлено</option><option value="failed">Сбой</option><option value="processing">В обработке</option>
            </select>
          </label>
          <button type="button" className="btn-ghost mt-4" onClick={() => void refresh()}><RefreshCcw className="size-4" />Обновить</button>
        </div>
        <p className="mt-4 text-xs text-zinc-500">Показано: {filtered.length} из {rows.length} последних обращений.</p>
        <div className="mt-4 grid gap-3">
          {!filtered.length && <div className="panel p-8 text-center text-sm text-zinc-400"><Inbox className="mx-auto mb-2 size-7 text-[#D7FF35]" />Обращений пока нет.</div>}
          {filtered.map((entry) => <article key={entry.id} className="rounded-2xl border border-white/10 bg-[#151915] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#D7FF35]">{titles[entry.request_type] ?? entry.request_type}</span>
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                {entry.telegram_status === "sent" ? <ShieldCheck className="size-4 text-[#D7FF35]" /> : <Send className="size-4" />}
                Telegram: {entry.telegram_status === "sent" ? "доставлено" : entry.telegram_status === "failed" ? "сбой" : "ожидает"}
              </span>
            </div>
            <h2 className="mt-3 text-base font-bold text-white">{entry.subject}</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{entry.body}</p>
            {entry.contact && <p className="mt-3 break-words text-xs text-zinc-300"><strong>Контакт:</strong> {entry.contact}</p>}
            {(entry.telegram_status === "pending" || entry.telegram_status === "failed") && entry.telegram_attempts < 3 &&
              <button type="button" className="btn-ghost mt-3 inline-flex" disabled={retrying !== null}
                onClick={() => void retryTelegram(entry.id)}>
                <Send className="size-4" />
                {retrying === entry.id ? "Отправляем…" : "Повторить уведомление в Telegram"}
              </button>}
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-zinc-500">
              <span>{new Date(entry.created_at).toLocaleString("ru-RU")}</span>
              <span>ID: {entry.id.slice(0, 8)} · Статус: {entry.review_status}</span>
            </div>
          </article>)}
        </div>
      </>}
  </Shell>;
}
