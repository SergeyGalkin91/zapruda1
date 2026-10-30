import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/depths")({ component: DepthsPage, head: () => ({ meta:[{title:"Замеры глубин — ZAPRUDA"}] }) });
type Measurement={id:string;user_id:string;latitude:number;longitude:number;depth_m:number;note:string;visibility:string;measured_at:string};
function DepthsPage(){
 const [userId,setUserId]=useState<string|null>(null);
 const [records,setRecords]=useState<Measurement[]>([]);
 const [latitude,setLatitude]=useState("");
 const [longitude,setLongitude]=useState("");
 const [depth,setDepth]=useState("");
 const [note,setNote]=useState("");
 const [visibility,setVisibility]=useState("private");
 const [editing,setEditing]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [view,setView]=useState<"all"|"mine">("all");
 const [depthBand,setDepthBand]=useState("all");
 const load=useCallback(async()=>{
  const {data,error:e}=await (supabase as any).from("depth_measurements").select("id,user_id,latitude,longitude,depth_m,note,visibility,measured_at").order("measured_at",{ascending:false}).limit(300);
  if(e)setError(e.message);else setRecords(data||[]);
 },[]);
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setUserId(data.user?.id||null)});void load();return()=>{active=false}},[load]);
 function locate(){
  if(!navigator.geolocation){setError("Геолокация недоступна");return}
  navigator.geolocation.getCurrentPosition(p=>{setLatitude(p.coords.latitude.toFixed(6));setLongitude(p.coords.longitude.toFixed(6));setError("")},e=>setError("Не удалось определить координаты: "+e.message),{enableHighAccuracy:true,timeout:20000});
 }
 async function save(){
  if(busy||!userId)return;
  const lat=Number(latitude.replace(",",".")),lon=Number(longitude.replace(",",".")),meters=Number(depth.replace(",","."));
  if(!latitude||!longitude||!depth||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(meters)||meters<=0||meters>1000){setError("Укажи корректные координаты и глубину от 0 до 1000 м.");return}
  setBusy(true);setError("");setNotice("");
  const payload={latitude:lat,longitude:lon,depth_m:meters,note:note.trim(),visibility};
  const result=editing?await (supabase as any).from("depth_measurements").update(payload).eq("id",editing).eq("user_id",userId)
   :await (supabase as any).from("depth_measurements").insert({...payload,user_id:userId});
  setBusy(false);if(result.error){setError(result.error.message);return}
  setEditing(null);setLatitude("");setLongitude("");setDepth("");setNote("");setVisibility("private");setNotice("Замер сохранён.");await load();
 }
 function edit(r:Measurement){setEditing(r.id);setLatitude(String(r.latitude));setLongitude(String(r.longitude));setDepth(String(r.depth_m));setNote(r.note);setVisibility(r.visibility);window.scrollTo({top:0,behavior:"smooth"})}
 async function remove(r:Measurement){if(busy||!window.confirm("Удалить замер глубины?"))return;setBusy(true);const {error:e}=await (supabase as any).from("depth_measurements").delete().eq("id",r.id).eq("user_id",userId);setBusy(false);if(e)setError(e.message);else await load()}
 const shown=records.filter(r=>(view==="all"||r.user_id===userId) && (depthBand==="all" || (depthBand==="shallow" ? r.depth_m<3 : depthBand==="medium" ? r.depth_m>=3&&r.depth_m<10 : r.depth_m>=10)));
 const colorFor=(m:number)=>m<3?"#68D9D0":m<10?"#61A9FA":"#A88BFF";
 const mapPoints=shown.filter(r=>r.visibility==="public"||r.user_id===userId);
 const mapCenter=mapPoints[0]||{latitude:56.3269,longitude:44.0059};
 const mapUrl=`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.longitude-0.06}%2C${mapCenter.latitude-0.04}%2C${mapCenter.longitude+0.06}%2C${mapCenter.latitude+0.04}&layer=mapnik&marker=${mapCenter.latitude}%2C${mapCenter.longitude}`;
 return <Shell>
  <div className="mb-6"><p className="text-xs font-black uppercase tracking-[.2em] text-[#D7FF35]">ZAPRUDA / КАРТА ГЛУБИН</p><h1 className="mt-2 text-3xl font-black">Замеры глубин</h1><p className="mt-2 text-sm text-zinc-400">Добавляй реальные промеры эхолотом в местах, где нет карт глубин. Твои точки по умолчанию приватные. Это пользовательские данные, не навигационная карта.</p><Link className="btn-ghost mt-3 inline-flex" to="/achievements">← Достижения и трекер</Link></div>
  <div className="grid gap-5 lg:grid-cols-2">
   <section className="panel p-5"><h2 className="text-xl font-bold">{editing?"Редактировать замер":"Добавить глубину"}</h2>
    {!userId&&<p className="mt-3 text-amber-200">Чтобы сохранить замер, войди в аккаунт.</p>}
    <div className="mt-4 grid grid-cols-2 gap-3">
     <label className="text-sm">Широта<input className="field mt-1 w-full" type="text" inputMode="decimal" placeholder="56.3269" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label>
     <label className="text-sm">Долгота<input className="field mt-1 w-full" type="text" inputMode="decimal" placeholder="44.0059" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label>
    </div>
    <button className="btn-ghost mt-3" type="button" onClick={locate}>📍 Использовать мою геопозицию</button>
    <label className="mt-3 block text-sm">Глубина, м<input className="field mt-1 w-full" type="text" inputMode="decimal" placeholder="4.5" value={depth} onChange={e=>setDepth(e.target.value)}/></label>
    <label className="mt-3 block text-sm">Примечание<textarea className="field mt-1 min-h-20 w-full" maxLength={500} placeholder="Эхолот, условия, дата измерения…" value={note} onChange={e=>setNote(e.target.value)}/></label>
    <label className="mt-3 block text-sm">Видимость<select className="field mt-1 w-full" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Только мне</option><option value="public">Поделиться с сообществом</option></select></label>
    <div className="mt-4 flex gap-2"><button className="btn-primary" type="button" disabled={!userId||busy} onClick={()=>void save()}>{busy?"Сохраняем…":"Сохранить замер"}</button>{editing&&<button type="button" className="btn-ghost" onClick={()=>setEditing(null)}>Отмена</button>}</div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}{notice&&<p role="status" className="mt-3 text-sm text-[#D7FF35]">{notice}</p>}
   </section>
   <section className="panel p-5"><h2 className="text-xl font-bold">Карта точки</h2>
    {Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude))&&latitude&&longitude?
    <iframe title="Карта выбранной точки OpenStreetMap" className="mt-3 h-80 w-full rounded-xl border border-white/10" loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(longitude)-0.008}%2C${Number(latitude)-0.005}%2C${Number(longitude)+0.008}%2C${Number(latitude)+0.005}&layer=mapnik&marker=${Number(latitude)}%2C${Number(longitude)}`}/>:
    <p className="mt-3 text-sm text-zinc-400">Укажи координаты или нажми «Моя геопозиция» — увидишь точку на карте.</p>}
    <p className="mt-3 text-xs text-zinc-500">Карта © OpenStreetMap contributors. Слой отображает местоположение замера, а не готовые изобаты.</p>
   </section>
  </div>
  <section className="panel mt-6 p-5"><h2 className="text-xl font-bold">Карта замеров глубин</h2><p className="mt-2 text-sm text-zinc-400">На обзорной карте показан центр выбранных замеров. Цветные точки ниже открываются на карте отдельно. Приватные замеры видишь только ты; встроенная OpenStreetMap не поддерживает вывод всех маркеров одновременно.</p>
   <div className="mt-3 flex flex-wrap items-center gap-3 text-xs"><span style={{color:"#68D9D0"}}>● Мельче 3 м</span><span style={{color:"#61A9FA"}}>● 3–10 м</span><span style={{color:"#A88BFF"}}>● 10 м и глубже</span></div>
   <iframe title="Обзорная карта замеров глубин" loading="lazy" referrerPolicy="no-referrer" className="mt-3 h-80 w-full rounded-xl border border-white/10" src={mapUrl}/>
   <p className="mt-2 text-xs text-zinc-500">© OpenStreetMap contributors. Это пользовательские измерения, не навигационные данные.</p>
  </section>
  <section className="panel mt-6 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Замеры сообщества</h2><div className="flex gap-2"><button className="btn-ghost" onClick={()=>setView("all")}>Общие</button><button className="btn-ghost" onClick={()=>setView("mine")}>Мои</button><button className="btn-ghost" onClick={()=>void load()}>Обновить</button></div></div>
   <label className="mt-3 block text-sm">Фильтр глубины <select className="field ml-2" value={depthBand} onChange={e=>setDepthBand(e.target.value)}><option value="all">Все глубины</option><option value="shallow">Мельче 3 м</option><option value="medium">От 3 до 10 м</option><option value="deep">10 м и глубже</option></select></label>
   <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map(r=><article key={r.id} className="rounded-xl border border-white/10 p-4"><p className="text-xl font-black" style={{color:colorFor(r.depth_m)}}>● {r.depth_m} м</p><p className="mt-1 text-sm">{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</p><p className="mt-1 text-xs text-zinc-400">{new Date(r.measured_at).toLocaleDateString("ru-RU")} · {r.visibility==="private"?"Только мне":"Общий замер"}</p>{r.note&&<p className="mt-2 whitespace-pre-wrap text-sm">{r.note}</p>}<a className="mt-2 inline-block text-xs text-[#D7FF35] underline" href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=16/${r.latitude}/${r.longitude}`} target="_blank" rel="noreferrer">Открыть на карте</a>{r.user_id===userId&&<div className="mt-3 flex gap-3"><button className="text-xs underline" onClick={()=>edit(r)}>Изменить</button><button className="text-xs text-red-300 underline" onClick={()=>void remove(r)}>Удалить</button></div>}</article>)}{!shown.length&&<p className="text-sm text-zinc-400">Замеров пока нет. Добавь первый промер.</p>}</div>
  </section>
 </Shell>;
}
