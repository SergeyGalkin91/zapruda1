import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Shell, NotConnected } from "@/components/Shell";
import { countries, topics } from "@/lib/geo";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Сообщества — ZAPRUDA" },
      { name: "description", content: "Чаты рыболовов по странам, регионам, городам и интересам." },
      { property: "og:title", content: "Сообщества — ZAPRUDA" },
      { property: "og:description", content: "Чаты рыболовов по странам, регионам, городам и интересам." },
    ],
  }),
  component: Communities,
});

function Communities() {
  const [country, setCountry] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const cis = countries.filter((c) => c.group === "cis");
  const special = countries.filter((c) => c.group === "special");
  const Chip = ({ c }: { c: (typeof countries)[number] }) => (
    <button
      onClick={() => setCountry(c.code)}
      className={`panel flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold ${country === c.code ? "border-primary" : ""}`}
    >
      <span className="text-lg">{c.flag}</span>{c.name}
    </button>
  );
  const sel = countries.find((c) => c.code === country);

  return (
    <Shell>
      <h1 className="text-3xl font-bold">Сообщества</h1>
      <section className="mt-6 overflow-hidden rounded-3xl border border-[#D7FF35]/30 bg-gradient-to-br from-[#233219] via-[#172018] to-[#0D100C] p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 text-[#D7FF35]">
            <Send className="size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D7FF35]">Официальное Telegram-сообщество</p>
            <h2 className="mt-1 text-xl font-black text-white">ZAPRUDA COMMUNITY</h2>
            <p className="mt-1 text-sm text-zinc-300">Новости приложения, обсуждения рыбалки и общение участников.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="https://t.me/ZAPRUDACOMMUNITY" target="_blank" rel="noopener noreferrer"
            className="btn-primary inline-flex"><MessageCircle className="size-4" /> Открыть Telegram</a>
          <Link to="/feedback" className="btn-ghost inline-flex"><ShieldCheck className="size-4" /> Предложить улучшение</Link>
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-400">
          Предложения и обращения к администрации отправляй через защищённую форму ZAPRUDA.
          Личные контакты, заявки и жалобы не публикуются в публичной Telegram-группе. Для них предусмотрен закрытый чат администрации.
        </p>
      </section>
      <Link to="/chat" className="panel mt-6 flex items-center justify-between p-5 hover:border-primary">
        <div>
          <p className="font-display font-bold">Весь ZAPRUDA</p>
          <p className="text-sm text-muted-foreground">Общий чат рыбаков со всего сообщества</p>
        </div>
        <span className="text-primary">→</span>
      </Link>

      <h2 className="mt-8 mb-3 text-sm uppercase tracking-widest text-muted-foreground">Страны СНГ</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{cis.map((c) => <Chip key={c.code} c={c} />)}</div>
      <h2 className="mt-6 mb-3 text-sm uppercase tracking-widest text-muted-foreground">Отдельный раздел</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{special.map((c) => <Chip key={c.code} c={c} />)}</div>

      {sel && (
        <section className="mt-6 space-y-3">
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Регион или город — ${sel.name}`} />
          <NotConnected what="Регионы, города и городские чаты" />
        </section>
      )}

      <h2 className="mt-8 mb-3 text-sm uppercase tracking-widest text-muted-foreground">По интересам</h2>
      <div className="flex flex-wrap gap-2">
        {topics.map((t) => <span key={t} className="btn-ghost">{t}</span>)}
      </div>
    </Shell>
  );
}
