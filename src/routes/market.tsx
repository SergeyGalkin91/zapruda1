import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Барахолка — ZAPRUDA" },
      { name: "description", content: "Рыболовные снасти, приманки и экипировка от рыболовов." },
    ],
  }),
  component: Market,
});

type Listing = {
  id: number;
  title: string;
  category: string;
  price: number;
  condition: string;
  location: string;
  emoji: string;
  detail: string;
  featured?: boolean;
};

const categories = ["Все", "Спиннинги", "Катушки", "Приманки", "Экипировка", "Отдам даром"];
const demoListings: Listing[] = [
  { id: 1, title: "Спиннинг для джига", category: "Спиннинги", price: 6500, condition: "Б/у · отличное", location: "Нижний Новгород", emoji: "🎣", detail: "Тест до 28 г, бережное использование", featured: true },
  { id: 2, title: "Катушка 3000 с запасной шпулей", category: "Катушки", price: 4200, condition: "Б/у · хорошее", location: "Кстово", emoji: "⚙️", detail: "Плавный ход, без люфтов" },
  { id: 3, title: "Набор силиконовых приманок", category: "Приманки", price: 800, condition: "Новое", location: "Нижний Новгород", emoji: "🐟", detail: "Виброхвосты и твистеры разных цветов" },
  { id: 4, title: "Вейдерсы для береговой ловли", category: "Экипировка", price: 2500, condition: "Б/у · хорошее", location: "Бор", emoji: "🥾", detail: "Размер 43–44, без протечек" },
  { id: 5, title: "Коробка приманок начинающему", category: "Отдам даром", price: 0, condition: "Б/у", location: "Нижний Новгород", emoji: "🧰", detail: "Отдам новичку, самовывоз", featured: true },
  { id: 6, title: "Комплект джиг-головок", category: "Приманки", price: 500, condition: "Новое", location: "Дзержинск", emoji: "🪝", detail: "Разные веса для течения и стоячей воды" },
];

function Market() {
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ru-RU");
    const rows = demoListings.filter((item) =>
      (category === "Все" || item.category === category) &&
      (!q || [item.title, item.category, item.location, item.detail].some((v) => v.toLocaleLowerCase("ru-RU").includes(q)))
    );
    return sort === "cheap" ? [...rows].sort((a, b) => a.price - b.price) : rows;
  }, [category, query, sort]);

  return (
    <Shell>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-lime-300/20 bg-[#10120c] p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-10 -top-12 size-56 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-300">ZAPRUDA / MARKET</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Барахолка<br /><span className="text-lime-300">для своих.</span></h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-300 sm:text-base">Снасти, приманки и экипировка. Покупай у рыболовов, находи нужное рядом и отдавай вещам второй шанс.</p>
          <button type="button" onClick={() => alert("Публикация объявлений подключается следующим этапом. Сейчас это макет раздела.")} className="mt-5 rounded-xl bg-lime-300 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-lime-200">＋ Разместить объявление</button>
        </div>
        <div className="absolute bottom-3 right-5 hidden text-7xl opacity-20 sm:block" aria-hidden="true">🎣</div>
      </section>

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="sr-only" htmlFor="market-search">Поиск товаров</label>
        <input id="market-search" className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти спиннинг, катушку, приманку…" />
        <select className="field" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка">
          <option value="new">Сначала актуальные</option>
          <option value="cheap">Сначала дешевле</option>
        </select>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === item ? "border-lime-300 bg-lime-300 text-black" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-lime-300/50"}`}>
            {item}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-end justify-between">
        <div><h2 className="text-xl font-bold">Объявления</h2><p className="mt-1 text-xs text-muted-foreground">Демо-карточки для согласования дизайна</p></div>
        <span className="text-sm text-muted-foreground">{filtered.length} товаров</span>
      </div>
      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#11120f] transition hover:-translate-y-0.5 hover:border-lime-300/40">
              <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#171b0a]">
                <span className="text-7xl drop-shadow-lg transition group-hover:scale-110" aria-hidden="true">{item.emoji}</span>
                {item.featured && <span className="absolute left-3 top-3 rounded-full bg-lime-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">Выбор ZAPRUDA</span>}
                <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-xs text-white">{item.condition}</span>
              </div>
              <div className="space-y-3 p-4">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-lime-300">{item.category}</p><h3 className="mt-1 font-bold text-white">{item.title}</h3><p className="mt-1 text-sm text-zinc-400">{item.detail}</p></div>
                <div className="flex items-end justify-between gap-3">
                  <div><p className="text-xl font-black text-lime-300">{item.price === 0 ? "Бесплатно" : item.price.toLocaleString("ru-RU") + " ₽"}</p><p className="mt-1 text-xs text-zinc-500">⌖ {item.location}</p></div>
                  <button type="button" onClick={() => alert("Связь с продавцом подключим вместе с публикацией реальных объявлений.")} className="rounded-xl border border-lime-300/40 px-3 py-2 text-xs font-bold text-lime-200 hover:bg-lime-300 hover:text-black">Связаться</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="panel p-8 text-center"><p className="font-semibold">Ничего не найдено</p><p className="mt-1 text-sm text-muted-foreground">Попробуй изменить запрос или категорию.</p><button className="btn-ghost mt-3" onClick={() => { setQuery(""); setCategory("Все"); }}>Сбросить фильтры</button></div>}

      <section className="mt-8 rounded-2xl border border-white/10 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-lime-300">Безопасная сделка</p>
        <h2 className="mt-2 text-lg font-bold">Проверяй снасти перед оплатой</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Для первой версии заложим профиль продавца, дату регистрации, отзывы и жалобу на объявление. Не отправляй предоплату незнакомцам без проверки.</p>
      </section>
      <p className="mt-5 text-xs text-muted-foreground"><Link to="/profile" className="underline underline-offset-4">Мой профиль</Link> · Объявления и сообщения продавцам пока представлены демонстрационными данными.</p>
    </Shell>
  );
}
