import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8", "Cache-Control":"private, max-age=900"};
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), {status,headers:cors});
const decode = (x:string) => x.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
const tag = (s:string,t:string) => decode(s.match(new RegExp("<"+t+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+t+">","i"))?.[1]??"");
const safeFetch = async(url:string) => {
 const response=await fetch(url,{signal:AbortSignal.timeout(7500),headers:{"User-Agent":"ZaprudaCommunity/1.0"}});
 if(!response.ok) throw new Error("Upstream unavailable");
 return response;
};
function supabaseKey(){
 const legacy=Deno.env.get("SUPABASE_ANON_KEY");if(legacy)return legacy;
 try {return (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}") as Record<string,string>).default??""}catch{return ""}
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL")??"",key=supabaseKey();
 if(!url||!key)return respond(503,{error:"Backend not configured"});
 const jwt=req.headers.get("Authorization")?.replace(/^Bearer /,"");
 if(!jwt)return respond(401,{error:"Войди в ZAPRUDA"});
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await client.auth.getUser(jwt);
 if(error||!user||user.is_anonymous)return respond(401,{error:"Войди в ZAPRUDA"});
 const {data:prefs}=await client.from("angler_preferences").select("home_city,home_region").eq("user_id",user.id).maybeSingle();
 const city=String(prefs?.home_city??"").trim().slice(0,100);
 const region=String(prefs?.home_region??"").trim().slice(0,100);
 const newsPromise=(async()=>{
   const q=encodeURIComponent("(fishing OR angling) (conservation OR tournament OR record OR fisheries) when:7d");
   const rss=await(await safeFetch("https://news.google.com/rss/search?q="+q+"&hl=en-US&gl=US&ceid=US:en")).text();
   return [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,25).map((match)=>{
     const item=match[1],rawTitle=tag(item,"title"),link=tag(item,"link"),published=tag(item,"pubDate");
     const source=tag(item,"source")||rawTitle.split(" - ").at(-1)||"Мировые новости";
     return {title:rawTitle,source,url:link,published_at:published};
   }).filter(x=>x.title&&x.url.startsWith("https://")&&Number.isFinite(Date.parse(x.published_at))&&Date.now()-Date.parse(x.published_at)<8*86400000).slice(0,5);
 })().catch(()=>[]);
 const weatherPromise=(async()=>{
  if(!city)return null;
  const query=encodeURIComponent(city);
  const geo=await (await safeFetch("https://geocoding-api.open-meteo.com/v1/search?name="+query+"&count=10&language=ru&format=json")).json();
  const locations=(geo.results??[]) as Array<{latitude:number;longitude:number;name:string;admin1?:string;country?:string}>;
  const place=locations.find(x=>region&&[x.admin1,x.country].some(y=>y?.toLowerCase().includes(region.toLowerCase())))??locations[0];
  if(!place)return null;
  const endpoint="https://api.open-meteo.com/v1/forecast?latitude="+place.latitude+"&longitude="+place.longitude+"&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl,weather_code&timezone=auto";
  const data=await(await safeFetch(endpoint)).json();
  const current=data.current??{};
  return {city:place.name,region:place.admin1??"",country:place.country??"",temperature_c:current.temperature_2m,pressure_hpa:current.pressure_msl,wind_kmh:current.wind_speed_10m,precipitation_mm:current.precipitation,weather_code:current.weather_code,observed_at:current.time,source:"Open-Meteo"};
 })().catch(()=>null);
 const [news,weather]=await Promise.all([newsPromise,weatherPromise]);
 return respond(200,{date:new Date().toISOString().slice(0,10),news,weather,city_configured:Boolean(city),history:null,history_note:"Исторические факты публикуем только после проверки точной даты и первоисточника."});
});