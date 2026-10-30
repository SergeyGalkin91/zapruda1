import { useCallback,useEffect,useState } from "react";
import { supabase } from "@/integrations/supabase/client";
type Mark={id:string;user_id:string;latitude:number;longitude:number;kind:string;note:string;visibility:string};
const kinds:Record<string,string>={snag:"Коряга",dropoff:"Свал / бровка",hole:"Яма",vegetation:"Растительность",rock:"Камни",other:"Другое"};
export function FishingMapMarks(){
 const [me,setMe]=useState<string|null>(null),[marks,setMarks]=useState<Mark[]>([]);
 const [lat,setLat]=useState(""),[lon,setLon]=useState(""),[kind,setKind]=useState("snag"),[note,setNote]=useState(""),[visibility,setVisibility]=useState("private");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const {data,error}=await (supabase as any).from("fishing_map_marks").select("id,user_id,latitude,longitude,kind,note,visibility").order("created_at",{ascending:false}).limit(300);if(error)setMessage(error.message);else setMarks(data??[])},[]);
 useEffect(()=>{let live=true;void supabase.auth.getUser().then(({data})=>{if(live)setMe(data.user?.id??null)});void load();return()=>{live=false}},[load]);
 const locate=()=>navigator.geolocation?.getCurrentPosition(p=>{setLat(p.coords.latitude.toFixed(6));setLon(p.coords.longitude.toFixed(6))},e=>setMessage(e.message),{enableHighAccuracy:true});
 async function add(){const a=Number(lat.replace(",",".")),b=Number(lon.replace(",","."));if(!lat||!lon||!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180){setMessage("Проверь координаты");return;}if(!me)return;setBusy(true);const {error}=await (supabase as any).from("fishing_map_marks").insert({user_id:me,latitude:a,longitude:b,kind,note:note.trim(),visibility});setBusy(false);if(error)setMessage(error.message);else{setMessage("Отметка сохранена");setNote("");await load()}}
 async function remove(id:string){if(!window.confirm("Удалить отметку?"))return;const {error}=await (supabase as any).from("fishing_map_marks").delete().eq("id",id).eq("user_id",me);if(error)setMessage(error.message);else await load()}
 return <section className="panel mt-6 p-5"><h2 className="text-xl font-bold">Отметки на водоёме</h2><p className="mt-2 text-sm text-zinc-400">Коряги, ямы, свалы, камни и заросли. По умолчанию отметка видна только тебе. Пользовательские сведения могут быть неточными.</p>
 <div className="mt-4 grid gap-3 sm:grid-cols-2">
 <label className="text-sm">Широта<input className="field mt-1 w-full" inputMode="decimal" value={lat} onChange={e=>setLat(e.target.value)}/></label>
 <label className="text-sm">Долгота<input className="field mt-1 w-full" inputMode="decimal" value={lon} onChange={e=>setLon(e.target.value)}/></label>
 <label className="text-sm">Тип отметки<select className="field mt-1 w-full" value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label className="text-sm">Видимость<select className="field mt-1 w-full" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Только мне</option><option value="public">Сообществу</option></select></label>
 </div>
 <textarea className="field mt-3 min-h-20 w-full" maxLength={500} placeholder="Комментарий к месту…" value={note} onChange={e=>setNote(e.target.value)}/>
 <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-ghost" onClick={locate}>📍 Моя позиция</button><button type="button" className="btn-primary" disabled={!me||busy} onClick={()=>void add()}>Сохранить отметку</button></div>
 {message&&<p role="status" className="mt-2 text-sm">{message}</p>}
 <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{marks.map(m=><div className="rounded-xl border border-white/10 p-3" key={m.id}><p className="font-bold text-[#D7FF35]">{kinds[m.kind]??"Метка"}</p><p className="text-xs text-zinc-400">{m.latitude.toFixed(5)}, {m.longitude.toFixed(5)} · {m.visibility==="private"?"Лично":"Публично"}</p>{m.note&&<p className="mt-2 text-sm">{m.note}</p>}<a className="mt-2 block text-sm underline" href={`https://www.openstreetmap.org/?mlat=${m.latitude}&mlon=${m.longitude}#map=16/${m.latitude}/${m.longitude}`} target="_blank" rel="noreferrer">Показать место на карте</a>{m.user_id===me&&<button className="mt-2 text-sm text-red-300" type="button" onClick={()=>void remove(m.id)}>Удалить</button>}</div>)}</div>
 </section>;
}
