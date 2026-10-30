import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route=createFileRoute("/depths")({component:()=> <Navigate to="/fishing-map" replace/>});
