import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/market")({
  head: () => ({ meta: [{ title: "Барахолка — ZAPRUDA" }, { name: "description", content: "Рыболовные снасти, приманки и экипировка от рыболовов." }] }),
  component: Market,
});

type Listing = {
  id: string; user_id: string; title: string; description: string; category: string;
  price_rub: number; condition: string; city: string; photo_url: string | null; created_at: string;
};
const categories = ["Все", "Спиннинги", "Катушки", "Приманки", "Эхолоты", "Экипировка", "Лодки и моторы", "Отдам даром", "Другое"];
const conditions = ["Новое", "Б/у · отличное", "Б/у · хорошее", "Б/у · есть следы", "На запчасти"];

function Market() {
  const [items, setItems] = useState<Listing[]>([]);
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Спиннинги");
  const [price, setPrice] = useState("0");
  const [condition, setCondition] = useState("Б/у · хорошее");
  const [city, setCity] = useState("Нижний Новгород");
  const [photo, setPhoto] = useState<File | null>(null);

  async function loadListings() {
    setLoading(true);
    const { data, error } = await (supabase as any).from("market_listings").select("*").eq("status", "active").order("created_at", { ascending: false });
    if (error) setError("Не удалось загрузить объявления. Проверь, применена ли миграция marketplace в Supabase.");
    else { setItems((data ?? []) as Listing[]); setError(""); }
    setLoading(false);
  }
  useEffect(() => {
    void loadListings();
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ru-RU");
    const rows = items.filter((x) => (category === "Все" || x.category === category) &&
      (!q || [x.title, x.description, x.city, x.category].some((v) => (v ?? "").toLocaleLowerCase("ru-RU").includes(q))));
    return sort === "cheap" ? [...rows].sort((a, b) => a.price_rub - b.price_rub) : rows;
  }, [items, category, query, sort]);

  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Чтобы разместить объявление, сначала войди в аккаунт."); return; }
    if (title.trim().length < 3) { setError("Название должно быть не короче 3 символов."); return; }
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) throw new Error("Загрузи фото в формате JPG, PNG или WebP.");
        if (photo.size > 10 * 1024 * 1024) throw new Error("Фото должно быть меньше 10 МБ.");
        const path = auth.user.id + "/" + crypto.randomUUID() + "-" + photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const upload = await supabase.storage.from("market-photos").upload(path, photo, { upsert: false, contentType: photo.type });
        if (upload.error) throw upload.error;
        photoUrl = supabase.storage.from("market-photos").getPublicUrl(path).data.publicUrl;
      }
      const { error: insertError } = await (supabase as any).from("market_listings").insert({
        user_id: auth.user.id, title: title.trim(), description: description.trim(),
        category: formCategory, price_rub: Math.max(0, Math.round(Number(price) || 0)),
        condition, city: city.trim(), photo_url: photoUrl,
      });
      if (insertError) throw insertError;
      setTitle(""); setDescription(""); setPrice("0"); setPhoto(null); setShowForm(false);
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось опубликовать объявление.");
    } finally { setSaving(false); }
  }

  return (
    <Shell>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-lime-300/20 bg-[#10120c] p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-10 -top-12 size-56 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-300">ZAPRUDA / MARKET</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Барахолка<br /><span className="text-lime-300">для своих.</span></h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-300 sm:text-base">Снасти, приманки и экипировка. Покупай у рыболовов, находи нужное рядом и отдавай вещам второй шанс.</p>
          <button type="button" onClick={() => { setShowForm(!showForm); setError(""); }} className="mt-5 rounded-xl bg-lime-300 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-lime-200">＋ Разместить объявление</button>
        </div>
        <div className="absolute bottom-3 right-5 hidden text-7xl opacity-20 sm:block" aria-hidden="true">🎣</div>
      </section>

      {showForm && <form onSubmit={publish} className="mb-6 space-y-4 rounded-2xl border border-lime-300/30 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Новое объявление</h2><button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Закрыть</button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Название<input required minLength={3} maxLength={100} className="field mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, Narval Argument 2" /></label>
          <label className="text-sm">Категория<select className="field mt-1" value={formCategory} onChange={e => setFormCategory(e.target.value)}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-sm">Цена, ₽<input className="field mt-1" type="number" min="0" step="1" value={price} onChange={e => setPrice(e.target.value)} /></label>
          <label className="text-sm">Состояние<select className="field mt-1" value={condition} onChange={e => setCondition(e.target.value)}>{conditions.map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-sm">Город<input className="field mt-1" maxLength={100} value={city} onChange={e => setCity(e.target.value)} placeholder="Город" /></label>
          <label className="text-sm">Фото товара<input className="field mt-1" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] ?? null)} /><span className="mt-1 block text-xs text-muted-foreground">JPG, PNG или WebP, до 10 МБ</span></label>
        </div>
        <label className="block text-sm">Описание<textarea className="field mt-1 min-h-24" maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Состояние, характеристики, комплект..." /></label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button disabled={saving} className="rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{saving ? "Публикую…" : "Опубликовать объявление"}</button>
        {!userId && <p className="text-xs text-muted-foreground">Публикация доступна после входа в аккаунт.</p>}
      </form>}

      {!showForm && error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 p-3 text-sm text-red-300">{error}</p>}
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="sr-only" htmlFor="market-search">Поиск товаров</label>
        <input id="market-search" className="field" value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти спиннинг, катушку, приманку…" />
        <select className="field" value={sort} onChange={e => setSort(e.target.value)} aria-label="Сортировка"><option value="new">Сначала новые</option><option value="cheap">Сначала дешевле</option></select>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">{categories.map(item => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === item ? "border-lime-300 bg-lime-300 text-black" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-lime-300/50"}`}>{item}</button>)}</div>
      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold">Объявления</h2><p className="mt-1 text-xs text-muted-foreground">Реальные предложения сообщества</p></div><span className="text-sm text-muted-foreground">{filtered.length} товаров</span></div>
      {loading ? <div className="panel p-8 text-center text-muted-foreground">Загружаю объявления…</div> : filtered.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(item => <article key={item.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#11120f] transition hover:-translate-y-0.5 hover:border-lime-300/40">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#171b0a]">{item.photo_url ? <img src={item.photo_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <span className="text-7xl" aria-hidden="true">🎣</span>}<span className="absolute bottom-3 right-3 rounded-lg bg-black/75 px-2 py-1 text-xs text-white">{item.condition}</span></div>
        <div className="space-y-3 p-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-lime-300">{item.category}</p><h3 className="mt-1 font-bold text-white">{item.title}</h3><p className="mt-1 line-clamp-3 text-sm text-zinc-400">{item.description || "Без описания"}</p></div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-xl font-black text-lime-300">{item.price_rub === 0 ? "Бесплатно" : item.price_rub.toLocaleString("ru-RU") + " ₽"}</p><p className="mt-1 text-xs text-zinc-500">⌖ {item.city || "Город не указан"}</p></div>{item.user_id === userId ? <span className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-400">Моё объявление</span> : <a href={`mailto:?subject=${encodeURIComponent("Объявление ZAPRUDA: " + item.title)}&body=${encodeURIComponent("Интересует товар: " + item.title + " (" + item.id + "). Свяжитесь со мной.")}`} className="rounded-xl border border-lime-300/40 px-3 py-2 text-xs font-bold text-lime-200 hover:bg-lime-300 hover:text-black">Связаться</a>}</div>
        </div></article>)}</div> : <div className="panel p-8 text-center"><p className="font-semibold">{query || category !== "Все" ? "Ничего не найдено" : "Пока объявлений нет"}</p><p className="mt-1 text-sm text-muted-foreground">Размести первое предложение в барахолке.</p></div>}
      <section className="mt-8 rounded-2xl border border-white/10 p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-lime-300">Безопасная сделка</p><h2 className="mt-2 text-lg font-bold">Проверяй снасти перед оплатой</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Осматривай товар лично, проверяй состояние и не отправляй предоплату незнакомцам без проверки.</p></section>
      <p className="mt-5 text-xs text-muted-foreground"><Link to="/profile" className="underline underline-offset-4">Мой профиль</Link> · Публикация и фото требуют входа и настроенной миграции Supabase.</p>
    </Shell>
  );
}
