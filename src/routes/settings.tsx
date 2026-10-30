import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, MessageCircle, Monitor, RotateCcw, Settings2, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  APP_BACKGROUNDS, CHAT_BACKGROUNDS, DEFAULT_APPEARANCE,
  loadAppearance, applyAppearance, saveAppearance, type Appearance,
} from "@/lib/appearance";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Настройки оформления — ZAPRUDA COMMUNITY" },
    { name: "description", content: "Настройка фона приложения и фона чатов." },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = loadAppearance();
    setAppearance(saved);
    applyAppearance(saved);
  }, []);

  function change(next: Appearance) {
    setAppearance(next);
    const persisted = saveAppearance(next);
    setNotice(persisted
      ? "Оформление сохранено на этом устройстве."
      : "Оформление применено, но браузер запретил сохранение. После перезапуска оно может сброситься.");
  }

  return <Shell>
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-[#D7FF35]">
        <ArrowLeft className="size-4" /> Вернуться к ленте
      </Link>
      <header className="rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#1B2718] to-[#10150E] p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7FF35]">ZAPRUDA / ПЕРСОНАЛИЗАЦИЯ</p>
        <h1 className="mt-2 flex items-center gap-3 text-2xl font-black text-white sm:text-3xl">
          <Settings2 className="size-7 text-[#D7FF35]" /> Настройки
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Настрой внешний вид ZAPRUDA под себя. Изменения применяются сразу, без перезагрузки и без изменения твоего аккаунта.
        </p>
      </header>

      <section aria-labelledby="app-background-title" className="rounded-3xl border border-white/10 bg-[#141914] p-5 sm:p-7">
        <h2 id="app-background-title" className="flex items-center gap-2 text-lg font-black text-white">
          <Monitor className="size-5 text-[#D7FF35]" /> Фон приложения
        </h2>
        <p className="mt-2 text-sm text-zinc-400">Задаёт основу оформления страниц. Фирменные цвета кнопок сохраняются для читаемости.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {APP_BACKGROUNDS.map(item => {
            const selected = appearance.background === item.value;
            return <button key={item.value} type="button" aria-pressed={selected}
              onClick={() => change({ ...appearance, background: item.value })}
              className={"rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7FF35] " +
                (selected ? "border-[#D7FF35] bg-[#D7FF35]/10" : "border-white/10 bg-black/15 hover:border-[#D7FF35]/45")}>
              <span className="relative block h-20 rounded-xl border border-white/10" style={{ background: item.preview }}>
                {selected && <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#D7FF35] text-black"><Check className="size-4" /></span>}
              </span>
              <span className="mt-3 block text-sm font-bold text-white">{item.title}</span>
              <span className="mt-1 block text-xs text-zinc-400">{item.description}</span>
            </button>;
          })}
        </div>
      </section>

      <section aria-labelledby="chat-background-title" className="rounded-3xl border border-white/10 bg-[#141914] p-5 sm:p-7">
        <h2 id="chat-background-title" className="flex items-center gap-2 text-lg font-black text-white">
          <MessageCircle className="size-5 text-[#D7FF35]" /> Фон чатов
        </h2>
        <p className="mt-2 text-sm text-zinc-400">Отдельное оформление области сообщений в общем и личных чатах.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {CHAT_BACKGROUNDS.map(item => {
            const selected = appearance.chat === item.value;
            return <button key={item.value} type="button" aria-pressed={selected}
              onClick={() => change({ ...appearance, chat: item.value })}
              className={"rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7FF35] " +
                (selected ? "border-[#D7FF35] bg-[#D7FF35]/10" : "border-white/10 bg-black/15 hover:border-[#D7FF35]/45")}>
              <span className="relative block h-20 overflow-hidden rounded-xl border border-white/10" style={{ background: item.preview }}>
                <span className="absolute left-3 top-3 rounded-lg bg-black/30 px-3 py-1.5 text-[10px] text-white">Привет, как клёв?</span>
                <span className="absolute bottom-3 right-3 rounded-lg border border-[#D7FF35]/30 bg-[#D7FF35]/10 px-3 py-1.5 text-[10px] text-[#D7FF35]">Отлично! 🎣</span>
                {selected && <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#D7FF35] text-black"><Check className="size-4" /></span>}
              </span>
              <span className="mt-3 block text-sm font-bold text-white">{item.title}</span>
              <span className="mt-1 block text-xs text-zinc-400">{item.description}</span>
            </button>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to="/chat" className="font-semibold text-[#D7FF35] hover:underline">Открыть общий чат →</Link>
          <Link to="/messages" search={{ mark: "" }} className="font-semibold text-[#D7FF35] hover:underline">Открыть личные сообщения →</Link>
        </div>
      </section>

      {notice && <p role="status" className="rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/5 p-4 text-sm text-[#D7FF35]">{notice}</p>}
      <footer className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
        <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-zinc-400">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#D7FF35]" />
          Настройки хранятся только в этом браузере. На аккаунт, рыболовные отчёты и сохранённые координаты они не влияют.
        </p>
        <button type="button" onClick={() => change({ ...DEFAULT_APPEARANCE })}
          className="btn-ghost inline-flex min-h-11 items-center gap-2">
          <RotateCcw className="size-4" /> Сбросить оформление
        </button>
      </footer>
    </div>
  </Shell>;
}
