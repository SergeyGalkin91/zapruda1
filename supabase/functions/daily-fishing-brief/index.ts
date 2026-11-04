import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createDailyFishingBrief } from "./handler.ts";

Deno.serve(createDailyFishingBrief());
