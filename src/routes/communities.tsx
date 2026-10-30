import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SocialGroups } from "@/components/SocialGroups";
import { VerifiedGuideDirectory } from "@/components/VerifiedGuideDirectory";

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
          <p className="text-sm text-muted-foreground">Общий чат и переход к странам, областям, городам и тематическим веткам</p>
        </div>
        <span className="text-primary">→</span>
      </Link>

      <SocialGroups />
      <VerifiedGuideDirectory />

    </Shell>
  );
}
