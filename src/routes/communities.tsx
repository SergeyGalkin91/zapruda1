import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SocialGroups } from "@/components/SocialGroups";
import { VerifiedGuideDirectory } from "@/components/VerifiedGuideDirectory";
import { countries } from "@/lib/geo";

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
  const cis = countries.filter((c) => c.group === "cis");
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
      <h1 className="z-underground-title text-4xl text-white sm:text-6xl">КОМЬЮНИТИ</h1>
      <section className="z-underground mt-6 overflow-hidden bg-gradient-to-br from-[#1F1B29] via-[#101314] to-[#0B0D0E] p-5 sm:p-7">
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
      <Link to="/chat" className="z-underground mt-6 flex items-center justify-between p-5 transition hover:border-[#A78BFA]/50">
        <div>
          <p className="font-display font-bold">Весь ZAPRUDA</p>
          <p className="text-sm text-muted-foreground">Общий чат и переход к странам, областям, городам и тематическим веткам</p>
        </div>
        <span className="text-primary">→</span>
      </Link>

      <SocialGroups />
      <VerifiedGuideDirectory />

      <h2 className="mt-8 mb-3 text-sm uppercase tracking-widest text-muted-foreground">Страны СНГ</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{cis.map((c) => <Chip key={c.code} c={c} />)}</div>
      {sel && <section className="mt-5 rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/5 p-4 text-sm">
        <p className="font-semibold text-[#D7FF35]">{sel.flag} {sel.name}</p>
        <p className="mt-1 text-zinc-300">Общайся с рыболовами этой страны, выбери регион и город, затем тематическую ветку.</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link to="/chat" search={{country: sel.code, place: "", topic: "general"}} className="inline-flex font-bold text-[#D7FF35] underline">Открыть чаты страны →</Link>
          <Link to="/atlas" search={{country: sel.code}} className="inline-flex font-semibold text-zinc-300 underline">Атлас водоёмов →</Link>
        </div>
      </section>}
      <Link to="/atlas" search={{ country: "" }} className="mt-6 flex items-center justify-between rounded-[22px] border border-[#A78BFA]/30 bg-[#A78BFA]/10 p-5 transition hover:border-[#D7FF35]">
        <span><strong className="block text-lg text-[#D7FF35]">Атлас рыболова</strong><span className="mt-1 block text-sm text-zinc-300">Водоёмы России и СНГ, карточки рыб и коллекции трофеев</span></span>
        <span className="text-[#D7FF35]">Открыть →</span>
      </Link>
    </Shell>
  );
}
