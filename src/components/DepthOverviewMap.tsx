import { useEffect, useRef, useState } from "react";

export type DepthPoint = { id:string; latitude:number; longitude:number; depth_m:number; visibility:string };
type Marker = { remove:()=>void };
type MapInstance = { on:(event:string,callback:()=>void)=>void; remove:()=>void; fitBounds:(bounds:number[][],options:Record<string,number>)=>void; addControl:(control:unknown,position?:string)=>void };
type MapLibre = {
 Map:new(options:Record<string,unknown>)=>MapInstance;
 Marker:new(options?:Record<string,unknown>)=>{setLngLat:(coords:number[])=>{setPopup:(popup:unknown)=>{addTo:(map:MapInstance)=>Marker}}};
 Popup:new(options?:Record<string,unknown>)=>{setText:(text:string)=>unknown};
 NavigationControl:new()=>unknown;
};
declare global { interface Window { maplibregl?: MapLibre } }
let loadPromise:Promise<MapLibre>|null=null;
function loadMapLibre():Promise<MapLibre>{
 if(window.maplibregl)return Promise.resolve(window.maplibregl);
 if(loadPromise)return loadPromise;
 loadPromise=new Promise((resolve,reject)=>{
  if(!document.querySelector('link[data-zapruda-maplibre]')){
   const css=document.createElement("link");css.rel="stylesheet";css.dataset.zaprudaMaplibre="true";css.href="https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.css";document.head.appendChild(css);
  }
  const script=document.createElement("script");script.src="https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.js";script.async=true;
  script.onload=()=>window.maplibregl?resolve(window.maplibregl):reject(new Error("MapLibre не загрузился"));
  script.onerror=()=>reject(new Error("Не удалось загрузить библиотеку карты"));
  document.head.appendChild(script);
 }).catch(e=>{loadPromise=null;throw e});
 return loadPromise;
}
const depthColor=(m:number)=>m<3?"#68D9D0":m<10?"#61A9FA":"#A88BFF";
export function DepthOverviewMap({points}:{points:DepthPoint[]}){
 const holder=useRef<HTMLDivElement>(null);
 const map=useRef<MapInstance|null>(null);
 const markers=useRef<Marker[]>([]);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  if(!holder.current)return;
  void loadMapLibre().then(lib=>{
   if(!active||!holder.current)return;
   const instance=new lib.Map({container:holder.current,style:"https://tiles.openfreemap.org/styles/fiord",center:[44.0059,56.3269],zoom:8,attributionControl:true});
   map.current=instance;
   instance.addControl(new lib.NavigationControl(),"top-right");
   instance.on("load",()=>{if(active)setReady(true)});
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Карта недоступна")});
  return()=>{active=false;markers.current.forEach(m=>m.remove());markers.current=[];map.current?.remove();map.current=null};
 },[]);
 useEffect(()=>{
  if(!ready||!map.current||!window.maplibregl)return;
  markers.current.forEach(m=>m.remove());markers.current=[];
  const lib=window.maplibregl;
  points.forEach(p=>{
   const el=document.createElement("button");
   el.type="button";el.textContent=Number(p.depth_m).toLocaleString("ru-RU")+" м";
   el.title="Глубина "+p.depth_m+" м; "+p.latitude+", "+p.longitude;
   el.style.cssText="border:2px solid #101510;border-radius:999px;padding:5px 9px;cursor:pointer;font-weight:800;font-size:12px;color:#101510;white-space:nowrap;box-shadow:0 2px 9px #0008;background:"+depthColor(Number(p.depth_m));
   const popup=new lib.Popup({offset:16}).setText("Замер "+p.depth_m+" м · "+(p.visibility==="private"?"Только мне":"Сообщество"));
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
  {error?<p role="alert" className="rounded-xl border border-amber-300/20 p-3 text-sm text-amber-200">{error}. Список замеров доступен ниже.</p>:null}
  <div ref={holder} className="h-[370px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#111d24] sm:h-[470px]" aria-label="Карта пользовательских промеров глубин"/>
  <p className="mt-2 text-xs text-zinc-400">На карте {points.length} точек из текущего фильтра. Оттенки обозначают измеренную глубину, а не интерполированные изобаты. © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors.</p>
 </div>;
}
