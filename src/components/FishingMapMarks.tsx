import { useCallback,useEffect,useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FishingSpotsMap } from "@/components/FishingSpotsMap";
type Mark={id:string;user_id:string;latitude:number;longitude:number;kind:string;note:string;visibility:string;fish_species:string;photo_path:string|null};
const kinds:Record<string,string>={catch:"Место улова",snag:"Коряга",dropoff:"Свал / бровка",hole:"Яма",vegetation:"Растительность",rock:"Камни",other:"Другое"};
export function FishingMapMarks(){
 const [me,setMe]=useState<string|null>(null),[marks,setMarks]=useState<Mark[]>([]);
 const [lat,setLat]=useState(""),[lon,setLon]=useState(""),[kind,setKind]=useState("catch"),[note,setNote]=useState(""),[visibility,setVisibility]=useState("private");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [fish,setFish]=useState(""),[photo,setPhoto]=useState<File|null>(null),[photos,setPhotos]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{const {data,error}=await (supabase as any).from("fishing_map_marks").select("id,user_id,latitude,longitude,kind,note,visibility,fish_species,photo_path").order("created_at",{ascending:false}).limit(300);if(error)setMessage(error.message);else {setMarks(data??[]);const items=(data??[]) as Mark[];const urls=await Promise.all(items.filter(m=>m.photo_path).map(async m=>{const r=await supabase.storage.from("fishing-map-photos").createSignedUrl(m.photo_path!,3600);return [m.id,r.data?.signedUrl] as const}));setPhotos(Object.fromEntries(urls.filter((x):x is readonly [string,string]=>Boolean(x[1]))));}},[]);
 useEffect(()=>{let live=true;void supabase.auth.getUser().then(({data})=>{if(live)setMe(data.user?.id??null)});void load();return()=>{live=false}},[load]);
 const locate=()=>navigator.geolocation?.getCurrentPosition(p=>{setLat(p.coords.latitude.toFixed(6));setLon(p.coords.longitude.toFixed(6))},e=>setMessage(e.message),{enableHighAccuracy:true});
 async function add(){
 const a=Number(lat.replace(",",".")),b=Number(lon.replace(",","."));
 if(!lat||!lon||!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180){setMessage("Проверь координаты");return;}
 if(!me)return;
 if(photo&&(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size>5242880)){setMessage("Фото: JPG, PNG или WebP до 5 МБ");return;}
 setBusy(true);setMessage("");
 let photoPath:string|null=null;
 if(photo){
  photoPath=me+"/"+crypto.randomUUID()+"."+(photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg");
  const upload=await supabase.storage.from("fishing-map-photos").upload(photoPath,photo,{contentType:photo.type});
  if(upload.error){setMessage("Не удалось добавить фото: "+upload.error.message);setBusy(false);return;}
 }
 const {error}=await (supabase as any).from("fishing_map_marks").insert({user_id:me,latitude:a,longitude:b,kind,note:note.trim(),visibility,fish_species:fish.trim(),photo_path:photoPath});
 if(error&&photoPath)await supabase.storage.from("fishing-map-photos").remove([photoPath]);
 setBusy(false);
 if(error)setMessage(error.message);else{setMessage("Точка сохранена");setNote("");setFish("");setPhoto(null);await load()}
 }
 async function remove(id:string){if(!window.confirm("Удалить отметку?"))return;const {error}=await (supabase as any).from("fishing_map_marks").delete().eq("id",id).eq("user_id",me);if(error)setMessage(error.message);else await load()}
 return <section className="panel mt-6 p-5"><h2 className="text-xl font-bold">Отметки на водоёме</h2><p className="mt-2 text-sm text-zinc-400">Добавляй места улова, коряги, ямы и другие особенности водоёма. Укажи рыбу, оставь комментарий и прикрепи фото. Точки по умолчанию приватные.</p>
 <div className="mt-4"><FishingSpotsMap points={marks} onPick={(a,b)=>{setLat(String(a));setLon(String(b));setMessage("Координаты выбраны на карте")}}/></div>
 <div className="mt-4 grid gap-3 sm:grid-cols-2">
 <label className="text-sm">Широта<input className="field mt-1 w-full" inputMode="decimal" value={lat} onChange={e=>setLat(e.target.value)}/></label>
 <label className="text-sm">Долгота<input className="field mt-1 w-full" inputMode="decimal" value={lon} onChange={e=>setLon(e.target.value)}/></label>
 <label className="text-sm">Тип отметки<select className="field mt-1 w-full" value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label className="text-sm">Видимость<select className="field mt-1 w-full" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Только мне</option><option value="public">Сообществу</option></select></label>
 </div>
 <label className="mt-3 block text-sm">Какая рыба ловилась<input className="field mt-1 w-full" maxLength={120} value={fish} onChange={e=>setFish(e.target.value)} placeholder="Щука, судак, окунь…"/></label>
 <label className="mt-3 block text-sm">Фото места или улова (до 5 МБ)<input className="mt-1 block w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setPhoto(e.target.files?.[0]??null)}/></label>
 <textarea className="field mt-3 min-h-20 w-full" maxLength={500} placeholder="Комментарий к месту…" value={note} onChange={e=>setNote(e.target.value)}/>
 <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-ghost" onClick={locate}>📍 Моя позиция</button><button type="button" className="btn-primary" disabled={!me||busy} onClick={()=>void add()}>Сохранить отметку</button></div>
 {message&&<p role="status" className="mt-2 text-sm">{message}</p>}
 <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{marks.map(m=><div className="rounded-xl border border-white/10 p-3" key={m.id}><p className="font-bold text-[#D7FF35]">{kinds[m.kind]??"Метка"}</p><p className="text-xs text-zinc-400">{m.latitude.toFixed(5)}, {m.longitude.toFixed(5)} · {m.visibility==="private"?"Лично":"Публично"}</p>{m.fish_species&&<p className="mt-2 text-sm font-medium">Рыба: {m.fish_species}</p>}{m.note&&<p className="mt-2 text-sm">{m.note}</p>}{photos[m.id]&&<img src={photos[m.id]} alt="Фотография рыболовной точки" loading="lazy" className="mt-2 max-h-52 w-full rounded-lg object-cover"/>}<a className="mt-2 block text-sm underline" href={`https://www.openstreetmap.org/?mlat=${m.latitude}&mlon=${m.longitude}#map=16/${m.latitude}/${m.longitude}`} target="_blank" rel="noreferrer">Показать место на карте</a>{m.user_id===me&&<button className="mt-2 text-sm text-red-300" type="button" onClick={()=>void remove(m.id)}>Удалить</button>}</div>)}</div>
 </section>;
}
