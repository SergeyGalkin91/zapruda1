import { useEffect, useRef, useState } from "react";

export type FishingSpot = { id:string; latitude:number; longitude:number; kind:string; note:string; fish_species:string; visibility:string };
type Marker = { remove:()=>void };
type MapInstance = { on:(event:string,callback:(ev:any)=>void)=>void; remove:()=>void; fitBounds:(bounds:number[][],options:Record<string,number>)=>void; addControl:(control:unknown,position?:string)=>void };
type MapLibre = {
 Map:new(options:Record<string,unknown>)=>MapInstance;
 Marker:new(options?:Record<string,unknown>)=>{setLngLat:(coords:number[])=>{setPopup:(popup:unknown)=>{addTo:(map:MapInstance)=>Marker}}};
 Popup:new(options?:Record<string,unknown>)=>{setText:(text:string)=>unknown};
 NavigationControl:new()=>unknown;
};
const getMapLibre = () => (window as unknown as {maplibregl?: MapLibre}).maplibregl;
let loadPromise:Promise<MapLibre>|null=null;
function loadMapLibre():Promise<MapLibre>{
 if(getMapLibre())return Promise.resolve(getMapLibre());
 if(loadPromise)return loadPromise;
 loadPromise=new Promise((resolve,reject)=>{
  if(!document.querySelector('link[data-zapruda-maplibre]')){
   const css=document.createElement("link");css.rel="stylesheet";css.dataset.zaprudaMaplibre="true";css.href="https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.css";document.head.appendChild(css);
  }
  const script=document.createElement("script");script.src="https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.js";script.async=true;
  script.onload=()=>getMapLibre()?resolve(getMapLibre()):reject(new Error("MapLibre не загрузился"));
  script.onerror=()=>reject(new Error("Не удалось загрузить библиотеку карты"));
  document.head.appendChild(script);
 }).catch(e=>{loadPromise=null;throw e});
 return loadPromise;
}
const colorFor=(kind:string)=>kind==="catch"?"#D7FF35":["snag","hole","rock"].includes(kind)?"#FF6A00":"#A6DBCF";
const symbolFor=(kind:string)=>({catch:"🐟",snag:"✕",dropoff:"↘",hole:"◉",vegetation:"♣",rock:"◆",other:"⌖"} as Record<string,string>)[kind]||"⌖";
const kindLabels:Record<string,string>={catch:"Улов",snag:"Коряга",dropoff:"Бровка",hole:"Яма",vegetation:"Заросли",rock:"Камни",other:"Место"};
export function FishingSpotsMap({points,onPick}:{points:FishingSpot[];onPick:(lat:number,lon:number)=>void}){
 const holder=useRef<HTMLDivElement>(null);
 const map=useRef<MapInstance|null>(null);
 const markers=useRef<Marker[]>([]);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 const pickRef=useRef(onPick);pickRef.current=onPick;
 useEffect(()=>{
  let active=true;
  if(!holder.current)return;
  void loadMapLibre().then(lib=>{
   if(!active||!holder.current)return;
   const instance=new lib.Map({container:holder.current,style:"https://tiles.openfreemap.org/styles/fiord",center:[44.0059,56.3269],zoom:8,attributionControl:true});
   map.current=instance;
   instance.addControl(new lib.NavigationControl(),"top-right");
   instance.on("load",()=>{if(active)setReady(true)});
   instance.on("click",(e:any)=>{if(e?.lngLat)pickRef.current(Number(e.lngLat.lat.toFixed(6)),Number(e.lngLat.lng.toFixed(6)))});
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Карта недоступна")});
  return()=>{active=false;markers.current.forEach(m=>m.remove());markers.current=[];map.current?.remove();map.current=null};
 },[]);
 useEffect(()=>{
  if(!ready||!map.current||!getMapLibre())return;
  markers.current.forEach(m=>m.remove());markers.current=[];
  const lib=getMapLibre();
  points.forEach(p=>{
   const el=document.createElement("button");
   const label=kindLabels[p.kind]||"Место";
   el.type="button";
   el.className="zapruda-map-marker";
   el.textContent=symbolFor(p.kind);
   el.setAttribute("aria-label",label+(p.fish_species?", рыба: "+p.fish_species:""));
   el.title=label+(p.fish_species?" · "+p.fish_species:"");
   el.style.setProperty("--marker-accent",colorFor(p.kind));
   const popup=new lib.Popup({offset:16}).setText((kindLabels[p.kind]||"Место")+(p.fish_species?" · "+p.fish_species:"")+(p.note?" · "+p.note:""));
   const marker=new lib.Marker({element:el}).setLngLat([p.longitude,p.latitude]).setPopup(popup).addTo(map.current!);
   markers.current.push(marker);
  });
  if(points.length){
   const xs=points.map(p=>p.longitude),ys=points.map(p=>p.latitude);
   const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
   map.current.fitBounds([[loX-0.003,loY-0.003],[hiX+0.003,hiY+0.003]],{padding:55,maxZoom:14,duration:0});
  }
 },[points,ready]);
 return <div>
  {error?<p role="alert" className="rounded-xl border border-amber-300/20 p-3 text-sm text-amber-200">{error}. Список мест доступен ниже.</p>:null}
  <div ref={holder} className="h-[420px] w-full overflow-hidden rounded-[22px] border border-[#D7FF35]/20 bg-[#081619] sm:h-[560px]" aria-label="Карта рыболовных мест"/>
  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400"><span><b className="text-[#D7FF35]">●</b> Улов</span><span><b className="text-[#FF6A00]">●</b> Рельеф и препятствия</span><span><b className="text-[#A6DBCF]">●</b> Прочие места</span><span className="ml-auto">{points.length} отметок</span></div><p className="mt-2 text-[11px] text-zinc-500">Нажми на карту для выбора координат. © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors.</p>
 </div>;
}
