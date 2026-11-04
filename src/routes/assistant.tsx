import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { FishingAdvisor } from "@/components/FishingAdvisor";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "План рыбалки и совет ИИ | ZAPRUDA" },
      {
        name: "description",
        content:
          "План рыбалки по правилам и дополнительный совет ИИ. Прозрачные источники и дневной лимит ИИ.",
      },
    ],
  }),
  component: () => (
    <Shell>
      <FishingAdvisor />
    </Shell>
  ),
});
