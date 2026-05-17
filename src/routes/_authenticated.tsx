import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/shell/Layout";

export const Route = createFileRoute("/_authenticated")({
	component: Layout,
});
