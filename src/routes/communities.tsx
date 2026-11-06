import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Globe2,
  MessageCircle,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { SocialGroups } from "@/components/SocialGroups";
import { SocialMeetups } from "@/components/SocialMeetups";
import { VerifiedGuideDirectory } from "@/components/VerifiedGuideDirectory";
import { ScreenSectionNav } from "@/components/ScreenSectionNav";
import { countries } from "@/lib/geo";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Сообщества — ZAPRUDA" },
      { name: "description", content: "Свои люди на своей воде. Чаты, клубы и СХОДКИ рыболовов." },
      { property: "og:title", content: "Сообщества — ZAPRUDA" },
    ],
  }),
  component: Communities,
});

const communitySections = [
  { id: "community-geography", label: "География" },
  { id: "community-clubs", label: "Клубы" },
  { id: "community-meetups", label: "СХОДКИ" },
] as const;

function Communities() {
  const [country, setCountry] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const selectedCountry = useRef<HTMLDivElement>(null);
  const visible = countries.filter(
    (c) =>
      c.group === "cis" && c.name.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")),
  );
  const selected = countries.find((c) => c.code === country);

  useEffect(() => {
    if (country && window.matchMedia("(max-width: 639px)").matches) {
      selectedCountry.current?.scrollIntoView({ block: "nearest" });
    }
  }, [country]);

  return (
    <Shell screen="communities">
      <header className="z-screen-heading">
        <div>
          <p className="z-eyebrow">СВОИ ЛЮДИ. СВОЯ ВОДА.</p>
          <h1>Сообщества</h1>
        </div>
        <Link
          to="/chat"
          search={{ country: "", place: "", topic: "general" }}
          className="z-round-action"
          aria-label="Общий чат ZAPRUDA"
        >
          <MessageCircle className="size-5" />
        </Link>
      </header>
      <p className="z-screen-description">
        Выбирай свою географию. Находи напарников, клубы и новые истории.
      </p>
      <ScreenSectionNav
        route="/communities"
        label="Каталог сообществ"
        sections={communitySections}
      />
      <section
        id="community-geography"
        className="z-communities-geo"
        aria-labelledby="geography-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="geography-title" className="text-base font-bold">
            Страны и регионы
          </h2>
          <Globe2 className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <label className="z-country-search mb-4 flex min-h-12 items-center gap-3 rounded-xl border border-white/15 bg-[var(--premium-panel)] px-4">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Поиск страны</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти страну"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
          />
        </label>
        <div className="z-country-grid">
          {visible.map((c) => (
            <button
              type="button"
              key={c.code}
              onClick={() => setCountry((v) => (v === c.code ? null : c.code))}
              aria-pressed={country === c.code}
              aria-controls="zapruda-selected-country"
              className="z-country-card flex min-w-0 items-center px-4 py-3 text-left text-sm font-semibold"
            >
              <span aria-hidden="true">{c.flag}</span>
              <span className="min-w-0 flex-1 break-words">{c.name}</span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </div>
        {!visible.length && (
          <p role="status" className="z-premium-card p-5 text-sm text-muted-foreground">
            Такой страны пока нет в каталоге. Попробуй другое название.
          </p>
        )}
        <div ref={selectedCountry} id="zapruda-selected-country" aria-live="polite">
          {selected && (
            <section aria-label="Выбранная страна" className="z-premium-card mt-4 p-5">
              <p className="font-bold">
                {selected.flag} {selected.name}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Выбери регион, город и тему в чате страны. Участники и сообщения — настоящие.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/chat"
                  search={{ country: selected.code, place: "", topic: "general" }}
                  className="btn-primary"
                >
                  Открыть чаты страны <ArrowUpRight className="size-4" />
                </Link>
                <Link to="/atlas" search={{ country: selected.code }} className="btn-ghost">
                  Атлас водоёмов
                </Link>
              </div>
            </section>
          )}
        </div>
      </section>
      <Link
        to="/chat"
        search={{ place: "", topic: "general", country: "" }}
        className="z-premium-card flex items-center gap-4 p-5"
      >
        <span className="z-round-action">
          <Users className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm">Весь ZAPRUDA</strong>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            Общий чат, истории с воды и знакомство со своими.
          </span>
        </span>
        <ArrowUpRight className="size-4 text-[#D7FF35]" />
      </Link>
      <Link to="/on-spot" className="z-premium-card mt-3 flex items-center gap-4 p-5">
        <span className="z-round-action">
          <MapPin className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm">ON SPOT+ · Рыбаки рядом</strong>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            Проверить доступность локальных зон общения.
          </span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-[#D7FF35]" aria-hidden="true" />
      </Link>
      <div id="community-meetups" className="z-community-section">
        <SocialMeetups />
      </div>
      <div id="community-clubs" className="z-community-section">
        <SocialGroups />
      </div>
      <VerifiedGuideDirectory />
      <Link
        to="/atlas"
        search={{ country: "" }}
        className="z-premium-card mt-6 flex items-center gap-4 p-5"
      >
        <Globe2 className="size-6 text-[#D7FF35]" />
        <span className="min-w-0 flex-1">
          <strong className="block">Атлас рыболова</strong>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            Водоёмы России и СНГ, виды рыб и коллекции трофеев.
          </span>
        </span>
        <ArrowUpRight className="size-4" />
      </Link>
      <section className="z-community-telegram">
        <p className="z-eyebrow">НА СВЯЗИ</p>
        <h2 className="mt-2 flex items-center gap-2 font-bold">
          <Send className="size-4 text-[#D7FF35]" />
          ZAPRUDA в Telegram
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Новости приложения, обсуждения рыбалки и общение участников.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://t.me/ZAPRUDACOMMUNITY"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            <MessageCircle className="size-4" />
            Открыть Telegram
          </a>
          <Link to="/feedback" className="btn-ghost">
            <ShieldCheck className="size-4" />
            Предложить улучшение
          </Link>
        </div>
        <p className="mt-4 leading-5 text-muted-foreground">
          Личные контакты, заявки и жалобы не публикуются в Telegram-группе. Обращения команде
          отправляй через защищённую форму ZAPRUDA.
        </p>
      </section>
    </Shell>
  );
}
