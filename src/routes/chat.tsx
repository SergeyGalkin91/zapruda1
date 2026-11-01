import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GeographicChat, type ChatTopic, VALID_TOPICS } from "@/components/chat/GeographicChat";

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
  component: ChatPage,
});

function ChatPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  return <GeographicChat search={search} navigate={navigate} />;
}
