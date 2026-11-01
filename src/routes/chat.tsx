import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronRight, Globe2, MapPin, MessageCircle, Plus, Search, RefreshCw, Reply, Send, Users } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Wordmark } from "@/components/Wordmark";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/lib/geo";
import { chatPhotoError, chatPhotoPath, shouldCreateChatMessage } from "@/lib/chat-media";

type ChatTopic = "general" | "reports" | "waters" | "partners" | "gear" | "tips";
type Level = "global" | "country" | "region" | "city";
type Place = {
  id: string; parent_id: string | null; level: Level;
  country_code: string | null; name: string; created_by: string | null;
};
type ChatMessage = {
  id: string; user_id: string; body: string; created_at: string;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null; chat_city: string | null } | null;
};
type ChatReaction = { id: string; message_id: string; user_id: string; emoji: string };
const REACTION_EMOJI = ["❤️", "👍", "🔥", "😂"] as const;
const GLOBAL_ID = "00000000-0000-4000-8000-000000000001";
const TOPICS: ReadonlyArray<{ key: ChatTopic; label: string; icon: string; description: string }> = [
  { key: "general", label: "Общий", icon: "💬", description: "Знакомства, разговоры и рыбацкие истории" },
  { key: "reports", label: "Трофеи и отчёты", icon: "🐟", description: "Кто, что и где поймал — без обязательной публикации точных координат" },
  { key: "waters", label: "Споты и вода", icon: "🌊", description: "Реки, озёра, условия и обсуждение подходов" },
  { key: "partners", label: "Напарники", icon: "🤝", description: "С кем поехать на рыбалку и как договориться" },
  { key: "gear", label: "Стафф", icon: "🎣", description: "Спиннинги, катушки, приманки и оснастки" },
  { key: "tips", label: "Советы", icon: "💡", description: "Тактика, проводки и помощь новичкам" },
];
const ROOM_PHOTOS: Record<ChatTopic, string> = {
  general: "https://www.anacondastores.com/medias/how-to-wash-and-care-for-fishing-shirts-1-thumbnail.jpg?context=bWFzdGVyfHJvb3R8NDI0ODF8aW1hZ2UvanBlZ3xyb290L2g3Ny9oYzcvMjcyMzk3MTc2OTk2MTQvaG93LXRvLXdhc2gtYW5kLWNhcmUtZm9yLWZpc2hpbmctc2hpcnRzLTEtdGh1bWJuYWlsLmpwZ3w2M2RiZTk5OGU2NjJmN2YyMzgyYTMyODczOTY1ZDY4ZWQyYmVhMWE2OTdjMTMxZjZhNTliZTk2ZTQ3ZDYzMDQ4",
  reports: "https://fs.tonkosti.ru/ap/yw/apyw29gjg2ogscks00sg400g8.jpg",
  waters: "https://www.battlbox.com/cdn/shop/articles/what_size_hook_for_bluegill_fishing_the_ultimate_guide_1349ebde-d90e-4400-b006-39715d0a15cf.webp?v=1757669146",
  partners: "https://www.anacondastores.com/medias/how-to-wash-and-care-for-fishing-shirts-1-thumbnail.jpg?context=bWFzdGVyfHJvb3R8NDI0ODF8aW1hZ2UvanBlZ3xyb290L2g3Ny9oYzcvMjcyMzk3MTc2OTk2MTQvaG93LXRvLXdhc2gtYW5kLWNhcmUtZm9yLWZpc2hpbmctc2hpcnRzLTEtdGh1bWJuYWlsLmpwZ3w2M2RiZTk5OGU2NjJmN2YyMzgyYTMyODczOTY1ZDY4ZWQyYmVhMWE2OTdjMTMxZjZhNTliZTk2ZTQ3ZDYzMDQ4",
  gear: "https://images.squarespace-cdn.com/content/v1/54f57928e4b020ae7ada4a1a/9468b00e-30ef-4aa9-8c79-712b57c63437/CleanShot%2B2024-09-27%2Bat%2B11.09.26.jpg",
  tips: "https://journal.rozetka.com.ua/_ipx/f_webp%26q_80%26fit_cover%26w_1000%26loading_lazy/pub-lx/numo/s3630/image-5468.png",
};
const quick = ["🎣", "🐟", "🔥", "👍", "😂", "💪", "❤️", "👏", "🤝", "🏆"];
const VALID_TOPICS = TOPICS.map(t => t.key);
const api = supabase as any;

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [
    { title: "Чаты комьюнити — ZAPRUDA" },
    { name: "description", content: "Общение рыболовов по странам, областям, городам и тематическим веткам." },
  ] }),
  validateSearch: (query: Record<string, unknown>) => ({
    place: typeof query["place"] === "string" ? query["place"] : "",
    topic: VALID_TOPICS.includes(query["topic"] as ChatTopic) ? query["topic"] as ChatTopic : "general" as ChatTopic,
    country: typeof query["country"] === "string" ? query["country"] : "",
  }),
  component: GeographicChat,
});
