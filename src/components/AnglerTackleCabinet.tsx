import { useCallback, useEffect, useId, useState } from "react";
import { Check, ListPlus, RotateCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  formatTackleItem, REEL_SIZES, TACKLE_BRANDS, TACKLE_CATEGORIES, TACKLE_MODELS,
} from "@/lib/tackleCatalog";
import type { TackleItem, TackleType } from "@/lib/tackleCatalog";

export function AnglerTackleCabinet({ userId }: { userId: string }) {
  const modelListId = useId();
  const [items, setItems] = useState<TackleItem[]>([]);
  const [gearType,setGearType] = useState<TackleType>("reel");
  const [brand,setBrand] = useState("Daiwa");
  const [customBrand,setCustomBrand] = useState("");
  const [model,setModel] = useState("");
  const [variant,setVariant] = useState("2500");
  const [notes,setNotes] = useState("");
  const [working,setWorking] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    const {data,error:loadError}=await supabase.from("angler_gear")
      .select("id,user_id,gear_type,brand,model,variant,notes")
      .eq("user_id",userId)
      .order("created_at",{ascending:false})
      .limit(100);
    if(loadError)setError("Снасти не загрузились: "+loadError.message);
    else setItems((data??[]) as TackleItem[]);
    setLoading(false);
  },[userId]);

  useEffect(()=>{void load()},[load]);

  function setCategory(next:TackleType) {
    setGearType(next);
    setBrand(TACKLE_BRANDS[next][0]);
    setCustomBrand("");
    setModel("");
    setVariant(next==="reel"?"2500":"");
  }

  async function addItem(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(working)return;
    const resolvedBrand=(brand==="Другой бренд"?customBrand:brand).trim();
    const resolvedModel=model.trim();
    if(resolvedBrand.length<1||resolvedBrand.length>80||resolvedModel.length<1||resolvedModel.length>150){
      setError("Укажи бренд и модель снасти.");
      return;
    }
    setWorking(true);
    setError("");
    setNotice("");
    const {error:saveError}=await supabase.from("angler_gear").insert({
      user_id:userId,
      gear_type:gearType,
      brand:resolvedBrand,
      model:resolvedModel,
      variant:variant==="Другое"?"":variant.trim(),
      notes:notes.trim(),
    });
    setWorking(false);
    if(saveError){
      setError("Не получилось добавить снасть: "+saveError.message);
      return;
    }
    setModel("");
    setNotes("");
    setNotice("Снасть добавлена в личный профиль.");
    await load();
  }

  async function removeItem(item:TackleItem){
    if(working)return;
    setError("");
    setNotice("");
    setWorking(true);
    const {error:deleteError}=await supabase.from("angler_gear")
      .delete().eq("id",item.id).eq("user_id",userId);
    setWorking(false);
    if(deleteError)setError("Не удалось удалить снасть: "+deleteError.message);
    else{setNotice("Снасть удалена.");await load()}
  }

  const suggestions=TACKLE_MODELS[brand]??[];
  return <section className="space-y-5 rounded-3xl border border-[#D7FF35]/20 bg-[#151B14] p-5 sm:p-7">
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D7FF35]">Личный арсенал</p>
      <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Мои снасти</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Выбери тип снасти, производителя, модель и размер. Можно добавлять сколько угодно комплектов;
        этот список доступен только тебе и будет использоваться в персональных рекомендациях.
      </p>
    </div>

    {error&&<p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p>}
    {notice&&<p className="flex items-center gap-2 rounded-xl border border-[#D7FF35]/25 bg-[#D7FF35]/10 p-3 text-xs text-[#D7FF35]" role="status"><Check className="size-4"/>{notice}</p>}
    <form onSubmit={addItem} className="space-y-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
          <span>Тип снасти</span>
          <select className="field" value={gearType} onChange={(e)=>setCategory(e.target.value as TackleType)}>
            {TACKLE_CATEGORIES.map((category)=><option value={category.value} key={category.value}>{category.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
          <span>Бренд</span>
          <select className="field" value={brand} onChange={(e)=>{setBrand(e.target.value);setModel("")}}>
            {TACKLE_BRANDS[gearType].map((candidate)=><option key={candidate}>{candidate}</option>)}
          </select>
        </label>
        {brand==="Другой бренд" && <label className="block space-y-1.5 text-xs font-bold text-zinc-300 sm:col-span-2">
          <span>Введи бренд вручную</span>
          <input className="field" required maxLength={80} value={customBrand} onChange={(e)=>setCustomBrand(e.target.value)} placeholder="Название производителя"/>
        </label>}
        <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
          <span>Модель</span>
          <input className="field" list={modelListId} required maxLength={150}
            value={model} onChange={(e)=>setModel(e.target.value)}
            placeholder={gearType==="reel"?"Например, Legalis LT":"Например, Euphoria"}/>
          <datalist id={modelListId}>{suggestions.map((name)=><option key={name} value={name}/>)}</datalist>
          <span className="block text-[11px] leading-4 font-normal text-zinc-500">Можно выбрать подсказку или ввести любое название.</span>
        </label>
        <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
          <span>{gearType==="reel"?"Размер катушки":gearType==="rod"?"Тест, длина / модификация":gearType==="line"?"PE / диаметр / размотка":"Размер / вес / версия"}</span>
          {gearType==="reel"?<select className="field" value={variant} onChange={(e)=>setVariant(e.target.value)}>
            {REEL_SIZES.map((size)=><option key={size} value={size}>{size}</option>)}
          </select>:<input className="field" maxLength={100} value={variant} onChange={(e)=>setVariant(e.target.value)} placeholder={gearType==="line"?"PE #1.2, 150 м":"Например, 7–28 г"}/>}
        </label>
        <label className="block space-y-1.5 text-xs font-bold text-zinc-300 sm:col-span-2">
          <span>Заметки (необязательно)</span>
          <input className="field" maxLength={500} value={notes} onChange={(e)=>setNotes(e.target.value)}
            placeholder="Например, основной комплект на Оке, шнур #1.2"/>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">
          Пример: <strong className="text-[#D7FF35]">Daiwa → Legalis LT → 2500</strong>
        </p>
        <button type="submit" className="btn-primary" disabled={working}><ListPlus className="size-4"/>{working?"Добавляем…":"Добавить снасть"}</button>
      </div>
    </form>

    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">Сохранённые снасти · {items.length}</h3>
        <button className="btn-ghost" type="button" disabled={loading} onClick={()=>void load()} aria-label="Обновить список снастей"><RotateCw className="size-4"/></button>
      </div>
      {loading&&<p className="text-xs text-zinc-400">Загружаем твой арсенал…</p>}
      {!loading&&!items.length&&<p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-400">Пока ничего нет. Добавь первую катушку или спиннинг.</p>}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item)=><div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#D7FF35]">
              {TACKLE_CATEGORIES.find((x)=>x.value===item.gear_type)?.label??"Снасть"}
            </p>
            <h4 className="mt-1 break-words text-sm font-bold text-white">{formatTackleItem(item)}</h4>
            {item.notes&&<p className="mt-1 break-words text-xs leading-5 text-zinc-400">{item.notes}</p>}
          </div>
          <button type="button" className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:border-red-400/40 hover:text-red-300"
            aria-label={"Удалить "+formatTackleItem(item)} disabled={working} onClick={()=>void removeItem(item)}>
            <Trash2 className="size-4"/>
          </button>
        </div>)}
      </div>
    </div>
  </section>;
}
