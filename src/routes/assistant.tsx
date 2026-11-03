import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { FishingAdvisor } from "@/components/FishingAdvisor";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "План рыбалки и совет Grok | ZAPRUDA" },
      {
        name: "description",
        content:
          "План рыбалки по правилам и дополнительный совет Grok. Прозрачные источники и дневной лимит ИИ.",
      },
    ],
  }),
  component: () => (
    <Shell>
      <FishingAdvisor />
    </Shell>
  ),
});
