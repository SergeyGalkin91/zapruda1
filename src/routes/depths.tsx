import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { DepthsWorkspace } from "@/components/DepthsWorkspace";
export const Route = createFileRoute("/depths")({component:DepthsPage,head:()=>({meta:[{title:"Замеры глубин — ZAPRUDA"}]})});
function DepthsPage(){return <Shell><DepthsWorkspace/></Shell>}
