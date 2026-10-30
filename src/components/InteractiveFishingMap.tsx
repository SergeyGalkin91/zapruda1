import { useEffect, useRef, useState } from "react";

type Point={latitude:number;longitude:number};
type DisplayMark=Point&{id:string;title:string;kind:string};
type YandexPlacemark={};
type YandexMap={destroy:()=>void;geoObjects:{add:(p:YandexPlacemark)=>void;removeAll:()=>void};events:{add:(name:string,fn:(event:any)=>void)=>void};setCenter:(coords:number[],zoom:number)=>void};
type YandexApi={ready:(fn:()=>void)=>void;Map:new(node:HTMLElement,opts:{center:number[];zoom:number;controls?:string[]})=>YandexMap;Placemark:new(coords:number[],props?:Record<string,unknown>,opts?:Record<string,unknown>)=>YandexPlacemark};
declare global {interface Window {ymaps?:YandexApi}}
const getKey=()=>{
 if(typeof window==="undefined")return "";
 const bundled=(import.meta.env.VITE_YANDEX_MAPS_API_KEY||"").trim();
 let browserKey="";
 try{browserKey=window.localStorage.getItem("zapruda.yandex_maps_api_key")?.trim()||"";}catch{}
 return bundled||browserKey;
};
let pending:Promise<YandexApi>|null=null;
function loadYandex(key:string):Promise<YandexApi>{
 if(typeof window==="undefined")return Promise.reject(new Error("Требуется браузер."));
 if(window.ymaps)return Promise.resolve(window.ymaps);
 if(!pending){
  pending=new Promise<YandexApi>((resolve,reject)=>{
    const script=document.createElement("script");
    script.async=true;
    script.src="https://api-maps.yandex.ru/2.1/?apikey="+encodeURIComponent(key)+"&lang=ru_RU";
    script.onload=()=>window.ymaps?window.ymaps.ready(()=>resolve(window.ymaps!)):reject(new Error("Яндекс API недоступен"));
    script.onerror=()=>reject(new Error("Не удалось загрузить Яндекс Карты"));
    document.head.appendChild(script);
  }).catch(e=>{pending=null;throw e;});
 }
 return pending;
}
type Props={
 marks:DisplayMark[];
 selected:Point|null;
 onPick:(p:Point)=>void;
 onSelectMark:(id:string)=>void;
 homeCity?:string;
 homeRegion?:string;
};
const defaultCoords:Point={latitude:56.3269,longitude:44.0059};
export function InteractiveFishingMap({marks,selected,onPick,onSelectMark}:Props){
 const holder=useRef<HTMLDivElement>(null);
 const instance=useRef<YandexMap|null>(null);
 const api=useRef<YandexApi|null>(null);
 const pickRef=useRef(onPick);
 const markRef=useRef(onSelectMark);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 const key=getKey();
 pickRef.current=onPick;
 markRef.current=onSelectMark;
 const start=marks[0]||selected||defaultCoords;
 const center=Number.isFinite(start.latitude)&&Number.isFinite(start.longitude)?start:defaultCoords;
 const centerValue=center.longitude+","+center.latitude;
 const src="https://yandex.ru/map-widget/v1/?ll="+encodeURIComponent(centerValue)+"&z=12&pt="+encodeURIComponent(
     marks.slice(0,20).map(m=>m.longitude+","+m.latitude+",pm2rdm").join("~") || centerValue+",pm2rdm"
 );
 useEffect(()=>{
  if(!key||!holder.current)return;
  let active=true;
  void loadYandex(key).then(ymaps=>{
    if(!active||!holder.current)return;
    api.current=ymaps;
    const m=new ymaps.Map(holder.current,{center:[center.latitude,center.longitude],zoom:13,controls:["zoomControl","typeSelector"]});
    instance.current=m;
    m.events.add("click",ev=>{
      const coords=ev.get("coords") as number[];
      if(!coords||!Number.isFinite(coords[0])||!Number.isFinite(coords[1]))return;
      pickRef.current({latitude:Number(coords[0].toFixed(6)),longitude:Number(coords[1].toFixed(6))});
    });
    setReady(true);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Не удалось открыть Яндекс Карты.");});
  return()=>{active=false;instance.current?.destroy();instance.current=null;api.current=null;};
 },[key]);
 useEffect(()=>{
  const ymaps=api.current,m=instance.current;
  if(!ymaps||!m)return;
  m.geoObjects.removeAll();
  for(const mark of marks){
    const placemark=new ymaps.Placemark([mark.latitude,mark.longitude],{
      balloonContentHeader:mark.title,
      hintContent:mark.title,
    },{preset:"islands#limeCircleDotIcon"});
    (placemark as any).events.add("click",()=>markRef.current(mark.id));
    m.geoObjects.add(placemark);
  }
  if(selected){
    const marker=new ymaps.Placemark([selected.latitude,selected.longitude],
      {hintContent:"Выбранная точка"},{preset:"islands#redCircleDotIcon"});
    m.geoObjects.add(marker);
  }
 },[marks,selected,ready]);
 return <div className="space-y-2">
   <p className="text-xs font-semibold text-[#D7FF35]">
     Яндекс Карты · {key?"нажми на карту, чтобы выбрать точку":"просмотр точек — выбор кликом доступен после подключения ключа API"}
   </p>
   {key?<div ref={holder} aria-label="Яндекс Карты: выбери рыболовную точку"
       className="h-[330px] w-full overflow-hidden rounded-xl border border-white/15 bg-[#202921] sm:h-[410px]"/>:
     <iframe title="Яндекс Карты — личные рыболовные места" loading="lazy" src={src}
       referrerPolicy="strict-origin-when-cross-origin"
       className="h-[330px] w-full overflow-hidden rounded-xl border border-white/15 bg-[#202921] sm:h-[410px]"/>
   }
   {error&&<p role="alert" className="text-xs text-amber-200">{error} Введи координаты точки вручную ниже.</p>}
   {!key&&<p className="text-xs leading-5 text-zinc-400">Используются Яндекс Карты (виджет). Для постановки меток одним нажатием нужен API-ключ JavaScript API Яндекс Карт в настройках разработчика. Пока можно внести широту и долготу вручную — метки сохраняются в личный профиль и не становятся публичными.</p>}
   <p className="text-[11px] text-zinc-500">Яндекс получает координаты при загрузке карты. Метки пользователя остаются в его аккаунте ZAPRUDA.</p>
 </div>;
}
