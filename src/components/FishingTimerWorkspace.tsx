import { useEffect, useState } from "react";
import { VerifiedFishingSessions } from "@/components/VerifiedFishingSessions";
import { supabase } from "@/integrations/supabase/client";
export function FishingTimerWorkspace(){
 const [userId,setUserId]=useState<string|null>(null);
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setUserId(data.user?.id??null)});return()=>{active=false}},[]);
 return userId?<VerifiedFishingSessions userId={userId}/>:<p className="panel p-5 text-sm text-zinc-300">Войди в аккаунт, чтобы пользоваться таймером и GPS-трекером.</p>;
}
