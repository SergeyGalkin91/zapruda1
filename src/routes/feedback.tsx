import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Handshake, Lightbulb, Send, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [
    { title: "Сотрудничество и идеи — ZAPRUDA" },
    { name: "description", content: "Предложить партнёрство или улучшение рыболовного приложения ZAPRUDA." },
  ] }),
  component: FeedbackPage,
});

type Kind = "collaboration" | "improvement";

export function FeedbackPage() {
  const [category, setCategory] = useState<Kind>("improvement");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; notified: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setAuthenticated(Boolean(data.user)));
  }, []);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setResult(null);
    const { data, error: invokeError } = await supabase.functions.invoke("submit-community-feedback", {
      body: { category, subject, message, contact },
    });
    setSubmitting(false);
    if (invokeError || !data?.ok) {
      setError(data?.error || "Не удалось отправить. Проверь подключение и войди в аккаунт.");
      return;
    }
    setResult({ id: String(data.id), notified: data.notification === "sent" });
    setSubject("");
    setMessage("");
    setContact("");
  }

  return <Shell>
    <section className="relative overflow-hidden rounded-3xl border border-[#D7FF35]/20 bg-gradient-to-br from-[#233018] via-[#161D12] to-[#0D100C] p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[#D7FF35]/10 blur-3xl" />
      <p className="relative text-xs font-extrabold uppercase tracking-[0.2em] text-[#D7FF35]">ZAPRUDA / ОБРАТНАЯ СВЯЗЬ</p>
      <h1 className="relative mt-3 text-2xl font-black text-white sm:text-4xl">Давай сделаем рыбалку лучше.</h1>
      <p className="relative mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Предложи новую функцию или сотрудничество с ZAPRUDA. Мы читаем обращения — от идей рыбаков до предложений магазинов, клубов и гидов.</p>
    </section>
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
      <section className="rounded-3xl border border-white/10 bg-[#151A14] p-5 sm:p-7">
        <h2 className="text-lg font-black text-white">Написать команде</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {([["improvement","Предложить улучшение",Lightbulb],["collaboration","Сотрудничество",Handshake]] as const).map(([value,title,Icon]) =>
            <button key={value} type="button" aria-pressed={category===value} onClick={() => {setCategory(value);setResult(null);}}
              className={"flex min-h-20 flex-col items-start justify-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-bold transition sm:text-sm "+
                (category===value?"border-[#D7FF35]/70 bg-[#D7FF35]/10 text-[#D7FF35]":"border-white/10 bg-black/15 text-zinc-300 hover:border-[#D7FF35]/25")}>
              <Icon className="size-5" />{title}
            </button>
          )}
        </div>
        {authenticated===false && <div className="mt-5 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 p-4 text-sm text-zinc-300">
          Чтобы отправить обращение, <Link to="/auth" className="font-bold text-[#D7FF35] underline">войди в аккаунт ZAPRUDA</Link>.
        </div>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
        {result && <div role="status" className="mt-5 rounded-xl border border-[#D7FF35]/35 bg-[#D7FF35]/10 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#D7FF35]"><CheckCircle2 className="size-5" />Обращение сохранено</p>
          <p className="mt-2 text-xs text-zinc-300">Номер: {result.id.slice(0,8)}. {result.notified ? "Уведомление отправлено в администраторский чат." : "Уведомление в Telegram ожидает подключения или повторной обработки; обращение сохранено в системе."}</p>
        </div>}
        <form onSubmit={send} className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
            <span>Тема обращения *</span>
            <input className="field" required minLength={5} maxLength={140} value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={category==="collaboration"?"Например, партнёрство с рыболовным магазином":"Например, добавить поиск по водоёму"} />
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
            <span>{category==="collaboration"?"Как можем сотрудничать? *":"Что улучшить в приложении? *"}</span>
            <textarea className="field min-h-36" required minLength={20} maxLength={3000}
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Опиши предложение: что нужно сделать и какую пользу оно принесёт…" />
            <span className="block text-right text-[11px] font-normal text-zinc-500">{message.length} / 3000</span>
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
            <span>Как с тобой связаться (необязательно)</span>
            <input className="field" maxLength={180} value={contact}
              onChange={(e) => setContact(e.target.value)} placeholder="@Telegram или email" />
          </label>
          <p className="flex items-start gap-2 text-xs leading-5 text-zinc-400"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#D7FF35]" />Обращения не публикуются в ленте и доступны только автору и администрации. Не указывай пароли или платёжные данные.</p>
          <button type="submit" disabled={submitting || authenticated!==true} className="btn-primary">
            <Send className="size-4" />{submitting?"Отправляем…":"Отправить предложение"}
          </button>
        </form>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-[#151A14] p-5">
          <h3 className="flex items-center gap-2 font-black"><Lightbulb className="size-5 text-[#D7FF35]"/>Идеи сообщества</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Расскажи о новой функции, ошибке, неудобстве или лучшем способе искать рыбу, напарников и гидов.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151A14] p-5">
          <h3 className="flex items-center gap-2 font-black"><Handshake className="size-5 text-[#D7FF35]"/>Партнёрам</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Открыты к предложениям рыболовных гидов, магазинов, брендов, клубов и организаторов соревнований.</p>
        </div>
        <a href="https://t.me/ZAPRUDACOMMUNITY" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center rounded-xl border border-[#D7FF35]/25 px-4 py-3 text-sm font-bold text-[#D7FF35] hover:bg-[#D7FF35]/10">
          Telegram ZAPRUDA COMMUNITY
        </a>
      </aside>
    </div>
  </Shell>;
}
