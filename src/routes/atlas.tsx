import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, BookOpen, Fish, Search, Waves } from "lucide-react";
import { Shell } from "@/components/Shell";
import { countries } from "@/lib/geo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/atlas")({
  head: () => ({ meta: [
    { title: "Атлас рыболова — ZAPRUDA COMMUNITY" },
    { name: "description", content: "Каталог водоёмов России и СНГ и коллекции подтверждённых видов рыбы." },
  ] }),
  validateSearch: (search: Record<string, unknown>) => ({
    country: typeof search.country === "string" ? search.country : "",
  }),
  component: Atlas,
});

type Water = { id: string; slug: string; country_code: string; name: string; region: string; kind: string; summary: string; source_note: string };
type Species = { id: string; name: string; description: string };
type Mapping = { waterbody_id: string; species_id: string; evidence_status: "indicative" | "reviewed" };
type Progress = { waterbody_id: string; known_species: number; caught_species: number; reviewed_species: number; atlas_completed: boolean };
const api = supabase as any;
const kindName: Record<string, string> = { river: "Река", lake: "Озеро", reservoir: "Водохранилище", canal: "Канал", other: "Водоём" };

function Atlas() {
  const routeSearch = Route.useSearch();
  const [country, setCountry] = useState(routeSearch.country);
  const [filter, setFilter] = useState("");
  const [kindFilter,setKindFilter]=useState("");
  const [regionFilter,setRegionFilter]=useState("");
  const [speciesFilter,setSpeciesFilter]=useState("");
  const [waters, setWaters] = useState<Water[]>([]);
  const [fishes, setFishes] = useState<Species[]>([]);
  const [mapping, setMapping] = useState<Mapping[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [openId, setOpenId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [wr, sr, mr] = await Promise.all([
      api.from("atlas_waterbodies").select("id,slug,country_code,name,region,kind,summary,source_note").order("name", { ascending: true }).limit(500),
      api.from("atlas_fish_species").select("id,name,description").order("name", { ascending: true }).limit(200),
      api.from("atlas_waterbody_species").select("waterbody_id,species_id,evidence_status").limit(2500),
    ]);
    const e = wr.error || sr.error || mr.error;
    if (e) setError("Не удалось открыть Атлас: " + e.message);
    else setError("");
    setWaters((wr.data ?? []) as Water[]);
    setFishes((sr.data ?? []) as Species[]);
    setMapping((mr.data ?? []) as Mapping[]);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await api.from("my_atlas_progress")
        .select("waterbody_id,known_species,caught_species,reviewed_species,atlas_completed").limit(500);
      setProgress((data ?? []) as Progress[]);
    } else setProgress([]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setCountry(routeSearch.country); }, [routeSearch.country]);

  const byId = useMemo(() => new Map(fishes.map(fish => [fish.id, fish])), [fishes]);
  const progressById = useMemo(() => new Map(progress.map(x => [x.waterbody_id, x])), [progress]);
  const regions = [...new Set(waters.filter(w=>!country||w.country_code===country).map(w=>w.region).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  const filtered = waters.filter(w => (!country || w.country_code === country) &&
    (!regionFilter || w.region===regionFilter) &&
    (!kindFilter || w.kind === kindFilter) &&
    (!speciesFilter || mapping.some(m=>m.waterbody_id===w.id && m.species_id===speciesFilter)) &&
    [w.name, w.region, w.summary].some(value => value.toLowerCase().includes(filter.trim().toLowerCase())));
  const allCountries = countries;
  useEffect(()=>{setRegionFilter("")},[country]);

  return <Shell>
    <section className="mb-6 rounded-3xl border border-[#D7FF35]/25 bg-gradient-to-br from-[#233219] via-[#172018] to-[#0D100C] p-5 sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / ИГРОВОЙ АТЛАС</p>
      <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-black"><BookOpen className="size-8 text-[#D7FF35]"/> Атлас рыболова</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Исследуй водоёмы, узнавай о рыбе и собирай коллекции уловов. Чтобы начать, просто выбери водоём при создании обычного отчёта и приложи фото — отдельную анкету заполнять не нужно.</p>
      <p className="mt-3 text-xs text-zinc-400">Фильтруй каталог по стране, региону, реке или озеру и видам рыбы. Наличие вида — справочная информация, а не гарантия улова. Каталог развивается постепенно. Списки рыб предварительные и не означают, что каждый вид точно встречается на любом участке. Учитывай местные правила и ограничения ловли.</p>
      <Link to="/reports/new" className="btn-primary mt-5 inline-flex">Добавить улов →</Link>
    </section>
    <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
      <label className="text-xs font-semibold text-zinc-300">Страна
        <select className="field mt-1 w-full" value={country} onChange={e => setCountry(e.target.value)}>
          <option value="">Все страны</option>
          {allCountries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-zinc-300">Название водоёма или регион
        <span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-500"/>
          <input className="field w-full pl-9" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Например: Ока, Иртыш, Севан…"/>
        </span>
      </label>
    </div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-semibold text-zinc-300">Область / регион<select className="field mt-1 w-full" value={regionFilter} onChange={e=>setRegionFilter(e.target.value)}><option value="">Все регионы</option>{regions.map(region=><option key={region} value={region}>{region}</option>)}</select></label>
      <label className="text-xs font-semibold text-zinc-300">Тип водоёма<select className="field mt-1 w-full" value={kindFilter} onChange={e=>setKindFilter(e.target.value)}><option value="">Все типы</option>{Object.entries(kindName).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      <label className="text-xs font-semibold text-zinc-300">Вид рыбы<select className="field mt-1 w-full" value={speciesFilter} onChange={e=>setSpeciesFilter(e.target.value)}><option value="">Все виды</option>{fishes.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
    {loading && <p className="text-sm text-zinc-400">Загружаем справочник…</p>}
    {!loading && <p className="mb-3 text-xs text-zinc-500">Водоёмов: {filtered.length} · видов рыб в справочнике: {fishes.length} · регионов: {regions.length}. Данные неполные; отдельные сведения предварительные.</p>}
    <div className="grid gap-3 md:grid-cols-2">
      {filtered.map(w => {
        const items = mapping.filter(m => m.waterbody_id === w.id);
        const stats = progressById.get(w.id);
        const expanded = openId === w.id;
        const countryName = countries.find(c => c.code === w.country_code);
        return <article key={w.id} className="rounded-2xl border border-white/10 bg-[#151915] p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold text-[#D7FF35]"><Waves className="size-4"/> {kindName[w.kind] || "Водоём"} · {countryName?.flag} {countryName?.name}</p>
          <h2 className="mt-2 text-lg font-extrabold text-white">{w.name}</h2>
          <p className="mt-1 text-xs text-zinc-400">{w.region}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{w.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1"><Fish className="size-4 text-[#D7FF35]"/> {items.length ? "Виды в справочнике: " + items.length : "Состав рыбы уточняется"}</span>
            {stats && <span className="inline-flex items-center gap-1"><Award className="size-4 text-[#D7FF35]"/> Подтверждено: {stats.caught_species || 0}</span>}
            {stats?.atlas_completed && <strong className="text-[#D7FF35]">🏆 Коллекция собрана!</strong>}
          </div>
          <button type="button" className="mt-4 text-sm font-bold text-[#D7FF35] underline" onClick={() => setOpenId(expanded ? "" : w.id)}>{expanded ? "Свернуть" : "Посмотреть рыбу и прогресс"}</button>
          {expanded && <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            {items.map(m => {
              const fish = byId.get(m.species_id);
              if (!fish) return null;
              return <div key={m.species_id} className="rounded-lg bg-black/10 p-3">
                <p className="text-sm font-bold text-zinc-100">{fish.name} <span className="ml-1 text-xs font-normal text-zinc-500">· {m.evidence_status === "reviewed" ? "проверен" : "предварительно"}</span></p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{fish.description}</p>
              </div>;
            })}
            {!items.length && <p className="text-sm text-zinc-500">Здесь пока нет проверенного перечня видов. Справочник дополняется.</p>}
            <p className="text-xs text-zinc-500">{w.source_note}</p>
            {stats && <p className="text-xs text-[#D7FF35]">Коллекция: {stats.caught_species || 0} подтверждённых видов из {stats.known_species || 0} в текущем справочнике. Итоговая ачивка доступна только после проверки полного списка видов.</p>}
          </div>}
        </article>;
      })}
    </div>
    <section className="mt-8 rounded-xl border border-[#D7FF35]/20 bg-[#131913] p-4 sm:p-6"><h2 className="text-xl font-black">Справочник рыб</h2><p className="mt-1 text-sm text-zinc-400">Виды, занесённые в Атлас. Наличие в справочнике не означает подтверждённого обитания в каждом водоёме.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{fishes.filter(f=>!speciesFilter||f.id===speciesFilter).map(f=><article key={f.id} className="rounded-lg border border-white/10 p-3"><h3 className="text-sm font-bold text-[#D7FF35]">{f.name}</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{f.description||"Описание уточняется."}</p></article>)}</div></section>
    {!loading && !filtered.length && <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">Водоём пока не добавлен. Можно опубликовать отчёт по обычному названию, а каталог будет пополняться.</p>}
  </Shell>;
}
