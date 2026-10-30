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
const colorFor=(kind:string)=>kind==="catch"?"#D7FF35":kind==="snag"?"#FFB454":"#68D9D0";
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
   el.type="button";el.textContent=kindLabels[p.kind]||"Место";
   el.title=(kindLabels[p.kind]||"Место")+"; "+p.latitude+", "+p.longitude;
   el.style.cssText="border:2px solid #101510;border-radius:999px;padding:5px 9px;cursor:pointer;font-weight:800;font-size:12px;color:#101510;white-space:nowrap;box-shadow:0 2px 9px #0008;background:"+colorFor(p.kind);
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
  <div ref={holder} className="h-[370px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#111d24] sm:h-[470px]" aria-label="Карта рыболовных мест"/>
  <p className="mt-2 text-xs text-zinc-400">На карте {points.length} мест. Нажми на карту, чтобы выбрать координаты новой точки. © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors.</p>
 </div>;
}
