import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
export const Route = createFileRoute("/anglers/$userId")({component: Page});
function Page(){const {userId}=Route.useParams();return <Shell><h1>Профиль рыболова</h1><p>Идентификатор: {userId}</p></Shell>;}
