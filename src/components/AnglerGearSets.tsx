import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatTackleItem, type TackleItem } from "@/lib/tackleCatalog";

type Kit = {
  id: string; user_id: string; title: string; fishing_method: string;
  rod_id: string; reel_id: string; line_id: string | null; notes: string;
  is_primary: boolean;
};
const api = supabase as any;

export function AnglerGearSets({
  userId, items, fishingMethods, onChange,
}: {
  userId: string;
  items: TackleItem[];
  fishingMethods: string[];
  onChange: () => void;
}) {
  const [kits, setKits] = useState<Kit[]>([]);
  const [selectedRod, setSelectedRod] = useState("");
  const [selectedReel, setSelectedReel] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [title, setTitle] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const rods = items.filter(item => item.gear_type === "rod");
  const reels = items.filter(item => item.gear_type === "reel");
  const lines = items.filter(item => item.gear_type === "line");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await api.from("angler_gear_sets")
      .select("id,user_id,title,fishing_method,rod_id,reel_id,line_id,notes,is_primary")
      .eq("user_id", userId).order("created_at", { ascending: true }).limit(100);
    if (loadError) setError("Не удалось загрузить комплекты: " + loadError.message);
    else setKits((data ?? []) as Kit[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!selectedRod || !rods.some(item => item.id === selectedRod)) setSelectedRod(rods[0]?.id ?? "");
    if (!selectedReel || !reels.some(item => item.id === selectedReel)) setSelectedReel(reels[0]?.id ?? "");
    if (selectedLine && !lines.some(item => item.id === selectedLine)) setSelectedLine("");
  }, [items, selectedRod, selectedReel, selectedLine]);

  const lookup = (id: string | null) => items.find(item => item.id === id);
  const label = (id: string | null) => {
    const item = lookup(id);
    return item ? formatTackleItem(item) : "Снасть удалена";
  };
  const reset = () => {
    setEditingId("");
    setTitle(""); setNotes(""); setMethod("");
    setSelectedRod(rods[0]?.id ?? "");
    setSelectedReel(reels[0]?.id ?? "");
    setSelectedLine("");
  };

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !selectedRod || !selectedReel) return;
    setBusy(true); setError(""); setNotice("");
    const payload = {
      title: title.trim().slice(0, 100),
      fishing_method: method.trim().slice(0, 80),
      rod_id: selectedRod, reel_id: selectedReel, line_id: selectedLine || null,
      notes: notes.trim().slice(0, 500),
    };
    const result = editingId
      ? await api.from("angler_gear_sets").update(payload).eq("id", editingId).eq("user_id", userId)
      : await api.from("angler_gear_sets").insert({ ...payload, user_id: userId }).select("id").single();
    if (result.error) {
      setError("Не удалось сохранить комплект: " + result.error.message);
      setBusy(false);
      return;
    }
    if (!editingId && !kits.some(kit => kit.is_primary)) {
      const { error: primaryError } = await api.rpc("set_my_primary_gear_set", { p_kit_id: result.data.id });
      if (primaryError) {
        setNotice("Комплект добавлен, но не получилось сделать его основным: " + primaryError.message);
      } else {
        setNotice("Первый комплект сохранён и выбран основным.");
      }
    } else {
      setNotice(editingId ? "Комплект обновлён." : "Комплект добавлен.");
    }
    setBusy(false);
    reset();
    await refresh();
    onChange();
  }

  async function selectPrimary(kit: Kit) {
    if (kit.is_primary || busy) return;
    setBusy(true); setError(""); setNotice("");
    const { error: primaryError } = await api.rpc("set_my_primary_gear_set", { p_kit_id: kit.id });
    setBusy(false);
    if (primaryError) { setError("Не удалось выбрать основной комплект: " + primaryError.message); return; }
    setNotice("Основной комплект изменён — он отображается в шапке профиля.");
    await refresh();
    onChange();
  }

  function edit(kit: Kit) {
    setEditingId(kit.id);
    setTitle(kit.title);
    setSelectedRod(kit.rod_id);
    setSelectedReel(kit.reel_id);
    setSelectedLine(kit.line_id ?? "");
    setMethod(kit.fishing_method);
    setNotes(kit.notes);
    setError(""); setNotice("");
  }

  async function remove(kit: Kit) {
    if (busy || !window.confirm("Удалить комплект «" + (kit.title || label(kit.rod_id)) + "»? Сами удилище, катушка и шнур останутся в арсенале.")) return;
    setBusy(true); setError(""); setNotice("");
    const { error: deleteError } = await api.from("angler_gear_sets").delete().eq("id", kit.id).eq("user_id", userId);
    if (deleteError) { setBusy(false); setError("Не удалось удалить комплект: " + deleteError.message); return; }
    if (kit.id === editingId) reset();
    // When deleting the featured kit, select a remaining kit as main.
    const fallback = kits.find(x => x.id !== kit.id);
    if (kit.is_primary && fallback) {
      const { error: fallbackError } = await api.rpc("set_my_primary_gear_set", { p_kit_id: fallback.id });
      if (fallbackError) setNotice("Комплект удалён. Выбери новый основной вручную: " + fallbackError.message);
    }
    setBusy(false);
    if (!notice) setNotice("Комплект удалён. Остальные снасти сохранены.");
    await refresh();
    onChange();
  }

  return <div id="my-gear-sets" className="scroll-mt-24 space-y-4 border-t border-[#D7FF35]/15 pt-6">
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#D7FF35]">Комплекты / сочетания снастей</p>
      <h3 className="mt-2 text-xl font-black text-white">Мои рыболовные комплекты</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">Добавляй удилища, катушки и шнуры в арсенал выше, затем собирай из них комплекты. Один комплект можно назначить основным — он появится рядом с именем в твоём профиле.</p>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/5 p-3 text-sm text-[#D7FF35]">{notice}</p>}
    {!rods.length || !reels.length ? (
      <p className="rounded-xl border border-dashed border-white/15 bg-black/10 p-4 text-sm text-zinc-300">
        Чтобы собрать первый комплект, добавь выше {rods.length ? "катушку" : reels.length ? "удилище" : "удилище и катушку"}.
        Можно выбрать любую модель из подсказок или вписать свою.
      </p>
    ) : (
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-[#D7FF35]/20 bg-[#D7FF35]/[.035] p-4">
        <h4 className="font-bold">{editingId ? "Редактировать комплект" : "Собрать новый комплект"}</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-zinc-300">Удилище
            <select className="field mt-1 w-full" value={selectedRod} onChange={e => setSelectedRod(e.target.value)} required>
              {rods.map(item => <option key={item.id} value={item.id}>{formatTackleItem(item)}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-300">Катушка
            <select className="field mt-1 w-full" value={selectedReel} onChange={e => setSelectedReel(e.target.value)} required>
              {reels.map(item => <option key={item.id} value={item.id}>{formatTackleItem(item)}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-300">Шнур / леска · необязательно
            <select className="field mt-1 w-full" value={selectedLine} onChange={e => setSelectedLine(e.target.value)}>
              <option value="">Без указания</option>
              {lines.map(item => <option key={item.id} value={item.id}>{formatTackleItem(item)}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-300">Способ ловли · необязательно
            <select className="field mt-1 w-full" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="">Любой способ ловли</option>
              {fishingMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-300">Название · необязательно
            <input className="field mt-1 w-full" maxLength={100} placeholder="Например: Ока — джиг" value={title} onChange={e => setTitle(e.target.value)}/>
          </label>
          <label className="block text-xs font-semibold text-zinc-300">Заметка · необязательно
            <input className="field mt-1 w-full" maxLength={500} placeholder="Например: основной комплект на судака" value={notes} onChange={e => setNotes(e.target.value)}/>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {editingId && <button className="btn-ghost inline-flex" type="button" onClick={reset} disabled={busy}><X className="size-4"/> Отмена</button>}
          <button className="btn-primary inline-flex" type="submit" disabled={busy || !selectedRod || !selectedReel}>
            {editingId ? <Save className="size-4"/> : <Plus className="size-4"/>}
            {busy ? "Сохраняем…" : editingId ? "Сохранить комплект" : "Добавить комплект"}
          </button>
        </div>
      </form>
    )}
    <div className="space-y-2">
      <h4 className="font-bold">Сохранённые комплекты · {kits.length}</h4>
      {loading && <p className="text-sm text-zinc-400">Загружаем комплекты…</p>}
      {!loading && !kits.length && <p className="text-sm text-zinc-500">Комплектов пока нет. Первым основным станет первый созданный комплект.</p>}
      {kits.map(kit => <article key={kit.id} className={"rounded-xl border p-4 " + (kit.is_primary ? "border-[#D7FF35]/50 bg-[#D7FF35]/10" : "border-white/10 bg-black/10")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#D7FF35]">{kit.is_primary ? "★ Основной комплект" : "Рыболовный комплект"}{kit.fishing_method ? " · " + kit.fishing_method : ""}</p>
            <h5 className="mt-1 font-bold text-white">{kit.title || label(kit.rod_id) + " + " + label(kit.reel_id)}</h5>
            <p className="mt-2 text-xs text-zinc-300"><strong>Удилище:</strong> {label(kit.rod_id)}</p>
            <p className="mt-1 text-xs text-zinc-300"><strong>Катушка:</strong> {label(kit.reel_id)}</p>
            {kit.line_id && <p className="mt-1 text-xs text-zinc-300"><strong>Шнур:</strong> {label(kit.line_id)}</p>}
            {kit.notes && <p className="mt-2 text-xs text-zinc-500">{kit.notes}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-ghost inline-flex gap-1 px-3 text-xs" type="button" onClick={() => void selectPrimary(kit)} disabled={busy || kit.is_primary}>
              {kit.is_primary ? <Check className="size-4"/> : <Star className="size-4"/>}{kit.is_primary ? "Основной" : "Сделать основным"}
            </button>
            <button className="btn-ghost inline-flex px-2.5" type="button" disabled={busy} onClick={() => edit(kit)} aria-label={"Редактировать " + (kit.title || label(kit.rod_id))}><Pencil className="size-4"/></button>
            <button className="inline-flex rounded-xl border border-white/10 p-2.5 text-zinc-400 hover:border-red-500/40 hover:text-red-300" type="button" disabled={busy} onClick={() => void remove(kit)} aria-label={"Удалить комплект " + (kit.title || label(kit.rod_id))}><Trash2 className="size-4"/></button>
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}
